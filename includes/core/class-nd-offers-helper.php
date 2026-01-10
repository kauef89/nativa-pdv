<?php
/**
 * Helper para verificar e encontrar ofertas e recompensas de carrinho aplicáveis.
 * ... (histórico de versões anterior) ...
 * ATUALIZAÇÃO (Limites de Oferta): Adiciona a lógica de validação para o novo
 * campo de limite de usos por cliente ('limite_usos_cliente').
 * DEPURAÇÃO (SONDAS): Adiciona logs detalhados para rastrear a validação das ofertas.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Offers_Helper {

    /**
     * Analisa o carrinho e retorna a oferta de upsell válida de menor preço.
     */
    public static function get_applicable_offer( $cart_contents ) {
        error_log('[SONDA Ofertas] Iniciando get_applicable_offer. Conteúdo do carrinho recebido: ' . print_r($cart_contents, true)); // SONDA INICIAL

        if ( empty( $cart_contents ) ) {
            error_log('[SONDA Ofertas] Carrinho vazio. Nenhuma oferta aplicável.'); // SONDA
            return null;
        }

        // --- INÍCIO DA MODIFICAÇÃO DE PERFORMANCE ---
        $active_offers = get_transient( 'nativa_active_offers' );
        $cache_status = (false === $active_offers) ? 'MISS' : 'HIT'; // SONDA Cache Status
        error_log("[SONDA Ofertas] Status do cache 'nativa_active_offers': " . $cache_status); // SONDA

        if ( false === $active_offers ) {
            $args = array(
                'post_type' => 'nativa_oferta',
                'posts_per_page' => -1,
                'meta_key' => 'oferta_status',
                'meta_value' => '1', // Apenas ofertas com status ATIVO (valor '1' ou true)
            );
            error_log('[SONDA Ofertas] Buscando ofertas ativas no banco de dados...'); // SONDA
            $active_offers = get_posts( $args );
            set_transient( 'nativa_active_offers', $active_offers, 12 * HOUR_IN_SECONDS );
            error_log('[SONDA Ofertas] Encontradas ' . count($active_offers) . ' ofertas ativas no DB e salvas no cache.'); // SONDA
        }
        // --- FIM DA MODIFICAÇÃO DE PERFORMANCE ---

        if ( empty( $active_offers ) ) {
            error_log('[SONDA Ofertas] Nenhuma oferta ativa encontrada (cache ou DB).'); // SONDA
            return null;
        }
        error_log('[SONDA Ofertas] Total de ofertas ativas para processar: ' . count($active_offers)); // SONDA

        $cart_analysis = self::analyze_cart($cart_contents);
        error_log('[SONDA Ofertas] Análise do carrinho: ' . print_r($cart_analysis, true)); // SONDA Análise Carrinho
        $valid_offers = [];

        foreach ( $active_offers as $offer_post ) {
            $offer_id = $offer_post->ID;
            $offer_title = $offer_post->post_title;
            error_log("[SONDA Ofertas] ---- Processando Oferta ID: {$offer_id} ({$offer_title}) ----"); // SONDA Início Oferta

            $activation_rules = get_field('regras_de_ativacao', $offer_id);
            $exclusion_rules = get_field('regras_de_exclusao', $offer_id);
            $is_offer_valid = true;

            // Validação das Regras de Ativação
            if ( ! empty( $activation_rules ) ) {
                error_log("[SONDA Ofertas] Verificando regras de ATIVAÇÃO para a oferta {$offer_id}. Total de grupos de regras: " . count($activation_rules)); // SONDA
                foreach ($activation_rules as $index => $rule_group) {
                    $rule = $rule_group['regras'] ?? null; // Acessa o subcampo 'regras'
                    if (!$rule) {
                         error_log("[SONDA Ofertas] Grupo de regra de ativação #{$index} está malformado ou vazio para oferta {$offer_id}.");
                         continue; // Pula regra mal formada
                    }
                    error_log("[SONDA Ofertas] Avaliando regra de ativação #{$index}: " . print_r($rule, true)); // SONDA
                    if ( ! self::is_rule_satisfied( $rule, $cart_analysis ) ) {
                        $is_offer_valid = false;
                        error_log("[SONDA Ofertas] FALHA: Regra de ativação #{$index} NÃO satisfeita. Oferta {$offer_id} invalidada."); // SONDA FALHA ATIVAÇÃO
                        break; // Sai do loop de regras de ativação se uma falhar
                    } else {
                         error_log("[SONDA Ofertas] SUCESSO: Regra de ativação #{$index} satisfeita."); // SONDA SUCESSO ATIVAÇÃO
                    }
                }
            } else {
                 error_log("[SONDA Ofertas] Oferta {$offer_id} não possui regras de ativação."); // SONDA
            }

            if ( ! $is_offer_valid ) {
                error_log("[SONDA Ofertas] Fim da avaliação da Oferta {$offer_id}. Motivo: Falha nas regras de ativação."); // SONDA Fim Avaliação
                continue; // Pula para a próxima oferta se a ativação falhou
            }

            // Validação das Regras de Exclusão
            if ( ! empty( $exclusion_rules ) ) {
                 error_log("[SONDA Ofertas] Verificando regras de EXCLUSÃO para a oferta {$offer_id}. Total de grupos de regras: " . count($exclusion_rules)); // SONDA
                foreach ($exclusion_rules as $index => $rule_group) {
                    $rule = $rule_group['regras'] ?? null;
                     if (!$rule) {
                         error_log("[SONDA Ofertas] Grupo de regra de exclusão #{$index} está malformado ou vazio para oferta {$offer_id}.");
                         continue;
                    }
                    error_log("[SONDA Ofertas] Avaliando regra de exclusão #{$index}: " . print_r($rule, true)); // SONDA
                    if ( self::is_rule_satisfied( $rule, $cart_analysis ) ) {
                        $is_offer_valid = false;
                        error_log("[SONDA Ofertas] FALHA: Regra de exclusão #{$index} FOI satisfeita. Oferta {$offer_id} invalidada."); // SONDA FALHA EXCLUSÃO
                        break; // Sai do loop de regras de exclusão se uma for satisfeita
                    } else {
                        error_log("[SONDA Ofertas] SUCESSO: Regra de exclusão #{$index} NÃO satisfeita (bom)."); // SONDA SUCESSO EXCLUSÃO
                    }
                }
            } else {
                 error_log("[SONDA Ofertas] Oferta {$offer_id} não possui regras de exclusão."); // SONDA
            }

            if ( ! $is_offer_valid ) {
                error_log("[SONDA Ofertas] Fim da avaliação da Oferta {$offer_id}. Motivo: Falha nas regras de exclusão."); // SONDA Fim Avaliação
                continue; // Pula para a próxima oferta se a exclusão foi ativada
            }

            // Se passou por todas as regras...
            if ( $is_offer_valid ) {
                error_log("[SONDA Ofertas] Oferta {$offer_id} passou nas regras de ativação/exclusão. Verificando produto e limites..."); // SONDA Passou Regras

                $product_id = get_field('produto_ofertado', $offer_id);
                if (!$product_id) {
                     error_log("[SONDA Ofertas] FALHA: Produto ofertado não definido para a oferta {$offer_id}.");
                     continue;
                }
                error_log("[SONDA Ofertas] Produto Ofertado ID: {$product_id}"); // SONDA Produto ID

                // Verifica se o produto já está no carrinho
                if(isset($cart_analysis['product_ids'][$product_id])) {
                    error_log("[SONDA Ofertas] FALHA: Produto ofertado (ID: {$product_id}) já está no carrinho. Oferta {$offer_id} ignorada."); // SONDA Já no Carrinho
                    continue;
                }

                // Validação do Limite Global
                $limit = (int) get_field('limite_total_usos', $offer_id);
                 error_log("[SONDA Ofertas] Limite Global: {$limit}"); // SONDA Limite Global
                if ($limit > 0) {
                    $current_uses = (int) get_post_meta($offer_id, '_offer_uses', true);
                    error_log("[SONDA Ofertas] Usos Atuais (Global): {$current_uses}"); // SONDA Usos Atuais Global
                    if ($current_uses >= $limit) {
                        error_log("[SONDA Ofertas] FALHA: Limite global de usos ({$limit}) atingido para a oferta {$offer_id}."); // SONDA Limite Global Atingido
                        continue;
                    }
                }

                // Validação do Limite por Cliente
                $limit_per_user = (int) get_field('limite_usos_cliente', $offer_id);
                error_log("[SONDA Ofertas] Limite por Cliente: {$limit_per_user}"); // SONDA Limite Cliente
                if ( $limit_per_user > 0 && is_user_logged_in() ) {
                    $user_id = get_current_user_id();
                    $uses_by_user = get_post_meta( $offer_id, '_offer_uses_by_user', true );
                    if ( ! is_array( $uses_by_user ) ) $uses_by_user = [];
                    $current_user_uses = $uses_by_user[ $user_id ] ?? 0;
                     error_log("[SONDA Ofertas] Usos Atuais (Cliente ID: {$user_id}): {$current_user_uses}"); // SONDA Usos Atuais Cliente
                    if ( $current_user_uses >= $limit_per_user ) {
                        error_log("[SONDA Ofertas] FALHA: Limite de usos por cliente ({$limit_per_user}) atingido para a oferta {$offer_id}."); // SONDA Limite Cliente Atingido
                        continue;
                    }
                } else if ($limit_per_user > 0 && !is_user_logged_in()) {
                    error_log("[SONDA Ofertas] AVISO: Oferta {$offer_id} tem limite por cliente, mas o usuário não está logado. Limite ignorado."); // SONDA Limite Cliente Ignorado
                }

                // Se passou por todas as validações, adiciona aos válidos
                error_log("[SONDA Ofertas] SUCESSO: Oferta {$offer_id} é VÁLIDA. Adicionando à lista."); // SONDA Oferta Válida
                
                $original_price = (float) get_field('produto_preco', $product_id); // Busca preço do PRODUTO, não da oferta
                $promo_price_from_offer = (float) get_field('preco_promocional', $offer_id); // Preço PROMOCIONAL definido na OFERTA
                $category_image_url = '';
                $categories = get_the_terms($product_id, 'category');
                if ($categories && !is_wp_error($categories)) {
                    $category_image_url = get_field('category_image', 'category_' . $categories[0]->term_id);
                }

                $valid_offers[] = array(
                    'offer_id' => $offer_id,
                    'product_to_offer_id' => $product_id,
                    'product_name' => get_the_title($product_id),
                    'promo_price' => $promo_price_from_offer, // Preço da oferta
                    'original_price' => $original_price, // Preço original do produto
                    'category_image_url' => $category_image_url,
                    'offer_text' => get_field('texto_da_oferta', $offer_id),
                );
            } else {
                 error_log("[SONDA Ofertas] Fim da avaliação da Oferta {$offer_id}. Motivo: 'is_offer_valid' finalizou como false."); // SONDA Fim Avaliação Final
            }
        } // Fim do loop foreach $active_offers

        if (empty($valid_offers)) {
            error_log('[SONDA Ofertas] Nenhuma oferta válida encontrada após processar todas as regras e limites.'); // SONDA Nenhuma Válida
            return null;
        }

        // Ordena por preço promocional (mais barato primeiro)
        usort($valid_offers, function($a, $b) {
            return $a['promo_price'] <=> $b['promo_price'];
        });
        error_log('[SONDA Ofertas] Ofertas válidas encontradas: ' . print_r($valid_offers, true)); // SONDA Válidas Encontradas
        error_log('[SONDA Ofertas] Retornando a oferta mais barata: ID ' . $valid_offers[0]['offer_id']); // SONDA Retornando Oferta

        return $valid_offers[0]; // Retorna a oferta válida de menor preço
    }

    /**
     * Verifica e retorna a melhor recompensa de fidelidade disponível para o usuário.
     */
    public static function get_available_reward( $cart_contents ) {
        // [Código da função get_available_reward - sem alterações nesta etapa]
        if ( ! is_user_logged_in() ) {
            return null;
        }

        $user_id = get_current_user_id();
        $user_points = (int) get_user_meta( $user_id, 'nativa_user_points', true );

        if ( $user_points <= 0 ) {
            return null;
        }

        $loyalty_options = get_option('nativa_delivery_loyalty_options');
        $max_redemptions = isset($loyalty_options['max_redemptions_per_order']) ? (int) $loyalty_options['max_redemptions_per_order'] : 1;

        $redemptions_in_cart = 0;
        foreach ($cart_contents as $item) {
            if (isset($item['is_reward']) && $item['is_reward'] === true) {
                $redemptions_in_cart++;
            }
        }

        if ($redemptions_in_cart >= $max_redemptions) {
            return null;
        }

        $rewards_data = get_field('redemption_table', 'option');
        if ( ! is_array($rewards_data) || empty($rewards_data) ) {
            return null;
        }

        $affordable_rewards = [];
        $product_ids_in_cart = array_keys(self::analyze_cart($cart_contents)['product_ids']);

        foreach ($rewards_data as $reward) {
            $product_id = $reward['produto_resgatavel'] ?? 0;
            $points_cost = $reward['custo_em_pontos'] ?? 0;

            if ($user_points >= $points_cost && !in_array($product_id, $product_ids_in_cart)) {
                $affordable_rewards[] = [
                    'product_id'   => $product_id,
                    'product_name' => get_the_title($product_id),
                    'points_cost'  => (int) $points_cost,
                ];
            }
        }
        
        if (empty($affordable_rewards)) {
            return null;
        }

        usort($affordable_rewards, function($a, $b) {
            return $b['points_cost'] <=> $a['points_cost'];
        });

        return $affordable_rewards[0];
    }

    /**
     * Analisa e resume o conteúdo do carrinho para facilitar a verificação das regras.
     */
    private static function analyze_cart($cart_contents) {
        // [Código da função analyze_cart - sem alterações nesta etapa]
        $customer_type = 'visitante';
        $customer_cpf = '';
        $user_id = get_current_user_id();

        if ($user_id) {
            $customer_type = 'logado';
            $customer_cpf = get_user_meta($user_id, 'nativa_user_cpf', true);
            $order_count = count_user_posts($user_id, 'nativa_pedido', true);
            if ($order_count === 0) {
                $customer_type = 'novo';
            }
        }

        $analysis = [
            'subtotal' => 0,
            'total_items' => 0,
            'categories' => [],
            'tags' => [],
            'product_ids' => [],
            'customer_type' => $customer_type,
            'customer_cpf' => preg_replace('/[^0-9]/', '', $customer_cpf),
        ];

        foreach($cart_contents as $item) {
            // Verifica se o item é válido antes de processar
             if (!isset($item['quantity'], $item['product_id'], $item['total_item_price'])) {
                error_log('[SONDA Ofertas - analyze_cart] Item inválido encontrado no carrinho: ' . print_r($item, true));
                continue; // Pula item inválido
            }

            $quantity = intval($item['quantity']);
            $product_id = intval($item['product_id']);

             // Adiciona verificação para product_id válido
            if ($product_id <= 0) {
                error_log('[SONDA Ofertas - analyze_cart] Item com product_id inválido encontrado: ' . print_r($item, true));
                continue;
            }

            $analysis['subtotal'] += floatval($item['total_item_price']);
            $analysis['total_items'] += $quantity;
            $analysis['product_ids'][$product_id] = ($analysis['product_ids'][$product_id] ?? 0) + $quantity;
            $cats = get_the_terms($product_id, 'category');
            if($cats && !is_wp_error($cats)) {
                foreach($cats as $cat) {
                    $analysis['categories'][$cat->term_id] = ($analysis['categories'][$cat->term_id] ?? 0) + $quantity;
                }
            }
            // Adicionar lógica para tags se necessário no futuro
             // $tags = get_the_terms($product_id, 'post_tag');
            // if($tags && !is_wp_error($tags)) { ... }
        }
        return $analysis;
    }

    /**
     * Verifica se uma única regra é satisfeita pela análise do carrinho.
     */
    private static function is_rule_satisfied($rule, $cart_analysis) {
        // [Código da função is_rule_satisfied - sem alterações nesta etapa]
         if (!isset($rule['tipo_regra'])) {
            error_log('[SONDA Ofertas - is_rule_satisfied] Regra mal formada encontrada: ' . print_r($rule, true));
            return false; // Retorna false se a regra for inválida
        }

        $rule_type = $rule['tipo_regra'];
        $operator = $rule['operador'] ?? null; // Adiciona fallback para operador

        error_log("[SONDA Ofertas - is_rule_satisfied] Avaliando Regra: Tipo={$rule_type}, Operador={$operator}, Valor=" . ($rule['valor'] ?? 'N/A') . ", CatID=" . ($rule['valor_categoria'] ?? 'N/A') . ", TipoCliente=" . ($rule['valor_cliente'] ?? 'N/A')); // SONDA Regra Detalhada
        error_log("[SONDA Ofertas - is_rule_satisfied] Análise do Carrinho para comparação: " . print_r($cart_analysis, true)); // SONDA Análise Carrinho para Regra

        switch ($rule_type) {
            case 'subtotal_carrinho':
                $subject = $cart_analysis['subtotal'];
                $value = floatval($rule['valor'] ?? 0); // Adiciona fallback
                 if ($operator === 'maior_igual') return $subject >= $value;
                if ($operator === 'menor_igual') return $subject <= $value;
                break;

            case 'categoria_no_carrinho':
                $category_id = intval($rule['valor_categoria'] ?? 0); // Adiciona fallback
                 $subject = $cart_analysis['categories'][$category_id] ?? 0;
                $value = intval($rule['valor'] ?? 0); // Adiciona fallback
                 if ($operator === 'maior_igual') return $subject >= $value;
                if ($operator === 'menor_igual') return $subject <= $value;
                if ($operator === 'igual') return $subject == $value;
                 // Adiciona operadores de existência/não existência se necessário
                 // if ($operator === 'contem') return $subject > 0;
                 // if ($operator === 'nao_contem') return $subject == 0;
                break;
            
            // Adicionar 'tag_no_carrinho' se for implementado
            // case 'tag_no_carrinho': ... break;

            case 'tipo_cliente':
                $customer_type_rule = $rule['valor_cliente'] ?? null; // Adiciona fallback
                return $customer_type_rule && ($cart_analysis['customer_type'] === $customer_type_rule);

            case 'lista_cpf':
                $allowed_cpfs_raw = $rule['lista_cpf'] ?? '';
                if (empty($cart_analysis['customer_cpf'])) return false; // Se o cliente não tem CPF, não pode estar na lista
                $allowed_cpfs = array_map('trim', explode("\n", str_replace("\r", "", $allowed_cpfs_raw)));
                return in_array($cart_analysis['customer_cpf'], $allowed_cpfs);

            default:
                 error_log("[SONDA Ofertas - is_rule_satisfied] Tipo de regra desconhecido: {$rule_type}"); // SONDA Tipo Desconhecido
                 break;
        }

        error_log("[SONDA Ofertas - is_rule_satisfied] Regra {$rule_type} com operador {$operator} resultou em FALSE (ou não aplicável)."); // SONDA Resultado False
        return false;
    }
}

?>
