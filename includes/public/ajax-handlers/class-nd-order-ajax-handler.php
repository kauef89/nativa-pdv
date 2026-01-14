<?php
/**
 * Lida com as requisições AJAX de submissão e busca de pedidos.
 * VERSÃO 6.2 (FINAL RESTORE): Todos os endpoints restaurados e adaptados para SQL.
 */

if (!defined('ABSPATH')) { exit; }

// --- 1. CARREGAMENTO DE DEPENDÊNCIAS CRÍTICAS ---
$core_path = plugin_dir_path( dirname( dirname( __FILE__ ) ) ) . 'core/';

if ( file_exists( $core_path . 'class-nd-whatsapp-helper.php' ) ) require_once $core_path . 'class-nd-whatsapp-helper.php';
if ( file_exists( $core_path . 'class-nd-sicredi-helper.php' ) ) require_once $core_path . 'class-nd-sicredi-helper.php';
if ( file_exists( $core_path . 'class-nd-cart-helper.php' ) ) require_once $core_path . 'class-nd-cart-helper.php';
if ( file_exists( $core_path . 'class-nd-order-creator.php' ) ) require_once $core_path . 'class-nd-order-creator.php';
if ( file_exists( $core_path . 'class-nd-automations.php' ) ) require_once $core_path . 'class-nd-automations.php';

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

    // --- A. CLIENTE: ÁREA MINHA CONTA ---

    public function get_my_orders_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Usuário não logado.'], 403);
            return;
        }

        $user_id = get_current_user_id();
        $table = $this->wpdb->prefix . 'nativa_pdv_pedidos';
        
        // Busca os últimos 50 pedidos do cliente
        $orders = $this->wpdb->get_results( $this->wpdb->prepare(
            "SELECT * FROM $table WHERE cliente_id = %d ORDER BY id DESC LIMIT 50",
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
        if (!is_user_logged_in()) { wp_send_json_error(['message' => 'Auth required'], 403); return; }

        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        $user_id = get_current_user_id();
        
        $table = $this->wpdb->prefix . 'nativa_pdv_pedidos';
        $order = $this->wpdb->get_row( $this->wpdb->prepare("SELECT * FROM $table WHERE id = %d", $order_id) );

        if (!$order) { wp_send_json_error(['message' => 'Pedido não encontrado.'], 404); return; }
        if ($order->cliente_id != $user_id) { wp_send_json_error(['message' => 'Proibido.'], 403); return; }

        $allowed = ['pendente', 'aguardando-pagamento', 'recebido'];
        if (!in_array($order->status, $allowed)) {
            wp_send_json_error(['message' => 'Pedido já em preparo, não pode ser cancelado.'], 400);
            return;
        }

        $this->wpdb->update($table, ['status' => 'cancelado'], ['id' => $order_id]);

        if (class_exists('ND_Automations')) {
            $automations = new ND_Automations();
            $automations->handle_status_change($order_id, 'cancelado');
        }

        wp_send_json_success(['message' => 'Pedido cancelado.']);
    }

    // --- B. DASHBOARD & ADMIN ---

    public function get_orders_ajax()
    {
        if (!$this->is_dashboard_user_authorized()) { wp_send_json_error(['message' => '403'], 403); return; }

        $date_filter = isset($_POST['date_filter']) ? sanitize_text_field($_POST['date_filter']) : 'today';
        $table = $this->wpdb->prefix . 'nativa_pdv_pedidos';
        $where = "WHERE 1=1"; 

        if ($date_filter === 'today') {
             $where .= " AND DATE(data_criacao) = CURDATE()";
        }

        $orders = $this->wpdb->get_results("SELECT * FROM $table $where ORDER BY id DESC");
        
        $orders_data = [];
        foreach ($orders as $order) {
            $orders_data[] = $this->transform_sql_order_to_dashboard_format($order);
        }

        $all_statuses = $this->get_all_statuses();
        $all_entregadores = $this->get_all_entregadores();
        $payment_methods = $this->get_payment_methods_data();

        wp_send_json_success([
            'orders' => $orders_data,
            'statuses' => $all_statuses,
            'entregadores' => $all_entregadores,
            'payment_methods_map' => $payment_methods['map'],
            'payment_methods_data' => $payment_methods['data'],
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
            'deleted_order_ids' => [],
            'server_timestamp' => current_time('timestamp', true)
        ]);
    }

    public function update_order_status_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nativa_delivery_nonce');
        if (!$this->is_dashboard_user_authorized()) { wp_send_json_error([], 403); return; }

        $order_id = absint($_POST['order_id']);
        $new_status = sanitize_text_field($_POST['new_status']);
        
        $updated = $this->wpdb->update($this->wpdb->prefix . 'nativa_pdv_pedidos', ['status' => $new_status], ['id' => $order_id]);
        
        if ($updated !== false && class_exists('ND_Automations')) {
            $automations = new ND_Automations();
            $automations->handle_status_change($order_id, $new_status);
        }
        
        $whatsapp_url = class_exists('ND_Whatsapp_Helper') ? ND_Whatsapp_Helper::generate_customer_notification_url($order_id, $new_status) : '';
        wp_send_json_success(['message' => 'Status atualizado.', 'whatsapp_url' => $whatsapp_url]);
    }

    public function assign_entregador_ajax() {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nativa_delivery_nonce');
        if (!$this->is_dashboard_user_authorized()) { wp_send_json_error(['message' => '403'], 403); return; }

        $order_id = absint($_POST['order_id']);
        $entregador_id = absint($_POST['entregador_id']);

        $table = $this->wpdb->prefix . 'nativa_pdv_pedidos';
        
        // Atualiza JSON metadata
        $order = $this->wpdb->get_row( $this->wpdb->prepare("SELECT metadados_json FROM $table WHERE id = %d", $order_id) );
        if ($order) {
            $meta = json_decode($order->metadados_json, true);
            $meta['entregador_id'] = $entregador_id;
            $this->wpdb->update($table, ['metadados_json' => json_encode($meta, JSON_UNESCAPED_UNICODE)], ['id' => $order_id]);
            wp_send_json_success(['message' => 'Entregador definido.']);
        } else {
            wp_send_json_error(['message' => 'Pedido não encontrado.']);
        }
    }

    public function trigger_delivery_notification_ajax() {
        // Mock ou implementação real se tiver lógica de whatsapp para entregador
        wp_send_json_success(['message' => 'Notificação enviada (Simulação).']);
    }

    // --- C. MÉTODOS PÚBLICOS/MISTOS ---

    public function get_order_status_ajax()
    {
        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        if (!$order_id) wp_send_json_error(['status' => 'invalid']);

        $table = $this->wpdb->prefix . 'nativa_pdv_pedidos';
        $order = $this->wpdb->get_row( $this->wpdb->prepare("SELECT * FROM $table WHERE id = %d", $order_id) );

        if (!$order) wp_send_json_error(['status' => 'not_found']);

        $formatted = $this->transform_sql_order_to_dashboard_format($order);
        
        wp_send_json_success([
            'status' => $formatted['status_slug'],
            'payment_status' => $formatted['payment_status']
        ]);
    }

    public function submit_order_ajax()
    {
        if ( is_user_logged_in() ) check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');
        
        parse_str(wp_unslash($_POST['form_data'] ?? ''), $form_data_array);
        $payments_data = json_decode(wp_unslash($_POST['payments'] ?? '[]'), true);
        
        $checkout_data = [
            'modality' => $_POST['modality'] ?? 'pickup',
            'customer' => [
                'name' => $form_data_array['nativa-customer-name'] ?? '',
                'cpf' => $form_data_array['nativa-customer-cpf'] ?? '',
                'whatsapp' => $form_data_array['nativa-customer-phone'] ?? ''
            ],
            'delivery_address' => [],
            'payments' => $payments_data ?: [],
            'totals' => ['delivery_fee' => 0],
            'applied_coupon_code' => $_POST['applied_coupon_code'] ?? '',
            'user_id' => get_current_user_id()
        ];

        if ($checkout_data['modality'] === 'delivery' && is_user_logged_in()) {
             $addresses = get_user_meta(get_current_user_id(), 'nativa_user_addresses', true);
             $selected_id = $form_data_array['selected_address'] ?? null;
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

    // --- HELPER DE TRANSFORMAÇÃO ---

    private function transform_sql_order_to_dashboard_format($order)
    {
        $meta = json_decode($order->metadados_json, true) ?: [];
        
        // Itens
        $table_itens = $this->wpdb->prefix . 'nativa_pdv_itens_pedido';
        $itens_rows = $this->wpdb->get_results( $this->wpdb->prepare("SELECT * FROM $table_itens WHERE pedido_id = %d", $order->id) );
        
        $legacy_items = [];
        $items_list = [];
        
        foreach ($itens_rows as $idx => $item) {
            $options = json_decode($item->adicionais_json, true);
            $item_data = [
                'product_id' => $item->produto_id,
                'name' => $item->nome_produto,
                'quantity' => $item->quantidade,
                'total_item_price' => $item->subtotal,
                'obs' => $item->observacoes,
                'selected_addons' => $options
            ];
            $items_list[] = $item_data;
            $legacy_items['item_' . $idx] = $item_data;
        }

        // Pagamentos
        $table_pag = $this->wpdb->prefix . 'nativa_pdv_pagamentos';
        $payments_rows = $this->wpdb->get_results( $this->wpdb->prepare("SELECT * FROM $table_pag WHERE pedido_id = %d", $order->id) );
        
        $primary_payment = !empty($payments_rows) ? $payments_rows[0] : null;
        $payment_method_slug = $primary_payment ? $primary_payment->metodo_pagamento : 'indefinido';
        
        // Status de Pagamento (Visual)
        $is_online = (strpos($payment_method_slug, 'pix-sicredi') !== false || strpos($payment_method_slug, 'pix-automatico') !== false);
        $has_paid = false;
        foreach($payments_rows as $p) { if($p->status === 'aprovado') $has_paid = true; }

        if ($is_online) {
            $payment_status = $has_paid ? 'paid' : ($order->status === 'aguardando-pagamento' ? 'awaiting_api' : 'failed_generation');
        } else {
            $payment_status = $has_paid ? 'paid' : 'manual_pending';
        }

        // Endereço
        $address = null;
        if (!empty($meta['address'])) {
            $address = [
                'pedido_rua' => $meta['address']['street'] ?? '',
                'pedido_numero' => $meta['address']['number'] ?? '',
                'pedido_bairro' => $meta['address']['bairro_name'] ?? '',
                'pedido_complemento' => $meta['address']['complement'] ?? '',
                'pedido_latitude' => $meta['address']['latitude'] ?? '',
                'pedido_longitude' => $meta['address']['longitude'] ?? '',
            ];
        }

        return [
            'id' => $order->id,
            'status' => $this->get_status_label($order->status),
            'status_slug' => $order->status,
            'status_log' => $meta['status_log'] ?? [],
            'date' => wp_date('d/m/Y H:i', strtotime($order->data_criacao)),
            'timestamp' => strtotime($order->data_criacao),
            'customer_name' => isset($meta['customer']['name']) ? explode(' ', $meta['customer']['name'])[0] : 'Cliente',
            'customer_phone' => $meta['customer']['whatsapp'] ?? '',
            'total' => 'R$ ' . number_format($order->total_geral, 2, ',', '.'),
            'details' => [
                'pedido_nome_cliente' => $meta['customer']['name'] ?? 'Cliente',
                'pedido_whatsapp_cliente' => $meta['customer']['whatsapp'] ?? '',
                'pedido_cpf_cliente' => $meta['customer']['cpf'] ?? '',
                'pedido_tipo_servico' => $order->tipo_servico,
                'pedido_total_final' => $order->total_geral,
                'pedido_subtotal' => $meta['fees']['subtotal'] ?? 0,
                'pedido_taxa_entrega' => $meta['fees']['delivery_fee'] ?? 0,
                'pedido_desconto' => $meta['fees']['discount'] ?? 0,
                'pedido_metodo_pagamento' => $payment_method_slug,
                'pedido_troco_para' => $meta['payment_info']['change_for'] ?? '',
                'pedido_endereco' => $address,
                'pedido_entregador_designado' => $meta['entregador_id'] ?? '',
            ],
            'items_json' => json_encode($legacy_items, JSON_UNESCAPED_UNICODE),
            'items_list' => $items_list,
            'payment_status' => $payment_status,
            'payment_received' => ($payment_status === 'paid'),
            'google_maps_link' => $address ? "https://maps.google.com/?q={$address['pedido_latitude']},{$address['pedido_longitude']}" : null
        ];
    }

    // --- HELPERS AUXILIARES ---

    private function is_dashboard_user_authorized() {
        return is_user_logged_in() && (current_user_can('manage_options') || current_user_can('edit_posts'));
    }

    private function get_status_label($slug) {
        $term = get_term_by('slug', $slug, 'nativa_order_status');
        return $term ? $term->name : ucfirst($slug);
    }

    private function get_all_statuses() {
        $terms = get_terms(['taxonomy' => 'nativa_order_status', 'hide_empty' => false]);
        $statuses = [];
        if (!is_wp_error($terms)) {
            foreach ($terms as $t) $statuses[] = ['slug' => $t->slug, 'name' => $t->name];
        }
        return $statuses;
    }

    private function get_all_entregadores() {
        $posts = get_posts(['post_type' => 'nativa_entregador', 'numberposts' => -1]);
        $ent = [];
        foreach ($posts as $p) $ent[] = ['id' => $p->ID, 'name' => $p->post_title];
        return $ent;
    }

    private function get_payment_methods_data() {
        $posts = get_posts(['post_type' => 'nativa_pagamento', 'numberposts' => -1]);
        $map = [
            'dinheiro' => 'Dinheiro', 'pix' => 'PIX', 'credito' => 'Crédito', 'debito' => 'Débito'
        ];
        $data = [];
        foreach ($posts as $p) {
            $slug = $p->post_name;
            $map[$slug] = $p->post_title;
            $data[] = ['slug' => $slug, 'title' => $p->post_title, 'categoria' => get_field('pagamento_categoria', $p->ID)];
        }
        return ['map' => $map, 'data' => $data];
    }
}