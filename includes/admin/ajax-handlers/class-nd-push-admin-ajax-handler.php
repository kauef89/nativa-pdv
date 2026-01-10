<?php
/**
 * Lida com chamadas AJAX da página de administração de Notificações Push.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Acesso direto bloqueado
}

class ND_Push_Admin_Ajax_Handler {

    /**
     * Registra os hooks do WordPress.
     */
    public static function register_hooks() {
        add_action( 'wp_ajax_nativa_delivery_send_bulk_push', array( __CLASS__, 'handle_send_bulk_push_ajax' ) );
        add_action( 'wp_ajax_nativa_delivery_send_not_ordered_push', array( __CLASS__, 'handle_send_not_ordered_push_ajax' ) );
        add_action( 'wp_ajax_nativa_delivery_send_test_push', array( __CLASS__, 'handle_send_test_push_ajax' ) );
        
        add_action( 'wp_ajax_nopriv_nativa_delivery_track_push_click', array( __CLASS__, 'handle_track_push_click_ajax' ) );
        add_action( 'wp_ajax_nativa_delivery_track_push_click', array( __CLASS__, 'handle_track_push_click_ajax' ) );
    }

    /**
     * Helper privado para validar segurança e carregar bibliotecas.
     */
    private static function prepare_environment() {
        if ( ! current_user_can( 'manage_options' ) ) {
            wp_send_json_error( array( 'message' => 'Você não tem permissão para realizar esta ação.' ), 403 );
        }
        if ( ! check_ajax_referer( 'nativa_send_push_notification', 'nativa_push_nonce', false ) ) {
            wp_send_json_error( array( 'message' => 'Verificação de segurança falhou. Atualize a página.' ), 403 );
        }

        if ( file_exists( NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php' ) ) {
            require_once NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php';
        }
        
        if ( ! class_exists( 'Minishlink\WebPush\WebPush' ) ) {
            wp_send_json_error( array( 'message' => 'Biblioteca WebPush não encontrada.' ), 500 );
        }
    }

    /**
     * Lida com a requisição de envio de notificação em massa (TODOS).
     */
    public static function handle_send_bulk_push_ajax() {
        self::prepare_environment();
        self::process_push_send( 'all' );
    }

    /**
     * Lida com envio apenas para quem NÃO comprou hoje.
     */
    public static function handle_send_not_ordered_push_ajax() {
        self::prepare_environment();
        self::process_push_send( 'not_ordered_today' );
    }

    /**
     * Lógica central de envio com limpeza automática de tokens.
     */
    private static function process_push_send( $filter_type ) {
        // Validação de Dados
        $title = isset( $_POST['push_title'] ) ? sanitize_text_field( wp_unslash( $_POST['push_title'] ) ) : '';
        $message = isset( $_POST['push_message'] ) ? sanitize_textarea_field( wp_unslash( $_POST['push_message'] ) ) : '';
        $url = isset( $_POST['push_url'] ) && ! empty( $_POST['push_url'] ) ? esc_url_raw( wp_unslash( $_POST['push_url'] ) ) : home_url( '/' );

        if ( empty( $title ) || empty( $message ) ) {
            wp_send_json_error( array( 'message' => 'Título e Mensagem são obrigatórios.' ), 400 );
        }

        $post_id = wp_insert_post( array(
            'post_type'    => 'nativa_push_message',
            'post_title'   => $title,
            'post_content' => $message,
            'post_status'  => 'publish',
        ) );

        if ( is_wp_error( $post_id ) ) {
            wp_send_json_error( array( 'message' => 'Erro ao criar registro: ' . $post_id->get_error_message() ), 500 );
        }

        update_post_meta( $post_id, '_push_target_url', $url );
        update_post_meta( $post_id, '_push_filter_type', $filter_type );

        $users_with_subscriptions = get_users( array(
            'meta_key'     => 'nativa_push_subscriptions',
            'meta_compare' => 'EXISTS',
            'fields'       => array( 'ID' ),
        ) );

        if ( empty( $users_with_subscriptions ) ) {
            update_post_meta( $post_id, '_push_sent_count', 0 );
            wp_send_json_success( array( 'message' => 'Nenhum usuário inscrito encontrado.' ) );
            return;
        }

        $target_users = $users_with_subscriptions;

        if ( $filter_type === 'not_ordered_today' ) {
            $today = getdate();
            $args = array(
                'post_type'      => 'nativa_pedido',
                'post_status'    => 'publish',
                'posts_per_page' => -1,
                'fields'         => 'ids',
                'date_query'     => array(
                    array(
                        'year'  => $today['year'],
                        'month' => $today['mon'],
                        'day'   => $today['mday'],
                    ),
                ),
            );
            $orders_today = get_posts( $args );
            
            $users_who_bought_today = array();
            foreach ( $orders_today as $oid ) {
                $uid = get_post_meta( $oid, '_customer_user', true );
                if ( $uid ) {
                    $users_who_bought_today[] = intval($uid);
                }
            }
            $users_who_bought_today = array_unique( $users_who_bought_today );

            $target_users = array_filter( $users_with_subscriptions, function( $user ) use ( $users_who_bought_today ) {
                return ! in_array( $user->ID, $users_who_bought_today );
            });
        }

        if ( empty( $target_users ) ) {
            update_post_meta( $post_id, '_push_sent_count', 0 );
            $msg = ($filter_type === 'not_ordered_today') ? 'Todos os inscritos já compraram hoje!' : 'Nenhum usuário alvo encontrado.';
            wp_send_json_success( array( 'message' => $msg ) );
            return;
        }

        try {
            $auth = [
                'VAPID' => [
                    'subject'    => home_url(),
                    'publicKey'  => defined('VAPID_PUBLIC_KEY') ? VAPID_PUBLIC_KEY : '',
                    'privateKey' => defined('VAPID_PRIVATE_KEY') ? VAPID_PRIVATE_KEY : '',
                ],
            ];
            
            $webPush = new Minishlink\WebPush\WebPush( $auth );
            $webPush->setReuseVAPIDHeaders( true );

            // Mapa para rastrear dono do endpoint para limpeza
            $endpoint_user_map = array();

            foreach ( $target_users as $user ) {
                $subscriptions = get_user_meta( $user->ID, 'nativa_push_subscriptions', true );
                if ( is_array( $subscriptions ) ) {
                    $payload = json_encode( [
                        'title'  => $title,
                        'body'   => $message,
                        'icon'   => NATIVADELIVERY_PLUGIN_URL . 'assets/icons/android-chrome-192x192.png',
                        'url'    => $url,
                        'postId' => $post_id, 
                        'userId' => $user->ID, 
                    ] );

                    foreach( $subscriptions as $endpoint => $sub_data ) {
                        // Garante que o endpoint esteja mapeado para o usuário para limpeza futura
                        $endpoint_user_map[$endpoint] = $user->ID;
                        try {
                            $subscription = Minishlink\WebPush\Subscription::create( $sub_data );
                            $webPush->queueNotification( $subscription, $payload );
                        } catch (\Exception $e) {}
                    }
                }
            }

            $success_count = 0;
            $failure_reasons = [];
            $cleaned_tokens = 0;

            foreach ( $webPush->flush() as $report ) {
                if ( $report->isSuccess() ) {
                    $success_count++;
                } else {
                    $endpoint = $report->getEndpoint();
                    
                    // Verifica se o erro é de token expirado ou inválido (404, 410)
                    if ( $report->isSubscriptionExpired() ) {
                        // Limpeza Automática
                        if ( isset( $endpoint_user_map[$endpoint] ) ) {
                            $uid_to_clean = $endpoint_user_map[$endpoint];
                            self::remove_user_subscription( $uid_to_clean, $endpoint );
                            $cleaned_tokens++;
                        }
                    } else {
                        // Se for outro erro, loga uma mensagem amigável
                        $raw_reason = $report->getReason();
                        $clean_reason = "Erro técnico: " . substr($raw_reason, 0, 30) . "..."; // Encurta
                        $failure_reasons[] = $clean_reason;
                    }
                }
            }
            
            update_post_meta( $post_id, '_push_sent_count', $success_count );
            
            if ( $cleaned_tokens > 0 ) {
                $failure_reasons[] = "Limpeza automática: $cleaned_tokens dispositivos inativos removidos.";
            }

            if ( ! empty( $failure_reasons ) ) {
                $unique_errors = array_unique( $failure_reasons );
                update_post_meta( $post_id, '_push_error_log', array_values( $unique_errors ) );
            }

            wp_send_json_success( array(
                'message' => sprintf( 'Enviado com sucesso para %d dispositivos.', $success_count )
            ) );

        } catch ( \Exception $e ) {
            wp_send_json_error( array( 'message' => 'Erro fatal: ' . $e->getMessage() ), 500 );
        }
    }

    /**
     * Envia uma notificação de teste apenas para o usuário atual (admin).
     */
    public static function handle_send_test_push_ajax() {
        self::prepare_environment();

        $title = isset( $_POST['push_title'] ) ? sanitize_text_field( wp_unslash( $_POST['push_title'] ) ) : '';
        $message = isset( $_POST['push_message'] ) ? sanitize_textarea_field( wp_unslash( $_POST['push_message'] ) ) : '';
        $url = isset( $_POST['push_url'] ) && ! empty( $_POST['push_url'] ) ? esc_url_raw( wp_unslash( $_POST['push_url'] ) ) : home_url( '/' );

        if ( empty( $title ) || empty( $message ) ) {
            wp_send_json_error( array( 'message' => 'Preencha Título e Mensagem.' ), 400 );
        }

        $user_id = get_current_user_id();
        $subscriptions = get_user_meta( $user_id, 'nativa_push_subscriptions', true );

        if ( empty( $subscriptions ) || ! is_array( $subscriptions ) ) {
            wp_send_json_error( array( 'message' => 'Admin sem inscrição push ativa. Acesse como cliente para ativar.' ) );
            return;
        }

        $post_id = wp_insert_post( array(
            'post_type'    => 'nativa_push_message',
            'post_title'   => '[TESTE] ' . $title,
            'post_content' => $message,
            'post_status'  => 'publish',
        ) );
        update_post_meta( $post_id, '_push_target_url', $url );
        update_post_meta( $post_id, '_push_filter_type', 'test_admin' );

        try {
            $auth = [
                'VAPID' => [
                    'subject'    => home_url(),
                    'publicKey'  => defined('VAPID_PUBLIC_KEY') ? VAPID_PUBLIC_KEY : '',
                    'privateKey' => defined('VAPID_PRIVATE_KEY') ? VAPID_PRIVATE_KEY : '',
                ],
            ];

            $webPush = new Minishlink\WebPush\WebPush( $auth );
            $webPush->setReuseVAPIDHeaders( true ); 
            
            $payload = json_encode( [
                'title'  => "[TESTE] " . $title,
                'body'   => $message,
                'icon'   => NATIVADELIVERY_PLUGIN_URL . 'assets/icons/android-chrome-192x192.png',
                'url'    => $url,
                'postId' => $post_id,
                'userId' => $user_id,
            ] );

            foreach( $subscriptions as $sub_data ) {
                $subscription = Minishlink\WebPush\Subscription::create( $sub_data );
                $webPush->queueNotification( $subscription, $payload );
            }

            $results = $webPush->flush();
            $success = false;
            $success_count = 0;
            $failure_reasons = [];
            $cleaned_tokens = 0;

            foreach ( $results as $report ) {
                if ( $report->isSuccess() ) {
                    $success = true;
                    $success_count++;
                } else {
                    $endpoint = $report->getEndpoint();
                    if ( $report->isSubscriptionExpired() ) {
                        self::remove_user_subscription( $user_id, $endpoint );
                        $cleaned_tokens++;
                    } else {
                        // Mensagem amigável para outros erros
                        $failure_reasons[] = "Erro técnico: " . substr($report->getReason(), 0, 30) . "...";
                    }
                }
            }

            update_post_meta( $post_id, '_push_sent_count', $success_count );
            
            if ( $cleaned_tokens > 0 ) {
                $failure_reasons[] = "Limpeza: $cleaned_tokens dispositivo(s) inválido(s) removido(s).";
            }
            
            if ( ! empty( $failure_reasons ) ) {
                update_post_meta( $post_id, '_push_error_log', array_unique($failure_reasons) );
            }

            if ( $success ) {
                wp_send_json_success( array( 'message' => "Teste enviado! ($success_count sucessos)" ) );
            } else {
                wp_send_json_error( array( 'message' => 'Falha no envio de teste. (Verifique o histórico para ver erros/limpeza)' ) );
            }

        } catch ( \Exception $e ) {
            wp_send_json_error( array( 'message' => 'Erro fatal no teste: ' . $e->getMessage() ), 500 );
        }
    }

    /**
     * Remove uma inscrição específica do meta do usuário.
     */
    private static function remove_user_subscription( $user_id, $endpoint_to_remove ) {
        $subscriptions = get_user_meta( $user_id, 'nativa_push_subscriptions', true );
        if ( is_array( $subscriptions ) && isset( $subscriptions[$endpoint_to_remove] ) ) {
            unset( $subscriptions[$endpoint_to_remove] );
            update_user_meta( $user_id, 'nativa_push_subscriptions', $subscriptions );
        }
    }

    public static function handle_track_push_click_ajax() {
        if ( ! isset( $_POST['post_id'] ) || ! isset( $_POST['user_id'] ) ) { wp_send_json_error( 'Dados insuficientes.', 400 ); return; }
        $post_id = intval( $_POST['post_id'] );
        $user_id = intval( $_POST['user_id'] );
        if ( $post_id <= 0 || get_post_type( $post_id ) !== 'nativa_push_message' ) { wp_send_json_error( 'ID inválido.', 400 ); return; }
        $current_opens = intval( get_post_meta( $post_id, '_push_open_count', true ) );
        update_post_meta( $post_id, '_push_open_count', $current_opens + 1 );
        $opened_by_users = get_post_meta( $post_id, '_push_opened_by', true );
        if ( ! is_array( $opened_by_users ) ) $opened_by_users = [];
        if ( ! in_array( $user_id, $opened_by_users ) ) {
            $opened_by_users[] = $user_id;
            update_post_meta( $post_id, '_push_opened_by', $opened_by_users );
        }
        wp_send_json_success();
    }
}