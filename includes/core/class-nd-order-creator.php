<?php
/**
 * Classe responsável pela lógica de criação de pedidos.
 * VERSÃO 3.0 (UNIFICAÇÃO): Suporte a Pagamentos Múltiplos e Estrutura de Dados do PDV.
 */

if (!defined('ABSPATH')) { exit; }

class ND_Order_Creator
{
  private $data;

  public function __construct($checkout_data)
  {
    $this->data = $checkout_data;
  }

  public function create_order()
  {
    $is_guest = !is_user_logged_in();
    if ($is_guest && isset($this->data['modality']) && $this->data['modality'] === 'delivery') {
      $address_data = $this->data['delivery_address'] ?? [];
      $bairro_name = $address_data['bairro_name'] ?? '';
      if(empty($bairro_name)){
           return new WP_Error('address_incomplete', 'O bairro do convidado está incompleto.');
      }
      $bairro_post = get_page_by_title($bairro_name, OBJECT, 'nativa_bairro');
      if (!$bairro_post) {
        return new WP_Error('address_validation_failed', 'O bairro informado não foi encontrado.');
      }
    }

    $server_cart_data = ND_Cart_Helper::get_sanitized_cart_data();

    if (empty($server_cart_data['contents'])) {
      return new WP_Error('empty_cart', 'O carrinho está vazio. Não é possível criar um pedido.');
    }

    $this->data['totals']['subtotal'] = $server_cart_data['total'];

    $secure_discount = $this->_calculate_secure_discount();
    if (is_wp_error($secure_discount)) {
      return $secure_discount;
    }
    $this->data['totals']['discount'] = $secure_discount;

    $this->data['totals']['final_total'] = max(0, ($this->data['totals']['subtotal'] + $this->data['totals']['delivery_fee']) - $secure_discount);

    $post_id = $this->create_order_post();
    if (is_wp_error($post_id)) {
      return $post_id;
    }

    // --- PROCESSAMENTO DE PAGAMENTOS MÚLTIPLOS ---
    $payment_result = $this->handle_payments_unified($post_id);
    
    if (is_wp_error($payment_result)) {
         wp_set_object_terms($post_id, 'cancelado', 'nativa_order_status');
         update_post_meta($post_id, '_creation_error', $payment_result->get_error_message());
         return $payment_result;
    }

    $points_earned = $this->populate_order_fields($post_id, $server_cart_data, $payment_result);

    $automations = new ND_Automations();
    $automations->send_new_order_push_to_dashboard(
        $post_id,
        $this->data['customer']['name'],
        'R$ ' . number_format($this->data['totals']['final_total'], 2, ',', '.')
    );

    if ($secure_discount > 0) {
      $this->process_coupon($post_id);
    }

    ND_Cart_Helper::clear_cart();

    if (is_array($payment_result)) {
      $payment_result['points_earned'] = $points_earned;
      $payment_result['order_total'] = $this->data['totals']['final_total'];
    }

    return $payment_result;
  }

  private function create_order_post()
  {
    $post_title = "Pedido de " . $this->data['customer']['name'] . " em " . current_time('d/m/Y H:i');

    $post_id = wp_insert_post(array(
      'post_title'  => $post_title,
      'post_type'  => 'nativa_pedido',
      'post_status' => 'publish',
       'post_author' => $this->data['user_id'] ?? 0,
    ));

    if (is_wp_error($post_id)) {
      return new WP_Error('order_creation_failed', 'Erro ao criar o registro do pedido.');
    }

    if (is_user_logged_in()) {
      update_post_meta($post_id, '_customer_user', get_current_user_id());
    }

    $order_key = wp_generate_password(32, false);
    update_post_meta($post_id, '_order_key', $order_key);

    return $post_id;
  }

