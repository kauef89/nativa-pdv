<?php
/**
 * Controlador REST API para Criação de Pedidos (PDV).
 * VERSÃO 3.0 (AUDITADA): 
 * - Compatível com chaves de cliente (nativa_user_*)
 * - Calcula e atribui Pontos de Fidelidade
 * - Suporta tipo de serviço dinâmico
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

class ND_Orders_API_Controller {

    public function register_routes() {
        register_rest_route( 'nativa-delivery/v1', '/orders', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'create_order' ),
            'permission_callback' => '__return_true', 
            'args'                => array(
                'items'       => array( 'required' => true ),
                'payments'    => array( 'required' => true ),
                'total'       => array( 'required' => true, 'validate_callback' => function($p){ return is_numeric($p); } ),
                'customer_id' => array( 'default' => 0 ),
                'service_type'=> array( 'default' => 'pickup' ), // Novo parâmetro
            ),
        ) );
    }

    public function create_order( $request ) {
        global $wpdb;
        $user_id = get_current_user_id(); // Operador
        if ( $user_id == 0 && defined('WP_DEBUG') && WP_DEBUG ) { $user_id = 1; }

        $items       = $request->get_param( 'items' );
        $payments    = $request->get_param( 'payments' );
        $total_order = floatval( $request->get_param( 'total' ) );
        $customer_id = absint( $request->get_param( 'customer_id' ) );
        $service_type= sanitize_key( $request->get_param( 'service_type' ) ?: 'pickup' );

        // 1. Validar Sessão de Caixa
        $table_sessoes = $wpdb->prefix . 'nativa_caixa_sessoes';
        $session_id = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM $table_sessoes WHERE user_id = %d AND status = 'aberto'", $user_id ) );

        if ( ! $session_id ) {
            return new WP_Error( 'no_session', 'Caixa fechado. Abra o caixa para vender.', array( 'status' => 400 ) );
        }

        // 2. Dados do Cliente (Chaves Corretas Auditadas)
        $customer_name = 'Cliente Balcão';
        $customer_phone = '';
        $customer_cpf = '';

        if ( $customer_id > 0 ) {
            $user_info = get_userdata( $customer_id );
            if ( $user_info ) {
                $customer_name = $user_info->display_name;
                $customer_phone = get_user_meta( $customer_id, 'nativa_user_phone', true );
                $customer_cpf = get_user_meta( $customer_id, 'nativa_user_cpf', true );
            }
        }

        // 3. Preparar JSON de Itens para Dashboard Legado
        $legacy_items = array();
        foreach ( $items as $index => $item ) {
            $legacy_items['item_' . $index] = array(
                'product_id'   => $item['id'],
                'product_name' => $item['name'],
                'name'         => $item['name'],
                'quantity'     => $item['qty'],
                'price'        => $item['price'],
                'total_item_price' => floatval($item['price']) * intval($item['qty']),
                'selected_addons' => $item['options'] ?? [] // Mapeia opções se houver
            );
        }
        $items_json = json_encode( $legacy_items, JSON_UNESCAPED_UNICODE );

        // 4. Criar Pedido
        $order_data = array(
            'post_title'  => 'PDV #' . time() . ' - ' . $customer_name,
            'post_type'   => 'nativa_pedido',
            'post_status' => 'publish',
            'post_author' => $customer_id ?: $user_id,
        );

        $order_id = wp_insert_post( $order_data );
        if ( is_wp_error( $order_id ) ) return new WP_Error( 'db_error', 'Erro ao criar pedido.', array( 'status' => 500 ) );

        wp_update_post( array( 'ID' => $order_id, 'post_title' => "Pedido #{$order_id} (PDV)" ) );

        // 5. Salvar Metadados (Compatibilidade Total)
        update_post_meta( $order_id, 'pedido_nome_cliente', $customer_name );
        update_post_meta( $order_id, 'pedido_whatsapp_cliente', $customer_phone );
        update_post_meta( $order_id, 'pedido_cpf_cliente', $customer_cpf );
        if ( $customer_id > 0 ) update_post_meta( $order_id, '_customer_user', $customer_id );

        update_post_meta( $order_id, 'pedido_tipo_servico', $service_type );
        update_post_meta( $order_id, 'pedido_itens_json', $items_json );
        update_post_meta( $order_id, 'pedido_subtotal', $total_order );
        update_post_meta( $order_id, 'pedido_total_final', $total_order );
        update_post_meta( $order_id, 'pedido_taxa_entrega', 0 );
        update_post_meta( $order_id, 'pedido_desconto', 0 );

        // Pagamentos
        $primary_method = isset($payments[0]) ? $payments[0]['method'] : 'dinheiro';
        update_post_meta( $order_id, 'pedido_metodo_pagamento', $primary_method );
        update_post_meta( $order_id, '_nativa_payment_info', $payments );
        
        // Controle
        update_post_meta( $order_id, '_nativa_order_type', 'pdv' );
        update_post_meta( $order_id, '_nativa_cash_session_id', $session_id );
        update_post_meta( $order_id, '_nativa_operator_id', $user_id );
        update_post_meta( $order_id, '_payment_status', 'paid' );
        update_post_meta( $order_id, '_payment_received', 1 );
        
        wp_set_object_terms( $order_id, 'finalizado', 'nativa_order_status' );

        // 6. Calcular e Atribuir Pontos de Fidelidade (NOVO)
        $points_earned = 0;
        if ( $customer_id > 0 ) {
            $points_per_real = get_field('points_per_real', 'option'); // Pega da config global
            $points_per_real = $points_per_real ? floatval($points_per_real) : 0;
            
            if ( $points_per_real > 0 ) {
                $points_earned = floor( $total_order * $points_per_real );
                if ( $points_earned > 0 ) {
                    update_field( 'pedido_pontos_ganhos', $points_earned, $order_id );
                    
                    // Atualiza saldo do cliente
                    $current_points = (int) get_user_meta( $customer_id, 'nativa_user_points', true );
                    update_user_meta( $customer_id, 'nativa_user_points', $current_points + $points_earned );
                    update_post_meta( $order_id, '_loyalty_points_awarded', true );
                }
            }
        }

        // 7. Movimento de Caixa
        $total_dinheiro = 0;
        foreach($payments as $pay) {
            if($pay['method'] === 'dinheiro') $total_dinheiro += floatval($pay['value']);
        }

        if ($total_dinheiro > 0) {
            $table_movimentos = $wpdb->prefix . 'nativa_caixa_movimentos';
            $wpdb->insert( $table_movimentos, array(
                'sessao_id' => $session_id, 'tipo' => 'venda_dinheiro', 'valor' => $total_dinheiro,
                'descricao' => "Venda #$order_id (Dinheiro)", 'autor_id' => $user_id, 'pedido_id' => $order_id,
                'created_at'=> current_time( 'mysql' )
            ));
        }

        return new WP_REST_Response( array(
            'success'  => true,
            'order_id' => $order_id,
            'points'   => $points_earned,
            'message'  => 'Venda realizada com sucesso!'
        ), 200 );
    }
}