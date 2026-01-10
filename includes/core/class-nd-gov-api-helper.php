<?php
/**
 * Helper para integração com a API Consulta CPF (Dados Fundamentais) do Serpro.
 * DOCUMENTAÇÃO: https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df/v2
 * VERSÃO: Produção v2
 * ATUALIZAÇÃO: Adicionada Whitelist para testes internos (Economia de API).
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Gov_API_Helper {

    private const AUTH_URL = 'https://gateway.apiserpro.serpro.gov.br/token';
    private const API_URL  = 'https://gateway.apiserpro.serpro.gov.br/consulta-cpf-df/v2/cpf/';

    private static function get_access_token() {
        $token = get_transient( 'nd_gov_api_token' );
        if ( $token ) return $token;

        $client_id = defined('NATIVA_GOV_CLIENT_ID') ? NATIVA_GOV_CLIENT_ID : '';
        $client_secret = defined('NATIVA_GOV_CLIENT_SECRET') ? NATIVA_GOV_CLIENT_SECRET : '';

        if ( empty( $client_id ) || empty( $client_secret ) ) {
            return new WP_Error( 'missing_credentials', 'Credenciais Serpro não configuradas.' );
        }

        $auth_string = base64_encode( $client_id . ':' . $client_secret );

        $response = wp_remote_post( self::AUTH_URL, array(
            'headers' => array(
                'Authorization' => 'Basic ' . $auth_string,
                'Content-Type'  => 'application/x-www-form-urlencoded',
            ),
            'body'    => 'grant_type=client_credentials',
            'timeout' => 15,
        ) );

        if ( is_wp_error( $response ) ) return $response;

        $body = json_decode( wp_remote_retrieve_body( $response ), true );
        
        if ( ! isset( $body['access_token'] ) ) {
            return new WP_Error( 'auth_failed', 'Falha na autenticação Serpro.' );
        }

        $expires_in = isset( $body['expires_in'] ) ? intval( $body['expires_in'] ) : 3600;
        set_transient( 'nd_gov_api_token', $body['access_token'], $expires_in - 60 );

        return $body['access_token'];
    }

    private static function validate_cpf_algorithm( $cpf ) {
        $cpf = preg_replace( '/[^0-9]/is', '', $cpf );
        if ( strlen( $cpf ) != 11 || preg_match( '/(\d)\1{10}/', $cpf ) ) return false;
        for ( $t = 9; $t < 11; $t++ ) {
            for ( $d = 0, $c = 0; $c < $t; $c++ ) $d += $cpf[ $c ] * ( ( $t + 1 ) - $c );
            $d = ( ( 10 * $d ) % 11 ) % 10;
            if ( $cpf[ $c ] != $d ) return false;
        }
        return true;
    }

    public static function consult_cpf( $cpf ) {
        $cpf_clean = preg_replace( '/[^0-9]/', '', $cpf );

        // --- WHITELIST DE TESTES (Bypass de Custo) ---
        // Lista de CPFs isentos de consulta na API oficial
        $whitelist = [
            '07557269950', // Seu CPF de testes
        ];

        if ( in_array( $cpf_clean, $whitelist ) ) {
            return array(
                'success' => true,
                'name'    => 'Admin Nativa (Teste)', // Nome que aparecerá no teste
                'dob'     => '1990-01-01',           // Data padrão para teste
                'status'  => 'Regular (Whitelist)'
            );
        }
        // ---------------------------------------------

        if ( strlen( $cpf_clean ) !== 11 ) return new WP_Error( 'invalid_cpf_format', 'CPF deve ter 11 dígitos.' );
        if ( ! self::validate_cpf_algorithm( $cpf_clean ) ) return new WP_Error( 'invalid_cpf_math', 'CPF inválido.' );

        $token = self::get_access_token();
        if ( is_wp_error( $token ) ) return $token;

        $url = self::API_URL . $cpf_clean;

        $response = wp_remote_get( $url, array(
            'headers' => array(
                'Authorization' => 'Bearer ' . $token,
                'Accept'        => 'application/json',
            ),
            'timeout' => 20,
        ) );

        if ( is_wp_error( $response ) ) return $response;

        $http_code = wp_remote_retrieve_response_code( $response );
        $body = json_decode( wp_remote_retrieve_body( $response ), true );

        if ( $http_code !== 200 && $http_code !== 206 ) {
            if ( $http_code === 404 ) return new WP_Error( 'not_found', 'CPF não encontrado.' );
            if ( $http_code === 403 ) return new WP_Error( 'api_forbidden', 'Acesso negado (403).' );
            if ( $http_code === 422 ) return new WP_Error( 'api_lgpd', 'Dados protegidos (LGPD).' );
            return new WP_Error( 'api_error', 'Erro Serpro (' . $http_code . ')' );
        }

        return self::process_citizen_data( $body );
    }

    private static function process_citizen_data( $data ) {
        error_log( '[Nativa Serpro API] Resposta Bruta: ' . print_r( $data, true ) );

        $status_code = isset( $data['situacao']['codigo'] ) ? intval( $data['situacao']['codigo'] ) : -1;
        $status_desc = isset( $data['situacao']['descricao'] ) ? $data['situacao']['descricao'] : 'Desconhecido';
        
        if ( in_array( $status_code, [3, 5, 8, 9] ) ) { 
             return new WP_Error( 'cpf_blocked', 'CPF irregular: ' . $status_desc );
        }

        $dob_raw = $data['nascimento'] ?? '';
        $dob_formatted = '';
        if ( strlen( $dob_raw ) === 8 ) {
            $day = substr( $dob_raw, 0, 2 );
            $month = substr( $dob_raw, 2, 2 );
            $year = substr( $dob_raw, 4, 4 );
            $dob_formatted = "$year-$month-$day"; 
        }

        $social_name = '';
        if ( ! empty( $data['nomeSocial'] ) ) $social_name = $data['nomeSocial'];
        elseif ( ! empty( $data['NomeSocial'] ) ) $social_name = $data['NomeSocial'];
        elseif ( ! empty( $data['nomesocial'] ) ) $social_name = $data['nomesocial'];

        $civil_name = $data['nome'] ?? ($data['Nome'] ?? '');
        $final_name = ! empty( $social_name ) ? $social_name : $civil_name;

        return array(
            'success' => true,
            'name'    => ucwords( strtolower( $final_name ) ),
            'dob'     => $dob_formatted,
            'status'  => $status_desc
        );
    }
}