  private function populate_order_fields($post_id, $server_cart_data, $payment_result)
  {
    update_field('pedido_nome_cliente', $this->data['customer']['name'], $post_id);
    update_field('pedido_cpf_cliente', $this->data['customer']['cpf'], $post_id);
    update_field('pedido_whatsapp_cliente', $this->data['customer']['whatsapp'], $post_id);

    update_field('pedido_tipo_servico', $this->data['modality'], $post_id);

    if ($this->data['modality'] === 'delivery') {
        $address_group_to_save = $this->data['delivery_address'];
        
        // Se vier vazio, tenta reconstruir (fallback para convidados/formulário bruto)
        if (empty($address_group_to_save) && !empty($this->data['raw_form_data'])) {
             // (Lógica simples de reconstrução se necessário, mas o ideal é vir pronto do Ajax)
             // ...
        }
        
        // Mapeia para os nomes de campo ACF corretos se vier do array genérico
        $acf_address = [
            'pedido_rua'        => $address_group_to_save['street'] ?? '',
            'pedido_numero'     => $address_group_to_save['number'] ?? '',
            'pedido_complemento'=> $address_group_to_save['complement'] ?? '',
            'pedido_bairro'     => $address_group_to_save['bairro_name'] ?? '',
            'pedido_latitude'   => $address_group_to_save['latitude'] ?? '',
            'pedido_longitude'  => $address_group_to_save['longitude'] ?? '',
        ];
        
        update_field('pedido_endereco', $acf_address, $post_id);
    }

    $cart_contents = $server_cart_data['contents'];
    update_field('pedido_itens_json', wp_json_encode($cart_contents, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE), $post_id);

    update_field('pedido_subtotal', $this->data['totals']['subtotal'], $post_id);
    update_field('pedido_taxa_entrega', $this->data['totals']['delivery_fee'], $post_id);
    update_field('pedido_desconto', $this->data['totals']['discount'], $post_id);
    update_field('pedido_total_final', $this->data['totals']['final_total'], $post_id);

    $points_earned = $this->_calculate_loyalty_points();
    update_field('pedido_pontos_ganhos', $points_earned, $post_id);

    // --- DADOS DE PAGAMENTO UNIFICADOS ---
    // Salva o JSON completo (Estrutura PDV) para auditoria e caixa
    update_post_meta($post_id, '_nativa_payment_info', $payment_result['full_payments_data']);
    
    // Salva o método "Principal" para compatibilidade com Dashboard Legado
    update_field('pedido_metodo_pagamento', $payment_result['primary_method'], $post_id);
    
    // Salva troco (apenas se o método principal for dinheiro)
    if ($payment_result['primary_method'] === 'dinheiro') {
        update_field('pedido_troco_para', $payment_result['change_for'], $post_id);
    }

    // Salva o cupom utilizado
    if (!empty($this->data['applied_coupon_code']) && $this->data['totals']['discount'] > 0) {
        update_field('pedido_cupom_utilizado', $this->data['applied_coupon_code'], $post_id);
    }

    // Status Inicial do Pedido
    $initial_status = $payment_result['initial_order_status'] ?? 'pendente';
    wp_set_object_terms($post_id, $initial_status, 'nativa_order_status');
    
    // Status Inicial do Pagamento (Meta) - Definido em handle_payments_unified, mas reforçamos aqui
    // update_post_meta($post_id, '_payment_status', ...); // Já foi salvo antes

    return $points_earned;
  }

  private function process_coupon($post_id)
  {
        $coupon_code = $this->data['applied_coupon_code'];
        if (empty($coupon_code)) return;

        $coupon_query = new WP_Query([
            'post_type' => 'nativa_cupom', 'title' => $coupon_code, 'post_status' => 'publish', 'posts_per_page' => 1, 'fields' => 'ids'
        ]);
        $coupon_post_id = $coupon_query->have_posts() ? $coupon_query->posts[0] : 0;

        if ($coupon_post_id) {
            $coupon_id = $coupon_post_id;
            $usage_limit_type = get_field('limite_de_uso', $coupon_id);

            if ($usage_limit_type === 'por_cliente') {
                $cpf_numerico = preg_replace('/[^0-9]/', '', $this->data['customer']['cpf']);
                if (!empty($cpf_numerico)) {
                    $used_by_list = get_post_meta($coupon_id, '_usuarios_que_usaram', true);
                    if (!is_array($used_by_list)) $used_by_list = [];
                    if (!in_array($cpf_numerico, $used_by_list)) {
                        $used_by_list[] = $cpf_numerico;
                        update_post_meta($coupon_id, '_usuarios_que_usaram', $used_by_list);
                    }
                }
            } elseif ($usage_limit_type === 'geral') {
                update_post_meta($coupon_id, '_cupom_foi_usado', true);
            }
        }
  }

