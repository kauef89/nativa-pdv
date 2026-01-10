<?php
/**
 * NOVO ARQUIVO
 * Define o Custom Post Type (CPT) para Formas de Pagamento.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/cpt-definitions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$labels = array(
	'name'                  => _x( 'Formas de Pagamento', 'Post Type General Name', 'nativa-delivery' ),
	'singular_name'         => _x( 'Forma de Pagamento', 'Post Type Singular Name', 'nativa-delivery' ),
	'menu_name'             => __( 'Formas de Pagamento', 'nativa-delivery' ),
	'name_admin_bar'        => __( 'Forma de Pagamento', 'nativa-delivery' ),
	'all_items'             => __( 'Formas de Pagamento', 'nativa-delivery' ),
	'add_new_item'          => __( 'Adicionar Nova Forma de Pagamento', 'nativa-delivery' ),
	'add_new'               => __( 'Adicionar Nova', 'nativa-delivery' ),
	'new_item'              => __( 'Nova Forma de Pagamento', 'nativa-delivery' ),
	'edit_item'             => __( 'Editar Forma de Pagamento', 'nativa-delivery' ),
	'update_item'           => __( 'Atualizar Forma de Pagamento', 'nativa-delivery' ),
	'search_items'          => __( 'Buscar Forma de Pagamento', 'nativa-delivery' ),
	'not_found'             => __( 'Nenhuma forma de pagamento encontrada', 'nativa-delivery' ),
	'not_found_in_trash'    => __( 'Nenhuma forma de pagamento encontrada na lixeira', 'nativa-delivery' ),
);
$args   = array(
	'label'                 => __( 'Forma de Pagamento', 'nativa-delivery' ),
	'description'           => __( 'Gerencia as formas de pagamento disponíveis no checkout.', 'nativa-delivery' ),
	'labels'                => $labels,
	'supports'              => array( 'title' ), // Apenas o título (ex: "Dinheiro", "PIX Sicredi")
	'hierarchical'          => false,
	'public'                => false, // Não precisa ser público no frontend
	'show_ui'               => true,  // Mostrar no painel admin
	'show_in_menu'          => 'nativa-delivery', // Sob o menu principal
	'menu_position'         => 19, // Posição (logo após Cupons)
	'menu_icon'             => 'dashicons-money-alt',
	'show_in_admin_bar'     => false,
	'show_in_nav_menus'     => false,
	'can_export'            => true,
	'has_archive'           => false,
	'exclude_from_search'   => true,
	'publicly_queryable'    => false,
	'capability_type'       => 'post',
	'show_in_rest'          => false, // Não precisa de API REST por enquanto
);
register_post_type( 'nativa_pagamento', $args );