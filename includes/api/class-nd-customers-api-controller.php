<?php
/**
 * Controlador REST API para Gestão de Clientes no PDV.
 * VERSÃO 2.3: Suporte a 'local_only' para economia de API e fluxo otimizado.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

class ND_Customers_API_Controller {

    public function register_routes() {
        register_rest_route( 'nativa-delivery/v1', '/customers/search', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'search_customers' ),
            'permission_callback' => '__return_true', 
            'args'                => array(
                'term' => array( 'required' => true )
            ),
        ) );

        register_rest_route( 'nativa-delivery/v1', '/customers/create', array(
            'methods'             => 'POST',
            'callback'            => array( $this, 'create_customer' ),
            'permission_callback' => '__return_true',
        ) );
    }

    public function search_customers( $request ) {
        $raw_term   = $request->get_param( 'term' );
        $local_only = $request->get_param( 'local_only' ) === 'true'; // Novo parâmetro
        $clean_term = preg_replace( '/[^0-9]/', '', $raw_term );

        // 1. Busca Local
        $args = array(
            'number' => 10,
            'fields' => array( 'ID', 'display_name', 'user_email' ),
        );

        if ( is_numeric( $clean_term ) && strlen( $clean_term ) > 4 ) {
            $args['meta_query'] = array(
                'relation' => 'OR',
                array( 'key' => 'nativa_user_phone', 'value' => $clean_term, 'compare' => 'LIKE' ),
                array( 'key' => 'nativa_user_cpf', 'value' => $clean_term, 'compare' => 'LIKE' ),
                array( 'key' => 'nativa_user_cpf', 'value' => $this->format_cpf($clean_term), 'compare' => 'LIKE' ) 
            );
        } else {
            // Se não for numérico, assume busca por nome (apenas local)
            $args['search'] = '*' . $raw_term . '*';
            $args['search_columns'] = array( 'display_name', 'user_email' );
        }

        $user_query = new WP_User_Query( $args );
        $results = array();
        $found_local = false;

        if ( ! empty( $user_query->get_results() ) ) {
            foreach ( $user_query->get_results() as $user ) {
                $found_local = true;
                $celular = get_user_meta( $user->ID, 'nativa_user_phone', true );
                $cpf     = get_user_meta( $user->ID, 'nativa_user_cpf', true );
                
                $results[] = array(
                    'id'    => $user->ID,
                    'name'  => $user->display_name,
                    'phone' => $celular,
                    'cpf'   => $cpf,
                    'source'=> 'local'
                );
            }
        }

        // 2. Integração Gov.br (Apenas se não achou local E local_only for false)
        if ( ! $found_local && ! $local_only && class_exists('ND_Gov_API_Helper') && ND_Gov_API_Helper::is_cpf_valid( $clean_term ) ) {
            
            $gov_data = ND_Gov_API_Helper::consult_cpf( $clean_term );
            
            if ( ! is_wp_error( $gov_data ) && ( isset($gov_data['success']) && $gov_data['success'] === true || isset($gov_data['name']) ) ) {
                $name = $gov_data['name'] ?? 'Cidadão Identificado';
                $dob  = $gov_data['dob'] ?? '';

                $results[] = array(
                    'id'     => 0,
                    'name'   => $name,
                    'phone'  => '', 
                    'cpf'    => $this->format_cpf($clean_term),
                    'dob'    => $dob,
                    'source' => 'gov_api' 
                );
            }
        }

        return new WP_REST_Response( array( 'success' => true, 'customers' => $results ), 200 );
    }

    public function create_customer( $request ) {
        $name  = sanitize_text_field( $request->get_param( 'name' ) );
        $phone = sanitize_text_field( $request->get_param( 'phone' ) );
        $cpf   = sanitize_text_field( $request->get_param( 'cpf' ) );
        $dob   = sanitize_text_field( $request->get_param( 'dob' ) );

        if ( empty( $name ) ) return new WP_Error( 'missing_data', 'Nome obrigatório.', array('status'=>400) );
        if ( empty( $phone ) ) return new WP_Error( 'missing_data', 'Telefone obrigatório.', array('status'=>400) );

        $login = !empty($phone) ? preg_replace('/[^0-9]/','',$phone) : 'cli_'.time();
        if ( username_exists( $login ) ) $login .= '_' . rand(1,99);

        $email = $login . '@cliente.local';
        
        $user_id = wp_create_user( $login, wp_generate_password(), $email );

        if ( is_wp_error( $user_id ) ) {
            return new WP_Error('create_err', $user_id->get_error_message(), array('status'=>500));
        }

        wp_update_user( array( 'ID' => $user_id, 'display_name' => $name, 'first_name' => $name ) );
        
        if( !empty($phone) ) update_user_meta( $user_id, 'nativa_user_phone', $phone );
        if( !empty($cpf) ) update_user_meta( $user_id, 'nativa_user_cpf', $cpf );
        if( !empty($dob) ) update_user_meta( $user_id, 'nativa_user_dob', $dob );

        $u = new WP_User( $user_id ); 
        $u->set_role( 'subscriber' );

        return new WP_REST_Response( array( 
            'success' => true, 
            'customer' => array( 'id' => $user_id, 'name' => $name, 'phone' => $phone ) 
        ), 200 );
    }

    private function format_cpf($cpf) {
        if (strlen($cpf) != 11) return $cpf;
        return substr($cpf, 0, 3) . '.' . substr($cpf, 3, 3) . '.' . substr($cpf, 6, 3) . '-' . substr($cpf, 9, 2);
    }
}