  /**
   * Processa a lista de pagamentos (Múltiplos).
   * Define o status inicial e gera PIX se necessário.
   */
  private function handle_payments_unified($post_id) {
      $payments = $this->data['payments'] ?? [];
      $final_total = $this->data['totals']['final_total'];
      
      $processed_payments = [];
      $total_covered = 0;
      $primary_method = ''; // Método com maior valor ou primeiro
      $max_val = -1;
      $change_for = 0;
      
      $has_pix_auto = false;
      $pix_auto_value = 0;

      // Se payments estiver vazio (erro frontend), cria um dummy
      if (empty($payments)) {
          $payments = [['method' => 'dinheiro', 'value' => $final_total]]; // Fallback inseguro mas evita crash
      }

      foreach ($payments as $pay) {
          $method_slug = $pay['method'];
          $val = isset($pay['value']) && $pay['value'] > 0 ? floatval($pay['value']) : 0;
          
          // Se valor for 0, assume que cobre o restante (para single payment legacy)
          if ($val <= 0 && count($payments) === 1) {
              $val = $final_total;
          }
          
          $processed_payments[] = [
              'method' => $method_slug,
              'value'  => $val,
              'meta'   => $pay
          ];
          
          $total_covered += $val;
          
          // Define método principal (o de maior valor)
          if ($val > $max_val) {
              $max_val = $val;
              $primary_method = $method_slug;
              if ($method_slug === 'dinheiro') {
                  $change_for = $pay['change_for'] ?? 0;
              }
          }

          // Verifica se é PIX Automático (para gerar cobrança)
          $payment_post = get_page_by_path($method_slug, OBJECT, 'nativa_pagamento');
          if (!$payment_post) {
               // Fallback para slugs antigos
               if ($method_slug === 'pix-sicredi') $has_pix_auto = true;
          } else {
               $cat = get_field('pagamento_categoria', $payment_post->ID);
               if ($cat === 'pix_automatico') $has_pix_auto = true;
          }
          
          if ($has_pix_auto) $pix_auto_value += $val;
      }

      // Lógica de PIX Automático (Gera QR Code)
      // Se houver PIX Auto na lista, o status inicial será pendente de API
      
      $payment_status = 'manual_pending';
      $action = 'redirect';
      $redirect_url = home_url('/minha-conta/');
      $whatsapp_url = null;
      
      if ($has_pix_auto) {
          // Se tiver PIX Auto, gera a cobrança. 
          // Nota: A API Sicredi gera QR para um valor. Se for split, geramos para a parte do PIX.
          // Se for pagamento total PIX, usa final_total.
          $val_to_charge = $pix_auto_value > 0 ? $pix_auto_value : $final_total;

          $pix_result = ND_Sicredi_Helper::create_pix_charge(
              $post_id, 
              $val_to_charge, 
              $this->data['customer']['name'], 
              $this->data['customer']['cpf']
          );
          
          if (is_wp_error($pix_result)) {
              // Fallback se falhar
              $payment_status = 'failed_generation';
              update_post_meta($post_id, '_pix_api_fallback_reason', $pix_result->get_error_message());
              // Muda o método principal para fallback se ele era o PIX Auto
              if ($primary_method === 'pix-automatico' || $primary_method === 'pix-sicredi') {
                  $primary_method = 'pix-fallback';
              }
          } else {
              $payment_status = 'awaiting_api';
              update_post_meta($post_id, 'sicredi_pix_data', $pix_result);
              if (isset($pix_result['txid'])) {
                  update_post_meta($post_id, '_sicredi_pix_txid', $pix_result['txid']);
              }
          }
      } else {
          // Pagamento Manual (Dinheiro, Cartão, PIX Manual)
          $whatsapp_options = get_option('nativa_delivery_whatsapp_options');
          if (isset($whatsapp_options['whatsapp_communication_enabled']) && $whatsapp_options['whatsapp_communication_enabled'] === 'on') {
               $action = 'open_whatsapp_and_redirect';
               $whatsapp_url = ND_Whatsapp_Helper::generate_order_message_url($post_id, $whatsapp_options['whatsapp_number']);
          }
      }
      
      update_post_meta($post_id, '_payment_status', $payment_status);
      
      // Salva o link do boleto/checkout se houver (para gateways externos futuros)
      // ...

      $order_key = get_post_meta($post_id, '_order_key', true);
      if (!is_user_logged_in()) {
           $redirect_url = home_url('/obrigado/?order_key=' . $order_key);
      }

      return [
          'full_payments_data' => $processed_payments,
          'primary_method' => $primary_method,
          'change_for' => $change_for,
          'initial_order_status' => ($payment_status === 'awaiting_api') ? 'aguardando-pagamento' : 'pendente',
          'payment_status' => $payment_status,
          'action' => $action,
          'redirect_url' => $redirect_url,
          'whatsapp_url' => $whatsapp_url,
          'order_id' => $post_id,
          'order_key' => $order_key
      ];
  }

