<?php
/**
 * Define o Custom Post Type (CPT) para Ofertas.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$labels = array(
	'name'                  => _x( 'Ofertas', 'Post Type General Name', 'nativa-delivery' ),
	'singular_name'         => _x( 'Oferta', 'Post Type Singular Name', 'nativa-delivery' ),
	'menu_name'             => __( 'Todas as Ofertas', 'nativa-delivery' ),
	'name_admin_bar'        => __( 'Oferta', 'nativa-delivery' ),
	'archives'              => __( 'Arquivos de Oferta', 'nativa-delivery' ),
	'attributes'            => __( 'Atributos da Oferta', 'nativa-delivery' ),
	'parent_item_colon'     => __( 'Oferta Pai:', 'nativa-delivery' ),
	'all_items'             => __( 'Todas as Ofertas', 'nativa-delivery' ),
	'add_new_item'          => __( 'Adicionar Nova Oferta', 'nativa-delivery' ),
	'add_new'               => __( 'Adicionar Nova', 'nativa-delivery' ),
	'new_item'              => __( 'Nova Oferta', 'nativa-delivery' ),
	'edit_item'             => __( 'Editar Oferta', 'nativa-delivery' ),
	'update_item'           => __( 'Atualizar Oferta', 'nativa-delivery' ),
	'view_item'             => __( 'Ver Oferta', 'nativa-delivery' ),
	'view_items'            => __( 'Ver Ofertas', 'nativa-delivery' ),
	'search_items'          => __( 'Buscar Oferta', 'nativa-delivery' ),
	'not_found'             => __( 'Nenhuma oferta encontrada', 'nativa-delivery' ),
	'not_found_in_trash'    => __( 'Nenhuma oferta encontrada na lixeira', 'nativa-delivery' ),
);
$args   = array(
	'label'                 => __( 'Oferta', 'nativa-delivery' ),
	'description'           => __( 'Ofertas de upsell para o carrinho', 'nativa-delivery' ),
	'labels'                => $labels,
	'supports'              => array( 'title' ),
	'hierarchical'          => false,
	'public'                => false,
	'show_ui'               => true,
	'show_in_menu'          => false,
	'menu_position'         => 18,
	'menu_icon'             => 'dashicons-megaphone',
	'show_in_admin_bar'     => true,
	'show_in_nav_menus'     => false,
	'can_export'            => true,
	'has_archive'           => false,
	'exclude_from_search'   => true,
	'publicly_queryable'    => false,
	'capability_type'       => 'post',
	'show_in_rest'          => true,
);
register_post_type( 'nativa_oferta', $args );