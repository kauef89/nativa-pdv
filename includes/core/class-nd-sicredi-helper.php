<?php
/**
 * Helper para gerenciar a comunicação com a API PIX do Sicredi.
 * ... (histórico de versões anterior) ...
 * VERSÃO ATUALIZADA (EXPIRAÇÃO PIX):
 * - A função create_pix_charge agora aceita um parâmetro de expiração.
 * - O valor da expiração enviado para a API Sicredi agora é dinâmico (padrão de 10 minutos).
 * VERSÃO CORRIGIDA (CPF NULL):
 * - A função create_pix_charge agora recebe $customer_name e $customer_cpf como argumentos.
 * - Isso evita uma "race condition" onde a função tentava ler o CPF do pedido (via get_field)
 * antes que a função populate_order_fields (do Order Creator) tivesse a chance de salvá-lo.
 * - Adicionada verificação de $customer_cpf ?? '' para evitar erro de null no preg_replace.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Sicredi_Helper {

    private static function get_base_url() {
        return 'https://api-pix.sicredi.com.br';
    }

    private static function execute_curl_request($url, $options = []) {
        $ch = curl_init();

        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $options['headers'] ?? []);
        curl_setopt($ch, CURLOPT_USERAGENT, 'Nativa Delivery Plugin/' . NATIVADELIVERY_VERSION);

        // Certificados mTLS
        if (!empty($options['sslcertificates'])) {
            curl_setopt($ch, CURLOPT_SSLCERT, $options['sslcertificates']);
        }
        if (!empty($options['sslkey'])) {
            curl_setopt($ch, CURLOPT_SSLKEY, $options['sslkey']);
        }

        // Configurações específicas do método
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

        if ($cached_token) {
            return $cached_token;
        }

        $options = get_option('nativa_delivery_payments_options');
        $client_id = defined('NATIVA_SICREDI_CLIENT_ID') ? NATIVA_SICREDI_CLIENT_ID : ($options['client_id'] ?? '');
        $client_secret = defined('NATIVA_SICREDI_CLIENT_SECRET') ? NATIVA_SICREDI_CLIENT_SECRET : ($options['client_secret'] ?? '');
        $cert_path = defined('NATIVA_SICREDI_CERT_PATH') ? NATIVA_SICREDI_CERT_PATH : ($options['path_cert'] ?? '');
        $key_path = defined('NATIVA_SICREDI_KEY_PATH') ? NATIVA_SICREDI_KEY_PATH : ($options['path_key'] ?? '');

        if (empty($client_id) || empty($client_secret)) {
            return new WP_Error('missing_credentials', 'Client ID ou Client Secret do Sicredi não configurados.');
        }

        $url = self::get_base_url() . '/oauth/token';
        
        $auth_string = base64_encode($client_id . ':' . $client_secret);
        $body_data = [
            'grant_type' => 'client_credentials',
            'scope'      => 'cob.write cob.read webhook.read webhook.write',
        ];

        $request_options = [
            'method'    => 'POST',
            'headers'   => [
                'Content-Type: application/x-www-form-urlencoded',
                'Authorization: Basic ' . $auth_string,
            ],
            'body'      => http_build_query($body_data),
            'sslcertificates' => $cert_path,
            'sslkey'    => $key_path,
        ];

        $response = self::execute_curl_request($url, $request_options);
        
        if (is_wp_error($response)) {
            error_log('Nativa Delivery - Erro na autenticação PIX Sicredi (cURL): ' . $response->get_error_message());
            return $response;
        }

        $http_code = $response['http_code'];
        $raw_body = $response['body'];
        $body = json_decode($raw_body, true);

        if (isset($body['access_token'])) {
            $token = $body['access_token'];
            $expires_in = $body['expires_in'] ?? 3600;
            set_transient($token_transient_key, $token, $expires_in - 60);
            return $token;
        }
        
        $log_message = "Nativa Delivery - Falha na autenticação PIX Sicredi.\n";
        $log_message .= "HTTP Code: " . $http_code . "\n";
        $log_message .= "Raw Response Body: " . $raw_body . "\n";
        error_log($log_message);
        
        return new WP_Error('auth_failed', 'Falha ao autenticar na API PIX Sicredi. Verifique as credenciais e o debug_log.');
    }

    // --- INÍCIO DA MODIFICAÇÃO: Assinatura da função alterada ---
    public static function create_pix_charge( $order_id, $order_total, $customer_name, $customer_cpf, $expiration = 3600 ) {
    // --- FIM DA MODIFICAÇÃO ---
        $token = self::get_auth_token();
        if (is_wp_error($token)) {
            return $token;
        }
        
        $options = get_option('nativa_delivery_payments_options');
        $chave_pix = defined('NATIVA_SICREDI_CHAVE_PIX') ? NATIVA_SICREDI_CHAVE_PIX : ($options['chave_pix'] ?? '');
        $cert_path = defined('NATIVA_SICREDI_CERT_PATH') ? NATIVA_SICREDI_CERT_PATH : ($options['path_cert'] ?? '');
        $key_path = defined('NATIVA_SICREDI_KEY_PATH') ? NATIVA_SICREDI_KEY_PATH : ($options['path_key'] ?? '');

        $base_txid = 'NATIVA' . $order_id . 'T' . time();
        $random_suffix = bin2hex(random_bytes(6));
        $txid = substr($base_txid . $random_suffix, 0, 35);

        // --- INÍCIO DA MODIFICAÇÃO: Uso dos parâmetros e correção do preg_replace ---
        // Garante que o CPF não seja nulo antes do preg_replace para evitar o erro "Deprecated"
        $cpf_sanitizado = preg_replace( '/[^0-9]/', '', $customer_cpf ?? '' );

        $request_body = [
            'calendario' => [ 'expiracao' => $expiration ],
            'devedor' => [
                'nome' => $customer_name,
                'cpf' => $cpf_sanitizado,
            ],
            'valor' => [ 'original' => number_format($order_total, 2, '.', '') ],
            'chave' => $chave_pix,
            'solicitacaoPagador' => 'Pedido #' . $order_id . ' na Nativa Delivery',
        ];
        // --- FIM DA MODIFICAÇÃO ---

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

        if (is_wp_error($response)) {
            error_log('Nativa Delivery - Erro na API PIX Sicredi ao criar cobrança (cURL): Pedido ' . $order_id . ' - ' . $response->get_error_message());
            return $response;
        }

        $http_code = $response['http_code'];
        $body = json_decode($response['body'], true);

        if ($http_code === 201 || $http_code === 200) {
            return self::get_pix_charge($txid);
        } else {
            $api_error_body = $response['body'];
            // Log detalhado do erro da API
            error_log('Nativa Delivery - Erro na API PIX Sicredi ao criar cobrança (HTTP ' . $http_code . '): Pedido ' . $order_id . ' - Resposta: ' . $api_error_body);
            error_log('Nativa Delivery - Dados enviados para API: ' . wp_json_encode($request_body)); // Loga o que foi enviado
            $error_message = $body['detail'] ?? 'Erro desconhecido ao criar a cobrança.';
            return new WP_Error('charge_creation_failed', $error_message);
        }
    }
    
    public static function get_pix_charge($txid) {
        $token = self::get_auth_token();
        if (is_wp_error($token)) {
            return $token;
        }
        
        $options = get_option('nativa_delivery_payments_options');
        $cert_path = defined('NATIVA_SICREDI_CERT_PATH') ? NATIVA_SICREDI_CERT_PATH : ($options['path_cert'] ?? '');
        $key_path = defined('NATIVA_SICREDI_KEY_PATH') ? NATIVA_SICREDI_KEY_PATH : ($options['path_key'] ?? '');
        
        $url = self::get_base_url() . '/api/v2/cob/' . $txid;

        $request_options = [
            'method' => 'GET',
            'headers' => [ 
                'Authorization: Bearer ' . $token,
            ],
            'sslcertificates' => $cert_path,
            'sslkey' => $key_path,
        ];
        
        $response = self::execute_curl_request($url, $request_options);

        if (is_wp_error($response)) {
            error_log('Nativa Delivery - Erro na API PIX Sicredi ao buscar detalhes da cobrança (cURL): txid ' . $txid . ' - ' . $response->get_error_message());
            return $response;
        }
        
        $http_code = $response['http_code'];
        if ($http_code !== 200) {
            $error_body = $response['body'];
            error_log('Nativa Delivery - Erro na API PIX Sicredi ao buscar detalhes da cobrança (HTTP ' . $http_code . '): txid ' . $txid . ' - Resposta: ' . $error_body);
            $decoded_error = json_decode($error_body, true);
            $error_message = $decoded_error['detail'] ?? 'Não foi possível obter os detalhes da cobrança PIX.';
            return new WP_Error('get_charge_failed', $error_message);
        }

        return json_decode($response['body'], true);
    }
}