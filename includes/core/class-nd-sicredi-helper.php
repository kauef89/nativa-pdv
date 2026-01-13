<?php
/**
 * Helper para gerenciar a comunicação com a API PIX do Sicredi.
 * VERSÃO 4.0 (FINAL):
 * - Mantém toda a lógica de conexão mTLS e Auth originais.
 * - Adiciona persistência do TXID/QR Code na tabela SQL de pagamentos.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

class ND_Sicredi_Helper {

    private static function get_base_url() {
        return 'https://api-pix.sicredi.com.br';
    }

    // --- MÉTODOS DE CONEXÃO (MANTIDOS DO ORIGINAL) ---

    private static function execute_curl_request($url, $options = []) {
        $ch = curl_init();

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $options['headers'] ?? []);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Nativa Delivery Plugin/' . NATIVADELIVERY_VERSION);

        if (!empty($options['sslcertificates'])) {
            curl_setopt($ch, CURLOPT_SSLCERT, $options['sslcertificates']);
        }
        if (!empty($options['sslkey'])) {
            curl_setopt($ch, CURLOPT_SSLKEY, $options['sslkey']);
        }

        if (isset($options['method'])) {
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $options['method']);
            if ($options['method'] == 'POST' || $options['method'] == 'PUT') {
                curl_setopt($ch, CURLOPT_POSTFIELDS, $options['body']);
            }
        }
        
        $response_body = curl_exec($ch);
        $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curl_error = curl_error($ch);
        
        curl_close($ch);

        if ($curl_error) {
            return new WP_Error('curl_error', $curl_error);
        }

        return [
            'http_code' => $http_code,
            'body' => $response_body,
        ];
    }

    private static function get_auth_token() {
        $token_transient_key = 'sicredi_pix_auth_token';
        $cached_token = get_transient($token_transient_key);

        if ($cached_token) return $cached_token;

        $options = get_option('nativa_delivery_payments_options');
        
        // Prioriza constantes do wp-config.php
        $client_id = defined('NATIVA_SICREDI_CLIENT_ID') ? NATIVA_SICREDI_CLIENT_ID : ($options['client_id'] ?? '');
        $client_secret = defined('NATIVA_SICREDI_CLIENT_SECRET') ? NATIVA_SICREDI_CLIENT_SECRET : ($options['client_secret'] ?? '');
        $cert_path = defined('NATIVA_SICREDI_CERT_PATH') ? NATIVA_SICREDI_CERT_PATH : ($options['path_cert'] ?? '');
        $key_path = defined('NATIVA_SICREDI_KEY_PATH') ? NATIVA_SICREDI_KEY_PATH : ($options['path_key'] ?? '');

        if (empty($client_id) || empty($client_secret)) {
            return new WP_Error('missing_credentials', 'Credenciais Sicredi ausentes.');
        }

        $url = self::get_base_url() . '/oauth/token';
        $auth_string = base64_encode($client_id . ':' . $client_secret);
        
        $request_options = [
            'method'    => 'POST',
            'headers'   => [
                'Content-Type: application/x-www-form-urlencoded',
                'Authorization: Basic ' . $auth_string,
            ],
            'body'      => http_build_query([
                'grant_type' => 'client_credentials',
                'scope'      => 'cob.write cob.read webhook.read webhook.write',
            ]),
            'sslcertificates' => $cert_path,
            'sslkey'    => $key_path,
        ];

        $response = self::execute_curl_request($url, $request_options);
        
        if (is_wp_error($response)) {
            error_log('ND_Sicredi: Erro Auth: ' . $response->get_error_message());
            return $response;
        }

        $body = json_decode($response['body'], true);

        if (isset($body['access_token'])) {
            set_transient($token_transient_key, $body['access_token'], ($body['expires_in'] ?? 3600) - 60);
            return $body['access_token'];
        }
        
        error_log("ND_Sicredi: Falha Auth. HTTP {$response['http_code']}. Body: " . $response['body']);
        return new WP_Error('auth_failed', 'Falha na autenticação Sicredi.');
    }

    // --- MÉTODOS DE NEGÓCIO (ATUALIZADOS PARA SQL) ---

    public static function create_pix_charge( $order_id, $order_total, $customer_name, $customer_cpf, $expiration = 3600 ) {
        global $wpdb; // Necessário para salvar na tabela

        $token = self::get_auth_token();
        if (is_wp_error($token)) return $token;
        
        $options = get_option('nativa_delivery_payments_options');
        $chave_pix = defined('NATIVA_SICREDI_CHAVE_PIX') ? NATIVA_SICREDI_CHAVE_PIX : ($options['chave_pix'] ?? '');
        $cert_path = defined('NATIVA_SICREDI_CERT_PATH') ? NATIVA_SICREDI_CERT_PATH : ($options['path_cert'] ?? '');
        $key_path = defined('NATIVA_SICREDI_KEY_PATH') ? NATIVA_SICREDI_KEY_PATH : ($options['path_key'] ?? '');

        // Gera TXID único
        $base_txid = 'NATIVA' . $order_id . 'T' . time();
        $random_suffix = bin2hex(random_bytes(6));
        $txid = substr($base_txid . $random_suffix, 0, 35);

        $cpf_sanitizado = preg_replace( '/[^0-9]/', '', $customer_cpf ?? '' );

        $request_body = [
            'calendario' => [ 'expiracao' => $expiration ],
            'devedor' => [
                'nome' => substr($customer_name, 0, 200), // Limite da API
                'cpf' => $cpf_sanitizado,
            ],
            'valor' => [ 'original' => number_format($order_total, 2, '.', '') ],
            'chave' => $chave_pix,
            'solicitacaoPagador' => 'Pedido #' . $order_id,
        ];

        $url = self::get_base_url() . '/api/v2/cob/' . $txid;

        $request_options = [
            'method' => 'PUT',
            'headers' => [
                'Content-Type: application/json',
                'Authorization: Bearer ' . $token,
            ],
            'body' => wp_json_encode($request_body),
            'sslcertificates' => $cert_path,
            'sslkey' => $key_path,
        ];
        
        $response = self::execute_curl_request($url, $request_options);

        if (is_wp_error($response)) return $response;

        $http_code = $response['http_code'];
        $body = json_decode($response['body'], true);

        if ($http_code === 201 || $http_code === 200) {
            // SUCESSO: Agora salvamos o TXID na tabela de pagamentos SQL
            
            // 1. Prepara os dados retornados pela API
            $pix_data_to_save = [
                'txid' => $body['txid'],
                'qr_code' => $body['pixCopiaECola'] ?? '',
                'loc_id' => $body['loc']['id'] ?? '',
                'status' => $body['status'] ?? 'ATIVA'
            ];

            // 2. Atualiza a tabela wp_nativa_pdv_pagamentos
            $table_pagamentos = $wpdb->prefix . 'nativa_pdv_pagamentos';
            
            // Busca a linha de pagamento PIX deste pedido (pode haver mais de um pagamento, pega o PIX)
            $payment_row = $wpdb->get_row( $wpdb->prepare(
                "SELECT id, gateway_data FROM $table_pagamentos WHERE pedido_id = %d AND metodo_pagamento LIKE %s LIMIT 1",
                $order_id, '%pix%'
            ));

            if ( $payment_row ) {
                // Mescla com dados existentes se houver
                $existing_data = json_decode($payment_row->gateway_data, true) ?: [];
                $new_gateway_data = array_merge($existing_data, $pix_data_to_save);

                $wpdb->update(
                    $table_pagamentos,
                    ['gateway_data' => json_encode($new_gateway_data, JSON_UNESCAPED_UNICODE)],
                    ['id' => $payment_row->id]
                );
            }

            // Retorna o resultado para quem chamou (Controller/OrderCreator)
            return $pix_data_to_save;

        } else {
            error_log("ND_Sicredi: Erro Criação Cobrança ($http_code). Pedido $order_id. Resp: " . $response['body']);
            return new WP_Error('charge_failed', $body['detail'] ?? 'Erro ao criar cobrança PIX.');
        }
    }
    
    public static function get_pix_charge($txid) {
        $token = self::get_auth_token();
        if (is_wp_error($token)) return $token;
        
        $options = get_option('nativa_delivery_payments_options');
        $cert_path = defined('NATIVA_SICREDI_CERT_PATH') ? NATIVA_SICREDI_CERT_PATH : ($options['path_cert'] ?? '');
        $key_path = defined('NATIVA_SICREDI_KEY_PATH') ? NATIVA_SICREDI_KEY_PATH : ($options['path_key'] ?? '');
        
        $url = self::get_base_url() . '/api/v2/cob/' . $txid;

        $request_options = [
            'method' => 'GET',
            'headers' => [ 'Authorization: Bearer ' . $token ],
            'sslcertificates' => $cert_path,
            'sslkey' => $key_path,
        ];
        
        $response = self::execute_curl_request($url, $request_options);

        if (is_wp_error($response)) return $response;
        
        if ($response['http_code'] !== 200) {
            return new WP_Error('get_charge_failed', 'Erro ao consultar PIX.');
        }

        return json_decode($response['body'], true);
    }
}