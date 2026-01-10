<?php
/**
 * Define o Custom Post Type (CPT) para Bairros.
 * VERSÃO ATUALIZADA: Renomeia o menu para "Endereços" para agrupar as funcionalidades.
 * VERSÃO CORRIGIDA: Remove o registro automático do menu para evitar duplicidade.
 * VERSÃO REATORADA (ATUAL): Define o menu pai ('nativa-delivery') diretamente no registro do CPT, eliminando a necessidade de adição manual de submenu.
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$labels = array(
	'name'                  => _x( 'Bairros', 'Post Type General Name', 'nativa-delivery' ),
	'singular_name'         => _x( 'Bairro', 'Post Type Singular Name', 'nativa-delivery' ),
	'menu_name'             => __( 'Bairros', 'nativa-delivery' ), // O nome que aparece no menu
	'name_admin_bar'        => __( 'Bairro', 'nativa-delivery' ),
	'all_items'             => __( 'Bairros', 'nativa-delivery' ),
	'add_new_item'          => __( 'Adicionar Novo Bairro', 'nativa-delivery' ),
	'add_new'               => __( 'Adicionar Novo', 'nativa-delivery' ),
	'new_item'              => __( 'Novo Bairro', 'nativa-delivery' ),
	'edit_item'             => __( 'Editar Bairro', 'nativa-delivery' ),
	'update_item'           => __( 'Atualizar Bairro', 'nativa-delivery' ),
	'view_item'             => __( 'Ver Bairro', 'nativa-delivery' ),
	'view_items'            => __( 'Ver Bairros', 'nativa-delivery' ),
	'search_items'          => __( 'Buscar Bairro', 'nativa-delivery' ),
	'not_found'             => __( 'Nenhum bairro encontrado', 'nativa-delivery' ),
	'not_found_in_trash'    => __( 'Nenhum bairro encontrado na lixeira', 'nativa-delivery' ),
);
$args   = array(
	'label'                 => __( 'Bairro', 'nativa-delivery' ),
	'description'           => __( 'Gerencia bairros para entrega e taxas', 'nativa-delivery' ),
	'labels'                => $labels,
	'supports'              => array( 'title' ),
	'hierarchical'          => false,
	'public'                => true,
	'show_ui'               => true,
	// --- INÍCIO E FIM DA MODIFICAÇÃO ---
	'show_in_menu'          => 'nativa-delivery', // Aponta para o slug do menu pai
	// --- FIM DA MODIFICAÇÃO ---
	'menu_position'         => 20,
    'menu_icon'             => 'dashicons-admin-multisite',
	'show_in_admin_bar'     => true,
	'show_in_nav_menus'     => false,
	'can_export'            => true,
	'has_archive'           => false,
	'exclude_from_search'   => true,
	'publicly_queryable'    => false,
	'capability_type'       => 'post',
	'show_in_rest'          => true,
);
register_post_type( 'nativa_bairro', $args );