<?php
/**
 * Controlador REST API para Gestão de Caixa.
 * VERSÃO CORRIGIDA (FIX is_numeric): Usa closure para validação para evitar ArgumentCountError.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Cash_API_Controller {

    public function register_routes() {
        $namespace = 'nativa-delivery/v1';

        // 1. Abrir Caixa
        register_rest_route( $namespace, '/cash/open', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'open_session' ),
            'permission_callback' => '__return_true', 
            'args'                => array(
                'initial_balance' => array( 
                    'required' => true, 
                    'validate_callback' => function($param) { return is_numeric($param); } // Correção aqui
                ),
            ),
        ) );

        // 2. Status do Caixa
        register_rest_route( $namespace, '/cash/status', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'get_session_status' ),
            'permission_callback' => '__return_true',
        ) );

        // 3. Adicionar Movimento
        register_rest_route( $namespace, '/cash/movement', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'add_movement' ),
            'permission_callback' => '__return_true',
            'args'                => array(
                'type'        => array( 'required' => true ),
                'value'       => array( 
                    'required' => true, 
                    'validate_callback' => function($param) { return is_numeric($param); } // Correção aqui
                ),
                'description' => array( 'required' => true ),
            ),
        ) );

        // 4. Fechar Caixa
        register_rest_route( $namespace, '/cash/close', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'close_session' ),
            'permission_callback' => '__return_true',
            'args'                => array(
                'final_balance' => array( 
                    'required' => true, 
                    'validate_callback' => function($param) { return is_numeric($param); } // Correção aqui
                ),
            ),
        ) );
        
        // 5. Estorno
        register_rest_route( $namespace, '/cash/refund', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'refund_order' ),
            'permission_callback' => '__return_true',
            'args'                => array(
                'order_id' => array( 'required' => true, 'validate_callback' => function($param) { return is_numeric($param); } ),
                'pin'      => array( 'required' => true ),
                'reason'   => array( 'required' => true ),
            ),
        ) );
    }

    // --- MÉTODOS DE CALLBACK (LÓGICA) ---

    public function open_session( $request ) {
        global $wpdb;
        $user_id = get_current_user_id();
        if ( $user_id == 0 && defined('WP_DEBUG') && WP_DEBUG ) { $user_id = 1; } 

        $initial_balance = floatval( $request->get_param( 'initial_balance' ) );
        $table_sessoes = $wpdb->prefix . 'nativa_caixa_sessoes';

        $existing = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM $table_sessoes WHERE user_id = %d AND status = 'aberto'", $user_id ) );
        if ( $existing ) return new WP_Error( 'session_open', 'Caixa já aberto.', array( 'status' => 400 ) );

        $hour = (int) current_time( 'H' );
        $data_ref = ( $hour < 5 ) ? date( 'Y-m-d', strtotime( '-1 day' ) ) : current_time( 'Y-m-d' );

        $wpdb->insert( $table_sessoes, array(
            'user_id' => $user_id, 'data_referencia' => $data_ref,
            'abertura_datetime' => current_time( 'mysql' ), 'saldo_inicial' => $initial_balance, 'status' => 'aberto'
        ));

        return new WP_REST_Response( array( 'success' => true, 'session_id' => $wpdb->insert_id ), 200 );
    }

    public function get_session_status( $request ) {
        global $wpdb;
        $user_id = get_current_user_id();
        if ( $user_id == 0 && defined('WP_DEBUG') && WP_DEBUG ) { $user_id = 1; }

        $table_sessoes = $wpdb->prefix . 'nativa_caixa_sessoes';
        $session = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table_sessoes WHERE user_id = %d AND status = 'aberto'", $user_id ) );

        if ( ! $session ) return new WP_REST_Response( array( 'is_open' => false ), 200 );

        $totals = $this->calculate_session_totals( $session->id );
        
        return new WP_REST_Response( array(
            'is_open' => true,
            'session_id' => $session->id,
            'opened_at' => $session->abertura_datetime,
            'initial_balance' => (float)$session->saldo_inicial,
            'current_balance' => (float)$session->saldo_inicial + $totals['total_suprimentos'] + $totals['total_vendas_dinheiro'] - $totals['total_sangrias']
        ), 200 );
    }

    public function add_movement( $request ) {
        global $wpdb;
        $user_id = get_current_user_id();
        if ( $user_id == 0 && defined('WP_DEBUG') && WP_DEBUG ) { $user_id = 1; }

        $type = sanitize_key( $request->get_param( 'type' ) );
        $value = floatval( $request->get_param( 'value' ) );
        $description = sanitize_text_field( $request->get_param( 'description' ) );

        if ( ! in_array( $type, ['sangria', 'suprimento'] ) ) {
            return new WP_Error( 'invalid_type', 'Tipo inválido.', array( 'status' => 400 ) );
        }

        $table_sessoes = $wpdb->prefix . 'nativa_caixa_sessoes';
        $session_id = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM $table_sessoes WHERE user_id = %d AND status = 'aberto'", $user_id ) );

        if ( ! $session_id ) return new WP_Error( 'no_session', 'Nenhum caixa aberto.', array( 'status' => 400 ) );

        $table_movimentos = $wpdb->prefix . 'nativa_caixa_movimentos';
        $inserted = $wpdb->insert( $table_movimentos, array(
            'sessao_id' => $session_id, 'tipo' => $type, 'valor' => $value,
            'descricao' => $description, 'autor_id' => $user_id, 'created_at'=> current_time( 'mysql' )
        ));

        if ( ! $inserted ) return new WP_Error( 'db_error', 'Erro ao salvar movimento.', array( 'status' => 500 ) );

        return new WP_REST_Response( array( 'success' => true, 'message' => ucfirst($type) . ' registrada.' ), 200 );
    }

    public function close_session( $request ) {
        global $wpdb;
        $user_id = get_current_user_id();
        if ( $user_id == 0 && defined('WP_DEBUG') && WP_DEBUG ) { $user_id = 1; }

        $final_balance_informed = floatval( $request->get_param( 'final_balance' ) );
        $table_sessoes = $wpdb->prefix . 'nativa_caixa_sessoes';
        $session = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table_sessoes WHERE user_id = %d AND status = 'aberto'", $user_id ) );

        if ( ! $session ) return new WP_Error( 'no_session', 'Nenhum caixa aberto.', array( 'status' => 400 ) );

        $totals = $this->calculate_session_totals( $session->id );
        $system_balance = $session->saldo_inicial + $totals['total_suprimentos'] + $totals['total_vendas_dinheiro'] - $totals['total_sangrias'];
        $difference = $final_balance_informed - $system_balance;

        $updated = $wpdb->update( $table_sessoes, 
            array( 'fechamento_datetime' => current_time( 'mysql' ), 'saldo_final_informado' => $final_balance_informed, 'diferenca' => $difference, 'status' => 'fechado' ),
            array( 'id' => $session->id )
        );

        if ( false === $updated ) return new WP_Error( 'db_error', 'Erro ao fechar.', array( 'status' => 500 ) );

        return new WP_REST_Response( array( 'success' => true, 'summary' => array( 'system_expected' => $system_balance, 'user_informed'   => $final_balance_informed, 'difference'      => $difference ) ), 200 );
    }
    
    public function refund_order( $request ) {
        global $wpdb;
        $user_id = get_current_user_id();
        if ( $user_id == 0 && defined('WP_DEBUG') && WP_DEBUG ) { $user_id = 1; }

        $order_id = absint( $request->get_param( 'order_id' ) );
        $pin      = sanitize_text_field( $request->get_param( 'pin' ) );
        $reason   = sanitize_text_field( $request->get_param( 'reason' ) );

        if ( ! class_exists( 'ND_Security_Helper' ) || ! ND_Security_Helper::verify_supervisor_pin( $pin ) ) {
            return new WP_Error( 'invalid_pin', 'PIN inválido.', array( 'status' => 403 ) );
        }

        $payment_status = get_post_meta( $order_id, '_payment_status', true );
        if ( $payment_status !== 'paid' ) return new WP_Error( 'not_paid', 'Pedido não pago.', array( 'status' => 400 ) );

        $order_total = (float) get_field( 'pedido_total_final', $order_id );
        $table_sessoes = $wpdb->prefix . 'nativa_caixa_sessoes';
        $session_id = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM $table_sessoes WHERE user_id = %d AND status = 'aberto'", $user_id ) );

        if ( ! $session_id ) return new WP_Error( 'no_session', 'Necessário caixa aberto.', array( 'status' => 400 ) );

        $table_movimentos = $wpdb->prefix . 'nativa_caixa_movimentos';
        $wpdb->insert( $table_movimentos, array(
            'sessao_id' => $session_id, 'tipo' => 'estorno', 'valor' => -1 * abs( $order_total ),
            'descricao' => "Estorno Pedido #$order_id: $reason", 'autor_id'  => $user_id, 'pedido_id' => $order_id, 'created_at'=> current_time( 'mysql' )
        ));

        update_post_meta( $order_id, '_payment_status', 'refunded' );
        update_post_meta( $order_id, '_payment_refunded', 1 );
        wp_set_object_terms( $order_id, 'cancelado', 'nativa_order_status' );

        return new WP_REST_Response( array( 'success' => true, 'refunded_amount' => $order_total ), 200 );
    }

    private function calculate_session_totals( $session_id ) {
        global $wpdb;
        $table_movimentos = $wpdb->prefix . 'nativa_caixa_movimentos';
        $results = $wpdb->get_results( $wpdb->prepare( "SELECT tipo, SUM(valor) as total FROM $table_movimentos WHERE sessao_id = %d GROUP BY tipo", $session_id ) );

        $totals = array( 'total_sangrias' => 0.0, 'total_suprimentos' => 0.0, 'total_vendas_dinheiro' => 0.0 );
        foreach ( $results as $row ) {
            if ( $row->tipo === 'sangria' ) $totals['total_sangrias'] = (float) $row->total;
            if ( $row->tipo === 'suprimento' ) $totals['total_suprimentos'] = (float) $row->total;
            if ( $row->tipo === 'venda_dinheiro' ) $totals['total_vendas_dinheiro'] = (float) $row->total;
        }
        return $totals;
    }
}