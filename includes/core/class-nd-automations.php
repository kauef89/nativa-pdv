<?php
/**
* Gerencia automações e lógicas de negócio baseadas em eventos do sistema.
* ... (histórico de versões anterior) ...
* OTIMIZAÇÃO DE MEMÓRIA (V2): Lazy loading do WebPush.
* ATUALIZAÇÃO (PUSH DASHBOARD): Notifica dashboard.
* ATUALIZAÇÃO (PUSH PIX): Push customizado.
* ATUALIZAÇÃO (PUSH STATUS): Filtros de status.
* CORREÇÃO (DASHBOARD REALTIME): Força a atualização da data de modificação do post ao confirmar PIX via automação.
*/

if ( ! defined( 'ABSPATH' ) ) {
  exit;
}

// A inclusão do autoloader foi removida daqui para economizar memória.
use Minishlink\WebPush\WebPush;
use Minishlink\WebPush\Subscription;

class ND_Automations {

  private $debug_logs = [];

  public function __construct() {
    add_action( 'set_object_terms', array( $this, 'on_order_status_change' ), 10, 4 );
    add_action( 'user_register', array( $this, 'copy_nextend_data_on_registration' ), 10, 1 );
    add_action( 'nsl_login', array( $this, 'set_redirect_transient_after_social_login' ), 10, 1 );
   
    add_action( 'nativa_delivery_process_pending_pix', array( $this, 'process_pending_pix_orders' ) );
  }

  public function get_debug_logs() {
    return $this->debug_logs;
  }
  
  private function log_debug($message) {
    $this->debug_logs[] = 'Nativa Delivery DEBUG: ' . $message;
  }

  public function set_redirect_transient_after_social_login( $user_id ) {
    if ( ! is_user_logged_in() || ! $user_id ) {
      return;
    }
    if ( isset( $_GET['redirect_to'] ) && $_GET['redirect_to'] === 'checkout' ) {
      set_transient( 'nativa_redirect_user_' . $user_id, 'checkout', 5 * MINUTE_IN_SECONDS );
    }
  }

  public function process_pending_pix_orders() {
    if ( ! ND_Hours_Helper::is_store_open() ) {
      return;
    }

    $cancel_args = array(
      'post_type'   => 'nativa_pedido', 'posts_per_page' => -1, 'post_status'  => 'publish',
      'tax_query'   => array( array( 'taxonomy' => 'nativa_order_status', 'field' => 'slug', 'terms' => 'aguardando-pagamento' ) ),
      'date_query'  => array( array( 'column' => 'post_date_gmt', 'before' => '10 minutes ago' ) ),
      'fields'    => 'ids',
    );
    $expired_orders = get_posts( $cancel_args );
    if ( ! empty( $expired_orders ) ) {
      foreach ( $expired_orders as $order_id ) {
        wp_set_object_terms( $order_id, 'cancelado', 'nativa_order_status' );
        update_post_meta( $order_id, '_payment_status', 'expired' );
        
        $log = get_post_meta( $order_id, 'pedido_status_log', true );
        if ( ! is_array( $log ) ) { $log = []; }
        $log[] = [ 'status' => 'cancelado', 'timestamp' => current_time( 'timestamp', true ), 'note' => 'Pedido cancelado automaticamente por expiração do PIX.' ];
        update_post_meta( $order_id, 'pedido_status_log', $log );
        
        // --- CORREÇÃO REALTIME ---
        // Força atualização da data de modificação para o Dashboard perceber
        wp_update_post(['ID' => $order_id]); 
      }
    }

    $check_args = array(
      'post_type'   => 'nativa_pedido', 'posts_per_page' => -1, 'post_status'  => 'publish',
      'tax_query'   => array( array( 'taxonomy' => 'nativa_order_status', 'field'  => 'slug', 'terms' => 'aguardando-pagamento' ) ),
      'date_query'  => array( array( 'after' => '30 minutes ago' ) ),
      'fields'    => 'ids',
    );
    $pending_orders = get_posts( $check_args );
    if ( empty( $pending_orders ) ) { return; }
    foreach ( $pending_orders as $order_id ) {
      $txid = get_post_meta( $order_id, '_pix_txid', true );
      if ( empty( $txid ) ) { continue; }

      $charge_details = ND_Sicredi_Helper::get_pix_charge( $txid );

      if ( ! is_wp_error( $charge_details ) && isset( $charge_details['status'] ) && $charge_details['status'] === 'CONCLUIDA' ) {
        wp_set_object_terms( $order_id, 'recebido', 'nativa_order_status' );
        update_post_meta($order_id, '_pix_status', 'CONCLUIDA');
        
        // --- CORREÇÃO REALTIME ---
        // Força atualização da data de modificação para o Dashboard perceber o pagamento imediatamente
        wp_update_post(['ID' => $order_id]);
      }
    }
  }

