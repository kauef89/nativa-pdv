<?php
/**
 * Template para exibir a listagem de um CPT específico dentro de um iframe no admin.
 * Destinado a ser usado pela página de gerenciamento de endereços.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/templates
 */

// Garante que o arquivo não seja acessado diretamente
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Verifica se o usuário tem permissão para acessar o painel administrativo
if ( ! current_user_can( 'manage_options' ) ) {
    wp_die( __( 'Acesso negado.', 'nativa-delivery' ) );
}

// Verifica se o tipo de post foi passado na URL
$post_type = isset( $_GET['post_type'] ) ? sanitize_key( $_GET['post_type'] ) : '';

if ( empty( $post_type ) ) {
    wp_die( __( 'Tipo de post não especificado.', 'nativa-delivery' ) );
}

// Garante que as classes necessárias para WP_List_Table estejam carregadas
if ( ! class_exists( 'WP_List_Table' ) ) {
    require_once( ABSPATH . 'wp-admin/includes/class-wp-list-table.php' );
}
if ( ! function_exists( '_get_list_table' ) ) {
    require_once( ABSPATH . 'wp-admin/includes/screen.php' );
}

// Configura o ambiente para a WP_List_Table
set_current_screen( 'edit-' . $post_type );
global $wp_list_table;

// Cria uma instância da tabela de listagem para o tipo de post
$wp_list_table = _get_list_table( 'WP_Posts_List_Table' );
$wp_list_table->screen->post_type = $post_type;

// Prepara os itens para exibição na tabela (paginação, filtros, busca)
$wp_list_table->prepare_items();

// Remove a barra de administração e outros elementos do tema para uma exibição "limpa"
remove_action( 'admin_notices', 'update_nag', 3 );
remove_action( 'admin_color_scheme_picker', 'admin_color_scheme_picker' ); // remove seletor de cor no perfil
add_filter( 'admin_body_class', function( $classes ) { return $classes . ' nativa-iframe-view'; } ); // Adiciona classe para estilização via CSS

// Remove a barra de ferramentas do admin
add_filter( 'show_admin_bar', '__return_false' );

// Suprime a exibição de outros elementos do admin
add_action( 'in_admin_header', function() {
    echo '<style type="text/css">
        #adminmenuback, #adminmenuwrap, #wpadminbar, #wpfooter, .update-nag, .wrap h1:first-child, .subsubsub, .search-box, .tablenav .actions, .metabox-holder, #wpbody-content > .notice { display: none !important; }
        .wrap { margin: 0 !important; padding: 0 !important; }
        #wpbody-content { padding-bottom: 0 !important; }
        .list-table-wrapper { margin: 0; padding: 0; }
    </style>';
}, 999 );

// Inicia o buffer de saída para capturar o HTML da tabela
ob_start();

?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo esc_html( get_post_type_object( $post_type )->labels->name ); ?></title>
    <?php
    // Inclui apenas o essencial de scripts e estilos do admin para a tabela
    wp_enqueue_style( 'dashicons' );
    wp_enqueue_style( 'buttons' );
    wp_enqueue_style( 'forms' );
    wp_enqueue_style( 'common' );
    wp_enqueue_style( 'list-tables' );
    wp_enqueue_style( 'admin-menu' ); // Para alguns ícones e estilos básicos

    wp_enqueue_script( 'jquery' );
    wp_enqueue_script( 'postbox' );
    wp_enqueue_script( 'dashboard' );
    wp_enqueue_script( 'inline-edit-post' );
    wp_enqueue_script( 'admin-comments' ); // Para compatibilidade
    wp_enqueue_script( 'wp-lists' );
    wp_enqueue_script( 'wp-list-table-views' );

    // Enfileira os scripts e estilos manualmente (sem wp_head/wp_footer)
    do_action( 'admin_print_styles' );
    do_action( 'admin_print_scripts' );
    ?>
</head>
<body class="wp-admin wp-core-ui js nativa-iframe-body">
    <div id="wpcontent">
        <div id="wpbody">
            <div id="wpbody-content">
                <div class="wrap">
                    <?php $wp_list_table->views(); ?>
                    <?php $wp_list_table->search_box( __( 'Buscar', 'nativa-delivery' ), 'post' ); ?>
                    <form id="posts-filter" method="get">
                        <input type="hidden" name="post_type" value="<?php echo esc_attr($post_type); ?>" />
                        <?php $wp_list_table->display(); ?>
                    </form>
                    <br class="clear" />
                </div>
            </div>
        </div>
    </div>
</body>
</html>
<?php
// Captura e exibe o conteúdo
ob_end_flush();
exit; // Garante que nenhum outro conteúdo do WordPress seja renderizado