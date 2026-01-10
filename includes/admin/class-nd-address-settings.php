<?php
/**
 * Classe para gerenciar a página de Configurações de Endereços (Bairros e Ruas).
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Address_Settings {

    public function __construct() {
        // Não precisamos registrar seções de settings aqui, a renderização é via iframe.
    }

    /**
     * Renderiza a página de gerenciamento de endereços com abas, usando iframes.
     * Esta é a função de callback chamada pelo add_submenu_page.
     */
    public function display_addresses_page_content() {
        ?>
        <div class="wrap">
            <h1>Gerenciamento de Endereços</h1>

            <?php
            // Use 'address_tab' como parâmetro para controlar as abas desta página específica.
            $active_tab = isset( $_GET['address_tab'] ) ? sanitize_key( $_GET['address_tab'] ) : 'bairros';
            ?>

            <nav class="nav-tab-wrapper">
                <a href="?page=nativa-delivery-addresses&address_tab=bairros" class="nav-tab <?php echo $active_tab == 'bairros' ? 'nav-tab-active' : ''; ?>">Bairros</a>
                <a href="?page=nativa-delivery-addresses&address_tab=ruas" class="nav-tab <?php echo $active_tab == 'ruas' ? 'nav-tab-active' : ''; ?>">Ruas</a>
            </nav>

            <div class="tab-content">
                <?php
                if ( 'bairros' === $active_tab ) {
                    // INÍCIO DA MODIFICAÇÃO: Aponta o iframe para o novo template
                    $iframe_src = NATIVADELIVERY_PLUGIN_URL . 'includes/admin/templates/nativa-list-cpt-iframe.php?post_type=nativa_bairro';
                    echo '<p>Gerencie seus bairros de entrega, suas taxas e condições de frete grátis.</p>';
                    echo '<iframe src="' . esc_url( $iframe_src ) . '" style="width:100%; height:800px; border:none;"></iframe>';
                    // FIM DA MODIFICAÇÃO
                } elseif ( 'ruas' === $active_tab ) {
                    // INÍCIO DA MODIFICAÇÃO: Aponta o iframe para o novo template
                    $iframe_src = NATIVADELIVERY_PLUGIN_URL . 'includes/admin/templates/nativa-list-cpt-iframe.php?post_type=nativa_rua';
                    echo '<p>Cadastre e organize as ruas da sua cidade e associe-as aos seus bairros.</p>';
                    echo '<iframe src="' . esc_url( $iframe_src ) . '" style="width:100%; height:800px; border:none;"></iframe>';
                    // FIM DA MODIFICAÇÃO
                }
                ?>
            </div>
        </div>
        <style>
            /* Esconde o submenu original de Bairros e Ruas se eles ainda aparecerem diretamente no menu lateral */
            /* Isso pode ser removido se o CPT for removido do menu principal, mas serve como um fallback visual. */
            #adminmenu a[href="edit.php?post_type=nativa_bairro"],
            #adminmenu a[href="edit.php?post_type=nativa_rua"] {
                display: none;
            }
        </style>
        <?php
    }
}