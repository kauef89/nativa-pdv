<?php
/**
 * Gerencia o registro de Taxonomias.
 * VERSÃO CORRIGIDA: Registra as taxonomias diretamente no construtor para evitar conflito de tempo com o hook 'init'.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Taxonomy_Manager {

    public function __construct() {
        // --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO DE REGISTRO) ---
        // A função de registro é chamada diretamente para garantir que
        // as taxonomias sejam registradas no momento certo, sem depender de um hook que já está em execução.
        $this->register_custom_taxonomies();
        // --- FIM DA MODIFICAÇÃO ---
    }

    public function register_custom_taxonomies() {
        
        // Taxonomia para Status do Pedido
        register_taxonomy( 'nativa_order_status', 'nativa_pedido', array(
            'labels' => array(
                'name'          => _x( 'Status dos Pedidos', 'taxonomy general name', 'nativa-delivery' ),
                'singular_name' => _x( 'Status do Pedido', 'taxonomy singular name', 'nativa-delivery' ),
                'menu_name'     => __( 'Status dos Pedidos', 'nativa-delivery' ),
            ),
            'public'            => false,
            'show_ui'           => true,
            'show_in_menu'      => true,
            'show_admin_column' => true,
            'query_var'         => true,
            'hierarchical'      => false,
            'rewrite'           => false,
            'show_in_rest'      => true,
        ));
    }
    
    /**
     * Registra os termos padrão para a taxonomia de status.
     * Esta função agora é chamada apenas na ativação do plugin.
     */
    public function register_default_terms() {
        $statuses = array(
            'aguardando-pagamento' => 'Aguardando Pagamento',
            'pendente'   => 'Pendente',
            'recebido'   => 'Recebido',
            'aceito'     => 'Aceito',
            'pronto'     => 'Pronto',
            'enviado'    => 'Enviado',
            'finalizado' => 'Finalizado',
            'cancelado'  => 'Cancelado'
        );

        foreach ( $statuses as $slug => $name ) {
            if ( ! term_exists( $slug, 'nativa_order_status' ) ) {
                wp_insert_term( $name, 'nativa_order_status', array( 'slug' => $slug ) );
            }
        }
    }
}