<?php
/**
 * Classe responsável pela lógica de criação de pedidos.
 * VERSÃO 5.9 (LOYALTY DEFER): Calcula pontos mas adia o crédito para o status 'finalizado'.
 */

if (!defined('ABSPATH')) { exit; }

class ND_Order_Creator
{
  private $data;
  private $wpdb;
  private $items_source = 'session'; // 'session' ou 'direct'

  public function __construct($checkout_data)
  {
    global $wpdb;
    $this->data = $checkout_data;
    $this->wpdb = $wpdb;

    if (isset($checkout_data['items']) && is_array($checkout_data['items']) && !empty($checkout_data['items'])) {
        $this->items_source = 'direct';
    }
  }

  public function create_order()
  {
    // 1. Validações
    $is_guest = !is_user_logged_in();
    if ($is_guest && isset($this->data['modality']) && $this->data['modality'] === 'delivery') {
      $address_data = $this->data['delivery_address'] ?? [];
      if(empty($address_data['bairro_name'])){
           return new WP_Error('address_incomplete', 'O bairro do convidado está incompleto.');
      }
    }

    // 2. Processamento dos Itens
    $cart_contents = [];
    $cart_total = 0;

    if ($this->items_source === 'direct') {
        $processed = $this->process_direct_items($this->data['items']);
        $cart_contents = $processed['contents'];
        $cart_total = $processed['total'];
    } else {
        $server_cart_data = ND_Cart_Helper::get_sanitized_cart_data();
        $cart_contents = $server_cart_data['contents'];
        $cart_total = $server_cart_data['total'];
    }

    if (empty($cart_contents)) {
      return new WP_Error('empty_cart', 'O carrinho está vazio ou os produtos são inválidos.');
    }

    // 3. Totais
    $this->data['totals']['subtotal'] = $cart_total;
    
    $secure_discount = $this->_calculate_secure_discount();
    if (is_wp_error($secure_discount)) return $secure_discount;
    $this->data['totals']['discount'] = $secure_discount;
    
    $delivery_fee = $this->data['totals']['delivery_fee'] ?? 0;
    $this->data['totals']['final_total'] = max(0, ($cart_total + $delivery_fee) - $secure_discount);

    // 4. Header
    $order_id = $this->insert_order_header();
    if (is_wp_error($order_id)) return $order_id;

    // 5. Itens
    $items_result = $this->insert_order_items($order_id, $cart_contents);
    if (is_wp_error($items_result)) {
        $this->wpdb->delete($this->wpdb->prefix . 'nativa_pdv_pedidos', ['id' => $order_id]);
        return $items_result;
    }

    // 6. Pagamentos
    $payment_result = $this->handle_payments_sql($order_id);
    if (is_wp_error($payment_result)) {
         $this->wpdb->update(
            $this->wpdb->prefix . 'nativa_pdv_pedidos',
            ['status' => 'cancelado'],
            ['id' => $order_id]
         );
         return $payment_result;
    }

    // --- Status Inicial ---
    $status_final = 'pendente';
    if ( isset($payment_result['payment_status']) ) {
        if ($payment_result['has_pix_auto']) {
             $status_final = ($payment_result['payment_status'] === 'aprovado') ? 'recebido' : 'aguardando-pagamento';
        } else {
             $status_final = 'recebido'; 
        }
    }

    $this->wpdb->update(
        $this->wpdb->prefix . 'nativa_pdv_pedidos',
        ['status' => $status_final],
        ['id' => $order_id]
    );

    // Automações (Push)
    if ($status_final === 'recebido' && class_exists('ND_Automations')) {
        $automations = new ND_Automations();
        $automations->handle_status_change($order_id, 'recebido');
        $automations->send_new_order_push_to_dashboard(
            $order_id,
            $this->data['customer']['name'],
            'R$ ' . number_format($this->data['totals']['final_total'], 2, ',', '.')
        );
    }

    // 7. Fidelidade (Apenas Cálculo e Registro de Potencial)
    // MUDANÇA: Não credita mais aqui. Apenas salva o valor que SERÁ ganho.
    $points_earned = $this->_calculate_loyalty_points();
    if ($points_earned > 0 && is_user_logged_in()) {
        // Salvamos 'points_earned' no metadata.
        // O ND_Automations lerá este valor quando o status virar 'finalizado'.
        $this->update_order_metadata($order_id, 'points_earned', $points_earned);
        
        // Removemos a flag 'loyalty_awarded' daqui, pois não foi awarded ainda.
    }

    if ($secure_discount > 0) {
      $this->process_coupon_usage();
    }

    if ($this->items_source === 'session') {
        ND_Cart_Helper::clear_cart();
    }

    if (is_array($payment_result)) {
      $payment_result['points_earned'] = $points_earned; // Apenas informativo para o frontend
      $payment_result['order_total'] = $this->data['totals']['final_total'];
      $payment_result['order_id'] = $order_id;
    }

    return $payment_result;
  }

