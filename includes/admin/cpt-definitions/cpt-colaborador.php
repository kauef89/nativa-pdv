<?php
/**
 * Define o Custom Post Type (CPT) para Colaboradores (Garçons, Operadores, Freelancers).
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$labels = array(
	'name'                  => _x( 'Colaboradores', 'Post Type General Name', 'nativa-delivery' ),
	'singular_name'         => _x( 'Colaborador', 'Post Type Singular Name', 'nativa-delivery' ),
	'menu_name'             => __( 'Colaboradores', 'nativa-delivery' ),
	'name_admin_bar'        => __( 'Colaborador', 'nativa-delivery' ),
	'all_items'             => __( 'Todos os Colaboradores', 'nativa-delivery' ),
	'add_new_item'          => __( 'Adicionar Novo Colaborador', 'nativa-delivery' ),
	'add_new'               => __( 'Adicionar Novo', 'nativa-delivery' ),
	'new_item'              => __( 'Novo Colaborador', 'nativa-delivery' ),
	'edit_item'             => __( 'Editar Colaborador', 'nativa-delivery' ),
	'update_item'           => __( 'Atualizar Colaborador', 'nativa-delivery' ),
	'view_item'             => __( 'Ver Colaborador', 'nativa-delivery' ),
	'search_items'          => __( 'Buscar Colaborador', 'nativa-delivery' ),
	'not_found'             => __( 'Nenhum colaborador encontrado', 'nativa-delivery' ),
	'not_found_in_trash'    => __( 'Nenhum colaborador encontrado na lixeira', 'nativa-delivery' ),
);

$args = array(
	'label'                 => __( 'Colaborador', 'nativa-delivery' ),
	'description'           => __( 'Cadastro de equipe (Garçons, Caixa, Cozinha)', 'nativa-delivery' ),
	'labels'                => $labels,
	'supports'              => array( 'title' ), // Usaremos apenas o Nome e campos ACF
	'hierarchical'          => false,
	'public'                => false, // Não precisa de URL pública no site
	'show_ui'               => true,  // Mostrar no Admin
	'show_in_menu'          => 'nativa-delivery', // Submenu do Nativa
	'menu_position'         => 60,
	'menu_icon'             => 'dashicons-id-alt', // Ícone de Crachá
	'show_in_admin_bar'     => false,
	'show_in_nav_menus'     => false,
	'can_export'            => true,
	'has_archive'           => false,
	'exclude_from_search'   => true,
	'publicly_queryable'    => false,
	'capability_type'       => 'post',
	'show_in_rest'          => true, // Importante para o futuro
);

register_post_type( 'nativa_colaborador', $args );