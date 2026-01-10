<?php
/**
 * Lida com as requisições AJAX para validação de cupons de desconto.
 * VERSÃO ATUALIZADA: Retorna o 'field_id' nos erros para feedback de UI no frontend.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Coupon_Ajax_Handler {

    public function __construct() {
        add_action("wp_ajax_nativa_delivery_validate_coupon", array($this, "validate_coupon_ajax"));
        add_action("wp_ajax_nopriv_nativa_delivery_validate_coupon", array($this, "validate_coupon_ajax"));
    }

    /**
     * Valida um cupom via AJAX e retorna o valor do desconto se for válido.
     */
    public function validate_coupon_ajax() {
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');

        $coupon_code = isset($_POST['coupon_code']) ? sanitize_text_field(strtoupper($_POST['coupon_code'])) : '';
        $cart_subtotal = isset($_POST['cart_subtotal']) ? floatval($_POST['cart_subtotal']) : 0;
        $customer_cpf = isset($_POST['customer_cpf']) ? preg_replace( '/[^0-9]/', '', sanitize_text_field($_POST['customer_cpf']) ) : '';

        if (empty($coupon_code)) {
            wp_send_json_error([
                'message' => 'Por favor, insira um código de cupom.',
                'field_id' => 'nativa-coupon-code' // <-- ATUALIZAÇÃO
            ]);
            return;
        }

        $coupon_post = get_page_by_title($coupon_code, OBJECT, 'nativa_cupom');

        if (!$coupon_post) {
            wp_send_json_error([
                'message' => 'Cupom inválido ou não encontrado.',
                'field_id' => 'nativa-coupon-code' // <-- ATUALIZAÇÃO
            ]);
            return;
        }

        $coupon_id = $coupon_post->ID;
        $is_active = get_field('cupom_status', $coupon_id);
        $expiry_date = get_field('data_de_validade', $coupon_id);
        $min_spend = floatval(get_field('gasto_minimo', $coupon_id));
        $usage_limit_type = get_field('limite_de_uso', $coupon_id);

        if (!$is_active) {
            wp_send_json_error(['message' => 'Este cupom não está mais ativo.']);
            return;
        }

        if ($expiry_date && current_time('Ymd') > $expiry_date) {
            wp_send_json_error(['message' => 'Este cupom expirou em ' . date('d/m/Y', strtotime($expiry_date)) . '.']);
            return;
        }
        
        if ($min_spend > 0 && $cart_subtotal < $min_spend) {
            wp_send_json_error(['message' => 'Este cupom é válido apenas para compras acima de R$ ' . number_format($min_spend, 2, ',', '.') . '.']);
            return;
        }

        // Lógica de verificação de limite de uso
        switch ($usage_limit_type) {
            case 'por_cliente':
                if (empty($customer_cpf)) {
                    wp_send_json_error([
                        'message' => 'É necessário preencher o CPF para validar este cupom.',
                        'field_id' => 'nativa-customer-cpf' // <-- ATUALIZAÇÃO
                    ]);
                    return;
                }
                $used_by_list = get_post_meta($coupon_id, '_usuarios_que_usaram', true);
                if (is_array($used_by_list) && in_array($customer_cpf, $used_by_list)) {
                    wp_send_json_error(['message' => 'Você já utilizou este cupom em um pedido anterior.']);
                    return;
                }
                break;

            case 'geral':
                $is_already_used = get_post_meta($coupon_id, '_cupom_foi_usado', true);
                if ($is_already_used) {
                    wp_send_json_error(['message' => 'Este cupom já atingiu seu limite total de uso.']);
                    return;
                }
                break;
        }

        $discount_type = get_field('tipo_desconto', $coupon_id);
        $discount_value = floatval(get_field('valor_desconto', $coupon_id));
        $discount_amount = 0;

        if ($discount_type === 'percentage') {
            $discount_amount = ($cart_subtotal * $discount_value) / 100;
        } else {
            $discount_amount = $discount_value;
        }

        $discount_amount = min($cart_subtotal, $discount_amount);

        wp_send_json_success([
            'message'         => 'Cupom aplicado com sucesso!',
            'discount_amount' => round($discount_amount, 2),
            'coupon_code'     => $coupon_code,
        ]);
    }
}