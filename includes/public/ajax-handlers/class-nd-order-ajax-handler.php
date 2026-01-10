<?php
/**
 * Lida com as requisições AJAX de submissão e busca de pedidos.
 *
 * VERSÃO 3.0 (UNIFICAÇÃO): 
 * - Atualizado para receber o array 'payments' (Múltiplos Pagamentos).
 * - Mantém compatibilidade com versões anteriores (fallback para form_data).
 * - Centraliza a lógica de criação no ND_Order_Creator atualizado.
 */

if (!defined('ABSPATH')) {
    exit;
}

if ( file_exists( NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
    require_once NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php';
}

class ND_Order_Ajax_Handler
{
    public function __construct()
    {
        $actions = [
            'get_my_orders', 'submit_order', 'get_orders', 'get_updated_orders', 'update_order_status',
            'assign_entregador', 'trigger_delivery_notification', 'get_order_status', 'cancel_my_order'
        ];

        foreach ($actions as $action) {
            add_action("wp_ajax_nativa_delivery_{$action}", array($this, "{$action}_ajax"));

            $public_actions = [
                'submit_order', 'get_order_status',
            ];

            if (in_array($action, $public_actions)) {
                add_action("wp_ajax_nopriv_nativa_delivery_{$action}", array($this, "{$action}_ajax"));
            }
        }
    }

    public function cancel_my_order_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Usuário não autenticado.'], 403);
            return;
        }

        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        if (!$order_id || get_post_type($order_id) !== 'nativa_pedido') {
            wp_send_json_error(['message' => 'ID do pedido inválido.'], 400);
            return;
        }

        $customer_user_id = get_post_meta($order_id, '_customer_user', true);
        if (get_current_user_id() != $customer_user_id) {
            wp_send_json_error(['message' => 'Você não tem permissão para cancelar este pedido.'], 403);
            return;
        }

        $status_terms = get_the_terms($order_id, 'nativa_order_status');
        $current_status = !empty($status_terms) && !is_wp_error($status_terms) ? $status_terms[0]->slug : 'sem-status';

        $cancellable_statuses = ['pendente', 'recebido', 'aguardando-pagamento'];
        if (!in_array($current_status, $cancellable_statuses)) {
            wp_send_json_error(['message' => 'Este pedido não pode mais ser cancelado, pois já está em preparação.'], 400);
            return;
        }

        // Se cancelar um pedido PIX Sicredi aguardando, marca o pagamento como falhado/cancelado
        $payment_method = get_field('pedido_metodo_pagamento', $order_id);
        if ($payment_method === 'pix-sicredi' && $current_status === 'aguardando-pagamento') {
             update_post_meta($order_id, '_payment_status', 'failed_generation');
        }

        $status_log = get_post_meta($order_id, 'status_log', true) ?: [];
        $status_log[] = [
            'status'    => 'cancelado',
            'timestamp' => current_time('timestamp', true),
            'changed_by'=> 'customer',
            'reason'    => 'Pedido cancelado pelo cliente.'
        ];
        update_post_meta($order_id, 'status_log', $status_log);

        wp_set_object_terms($order_id, 'cancelado', 'nativa_order_status');

        wp_send_json_success(['message' => 'Pedido cancelado com sucesso.']);
    }

    public function get_my_orders_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');

        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Usuário não logado.'], 403);
            return;
        }

        $user_id = get_current_user_id();
        $query_args = [
            'post_type' => 'nativa_pedido',
            'posts_per_page' => -1,
            'author' => $user_id,
            'post_status' => 'any',
            'orderby' => 'date',
            'order' => 'DESC'
        ];

        $orders_query = new WP_Query($query_args);
        $orders_data = [];
        if ($orders_query->have_posts()) {
            while ($orders_query->have_posts()) {
                $orders_query->the_post();
                $orders_data[] = $this->get_order_data_for_dashboard(get_the_ID());
            }
        }
        wp_reset_postdata();

        wp_send_json_success(['orders' => $orders_data]);
    }

    private function get_order_data_for_dashboard($order_id)
    {
        $all_fields = get_fields($order_id);
        $status_terms = get_the_terms($order_id, 'nativa_order_status');
        $current_status_slug = !empty($status_terms) && !is_wp_error($status_terms) ? $status_terms[0]->slug : 'sem-status';
        $current_status_name = !empty($status_terms) && !is_wp_error($status_terms) ? $status_terms[0]->name : 'Sem Status';

        $modality = $all_fields['pedido_tipo_servico'] ?? 'delivery';

        $available_statuses_slugs = [];
        if ($modality === 'delivery') {
            $available_statuses_slugs = ['pendente', 'recebido', 'aceito', 'pronto', 'enviado', 'finalizado', 'cancelado', 'aguardando-pagamento'];
        } elseif ($modality === 'pickup') {
            $available_statuses_slugs = ['pendente', 'recebido', 'aceito', 'pronto', 'finalizado', 'cancelado', 'aguardando-pagamento'];
        } elseif ($modality === 'table') {
            $available_statuses_slugs = ['pendente', 'recebido', 'aceito', 'finalizado', 'cancelado', 'aguardando-pagamento'];
        }

        $whatsapp_options = get_option('nativa_delivery_whatsapp_options');
        $communication_enabled = isset($whatsapp_options['whatsapp_communication_enabled']) && $whatsapp_options['whatsapp_communication_enabled'] === 'on';

        $notification_urls_by_status = [];
        if ($communication_enabled) {
            foreach ($available_statuses_slugs as $status_slug) {
                 if ($status_slug === 'pendente' || $status_slug === 'aguardando-pagamento') continue;
                $url = ND_Whatsapp_Helper::generate_customer_notification_url($order_id, $status_slug);
                if ($url) {
                    $notification_urls_by_status[$status_slug] = $url;
                }
            }
        }

        $delivery_notification_data = null;
        if ($modality === 'delivery') {
            $delivery_notification_data = ND_Whatsapp_Helper::generate_delivery_team_notification_message($order_id, $all_fields);
        }

        $user_id = get_post_meta($order_id, '_customer_user', true);
        $customer_dob = '';
        if ($user_id) {
            $dob_raw = get_user_meta($user_id, 'nativa_user_dob', true);
            if ($dob_raw) {
                 try {
                     $customer_dob = wp_date('d/m/Y', strtotime($dob_raw));
                 } catch (\Exception $e) {
                     $customer_dob = '';
                 }
            }
        }

        $customer_full_name = $all_fields['pedido_nome_cliente'] ?? 'N/A';
        $customer_first_name = explode(' ', trim($customer_full_name))[0];

        $status_log = get_post_meta($order_id, 'status_log', true) ?: [];

        $address_details = $all_fields['pedido_endereco'] ?? [];
        $latitude = $address_details['pedido_latitude'] ?? null;
        $longitude = $address_details['pedido_longitude'] ?? null;

        $google_maps_link = null;
        if (!empty($latitude) && !empty($longitude)) {
            $google_maps_link = "https://www.google.com/maps?q=" . floatval($latitude) . "," . floatval($longitude);
        }

        $payment_status = get_post_meta($order_id, '_payment_status', true);
        if ( empty($payment_status) ) {
            $legacy_paid = (bool) get_post_meta($order_id, '_payment_received', true);
            $legacy_refunded = (bool) get_post_meta($order_id, '_payment_refunded', true);
            if ($legacy_refunded) {
                $payment_status = 'refunded';
            } elseif ($legacy_paid) {
                $payment_status = 'paid';
            } else {
                $payment_status = 'manual_pending';
            }
        }
        
        $payment_received = ($payment_status === 'paid');
        $payment_refunded = ($payment_status === 'refunded');

        // Lógica de verificação do PIX
        if (
            isset($all_fields['pedido_metodo_pagamento']) &&
            $all_fields['pedido_metodo_pagamento'] === 'pix-sicredi' &&
            $payment_status === 'awaiting_api'
        ) {
            $sicredi_data = get_post_meta($order_id, 'sicredi_pix_data', true);
            if (!empty($sicredi_data) && !empty($sicredi_data['txid'])) {
                $live_status_data = ND_Sicredi_Helper::get_pix_charge($sicredi_data['txid']);
                
                if (!is_wp_error($live_status_data) && isset($live_status_data['status']) && $live_status_data['status'] === 'CONCLUIDA') {
                    $payment_status = 'paid';
                    update_post_meta($order_id, '_payment_status', 'paid');
                    update_post_meta($order_id, '_payment_received', 1);
                    $payment_received = true;

                    $current_status_log = get_post_meta($order_id, 'status_log', true) ?: [];
                    $order_total = get_field('pedido_total_final', $order_id);
                     $current_status_log[] = [
                         'status' => 'recebido',
                         'timestamp' => current_time('timestamp', true),
                         'changed_by' => 'system (pix)',
                         'payment_info' => [
                             'amount' => $order_total,
                             'method' => 'PIX Sicredi (Auto)',
                         ],
                     ];
                     update_post_meta($order_id, 'status_log', $current_status_log);
                     wp_set_object_terms($order_id, 'recebido', 'nativa_order_status', false);
                     $current_status_name = 'Recebido';
                     $current_status_slug = 'recebido';
                } elseif (is_wp_error($live_status_data)) {
                    $payment_status = 'failed_generation';
                }
            } else {
                $payment_status = 'failed_generation';
            }
        }

        $data_to_return = [
            'id' => $order_id,
            'status' => $current_status_name,
            'status_slug' => $current_status_slug,
            'status_log' => $status_log,
            'date' => wp_date('d/m/Y H:i', get_post_time('U', true, $order_id)),
            'timestamp' => get_post_time('U', true, $order_id),
            'customer_name' => $customer_first_name,
            'customer_dob' => $customer_dob,
            'total' => 'R$ ' . number_format_i18n(floatval($all_fields['pedido_total_final'] ?? 0), 2),
            'details' => $all_fields,
            'items_json' => $all_fields['pedido_itens_json'] ?? '{}',
            'payment_status' => $payment_status,
            'payment_received' => $payment_received,
            'payment_refunded' => $payment_refunded,
            'available_statuses' => $available_statuses_slugs,
            'notification_urls' => $notification_urls_by_status,
            'delivery_notification_data' => $delivery_notification_data,
            'google_maps_link' => $google_maps_link,
        ];

        // Adiciona dados PIX
        if (isset($all_fields['pedido_metodo_pagamento']) && $all_fields['pedido_metodo_pagamento'] === 'pix-sicredi') {
             $sicredi_pix_data = get_post_meta($order_id, 'sicredi_pix_data', true);
             if (!empty($sicredi_pix_data) && is_array($sicredi_pix_data)) {
                 if (!empty($sicredi_pix_data['pixCopiaECola'])) {
                     $pix_copia_e_cola = $sicredi_pix_data['pixCopiaECola'];
                     $data_to_return['pix_copia_e_cola'] = $pix_copia_e_cola;
                     if ($payment_status === 'awaiting_api') {
                         $data_to_return['qr_code_error'] = 'QR Code generation moved to payment handler.';
                     }
                 } else {
                      $data_to_return['qr_code_error'] = 'Código Copia e Cola não encontrado nos metadados.';
                 }
             } else {
                  $data_to_return['qr_code_error'] = 'Dados PIX Sicredi não encontrados ou inválidos nos metadados.';
             }
        }

        return $data_to_return;
    }


    public function get_order_status_ajax()
    {
        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        if (!$order_id || get_post_type($order_id) !== 'nativa_pedido') {
            wp_send_json_error(['status' => 'invalid']);
        }
        $status_terms = get_the_terms($order_id, 'nativa_order_status');
        $current_status = (!empty($status_terms) && !is_wp_error($status_terms)) ? $status_terms[0]->slug : 'unknown';

        $payment_status = get_post_meta($order_id, '_payment_status', true);
        if (empty($payment_status)) {
             $legacy_paid = (bool) get_post_meta($order_id, '_payment_received', true);
             $legacy_refunded = (bool) get_post_meta($order_id, '_payment_refunded', true);
             $payment_status = $legacy_refunded ? 'refunded' : ($legacy_paid ? 'paid' : 'manual_pending');
        }
        wp_send_json_success(['status' => $current_status, 'payment_status' => $payment_status]);
    }

    private function is_dashboard_user_authorized()
    {
        return is_user_logged_in() && current_user_can('manage_options');
    }

    public function get_orders_ajax()
    {
        if (!$this->is_dashboard_user_authorized()) {
            wp_send_json_error(['message' => 'Acesso negado.'], 403);
            return;
        }

        $date_filter = isset($_POST['date_filter']) ? sanitize_text_field($_POST['date_filter']) : 'today';
        $query_args = [
            'post_type' => 'nativa_pedido',
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'orderby' => 'date',
            'order' => 'DESC'
        ];

        if ($date_filter === 'today') {
             $timezone = wp_timezone();
             $today_dt = new \DateTimeImmutable('now', $timezone);
             $query_args['date_query'] = [
                 [ 'year' => $today_dt->format('Y'), 'month' => $today_dt->format('m'), 'day' => $today_dt->format('d'), 'compare' => '=', ]
             ];
        }

        $orders_query = new WP_Query($query_args);
        $orders_data = [];
        if ($orders_query->have_posts()) {
            while ($orders_query->have_posts()) {
                $orders_query->the_post();
                $orders_data[] = $this->get_order_data_for_dashboard(get_the_ID());
            }
        }
        wp_reset_postdata();

        $status_order = ['pendente', 'aguardando-pagamento', 'recebido', 'aceito', 'pronto', 'enviado', 'finalizado', 'cancelado'];
        $status_terms = get_terms(['taxonomy' => 'nativa_order_status', 'hide_empty' => false]);
        if (!is_wp_error($status_terms)) {
            usort($status_terms, function ($a, $b) use ($status_order) {
                $pos_a = array_search($a->slug, $status_order); $pos_b = array_search($b->slug, $status_order);
                return ($pos_a === false ? 999 : $pos_a) - ($pos_b === false ? 999 : $pos_b);
            });
        }
        $all_statuses = [];
        if (!is_wp_error($status_terms)) {
            foreach ($status_terms as $term) { $all_statuses[] = ['slug' => $term->slug, 'name' => $term->name]; }
        }

        $all_entregadores = [];
        $entregadores_query = new WP_Query(['post_type' => 'nativa_entregador', 'posts_per_page' => -1, 'post_status' => 'publish']);
        if ($entregadores_query->have_posts()) {
            while ($entregadores_query->have_posts()) {
                $entregadores_query->the_post();
                $all_entregadores[] = ['id' => get_the_ID(), 'name' => get_the_title()];
            }
        }
        wp_reset_postdata();

        $payment_methods_map = []; 
        $payment_methods_data = []; 
        
        $payment_query_args = [
            'post_type' => 'nativa_pagamento',
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ];
        $payment_query = new WP_Query($payment_query_args);
        
        if ($payment_query->have_posts()) {
            while ($payment_query->have_posts()) {
                $payment_query->the_post();
                $payment_id = get_the_ID();
                $slug = get_post_field('post_name', $payment_id);
                $title = get_the_title($payment_id);
                $categoria = get_field('pagamento_categoria', $payment_id);

                $payment_methods_map[$slug] = $title;
                $payment_methods_data[] = [
                    'slug' => $slug,
                    'title' => $title,
                    'categoria' => $categoria,
                ];
            }
        }
        wp_reset_postdata();

        $legacy_map = [
            'dinheiro' => 'Dinheiro',
            'pix' => 'PIX',
            'credito' => 'Crédito',
            'debito' => 'Débito',
            'alelo' => 'Alelo',
            'pix-sicredi' => 'PIX Sicredi',
            'pix-manual' => 'PIX (Manual)',
            'pix-fallback' => 'PIX (Fallback)',
        ];
        $payment_methods_map = array_merge($legacy_map, $payment_methods_map);

        wp_send_json_success([
            'orders' => $orders_data,
            'statuses' => $all_statuses,
            'entregadores' => $all_entregadores,
            'payment_methods_map' => $payment_methods_map,
            'payment_methods_data' => $payment_methods_data,
            'server_timestamp' => current_time('timestamp', true)
        ]);
    }


    public function get_updated_orders_ajax()
    {
        if (!$this->is_dashboard_user_authorized()) {
            wp_send_json_error(['message' => 'Acesso negado.'], 403);
             return;
        }

        $last_check = isset($_POST['last_check_timestamp']) ? (int) $_POST['last_check_timestamp'] : 0;

        if ($last_check === 0) {
            wp_send_json_success(['updated_orders' => [], 'deleted_order_ids' => [], 'server_timestamp' => current_time('timestamp', true)]);
            return;
        }

        $modified_query_args = [
            'post_type' => 'nativa_pedido', 'posts_per_page' => -1, 'post_status' => 'publish',
            'orderby' => 'date', 'order' => 'DESC',
            'date_query' => [ [ 'column' => 'post_modified_gmt', 'after' => gmdate('Y-m-d H:i:s', $last_check), 'inclusive' => false ] ]
        ];
        $orders_query = new WP_Query($modified_query_args);
        $updated_orders_data = [];
        if ($orders_query->have_posts()) {
            while ($orders_query->have_posts()) {
                $orders_query->the_post();
                $updated_orders_data[] = $this->get_order_data_for_dashboard(get_the_ID());
            }
        }
        wp_reset_postdata();

        $deleted_query_args = [
            'post_type' => 'nativa_pedido', 'posts_per_page' => -1, 'post_status' => 'trash', 'fields' => 'ids',
            'date_query' => [ [ 'column' => 'post_modified_gmt', 'after' => gmdate('Y-m-d H:i:s', $last_check), 'inclusive' => false ] ]
        ];
        $deleted_orders_query = new WP_Query($deleted_query_args);

        wp_send_json_success([
            'updated_orders' => $updated_orders_data,
            'deleted_order_ids' => $deleted_orders_query->posts,
            'server_timestamp' => current_time('timestamp', true)
        ]);
    }


    public function update_order_status_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nativa_delivery_nonce');
        if (!$this->is_dashboard_user_authorized()) {
            wp_send_json_error(['message' => 'Acesso negado.'], 403);
             return;
        }
        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        $new_status = isset($_POST['new_status']) ? sanitize_text_field($_POST['new_status']) : '';
        if (!$order_id || !$new_status) {
            wp_send_json_error(['message' => 'Dados insuficientes.']);
             return;
        }

        $term = get_term_by('slug', $new_status, 'nativa_order_status');
        if (!$term || is_wp_error($term)) {
            wp_send_json_error(['message' => 'Status inválido fornecido: ' . esc_html($new_status)], 400);
            return;
        }

        $status_log = get_post_meta($order_id, 'status_log', true);
        if (!is_array($status_log)) { $status_log = []; }
        $status_log[] = [
            'status'     => $new_status,
            'timestamp'  => current_time('timestamp', true),
            'changed_by' => 'admin (' . wp_get_current_user()->user_login . ')',
        ];
        update_post_meta($order_id, 'status_log', $status_log);

        $term_taxonomy_ids = wp_set_object_terms($order_id, $new_status, 'nativa_order_status');
        if (is_wp_error($term_taxonomy_ids)) {
             wp_send_json_error(['message' => 'Erro ao definir o status do pedido: ' . $term_taxonomy_ids->get_error_message()], 500);
             return;
        }

        if (class_exists('ND_Automations')) {
            $automations = new ND_Automations();
            $automations->send_push_notification_on_status_change($order_id, $new_status, $term->name);
        }

        $whatsapp_url = ND_Whatsapp_Helper::generate_customer_notification_url($order_id, $new_status);
        wp_send_json_success(['message' => 'Status atualizado com sucesso.', 'whatsapp_url' => $whatsapp_url]);
    }


    public function assign_entregador_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nativa_delivery_nonce');
        if (!$this->is_dashboard_user_authorized()) {
            wp_send_json_error(['message' => 'Acesso negado.'], 403);
             return;
        }
        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        $entregador_id = isset($_POST['entregador_id']) ? absint($_POST['entregador_id']) : 0;
        if (!$order_id) {
            wp_send_json_error(['message' => 'ID do pedido não informado.']);
             return;
        }

        if ($entregador_id !== 0 && get_post_type($entregador_id) !== 'nativa_entregador') {
             wp_send_json_error(['message' => 'Entregador inválido selecionado.'], 400);
             return;
        }

        $updated = update_field('pedido_entregador_designado', $entregador_id, $order_id);

        if ($updated || get_field('pedido_entregador_designado', $order_id) == $entregador_id) {
             wp_send_json_success(['message' => 'Entregador designado com sucesso.']);
        } else {
             wp_send_json_error(['message' => 'Falha ao designar entregador.'], 500);
        }
    }


    public function trigger_delivery_notification_ajax()
    {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nativa_delivery_nonce');
        if (!$this->is_dashboard_user_authorized()) {
            wp_send_json_error(['message' => 'Acesso negado.'], 403);
             return;
        }
        $order_id = isset($_POST['order_id']) ? absint($_POST['order_id']) : 0;
        if (!$order_id) {
            wp_send_json_error(['message' => 'ID do pedido não informado.']);
             return;
        }

        $order_fields = get_fields($order_id);
        $notification_data = ND_Whatsapp_Helper::generate_delivery_team_notification_message($order_id, $order_fields);

        if (!$notification_data) {
            wp_send_json_error(['message' => 'Não foi possível gerar a mensagem para o entregador.']);
             return;
        }
        wp_send_json_success(['message_text' => $notification_data]);
    }


    public function submit_order_ajax()
    {
        if ( is_user_logged_in() ) { check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce'); }

        // Dados do formulário (endereço, cliente, etc)
        parse_str(wp_unslash($_POST['form_data'] ?? ''), $form_data_array);
        
        // --- INÍCIO DA MODIFICAÇÃO (PAGAMENTOS MÚLTIPLOS) ---
        // Recupera o array de pagamentos enviado via JSON
        $payments_json = isset($_POST['payments']) ? wp_unslash($_POST['payments']) : '[]';
        $payments_data = json_decode($payments_json, true);

        // Fallback: Se não vier array (versão antiga do front), tenta montar do form_data
        if (empty($payments_data) || !is_array($payments_data)) {
            $method = $form_data_array['nativa-payment-method'] ?? '';
            if ($method) {
                // Se for dinheiro, verifica troco
                $needs_change = isset($form_data_array['nativa-needs-troco']) && $form_data_array['nativa-needs-troco'] === 'on';
                $change_for = 0;
                if ($method === 'dinheiro' && $needs_change) {
                    $change_for = isset($form_data_array['nativa-troco-para']) ? floatval(str_replace(',', '.', $form_data_array['nativa-troco-para'])) : 0;
                }
                
                // Monta estrutura única compatível
                $payments_data = [
                    [
                        'method' => $method,
                        'value' => 0, // Será calculado no Creator como total restante
                        'change_for' => $change_for
                    ]
                ];
            }
        }
        // --- FIM DA MODIFICAÇÃO ---

        $subtotal = ND_Cart_Helper::calculate_secure_cart_total();
        if ( $subtotal === 0 ) {
             wp_send_json_error(['message' => 'Seu carrinho está vazio.'], 400); return;
        }

        $delivery_fee = 0;
        $bairro_id = isset($_POST['bairro_id']) ? absint($_POST['bairro_id']) : 0;
        $modality = isset($_POST['modality']) ? sanitize_text_field($_POST['modality']) : null;
        if (!in_array($modality, ['delivery', 'pickup', 'table'])) {
             wp_send_json_error(['message' => 'Modalidade de serviço inválida selecionada.'], 400); return;
        }

        $address_data_for_creator = [];
        $customer_data_for_creator = [];
        $user_id = 0;

        if (is_user_logged_in()) {
            $user_id = get_current_user_id();
            $user_data = get_userdata($user_id);
            $customer_data_for_creator['name'] = $form_data_array['nativa-customer-name'] ?? $user_data->display_name;
            $customer_data_for_creator['cpf'] = $form_data_array['nativa-customer-cpf'] ?? get_user_meta($user_id, 'nativa_user_cpf', true);
            $customer_data_for_creator['whatsapp'] = get_user_meta($user_id, 'nativa_user_phone', true);

            if ($modality === 'delivery') {
                $addresses = get_user_meta($user_id, 'nativa_user_addresses', true); if (!is_array($addresses)) $addresses = [];
                $selected_address_id = $form_data_array['selected_address'] ?? null;
                $address_to_use = null;
                if ($selected_address_id) { foreach ($addresses as $address) { if (isset($address['id']) && $address['id'] === $selected_address_id) { $address_to_use = $address; break; } } }
                 if (!$address_to_use) { foreach ($addresses as $address) { if (isset($address['is_primary']) && $address['is_primary']) { $address_to_use = $address; break; } } }
                  if (!$address_to_use && !empty($addresses)) { $address_to_use = $addresses[0]; }

                if ($address_to_use) {
                     $bairro_post = get_post($address_to_use['bairro_id']);
                     if (!$bairro_post || $bairro_post->post_type !== 'nativa_bairro') { wp_send_json_error(['message' => 'O bairro associado ao endereço selecionado não é válido.'], 400); return; }
                    $address_data_for_creator['street'] = rawurldecode($address_to_use['street']);
                    $address_data_for_creator['number'] = $address_to_use['number'];
                    $address_data_for_creator['complement'] = $address_to_use['complement'];
                    $address_data_for_creator['bairro_name'] = $bairro_post->post_title;
                    $address_data_for_creator['latitude'] = $address_to_use['latitude'] ?? '';
                    $address_data_for_creator['longitude'] = $address_to_use['longitude'] ?? '';
                    $bairro_id = $address_to_use['bairro_id'];
                } else { wp_send_json_error(['message' => 'Endereço de entrega inválido ou não selecionado.'], 400); return; }
            }
        } else {
            $customer_data_for_creator['name'] = $form_data_array['nativa-customer-name'] ?? '';
            $customer_data_for_creator['cpf'] = $form_data_array['nativa-customer-cpf'] ?? '';
             $customer_data_for_creator['whatsapp'] = $form_data_array['nativa-customer-phone'] ?? '';

            if ($modality === 'delivery') {
                 if (empty($bairro_id)) { wp_send_json_error(['message' => 'Bairro não selecionado para entrega.'], 400); return; }
                 $bairro_post = get_post($bairro_id);
                 if (!$bairro_post || $bairro_post->post_type !== 'nativa_bairro') { wp_send_json_error(['message' => 'Bairro selecionado inválido.'], 400); return; }
                 $address_data_for_creator['bairro_name'] = $bairro_post->post_title;
            }
        }

        if ($modality === 'delivery' && $bairro_id) {
             $bairro_post = get_post($bairro_id);
             if ($bairro_post) {
                 $taxa_entrega = get_field('taxa_entrega', $bairro_id);
                 $valor_minimo_frete_gratis = get_field('valor_minimo_frete_gratis', $bairro_id);
                 $delivery_fee = is_numeric($taxa_entrega) ? floatval($taxa_entrega) : 0;
                 if ($valor_minimo_frete_gratis > 0 && $subtotal >= $valor_minimo_frete_gratis) { $delivery_fee = 0; }
             } else { wp_send_json_error(['message' => 'Erro ao buscar dados do bairro para taxa de entrega.'], 500); return; }
        } else { $delivery_fee = 0; }

        $discount = isset($_POST['discount_amount']) ? floatval($_POST['discount_amount']) : 0;
        $applied_coupon_code = isset($_POST['applied_coupon_code']) ? sanitize_text_field(strtoupper($_POST['applied_coupon_code'])) : null;
        $final_total = max(0, ($subtotal + $delivery_fee) - $discount);

        $checkout_data = [
            'modality' => $modality, 'applied_coupon_code' => $applied_coupon_code,
            'customer' => $customer_data_for_creator, 'delivery_address' => $address_data_for_creator,
            'payments' => $payments_data, // NOVA ESTRUTURA
            'totals' => [ 'subtotal' => $subtotal, 'delivery_fee' => $delivery_fee, 'discount' => $discount, 'final_total' => $final_total ],
            'user_id' => $user_id,
            'raw_form_data' => $form_data_array 
        ];

        $order_creator = new ND_Order_Creator($checkout_data);
        $result = $order_creator->create_order();

        if (is_wp_error($result)) {
            wp_send_json_error(['message' => $result->get_error_message()], $result->get_error_code() ?: 500);
        } else {
             ND_Cart_Helper::clear_cart();
            wp_send_json_success($result);
        }
    }

} // Fim da classe ND_Order_Ajax_Handler