  public function copy_nextend_data_on_registration( $user_id ) {
    $nextend_data = get_user_meta( $user_id, '_nsl_persistent_data', true );
    if ( ! empty( $nextend_data ) && is_array( $nextend_data ) ) {
      foreach ( $nextend_data as $provider => $data ) {
        $dob_string = null;
        $possible_keys = ['birthday', 'birthDate', 'birth_date'];
        foreach ($possible_keys as $key) {
          if (!empty($data[$key]) && is_string($data[$key])) {
            $dob_string = $data[$key];
            break;
          }
        }
        if (!$dob_string && !empty($data['birthdays']) && is_array($data['birthdays'])) {
          foreach ($data['birthdays'] as $birthday_data) {
            if (isset($birthday_data['date']['year'], $birthday_data['date']['month'], $birthday_data['date']['day'])) {
              $year = $birthday_data['date']['year'];
              $month = $birthday_data['date']['month'];
              $day = $birthday_data['date']['day'];
              $dob_string = sprintf('%04d-%02d-%02d', $year, $month, $day);
              break;
            }
          }
        }
        if ( $dob_string ) {
          $timestamp = strtotime( $dob_string );
          if ( $timestamp ) {
            $formatted_dob = date( 'Y-m-d', $timestamp );
            update_user_meta( $user_id, 'nativa_user_dob', $formatted_dob );
            break;
          }
        }
      }
    }
  }

  public function on_order_status_change( $object_id, $terms, $tt_ids, $taxonomy ) {
    if ( 'nativa_order_status' !== $taxonomy || empty( $terms ) || 'nativa_pedido' !== get_post_type( $object_id ) ) {
      return;
    }
   
    $term = get_term_by( 'term_taxonomy_id', $tt_ids[0], $taxonomy );
    if ( ! $term || is_wp_error( $term ) ) { return; }
   
    $new_status_slug = $term->slug;

    $this->log_status_change( $object_id, $new_status_slug );
    $this->maybe_award_loyalty_points( $object_id, $new_status_slug );
    $this->maybe_revoke_loyalty_points( $object_id, $new_status_slug );
    $this->send_push_notification_on_status_change( $object_id, $new_status_slug, $term->name );
  }

