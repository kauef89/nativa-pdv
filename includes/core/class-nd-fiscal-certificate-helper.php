<?php
/**
 * Helper para gerenciamento e leitura do Certificado Digital A1.
 * Responsável por carregar o arquivo .pfx seguro definido no wp-config.php.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/core
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Fiscal_Certificate_Helper {

    /**
     * Recupera o conteúdo binário do arquivo .pfx.
     *
     * @return string|WP_Error Conteúdo do certificado ou erro.
     */
    public static function get_certificate_content() {
        if ( ! defined( 'NATIVA_FISCAL_CERT_PATH' ) || ! NATIVA_FISCAL_CERT_PATH ) {
            return new WP_Error( 'cert_not_defined', 'Caminho do certificado não definido no wp-config.php.' );
        }

        $path = NATIVA_FISCAL_CERT_PATH;

        if ( ! file_exists( $path ) ) {
            return new WP_Error( 'cert_not_found', 'Arquivo de certificado não encontrado no caminho especificado.' );
        }

        if ( ! is_readable( $path ) ) {
            return new WP_Error( 'cert_not_readable', 'Sem permissão para ler o arquivo de certificado.' );
        }

        $content = file_get_contents( $path );

        if ( false === $content ) {
            return new WP_Error( 'cert_read_error', 'Erro ao ler o conteúdo do certificado.' );
        }

        return $content;
    }

    /**
     * Recupera a senha do certificado.
     *
     * @return string Senha.
     */
    public static function get_certificate_password() {
        if ( defined( 'NATIVA_FISCAL_CERT_PASS' ) ) {
            return NATIVA_FISCAL_CERT_PASS;
        }
        return '';
    }

    /**
     * Valida se o certificado é válido e retorna seus dados (validade, CNPJ, etc).
     * Útil para exibir status no painel.
     *
     * @return array|WP_Error Dados do certificado ou erro.
     */
    public static function validate_certificate() {
        $pfx_content = self::get_certificate_content();
        if ( is_wp_error( $pfx_content ) ) {
            return $pfx_content;
        }

        $password = self::get_certificate_password();
        $certs = array();

        // Tenta ler o PKCS#12 (formato do .pfx)
        if ( ! openssl_pkcs12_read( $pfx_content, $certs, $password ) ) {
            return new WP_Error( 'cert_invalid_password', 'Não foi possível ler o certificado. Senha incorreta ou arquivo corrompido.' );
        }

        $data = openssl_x509_parse( $certs['cert'] );
        
        return array(
            'valid_from' => date( 'd/m/Y H:i', $data['validFrom_time_t'] ),
            'valid_to'   => date( 'd/m/Y H:i', $data['validTo_time_t'] ),
            'issuer'     => $data['issuer']['CN'] ?? 'Desconhecido',
            'subject'    => $data['subject']['CN'] ?? 'Desconhecido',
            'is_expired' => ( time() > $data['validTo_time_t'] )
        );
    }
}