<?php
/**
 * Gerencia o carregamento de templates do plugin.
 * VERSÃO ATUALIZADA (PDV): Adiciona suporte à rota /pdv.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Template_Loader {

    public function __construct() {
        add_filter( 'template_include', array( $this, 'load_plugin_templates' ), 99 );
    }

    public function load_plugin_templates( $template ) {
        
        // 1. Rota do PDV (Caixa) - TAREFA 14
        if ( is_page( 'pdv' ) ) {
            $plugin_template = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-pdv-page.php';
            if ( file_exists( $plugin_template ) ) {
                return $plugin_template;
            }
        }

        // 2. Rota de Pedidos (Dashboard Cozinha/Entregas)
        if ( is_page( 'pedidos' ) ) {
            $plugin_template = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-pedidos-page.php';
            if ( file_exists( $plugin_template ) ) {
                return $plugin_template;
            }
        }

        // 3. Rota de Pagamento PIX
        if ( is_page( 'pagamento-pix' ) ) {
            $plugin_template = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-pix-payment-page.php';
            if ( file_exists( $plugin_template ) ) {
                return $plugin_template;
            }
        }

        // 4. Processamento de Login
        if ( is_page( 'processando-login' ) ) {
            $plugin_template = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-login-processor-page.php';
            if ( file_exists( $plugin_template ) ) {
                return $plugin_template;
            }
        }

        return $template;
    }
}