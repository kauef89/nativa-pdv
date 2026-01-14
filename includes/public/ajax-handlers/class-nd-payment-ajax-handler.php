<?php
/**
 * Lida com as requisições AJAX relacionadas a pagamentos de pedidos.
 * VERSÃO 4.0 (SQL MIGRATION): Leitura e Escrita nas tabelas de pagamento SQL.
 */

if (!defined('ABSPATH')) { exit; }

if ( file_exists( NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
    require_once NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php';
}

use Endroid\QrCode\Builder\Builder;
use Endroid\QrCode\Encoding\Encoding;
use Endroid\QrCode\ErrorCorrectionLevel;
use Endroid\QrCode\RoundBlockSizeMode;
use Endroid\QrCode\Writer\PngWriter;

require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-sicredi-helper.php';

class ND_Payment_Ajax_Handler
{
    private $wpdb;

    public function __construct()
    {
        global $wpdb;
        $this->wpdb = $wpdb;

        $actions = [
            'get_pix_data', 'check_pix_status',
            'update_payment_status',
            'recognize_payment', 'update_payment_refund_status',
            'expire_pix_order', 'send_pix_expiration_warning',
        ];

        foreach ($actions as $action) {
            add_action("wp_ajax_nativa_delivery_{$action}", array($this, "{$action}_ajax"));
            $public_actions = ['get_pix_data', 'check_pix_status'];
            if (in_array($action, $public_actions)) {
                add_action("wp_ajax_nopriv_nativa_delivery_{$action}", array($this, "{$action}_ajax"));
            }
        }
    }

    // --- MÉTODOS DE AUDITORIA PIX ---

    public function check_pix_status_ajax()
    {
        // Usado tanto pelo App do Cliente quanto pelo Botão "Verificar" do PDV
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');
        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;

        if (!$order_id) {
            wp_send_json_error(['paid' => false, 'message' => 'ID inválido.']); return;
        }

        // 1. Busca dados do pagamento na tabela SQL
        $table_pag = $this->wpdb->prefix . 'nativa_pdv_pagamentos';
        $payment_row = $this->wpdb->get_row( $this->wpdb->prepare(
            "SELECT * FROM $table_pag WHERE pedido_id = %d AND metodo_pagamento LIKE %s LIMIT 1",
            $order_id, '%pix%'
        ));

        if (!$payment_row) {
            wp_send_json_error(['paid' => false, 'message' => 'Pagamento PIX não encontrado.']); return;
        }

        // Se já está pago no banco, retorna sucesso direto
        if ($payment_row->status === 'aprovado') {
            wp_send_json_success(['paid' => true]); return;
        }

        // 2. Extrai TXID do JSON
        $gateway_data = json_decode($payment_row->gateway_data, true);
        $txid = $gateway_data['txid'] ?? '';

        if (empty($txid)) {
            wp_send_json_error(['paid' => false, 'message' => 'TXID não gerado.']); return;
        }

        // 3. Consulta API Sicredi (Auditoria Real)
        $sicredi_response = ND_Sicredi_Helper::get_pix_charge($txid);

        if (is_wp_error($sicredi_response)) {
            wp_send_json_success(['paid' => false, 'error' => 'Falha na comunicação com Sicredi.']); return;
        }

        if (isset($sicredi_response['status']) && $sicredi_response['status'] === 'CONCLUIDA') {
            // 4. Atualiza Tabela de Pagamentos
            $this->wpdb->update(
                $table_pag,
                ['status' => 'aprovado', 'data_pagamento' => current_time('mysql')],
                ['id' => $payment_row->id]
            );

            // 5. Atualiza Pedido para 'Recebido' (se estava aguardando)
            $table_ped = $this->wpdb->prefix . 'nativa_pdv_pedidos';
            $this->wpdb->update(
                $table_ped,
                ['status' => 'recebido'],
                ['id' => $order_id]
            );

            // 6. Log e Automação
            if (class_exists('ND_Automations')) {
                $automations = new ND_Automations();
                $automations->handle_status_change($order_id, 'recebido');
                // Credita pontos agora que confirmou!
                $order = $this->wpdb->get_row("SELECT * FROM $table_ped WHERE id = $order_id");
                $this->credit_loyalty_points_delayed($order);
            }

            wp_send_json_success(['paid' => true]);
        } else {
            wp_send_json_success(['paid' => false]);
        }
    }

    public function get_pix_data_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');
        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;

        $table_pag = $this->wpdb->prefix . 'nativa_pdv_pagamentos';
        $payment_row = $this->wpdb->get_row( $this->wpdb->prepare(
            "SELECT gateway_data FROM $table_pag WHERE pedido_id = %d AND metodo_pagamento LIKE %s LIMIT 1",
            $order_id, '%pix%'
        ));

        if (!$payment_row) { wp_send_json_error(['message' => 'Sem dados PIX.']); return; }

        $data = json_decode($payment_row->gateway_data, true);
        $copia_e_cola = $data['qr_code'] ?? ''; // Nome do campo salvo no sicredi-helper

        if (empty($copia_e_cola)) { wp_send_json_error(['message' => 'QR Code não disponível.']); return; }

        try {
            $result = Builder::create()
                ->writer(new PngWriter())
                ->data($copia_e_cola)
                ->encoding(new Encoding('UTF-8'))
                ->errorCorrectionLevel(ErrorCorrectionLevel::High)
                ->size(300)
                ->margin(10)
                ->build();
            
            wp_send_json_success([
                'qr_code_base64' => $result->getDataUri(),
                'copia_e_cola' => $copia_e_cola,
                'qr_code_type' => 'png'
            ]);
        } catch (\Exception $e) {
            wp_send_json_error(['message' => 'Erro ao gerar imagem QR.']);
        }
    }

    // --- MÉTODOS DE GESTÃO MANUAL (PDV) ---

    public function recognize_payment_ajax()
    {
        // Botão "Marcar como Pago" no PDV
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nativa_delivery_nonce');
        if (!current_user_can('manage_options')) wp_send_json_error(['message' => '403'], 403);

        $order_id = absint($_POST['order_id']);
        
        // Aprova todos os pagamentos pendentes deste pedido
        $table_pag = $this->wpdb->prefix . 'nativa_pdv_pagamentos';
        $this->wpdb->query( $this->wpdb->prepare(
            "UPDATE $table_pag SET status = 'aprovado', data_pagamento = %s WHERE pedido_id = %d AND status = 'pendente'",
            current_time('mysql'), $order_id
        ));

        // Move pedido para recebido
        $table_ped = $this->wpdb->prefix . 'nativa_pdv_pedidos';
        $this->wpdb->update($table_ped, ['status' => 'recebido'], ['id' => $order_id]);

        // Automação (Pontos, Push)
        if (class_exists('ND_Automations')) {
            $automations = new ND_Automations();
            $automations->handle_status_change($order_id, 'recebido');
            
            $order = $this->wpdb->get_row("SELECT * FROM $table_ped WHERE id = $order_id");
            $this->credit_loyalty_points_delayed($order);
        }

        wp_send_json_success(['message' => 'Pagamento confirmado manualmente.']);
    }

    // --- HELPER FIDELIDADE (Para usar na confirmação tardia) ---
    private function credit_loyalty_points_delayed($order) {
        $meta = json_decode($order->metadados_json, true);
        
        // Verifica se já ganhou
        if (!empty($meta['loyalty_awarded'])) return;

        // Recupera pontos calculados na criação
        $points_to_award = $meta['points_earned'] ?? 0;
        if ($points_to_award <= 0) return;

        $user_id = $order->cliente_id;
        if (!$user_id) return;

        // Credita
        $current = (int) get_user_meta($user_id, 'nativa_user_points', true);
        $new_balance = $current + $points_to_award;
        update_user_meta($user_id, 'nativa_user_points', $new_balance);

        // Loga
        $table_mov = $this->wpdb->prefix . 'nativa_fidelidade_movimentos';
        $this->wpdb->insert($table_mov, [
            'cliente_id' => $user_id,
            'tipo' => 'ganho',
            'pontos' => $points_to_award,
            'referencia_id' => $order->id,
            'descricao' => "Ganho por Pedido #{$order->id} (Confirmado)",
            'saldo_apos_movimento' => $new_balance
        ]);

        // Marca como creditado
        $meta['loyalty_awarded'] = true;
        $this->wpdb->update(
            $this->wpdb->prefix . 'nativa_pdv_pedidos',
            ['metadados_json' => json_encode($meta, JSON_UNESCAPED_UNICODE)],
            ['id' => $order->id]
        );
    }
}