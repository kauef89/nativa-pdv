<?php
/**
 * Define os shortcodes utilizados pelo plugin.
 * VERSÃO ATUALIZADA: Adiciona shortcodes para as páginas "Minha Conta" e "Obrigado".
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Shortcodes {

    public function __construct() {
        add_shortcode( 'nativa_delivery_app', array( $this, 'render_app' ) );
        add_shortcode( 'nativa_checkout', array( $this, 'render_checkout' ) );
        add_shortcode( 'nativa_my_account', array( $this, 'render_my_account' ) );
        add_shortcode( 'nativa_obrigado', array( $this, 'render_obrigado' ) );
    }

    /**
     * Renderiza o container principal da Single-Page Application (SPA).
     */
    public function render_app() {
        ob_start();
        
        // O shortcode agora apenas carrega o arquivo de template principal da app.
        $app_template_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-app.php';
        if ( file_exists( $app_template_path ) ) {
            include_once $app_template_path;
        } else {
            echo 'Erro: Arquivo de template da aplicação não encontrado.';
        }

        return ob_get_clean();
    }

    /**
     * Renderiza a página de checkout.
     */
    public function render_checkout() {
        ob_start();

        $checkout_template_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-checkout-page.php';
        if ( file_exists( $checkout_template_path ) ) {
            include_once $checkout_template_path;
        } else {
            echo 'Erro: Arquivo de template do checkout não encontrado.';
        }
        
        return ob_get_clean();
    }
    
    /**
     * Renderiza a página "Minha Conta".
     * A verificação de login foi removida para evitar problemas com cache de página.
     * O JavaScript agora é responsável por exibir o conteúdo apropriado.
     */
    public function render_my_account() {
        ob_start();

        // --- INÍCIO DA CORREÇÃO ---
        // A verificação is_user_logged_in() foi removida daqui.
        // O shortcode agora sempre renderiza o template da página, e o JavaScript
        // no frontend cuidará de mostrar o conteúdo para o usuário logado ou
        // o prompt de login para o usuário deslogado. Isso resolve problemas
        // de cache de página.
        $template_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-my-account-page.php';
        if ( file_exists( $template_path ) ) {
            include_once $template_path;
        } else {
            echo 'Erro: Arquivo de template da Minha Conta não encontrado.';
        }
        // --- FIM DA CORREÇÃO ---
        
        return ob_get_clean();
    }

    /**
     * Renderiza a página "Obrigado".
     */
    public function render_obrigado() {
        ob_start();

        $template_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-obrigado-page.php';
        if ( file_exists( $template_path ) ) {
            include_once $template_path;
        } else {
            echo 'Erro: Arquivo de template da página Obrigado não encontrado.';
        }
        
        return ob_get_clean();
    }
}
