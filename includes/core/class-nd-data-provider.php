<?php
/**
 * Fornece todos os dados necessários para o frontend do aplicativo.
 *
 * ... (histórico de versões anterior) ...
 * OTIMIZAÇÃO DE MEMÓRIA: As consultas de produtos, combos e grupos de adicionais
 * agora buscam apenas os IDs ('fields' => 'ids') e, em seguida, recuperam os dados
 * necessários campo a campo. Isso reduz drasticamente o consumo de memória ao evitar
 * o carregamento de objetos de post completos (WP_Post) na memória.
 * ATUALIZAÇÃO (HOME BG): Adiciona a lógica para buscar imagens de fundo aleatórias para a página inicial.
 * ATUALIZAÇÃO (PWA TOGGLE): Passa a configuração 'require_pwa_install' para o frontend.
 * REATORAÇÃO (CPT Pagamentos): Substitui a leitura de 'payment_options' por uma
 * consulta dinâmica ao CPT 'nativa_pagamento'.
 * ATUALIZAÇÃO (Restrição Pagamento): Adiciona a 'paymentRestriction' (user_meta) aos dados do usuário.
 * ATUALIZAÇÃO (RASTREAMENTO): Adiciona IDs de tracking ao objeto global.
 */

if (!defined('ABSPATH')) {
    exit;
}

class ND_Data_Provider
{
    /**
     * Ponto de entrada para o endpoint da REST API /menu-data.
     * Utiliza cache para otimizar a entrega dos dados.
     */
    public function get_menu_data_rest() {
        $user_id = get_current_user_id();
        $cache_key = 'nativa_menu_data_cache_' . $user_id;
        $cached_data = get_transient($cache_key);

        if (false !== $cached_data) {
            return new WP_REST_Response($cached_data, 200);
        }

        $response_data = $this->_build_menu_data_array();

        set_transient($cache_key, $response_data, 12 * HOUR_IN_SECONDS);

        return new WP_REST_Response($response_data, 200);
    }

