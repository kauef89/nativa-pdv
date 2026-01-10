<?php
/**
 * Classe para gerenciar a página de Configurações de Fidelidade.
 * VERSÃO REATORADA: Renderização e salvamento dos campos agora são 100% gerenciados pelo ACF para consistência.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Loyalty_Settings {

    public function __construct() {
        // A renderização e o salvamento agora são gerenciados pela função acf_form()
        // chamada diretamente na página de admin (ver class-nd-admin.php),
        // tornando o registro manual de campos aqui desnecessário.
    }

    /**
     * Renderiza um campo ACF específico em uma página de configurações.
     * @param array $args Argumentos contendo a 'field_key'.
     */
    public function render_acf_field( $args ) {
        if ( empty( $args['field_key'] ) ) return;

        acf_form_head();
        
        acf_render_field_wrap( get_field_object( $args['field_key'], 'option' ) );
    }

    // A função sanitize_options() foi removida, pois não é mais necessária.
}