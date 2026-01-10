<?php
/**
 * Define o Custom Post Type (CPT) para Entregadores.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$labels = array(
	'name'                  => _x( 'Entregadores', 'Post Type General Name', 'nativa-delivery' ),
	'singular_name'         => _x( 'Entregador', 'Post Type Singular Name', 'nativa-delivery' ),
	'menu_name'             => __( 'Entregadores', 'nativa-delivery' ),
	'name_admin_bar'        => __( 'Entregador', 'nativa-delivery' ),
	'all_items'             => __( 'Todos os Entregadores', 'nativa-delivery' ),
	'add_new_item'          => __( 'Adicionar Novo Entregador', 'nativa-delivery' ),
	'add_new'               => __( 'Adicionar Novo', 'nativa-delivery' ),
	'new_item'              => __( 'Novo Entregador', 'nativa-delivery' ),
	'edit_item'             => __( 'Editar Entregador', 'nativa-delivery' ),
	'update_item'           => __( 'Atualizar Entregador', 'nativa-delivery' ),
	'view_item'             => __( 'Ver Entregador', 'nativa-delivery' ),
	'search_items'          => __( 'Buscar Entregador', 'nativa-delivery' ),
	'not_found'             => __( 'Nenhum entregador encontrado', 'nativa-delivery' ),
	'not_found_in_trash'    => __( 'Nenhum entregador encontrado na lixeira', 'nativa-delivery' ),
);
$args   = array(
	'label'                 => __( 'Entregador', 'nativa-delivery' ),
	'description'           => __( 'Cadastro de entregadores', 'nativa-delivery' ),
	'labels'                => $labels,
	'supports'              => array( 'title' ),
	'hierarchical'          => false,
	'public'                => false,
	'show_ui'               => true,
	'show_in_menu'          => 'nativa-delivery',
	'menu_position'         => 25,
    'menu_icon'             => 'dashicons-bike',
	'show_in_admin_bar'     => false,
	'show_in_nav_menus'     => false,
	'can_export'            => true,
	'has_archive'           => false,
	'exclude_from_search'   => true,
	'publicly_queryable'    => false,
	'capability_type'       => 'post',
	'show_in_rest'          => true,
);
register_post_type( 'nativa_entregador', $args );