  // --- MÉTODOS INTERNOS ---
  
  private function process_direct_items($items_raw) {
      $contents = [];
      $total = 0;

      foreach ($items_raw as $item) {
          $prod_id = $item['id'] ?? $item['product_id'] ?? null;
          if (!$prod_id) continue;

          $item_name = $item['name'] ?? '';
          if ( empty($item_name) || $item_name === 'Produto' || $item_name === 'Item' ) {
              $db_title = get_the_title($prod_id);
              $item_name = $db_title ?: 'Produto #' . $prod_id;
          }

          $price = 0;
          if (isset($item['price']) && is_numeric($item['price']) && floatval($item['price']) >= 0) {
              $price = floatval($item['price']);
          } else {
              $price = (float) get_field('produto_preco', $prod_id);
          }

          $qty = max(1, intval($item['qty'] ?? $item['quantity'] ?? 1));
          $total += $price * $qty;

          $contents[] = [
              'id' => $prod_id,
              'name' => $item_name,
              'qty' => $qty,
              'price' => $price,
              'options' => $item['options'] ?? [],
              'obs' => $item['obs'] ?? ''
          ];
      }
      return ['contents' => $contents, 'total' => $total];
  }

  private function insert_order_header()
  {
      $table_name = $this->wpdb->prefix . 'nativa_pdv_pedidos';
      
      $cliente_id = null;
      if (isset($this->data['user_id']) && $this->data['user_id'] > 0) {
          $cliente_id = $this->data['user_id'];
      } elseif (is_user_logged_in()) {
          $cliente_id = get_current_user_id();
      }
      
      $metadata = [
          'customer' => [
              'name' => $this->data['customer']['name'] ?? 'Cliente',
              'cpf'  => $this->data['customer']['cpf'] ?? '',
              'whatsapp' => $this->data['customer']['whatsapp'] ?? ''
          ],
          'address' => $this->data['modality'] === 'delivery' ? ($this->data['delivery_address'] ?? null) : null,
          'fees' => [
              'delivery_fee' => $this->data['totals']['delivery_fee'] ?? 0,
              'discount' => $this->data['totals']['discount'] ?? 0,
              'subtotal' => $this->data['totals']['subtotal']
          ],
          'coupon' => $this->data['applied_coupon_code'] ?? null,
          'order_key' => wp_generate_password(32, false),
          'status_log' => [
              ['status' => 'criado', 'timestamp' => current_time('mysql')]
          ]
      ];

      $result = $this->wpdb->insert(
          $table_name,
          [
              'cliente_id'   => $cliente_id,
              'status'       => 'pendente', 
              'tipo_servico' => $this->data['modality'],
              'total_geral'  => $this->data['totals']['final_total'],
              'origem'       => $this->items_source === 'direct' ? 'pdv' : 'consumer_app',
              'metadados_json' => json_encode($metadata, JSON_UNESCAPED_UNICODE)
          ],
          ['%d', '%s', '%s', '%f', '%s', '%s']
      );

      if ($result === false) return new WP_Error('db_insert_error', 'Erro SQL Header: ' . $this->wpdb->last_error);

      return $this->wpdb->insert_id;
  }

  private function insert_order_items($order_id, $items)
  {
      $table_items = $this->wpdb->prefix . 'nativa_pdv_itens_pedido';
      
      foreach ($items as $item) {
          $produto_id = $item['id'] ?? $item['product_id'] ?? null;
          
          if (empty($produto_id)) return new WP_Error('db_item_error', 'Item inválido: ID ausente.');

          $item_name = $item['name'] ?? '';
          if ( empty($item_name) || $item_name === 'Produto' || $item_name === 'Item' ) {
              $db_title = get_the_title($produto_id);
              $item_name = $db_title ?: 'Produto #' . $produto_id;
          }

          $qty = isset($item['qty']) ? $item['qty'] : ($item['quantity'] ?? 1);
          $qty = max(1, intval($qty));

          $price = 0;
          $subtotal = 0;
          if (isset($item['price'])) {
              $price = floatval($item['price']);
              $subtotal = $price * $qty;
          } elseif (isset($item['total_item_price'])) {
              $subtotal = floatval($item['total_item_price']);
              $price = $subtotal / $qty;
          }

          $adicionais = json_encode($item['options'] ?? $item['selected_addons'] ?? [], JSON_UNESCAPED_UNICODE);

          $result = $this->wpdb->insert(
              $table_items,
              [
                  'pedido_id'      => $order_id,
                  'produto_id'     => $produto_id, 
                  'nome_produto'   => substr($item_name, 0, 255),
                  'quantidade'     => $qty,
                  'preco_unitario' => $price,
                  'subtotal'       => $subtotal,
                  'adicionais_json'=> $adicionais ?: '[]',
                  'observacoes'    => $item['obs'] ?? ''
              ],
              ['%d', '%d', '%s', '%d', '%f', '%f', '%s', '%s']
          );

          if ($result === false) return new WP_Error('db_item_error', 'Erro SQL Item: ' . $this->wpdb->last_error);
      }
      return true;
  }

