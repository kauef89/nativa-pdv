<?php
/**
 * Define o Custom Post Type (CPT) para Cupons.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/cpt-definitions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$labels = array(
	'name'                  => _x( 'Cupons', 'Post Type General Name', 'nativa-delivery' ),
	'singular_name'         => _x( 'Cupom', 'Post Type Singular Name', 'nativa-delivery' ),
	'menu_name'             => __( 'Cupons', 'nativa-delivery' ),
	'name_admin_bar'        => __( 'Cupom', 'nativa-delivery' ),
	'all_items'             => __( 'Cupons', 'nativa-delivery' ),
	'add_new_item'          => __( 'Adicionar Novo Cupom', 'nativa-delivery' ),
	'add_new'               => __( 'Adicionar Novo', 'nativa-delivery' ),
	'new_item'              => __( 'Novo Cupom', 'nativa-delivery' ),
	'edit_item'             => __( 'Editar Cupom', 'nativa-delivery' ),
	'update_item'           => __( 'Atualizar Cupom', 'nativa-delivery' ),
	'search_items'          => __( 'Buscar Cupom', 'nativa-delivery' ),
	'not_found'             => __( 'Nenhum cupom encontrado', 'nativa-delivery' ),
	'not_found_in_trash'    => __( 'Nenhum cupom encontrado na lixeira', 'nativa-delivery' ),
);
$args   = array(
	'label'                 => __( 'Cupom', 'nativa-delivery' ),
	'description'           => __( 'Cupons de desconto para a loja.', 'nativa-delivery' ),
	'labels'                => $labels,
	'supports'              => array( 'title', 'custom-fields' ),
	'hierarchical'          => false,
	'public'                => false,
	'show_ui'               => true,
	'show_in_menu'          => 'nativa-delivery',
	'menu_position'         => 20,
	'menu_icon'             => 'dashicons-tickets-alt',
	'show_in_admin_bar'     => false,
	'show_in_nav_menus'     => false,
	'can_export'            => true,
	'has_archive'           => false,
	'exclude_from_search'   => true,
	'publicly_queryable'    => false,
	'capability_type'       => 'post',
	'show_in_rest'          => false,
);
register_post_type( 'nativa_cupom', $args );