    /**
     * Gera e retorna o array completo de dados para wp_localize_script.
     */
    public function get_data_for_localize() {
        $options = get_option('nativa_delivery_options');
        // --- INÍCIO DA MODIFICAÇÃO (CPT Pagamentos) ---
        // A variável $payment_options foi removida daqui.
        // --- FIM DA MODIFICAÇÃO ---
        $whatsapp_options = get_option('nativa_delivery_whatsapp_options');
        $hours_options = get_option('nativa_delivery_hours_options');
        
        $service_status = ND_Hours_Helper::get_all_service_status();
        
        // Comentado para permitir cache de página (Nginx FastCGI) funcionar para visitantes
        /*
        if ( session_status() === PHP_SESSION_NONE ) {
            session_start();
        }
        */
        
        // Verifica login via WP ou Sessão (agora confiando mais no WP cookie devido ao cache)
        $user_is_logged_in = is_user_logged_in(); // || (isset($_SESSION['nativa_customer_logged_in']) && $_SESSION['nativa_customer_logged_in'] === true);
        
        $user_id = 0; // Padrão para visitante
        $payment_restriction_flag = null; // Padrão para visitante

        if ($user_is_logged_in) {
            $user_id = get_current_user_id();
            // Pega a flag de restrição do usuário logado
            $payment_restriction_flag = get_user_meta($user_id, '_nativa_payment_restriction', true) ?: null;
        }

        // --- FIM DA MODIFICAÇÃO (CPT Pagamentos) ---
        $require_pwa_install_setting = isset($options['require_pwa_install']) ? ($options['require_pwa_install'] === 'on') : false; // Converte 'on'/'off' para true/false
        // --- FIM DA MODIFICAÇÃO (PWA TOGGLE) ---

        $initial_data = [
            'debug_info' => [
                'timestamp' => current_time('mysql'),
                'source' => 'ND_Data_Provider::get_data_for_localize',
                'is_store_open_from_helper' => $service_status['is_store_open'] ?? 'NOT_SET',
            ],
            'ajax_url' => admin_url('admin-ajax.php'),
            'ajax_nonce' => wp_create_nonce('nativa_delivery_ajax_nonce'),
            'checkout_url' => get_permalink($options['checkout_page_id'] ?? 0),
            'whatsappNumber' => $whatsapp_options['whatsapp_number'] ?? '',
            'serviceStatus' => $service_status,
            'waitTimes' => ND_Wait_Time_Helper::calculate_wait_times(),
            'operatingHours' => $hours_options,
            // --- INÍCIO DA MODIFICAÇÃO (CPT Pagamentos) ---
            // Substitui a 'payment_options' estática pela consulta dinâmica
            'paymentMethods' => $this->_get_payment_methods_data(),
            // --- FIM DA MODIFICAÇÃO ---
            'logout_url' => wp_logout_url(home_url()),
            'currentUser' => [
                'is_logged_in' => $user_is_logged_in,
                'display_name' => ($user_is_logged_in) ? wp_get_current_user()->display_name : '',
                // --- INÍCIO DA MODIFICAÇÃO (Restrição Pagamento) ---
                'paymentRestriction' => $payment_restriction_flag,
                // --- FIM DA MODIFICAÇÃO ---
            ],
            'is_admin' => current_user_can('manage_options'),
            'homeBackgrounds' => [
                'open' => $this->_get_background_images('open'),
                'closed' => $this->_get_background_images('closed'),
            ],
            // --- INÍCIO DA MODIFICAÇÃO (PWA TOGGLE) ---
            'requirePwaInstall' => $require_pwa_install_setting, // Adiciona a configuração aqui
            // --- FIM DA MODIFICAÇÃO (PWA TOGGLE) ---
            
            // --- INÍCIO DA MODIFICAÇÃO: Dados de Rastreamento ---
            'googleAdsId' => $options['google_ads_id'] ?? '',
            'googleAdsLabel' => $options['google_ads_label'] ?? '',
            'metaPixelId' => $options['meta_pixel_id'] ?? '',
            // --- FIM DA MODIFICAÇÃO ---
        ];

        // Combina os dados gerais com os dados do menu.
        return array_merge($initial_data, $this->_build_menu_data_array());
    }
    
    /**
     * Escaneia um diretório e retorna as URLs das imagens encontradas.
     * @param string $status 'open' ou 'closed'.
     * @return array Lista de URLs de imagens.
     */
    private function _get_background_images($status) {
        $image_urls = [];
        $directory_path = NATIVADELIVERY_PLUGIN_DIR . 'assets/images/home/' . $status;
        $directory_url = NATIVADELIVERY_PLUGIN_URL . 'assets/images/home/' . $status;

        if (is_dir($directory_path)) {
            $files = scandir($directory_path);
            foreach ($files as $file) {
                $file_path = $directory_path . '/' . $file;
                $file_extension = pathinfo($file_path, PATHINFO_EXTENSION);
                if (is_file($file_path) && in_array(strtolower($file_extension), ['jpg', 'jpeg', 'png', 'webp'])) {
                    $image_urls[] = $directory_url . '/' . $file;
                }
            }
        }
        return $image_urls;
    }

