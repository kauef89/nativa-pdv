<?php
/**
 * Define o Custom Post Type (CPT) para Grupos de Adicionais.
 * VERSÃO ATUALIZADA: Adiciona colunas personalizadas para Edição Rápida de Disponibilidade e Indicador de Itens.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/cpt-definitions
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

$labels = array(
	'name'                  => _x( 'Adicionais', 'Post Type General Name', 'nativa-delivery' ),
	'singular_name'         => _x( 'Grupo de Adicional', 'Post Type Singular Name', 'nativa-delivery' ),
	'menu_name'             => __( 'Adicionais', 'nativa-delivery' ),
	'name_admin_bar'        => __( 'Grupo de Adicional', 'nativa-delivery' ),
	'all_items'             => __( 'Adicionais', 'nativa-delivery' ),
	'add_new_item'          => __( 'Adicionar Novo Grupo', 'nativa-delivery' ),
	'add_new'               => __( 'Adicionar Novo', 'nativa-delivery' ),
	'new_item'              => __( 'Novo Grupo', 'nativa-delivery' ),
	'edit_item'             => __( 'Editar Grupo', 'nativa-delivery' ),
	'update_item'           => __( 'Atualizar Grupo', 'nativa-delivery' ),
	'view_item'             => __( 'Ver Grupo', 'nativa-delivery' ),
	'view_items'            => __( 'Ver Grupos', 'nativa-delivery' ),
	'search_items'          => __( 'Buscar Grupo', 'nativa-delivery' ),
	'not_found'             => __( 'Nenhum grupo encontrado', 'nativa-delivery' ),
	'not_found_in_trash'    => __( 'Nenhum grupo encontrado na lixeira', 'nativa-delivery' ),
);
$args   = array(
	'label'                 => __( 'Grupo de Adicional', 'nativa-delivery' ),
	'description'           => __( 'Grupos de adicionais para produtos', 'nativa-delivery' ),
	'labels'                => $labels,
	'supports'              => array( 'title' ),
	'hierarchical'          => false,
	'public'                => true,
	'show_ui'               => true,
	'show_in_menu'          => 'nativa-delivery',
	'menu_position'         => 10,
	'show_in_admin_bar'     => true,
	'show_in_nav_menus'     => true,
	'can_export'            => true,
	'has_archive'           => false,
	'exclude_from_search'   => true,
	'publicly_queryable'    => false,
	'capability_type'       => 'post',
	'show_in_rest'          => true,
);
register_post_type( 'nativa_adic_grupo', $args );

// --- FUNÇÕES DE COLUNA PERSONALIZADA (QUICK EDIT & INDICADOR) ---

// 1. Adiciona a coluna ao cabeçalho da tabela
add_filter( 'manage_nativa_adic_grupo_posts_columns', 'nd_adicional_add_custom_columns' );
function nd_adicional_add_custom_columns( $columns ) {
    $new_columns = array();
    foreach ( $columns as $key => $value ) {
        // Insere a coluna de disponibilidade antes da data
        if ( $key === 'date' ) {
            $new_columns['disponibilidade'] = __( 'Status & Itens', 'nativa-delivery' );
        }
        $new_columns[$key] = $value;
    }
    return $new_columns;
}

// 2. Renderiza o conteúdo da coluna
add_action( 'manage_nativa_adic_grupo_posts_custom_column', 'nd_adicional_render_custom_columns', 10, 2 );
function nd_adicional_render_custom_columns( $column, $post_id ) {
    if ( $column === 'disponibilidade' ) {
        // --- PARTE A: Dropdown do Grupo ---
        $status = get_post_meta( $post_id, 'grupo_adicional_disponibilidade', true );
        if ( ! $status ) $status = 'disponivel';

        $options = array(
            'disponivel'   => __( 'Disponível', 'nativa-delivery' ),
            'oculto'       => __( 'Oculto (Grupo)', 'nativa-delivery' ),
        );

        // O campo 'field_key' deve bater com o nome do campo ACF para que o update_field funcione
        echo '<select class="nativa-quick-status-select" data-post-id="' . esc_attr( $post_id ) . '" data-field-key="grupo_adicional_disponibilidade" style="width: 100%; max-width: 140px; margin-bottom: 5px;">';
        foreach ( $options as $val => $label ) {
            echo '<option value="' . esc_attr( $val ) . '" ' . selected( $status, $val, false ) . '>' . esc_html( $label ) . '</option>';
        }
        echo '</select>';

        // --- PARTE B: Indicador de Itens Internos ---
        // Verifica itens dentro do repetidor ACF 'grupo_adicional_itens'
        // Usamos get_field para simplicidade, mas get_post_meta + unserialize seria mais leve se performance for crítica em milhares de grupos.
        // Dado o contexto de admin, get_field é aceitável.
        $itens = get_field( 'grupo_adicional_itens', $post_id );
        $unavailable_count = 0;
        $total_count = 0;

        if ( is_array( $itens ) ) {
            $total_count = count( $itens );
            foreach ( $itens as $item ) {
                if ( isset( $item['item_disponibilidade'] ) && $item['item_disponibilidade'] !== 'disponivel' ) {
                    $unavailable_count++;
                }
            }
        }

        if ( $unavailable_count > 0 ) {
            echo '<div style="color: #d63638; font-size: 11px; font-weight: 500;">';
            echo '<span class="dashicons dashicons-warning" style="font-size: 14px; width: 14px; height: 14px; vertical-align: middle;"></span> ';
            printf( _n( '%d item indisponível', '%d itens indisponíveis', $unavailable_count, 'nativa-delivery' ), $unavailable_count );
            echo '</div>';
        } else {
            echo '<div style="color: #999; font-size: 11px;">';
            echo esc_html( $total_count ) . ' itens ativos';
            echo '</div>';
        }
    }
}