  private function handle_payments_sql($order_id)
  {
      $table_pagamentos = $this->wpdb->prefix . 'nativa_pdv_pagamentos';
      $payments = $this->data['payments'] ?? [];
      
      if (empty($payments)) {
          $payments = [['method' => 'dinheiro', 'value' => $this->data['totals']['final_total']]];
      }

      $primary_method = '';
      $max_val = -1;
      $has_pix_auto = false;
      $payment_status_global = 'aprovado';

      foreach ($payments as $pay) {
          $method_slug = $pay['method'];
          $val = floatval($pay['value']);
          if ($val <= 0 && count($payments) === 1) $val = $this->data['totals']['final_total'];

          if ($val > $max_val) {
              $max_val = $val;
              $primary_method = $method_slug;
          }

          $is_pix_auto = (strpos($method_slug, 'pix-sicredi') !== false || strpos($method_slug, 'pix-automatico') !== false);
          $payment_status_item = 'pendente'; 

          if ($is_pix_auto) {
              $has_pix_auto = true;
              $payment_status_global = 'pendente';
          }

          $gateway_data = [];
          if ($method_slug === 'dinheiro' && isset($pay['change_for'])) {
              $gateway_data['troco_para'] = $pay['change_for'];
          }

          $this->wpdb->insert(
              $table_pagamentos,
              [
                  'pedido_id' => $order_id,
                  'metodo_pagamento' => $method_slug,
                  'valor' => $val,
                  'status' => $payment_status_item,
                  'gateway_data' => json_encode($gateway_data)
              ],
              ['%d', '%s', '%f', '%s', '%s']
          );
      }

      if (!$has_pix_auto) {
          $payment_status_global = 'aprovado'; 
      }

      $order_row = $this->wpdb->get_row("SELECT metadados_json FROM {$this->wpdb->prefix}nativa_pdv_pedidos WHERE id = $order_id");
      $meta = json_decode($order_row->metadados_json, true);
      $order_key = $meta['order_key'] ?? '';
      $redirect_url = is_user_logged_in() ? home_url('/minha-conta/') : home_url('/obrigado/?order_key=' . $order_key);

      return [
          'success' => true,
          'order_id' => $order_id,
          'redirect_url' => $redirect_url,
          'primary_method' => $primary_method,
          'payment_status' => $payment_status_global,
          'has_pix_auto'   => $has_pix_auto
      ];
  }

  // --- Helpers Auxiliares ---

  private function update_order_metadata($order_id, $key, $value) {
      $row = $this->wpdb->get_row("SELECT metadados_json FROM {$this->wpdb->prefix}nativa_pdv_pedidos WHERE id = $order_id");
      if ($row) {
          $meta = json_decode($row->metadados_json, true) ?: [];
          $meta[$key] = $value;
          $this->wpdb->update(
              $this->wpdb->prefix . 'nativa_pdv_pedidos',
              ['metadados_json' => json_encode($meta, JSON_UNESCAPED_UNICODE)],
              ['id' => $order_id]
          );
      }
  }

  private function _calculate_secure_discount() {
      $coupon_code = $this->data['applied_coupon_code'] ?? null;
      if (empty($coupon_code)) return 0;

      $coupon_query = new WP_Query([
          'post_type' => 'nativa_cupom', 'title' => $coupon_code, 'post_status' => 'publish', 'posts_per_page' => 1, 'fields' => 'ids'
      ]);
      
      if (!$coupon_query->have_posts()) return new WP_Error('coupon_invalid', 'Cupom inválido.');
      
      $coupon_id = $coupon_query->posts[0];
      $cart_subtotal = $this->data['totals']['subtotal'];
      
      $discount_value = floatval(get_field('valor_desconto', $coupon_id));
      $discount_type = get_field('tipo_desconto', $coupon_id);
      
      $discount_amount = ($discount_type === 'percentage') ? ($cart_subtotal * $discount_value) / 100 : $discount_value;
      return round(min($cart_subtotal, $discount_amount), 2);
  }

  private function process_coupon_usage() {
       // Lógica de update no CPT do Cupom
  }

  private function _calculate_loyalty_points() {
      $points_per_real = get_field('points_per_real', 'option');
      if (!$points_per_real) return 0;
      return floor($this->data['totals']['subtotal'] * floatval($points_per_real));
  }
}