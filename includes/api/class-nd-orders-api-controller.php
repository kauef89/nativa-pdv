<?php
/**
 * Controlador REST API para Pedidos (PDV & Dashboard).
 * VERSÃO 4.1 (CORREÇÃO DE CARRINHO): Injeta itens explicitamente no Creator.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

class ND_Orders_API_Controller {

    private $wpdb;

    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
    }

    public function register_routes() {
        $namespace = 'nativa-delivery/v1';

        // Criação de Pedido (PDV/App)
        register_rest_route( $namespace, '/orders', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'create_order' ),
            'permission_callback' => '__return_true',
            'args'                => array( 'items' => array( 'required' => true ) )
        ) );

        // Listagem de Pedidos (Dashboard Cozinha/Balcão)
        register_rest_route( $namespace, '/orders/list', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'get_orders' ),
            'permission_callback' => array( $this, 'check_permission' ),
        ) );
        
        // Atualização de Status (Kanban)
        register_rest_route( $namespace, '/orders/(?P<id>\d+)/status', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'update_order_status' ),
            'permission_callback' => array( $this, 'check_permission' ),
        ) );
    }

    public function check_permission() {
        return current_user_can('edit_posts') || current_user_can('read');
    }

    /**
     * POST /orders - Criação (Wrapper para ND_Order_Creator)
     */
    public function create_order( $request ) {
        $params = $request->get_params();
        
        // Monta os dados para o Creator
        $checkout_data = [
            'modality' => $params['service_type'] ?? 'pickup',
            'customer' => [
                'name' => 'Cliente PDV',
                'cpf' => '',
                'whatsapp' => ''
            ],
            'totals' => [
                'delivery_fee' => 0 // PDV geralmente não tem taxa, ou vem no payload
            ], 
            'payments' => $params['payments'] ?? [],
            'user_id' => get_current_user_id(),
            
            // --- CORREÇÃO CRÍTICA ---
            // Passa os itens da API diretamente para o Creator.
            // Isso previne que ele tente ler a sessão vazia do PHP.
            'items' => $params['items'] ?? [] 
        ];
        
        // Se houver ID de cliente, busca dados reais
        if ( !empty($params['customer_id']) ) {
            $user = get_userdata($params['customer_id']);
            if ($user) {
                $checkout_data['customer']['name'] = $user->display_name;
                $checkout_data['customer']['cpf'] = get_user_meta($user->ID, 'nativa_user_cpf', true);
                $checkout_data['customer']['whatsapp'] = get_user_meta($user->ID, 'nativa_user_phone', true);
            }
        } else {
            // Tenta pegar dados do payload se for cliente avulso
            if ( !empty($params['customer_name']) ) $checkout_data['customer']['name'] = $params['customer_name'];
        }

        // Instancia o Creator com os dados injetados
        $creator = new ND_Order_Creator( $checkout_data );
        
        $result = $creator->create_order();

        if ( is_wp_error( $result ) ) {
            return new WP_REST_Response( ['success' => false, 'message' => $result->get_error_message()], 400 );
        }

        return new WP_REST_Response( $result, 200 );
    }

    /**
     * GET /orders/list - Busca Otimizada SQL
     */
    public function get_orders( $request ) {
        $status_filter = $request->get_param('status');
        
        $table_p = $this->wpdb->prefix . 'nativa_pdv_pedidos';
        $table_i = $this->wpdb->prefix . 'nativa_pdv_itens_pedido';
        
        // Verifica se tabelas existem antes de consultar (segurança para instalação limpa)
        if ($this->wpdb->get_var("SHOW TABLES LIKE '$table_p'") != $table_p) {
            return new WP_REST_Response([], 200);
        }
        
        $sql = "SELECT * FROM $table_p WHERE 1=1";
        
        if ( $status_filter && $status_filter !== 'all' ) {
            $statuses = array_map('trim', explode(',', $status_filter));
            $statuses_str = implode("','", array_map('esc_sql', $statuses));
            $sql .= " AND status IN ('$statuses_str')";
        } else {
             $sql .= " AND status NOT IN ('finalizado', 'cancelado')";
        }
        
        $sql .= " ORDER BY id DESC LIMIT 50";

        $orders = $this->wpdb->get_results( $sql );
        $formatted_orders = [];

        foreach ( $orders as $order ) {
            $meta = json_decode($order->metadados_json, true);
            
            $items = $this->wpdb->get_results( 
                $this->wpdb->prepare("SELECT * FROM $table_i WHERE pedido_id = %d", $order->id) 
            );

            $formatted_items = [];
            foreach($items as $item) {
                $opts = json_decode($item->adicionais_json, true);
                $formatted_items[] = [
                    'product_id' => $item->produto_id,
                    'name' => $item->nome_produto,
                    'quantity' => $item->quantidade,
                    'total' => $item->subtotal,
                    'obs' => $item->observacoes,
                    'options' => $opts
                ];
            }

            $formatted_orders[] = [
                'id' => $order->id,
                'status' => $order->status,
                'customer_name' => $meta['customer']['name'] ?? 'Cliente',
                'customer_phone' => $meta['customer']['whatsapp'] ?? '',
                'type' => $order->tipo_servico,
                'total' => $order->total_geral,
                'created_at' => $order->data_criacao,
                'payment_method' => 'Múltiplos',
                'items' => $formatted_items,
                'address' => $meta['address'] ?? null
            ];
        }

        return new WP_REST_Response( $formatted_orders, 200 );
    }

    /**
     * POST /orders/{id}/status - Atualização de Status
     */
    public function update_order_status( $request ) {
        $order_id = $request->get_param('id');
        $new_status = $request->get_param('status');

        if ( !$order_id || !$new_status ) {
            return new WP_Error('missing_params', 'ID e Status são obrigatórios', ['status' => 400]);
        }

        $updated = $this->wpdb->update(
            $this->wpdb->prefix . 'nativa_pdv_pedidos',
            ['status' => $new_status],
            ['id' => $order_id]
        );

        if ( $updated !== false ) {
            if ( class_exists('ND_Automations') ) {
                $automations = new ND_Automations();
                $automations->handle_status_change( $order_id, $new_status );
            }
            return new WP_REST_Response(['success' => true], 200);
        }

        return new WP_Error('update_failed', 'Falha ao atualizar banco de dados', ['status' => 500]);
    }
}