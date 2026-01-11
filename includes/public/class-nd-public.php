<?php
/**
 * Funcionalidades da área pública do plugin.
 *
 * ATUALIZAÇÃO (Vite Integration v6.4 - Final):
 * - Base original preservada.
 * - Adicionado Loader de Template para o PDV (com caminho correto em includes/).
 * - Adicionado Mock do Google Auth para evitar tela branca em ambiente de desenvolvimento.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-hours-helper.php';
require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-wait-time-helper.php';

class ND_Public {

    private $plugin_name;
    private $version;

    public function __construct( $plugin_name, $version ) {
        $this->plugin_name = $plugin_name;
        $this->version = $version;

        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
        add_action( 'wp_head', array( $this, 'add_preload_links' ) );
        add_action( 'wp_head', array( $this, 'link_correct_manifest' ) );
        add_filter( 'script_loader_tag', array( $this, 'add_module_type_attribute' ), 10, 2 );

        // --- NOVO: Carregamento do Template do PDV ---
        add_filter( 'template_include', array( $this, 'load_pdv_template' ), 99 );
    }

    /**
     * Carrega o template customizado (Shell) para a página do PDV/Pedidos.
     * Impede o carregamento do tema padrão do WordPress.
     */
    public function load_pdv_template( $template ) {
        // Verifica se é a página do PDV (slugs ou ID)
        if ( is_page( 'pdv' ) || is_page( 'pedidos' ) || is_page(1376) ) {
            
            // Caminho corrigido apontando para dentro de includes/public/templates
            $shell_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/pdv/shell.php';
            
            if ( file_exists( $shell_path ) ) {
                return $shell_path;
            } else {
                // Debug visível apenas no código fonte se der erro
                echo "";
            }
        }
        return $template;
    }

    /**
     * Define qual arquivo de manifesto (PWA) será usado.
     */
    public function link_correct_manifest() {
        $request_uri = $_SERVER['REQUEST_URI'] ?? '';
        $is_dashboard = is_page('pedidos') || is_page('pdv') || strpos($request_uri, '/pdv') !== false || strpos($request_uri, '/pedidos') !== false;

        if ( $is_dashboard ) {
            // Tenta carregar manifesto específico do dashboard se existir
            $dashboard_manifest_path = NATIVADELIVERY_PLUGIN_DIR . 'pedidos-manifest.json';
            if (file_exists($dashboard_manifest_path)) {
                $manifest_url = NATIVADELIVERY_PLUGIN_URL . 'pedidos-manifest.json';
            } else {
                // Fallback para o manifesto principal
                $manifest_url = NATIVADELIVERY_PLUGIN_URL . 'assets/dist/manifest.webmanifest';
            }
        } else {
            $manifest_url = NATIVADELIVERY_PLUGIN_URL . 'assets/dist/manifest.webmanifest';
        }

        if ( ! empty($manifest_url) ) {
            echo '<link rel="manifest" href="' . esc_url($manifest_url) . '">';
        }
    }

    /**
     * Adiciona type="module" aos scripts gerados pelo Vite.
     */
    public function add_module_type_attribute( $tag, $handle ) {
        // Verifica se o script é um dos nossos módulos (Consumer, PDV ou o Client do Vite)
        $is_nativa_module = (
            strpos($handle, 'nativa-consumer') !== false || 
            strpos($handle, 'nativa-pdv') !== false || 
            strpos($handle, $this->plugin_name) !== false
        );

        if ( $is_nativa_module ) {
            // Injeta o atributo type="module" antes do src
            $pos = strpos($tag, ' src=');
            if ($pos !== false) {
                return substr_replace($tag, ' type="module" src=', $pos, strlen(' src='));
            }
        }
        return $tag;
    }

    public function add_preload_links() {
        echo '<link rel="preconnect" href="https://fonts.googleapis.com">';
        echo '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
        echo '<link rel="preload" href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Material+Symbols+Rounded&display=swap" as="style">';

        echo '<meta name="mobile-web-app-capable" content="yes">';
        echo '<meta name="apple-mobile-web-app-capable" content="yes">';
        echo '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">';
        
        // Verificação simples para o título da app
        if ( is_page('pedidos') || is_page('pdv') ) {
            echo '<meta name="apple-mobile-web-app-title" content="Nativa Pedidos">';
        } else {
            echo '<meta name="apple-mobile-web-app-title" content="Nativa Delivery">';
        }
        
        echo '<link rel="apple-touch-icon" href="' . NATIVADELIVERY_PLUGIN_URL . 'assets/icons/apple-touch-icon.png">';
        echo '<meta name="theme-color" content="#ffffff">';
    }

    /**
     * Gerencia o carregamento de CSS e JS (Dev vs Prod).
     */
    public function enqueue_assets() {
        // 1. Estilos e scripts externos (Google Fonts, GSI)
        wp_enqueue_style( 'nativa-fonts-and-icons', 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Material+Symbols+Rounded&display=swap', array(), null );
        
        $request_uri = $_SERVER['REQUEST_URI'] ?? '';
        // CORREÇÃO CRUCIAL: Detecção robusta da página PDV
        $is_dashboard = is_page('pedidos') || is_page('pdv') || strpos($request_uri, '/pdv') !== false || strpos($request_uri, '/pedidos') !== false;

        // --- ALTERAÇÃO: Google Auth Mock para Dev ---
        // Se não for dashboard, carrega o auth (ou o mock se estivermos em dev/subdomínio não autorizado)
        if ( ! $is_dashboard ) {
            // Comentei a linha original para evitar o erro de domínio no seu ambiente de dev
            // wp_enqueue_script( 'google-identity-services', 'https://accounts.google.com/gsi/client', array(), null, true );
            
            // Injeta o Mock para o JS não quebrar
            $google_mock_script = "
                window.google = {
                    accounts: {
                        id: {
                            initialize: function(config) { console.log('[DEV MODE] Google Auth Mock: Inicializado'); },
                            renderButton: function(el, config) { 
                                if(el) el.innerHTML = '<button style=\"width:100%; padding:10px; background:#e0e0e0; border:none; border-radius:4px;\">Login Google (Desativado em Dev)</button>';
                            },
                            prompt: function() {},
                            cancel: function() {}
                        },
                        oauth2: {
                            initTokenClient: function() { return { requestAccessToken: () => {} }; }
                        }
                    }
                };
            ";
            wp_register_script('google-identity-services-mock', '', [], null, true);
            wp_enqueue_script('google-identity-services-mock');
            wp_add_inline_script('google-identity-services-mock', $google_mock_script);
        }

        // 2. Define os caminhos de entrada (Entry Points) conforme vite.config.js
        if ( $is_dashboard ) {
            // PDV / Dashboard
            $js_entry_path  = 'assets/src/js/apps/pdv/boot-pdv.js';
            $css_entry_path = 'assets/src/styles/pdv/main.css';
            $handle_slug    = 'nativa-pdv';
        } else {
            // Consumer App
            $js_entry_path  = 'assets/src/js/apps/consumer/boot-consumer.js';
            $css_entry_path = 'assets/src/styles/consumer/main.css';
            $handle_slug    = 'nativa-consumer';
        }

        // 3. Carregamento via Vite Manifest
        $manifest_path = NATIVADELIVERY_PLUGIN_DIR . 'assets/dist/.vite/manifest.json';
        $is_dev_mode = !file_exists($manifest_path);

        if ( $is_dev_mode ) {
            // --- MODO DESENVOLVIMENTO (Hot Reload) ---
            wp_enqueue_script($this->plugin_name . '-vite-client', 'http://localhost:5173/@vite/client', [], null, true);
            
            // Carrega CSS (force load em dev)
            wp_enqueue_style(
                $handle_slug . '-style-dev',
                'http://localhost:5173/' . $css_entry_path,
                [],
                time()
            );

            // Carrega JS
            wp_enqueue_script(
                $handle_slug . '-script',
                'http://localhost:5173/' . $js_entry_path,
                ['jquery', $this->plugin_name . '-vite-client'],
                time(),
                true
            );

        } else {
            // --- MODO PRODUÇÃO (Manifesto) ---
            $manifest = json_decode( file_get_contents( $manifest_path ), true );

            // Verificação de segurança
            if ( ! isset( $manifest[$js_entry_path] ) ) {
                if ( current_user_can( 'manage_options' ) ) {
                    wp_die( '<strong>Erro Nativa Delivery:</strong> O ponto de entrada "' . esc_html($js_entry_path) . '" não foi encontrado no manifest.json. Verifique o build.' );
                }
                return;
            }

            // A. Enfileira o CSS Principal
            if ( isset( $manifest[$css_entry_path] ) ) {
                wp_enqueue_style(
                    $handle_slug . '-style',
                    NATIVADELIVERY_PLUGIN_URL . 'assets/dist/' . $manifest[$css_entry_path]['file'],
                    [],
                    $this->version
                );
            }

            // B. Enfileira CSS dependente do JS (chunks extras)
            if ( isset( $manifest[$js_entry_path]['css'] ) && is_array( $manifest[$js_entry_path]['css'] ) ) {
                foreach ( $manifest[$js_entry_path]['css'] as $css_file ) {
                    wp_enqueue_style(
                        $this->plugin_name . '-style-chunk-' . basename($css_file),
                        NATIVADELIVERY_PLUGIN_URL . 'assets/dist/' . $css_file,
                        [],
                        $this->version
                    );
                }
            }

            // C. Enfileira o Script Principal
            wp_enqueue_script(
                $handle_slug . '-script',
                NATIVADELIVERY_PLUGIN_URL . 'assets/dist/' . $manifest[$js_entry_path]['file'],
                ['jquery'], 
                $this->version,
                true
            );
        }

        // 4. Localização de Dados (Variáveis PHP -> JS)
        $main_script_handle = $handle_slug . '-script';

        if ( $is_dashboard ) {
            $this->localize_pedidos_script($main_script_handle);
        } else {
            $this->localize_main_script($main_script_handle);
        }
    }

    private function localize_main_script($handle) {
        $user_id = get_current_user_id();
        $data_provider = new ND_Data_Provider();
        $data_to_pass = $data_provider->get_data_for_localize();

        $spa_routes = ['/', '/cardapio', '/minha-conta', '/login', '/meus-enderecos', '/fidelidade', '/checkout', '/privacidade', '/termos'];
        
        $data_to_pass['spa_routes'] = $spa_routes;
        $data_to_pass['plugin_version'] = $this->version;
        $data_to_pass['shouldRedirectToCheckout'] = (isset($_GET['redirect_to_checkout']) && $_GET['redirect_to_checkout'] === 'true') ? 'true' : '';
        $data_to_pass['google_client_id'] = defined('NATIVA_GOOGLE_CLIENT_ID') ? NATIVA_GOOGLE_CLIENT_ID : null;
        $data_to_pass['app_version'] = $this->version;
        $data_to_pass['pluginUrl'] = NATIVADELIVERY_PLUGIN_URL;
        $data_to_pass['isPedidosPage'] = false;
        $data_to_pass['is_admin'] = current_user_can('manage_options');

        $hours_options = get_option('nativa_delivery_hours_options');
        if (isset($hours_options['scheduling_window_minutes']) && isset($data_to_pass['operatingHours'])) {
            $data_to_pass['operatingHours']['scheduling_window_minutes'] = (int) $hours_options['scheduling_window_minutes'];
        }

        if ( defined('VAPID_PUBLIC_KEY') ) {
            $data_to_pass['vapidPublicKey'] = VAPID_PUBLIC_KEY;
        } else {
             $data_to_pass['vapidPublicKey'] = null;
        }

        if ( is_user_logged_in() ) {
            $nonce = wp_create_nonce('nativa_delivery_ajax_nonce');
            $data_to_pass['ajax_nonce'] = $nonce;
            $data_to_pass['nonce'] = $nonce;
            $data_to_pass['logout_url'] = wp_logout_url(home_url());
        } else {
            $data_to_pass['ajax_nonce'] = '';
            $data_to_pass['nonce'] = '';
            $data_to_pass['logout_url'] = '';
        }

        $script_data = sprintf(
            'window.nativaDeliveryData = %s;',
            wp_json_encode( $data_to_pass )
        );
        wp_add_inline_script( $handle, $script_data, 'before' );
    }

    private function localize_pedidos_script($handle) {
        $payment_options = get_option('nativa_delivery_payments_options', []);
        $cep_cidade = get_option('nd_cep_cidade', '89247-000');
        $google_maps_key = defined('NATIVA_GOOGLE_MAPS_API_KEY') ? NATIVA_GOOGLE_MAPS_API_KEY : get_option('nd_google_maps_api_key', '');

        // Obtém URL de login correta
        $login_url = wp_login_url( home_url('/pdv/') );

        $data_to_pass = array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'ajax_nonce' => wp_create_nonce('nativa_delivery_ajax_nonce'),
            'cep_cidade' => $cep_cidade,
            'payment_options' => [
                'pix_mode' => $payment_options['pix_mode'] ?? 'desativado',
                 'pix_manual_key' => $payment_options['pix_manual_key'] ?? '',
                 'pix_manual_key_type' => $payment_options['pix_manual_key_type'] ?? '',
                 'pix_manual_receiver' => $payment_options['pix_manual_receiver'] ?? '',
            ],
            'google_maps_api_key' => $google_maps_key,
            'pluginUrl' => NATIVADELIVERY_PLUGIN_URL,
            'isPedidosPage' => true,
            'vapidPublicKey' => defined('VAPID_PUBLIC_KEY') ? VAPID_PUBLIC_KEY : null,
            'login_url' => $login_url,
        );

        $script_data = sprintf(
            'window.nativaDeliveryData = %s;',
            wp_json_encode( $data_to_pass )
        );
        
        wp_add_inline_script( $handle, $script_data, 'before' );
    }
}