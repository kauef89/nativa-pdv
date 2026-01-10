<?php
/**
 * Definição do Custom Post Type: Pedido.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/admin/cpt-definitions
 * VERSÃO OTIMIZADA (ATUAL): Adiciona suporte para 'custom-fields' para melhor integração com o editor de blocos e futuras funcionalidades.
 * CORRIGIDO: Altera o argumento 'delete_with_user' para 'true', permitindo que os administradores possam excluir usuários e seus pedidos associados.
 * VERSÃO CORRIGIDA 3 (DEFINITIVA): O slug do post type foi corrigido para 'nativa_pedido' e a lógica de registro foi ajustada para garantir o carregamento correto, resolvendo o erro de "Tipo de post inválido".
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$labels = array(
    'name'                  => _x( 'Pedidos', 'Post Type General Name', 'nativa-delivery' ),
    'singular_name'         => _x( 'Pedido', 'Post Type Singular Name', 'nativa-delivery' ),
    'menu_name'             => __( 'Pedidos', 'nativa-delivery' ),
    'name_admin_bar'        => __( 'Pedido', 'nativa-delivery' ),
    'archives'              => __( 'Arquivos de Pedidos', 'nativa-delivery' ),
    'attributes'            => __( 'Atributos do Pedido', 'nativa-delivery' ),
    'parent_item_colon'     => __( 'Pedido Pai:', 'nativa-delivery' ),
    'all_items'             => __( 'Pedidos', 'nativa-delivery' ),
    'add_new_item'          => __( 'Adicionar Novo Pedido', 'nativa-delivery' ),
    'add_new'               => __( 'Adicionar Novo', 'nativa-delivery' ),
    'new_item'              => __( 'Novo Pedido', 'nativa-delivery' ),
    'edit_item'             => __( 'Editar Pedido', 'nativa-delivery' ),
    'update_item'           => __( 'Atualizar Pedido', 'nativa-delivery' ),
    'view_item'             => __( 'Ver Pedido', 'nativa-delivery' ),
    'view_items'            => __( 'Ver Pedidos', 'nativa-delivery' ),
    'search_items'          => __( 'Procurar Pedido', 'nativa-delivery' ),
    'not_found'             => __( 'Não encontrado', 'nativa-delivery' ),
    'not_found_in_trash'    => __( 'Não encontrado na lixeira', 'nativa-delivery' ),
    'featured_image'        => __( 'Imagem Destacada', 'nativa-delivery' ),
    'set_featured_image'    => __( 'Definir imagem destacada', 'nativa-delivery' ),
    'remove_featured_image' => __( 'Remover imagem destacada', 'nativa-delivery' ),
    'use_featured_image'    => __( 'Usar como imagem destacada', 'nativa-delivery' ),
    'insert_into_item'      => __( 'Inserir no pedido', 'nativa-delivery' ),
    'uploaded_to_this_item' => __( 'Enviado para este pedido', 'nativa-delivery' ),
    'items_list'            => __( 'Lista de pedidos', 'nativa-delivery' ),
    'items_list_navigation' => __( 'Navegação na lista de pedidos', 'nativa-delivery' ),
    'filter_items_list'     => __( 'Filtrar lista de pedidos', 'nativa-delivery' ),
);

$args = array(
    'label'                 => __( 'Pedido', 'nativa-delivery' ),
    'description'           => __( 'Registros de todos os pedidos realizados.', 'nativa-delivery' ),
    'labels'                => $labels,
    'supports'              => array( 'title', 'editor', 'custom-fields' ),
    'hierarchical'          => false,
    'public'                => true,
    'show_ui'               => true,
    'show_in_menu'          => 'nativa-delivery', // Garante que o menu apareça sob "Nativa Delivery"
    'menu_position'         => 5,
    'menu_icon'             => 'dashicons-store',
    'show_in_admin_bar'     => true,
    'show_in_nav_menus'     => true,
    'can_export'            => true,
    'has_archive'           => true,
    'exclude_from_search'   => true,
    'publicly_queryable'    => true,
    'capability_type'       => 'post',
    'show_in_rest'          => true,
    'delete_with_user'      => true,
);

// --- INÍCIO DA CORREÇÃO ---
// Registra o Custom Post Type diretamente, sem usar add_action.
// O arquivo já é carregado dentro do hook 'init' pelo CPT Manager.
register_post_type( 'nativa_pedido', $args );
// --- FIM DA CORREÇÃO ---