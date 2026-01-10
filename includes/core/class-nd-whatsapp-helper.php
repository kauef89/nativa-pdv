<?php
/**
 * Funções auxiliares para formatação e geração de URLs de WhatsApp.
 * ... (histórico de versões anterior) ...
 * VERSÃO REFINADA 13 (ATUAL): Remove o ID do pedido do cabeçalho, mantendo o cálculo de troco e valor a cobrar.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Whatsapp_Helper {

    /**
     * Formata um número de telefone no padrão (XX) XXXXX-XXXX.
     * @param string $phone_string O número de telefone apenas com dígitos.
     * @return string O número formatado ou o original em caso de falha.
     */
    private static function format_phone_for_whatsapp($phone_string) {
        if (empty($phone_string)) {
            return '';
        }
        $cleaned = preg_replace('/\D/', '', $phone_string);
        $length = strlen($cleaned);

        if ($length == 11) { // Celular com 9
            return sprintf('(%s) %s-%s',
                substr($cleaned, 0, 2),
                substr($cleaned, 2, 5),
                substr($cleaned, 7)
            );
        }
        if ($length == 10) { // Fixo ou celular antigo
            return sprintf('(%s) %s-%s',
                substr($cleaned, 0, 2),
                substr($cleaned, 2, 4),
                substr($cleaned, 6)
            );
        }
        
        return $phone_string; // Retorna o original se não corresponder
    }

    /**
     * Gera a URL de notificação para o cliente com base no status.
     */
    public static function generate_customer_notification_url( $order_id, $status_slug ) {
        $options = get_option( 'nativa_delivery_whatsapp_options' );
        $customer_phone = get_post_meta( $order_id, 'pedido_whatsapp_cliente', true );
        
        $modality = get_post_meta($order_id, 'pedido_tipo_servico', true);
        if ($status_slug === 'pronto' && $modality !== 'pickup') {
            return null;
        }

        $template_key = "message_template_{$status_slug}";
        $message_template = $options[$template_key] ?? '';

        if ( empty( $customer_phone ) || empty( $message_template ) ) {
            return null;
        }

        $customer_name = get_post_meta( $order_id, 'pedido_nome_cliente', true );
        $first_name = explode( ' ', $customer_name )[0];

        $message = str_replace( '{primeiro_nome}', $first_name, $message_template );
        $message = str_replace( '{id_pedido}', $order_id, $message );

        return self::generate_whatsapp_url( $customer_phone, $message );
    }

    /**
     * Gera a MENSAGEM para notificar a equipe de entrega.
     * @param int   $order_id   O ID do pedido.
     * @param array $order_fields Os campos do pedido já buscados.
     * @return string A mensagem de texto formatada para cópia.
     */
    public static function generate_delivery_team_notification_message( $order_id, $order_fields ) {
        
        if ( empty($order_fields) ) {
            return "Erro: Não foi possível carregar os dados do pedido #{$order_id} para gerar a mensagem.";
        }

        // Coleta de dados
        $customer_name = $order_fields['pedido_nome_cliente'] ?? 'N/A';
        $first_name = explode(' ', $customer_name)[0];
        $customer_phone = $order_fields['pedido_whatsapp_cliente'] ?? 'N/A';
        $formatted_phone = self::format_phone_for_whatsapp($customer_phone);

        $address_group = $order_fields['pedido_endereco'] ?? [];
        $street = urldecode($address_group['pedido_rua'] ?? '');
        $number = $address_group['pedido_numero'] ?? '';
        $bairro = $address_group['pedido_bairro'] ?? '';
        $complement = urldecode($address_group['pedido_complemento'] ?? '');
        $lat = $address_group['pedido_latitude'] ?? null;
        $lng = $address_group['pedido_longitude'] ?? null;
        
        $payment_method_slug = $order_fields['pedido_metodo_pagamento'] ?? 'N/A';
        $change_for = $order_fields['pedido_troco_para'] ?? '';
        $payment_received = get_post_meta($order_id, '_payment_received', true);
        
        // Recupera o total do pedido para exibição e cálculo de troco
        $order_total_val = floatval($order_fields['pedido_total_final'] ?? 0);
        $formatted_total = self::format_price_for_whatsapp($order_total_val);

        // --- Montagem do Cabeçalho (SEM o ID do Pedido) ---
        $header = "*" . strtoupper('NATIVA') . "* / *" . strtoupper($bairro) . "*";
        
        $client_info = "👋 " . $first_name . " - " . $formatted_phone;
        
        $address_line = $street . ", " . $number;
        if ($complement) {
            $address_line .= " - " . $complement;
        }
        $address_info = "🏠 " . $address_line;
        
        // --- Resolução do Nome do Método de Pagamento ---
        $payment_map = [
            'dinheiro' => 'Dinheiro', 'pix' => 'PIX', 'credito' => 'Crédito',
            'debito' => 'Débito', 'alelo' => 'Alelo',
            'pix-sicredi' => 'PIX', 'pix-manual' => 'PIX', 'pix-fallback' => 'PIX',
            'pix-manual-fallback' => 'PIX'
        ];

        // 1. Tenta mapa legado
        $payment_method_name = $payment_map[$payment_method_slug] ?? '';

        // 2. Se não achou, busca o Título do CPT nativa_pagamento
        if ( empty($payment_method_name) ) {
            $payment_posts = get_posts([
                'name'           => $payment_method_slug,
                'post_type'      => 'nativa_pagamento',
                'post_status'    => 'publish',
                'posts_per_page' => 1,
                'fields'         => 'ids'
            ]);
            
            if ( ! empty($payment_posts) ) {
                $payment_method_name = get_the_title($payment_posts[0]);
            } else {
                // 3. Fallback: Formata o slug (ex: cartao-de-credito -> Cartao De Credito)
                $payment_method_name = ucwords(str_replace(['-', '_'], ' ', $payment_method_slug));
            }
        }

        $payment_info = "";
        $is_pix_payment = in_array($payment_method_slug, ['pix', 'pix-sicredi', 'pix-manual', 'pix-fallback', 'pix-manual-fallback']);

        if ($payment_received || $is_pix_payment) {
            // Se já está pago, mostra o valor apenas como referência
            $payment_info = "💵 Pago (" . $formatted_total . ")";
        } else {
            // Se precisa cobrar, destaca o valor
            $payment_info = "💵 *COBRAR: " . $formatted_total . "*";
            $payment_info .= "\nForma: " . $payment_method_name;

            if ($payment_method_slug === 'dinheiro' && !empty($change_for) && floatval($change_for) > 0) {
                $troco_val_cliente = floatval($change_for);
                $troco_para_devolver = $troco_val_cliente - $order_total_val;
                
                $troco_text = self::format_price_for_whatsapp($troco_val_cliente);
                $devolver_text = self::format_price_for_whatsapp($troco_para_devolver);
                
                // Adiciona cálculo explícito para facilitar para o motoboy
                $payment_info .= "\n⚠️ Troco p/ " . $troco_text . " (*Devolver: " . $devolver_text . "*)";
            }
        }
        
        $message_parts = [$header, $client_info, $address_info, $payment_info];

        if ($lat && $lng) {
            $location_link = "https://www.google.com/maps?q={$lat},{$lng}";
            $message_parts[] = "🗺️ " . $location_link;
        }
        
        // Junção da mensagem final com quebra de linha simples
        $message = implode("\n", $message_parts);

        return trim($message);
    }

    /**
     * Gera a mensagem DETALHADA para o WhatsApp do restaurante no momento do checkout.
     */
    public static function generate_order_message_url( $order_id, $restaurant_phone ) {
        $modality_map = [
            'delivery' => 'ENTREGA',
            'pickup'   => 'RETIRADA',
            'table'    => 'NA MESA',
        ];
        $payment_map = [
            'dinheiro' => 'Dinheiro',
            'pix'      => 'PIX',
            'credito'  => 'Cartão de Crédito',
            'debito'   => 'Cartão de Débito',
            'alelo'    => 'Alelo Refeição'
        ];

        $modality = get_field('pedido_tipo_servico', $order_id) ?: 'N/A';
        $customer_name = get_field('pedido_nome_cliente', $order_id) ?: 'N/A';
        $customer_cpf = get_field('pedido_cpf_cliente', $order_id) ?: '';
        $customer_whatsapp = get_field('pedido_whatsapp_cliente', $order_id) ?: 'N/A';
        $subtotal = get_field('pedido_subtotal', $order_id) ?: 0;
        $delivery_fee = get_field('pedido_taxa_entrega', $order_id) ?: 0;
        $total = get_field('pedido_total_final', $order_id) ?: 0;
        $payment_method = get_field('pedido_metodo_pagamento', $order_id) ?: 'N/A';
        $change_for = get_field('pedido_troco_para', $order_id) ?: '';
        $cart_json = get_field('pedido_itens_json', $order_id) ?: '[]';
        $cart_items = json_decode($cart_json, true);

        $message  = "🔔 *--- NOVO PEDIDO RECEBIDO: #" . $order_id . " ---* 🔔\n\n";
        $message .= "*Tipo de Serviço:* " . ($modality_map[$modality] ?? $modality) . "\n\n";

        $message .= "*DADOS DO CLIENTE:*\n";
        $message .= "• Nome: " . $customer_name . "\n";
        if ( ! empty($customer_cpf) ) {
            $message .= "• CPF: " . $customer_cpf . "\n";
        }
        $message .= "• WhatsApp: " . self::format_phone_for_whatsapp($customer_whatsapp) . "\n\n";

        if ($modality === 'delivery') {
            $address_group = get_field('pedido_endereco', $order_id);
            $street = urldecode($address_group['pedido_rua'] ?? 'N/A');
            $number = $address_group['pedido_numero'] ?? 'S/N';
            $complement = urldecode($address_group['pedido_complemento'] ?? '');
            $bairro = $address_group['pedido_bairro'] ?? 'N/A';
            
            $message .= "*ENDEREÇO DE ENTREGA:*\n";
            $message .= "• Endereço: " . $street . ", " . $number . "\n";
            $message .= "• Bairro: " . $bairro . "\n";
            if ( ! empty($complement) ) {
                $message .= "• Complemento: " . $complement . "\n";
            }
            $message .= "\n";
        }

        $message .= "*RESUMO DO PEDIDO:*\n";
        if (is_array($cart_items) && !empty($cart_items)) {
            foreach($cart_items as $item) {
                if (isset($item['is_combo_discount']) && $item['is_combo_discount']) continue;

                $message .= "• " . ($item['quantity'] ?? 1) . "x " . ($item['product_name'] ?? $item['name']);
                if (isset($item['total_item_price'])) {
                    $message .= " - " . self::format_price_for_whatsapp($item['total_item_price']);
                }
                $message .= "\n";

                if (!empty($item['is_combo']) && !empty($item['selections']) && is_array($item['selections'])) {
                    foreach ($item['selections'] as $selection) {
                        $message .= "  ↳ " . ($selection['productName'] ?? 'Item selecionado') . "\n";
                        if (!empty($selection['selectedAddons']) && is_array($selection['selectedAddons'])) {
                            foreach ($selection['selectedAddons'] as $group) {
                                if (!empty($group['items']) && is_array($group['items'])) {
                                    foreach ($group['items'] as $addon) {
                                        $addon_qty = ($addon['itemQuantity'] ?? 1) > 1 ? ($addon['itemQuantity'] ?? 1) . 'x ' : '';
                                        $message .= "    - " . $addon_qty . ($addon['itemName'] ?? '') . "\n";
                                    }
                                }
                            }
                        }
                    }
                } elseif (isset($item['selected_addons']) && is_array($item['selected_addons'])) {
                    foreach($item['selected_addons'] as $group) {
                        if (isset($group['items']) && is_array($group['items'])) {
                            foreach($group['items'] as $addon) {
                                $addon_qty = ($addon['itemQuantity'] ?? 1) > 1 ? ($addon['itemQuantity'] ?? 1) . 'x ' : '';
                                $message .= "  ↳ " . $addon_qty . ($addon['itemName'] ?? '') . "\n";
                            }
                        }
                    }
                }
            }
        }
        $message .= "\n";

        $message .= "Subtotal: " . self::format_price_for_whatsapp($subtotal) . "\n";
        if ($delivery_fee > 0) {
            $message .= "Taxa de Entrega: " . self::format_price_for_whatsapp($delivery_fee) . "\n";
        }
        $message .= "*TOTAL DO PEDIDO: " . self::format_price_for_whatsapp($total) . "*\n\n";

        $message .= "*PAGAMENTO:*\n";
        $message .= "• Forma: " . ($payment_map[$payment_method] ?? $payment_method) . "\n";
        if ( ! empty($change_for) && is_numeric($change_for) && floatval($change_for) > 0) {
            $message .= "• Troco para: " . self::format_price_for_whatsapp($change_for) . "\n";
        }
        
        return self::generate_whatsapp_url($restaurant_phone, $message);
    }
    
    private static function format_price_for_whatsapp($price) {
        return 'R$ ' . number_format(floatval($price), 2, ',', '.');
    }

    private static function generate_whatsapp_url( $phone, $message ) {
        $phone_digits = preg_replace( '/[^0-9]/', '', $phone );
        if ( substr( $phone_digits, 0, 2 ) !== '55' ) {
            $phone_digits = '55' . $phone_digits;
        }
        return 'https://wa.me/' . $phone_digits . '?text=' . urlencode( $message );
    }
}