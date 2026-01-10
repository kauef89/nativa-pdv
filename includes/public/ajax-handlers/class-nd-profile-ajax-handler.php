<?php
/*
 * Lida com chamadas AJAX relacionadas ao perfil do usuário.
 *
 * VERSÃO CORRIGIDA:
 * 1. Atualiza o NOME do usuário com o dado oficial do CPF (Serpro).
 * 2. Adiciona TRAVA DE UNICIDADE para impedir CPFs duplicados.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Profile_Ajax_Handler {

    public static function register_hooks() {
        add_action( 'wp_ajax_nativa_delivery_get_my_account_data', array( __CLASS__, 'get_my_account_data_ajax' ) );
        add_action( 'wp_ajax_nativa_delivery_get_my_order_history', array( __CLASS__, 'get_my_order_history_ajax' ) );
        add_action( 'wp_ajax_nativa_delivery_complete_onboarding_data', array( __CLASS__, 'complete_onboarding_data_ajax' ) );
        add_action( 'wp_ajax_nativa_delivery_update_my_phone', array( __CLASS__, 'update_my_phone_ajax' ) );
        add_action( 'wp_ajax_nativa_delivery_delete_my_account', array( __CLASS__, 'delete_my_account_ajax' ) );
        add_action( 'wp_ajax_nativa_delivery_add_selected_items_to_cart', array( __CLASS__, 'add_selected_items_to_cart_ajax' ) );
        
        add_action( 'wp_ajax_nopriv_nativa_delivery_handle_google_login', array( __CLASS__, 'handle_google_login' ) );
        add_action( 'wp_ajax_nativa_delivery_handle_google_login', array( __CLASS__, 'handle_google_login' ) );
        
        add_action( 'wp_ajax_nativa_delivery_save_push_subscription', array( __CLASS__, 'save_push_subscription_ajax' ) );
        
        add_action( 'wp_ajax_nativa_delivery_test_push_notification', array( __CLASS__, 'test_push_notification_ajax' ) );

        add_action( 'wp_ajax_nativa_delivery_fetch_cpf_data', array( __CLASS__, 'fetch_cpf_data_ajax' ) );
        add_action( 'wp_ajax_nopriv_nativa_delivery_fetch_cpf_data', array( __CLASS__, 'fetch_cpf_data_ajax' ) );
    }

    public static function fetch_cpf_data_ajax() {
        if ( ! check_ajax_referer( 'nativa_delivery_ajax_nonce', 'nonce', false ) ) {
            wp_send_json_error( array( 'message' => 'Sessão expirada.' ), 403 );
        }
    
        $cpf = isset( $_POST['cpf'] ) ? sanitize_text_field( $_POST['cpf'] ) : '';
        
        if ( empty( $cpf ) ) {
            wp_send_json_error( array( 'message' => 'CPF não informado.' ) );
        }
    
        if ( file_exists( NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-gov-api-helper.php' ) ) {
            require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-gov-api-helper.php';
        }

        if ( class_exists( 'ND_Gov_API_Helper' ) ) {
            $result = ND_Gov_API_Helper::consult_cpf( $cpf );
            if ( is_wp_error( $result ) ) {
                wp_send_json_error( array( 'message' => $result->get_error_message() ) );
            } else {
                wp_send_json_success( $result );
            }
        } else {
             wp_send_json_error( array( 'message' => 'Erro interno: Helper da API Gov.br não encontrado.' ) );
        }
    }
    
    // ... (test_push_notification_ajax e check_authentication mantidos iguais) ...
    public static function test_push_notification_ajax() {
        self::check_authentication();
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-automations.php';
        $automations = new ND_Automations();
        $user_id = get_current_user_id();
        $subscriptions = get_user_meta($user_id, 'nativa_push_subscriptions', true);
        if (empty($subscriptions) || !is_array($subscriptions)) {
            wp_send_json_error(array('message' => 'Nenhuma subscrição de notificação encontrada.'));
            return;
        }
        try {
            $payload = json_encode([
                'title' => 'Teste de Notificação Push',
                'body' => 'Esta é uma mensagem de teste enviada pelo servidor.',
                'icon' => NATIVADELIVERY_PLUGIN_URL . 'assets/icons/android-chrome-192x192.png',
                'url' => home_url('/minha-conta'),
            ]);
            $auth = [
                'VAPID' => [
                    'subject'    => home_url(),
                    'publicKey'  => defined('VAPID_PUBLIC_KEY') ? VAPID_PUBLIC_KEY : '',
                    'privateKey' => defined('VAPID_PRIVATE_KEY') ? VAPID_PRIVATE_KEY : '',
                ],
            ];
            $webPush = new Minishlink\WebPush\WebPush($auth);
            $webPush->setReuseVAPIDHeaders(true);
            foreach ($subscriptions as $sub_data) {
                try {
                    $subscription = Minishlink\WebPush\Subscription::create($sub_data);
                    $webPush->queueNotification($subscription, $payload);
                } catch (\Exception $e) {}
            }
            $webPush->flush();
            wp_send_json_success(array('message' => 'Teste iniciado.'));
        } catch (\Exception $e) {
            wp_send_json_error(array('message' => 'Erro fatal: ' . $e->getMessage()));
        }
    }

    private static function check_authentication() {
        if ( ! is_user_logged_in() || ! check_ajax_referer( 'nativa_delivery_ajax_nonce', 'nonce', false ) ) {
            wp_send_json_error( array( 'message' => 'Sessão inválida ou expirada.' ), 403 );
        }
    }

    public static function get_my_account_data_ajax() {
        self::check_authentication();
        $user_id = get_current_user_id();
        $user_data = get_userdata( $user_id );
        
        $cpf = get_user_meta( $user_id, 'nativa_user_cpf', true );
        $phone = get_user_meta( $user_id, 'nativa_user_phone', true );
        $dob = get_user_meta( $user_id, 'nativa_user_dob', true );
        $avatar_url = get_user_meta($user_id, 'nativa_user_avatar_url', true);
        
        $avatar_html = ! empty($avatar_url) 
            ? '<img src="' . esc_url($avatar_url) . '" class="avatar avatar-80 photo" height="80" width="80" loading="lazy">' 
            : get_avatar($user_id, 80);

        wp_send_json_success( array(
            'userFirstName'       => $user_data->first_name ?: $user_data->display_name,
            'userName'            => $user_data->display_name,
            'userEmail'           => $user_data->user_email,
            'userAvatar'          => $avatar_html,
            'loyaltyPoints'       => intval( get_user_meta( $user_id, 'nativa_user_points', true ) ),
            'cpf'                 => $cpf,
            'phone'               => $phone,
            'dateOfBirth'         => !empty($dob) ? date('d/m/Y', strtotime($dob)) : null,
            'is_profile_complete' => ! empty( $cpf ) && ! empty( $phone ),
        ) );
    }

    public static function get_my_order_history_ajax() {
        self::check_authentication();
        $user_id = get_current_user_id();
        $args = array('post_type' => 'nativa_pedido', 'posts_per_page' => -1, 'author' => $user_id, 'orderby' => 'date', 'order' => 'DESC');
        $orders_query = new WP_Query( $args );
        $orders = array();
        if ( $orders_query->have_posts() ) {
            while ( $orders_query->have_posts() ) {
                $orders_query->the_post();
                $order_id = get_the_ID();
                $status_terms = get_the_terms( $order_id, 'nativa_order_status' );
                $status_name = !empty($status_terms) && !is_wp_error($status_terms) ? $status_terms[0]->name : 'Pendente';
                $status_slug = !empty($status_terms) && !is_wp_error($status_terms) ? $status_terms[0]->slug : 'pendente';
                $orders[] = array(
                    'id' => $order_id,
                    'date' => get_the_date( 'd/m/Y \à\s H:i', $order_id ),
                    'total' => get_field('pedido_total_final', $order_id) ? 'R$ ' . number_format_i18n(get_field('pedido_total_final', $order_id), 2) : 'R$ 0,00',
                    'status' => $status_name,
                    'status_slug' => $status_slug,
                    'status_log' => get_post_meta($order_id, 'pedido_status_log', true) ?: [],
                    'items_json' => get_field( 'pedido_itens_json', $order_id ),
                    'points_earned' => get_field( 'pedido_pontos_ganhos', $order_id ) ?: 0,
                    'available_statuses' => get_field('pedido_tipo_servico', $order_id) === 'delivery' ? ['pendente', 'recebido', 'aceito', 'pronto', 'enviado', 'finalizado', 'cancelado'] : ['pendente', 'recebido', 'aceito', 'pronto', 'finalizado', 'cancelado'],
                    'details' => get_fields($order_id),
                    'payment_received' => (bool) get_post_meta($order_id, '_payment_received', true),
                    'payment_refunded' => (bool) get_post_meta($order_id, '_payment_refunded', true),
                );
            }
        }
        wp_reset_postdata();
        wp_send_json_success( array('orderHistory' => $orders) );
    }

    public static function complete_onboarding_data_ajax() {
        self::check_authentication();

        $user_id = get_current_user_id();

        if ( ! isset( $_POST['form_data'] ) ) {
            wp_send_json_error( array( 'message' => 'Dados do formulário não recebidos.' ), 400 );
            return;
        }
        parse_str( $_POST['form_data'], $form_data );

        $cpf = isset( $form_data['onboarding-cpf'] ) ? sanitize_text_field( $form_data['onboarding-cpf'] ) : '';
        $ddd = isset( $form_data['onboarding-phone-ddd'] ) ? sanitize_text_field( $form_data['onboarding-phone-ddd'] ) : '';
        $number = isset( $form_data['onboarding-phone-number'] ) ? sanitize_text_field( $form_data['onboarding-phone-number'] ) : '';
        $full_phone = $ddd . $number;
        
        $full_name = isset( $form_data['onboarding-full-name'] ) ? sanitize_text_field( $form_data['onboarding-full-name'] ) : '';

        if ( empty( $cpf ) || empty( $full_phone ) ) {
            wp_send_json_error( array( 'message' => 'CPF e Telefone são obrigatórios.' ), 400 );
            return;
        }

        // --- INÍCIO DA TRAVA DE UNICIDADE ---
        // Verifica se algum outro usuário já possui este CPF cadastrado
        $users_with_cpf = get_users( array(
            'meta_key'    => 'nativa_user_cpf',
            'meta_value'  => $cpf,
            'fields'      => 'ID',
            'exclude'     => array( $user_id ), // Ignora o próprio usuário (em caso de atualização)
            'number'      => 1 // Basta encontrar um para falhar
        ) );

        if ( ! empty( $users_with_cpf ) ) {
            wp_send_json_error( array( 'message' => 'Este CPF já está cadastrado em outra conta.' ), 400 );
            return; // Bloqueia o processo
        }
        // --- FIM DA TRAVA DE UNICIDADE ---

        update_user_meta( $user_id, 'nativa_user_cpf', $cpf );
        update_user_meta( $user_id, 'nativa_user_phone', $full_phone );

        if ( isset( $form_data['onboarding-dob-day'], $form_data['onboarding-dob-month'], $form_data['onboarding-dob-year'] ) ) {
            $dob = sprintf( '%04d-%02d-%02d', intval( $form_data['onboarding-dob-year'] ), intval( $form_data['onboarding-dob-month'] ), intval( $form_data['onboarding-dob-day'] ) );
            update_user_meta( $user_id, 'nativa_user_dob', $dob );
        }

        // Se o nome foi enviado (vindo do Serpro), atualizamos a conta
        if ( ! empty( $full_name ) ) {
            $name_parts = explode(' ', $full_name);
            $first_name = array_shift($name_parts);
            $last_name = implode(' ', $name_parts);

            wp_update_user( array(
                'ID'           => $user_id,
                'display_name' => $full_name,
                'first_name'   => $first_name,
                'last_name'    => $last_name,
            ) );
        }

        wp_send_json_success( array( 'message' => 'Dados salvos com sucesso!' ) );
    }

    public static function update_my_phone_ajax() {
        self::check_authentication();
        $user_id = get_current_user_id();
        $phone_number = isset( $_POST['phone'] ) ? sanitize_text_field( $_POST['phone'] ) : '';
        if ( strlen( $phone_number ) < 10 ) {
            wp_send_json_error( array( 'message' => 'Número de telefone inválido.' ), 400 );
            return;
        }
        update_user_meta( $user_id, 'nativa_user_phone', $phone_number );
        wp_send_json_success( array('message' => 'Telefone atualizado!', 'phone' => $phone_number) );
    }

    public static function delete_my_account_ajax() {
        self::check_authentication();
        $user_id = get_current_user_id();
        
        $user = get_userdata( $user_id );
        if ( in_array( 'administrator', (array) $user->roles ) ) {
            wp_send_json_error( array( 'message' => 'Proteção de Segurança: Administradores não podem excluir a conta pelo App.' ), 403 );
            return;
        }
    
        $active_orders_query = new WP_Query( array(
            'post_type'      => 'nativa_pedido',
            'author'         => $user_id,
            'posts_per_page' => 1, 
            'tax_query'      => array(array('taxonomy' => 'nativa_order_status', 'field' => 'slug', 'terms' => array( 'finalizado', 'cancelado' ), 'operator' => 'NOT IN')),
        ) );
    
        if ( $active_orders_query->have_posts() ) {
            wp_send_json_error( array( 'message' => 'Você não pode excluir sua conta com pedidos ativos.' ), 400 );
            return;
        }
    
        require_once( ABSPATH . 'wp-admin/includes/user.php' );
        if ( wp_delete_user( $user_id ) ) {
            wp_send_json_success( array( 'message' => 'Sua conta foi excluída com sucesso.' ) );
        } else {
            wp_send_json_error( array( 'message' => 'Erro ao excluir conta.' ), 500 );
        }
    }

    public static function add_selected_items_to_cart_ajax() {
        self::check_authentication();
        $selected_items_json = isset( $_POST['items'] ) ? stripslashes( $_POST['items'] ) : '[]';
        $selected_items = json_decode( $selected_items_json, true );
        if ( empty( $selected_items ) ) {
            wp_send_json_error( array( 'message' => 'Nenhum item selecionado.' ), 400 );
            return;
        }
        foreach ( $selected_items as $item_data ) {
            ND_Cart_Helper::add_item($item_data);
        }
        $sanitized_cart = ND_Cart_Helper::get_sanitized_cart_data();
        wp_send_json_success( array(
            'message'       => 'Itens adicionados!',
            'cart_contents' => $sanitized_cart['contents'],
            'cart_total'    => $sanitized_cart['total'],
            'cart_count'    => ND_Cart_Helper::get_cart_item_count(),
        ) );
    }

    public static function handle_google_login() {
        if ( file_exists( NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
            require_once NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php';
        }
        if ( ! isset( $_POST['credential'] ) ) { wp_send_json_error( array( 'message' => 'Credencial não fornecida.' ), 400 ); }
        $credential = sanitize_text_field( $_POST['credential'] );
        $client_id = '855300367759-q1apf6ltpunkmfie5nikp8g20fuvdjso.apps.googleusercontent.com';
        if ( ! class_exists( 'Google_Client' ) ) { wp_send_json_error( array( 'message' => 'Biblioteca do Google indisponível.' ), 500 ); return; }
        $client = new Google_Client( array( 'client_id' => $client_id ) );
        $payload = $client->verifyIdToken( $credential );
        if ( $payload ) {
            $user_email = $payload['email'];
            $user_first_name = $payload['given_name'] ?? '';
            $user_last_name = $payload['family_name'] ?? '';
            $user_name = $payload['name'] ?? $user_first_name;
            $user_avatar_url = $payload['picture'] ?? '';
            if ( empty( $user_email ) ) { wp_send_json_error( array( 'message' => 'Email não retornado.' ), 400 ); }
            $user = get_user_by( 'email', $user_email );
            $user_status = 'existing';
            if ( ! $user ) {
                $username = sanitize_user( explode( '@', $user_email )[0] . '_' . wp_rand( 1000, 9999 ) );
                $password = wp_generate_password( 24 );
                $user_id = wp_create_user( $username, $password, $user_email );
                if ( is_wp_error( $user_id ) ) { wp_send_json_error( array( 'message' => 'Erro ao criar usuário: ' . $user_id->get_error_message() ), 500 ); }
                wp_update_user( array( 'ID' => $user_id, 'first_name' => $user_first_name, 'last_name' => $user_last_name, 'display_name' => $user_name, 'role' => 'subscriber' ) );
                if ( ! empty($user_avatar_url) ) { update_user_meta($user_id, 'nativa_user_avatar_url', esc_url_raw($user_avatar_url)); }
                $user = get_user_by( 'id', $user_id );
                $user_status = 'new';
            } else {
                if ( ! empty($user_avatar_url) ) { update_user_meta($user->ID, 'nativa_user_avatar_url', esc_url_raw($user_avatar_url)); }
            }
            wp_set_current_user( $user->ID, $user->user_login );
            wp_set_auth_cookie( $user->ID );
            do_action( 'wp_login', $user->user_login, $user );
            if ( ! session_id() ) { session_start(); }
            $_SESSION['nativa_customer_logged_in'] = true;
            $is_profile_complete = (bool) get_user_meta( $user->ID, 'nativa_user_phone', true );
            wp_send_json_success( array( 'message' => 'Login realizado!', 'redirect_url' => home_url( '/processando-login/' ), 'final_redirect_url' => home_url( '/minha-conta' ), 'user_status' => $user_status, 'is_profile_complete' => $is_profile_complete ) );
        } else {
            wp_send_json_error( array( 'message' => 'Credencial Google inválida.' ), 401 );
        }
    }

    public static function save_push_subscription_ajax() {
        self::check_authentication();
        if ( ! isset( $_POST['subscription'] ) ) { wp_send_json_error( array( 'message' => 'Dados inválidos.' ), 400 ); return; }
        $subscription_data = json_decode( stripslashes( $_POST['subscription'] ), true );
        if ( json_last_error() !== JSON_ERROR_NONE || empty( $subscription_data['endpoint'] ) ) { wp_send_json_error( array( 'message' => 'Dados inválidos.' ), 400 ); return; }
        $user_id = get_current_user_id();
        $subscriptions = get_user_meta( $user_id, 'nativa_push_subscriptions', true );
        if ( ! is_array( $subscriptions ) ) { $subscriptions = []; }
        $endpoint = $subscription_data['endpoint'];
        $subscriptions[ $endpoint ] = $subscription_data;
        update_user_meta( $user_id, 'nativa_push_subscriptions', $subscriptions );
        wp_send_json_success( array( 'message' => 'Inscrição salva.' ) );
    }
}