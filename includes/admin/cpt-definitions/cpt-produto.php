<?php
/**
 * Define o Custom Post Type (CPT) para Produtos.
 * VERSÃO ATUALIZADA: Adiciona colunas personalizadas para Edição Rápida de Disponibilidade.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/cpt-definitions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$labels = array(
	'name'                  => _x( 'Produtos', 'Post Type General Name', 'nativa-delivery' ),
	'singular_name'         => _x( 'Produto', 'Post Type Singular Name', 'nativa-delivery' ),
	'menu_name'             => __( 'Produtos', 'nativa-delivery' ),
	'name_admin_bar'        => __( 'Produto', 'nativa-delivery' ),
	'archives'              => __( 'Arquivos de Produto', 'nativa-delivery' ),
	'attributes'            => __( 'Atributos do Produto', 'nativa-delivery' ),
	'parent_item_colon'     => __( 'Item Pai:', 'nativa-delivery' ),
	'all_items'             => __( 'Produtos', 'nativa-delivery' ),
	'add_new_item'          => __( 'Adicionar Novo Produto', 'nativa-delivery' ),
	'add_new'               => __( 'Adicionar Novo', 'nativa-delivery' ),
	'new_item'              => __( 'Novo Produto', 'nativa-delivery' ),
	'edit_item'             => __( 'Editar Produto', 'nativa-delivery' ),
	'update_item'           => __( 'Atualizar Produto', 'nativa-delivery' ),
	'view_item'             => __( 'Ver Produto', 'nativa-delivery' ),
	'view_items'            => __( 'Ver Produtos', 'nativa-delivery' ),
	'search_items'          => __( 'Buscar Produto', 'nativa-delivery' ),
	'not_found'             => __( 'Nenhum produto encontrado', 'nativa-delivery' ),
	'not_found_in_trash'    => __( 'Nenhum produto encontrado na lixeira', 'nativa-delivery' ),
	'insert_into_item'      => __( 'Inserir no produto', 'nativa-delivery' ),
	'uploaded_to_this_item' => __( 'Enviado para este produto', 'nativa-delivery' ),
	'featured_image'        => __( 'Imagem em destaque', 'nativa-delivery' ),
	'set_featured_image'    => __( 'Definir imagem em destaque', 'nativa-delivery' ),
	'remove_featured_image' => __( 'Remover imagem em destaque', 'nativa-delivery' ),
	'use_featured_image'    => __( 'Usar como imagem em destaque', 'nativa-delivery' ),
	'filter_items_list'     => __( 'Filtrar lista de produtos', 'nativa-delivery' ),
	'items_list_navigation' => __( 'Navegação da lista de produtos', 'nativa-delivery' ),
	'items_list'            => __( 'Lista de produtos', 'nativa-delivery' ),
);
$args   = array(
	'label'                 => __( 'Produto', 'nativa-delivery' ),
	'description'           => __( 'Produtos do cardápio Nativa Delivery', 'nativa-delivery' ),
	'labels'                => $labels,
	'supports'              => array( 'title', 'editor', 'thumbnail', 'custom-fields' ),
	'taxonomies'            => array( 'category', 'post_tag' ),
	'hierarchical'          => false,
	'public'                => true,
	'show_ui'               => true,
	'show_in_menu'          => 'nativa-delivery',
	'menu_position'         => 5,
	'show_in_admin_bar'     => true,
	'show_in_nav_menus'     => true,
	'can_export'            => true,
	'has_archive'           => false,
	'exclude_from_search'   => true,
	'publicly_queryable'    => false,
	'capability_type'       => 'post',
	'show_in_rest'          => true,
);
register_post_type( 'nativa_produto', $args );

// --- FUNÇÕES DE COLUNA PERSONALIZADA (QUICK EDIT) ---

// 1. Adiciona a coluna ao cabeçalho da tabela
add_filter( 'manage_nativa_produto_posts_columns', 'nd_produto_add_custom_columns' );
function nd_produto_add_custom_columns( $columns ) {
    $new_columns = array();
    foreach ( $columns as $key => $value ) {
        // Insere a coluna de disponibilidade antes da data
        if ( $key === 'date' ) {
            $new_columns['disponibilidade'] = __( 'Disponibilidade', 'nativa-delivery' );
        }
        $new_columns[$key] = $value;
    }
    return $new_columns;
}

// 2. Renderiza o conteúdo da coluna
add_action( 'manage_nativa_produto_posts_custom_column', 'nd_produto_render_custom_columns', 10, 2 );
function nd_produto_render_custom_columns( $column, $post_id ) {
    if ( $column === 'disponibilidade' ) {
        // Busca o valor atual (usando get_post_meta para performance, fallback para 'disponivel')
        $status = get_post_meta( $post_id, 'produto_disponibilidade', true );
        if ( ! $status ) $status = 'disponivel';

        $options = array(
            'disponivel'   => __( 'Disponível', 'nativa-delivery' ),
            'indisponivel' => __( 'Indisponível', 'nativa-delivery' ),
            'oculto'       => __( 'Oculto', 'nativa-delivery' ),
        );

        // Renderiza o dropdown conectado ao JS global
        echo '<select class="nativa-quick-status-select" data-post-id="' . esc_attr( $post_id ) . '" data-field-key="produto_disponibilidade" style="width: 100%; max-width: 140px;">';
        foreach ( $options as $val => $label ) {
            echo '<option value="' . esc_attr( $val ) . '" ' . selected( $status, $val, false ) . '>' . esc_html( $label ) . '</option>';
        }
        echo '</select>';
    }
}