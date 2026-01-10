<?php
/**
 * Plugin Name: Nativa Delivery
 * Plugin URI:  https://pastelarianativa.com.br/
 * Description: Plugin para gerenciar o sistema de pedidos e horários de funcionamento para a Pastelaria Nativa.
 * Version:     2.4.2
 * Author:      Kauê Friedrich
 * Author URI:  https://pastelarianativa.com.br/
 * License:     GPL-2.0+
 * License URI: http://www.gnu.org/licenses/gpl-2.0.txt
 * Text Domain: nativa-delivery
 * Domain Path: /languages
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

define( 'NATIVADELIVERY_VERSION', '2.4.2' );
define( 'NATIVADELIVERY_PLUGIN_DIR', plugin_dir_path( __FILE__ ) );
define( 'NATIVADELIVERY_PLUGIN_URL', plugin_dir_url( __FILE__ ) );

/**
 * Inclui os templates HTML no rodapé.
 */
function nativa_delivery_include_public_templates_html() {
    $options = get_option( 'nativa_delivery_options' );
    $checkout_page_id = isset( $options['checkout_page_id'] ) ? absint( $options['checkout_page_id'] ) : 0;

    // Não carrega templates da SPA se for a página do cardápio de mesa
    if ( is_page('cardapio-mesa') ) {
        return;
    }

    $bottom_sheets_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-bottom-sheets.php';
    $cart_side_sheet_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/sheets/nativa-cart-side-sheet.php';
    $bottom_navbar_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-bottom-navbar.php';
    $combo_wizard_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/sheets/nativa-combo-wizard-sheet.php';
    $cookie_banner_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-cookie-banner.php';
    $rewards_sheet_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/sheets/nativa-rewards-sheet.php';
    $login_prompt_sheet_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/sheets/nativa-login-prompt-sheet.php';
    $offer_sheet_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/sheets/nativa-offer-sheet.php';
    $reorder_sheet_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/sheets/nativa-reorder-sheet.php';
    
    if ( ! is_page('pedidos') ) {
        if ( file_exists( $bottom_sheets_path ) ) include_once $bottom_sheets_path;
        if ( file_exists( $cart_side_sheet_path ) ) include_once $cart_side_sheet_path;
        if ( file_exists( $combo_wizard_path ) ) include_once $combo_wizard_path;
        if ( file_exists( $rewards_sheet_path ) ) include_once $rewards_sheet_path;
        if ( file_exists( $offer_sheet_path ) ) include_once $offer_sheet_path;
        if ( file_exists( $reorder_sheet_path ) ) include_once $reorder_sheet_path;
        if ( file_exists( $login_prompt_sheet_path ) ) include_once $login_prompt_sheet_path;
        if ( file_exists( $cookie_banner_path ) ) include_once $cookie_banner_path;
    }
    
    if ( ! is_page( $checkout_page_id ) && ! is_page('pedidos') ) {
        if ( file_exists( $bottom_navbar_path ) ) {
            include_once $bottom_navbar_path;
        }
    }
}
add_action( 'wp_footer', 'nativa_delivery_include_public_templates_html', 999 );

/**
 * Inicia o plugin.
 */
function run_nativa_delivery() {
    if ( ! defined('NATIVA_IS_ADMIN') ) {
        define('NATIVA_IS_ADMIN', is_admin());
    }

    require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/class-nd-main.php';
    $plugin = new ND_Main();
    
    require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/class-nd-activator.php';
    require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/class-nd-deactivator.php';
    
    register_activation_hook( __FILE__, array( 'ND_Activator', 'activate' ) );
    register_deactivation_hook( __FILE__, array( 'ND_Deactivator', 'deactivate' ) );
}

add_action( 'plugins_loaded', 'run_nativa_delivery' );


// --- LÓGICA DE PUSH PARA O DASHBOARD ---

function nd_save_dashboard_push_subscription() {
    check_ajax_referer('nativa_delivery_ajax_nonce', 'nativa_delivery_nonce');

    if ( ! current_user_can('edit_posts') ) {
        wp_send_json_error(['message' => 'Permissão negada.']);
        return;
    }

    $subscription = json_decode(stripslashes($_POST['subscription']), true);

    if ( empty($subscription['endpoint']) ) {
        wp_send_json_error(['message' => 'Inscrição inválida.']);
        return;
    }

    $user_id = get_current_user_id();
    update_user_meta($user_id, 'nativa_dashboard_push_subscription', $subscription);

    wp_send_json_success(['message' => 'Inscrição salva com sucesso.']);
}
add_action('wp_ajax_nativa_delivery_save_dashboard_push_subscription', 'nd_save_dashboard_push_subscription');


function nd_send_new_order_notification_to_dashboard($order_id) {
    require_once NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php';
    
    if ( function_exists('wc_get_order') ) {
        $order = wc_get_order($order_id);
        if (!$order) return;
        $customer_name = $order->get_billing_first_name();
    } else {
        return;
    }

    $args = [
        'role__in' => ['administrator', 'shop_manager'],
        'fields' => 'ID',
    ];
    $admin_users = get_users($args);

    $subscriptions = [];
    foreach ($admin_users as $user_id) {
        $subscription_data = get_user_meta($user_id, 'nativa_dashboard_push_subscription', true);
        if ($subscription_data && is_array($subscription_data)) {
            $subscriptions[] = \Minishlink\WebPush\Subscription::create($subscription_data);
        }
    }

    if (empty($subscriptions)) return;

    $auth = [
        'VAPID' => [
            'subject' => get_site_url(),
            'publicKey' => defined('VAPID_PUBLIC_KEY') ? VAPID_PUBLIC_KEY : '',
            'privateKey' => defined('VAPID_PRIVATE_KEY') ? VAPID_PRIVATE_KEY : '',
        ],
    ];

    $webPush = new \Minishlink\WebPush\WebPush($auth);

    $payload = json_encode([
        'title' => "Novo Pedido! (#{$order_id})",
        'body' => 'Você recebeu um novo pedido de ' . $customer_name,
        'icon' => NATIVADELIVERY_PLUGIN_URL . 'assets/icons/android-chrome-192x192.png',
        'url' => '/pedidos/',
    ]);

    foreach ($subscriptions as $subscription) {
        $webPush->queueNotification($subscription, $payload);
    }

    foreach ($webPush->flush() as $report) {
        if (!$report->isSuccess()) {
            error_log("Erro ao enviar notificação push dashboard: {$report->getReason()}");
        }
    }
}
add_action('woocommerce_new_order', 'nd_send_new_order_notification_to_dashboard', 10, 1);


// --- NOVO: LÓGICA DE TEMPLATE PARA PÁGINA "CARDÁPIO MESA" ---

/**
 * Intercepta o carregamento da página 'cardapio-mesa' e força o uso do nosso template.
 * Funciona com a página criada no WP Admin (Slug: cardapio-mesa).
 */
function nativa_load_table_menu_template($template) {
    if ( is_page('cardapio-mesa') ) {
        // Caminho para o seu arquivo de template personalizado
        $new_template = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/cardapio-mesa.php';
        
        if (file_exists($new_template)) {
            return $new_template;
        }
    }
    return $template;
}
add_filter('template_include', 'nativa_load_table_menu_template');