    public function send_push_notification_on_status_change( $order_id, $new_status_slug, $new_status_name ) {
        
        // --- 1. BLOQUEIO DE STATUS IGNORADOS ---
        $status_ignorados = [
            'pending',
            'pendente',
            'aguardando-pagamento',
            'finalizado',
            'auto-draft',
            'draft'
        ];

        if ( in_array( $new_status_slug, $status_ignorados, true ) ) {
            return;
        }

        $this->log_debug("Iniciando send_push_notification_on_status_change para o pedido #{$order_id} (Status: {$new_status_slug})");

        $user_id = get_post_meta( $order_id, '_customer_user', true );
        if ( empty( $user_id ) ) {
            $this->log_debug('Falha - Pedido sem usuário associado.');
            return;
        }

        // --- 2. PREPARAÇÃO DA MENSAGEM ---
        $customer_name = get_post_meta( $order_id, 'pedido_nome_cliente', true );
        $first_name    = $customer_name ? explode( ' ', $customer_name )[0] : 'Cliente';
        $tipo_servico  = get_field('pedido_tipo_servico', $order_id); 

        // Mensagens Padrão
        $notification_title = "Atualização do Pedido #{$order_id}";
        $notification_body  = "Seu pedido mudou para: {$new_status_name}";

        switch ( $new_status_slug ) {
            case 'recebido':
                $notification_title = "Pedido #{$order_id} Recebido! 📋";
                $notification_body  = "Olá {$first_name}, recebemos seu pedido. Aguarde a confirmação!";
                break;

            case 'aceito':
                $notification_title = "Pedido #{$order_id} Aceito! 👨‍🍳";
                $notification_body  = "A cozinha já começou o preparo. Avisaremos quando estiver pronto.";
                break;

            case 'pronto':
                if ( $tipo_servico === 'delivery' ) {
                    $notification_title = "Pedido #{$order_id} Pronto! 🛵";
                    $notification_body  = "Seu pedido está embalado e aguardando o entregador.";
                } else {
                    $notification_title = "Pedido #{$order_id} Pronto! 🛍️";
                    $notification_body  = "Oba! Seu pedido está pronto para retirada no balcão.";
                }
                break;

            case 'enviado':
                $notification_title = "Saiu para Entrega! 🏎️";
                $notification_body  = "O pedido #{$order_id} está a caminho. Fique de olho!";
                break;

            case 'cancelado':
                $notification_title = "Atualização do Pedido #{$order_id}";
                $notification_body  = "Atenção: seu pedido foi cancelado. Entre em contato para mais detalhes.";
                break;
        }

        $is_urgent = false;
        if ( ($tipo_servico === 'delivery' && $new_status_slug === 'enviado') || ($tipo_servico === 'pickup' && $new_status_slug === 'pronto') ) {
            $is_urgent = true;
        }

        $payload_data = [
            'title' => $notification_title,
            'body'  => $notification_body,
            'icon'  => NATIVADELIVERY_PLUGIN_URL . 'assets/icons/android-chrome-192x192.png',
            'url'   => home_url('/minha-conta'),
            'isUrgent' => $is_urgent,
        ];
        
        $this->send_custom_push_to_user($user_id, $payload_data);
    }

