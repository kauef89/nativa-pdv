<?php
/**
 * Lida com as requisições AJAX de submissão e busca de pedidos.
 * VERSÃO 4.0 (SQL MIGRATION):
 * - Lê pedidos, itens e pagamentos das novas tabelas SQL.
 * - Converte os dados SQL para a estrutura legada (ACF-like) para manter o Frontend compatível.
 */

if (!defined('ABSPATH')) { exit; }

if ( file_exists( NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
    require_once NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php';
}

class ND_Order_Ajax_Handler
{
    private $wpdb;

    public function __construct()
    {
        global $wpdb;
        $this->wpdb = $wpdb;

        $actions = [
            'get_my_orders', 'submit_order', 'get_orders', 'get_updated_orders', 'update_order_status',
            'assign_entregador', 'trigger_delivery_notification', 'get_order_status', 'cancel_my_order'
        ];

        foreach ($actions as $action) {
            add_action("wp_ajax_nativa_delivery_{$action}", array($this, "{$action}_ajax"));

            $public_actions = ['submit_order', 'get_order_status'];
            if (in_array($action, $public_actions)) {
                add_action("wp_ajax_nopriv_nativa_delivery_{$action}", array($this, "{$action}_ajax"));
            }
        }
    }

    // --- 1. CLIENTE: MEUS PEDIDOS ---

    public function get_my_orders_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Usuário não logado.'], 403);
            return;
        }

        $user_id = get_current_user_id();
        $table = $this->wpdb->prefix . 'nativa_pdv_pedidos';
        
        // Busca SQL direta
        $orders = $this->wpdb->get_results( $this->wpdb->prepare(
            "SELECT * FROM $table WHERE cliente_id = %d ORDER BY id DESC",
            $user_id
        ));

        $orders_data = [];
        foreach ($orders as $order) {
            $orders_data[] = $this->transform_sql_order_to_dashboard_format($order);
        }

        wp_send_json_success(['orders' => $orders_data]);
    }

    public function cancel_my_order_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');
        if (!is_user_logged_in()) wp_send_json_error(['message' => 'Auth error'], 403);

        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        $user_id = get_current_user_id();
        
        $table = $this->wpdb->prefix . 'nativa_pdv_pedidos';
        $order = $this->wpdb->get_row( $this->wpdb->prepare("SELECT * FROM $table WHERE id = %d", $order_id) );

        if (!$order) {
            wp_send_json_error(['message' => 'Pedido não encontrado.'], 404);
            return;
        }

        if ($order->cliente_id != $user_id) {
            wp_send_json_error(['message' => 'Sem permissão.'], 403);
            return;
        }

        $cancellable = ['pendente', 'recebido', 'aguardando-pagamento'];
        if (!in_array($order->status, $cancellable)) {
            wp_send_json_error(['message' => 'Pedido já em preparo, não pode ser cancelado.'], 400);
            return;
        }

        // Atualiza Status
        $this->wpdb->update($table, ['status' => 'cancelado'], ['id' => $order_id]);

        // Log
        if (class_exists('ND_Automations')) {
            $automations = new ND_Automations();
            $automations->handle_status_change($order_id, 'cancelado');
        }

        wp_send_json_success(['message' => 'Pedido cancelado.']);
    }

    // --- 2. ADMIN: DASHBOARD DE PEDIDOS ---

    public function get_orders_ajax()
    {
        if (!$this->is_dashboard_user_authorized()) {
            wp_send_json_error(['message' => 'Acesso negado.'], 403); return;
        }

        $date_filter = isset($_POST['date_filter']) ? sanitize_text_field($_POST['date_filter']) : 'today';
        $table = $this->wpdb->prefix . 'nativa_pdv_pedidos';
        $where = "WHERE status != 'trash'"; // Exclui lixeira se houver lógica de soft delete

        if ($date_filter === 'today') {
             $where .= " AND DATE(data_criacao) = CURDATE()";
        }

        $orders = $this->wpdb->get_results("SELECT * FROM $table $where ORDER BY id DESC");
        
        $orders_data = [];
        foreach ($orders as $order) {
            $orders_data[] = $this->transform_sql_order_to_dashboard_format($order);
        }

        // Métadados auxiliares para o Dashboard (Status, Entregadores)
        // Mantém a lógica de termos e CPTs pois isso não mudou
        $status_order = ['pendente', 'aguardando-pagamento', 'recebido', 'aceito', 'pronto', 'enviado', 'finalizado', 'cancelado'];
        $status_terms = get_terms(['taxonomy' => 'nativa_order_status', 'hide_empty' => false]);
        $all_statuses = [];
        if (!is_wp_error($status_terms)) {
            foreach ($status_terms as $term) { $all_statuses[] = ['slug' => $term->slug, 'name' => $term->name]; }
        }

        $all_entregadores = [];
        $entregadores = get_posts(['post_type' => 'nativa_entregador', 'numberposts' => -1]);
        foreach ($entregadores as $e) { $all_entregadores[] = ['id' => $e->ID, 'name' => $e->post_title]; }

        wp_send_json_success([
            'orders' => $orders_data,
            'statuses' => $all_statuses,
            'entregadores' => $all_entregadores,
            'server_timestamp' => current_time('timestamp', true)
        ]);
    }

    public function get_updated_orders_ajax()
    {
        if (!$this->is_dashboard_user_authorized()) { wp_send_json_error([], 403); return; }

        $last_check = isset($_POST['last_check_timestamp']) ? (int) $_POST['last_check_timestamp'] : 0;
        if ($last_check === 0) { wp_send_json_success(['updated_orders' => [], 'deleted_order_ids' => []]); return; }

        $table = $this->wpdb->prefix . 'nativa_pdv_pedidos';
        $last_date = gmdate('Y-m-d H:i:s', $last_check);

        // Busca modificados recentemente
        $orders = $this->wpdb->get_results( $this->wpdb->prepare(
            "SELECT * FROM $table WHERE data_atualizacao > %s ORDER BY id DESC",
            $last_date
        ));

        $updated_orders_data = [];
        foreach ($orders as $order) {
            $updated_orders_data[] = $this->transform_sql_order_to_dashboard_format($order);
        }

        wp_send_json_success([
            'updated_orders' => $updated_orders_data,
            'deleted_order_ids' => [], // SQL não tem lixeira padrão ainda, retornar vazio
            'server_timestamp' => current_time('timestamp', true)
        ]);
    }

    public function update_order_status_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nativa_delivery_nonce');
        if (!$this->is_dashboard_user_authorized()) { wp_send_json_error([], 403); return; }

        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        $new_status = isset($_POST['new_status']) ? sanitize_text_field($_POST['new_status']) : '';

        if (!$order_id || !$new_status) wp_send_json_error(['message' => 'Dados inválidos.']);

        $table = $this->wpdb->prefix . 'nativa_pdv_pedidos';
        
        $updated = $this->wpdb->update($table, ['status' => $new_status], ['id' => $order_id]);

        if ($updated !== false) {
            if (class_exists('ND_Automations')) {
                $automations = new ND_Automations();
                $automations->handle_status_change($order_id, $new_status);
            }
            // Retorna URL whatsapp atualizada se necessário
            $whatsapp_url = ND_Whatsapp_Helper::generate_customer_notification_url($order_id, $new_status);
            wp_send_json_success(['message' => 'Status atualizado.', 'whatsapp_url' => $whatsapp_url]);
        } else {
            wp_send_json_error(['message' => 'Erro ao atualizar BD.'], 500);
        }
    }

    // --- 3. HELPER DE TRANSFORMAÇÃO (A MÁGICA DA COMPATIBILIDADE) ---

    /**
     * Converte uma linha da tabela SQL `wp_nativa_pdv_pedidos` para o formato
     * JSON rico que o Frontend (Vue.js) espera (simulando campos ACF).
     */
    private function transform_sql_order_to_dashboard_format($order)
    {
        // 1. Decodifica Metadados
        $meta = json_decode($order->metadados_json, true) ?: [];
        
        // 2. Busca Itens
        $table_itens = $this->wpdb->prefix . 'nativa_pdv_itens_pedido';
        $itens_rows = $this->wpdb->get_results( $this->wpdb->prepare("SELECT * FROM $table_itens WHERE pedido_id = %d", $order->id) );
        
        // Reconstrói itens_json (legacy structure)
        $legacy_items = [];
        $items_list_for_dashboard = [];
        
        foreach ($itens_rows as $idx => $item) {
            $options = json_decode($item->adicionais_json, true);
            
            // Estrutura para API/Dashboard
            $item_data = [
                'product_id' => $item->produto_id,
                'name' => $item->nome_produto,
                'quantity' => $item->quantidade,
                'total_item_price' => $item->subtotal,
                'obs' => $item->observacoes,
                'selected_addons' => $options
            ];
            
            $items_list_for_dashboard[] = $item_data;
            $legacy_items['item_' . $idx] = $item_data;
        }

        // 3. Busca Pagamentos
        $table_pag = $this->wpdb->prefix . 'nativa_pdv_pagamentos';
        $payments_rows = $this->wpdb->get_results( $this->wpdb->prepare("SELECT * FROM $table_pag WHERE pedido_id = %d", $order->id) );
        
        $primary_payment = !empty($payments_rows) ? $payments_rows[0] : null;
        $payment_method_slug = $primary_payment ? $primary_payment->metodo_pagamento : 'indefinido';
        $payment_status = 'manual_pending';
        
        // Lógica de Status de Pagamento Unificada
        $has_pix_paid = false;
        foreach($payments_rows as $pay) {
            if (strpos($pay->metodo_pagamento, 'pix') !== false && $pay->status === 'aprovado') {
                $has_pix_paid = true;
            }
        }
        
        // Se o pedido está 'recebido' ou além, consideramos pago visualmente, 
        // a menos que seja PIX Auto que falhou.
        if (in_array($order->status, ['recebido', 'preparando', 'pronto', 'enviado', 'finalizado'])) {
            $payment_status = 'paid';
        } elseif ($order->status === 'aguardando-pagamento') {
            $payment_status = 'awaiting_api';
        }

        // 4. Monta o Array "Details" (Simulando ACF get_fields)
        $details = [
            'pedido_nome_cliente' => $meta['customer']['name'] ?? 'Cliente',
            'pedido_whatsapp_cliente' => $meta['customer']['whatsapp'] ?? '',
            'pedido_cpf_cliente' => $meta['customer']['cpf'] ?? '',
            'pedido_tipo_servico' => $order->tipo_servico,
            'pedido_total_final' => $order->total_geral,
            'pedido_subtotal' => $meta['fees']['subtotal'] ?? $order->total_geral,
            'pedido_taxa_entrega' => $meta['fees']['delivery_fee'] ?? 0,
            'pedido_desconto' => $meta['fees']['discount'] ?? 0,
            'pedido_metodo_pagamento' => $payment_method_slug,
            'pedido_troco_para' => $meta['payment_info']['change_for'] ?? '', // Se tiver
            'pedido_endereco' => $meta['address'] ? [
                'pedido_rua' => $meta['address']['street'] ?? '',
                'pedido_numero' => $meta['address']['number'] ?? '',
                'pedido_bairro' => $meta['address']['bairro_name'] ?? '',
                'pedido_complemento' => $meta['address']['complement'] ?? '',
            ] : null,
            'pedido_entregador_designado' => $meta['entregador_id'] ?? '', // Futuro
        ];

        // 5. Retorno Final
        return [
            'id' => $order->id,
            'status' => $this->get_status_label($order->status),
            'status_slug' => $order->status,
            'status_log' => $meta['status_log'] ?? [],
            'date' => wp_date('d/m/Y H:i', strtotime($order->data_criacao)),
            'timestamp' => strtotime($order->data_criacao),
            'customer_name' => explode(' ', $details['pedido_nome_cliente'])[0],
            'customer_dob' => '', // Pode buscar do user meta se necessário
            'total' => 'R$ ' . number_format($order->total_geral, 2, ',', '.'),
            'details' => $details,
            'items_json' => json_encode($legacy_items, JSON_UNESCAPED_UNICODE), // Legado crítico
            'items_list' => $items_list_for_dashboard, // Moderno
            'payment_status' => $payment_status,
            'payment_received' => ($payment_status === 'paid'),
            'available_statuses' => $this->get_available_statuses($order->tipo_servico),
            'notification_urls' => [], // Pode gerar se necessário
            'google_maps_link' => $meta['address'] ? "https://maps.google.com/?q={$meta['address']['latitude']},{$meta['address']['longitude']}" : null
        ];
    }

    private function get_status_label($slug) {
        $term = get_term_by('slug', $slug, 'nativa_order_status');
        return $term ? $term->name : ucfirst($slug);
    }

    private function get_available_statuses($modality) {
        if ($modality === 'delivery') return ['pendente', 'recebido', 'aceito', 'pronto', 'enviado', 'finalizado', 'cancelado'];
        return ['pendente', 'recebido', 'aceito', 'pronto', 'finalizado', 'cancelado'];
    }

    private function is_dashboard_user_authorized() {
        return is_user_logged_in() && (current_user_can('manage_options') || current_user_can('edit_posts'));
    }

    // --- SUBMIT ORDER (AJAX) ---
    // Wrapper para o ND_Order_Creator que agora suporta itens diretos ou sessão.
    
    public function submit_order_ajax()
    {
        if ( is_user_logged_in() ) { check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce'); }

        parse_str(wp_unslash($_POST['form_data'] ?? ''), $form_data_array);
        $payments_json = isset($_POST['payments']) ? wp_unslash($_POST['payments']) : '[]';
        
        // Monta array de dados para o Creator
        $checkout_data = [
            'modality' => $_POST['modality'] ?? 'pickup',
            'customer' => [
                'name' => $form_data_array['nativa-customer-name'] ?? '',
                'cpf' => $form_data_array['nativa-customer-cpf'] ?? '',
                'whatsapp' => $form_data_array['nativa-customer-phone'] ?? ''
            ],
            'delivery_address' => [], // Preencher se delivery
            'payments' => json_decode($payments_json, true) ?: [],
            'totals' => ['delivery_fee' => 0], // Creator recalcula
            'applied_coupon_code' => $_POST['applied_coupon_code'] ?? '',
            'user_id' => get_current_user_id()
        ];

        // Se delivery, popula endereço
        if ($checkout_data['modality'] === 'delivery' && is_user_logged_in()) {
             $addresses = get_user_meta(get_current_user_id(), 'nativa_user_addresses', true);
             $selected_id = $form_data_array['selected_address'] ?? null;
             // Lógica simples de busca
             if ($addresses && is_array($addresses)) {
                 foreach($addresses as $addr) {
                     if ($addr['id'] === $selected_id) {
                         $bairro_post = get_post($addr['bairro_id']);
                         $checkout_data['delivery_address'] = [
                             'street' => rawurldecode($addr['street']),
                             'number' => $addr['number'],
                             'complement' => $addr['complement'],
                             'bairro_name' => $bairro_post ? $bairro_post->post_title : '',
                             'latitude' => $addr['latitude'],
                             'longitude' => $addr['longitude']
                         ];
                         break;
                     }
                 }
             }
        }

        $creator = new ND_Order_Creator($checkout_data);
        $result = $creator->create_order();

        if (is_wp_error($result)) {
            wp_send_json_error(['message' => $result->get_error_message()], 400);
        } else {
            wp_send_json_success($result);
        }
    }
}