<?php
/**
 * A classe principal do plugin Nativa Delivery.
 *
 * Responsável por carregar dependências, definir hooks e inicializar os componentes.
 *
 * VERSÃO CORRIGIDA (FINAL FASE 1):
 * - Adiciona require_once para ND_Fiscal_Certificate_Helper (Fase 0).
 * - Adiciona require_once para ND_Cash_API_Controller (Fase 1).
 * - Registra as rotas da API de Caixa no método register_rest_routes.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Main {

    protected $plugin_name;
    protected $version;
    protected $data_provider;

    public function __construct() {
        $this->plugin_name = 'nativa-delivery';
        $this->version  = NATIVADELIVERY_VERSION;

        add_action( 'init', array( $this, 'init_plugin' ) );
        add_action( 'acf/init', array( $this, 'register_acf_field_groups' ) );
    }

    /**
     * Função de inicialização principal, chamada no hook 'init'.
     */
    public function init_plugin() {

        $this->load_dependencies();
   
        // Instancia o Data Provider para que esteja disponível para outros hooks
        $this->data_provider = new ND_Data_Provider();

        $this->load_textdomain();
        
        // CPTs e Taxonomias agora são registrados incondicionalmente para estarem disponíveis globalmente.
        new ND_CPT_Manager();
        new ND_Taxonomy_Manager();
        
        $this->define_core_hooks();
        $this->define_admin_hooks();
        $this->define_public_hooks();
        $this->add_filters();
   
        add_action( 'save_post', array( $this, 'clear_relevant_cache_on_save' ), 10, 2 );
        add_action( 'delete_post', array( $this, 'clear_relevant_cache_on_delete' ) );
        add_action( 'edited_term', array( $this, 'clear_menu_cache_on_term_change' ), 10, 2 );
        add_action( 'delete_term', array( $this, 'clear_menu_cache_on_term_change' ), 10, 2 );
   
        add_filter( 'cron_schedules', array( $this, 'add_cron_intervals' ) );
        add_action( 'rest_api_init', array( $this, 'register_rest_routes' ) );
        add_filter( 'use_block_editor_for_post_type', array( $this, 'force_classic_editor_for_cpts' ), 10, 2 );
        add_filter( 'redirect_canonical', array( $this, 'prevent_canonical_redirect_for_spa' ), 9, 2 );
    }

    private function clear_relevant_cache( $post_type ) {
        $user_id = get_current_user_id();
        if ( $user_id ) {
            delete_transient( 'nativa_menu_data_cache_' . $user_id );
        }
        delete_transient( 'nativa_menu_data_cache_0' );

        if ( in_array( $post_type, ['nativa_produto', 'nativa_adic_grupo', 'nativa_combo', 'nativa_oferta'] ) ) {
            delete_transient( 'nativa_active_offers' );
        }

        if ( $post_type === 'nativa_bairro' ) {
            delete_transient( 'nativa_all_bairros' );
        }
    }

    public function clear_relevant_cache_on_save( $post_id, $post ) {
        if ( defined( 'DOING_AUTOSAVE' ) && DOING_AUTOSAVE ) {
            return;
        }
        $this->clear_relevant_cache( $post->post_type );
    }

    public function clear_relevant_cache_on_delete( $post_id ) {
        $this->clear_relevant_cache( get_post_type( $post_id ) );
    }

    public function clear_menu_cache_on_term_change( $term_id, $taxonomy ) {
        if ( in_array( $taxonomy, array( 'category', 'post_tag' ) ) ) {
            $this->clear_relevant_cache('any');
        }
    }
    
    public function prevent_canonical_redirect_for_spa( $redirect_url, $requested_url ) {
        global $wp;
        $spa_routes = ['cardapio', 'minha-conta', 'meus-enderecos', 'fidelidade', 'privacidade', 'termos'];

        if ( isset( $wp->request ) && in_array( $wp->request, $spa_routes, true ) ) {
            return false;
        }
   
        return $redirect_url;
    }

    public function force_classic_editor_for_cpts( $use_block_editor, $post_type ) {
        $problematic_cpts = array('nativa_produto', 'nativa_combo');
        if ( in_array( $post_type, $problematic_cpts, true ) ) {
            return false;
        }
        return $use_block_editor;
    }
 
    public function register_rest_routes() {
        // Rotas Públicas (Social Login e Menu)
        register_rest_route( 'nativa-delivery/v1', '/social-login', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array( $this, 'get_social_login_buttons_html' ),
            'permission_callback' => '__return_true',
            'args' => array(
                'redirect_to' => array(
                    'validate_callback' => function($param, $request, $key) {
                        return is_string($param);
                    },
                    'sanitize_callback' => 'sanitize_text_field',
                ),
            ),
        ) );

        register_rest_route( 'nativa-delivery/v1', '/menu-data', array(
            'methods' => WP_REST_Server::READABLE,
            'callback' => array( $this->data_provider, 'get_menu_data_rest' ),
            'permission_callback' => '__return_true',
        ) );

        if ( class_exists( 'ND_Cash_API_Controller' ) ) {
            $cash_controller = new ND_Cash_API_Controller();
            $cash_controller->register_routes();
        }

        if ( class_exists( 'ND_Products_API_Controller' ) ) {
            $products_controller = new ND_Products_API_Controller();
            $products_controller->register_routes();
        }
        
        if ( class_exists( 'ND_Orders_API_Controller' ) ) {
            $orders_controller = new ND_Orders_API_Controller();
            $orders_controller->register_routes();
        }

        if ( class_exists( 'ND_Customers_API_Controller' ) ) {
            $cust_controller = new ND_Customers_API_Controller();
            $cust_controller->register_routes();
        }
    }

    public function get_social_login_buttons_html( $request ) {
        $redirect_slug = $request->get_param('redirect_to');
   
        if ( shortcode_exists( 'nextend_social_login' ) ) {
            $processor_url = home_url('/processando-login/');
            if ( ! empty( $redirect_slug ) ) {
                $processor_url = add_query_arg( 'redirect_to', $redirect_slug, $processor_url );
            }
            $shortcode = '[nextend_social_login redirect="' . esc_url($processor_url) . '"]';
            $html = do_shortcode($shortcode);

            return new WP_REST_Response( array( 'html' => $html, 'debug_received_redirect' => $redirect_slug ), 200 );
        }
        return new WP_REST_Response( array( 'html' => '', 'debug_received_redirect' => 'shortcode_nao_existe' ), 404 );
    }

    public function route_handler( $wp ) {
        if ( ! isset( $wp->request ) ) return;
   
        $spa_routes = ['cardapio', 'minha-conta', 'meus-enderecos', 'fidelidade', 'privacidade', 'termos'];
        if ( in_array( $wp->request, $spa_routes, true ) ) {
            $options = get_option( 'nativa_delivery_options' );
            $app_page_id = isset( $options['app_page_id'] ) ? absint( $options['app_page_id'] ) : 0;
            if ( $app_page_id > 0 ) {
                $wp->query_vars = ['page_id' => $app_page_id];
            }
        }
    }

    public function hide_admin_bar_for_customers( $show ) {
        if ( is_user_logged_in() && ! is_admin() ) {
            return false;
        }
        return $show;
    }

    public function load_textdomain() {
        load_plugin_textdomain('nativa-delivery', false, dirname( plugin_basename( NATIVADELIVERY_PLUGIN_DIR ) ) . '/languages/');
    }

    public function register_acf_field_groups() {
        $acf_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/acf-fields/';
        require_once $acf_path . 'nativa-delivery-adicionais-fields.php';
        require_once $acf_path . 'nativa-delivery-product-fields.php';
        require_once $acf_path . 'nativa-delivery-bairro-fields.php';
        require_once $acf_path . 'nativa-delivery-combo-fields.php';
        require_once $acf_path . 'nativa-delivery-pedido-fields.php';
        require_once $acf_path . 'nativa-delivery-cupom-fields.php';
        require_once $acf_path . 'nativa-delivery-oferta-fields.php';
        require_once $acf_path . 'nativa-delivery-loyalty-fields.php';
        require_once $acf_path . 'nativa-delivery-rua-fields.php';
        require_once $acf_path . 'nativa-delivery-daily-deals-fields.php';
        require_once $acf_path . 'nativa-delivery-category-fields.php';
        
        // Pagamentos CPT
        if ( file_exists( $acf_path . 'nativa-delivery-pagamento-fields.php' ) ) {
            require_once $acf_path . 'nativa-delivery-pagamento-fields.php';
        }
    }
    
    private function load_dependencies() {
        // Carrega Autoload do Composer (bibliotecas externas)
        if ( file_exists( NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
            require_once NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php';
        }

        // Helpers do Core
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-automations.php';
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-hours-helper.php';
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-cart-helper.php';
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-validation-helper.php';
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-whatsapp-helper.php';
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-offers-helper.php';
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-sicredi-helper.php';
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-order-creator.php';
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-wait-time-helper.php';
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-data-provider.php';
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-stats-helper.php';
        
        // --- INÍCIO DA MODIFICAÇÃO (FASE 0 - FISCAL) ---
        // Helper do Certificado Fiscal
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-fiscal-certificate-helper.php';
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-security-helper.php';
        // --- FIM DA MODIFICAÇÃO ---

        // Gerenciadores de CPT e Taxonomias
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/class-nd-cpt-manager.php';
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/class-nd-taxonomy-manager.php';
   
        // --- INÍCIO DA MODIFICAÇÃO (FASE 1 - CAIXA) ---
        // Controlador da API de Caixa
        if ( file_exists( NATIVADELIVERY_PLUGIN_DIR . 'includes/api/class-nd-cash-api-controller.php' ) ) {
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/api/class-nd-cash-api-controller.php';
        }
        // --- FIM DA MODIFICAÇÃO ---

        // NOVA LINHA TAREFA 16
        if ( file_exists( NATIVADELIVERY_PLUGIN_DIR . 'includes/api/class-nd-products-api-controller.php' ) ) {
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/api/class-nd-products-api-controller.php';
        }

        if ( file_exists( NATIVADELIVERY_PLUGIN_DIR . 'includes/api/class-nd-customers-api-controller.php' ) ) {
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/api/class-nd-customers-api-controller.php';
        }

        if ( is_admin() || ( defined( 'DOING_AJAX' ) && DOING_AJAX ) ) {
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/class-nd-admin.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/class-nd-settings-page.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/class-nd-hours-settings.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/class-nd-whatsapp-settings.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/class-nd-payments-settings.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/class-nd-loyalty-settings.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/class-nd-wait-times-settings.php';
            
            // Importadores
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-bairro-importer.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-rua-importer.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-product-importer.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-adicional-importer.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-combo-importer.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-coupon-importer.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-offer-importer.php';
            // require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-loyalty-importer.php'; // Se existir
        }

        if ( ! is_admin() || ( defined( 'DOING_AJAX' ) && DOING_AJAX ) ) {
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/public/class-nd-public.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/public/class-nd-shortcodes.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/public/ajax-handlers/class-nd-ajax-manager.php';
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/public/class-nd-template-loader.php';
        }
    }
 
    private function define_core_hooks() { new ND_Automations(); }
    private function define_admin_hooks() { 
        if ( is_admin() ) { 
            new ND_Admin( $this->get_plugin_name(), $this->get_version() ); 
            new ND_Settings_Page(); 
            new ND_Hours_Settings(); 
            new ND_Whatsapp_Settings(); 
            new ND_Payments_Settings(); 
            new ND_Loyalty_Settings(); 
            new ND_Wait_Times_Settings(); 
        } 
    }
    public function define_public_hooks() { 

        if ( ! is_admin() || ( defined( 'DOING_AJAX' ) && DOING_AJAX ) ) { 
            new ND_Public( $this->get_plugin_name(), $this->get_version() ); 
            new ND_Ajax_Manager(); 
            new ND_Shortcodes(); 
            new ND_Template_Loader(); 
            add_action( 'parse_request', array( $this, 'route_handler' ) ); 
            add_filter( 'show_admin_bar', array( $this, 'hide_admin_bar_for_customers' ) ); 
        } 
    }
    private function add_filters() { add_filter( 'upload_mimes', array( $this, 'allow_svg_uploads' ) ); }
    public function allow_svg_uploads( $mimes ) { $mimes['svg'] = 'image/svg+xml'; return $mimes; }
    public function get_plugin_name() { return $this->plugin_name; }
    public function get_version() { return $this->version; }
    public function add_cron_intervals( $schedules ) { $schedules['every_five_minutes'] = array('interval' => 300, 'display' => esc_html__( 'A Cada Cinco Minutos' ),); return $schedules; }
    public static function is_customer_logged_in() { if ( ! is_user_logged_in() ) return false; $user = wp_get_current_user(); $customer_roles = apply_filters('nativa_delivery_customer_roles', ['subscriber']); $user_roles = (array) $user->roles; return !empty(array_intersect($customer_roles, $user_roles)); }
}