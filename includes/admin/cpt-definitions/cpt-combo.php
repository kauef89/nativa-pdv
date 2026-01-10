<?php
/**
 * Define o Custom Post Type (CPT) para Combos.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/cpt-definitions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$labels = array(
	'name'                  => _x( 'Combos', 'Post Type General Name', 'nativa-delivery' ),
	'singular_name'         => _x( 'Combo', 'Post Type Singular Name', 'nativa-delivery' ),
	'menu_name'             => __( 'Combos', 'nativa-delivery' ),
	'name_admin_bar'        => __( 'Combo', 'nativa-delivery' ),
	'archives'              => __( 'Arquivos de Combo', 'nativa-delivery' ),
	'attributes'            => __( 'Atributos do Combo', 'nativa-delivery' ),
	'parent_item_colon'     => __( 'Combo Pai:', 'nativa-delivery' ),
	'all_items'             => __( 'Combos', 'nativa-delivery' ),
	'add_new_item'          => __( 'Adicionar Novo Combo', 'nativa-delivery' ),
	'add_new'               => __( 'Adicionar Novo', 'nativa-delivery' ),
	'new_item'              => __( 'Novo Combo', 'nativa-delivery' ),
	'edit_item'             => __( 'Editar Combo', 'nativa-delivery' ),
	'update_item'           => __( 'Atualizar Combo', 'nativa-delivery' ),
	'view_item'             => __( 'Ver Combo', 'nativa-delivery' ),
	'view_items'            => __( 'Ver Combos', 'nativa-delivery' ),
	'search_items'          => __( 'Buscar Combo', 'nativa-delivery' ),
	'not_found'             => __( 'Nenhum combo encontrado', 'nativa-delivery' ),
	'not_found_in_trash'    => __( 'Nenhum combo encontrado na lixeira', 'nativa-delivery' ),
);
$args   = array(
	'label'                 => __( 'Combo', 'nativa-delivery' ),
	'description'           => __( 'Combos promocionais de produtos', 'nativa-delivery' ),
	'labels'                => $labels,
	'supports'              => array( 'title', 'editor', 'thumbnail', 'custom-fields' ),
	'taxonomies'            => array( 'category', 'post_tag' ),
	'hierarchical'          => false,
	'public'                => true,
	'show_ui'               => true,
	'show_in_menu'          => 'nativa-delivery',
	'menu_position'         => 15,
	'show_in_admin_bar'     => true,
	'show_in_nav_menus'     => true,
	'can_export'            => true,
	'has_archive'           => true,
	'exclude_from_search'   => false,
	'publicly_queryable'    => true,
	'capability_type'       => 'post',
	'show_in_rest'          => true,
);
register_post_type( 'nativa_combo', $args );