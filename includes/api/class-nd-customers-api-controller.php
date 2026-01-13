<?php
/**
 * Controlador REST API para Dados do Cliente.
 * VERSÃO 3.0 (SQL MIGRATION): Busca histórico nas tabelas personalizadas.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

class ND_Customers_API_Controller {

    private $wpdb;

    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
    }

    public function register_routes() {
        $namespace = 'nativa-delivery/v1';

        // Endpoint: Meus Pedidos
        register_rest_route( $namespace, '/customers/me/orders', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'get_my_orders' ),
            'permission_callback' => function() { return is_user_logged_in(); },
        ) );

        // Endpoint: Detalhe do Pedido (Opcional, mas útil para o App)
        register_rest_route( $namespace, '/customers/orders/(?P<id>\d+)', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'get_order_details' ),
            'permission_callback' => function() { return is_user_logged_in(); },
        ) );
    }

    /**
     * Retorna lista de pedidos do usuário logado.
     */
    public function get_my_orders( $request ) {
        $user_id = get_current_user_id();
        $table_p = $this->wpdb->prefix . 'nativa_pdv_pedidos';
        $table_i = $this->wpdb->prefix . 'nativa_pdv_itens_pedido';

        // Busca os últimos 20 pedidos do cliente
        $orders = $this->wpdb->get_results( $this->wpdb->prepare(
            "SELECT * FROM $table_p WHERE cliente_id = %d ORDER BY id DESC LIMIT 20",
            $user_id
        ));

        $formatted_orders = [];

        foreach ( $orders as $order ) {
            // Busca itens deste pedido
            $items = $this->wpdb->get_results( $this->wpdb->prepare(
                "SELECT * FROM $table_i WHERE pedido_id = %d", 
                $order->id
            ));

            $formatted_items = [];
            foreach ( $items as $item ) {
                $opts = json_decode( $item->adicionais_json, true );
                $formatted_items[] = [
                    'name'     => $item->nome_produto,
                    'quantity' => $item->quantidade,
                    'total'    => $item->subtotal,
                    'options'  => $opts
                ];
            }

            $meta = json_decode( $order->metadados_json, true );
            $formatted_orders[] = [
                'id'           => $order->id,
                'status'       => $order->status,
                'date'         => $order->data_criacao,
                'date_formatted' => date_i18n( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), strtotime( $order->data_criacao ) ),
                'total'        => $order->total_geral,
                'type'         => $order->tipo_servico, // delivery, pickup
                'payment_method' => $this->format_payment_method_name( $order->id ),
                'items'        => $formatted_items,
                'address'      => $meta['address'] ?? null,
                'is_active'    => !in_array( $order->status, ['finalizado', 'cancelado'] )
            ];
        }

        return new WP_REST_Response( $formatted_orders, 200 );
    }

    /**
     * Retorna detalhes de um pedido específico (para a tela de detalhes/tracking).
     */
    public function get_order_details( $request ) {
        $order_id = $request->get_param( 'id' );
        $user_id  = get_current_user_id();
        $table_p  = $this->wpdb->prefix . 'nativa_pdv_pedidos';

        // Verifica se o pedido pertence ao usuário
        $order = $this->wpdb->get_row( $this->wpdb->prepare(
            "SELECT * FROM $table_p WHERE id = %d AND cliente_id = %d",
            $order_id, $user_id
        ));

        if ( ! $order ) {
            return new WP_Error( 'not_found', 'Pedido não encontrado ou acesso negado.', array( 'status' => 404 ) );
        }

        // Monta resposta detalhada (reutilizando lógica se possível)
        // Aqui podemos adicionar timeline, status do entregador, etc.
        $meta = json_decode( $order->metadados_json, true );
        
        $response = [
            'id' => $order->id,
            'status' => $order->status,
            'timeline' => $meta['status_log'] ?? [],
            'delivery_address' => $meta['address'] ?? null,
            // ... outros detalhes necessários para o tracking
        ];

        return new WP_REST_Response( $response, 200 );
    }

    // Helper simples para pegar nome do método de pagamento
    private function format_payment_method_name( $order_id ) {
        $table_pay = $this->wpdb->prefix . 'nativa_pdv_pagamentos';
        $methods = $this->wpdb->get_col( $this->wpdb->prepare(
            "SELECT metodo_pagamento FROM $table_pay WHERE pedido_id = %d",
            $order_id
        ));
        
        if ( empty( $methods ) ) return 'N/A';
        
        $names = array_map( function($m) {
            return ucfirst( str_replace( ['-', '_'], ' ', $m ) );
        }, $methods );

        return implode( ', ', $names );
    }
}