  private function _calculate_secure_discount()
  {
        $coupon_code = $this->data['applied_coupon_code'];
        if (empty($coupon_code) || $coupon_code === 'null' || is_null($coupon_code) || $coupon_code === 'NULL') {
            return 0;
        }

        $cart_subtotal = $this->data['totals']['subtotal'];
        $customer_cpf = preg_replace('/[^0-9]/', '', $this->data['customer']['cpf']);

        $coupon_query = new WP_Query([
            'post_type' => 'nativa_cupom', 'title' => $coupon_code, 'post_status' => 'publish', 'posts_per_page' => 1, 'fields' => 'ids'
        ]);
        $coupon_post_id = $coupon_query->have_posts() ? $coupon_query->posts[0] : 0;

        if ( !$coupon_post_id ) {
            return new WP_Error('coupon_invalid', 'Cupom "' . esc_html($coupon_code) . '" inválido ou não encontrado.');
        }

        $coupon_id = $coupon_post_id;
        $is_active = get_field('cupom_status', $coupon_id);
        if (!$is_active) return new WP_Error('coupon_inactive', 'Este cupom não está mais ativo.');

        $expiry_date = get_field('data_de_validade', $coupon_id);
        if ($expiry_date && current_time('Ymd') > $expiry_date) return new WP_Error('coupon_expired', 'Este cupom expirou.');

        $min_spend = floatval(get_field('gasto_minimo', $coupon_id));
        if ($min_spend > 0 && $cart_subtotal < $min_spend) return new WP_Error('coupon_min_spend', 'Mínimo não atingido.');

        $usage_limit_type = get_field('limite_de_uso', $coupon_id);
        switch ($usage_limit_type) {
            case 'por_cliente':
                if (empty($customer_cpf)) return new WP_Error('coupon_cpf_required', 'CPF necessário.');
                $used_by_list = get_post_meta($coupon_id, '_usuarios_que_usaram', true);
                if (is_array($used_by_list) && in_array($customer_cpf, $used_by_list)) return new WP_Error('coupon_already_used', 'Cupom já utilizado.');
                break;
            case 'geral':
                $already_used = get_post_meta($coupon_id, '_cupom_foi_usado', true);
                if ($already_used) return new WP_Error('coupon_limit_reached', 'Limite de uso atingido.');
                break;
        }

        $discount_type = get_field('tipo_desconto', $coupon_id);
        $discount_value = floatval(get_field('valor_desconto', $coupon_id));
        $discount_amount = ($discount_type === 'percentage') ? ($cart_subtotal * $discount_value) / 100 : $discount_value;

        return round(min($cart_subtotal, $discount_amount), 2);
  }

  private function _handle_manual_payment($post_id, $payment_method_slug) {
      // Método auxiliar legado, mantido caso alguma outra classe chame, 
      // mas a lógica principal foi movida para handle_payments_unified.
      return [];
  }

  private function _calculate_loyalty_points()
  {
        if (!function_exists('get_field')) return 0;
        $points_per_real = get_field('points_per_real', 'option');
        $points_per_real = $points_per_real ? floatval($points_per_real) : 0;
        if ($points_per_real <= 0) return 0;
        $subtotal = (float) $this->data['totals']['subtotal'];
        return floor($subtotal * $points_per_real);
  }
}