  public function send_custom_push_to_user($user_id, $payload_data) {
    if (file_exists(NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php')) {
        require_once NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php';
    }
    if ( ! class_exists('Minishlink\WebPush\WebPush') ) {
        $this->log_debug('Falha - Biblioteca WebPush não encontrada.');
        return;
    }

    $this->log_debug("Iniciando send_custom_push_to_user para User ID: {$user_id}");

    $subscriptions = get_user_meta( $user_id, 'nativa_push_subscriptions', true );
    if ( empty( $subscriptions ) || ! is_array( $subscriptions ) ) {
        $this->log_debug('Falha - Nenhuma subscrição válida encontrada para o usuário.');
        return;
    }

    $payload = json_encode($payload_data);

    $auth = [
        'VAPID' => [
            'subject'    => home_url(),
            'publicKey'  => defined('VAPID_PUBLIC_KEY') ? VAPID_PUBLIC_KEY : '',
            'privateKey' => defined('VAPID_PRIVATE_KEY') ? VAPID_PRIVATE_KEY : '',
        ],
    ];
    if ( empty($auth['VAPID']['publicKey']) || empty($auth['VAPID']['privateKey']) ) {
        $this->log_debug('Falha - Chaves VAPID não definidas.');
        return;
    }

    $webPush = new WebPush($auth);
    $webPush->setReuseVAPIDHeaders(true);

    foreach ( $subscriptions as $sub_data ) {
        try {
            $subscription = Subscription::create( $sub_data );
            $webPush->queueNotification( $subscription, $payload );
            $this->log_debug("Notificação (custom) enfileirada para o endpoint: " . $subscription->getEndpoint());
        } catch ( \Exception $e ) {
            $this->log_debug( 'Erro ao criar/enfileirar notificação (custom): ' . $e->getMessage() );
        }
    }
    
    $success_count = 0;
    $failed_count = 0;
    foreach ( $webPush->flush() as $report ) {
        if ( $report->isSuccess() ) {
            $success_count++;
        } else {
            $failed_count++;
            $this->log_debug( "FALHA (custom) - Notificação para {$report->getEndpoint()} falhou. Motivo: {$report->getReason()}" );
        }
    }
    $this->log_debug("Flush (custom) completo. Sucessos: {$success_count}, Falhas: {$failed_count}.");
  }

  private function log_status_change( $order_id, $new_status_slug ) {
    $log = get_post_meta( $order_id, 'pedido_status_log', true );
    if ( ! is_array( $log ) ) { $log = []; }
    $log[] = [ 'status' => $new_status_slug, 'timestamp' => current_time( 'timestamp', true ), ];
    update_post_meta( $order_id, 'pedido_status_log', $log );
  }

  private function maybe_award_loyalty_points( $order_id, $new_status_slug ) {
    $final_statuses = array( 'finalizado' );
    if ( ! in_array( $new_status_slug, $final_statuses, true ) ) return;
   
    $points_awarded_flag = get_post_meta( $order_id, '_loyalty_points_awarded', true );
    if ( $points_awarded_flag ) return;
   
    $user_id = get_post_meta( $order_id, '_customer_user', true );
    if ( empty( $user_id ) ) return;
   
    $points_to_award = get_field('pedido_pontos_ganhos', $order_id);
    if ( empty($points_to_award) || (int) $points_to_award <= 0 ) return;

    $current_points = get_user_meta( $user_id, 'nativa_user_points', true );
    $current_points = empty( $current_points ) ? 0 : intval( $current_points );
    $new_total_points = $current_points + intval($points_to_award);
   
    update_user_meta( $user_id, 'nativa_user_points', $new_total_points );
    update_post_meta( $order_id, '_loyalty_points_awarded', true );
  }

  private function maybe_revoke_loyalty_points( $order_id, $new_status_slug ) {
    if ( 'cancelado' !== $new_status_slug ) return;

    $points_awarded = get_post_meta( $order_id, '_loyalty_points_awarded', true );
    if ( ! $points_awarded ) return;
   
    $user_id = get_post_meta( $order_id, '_customer_user', true );
    if ( empty( $user_id ) ) return;
   
    $points_to_revoke = get_field('pedido_pontos_ganhos', $order_id);
    if ( empty($points_to_revoke) || (int) $points_to_revoke <= 0 ) return;

    $current_points = get_user_meta( $user_id, 'nativa_user_points', true );
    $current_points = empty( $current_points ) ? 0 : intval( $current_points );
    $new_total_points = max(0, $current_points - intval($points_to_revoke));

    update_user_meta( $user_id, 'nativa_user_points', $new_total_points );
    update_post_meta( $order_id, '_loyalty_points_awarded', false );
  }

    public function send_new_order_push_to_dashboard($order_id, $customer_name, $total) {
        if (file_exists(NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php')) {
            require_once NATIVADELIVERY_PLUGIN_DIR . 'vendor/autoload.php';
        }

        if (!class_exists('Minishlink\WebPush\WebPush')) {
            error_log('Nativa Delivery - Biblioteca WebPush não encontrada para notificar dashboard.');
            return;
        }

        $admin_users = get_users(['role' => 'administrator', 'fields' => 'ID']);
        if (empty($admin_users)) {
            return;
        }

        $payload = json_encode([
            'title' => "Novo Pedido Recebido! (#{$order_id})",
            'body'  => "Pedido de {$customer_name} no valor de {$total}.",
            'url'   => home_url('/pedidos/'),
        ]);

        $auth = [
            'VAPID' => [
                'subject'    => home_url(),
                'publicKey'  => defined('VAPID_PUBLIC_KEY') ? VAPID_PUBLIC_KEY : '',
                'privateKey' => defined('VAPID_PRIVATE_KEY') ? VAPID_PRIVATE_KEY : '',
            ],
        ];

        if (empty($auth['VAPID']['publicKey']) || empty($auth['VAPID']['privateKey'])) {
            error_log('Nativa Delivery - Chaves VAPID não definidas. Não é possível notificar o dashboard.');
            return;
        }

        $webPush = new WebPush($auth);
        $webPush->setReuseVAPIDHeaders(true);

        foreach ($admin_users as $user_id) {
            $subscriptions = get_user_meta($user_id, 'nativa_dashboard_push_subscriptions', true);
            if (is_array($subscriptions) && !empty($subscriptions)) {
                foreach ($subscriptions as $sub_data) {
                    try {
                        $subscription = Subscription::create($sub_data);
                        $webPush->queueNotification($subscription, $payload);
                    } catch (\Exception $e) {
                        // Log de erro silencioso
                    }
                }
            }
        }
        
        foreach ($webPush->flush() as $report) {
            if (!$report->isSuccess()) {
                error_log("Nativa Delivery - Falha ao enviar push para dashboard: " . $report->getReason());
            }
        }
    }
}