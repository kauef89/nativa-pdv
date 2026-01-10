<?php
/**
 * Define o Custom Post Type (CPT) para Ruas.
 * VERSÃO CORRIGIDA: Remove o registro automático do menu para evitar duplicidade.
 * VERSÃO REATORADA (ATUAL): Define o menu pai ('nativa-delivery') diretamente no registro do CPT, eliminando a necessidade de adição manual de submenu.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$labels = array(
	'name'                  => _x( 'Ruas', 'Post Type General Name', 'nativa-delivery' ),
	'singular_name'         => _x( 'Rua', 'Post Type Singular Name', 'nativa-delivery' ),
	'menu_name'             => __( 'Ruas', 'nativa-delivery' ),
	'name_admin_bar'        => __( 'Rua', 'nativa-delivery' ),
	'archives'              => __( 'Arquivos de Ruas', 'nativa-delivery' ),
	'attributes'            => __( 'Atributos da Rua', 'nativa-delivery' ),
	'parent_item_colon'     => __( 'Rua Mãe:', 'nativa-delivery' ),
	'all_items'             => __( 'Ruas', 'nativa-delivery' ),
	'add_new_item'          => __( 'Adicionar Nova Rua', 'nativa-delivery' ),
	'add_new'               => __( 'Adicionar Nova', 'nativa-delivery' ),
	'new_item'              => __( 'Nova Rua', 'nativa-delivery' ),
	'edit_item'             => __( 'Editar Rua', 'nativa-delivery' ),
	'update_item'           => __( 'Atualizar Rua', 'nativa-delivery' ),
	'view_item'             => __( 'Ver Rua', 'nativa-delivery' ),
	'view_items'            => __( 'Ver Ruas', 'nativa-delivery' ),
	'search_items'          => __( 'Buscar Rua', 'nativa-delivery' ),
	'not_found'             => __( 'Nenhuma rua encontrada', 'nativa-delivery' ),
	'not_found_in_trash'    => __( 'Nenhuma rua encontrada na lixeira', 'nativa-delivery' ),
);
$args   = array(
	'label'                 => __( 'Rua', 'nativa-delivery' ),
	'description'           => __( 'Gerencia as ruas e sua associação com os bairros.', 'nativa-delivery' ),
	'labels'                => $labels,
	'supports'              => array( 'title' ),
	'hierarchical'          => false,
	'public'                => false,
	'show_ui'               => true,
	// --- INÍCIO E FIM DA MODIFICAÇÃO ---
	'show_in_menu'          => 'nativa-delivery', // Aponta para o slug do menu pai
	// --- FIM DA MODIFICAÇÃO ---
	'menu_position'         => 22,
    'menu_icon'             => 'dashicons-location-alt',
	'show_in_admin_bar'     => false,
	'show_in_nav_menus'     => false,
	'can_export'            => true,
	'has_archive'           => false,
	'exclude_from_search'   => true,
	'publicly_queryable'    => false,
	'capability_type'       => 'post',
	'show_in_rest'          => true,
);
register_post_type( 'nativa_rua', $args );