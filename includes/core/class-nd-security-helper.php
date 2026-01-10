<?php
/**
 * Helper de Segurança para validação de PIN de Supervisor.
 * Responsável por verificar autorizações críticas no PDV.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/core
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Security_Helper {

    /**
     * Verifica se o PIN fornecido corresponde ao PIN do Supervisor salvo.
     *
     * @param string $pin O PIN digitado (apenas números).
     * @return bool True se válido, False se inválido.
     */
    public static function verify_supervisor_pin( $pin ) {
        // Busca o Hash salvo nas opções
        $stored_hash = get_option( 'nativa_supervisor_pin_hash' );

        // Se não houver PIN configurado, bloqueia tudo por segurança (ou libera, depende da regra. Aqui: Bloqueia).
        if ( empty( $stored_hash ) ) {
            return false;
        }

        // Usa a função nativa do WP para verificar senha
        return wp_check_password( $pin, $stored_hash );
    }

    /**
     * Define/Atualiza o PIN do Supervisor.
     *
     * @param string $pin O novo PIN numérico.
     * @return bool True se salvo com sucesso.
     */
    public static function set_supervisor_pin( $pin ) {
        if ( empty( $pin ) || ! is_numeric( $pin ) ) {
            return false;
        }

        // Cria o Hash seguro
        $hash = wp_hash_password( $pin );
        
        return update_option( 'nativa_supervisor_pin_hash', $hash );
    }
}