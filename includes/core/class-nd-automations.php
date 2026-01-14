<?php
/**
 * Gerencia automações e lógicas de negócio baseadas em eventos do sistema.
 * VERSÃO 6.3 (FINAL): Timestamp UNIX, SQL Nativo, Integração Financeira e OneSignal.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

class ND_Automations {

  private $app_id;
  private $rest_key;
  private $wpdb;

  public function __construct() {
    global $wpdb;
    $this->wpdb = $wpdb;

    // Configuração OneSignal
    if ( defined( 'NATIVA_ONESIGNAL_APP_ID' ) ) {
        $this->app_id = NATIVA_ONESIGNAL_APP_ID;
    } else {
        $this->app_id = get_option('nativa_onesignal_app_id', '');
    }

    if ( defined( 'NATIVA_ONESIGNAL_REST_KEY' ) ) {
        $this->rest_key = NATIVA_ONESIGNAL_REST_KEY;
    } else {
        $this->rest_key = get_option('nativa_onesignal_rest_key', '');
    }

    // Cron de PIX
    add_action( 'nativa_delivery_process_pending_pix', array( $this, 'process_pending_pix_orders_sql' ) );
  }

  // --- 1. AUTOMAÇÕES DE STATUS (CORE) ---

  public function handle_status_change( $order_id, $new_status_slug ) {
      $table = $this->wpdb->prefix . 'nativa_pdv_pedidos';
      $order = $this->wpdb->get_row( $this->wpdb->prepare("SELECT * FROM $table WHERE id = %d", $order_id) );
      
      if ( ! $order ) return;

      // 1. Log de Status (Salva histórico)
      $this->log_status_change_sql( $order, $new_status_slug );

      // 2. Gatilho de Fechamento (Status 'Finalizado')
      if ( $new_status_slug === 'finalizado' ) {
          // A. Processamento Financeiro (Caixa + Fiscal)
          if ( ! class_exists('ND_Financial_Handler') ) {
              require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-financial-handler.php';
          }
          $finance = new ND_Financial_Handler();
          $finance->process_order_closing( $order_id );

          // B. Fidelidade (Crédito Tardio Seguro)
          $this->process_loyalty_award_sql( $order );
      }

      // 3. Revogação de Fidelidade (Status 'Cancelado')
      if ( $new_status_slug === 'cancelado' ) {
          $this->process_loyalty_revoke_sql( $order );
      }

      // 4. Notificação Push (Cliente)
      $this->send_push_notification_to_customer( $order, $new_status_slug );
  }

  // --- 2. FIDELIDADE (SQL AUDITÁVEL) ---

  private function process_loyalty_award_sql( $order ) {
      $meta = json_decode($order->metadados_json, true) ?: [];
      
      // Trava de segurança: Se já foi creditado, ignora
      if ( !empty($meta['loyalty_awarded']) ) return;

      $points_to_award = isset($meta['points_earned']) ? intval($meta['points_earned']) : 0;
      if ( $points_to_award <= 0 ) return; 

      $user_id = $order->cliente_id;
      if ( empty( $user_id ) ) return;

      // Atualiza Saldo do Usuário
      $current_points = (int) get_user_meta( $user_id, 'nativa_user_points', true );
      $new_balance = $current_points + $points_to_award;
      update_user_meta( $user_id, 'nativa_user_points', $new_balance );

      // Grava Extrato SQL
      $table_mov = $this->wpdb->prefix . 'nativa_fidelidade_movimentos';
      $this->wpdb->insert(
          $table_mov,
          [
              'cliente_id' => $user_id,
              'tipo'       => 'ganho',
              'pontos'     => $points_to_award,
              'referencia_id' => $order->id,
              'descricao'  => "Compra Pedido #{$order->id}",
              'saldo_apos_movimento' => $new_balance,
              'data_criacao' => current_time('mysql')
          ],
          ['%d', '%s', '%d', '%d', '%s', '%d', '%s']
      );

      // Marca como Creditado
      $meta['loyalty_awarded'] = true;
      $this->update_order_meta_json( $order->id, $meta );
  }

  private function process_loyalty_revoke_sql( $order ) {
      $meta = json_decode($order->metadados_json, true) ?: [];
      
      // Só estorna se TIVER sido creditado antes
      if ( empty($meta['loyalty_awarded']) ) return;

      $points_to_revoke = isset($meta['points_earned']) ? intval($meta['points_earned']) : 0;
      if ( $points_to_revoke <= 0 ) return;

      $user_id = $order->cliente_id;
      if ( empty( $user_id ) ) return;

      $current_points = (int) get_user_meta( $user_id, 'nativa_user_points', true );
      $new_balance = max(0, $current_points - $points_to_revoke);
      update_user_meta( $user_id, 'nativa_user_points', $new_balance );

      $table_mov = $this->wpdb->prefix . 'nativa_fidelidade_movimentos';
      $this->wpdb->insert(
          $table_mov,
          [
              'cliente_id' => $user_id,
              'tipo'       => 'estorno', 
              'pontos'     => -$points_to_revoke, 
              'referencia_id' => $order->id,
              'descricao'  => "Estorno Pedido #{$order->id} (Cancelado)",
              'saldo_apos_movimento' => $new_balance,
              'data_criacao' => current_time('mysql')
          ],
          ['%d', '%s', '%d', '%d', '%s', '%d', '%s']
      );

      $meta['loyalty_awarded'] = false;
      $this->update_order_meta_json( $order->id, $meta );
  }

  // --- 3. CRON PIX (SQL) ---

  public function process_pending_pix_orders_sql() {
    $table_pedidos = $this->wpdb->prefix . 'nativa_pdv_pedidos';
    $table_pagamentos = $this->wpdb->prefix . 'nativa_pdv_pagamentos';

    // Busca pedidos "aguardando-pagamento" criados nos últimos 30 min
    $sql_pending = "SELECT p.id, pg.gateway_data, pg.id as pagamento_id
                    FROM $table_pedidos p
                    JOIN $table_pagamentos pg ON p.id = pg.pedido_id
                    WHERE p.status = 'aguardando-pagamento'
                    AND pg.metodo_pagamento LIKE '%pix%'
                    AND pg.status = 'pendente'
                    AND p.data_criacao > DATE_SUB(NOW(), INTERVAL 30 MINUTE)";
    
    $pending_orders = $this->wpdb->get_results( $sql_pending );

    if ( empty( $pending_orders ) ) return;

    foreach ( $pending_orders as $row ) {
        $gw_data = json_decode($row->gateway_data, true);
        $txid = $gw_data['txid'] ?? null;

        if ( ! $txid ) continue;

        $charge_details = ND_Sicredi_Helper::get_pix_charge( $txid );

        if ( ! is_wp_error( $charge_details ) && isset( $charge_details['status'] ) && $charge_details['status'] === 'CONCLUIDA' ) {
            
            // Atualiza Pagamento e Pedido
            $this->wpdb->update( 
                $table_pagamentos, 
                ['status' => 'aprovado', 'data_pagamento' => current_time('mysql')], 
                ['id' => $row->pagamento_id] 
            );
            $this->wpdb->update( 
                $table_pedidos, 
                ['status' => 'recebido'], 
                ['id' => $row->id] 
            );

            // Dispara Automações
            $this->handle_status_change( $row->id, 'recebido' );
            $this->send_new_order_push_to_dashboard( $row->id );
        }
    }
  }

  // --- 4. PUSH NOTIFICATIONS ---

  public function send_new_order_push_to_dashboard( $order_id, $customer_name = null, $order_total = null ) {
      if ( $customer_name === null || $order_total === null ) {
          $table = $this->wpdb->prefix . 'nativa_pdv_pedidos';
          $row = $this->wpdb->get_row("SELECT total_geral, metadados_json FROM $table WHERE id = $order_id");
          if ($row) {
              $meta = json_decode($row->metadados_json, true);
              $customer_name = $meta['customer']['name'] ?? 'Cliente';
              $order_total = 'R$ ' . number_format(floatval($row->total_geral), 2, ',', '.');
          }
      }
      
      $this->send_onesignal_push(
          "Novo Pedido #{$order_id}",
          "{$customer_name} fez um pedido de {$order_total}. Toque para ver.",
          ['order_id' => $order_id, 'type' => 'new_order'],
          ['All'] // Segmento Admin
      );
  }

  private function send_push_notification_to_customer( $order, $new_status_slug ) {
      $status_ignorados = ['pending', 'pendente', 'aguardando-pagamento', 'auto-draft'];
      if ( in_array( $new_status_slug, $status_ignorados, true ) ) return;

      $user_id = $order->cliente_id;
      if ( empty( $user_id ) ) return;

      $player_ids = get_user_meta( $user_id, 'nativa_onesignal_player_ids', true );
      if ( empty( $player_ids ) || ! is_array( $player_ids ) ) return;

      $meta = json_decode($order->metadados_json, true);
      $customer_name = $meta['customer']['name'] ?? '';
      $first_name = explode( ' ', $customer_name )[0];
      $tipo_servico = $order->tipo_servico;

      $title = "Pedido #{$order->id}";
      $body  = "Atualização de status: {$new_status_slug}";

      switch ( $new_status_slug ) {
          case 'recebido':
              $title = "Pedido Recebido! 📋";
              $body  = "Olá {$first_name}, recebemos seu pedido e já vamos começar.";
              break;
          case 'preparando':
          case 'aceito':
              $title = "Em Preparo! 👨‍🍳";
              $body  = "A cozinha está preparando seu pedido com carinho.";
              break;
          case 'pronto':
              $title = ($tipo_servico === 'delivery') ? "Pronto para Entrega! 🛵" : "Pronto para Retirada! 🛍️";
              $body  = ($tipo_servico === 'delivery') ? "Aguardando entregador." : "Pode vir buscar no balcão.";
              break;
          case 'entregando':
          case 'enviado':
              $title = "Saiu para Entrega! 🏎️";
              $body  = "Seu pedido está a caminho.";
              break;
          case 'finalizado':
              $title = "Pedido Concluído ✅";
              $body  = "Obrigado pela preferência! Bom apetite.";
              break;
          case 'cancelado':
              $title = "Pedido Cancelado ⚠️";
              $body  = "Houve um problema com seu pedido. Toque para detalhes.";
              break;
      }

      $this->send_onesignal_push(
          $title,
          $body,
          ['order_id' => $order->id, 'type' => 'order_update'],
          null,
          $player_ids
      );
  }

  private function send_onesignal_push( $title, $body, $data = [], $segments = null, $player_ids = null ) {
      if ( empty($this->app_id) || empty($this->rest_key) ) return;

      $fields = array(
          'app_id' => $this->app_id,
          'headings' => array("en" => $title, "pt" => $title),
          'contents' => array("en" => $body, "pt" => $body),
          'data' => $data,
          'priority' => 10
      );

      if ( !empty($segments) ) {
          $fields['included_segments'] = $segments;
      } elseif ( !empty($player_ids) ) {
          $fields['include_player_ids'] = $player_ids;
      } else {
          return;
      }

      $args = array(
          'headers' => array(
              'Content-Type'  => 'application/json; charset=utf-8',
              'Authorization' => 'Basic ' . $this->rest_key
          ),
          'body'    => json_encode( $fields ),
          'timeout' => 5,
          'method'  => 'POST',
          'sslverify' => false 
      );

      wp_remote_post( 'https://onesignal.com/api/v1/notifications', $args );
  }

  // --- 5. HELPERS ---

  private function log_status_change_sql( $order, $status ) {
      $meta = json_decode($order->metadados_json, true) ?: [];
      $logs = $meta['status_log'] ?? [];
      
      // CRUCIAL: Salva como INT (segundos) para o JS entender corretamente
      $logs[] = [
          'status' => $status,
          'timestamp' => current_time('timestamp', true) 
      ];
      
      $meta['status_log'] = $logs;
      $this->update_order_meta_json( $order->id, $meta );
  }

  private function update_order_meta_json( $order_id, $meta_array ) {
      $this->wpdb->update(
          $this->wpdb->prefix . 'nativa_pdv_pedidos',
          ['metadados_json' => json_encode($meta_array, JSON_UNESCAPED_UNICODE)],
          ['id' => $order_id]
      );
  }
}