    // --- INÍCIO DA MODIFICAÇÃO (CPT Pagamentos) ---
    /**
     * Busca os métodos de pagamento do CPT 'nativa_pagamento'.
     *
     * @return array Lista de métodos de pagamento configurados.
     */
    private function _get_payment_methods_data() {
        $payment_methods = [];
        $query_args = [
            'post_type' => 'nativa_pagamento',
            'posts_per_page' => -1,
            'post_status' => 'publish',
            'orderby' => 'menu_order', // Permite ordenação manual no admin
            'order' => 'ASC',
        ];

        $query = new WP_Query($query_args);

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                $disponibilidade = get_field('pagamento_disponibilidade', $post_id);

                // Só envia para o frontend se não estiver 'oculto'
                if ($disponibilidade !== 'oculto') {
                    $payment_methods[] = [
                        'slug' => get_post_field('post_name', $post_id), // Ex: 'dinheiro', 'pix-automatico'
                        'title' => get_the_title(), // Ex: "Dinheiro", "PIX"
                        'categoria' => get_field('pagamento_categoria', $post_id), // 'manual', 'pix_automatico', 'pix_manual'
                        'disponibilidade' => $disponibilidade, // 'disponivel', 'indisponivel'
                        'info_adicional' => get_field('pagamento_info_adicional', $post_id),
                        'exige_troco' => (bool) get_field('pagamento_exige_troco', $post_id),
                    ];
                }
            }
        }
        wp_reset_postdata();

        return $payment_methods;
    }
    // --- FIM DA MODIFICAÇÃO ---

    /**
     * Método privado que constrói o array de dados do menu (ponto único da verdade).
     */
    private function _build_menu_data_array() {
        $user_id = get_current_user_id();
        $categories_data        = $this->_get_categories_data();
        $items_data             = $this->_get_products_and_combos_data();
        $adicional_groups_data = $this->_get_adicional_groups_data();

        if ($user_id > 0) {
            $favorites_category = $this->_get_custom_favorites_for_user($user_id, $items_data['products']);
            if ($favorites_category) {
                array_unshift($categories_data, $favorites_category);
            }
        }

        return [
            'categories'      => $categories_data,
            'products'        => $items_data['products'],
            'adicionalGroups' => $adicional_groups_data,
            'comboSteps'      => $items_data['combo_steps'],
        ];
    }

    private function _get_categories_data() {
        $categories_data = [];
        $all_categories = get_terms([ 
            'taxonomy' => 'category', 
            'hide_empty' => true,
        ]);

        if (is_wp_error($all_categories) || empty($all_categories)) {
            return [];
        }

        usort($all_categories, function($a, $b) {
            $order_a = get_term_meta($a->term_id, 'ordem_categoria', true);
            $order_b = get_term_meta($b->term_id, 'ordem_categoria', true);

            $has_order_a = ($order_a !== '' && is_numeric($order_a));
            $has_order_b = ($order_b !== '' && is_numeric($order_b));

            if ($has_order_a && $has_order_b) {
                return (int)$order_a - (int)$order_b;
            } elseif ($has_order_a) {
                return -1;
            } elseif ($has_order_b) {
                return 1;
            } else {
                return strcmp($a->name, $b->name);
            }
        });

        foreach ($all_categories as $category) {
            $ordem = get_term_meta($category->term_id, 'ordem_categoria', true);
            $categories_data[] = [
                'id'        => $category->term_id,
                'name'      => $category->name,
                'slug'      => $category->slug,
                'image_url' => get_field('category_image', $category),
                'order'     => !empty($ordem) ? intval($ordem) : 999
            ];
        }

        return $categories_data;
    }

    private function _get_products_and_combos_data() {
        $products_data = [];
        $combo_steps_data = [];

        $items_query = new WP_Query([
            'post_type'      => ['nativa_produto', 'nativa_combo'],
            'posts_per_page' => -1,
            'post_status'    => 'publish',
            'fields'         => 'ids', // Otimização de Memória
        ]);

        if (!empty($items_query->posts)) {
            foreach ($items_query->posts as $item_id) {
                $post_type = get_post_type($item_id);
                
                $item_categories = get_the_terms($item_id, 'category');
                $category_name   = 'Outros';
                $category_slug   = 'outros';
                if (!empty($item_categories) && !is_wp_error($item_categories)) {
                    $category_name = $item_categories[0]->name;
                    $category_slug = $item_categories[0]->slug;
                }
                
                $tags_terms = get_the_terms($item_id, 'post_tag');
                $tag_names  = !empty($tags_terms) && !is_wp_error($tags_terms) ? wp_list_pluck($tags_terms, 'name') : [];
                
                $post_object = get_post($item_id);
                $content     = $post_object->post_content;
                $description = !empty($post_object->post_excerpt) ? $post_object->post_excerpt : $content;

                if ($post_type === 'nativa_produto') {
                    $products_data[] = [
                        'id'               => $item_id,
                        'name'             => html_entity_decode(get_the_title($item_id)),
                        'price'            => round((float) get_field('produto_preco', $item_id), 2),
                        'promo_price'      => round((float) get_field('produto_preco_promocional', $item_id), 2),
                        'description'      => $description,
                        'availability'     => get_field('produto_disponibilidade', $item_id),
                        'adicional_groups' => get_field('produto_grupos_adicionais', $item_id) ?: [],
                        'category_name'    => $category_name,
                        'category_slug'    => $category_slug,
                        'tags'             => $tag_names,
                        'is_combo'         => false,
                    ];
                } elseif ($post_type === 'nativa_combo') {
                    $combo_fields        = get_fields($item_id);
                    $base_price          = (float)($combo_fields['preco_base_manual'] ?? 0);
                    $discount            = (float)($combo_fields['desconto_em_valor'] ?? 0);
                    $final_price         = round($base_price - $discount, 2);

                    $products_data[] = [
                        'id'                  => $item_id,
                        'name'                => html_entity_decode(get_the_title($item_id)),
                        'price'               => $final_price,
                        'promo_price'         => 0,
                        'description'         => $description,
                        'availability'        => 'disponivel',
                        'category_name'       => $category_name,
                        'category_slug'       => $category_slug,
                        'tags'                => $tag_names,
                        'is_combo'            => true,
                        'preco_base_manual'   => $base_price,
                        'desconto_em_valor'   => $discount,
                        'preco_por_pessoa'    => (float)($combo_fields['preco_por_pessoa'] ?? 0),
                        'percentual_desconto' => $combo_fields['percentual_desconto'] ?? '',
                    ];

                    $combo_steps_data[$item_id]      = $combo_fields;
                    $combo_steps_data[$item_id]['id']    = $item_id;
                    $combo_steps_data[$item_id]['title'] = html_entity_decode(get_the_title($item_id));
                }
            }
        }

        return ['products' => $products_data, 'combo_steps' => $combo_steps_data];
    }

    private function _get_adicional_groups_data() {
        $adicional_groups_data = [];
        $adicional_query = new WP_Query([
            'post_type' => 'nativa_adic_grupo', 
            'posts_per_page' => -1, 
            'post_status' => 'publish',
            'fields' => 'ids' // Otimização de Memória
        ]);
        
        if (!empty($adicional_query->posts)) {
            foreach ($adicional_query->posts as $group_id) {
                $items_data = [];
                if (have_rows('grupo_adicional_itens', $group_id)) {
                    while(have_rows('grupo_adicional_itens', $group_id)) {
                        the_row();
                        $items_data[] = [
                            'item_nome'             => get_sub_field('item_nome'),
                            'item_preco'            => get_sub_field('item_preco'),
                            'item_disponibilidade'  => get_sub_field('item_disponibilidade'),
                        ];
                    }
                }

                $suggestion_mode = get_field('suggestion_mode', $group_id) ?: 'random';
                $suggestion_data = [];

                if ($suggestion_mode === 'defined_list') {
                    $textarea_content = get_field('suggestion_defined_list_textarea', $group_id);
                    $lines = explode("\n", str_replace("\r", "", $textarea_content));
                    foreach ($lines as $line) {
                        if (!empty(trim($line))) {
                            $suggestion_data[] = array_map('trim', explode(',', $line));
                        }
                    }
                } elseif ($suggestion_mode === 'best_sellers') {
                    $suggestion_data = ND_Stats_Helper::get_best_selling_addon_items($group_id);
                }

                $adicional_groups_data[$group_id] = [
                    'id'                       => $group_id,
                    'title'                    => get_the_title($group_id),
                    'nome_exibicao'            => get_field('grupo_adicional_nome_exibicao', $group_id),
                    'grupo_adicional_descricao' => get_field('grupo_adicional_descricao', $group_id),
                    'tipo_grupo'               => get_field('grupo_adicional_tipo_grupo', $group_id),
                    'minimo'                   => (int) get_field('grupo_adicional_min_selecao', $group_id),
                    'maximo'                   => (int) get_field('grupo_adicional_max_selecao', $group_id),
                    'minimo_gratis'            => (int) get_field('grupo_adicional_minimo_gratis', $group_id),
                    'preco_sabor_adicional'    => (float) get_field('grupo_adicional_preco_sabor_adicional', $group_id),
                    'permitir_quantidade_item' => get_field('grupo_adicional_permitir_quantidade_item', $group_id),
                    'grupo_disponibilidade'    => get_field('grupo_adicional_disponibilidade', $group_id),
                    'itens'                    => $items_data,
                    'suggestion_mode'          => $suggestion_mode,
                    'suggestion_data'          => $suggestion_data,
                ];
            }
        }

        return $adicional_groups_data;
    }

    private function _get_custom_favorites_for_user($user_id, &$all_products) {
        $favorites_data = get_user_meta($user_id, 'nativa_custom_favorites', true);
        if (empty($favorites_data) || !is_array($favorites_data)) return null;
        
        $formatted_favorites = [];
        foreach ($favorites_data as $key => $fav) {
            $base_product_id = $fav['base_product_id'] ?? null;
            if (!$base_product_id || get_post_status($base_product_id) !== 'publish') continue;
    
            $is_combo_favorite = isset($fav['is_combo_favorite']) && $fav['is_combo_favorite'];
            $total_price = 0;
    
            if ($is_combo_favorite) {
                $base_price = (float) get_field('preco_base_manual', $base_product_id);
                $discount = (float) get_field('desconto_em_valor', $base_product_id);
                $addons_total_for_combo = 0;
                $selections = (array) $fav['configuration']['selections'] ?? [];
    
                if (is_array($selections)) {
                    foreach ($selections as $selection) {
                        $addons_config = $selection['selectedAddons'] ?? [];
                        $addons_total_for_combo += ND_Cart_Helper::calculate_secure_addons_total($addons_config);
                    }
                }
                $total_price = ($base_price + $addons_total_for_combo) - $discount;
            } else {
                $promo_price = (float) get_field('produto_preco_promocional', $base_product_id);
                $regular_price = (float) get_field('produto_preco', $base_product_id);
                $base_price = ($promo_price > 0 && $promo_price < $regular_price) ? $promo_price : $regular_price;
                $addons_config = (array) $fav['configuration']['addons'] ?? [];
                $addons_price = ND_Cart_Helper::calculate_secure_addons_total($addons_config);
                $quantity = (int)($fav['configuration']['quantity'] ?? 1);
                $total_price = ($base_price + $addons_price) * $quantity;
            }
    
            $formatted_favorites[] = [
                'id' => $base_product_id,
                'favorite_id' => $key,
                'name' => html_entity_decode(get_the_title($base_product_id)),
                'nickname' => $fav['nickname'],
                'price' => $total_price,
                'category_slug' => 'meus-favoritos',
                'configuration' => $fav['configuration'],
                'is_favorite' => true,
                'is_combo_favorite' => $is_combo_favorite,
            ];
        }

        if (!empty($formatted_favorites)) {
            $all_products = array_merge($all_products, $formatted_favorites);
            return ['id' => -1, 'name' => 'Meus Favoritos', 'slug' => 'meus-favoritos', 'image_url' => 'https://pastelarianativa.com.br/wp-content/uploads/2025/08/avatar-favoritos.webp'];
        }
        return null;
    }
}