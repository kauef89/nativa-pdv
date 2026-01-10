<?php
/**
 * Registra o Custom Post Type (CPT) para as mensagens de Notificação Push.
 * Este CPT será usado para manter um histórico de todas as notificações enviadas,
 * bem como suas estatísticas de envio e abertura.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Acesso direto bloqueado
}

class ND_Push_Message_CPT {

    /**
     * Registra os hooks do WordPress.
     */
    public static function init() {
        add_action( 'init', array( __CLASS__, 'register_post_type' ), 0 );
        add_filter( 'manage_nativa_push_message_posts_columns', array( __CLASS__, 'set_custom_edit_columns' ) );
        add_action( 'manage_nativa_push_message_posts_custom_column', array( __CLASS__, 'custom_column_content' ), 10, 2 );
    }

    /**
     * Registra o Custom Post Type.
     */
    public static function register_post_type() {
        $labels = array(
            'name'                  => _x( 'Notificações Push', 'Post Type General Name', 'nativa-delivery' ),
            'singular_name'         => _x( 'Notificação Push', 'Post Type Singular Name', 'nativa-delivery' ),
            'menu_name'             => __( 'Notificações Push', 'nativa-delivery' ),
            'name_admin_bar'        => __( 'Notificação Push', 'nativa-delivery' ),
            'archives'              => __( 'Arquivo de Notificações', 'nativa-delivery' ),
            'attributes'            => __( 'Atributos da Notificação', 'nativa-delivery' ),
            'parent_item_colon'     => __( 'Notificação Pai:', 'nativa-delivery' ),
            'all_items'             => __( 'Todas as Notificações', 'nativa-delivery' ),
            'add_new_item'          => __( 'Adicionar Nova Notificação', 'nativa-delivery' ),
            'add_new'               => __( 'Adicionar Nova', 'nativa-delivery' ),
            'new_item'              => __( 'Nova Notificação', 'nativa-delivery' ),
            'edit_item'             => __( 'Editar Notificação', 'nativa-delivery' ),
            'update_item'           => __( 'Atualizar Notificação', 'nativa-delivery' ),
            'view_item'             => __( 'Ver Notificação', 'nativa-delivery' ),
            'view_items'            => __( 'Ver Notificações', 'nativa-delivery' ),
            'search_items'          => __( 'Procurar Notificação', 'nativa-delivery' ),
            'not_found'             => __( 'Nenhuma notificação encontrada', 'nativa-delivery' ),
            'not_found_in_trash'    => __( 'Nenhuma notificação encontrada na lixeira', 'nativa-delivery' ),
            'featured_image'        => __( 'Imagem Destacada', 'nativa-delivery' ),
            'set_featured_image'    => __( 'Definir imagem destacada', 'nativa-delivery' ),
            'remove_featured_image' => __( 'Remover imagem destacada', 'nativa-delivery' ),
            'use_featured_image'    => __( 'Usar como imagem destacada', 'nativa-delivery' ),
            'insert_into_item'      => __( 'Inserir na notificação', 'nativa-delivery' ),
            'uploaded_to_this_item' => __( 'Enviado para esta notificação', 'nativa-delivery' ),
            'items_list'            => __( 'Lista de notificações', 'nativa-delivery' ),
            'items_list_navigation' => __( 'Navegação da lista de notificações', 'nativa-delivery' ),
            'filter_items_list'     => __( 'Filtrar lista de notificações', 'nativa-delivery' ),
        );
        $args = array(
            'label'                 => __( 'Notificação Push', 'nativa-delivery' ),
            'description'           => __( 'Histórico de notificações push enviadas aos usuários.', 'nativa-delivery' ),
            'labels'                => $labels,
            'supports'              => array( 'title', 'editor' ),
            'hierarchical'          => false,
            'public'                => false,
            'show_ui'               => true,
            'show_in_menu'          => false, // Será exibido em um submenu customizado.
            'show_in_admin_bar'     => false,
            'show_in_nav_menus'     => false,
            'can_export'            => true,
            'has_archive'           => false,
            'exclude_from_search'   => true,
            'publicly_queryable'    => false,
            'capability_type'       => 'post',
            'rewrite'               => false,
        );
        register_post_type( 'nativa_push_message', $args );
    }

    /**
     * Adiciona colunas customizadas na tela de listagem do CPT.
     */
    public static function set_custom_edit_columns( $columns ) {
        $date_column = $columns['date'];
        unset( $columns['date'] );

        $columns['sent_count'] = __( 'Envios Bem-sucedidos', 'nativa-delivery' );
        $columns['open_count'] = __( 'Cliques na Notificação', 'nativa-delivery' );
        $columns['date'] = $date_column;

        return $columns;
    }

    /**
     * Exibe o conteúdo das colunas customizadas.
     */
    public static function custom_column_content( $column, $post_id ) {
        switch ( $column ) {
            case 'sent_count':
                $count = get_post_meta( $post_id, '_push_sent_count', true );
                echo $count ? intval( $count ) : '0';

                // --- INÍCIO DA MODIFICAÇÃO: Exibir erros se houver ---
                $errors = get_post_meta( $post_id, '_push_error_log', true );
                if ( ! empty( $errors ) && is_array( $errors ) ) {
                    echo '<br><span style="color: #d63638; font-size: 11px; display: block; margin-top: 4px;">';
                    echo '<strong>Erros detectados:</strong><br>';
                    foreach ( $errors as $error_msg ) {
                        // Limita o tamanho da mensagem de erro para não quebrar o layout
                        echo esc_html( substr( $error_msg, 0, 100 ) ) . '<br>';
                    }
                    echo '</span>';
                }
                // --- FIM DA MODIFICAÇÃO ---
                break;

            case 'open_count':
                $count = get_post_meta( $post_id, '_push_open_count', true );
                echo $count ? intval( $count ) : '0';
                break;
        }
    }
}

ND_Push_Message_CPT::init();