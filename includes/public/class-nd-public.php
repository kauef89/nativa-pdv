<?php
/**
* Funcionalidades da área pública do plugin.
*
* ... (histórico de versões anterior) ...
* ATUALIZAÇÃO (PWA): Modifica a função `link_correct_manifest` para carregar
* condicionalmente o manifesto correto para o dashboard de pedidos (/pedidos),
* permitindo que ele seja instalado como um app separado do app do cliente.
* ATUALIZAÇÃO (PUSH): Adiciona a chave pública VAPID aos dados localizados para o script do dashboard.
* CORREÇÃO: Restaura a função enqueue_assets original para corrigir erro de carregamento.
* ATUALIZAÇÃO (Dashboard Login): Adiciona a URL de login aos dados localizados para o dashboard (/pedidos).
* CORREÇÃO (Dashboard Data Object): Padroniza o uso de 'nativaDeliveryData' para localizar scripts do dashboard.
* CORREÇÃO (Multi-Entry JS): Modifica enqueue_assets para carregar o entry point correto (main.js ou dashboard-main.js) com base na página.
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-hours-helper.php';
require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-wait-time-helper.php';

class ND_Public {

    private $plugin_name;
    private $version;
    // --- INÍCIO DA MODIFICAÇÃO: Remove o entry point fixo ---
    // private static $vite_entry_point = 'assets/src/js/core/main.js'; // Removido
    // --- FIM DA MODIFICAÇÃO ---

    public function __construct( $plugin_name, $version ) {
        $this->plugin_name = $plugin_name;
        $this->version = $version;

        add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_assets' ) );
        add_action( 'wp_head', array( $this, 'add_preload_links' ) );
        add_action( 'wp_head', array( $this, 'link_correct_manifest' ) );
        add_filter( 'script_loader_tag', array( $this, 'add_module_type_attribute' ), 10, 2 );
    }

    public function link_correct_manifest() {
        if ( is_page('pedidos') ) {
            // Tenta carregar manifesto específico do dashboard se existir
            $dashboard_manifest_path = NATIVADELIVERY_PLUGIN_DIR . 'pedidos-manifest.json';
            if (file_exists($dashboard_manifest_path)) {
                $manifest_url = NATIVADELIVERY_PLUGIN_URL . 'pedidos-manifest.json';
            } else {
                // Fallback para o manifesto principal se o específico não existir
                $manifest_url = NATIVADELIVERY_PLUGIN_URL . 'assets/dist/manifest.webmanifest';
                // Opcional: Logar um aviso se o manifesto específico não for encontrado
                // error_log('Nativa Delivery: Manifesto específico do dashboard (pedidos-manifest.json) não encontrado. Usando manifesto principal.');
            }
        } else {
            $manifest_url = NATIVADELIVERY_PLUGIN_URL . 'assets/dist/manifest.webmanifest';
        }

        if ( ! empty($manifest_url) ) {
            echo '<link rel="manifest" href="' . esc_url($manifest_url) . '">';
        }
    }

    public function add_module_type_attribute( $tag, $handle ) {
        // Aplica type="module" a qualquer script cujo handle contenha o nome do plugin
        if ( strpos($handle, $this->plugin_name) !== false ) {
            // Garante que só substitua o primeiro ' src=' para evitar problemas
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
        if ( is_page('pedidos') ) {
            echo '<meta name="apple-mobile-web-app-title" content="Nativa Pedidos">';
        } else {
            echo '<meta name="apple-mobile-web-app-title" content="Nativa Delivery">';
        }
        echo '<link rel="apple-touch-icon" href="/wp-content/plugins/nativa-delivery/assets/icons/apple-touch-icon.png">'; // Considerar usar NATIVADELIVERY_PLUGIN_URL
        echo '<meta name="theme-color" content="#ffffff">'; // Defina a cor desejada
    }


    public function enqueue_assets() {
        // Estilos e scripts de terceiros
        wp_enqueue_style( 'nativa-fonts-and-icons', 'https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Material+Symbols+Rounded&display=swap', array(), null );
        // Carrega GSI apenas se não for a página de pedidos
        if (!is_page('pedidos')) {
            wp_enqueue_script( 'google-identity-services', 'https://accounts.google.com/gsi/client', array(), null, true );
        }

        // Carrega frontend-style.css diretamente do src (provavelmente para dev ou como fallback)
        $dev_style_path = NATIVADELIVERY_PLUGIN_DIR . 'assets/src/css/frontend-style.css';
        if ( file_exists( $dev_style_path ) ) {
            $dev_style_url = NATIVADELIVERY_PLUGIN_URL . 'assets/src/css/frontend-style.css';
            $dev_style_version = filemtime( $dev_style_path );
            wp_enqueue_style( $this->plugin_name . '-dev-style', $dev_style_url, array(), $dev_style_version, 'all' );
        }

        // Carrega CSS específico do Dashboard se estiver na página 'pedidos' (direto do src)
        if ( is_page('pedidos') ) {
            $dashboard_style_path = NATIVADELIVERY_PLUGIN_DIR . 'assets/src/css/pedidos-dashboard.css';
            if ( file_exists( $dashboard_style_path ) ) {
                $dashboard_style_url = NATIVADELIVERY_PLUGIN_URL . 'assets/src/css/pedidos-dashboard.css';
                $dashboard_version = filemtime( $dashboard_style_path );
                wp_enqueue_style( $this->plugin_name . '-pedidos', $dashboard_style_url, array(), $dashboard_version, 'all' );
            }
             // Se o CSS principal (frontend-style.css) não deve ser carregado na pág. pedidos:
             // wp_dequeue_style($this->plugin_name . '-dev-style');
        }

        // --- INÍCIO DA MODIFICAÇÃO (Multi-Entry JS) ---
        $is_dashboard = is_page('pedidos');
        // Define o ponto de entrada e o handle com base na página
        $vite_entry_file = $is_dashboard ? 'assets/src/js/dashboard/dashboard-main.js' : 'assets/src/js/core/main.js';
        $main_handle = $is_dashboard ? $this->plugin_name . '-dashboard-bundle' : $this->plugin_name . '-main-bundle';
        // --- FIM DA MODIFICAÇÃO ---

        // Lógica Vite Manifest (para produção)
        $manifest_path = NATIVADELIVERY_PLUGIN_DIR . 'assets/dist/.vite/manifest.json';

        // Se o manifesto NÃO existir (pode ser dev ou erro no build)
        if ( ! file_exists( $manifest_path ) ) {
            // Assume modo de desenvolvimento se o manifesto não existe
            // (Esta parte pode precisar de ajuste dependendo do seu fluxo dev/prod)
             $is_dev_mode = true; // Ou uma constante/opção para controlar isso
            if ($is_dev_mode) {
                 // Tenta carregar do servidor Vite
                 wp_enqueue_script($this->plugin_name . '-vite-client', 'http://localhost:5173/@vite/client', [], null, true);
                 wp_enqueue_script(
                     $main_handle, // Usa o handle dinâmico
                     'http://localhost:5173/' . $vite_entry_file, // Usa o entry file dinâmico
                     ['jquery', $this->plugin_name . '-vite-client'],
                     $this->version,
                     true
                 );
                 // $main_handle já está definido
            } else {
                 // Erro em produção
                 if ( current_user_can( 'manage_options' ) ) {
                     wp_die( '<strong>Erro Nativa Delivery:</strong> O arquivo manifest.json do Vite não foi encontrado em produção. Execute o comando de build (npm run build).' );
                 }
                 error_log('Nativa Delivery: manifest.json não encontrado em produção.');
                 return; // Impede a execução do resto se o manifesto é essencial
            }
        } else {
             // Produção: Carrega do manifesto
            $manifest = json_decode( file_get_contents( $manifest_path ), true );

            // --- INÍCIO DA MODIFICAÇÃO (Multi-Entry JS) ---
            if ( ! isset( $manifest[$vite_entry_file] ) ) { // Verifica o entry file dinâmico
                if ( current_user_can( 'manage_options' ) ) {
                    wp_die( '<strong>Erro Nativa Delivery:</strong> O ponto de entrada "' . esc_html($vite_entry_file) . '" não foi encontrado no manifest.json.' );
                }
                error_log('Nativa Delivery: Ponto de entrada "' . esc_html($vite_entry_file) . '" não foi encontrado no manifest.json.'); // Log dinâmico
                return;
            }

            $entry = $manifest[$vite_entry_file]; // Pega o entry dinâmico
            // --- FIM DA MODIFICAÇÃO ---

            // Enfileira CSS principal gerado pelo Vite (se existir)
             if ( isset( $entry['css'] ) && is_array( $entry['css'] ) ) {
                foreach ( $entry['css'] as $css_file ) {
                     // Gera um handle único para cada CSS
                     $css_handle = $this->plugin_name . '-style-' . sanitize_title(basename($css_file));
                     // Enfileira o CSS principal em todas as páginas, exceto talvez 'pedidos' se o CSS do dashboard já o contém ou substitui
                     // if (!is_page('pedidos')) { // Descomente esta linha se o CSS principal não deve carregar em /pedidos
                         wp_enqueue_style(
                             $css_handle,
                             NATIVADELIVERY_PLUGIN_URL . 'assets/dist/' . $css_file,
                             [],
                             $this->version // Usa a versão do plugin para cache busting
                         );
                     // } // Fim do if condicional
                 }
             }

            // Enfileira JS principal
            // $main_handle já está definido
            wp_enqueue_script(
                $main_handle, // Usa o handle dinâmico
                NATIVADELIVERY_PLUGIN_URL . 'assets/dist/' . $entry['file'],
                ['jquery'], // Adicione outras dependências se necessário
                $this->version, // Usa a versão do plugin para cache busting
                true // Carrega no footer
            );
        } // Fim da verificação do manifesto

        // Localiza dados específicos da página (sempre usa $main_handle, seja de dev ou prod)
        if ( isset($main_handle) ) { // Garante que $main_handle foi definido
            // --- INÍCIO DA MODIFICAÇÃO (Multi-Entry JS) ---
            if ( $is_dashboard ) { // Usa a flag $is_dashboard
            // --- FIM DA MODIFICAÇÃO ---
                $this->localize_pedidos_script($main_handle);
            } else {
                $this->localize_main_script($main_handle);
            }
        } else {
             error_log('Nativa Delivery: Handle principal do script não foi definido. Dados não puderam ser localizados.');
        }

    }


    private function localize_main_script($handle) {
        $user_id = get_current_user_id();
        $cache_key = "nativa_delivery_localized_data_{$user_id}";

        if ( is_user_logged_in() ) {
            $cache_key .= '_loggedin';
        } else {
            $cache_key .= '_loggedout';
        }

        $cached_data = false; // Desativar cache para testes
        // $cached_data = wp_cache_get( $cache_key, 'nativa_delivery' );

        if ( false === $cached_data ) {
            $data_provider = new ND_Data_Provider();
            $data_to_pass = $data_provider->get_data_for_localize();

            // --- INÍCIO DA MODIFICAÇÃO ---
            $spa_routes = ['/', '/cardapio', '/minha-conta', '/login', '/meus-enderecos', '/fidelidade', '/checkout', '/privacidade', '/termos'];
            // --- FIM DA MODIFICAÇÃO ---
            $data_to_pass['spa_routes'] = $spa_routes;
            $data_to_pass['plugin_version'] = $this->version;
            $data_to_pass['shouldRedirectToCheckout'] = (isset($_GET['redirect_to_checkout']) && $_GET['redirect_to_checkout'] === 'true') ? 'true' : '';
            $data_to_pass['google_client_id'] = defined('NATIVA_GOOGLE_CLIENT_ID') ? NATIVA_GOOGLE_CLIENT_ID : null;
            $data_to_pass['app_version'] = $this->version;
            $data_to_pass['pluginUrl'] = NATIVADELIVERY_PLUGIN_URL;
            $data_to_pass['isPedidosPage'] = false;
            $data_to_pass['is_admin'] = current_user_can('manage_options'); // Adiciona flag admin

            $hours_options = get_option('nativa_delivery_hours_options');
            if (isset($hours_options['scheduling_window_minutes']) && isset($data_to_pass['operatingHours'])) {
                $data_to_pass['operatingHours']['scheduling_window_minutes'] = (int) $hours_options['scheduling_window_minutes'];
            }

            if ( defined('VAPID_PUBLIC_KEY') ) {
                $data_to_pass['vapidPublicKey'] = VAPID_PUBLIC_KEY;
            } else {
                 $data_to_pass['vapidPublicKey'] = null;
            }


            $cached_data = $data_to_pass;
            // wp_cache_set( $cache_key, $cached_data, 'nativa_delivery', 300 );
        }

        if ( is_user_logged_in() ) {
            $nonce = wp_create_nonce('nativa_delivery_ajax_nonce');
            $cached_data['ajax_nonce'] = $nonce;
            $cached_data['nonce'] = $nonce;
            $cached_data['logout_url'] = wp_logout_url(home_url());
        } else {
            $cached_data['ajax_nonce'] = '';
            $cached_data['nonce'] = '';
             $cached_data['logout_url'] = '';
        }

        $script_data = sprintf(
            'window.nativaDeliveryData = %s;',
            wp_json_encode( $cached_data )
        );
        wp_add_inline_script( $handle, $script_data, 'before' );
    }


    private function localize_pedidos_script($handle) {
        $payment_options = get_option('nativa_delivery_payments_options', []);
        $cep_cidade = get_option('nd_cep_cidade', '89247-000');
        $google_maps_key = defined('NATIVA_GOOGLE_MAPS_API_KEY') ? NATIVA_GOOGLE_MAPS_API_KEY : get_option('nd_google_maps_api_key', '');

        // Obtém a URL de login, redirecionando de volta para a página de pedidos após o login.
        $login_url = wp_login_url( home_url('/pedidos/') );

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
            'login_url' => $login_url, // Adiciona a URL de login aos dados
        );

        // --- INÍCIO DA MODIFICAÇÃO (Usa nativaDeliveryData) ---
        // Padroniza o nome do objeto global para 'nativaDeliveryData'
        $script_data = sprintf(
            'window.nativaDeliveryData = %s;', // Nome do objeto alterado para nativaDeliveryData
            wp_json_encode( $data_to_pass )
        );
        // --- FIM DA MODIFICAÇÃO ---
        wp_add_inline_script( $handle, $script_data, 'before' );
    }
}