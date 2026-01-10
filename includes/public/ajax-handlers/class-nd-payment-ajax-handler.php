<?php
/**
 * Lida com as requisições AJAX relacionadas a pagamentos de pedidos.
 * ... (histórico de versões anterior) ...
 * CORREÇÃO (DASHBOARD REALTIME): Força a atualização da data de modificação do post ao confirmar pagamento via polling.
 */

if (!defined('ABSPATH')) {
    exit;
}

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
    public function __construct()
    {
        $actions = [
            'get_pix_data', 'check_pix_status',
            'update_payment_status',
            'recognize_payment', 'update_payment_refund_status',
            'expire_pix_order',
            'send_pix_expiration_warning',
        ];

        foreach ($actions as $action) {
            add_action("wp_ajax_nativa_delivery_{$action}", array($this, "{$action}_ajax"));

            $public_actions = [
                'get_pix_data', 'check_pix_status',
            ];

            if (in_array($action, $public_actions)) {
                add_action("wp_ajax_nopriv_nativa_delivery_{$action}", array($this, "{$action}_ajax"));
            }
        }
    }

    public function update_payment_refund_status_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nativa_delivery_nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Acesso negado.'], 403);
        }
        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        $new_state = isset($_POST['new_state']) ? filter_var($_POST['new_state'], FILTER_VALIDATE_BOOLEAN) : false; // true = estornado, false = desfazer estorno
        if (!$order_id) {
            wp_send_json_error(['message' => 'ID do pedido não informado.']);
        }

        $new_payment_status = $new_state ? 'refunded' : 'paid';
        update_post_meta($order_id, '_payment_status', $new_payment_status);
        update_post_meta($order_id, '_payment_refunded', $new_state);
        
        // CORREÇÃO REALTIME (Opcional, mas boa prática para estornos)
        wp_update_post(['ID' => $order_id]);

        wp_send_json_success(['message' => 'Status do estorno atualizado.']);
    }

    public function recognize_payment_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nativa_delivery_nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Acesso negado.'], 403);
        }
        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        if (!$order_id) {
            wp_send_json_error(['message' => 'ID do pedido não informado.']);
        }

        update_post_meta($order_id, '_payment_status', 'paid');
        update_post_meta($order_id, '_payment_received', true);

        $current_method = get_field('pedido_metodo_pagamento', $order_id);
        if ($current_method === 'pix-sicredi' || $current_method === 'pix-fallback') {
            update_field('pedido_metodo_pagamento', 'pix-fallback', $order_id);
        }

        wp_set_object_terms($order_id, 'recebido', 'nativa_order_status');
        
        $status_log = get_post_meta($order_id, 'status_log', true);
        if (!is_array($status_log)) { $status_log = []; }
        $status_log[] = [
            'status'     => 'recebido',
            'timestamp'  => current_time('timestamp', true),
            'changed_by' => 'admin (' . wp_get_current_user()->user_login . ')',
            'reason'     => 'Pagamento reconhecido manually'
        ];
        update_post_meta($order_id, 'status_log', $status_log);
        
        // CORREÇÃO REALTIME
        wp_update_post(['ID' => $order_id]);

        wp_send_json_success(['message' => 'Pagamento reconhecido e pedido movido para "Recebido".']);
    }

    public function update_payment_status_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nativa_delivery_nonce');
        if (!current_user_can('manage_options')) {
            wp_send_json_error(['message' => 'Acesso negado.'], 403);
        }
        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        $new_state = isset($_POST['new_state']) ? filter_var($_POST['new_state'], FILTER_VALIDATE_BOOLEAN) : false;
        if (!$order_id) {
            wp_send_json_error(['message' => 'ID do pedido não informado.']);
        }

        $new_payment_status = $new_state ? 'paid' : 'manual_pending';
        update_post_meta($order_id, '_payment_status', $new_payment_status);
        update_post_meta($order_id, '_payment_received', $new_state);
        
        // CORREÇÃO REALTIME
        wp_update_post(['ID' => $order_id]);

        wp_send_json_success(['message' => 'Status do pagamento atualizado.']);
    }

    public function get_pix_data_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');
        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        if (!$order_id) {
            wp_send_json_error(['message' => 'ID do pedido inválido.']);
            return;
        }

        $sicredi_pix_data = get_post_meta($order_id, 'sicredi_pix_data', true);

        if (!empty($sicredi_pix_data) && is_array($sicredi_pix_data)) {
            $qr_code_data_uri = null;
            $qr_code_error = null;
            $copia_e_cola = $sicredi_pix_data['pixCopiaECola'] ?? '';

            if (empty($copia_e_cola)) {
                wp_send_json_error(['message' => 'Código Copia e Cola PIX não encontrado para este pedido.']);
                return;
            }

            try {
                $result = Builder::create()
                    ->writer(new PngWriter())
                    ->writerOptions([])
                    ->data($copia_e_cola)
                    ->encoding(new Encoding('UTF-8'))
                    ->errorCorrectionLevel(ErrorCorrectionLevel::High)
                    ->size(300)
                    ->margin(10)
                    ->roundBlockSizeMode(RoundBlockSizeMode::Margin)
                    ->validateResult(false)
                    ->build();

                $qr_code_data_uri = $result->getDataUri();

            } catch (\Exception $e) {
                $qr_code_error = 'Falha ao gerar QR Code: ' . $e->getMessage();
                error_log("Nativa Delivery - Falha ao gerar QR Code para pedido $order_id: " . $e->getMessage());
            }

            wp_send_json_success([
                'qr_code_base64' => $qr_code_data_uri,
                'copia_e_cola' => $copia_e_cola,
                'qr_code_error' => $qr_code_error,
                'qr_code_type' => 'png'
            ]);

        } else {
            wp_send_json_error(['message' => 'Não foi possível encontrar os dados de pagamento PIX para este pedido.']);
        }
    }

    public function check_pix_status_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');
        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;

        if (!$order_id) {
            wp_send_json_error(['paid' => false, 'message' => 'ID do pedido não fornecido.']);
            return;
        }

        $txid = get_post_meta($order_id, '_sicredi_pix_txid', true);

        if (empty($txid)) {
            $payment_status_meta = get_post_meta($order_id, '_payment_status', true);
            if ($payment_status_meta === 'paid') {
                wp_send_json_success(['paid' => true]);
                return;
            }
            wp_send_json_error(['paid' => false, 'message' => 'FALHA DE POLLING: ID da transação PIX (txid) não encontrado para o pedido #' . $order_id]);
            return;
        }

        $sicredi_response = ND_Sicredi_Helper::get_pix_charge($txid);

        if (is_wp_error($sicredi_response)) {
            error_log('Erro ao consultar status PIX no Sicredi para o pedido #' . $order_id . ': ' . $sicredi_response->get_error_message());
            wp_send_json_success(['paid' => false]);
            return;
        }

        if (isset($sicredi_response['status']) && $sicredi_response['status'] === 'CONCLUIDA') {
            update_post_meta($order_id, '_payment_status', 'paid');
            update_post_meta($order_id, '_payment_received', true);

            wp_set_object_terms($order_id, 'recebido', 'nativa_order_status', false);

            $status_log = get_post_meta($order_id, 'status_log', true) ?: [];

            $order_total = get_field('pedido_total_final', $order_id);
            $status_log[] = [
                'status' => 'recebido',
                'timestamp' => current_time( 'timestamp', true ),
                'changed_by' => 'system (pix api)',
                'payment_info' => [
                    'amount' => $order_total,
                    'method' => 'PIX Sicredi (API)'
                ]
            ];
            update_post_meta($order_id, 'status_log', $status_log);
            
            // --- CORREÇÃO REALTIME ---
            // Força atualização da data de modificação para o Dashboard perceber
            wp_update_post(['ID' => $order_id]);

            wp_send_json_success(['paid' => true]);
        } else {
            wp_send_json_success(['paid' => false]);
        }
    }

    public function expire_pix_order_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');
        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;

        if (!$order_id) {
            wp_send_json_error(['message' => 'ID do pedido não fornecido.']);
        }

        $customer_user_id = get_post_meta($order_id, '_customer_user', true);
        if ( is_user_logged_in() && get_current_user_id() != $customer_user_id ) {
            wp_send_json_error(['message' => 'Acesso não autorizado.'], 403);
        }

        $payment_method = get_field('pedido_metodo_pagamento', $order_id);
        $payment_status = get_post_meta($order_id, '_payment_status', true);

        if ($payment_method === 'pix-sicredi' && $payment_status === 'awaiting_api') {
            update_post_meta($order_id, '_payment_status', 'expired');
            wp_set_object_terms($order_id, 'cancelado', 'nativa_order_status');

            $status_log = get_post_meta($order_id, 'status_log', true) ?: [];
            $status_log[] = [
                'status'    => 'cancelado',
                'timestamp' => current_time('timestamp', true),
                'changed_by'=> 'system (pix expiry)',
                'reason'    => 'Pagamento PIX expirado.'
            ];
            update_post_meta($order_id, 'status_log', $status_log);
            
            // CORREÇÃO REALTIME
            wp_update_post(['ID' => $order_id]);

            wp_send_json_success(['message' => 'Pedido expirado e cancelado.']);
        } else {
            wp_send_json_error(['message' => 'O pedido não pôde ser cancelado (já pago, expirado ou método inválido).'], 400);
        }
    }

    public function send_pix_expiration_warning_ajax() {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');
        
        if ( ! is_user_logged_in() ) {
            wp_send_json_error( array( 'message' => 'Usuário não logado.' ), 403 );
            return;
        }

        $order_id = isset( $_POST['order_id'] ) ? absint( $_POST['order_id'] ) : 0;
        if ( ! $order_id ) {
            wp_send_json_error( array( 'message' => 'ID do pedido inválido.' ), 400 );
            return;
        }

        $current_user_id = get_current_user_id();
        $order_user_id = get_post_meta( $order_id, '_customer_user', true );

        if ( $current_user_id != $order_user_id ) {
            wp_send_json_error( array( 'message' => 'Não autorizado.' ), 403 );
            return;
        }

        $status_terms = get_the_terms( $order_id, 'nativa_order_status' );
        $current_status = !empty($status_terms) && !is_wp_error($status_terms) ? $status_terms[0]->slug : '';
        
        if ( $current_status !== 'aguardando-pagamento' ) {
            wp_send_json_error( array( 'message' => 'O pedido não está mais aguardando pagamento.' ), 400 );
            return;
        }

        if ( ! class_exists('ND_Automations') ) {
             require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-automations.php';
        }
        $automations = new ND_Automations();

        $payload = [
            'title' => 'Seu PIX vai expirar!',
            'body'  => "O pagamento do seu pedido #${order_id} expira em 1 minuto. Corra para não perdê-lo!",
            'icon'  => NATIVADELIVERY_PLUGIN_URL . 'assets/icons/android-chrome-192x192.png',
            'url'   => home_url('/minha-conta'),
            'isUrgent' => true,
        ];

        $automations->send_custom_push_to_user($current_user_id, $payload);

        wp_send_json_success( array( 'message' => 'Notificação de lembrete enviada.' ) );
    }
}