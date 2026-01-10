<?php
/**
 * Gerencia o registro de Custom Post Types (CPTs) para o plugin Nativa Delivery.
 * VERSÃO ATUALIZADA: Adiciona o CPT 'nativa_rua' ao carregamento.
 * VERSÃO CORRIGIDA: Registra os CPTs diretamente no construtor para evitar conflito de tempo com o hook 'init'.
 * ATUALIZAÇÃO (PAGAMENTOS CPT): Adiciona o CPT 'cpt-pagamento.php' ao carregamento.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_CPT_Manager {

    public function __construct() {
        // --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO DE REGISTRO) ---
        // A função de registro é chamada diretamente para garantir que
        // os CPTs sejam registrados no momento certo, sem depender de um hook que já está em execução.
        $this->register_custom_post_types();
        // --- FIM DA MODIFICAÇÃO ---
    }

    /**
     * Carrega todos os arquivos de definição de CPT do diretório 'cpt-definitions'.
     */
    public function register_custom_post_types() {
        $cpt_definitions = array(
            'cpt-pedido.php',
            'cpt-produto.php',
            'cpt-adicional-grupo.php',
            'cpt-bairro.php',
            'cpt-combo.php',
            'nativa-entregador.php',
            'cpt-cupom.php',
            'nativa_oferta.php',
            'cpt-rua.php',
            'cpt-pagamento.php', 
            'cpt-colaborador.php',
        );

        $definitions_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/cpt-definitions/';

        foreach ( $cpt_definitions as $file ) {
            $file_path = $definitions_path . $file;
            if ( file_exists( $file_path ) ) {
                require_once $file_path;
            }
        }
    }
}