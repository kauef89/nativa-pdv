<?php
/**
 * Funções auxiliares para manipulação do carrinho.
 * ... (histórico de versões anterior) ...
 * CORREÇÃO (Cálculo de Preço v3): Lógica aditiva para sabores.
 * CORREÇÃO (Oferta Preço Backend): Usa preço da oferta no cálculo seguro.
 * CORREÇÃO CRÍTICA (Limite de Cookie): Altera o armazenamento do carrinho de Cookies (limite 4KB)
 * para Transients do WordPress (Banco de Dados), usando apenas um ID de sessão no cookie.
 * Isso permite carrinhos virtualmente ilimitados.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Cart_Helper {

    // Nome do cookie antigo (para migração)
    private static $legacy_cookie_name = 'nativa_delivery_cart';
    // Nome do novo cookie que guarda apenas o ID
    private static $session_cookie_name = 'nativa_cart_session_id';
    // Prefixo para salvar no banco de dados (wp_options)
    private static $transient_prefix = 'nd_cart_data_';

    /**
     * Recupera o ID da sessão do carrinho atual ou gera um novo.
     */
    private static function get_or_create_session_id() {
        if ( isset( $_COOKIE[ self::$session_cookie_name ] ) && ! empty( $_COOKIE[ self::$session_cookie_name ] ) ) {
            return sanitize_text_field( wp_unslash( $_COOKIE[ self::$session_cookie_name ] ) );
        }

        // Gera um novo ID único
        $session_id = md5( uniqid( 'nd_cart_', true ) . wp_rand() );
        
        // Define o cookie apenas com o ID (super leve)
        self::set_session_cookie( $session_id );
        
        return $session_id;
    }

    /**
     * Define o cookie de sessão.
     */
    private static function set_session_cookie( $session_id ) {
        $expiration = time() + ( 48 * HOUR_IN_SECONDS ); // 48 horas de sessão
        
        setcookie( self::$session_cookie_name, $session_id, [
            'expires' => $expiration,
            'path' => COOKIEPATH ?: '/',
            'domain' => COOKIE_DOMAIN ?: '',
            'secure' => is_ssl(),
            'httponly' => true,
            'samesite' => 'Lax'
        ] );

        $_COOKIE[self::$session_cookie_name] = $session_id;
    }

    /**
     * Retorna o conteúdo do carrinho.
     * Tenta ler do Transient (DB). Se não achar, tenta migrar do cookie antigo.
     */
    public static function get_cart_contents() {
        // 1. Tenta buscar pelo ID de sessão (Método Novo - DB)
        if ( isset( $_COOKIE[ self::$session_cookie_name ] ) ) {
            $session_id = sanitize_text_field( wp_unslash( $_COOKIE[ self::$session_cookie_name ] ) );
            $cart_data = get_transient( self::$transient_prefix . $session_id );
            
            if ( false !== $cart_data && is_array( $cart_data ) ) {
                return $cart_data;
            }
        }

        // 2. Fallback / Migração: Tenta ler o cookie antigo (JSON gigante)
        if ( isset( $_COOKIE[ self::$legacy_cookie_name ] ) && ! empty( $_COOKIE[ self::$legacy_cookie_name ] ) ) {
            $legacy_data = json_decode( wp_unslash( $_COOKIE[ self::$legacy_cookie_name ] ), true );
            
            if ( json_last_error() === JSON_ERROR_NONE && is_array( $legacy_data ) ) {
                // Migra imediatamente para o novo sistema
                self::set_cart_contents( $legacy_data );
                
                // Apaga o cookie antigo para limpar o navegador do usuário
                setcookie( self::$legacy_cookie_name, '', time() - 3600, COOKIEPATH ?: '/', COOKIE_DOMAIN ?: '', is_ssl(), true );
                unset( $_COOKIE[self::$legacy_cookie_name] );
                
                return $legacy_data;
            } else {
                 error_log('Nativa Delivery Cart Helper: Falha ao decodificar cookie legado. Limpando.');
                 self::clear_cart();
                 return array();
            }
        }

        return array();
    }

    /**
     * Salva o conteúdo do carrinho no Banco de Dados (Transient).
     */
    private static function set_cart_contents( $cart_data ) {
        $session_id = self::get_or_create_session_id();
        
        // Salva no banco por 48 horas (mesma duração do cookie de sessão)
        set_transient( self::$transient_prefix . $session_id, $cart_data, 48 * HOUR_IN_SECONDS );
    }

    /**
     * Adiciona ou atualiza um item no carrinho.
     * Recalcula o preço seguro do item ANTES de salvar.
     * @param array $item_data Dados do item a ser adicionado/atualizado.
     * @return string A chave do item no carrinho.
     */
     public static function add_item( $item_data ) {
        $cart = self::get_cart_contents();
        $existing_cart_item_key = isset( $item_data['cart_item_key'] ) ? sanitize_text_field( $item_data['cart_item_key'] ) : null;

        // Calcula o preço seguro
        $secure_price = self::calculate_secure_item_price($item_data);
        $item_data['total_item_price'] = $secure_price; 
         
         // Preserva o preço original se for uma oferta
         if (isset($item_data['is_offer_item']) && $item_data['is_offer_item'] && !isset($item_data['original_price'])) {
              $product_id = absint($item_data['product_id']);
              $regular_price = (float) get_field( 'produto_preco', $product_id );
              $item_data['original_price'] = $regular_price;
         }

        if ( $existing_cart_item_key && isset( $cart[ $existing_cart_item_key ] ) ) {
            // Atualizando item existente
            $cart_item_key = $existing_cart_item_key;
            $cart[ $cart_item_key ] = array_merge( $cart[ $cart_item_key ], $item_data );
        } else {
            // Adicionando novo item
            $unique_id_parts = [
                $item_data['product_id'],
                md5( wp_json_encode( $item_data['selected_addons'] ?? [] ) ),
                md5( wp_json_encode( $item_data['selections'] ?? [] ) ),
                microtime( true )
            ];
            $cart_item_key = md5( implode( '_', $unique_id_parts ) );
            $item_data['cart_item_key'] = $cart_item_key;

            $cart[ $cart_item_key ] = $item_data;
        }

        self::set_cart_contents( $cart );
        return $cart_item_key;
    }


    public static function update_item_quantity( $cart_item_key, $new_quantity ) {
        $cart = self::get_cart_contents();

        if ( isset( $cart[ $cart_item_key ] ) ) {
            $new_quantity = absint( $new_quantity );

            if ( $new_quantity <= 0 ) {
                unset( $cart[ $cart_item_key ] );
            } else {
                $cart[ $cart_item_key ]['quantity'] = $new_quantity;
                $cart[ $cart_item_key ]['total_item_price'] = self::calculate_secure_item_price($cart[ $cart_item_key ]);
            }
            self::set_cart_contents( $cart );
            return true;
        }
        return false;
    }

    public static function remove_item( $cart_item_key ) {
        $cart = self::get_cart_contents();
        if ( isset( $cart[ $cart_item_key ] ) ) {
            unset( $cart[ $cart_item_key ] );
            self::set_cart_contents( $cart );
            return true;
        }
        return false;
    }

    public static function get_cart_total() {
        $total = 0;
        $cart = self::get_sanitized_cart_data();
        foreach ( $cart['contents'] as $item ) {
            $total += isset( $item['total_item_price'] ) ? floatval( $item['total_item_price'] ) : 0;
        }
        return round( $total, 2 );
    }

    public static function calculate_secure_cart_total() {
        $sanitized_cart = self::get_sanitized_cart_data();
        return $sanitized_cart['total'];
    }

    public static function calculate_secure_item_price( $item ) {
        $item_unit_price = 0.0;
        $quantity = isset($item['quantity']) ? absint($item['quantity']) : 1;

        if (empty($quantity)) {
            return 0.0;
        }

        $is_reward = isset($item['is_reward']) && $item['is_reward'];
        $is_offer_item = isset($item['is_offer_item']) && $item['is_offer_item'];

        if ($is_reward) {
            return 0.0;
        }

        if ( isset($item['is_combo']) && $item['is_combo'] ) {
            $combo_id = absint($item['combo_id']);
            $base_price = (float) get_field('preco_base_manual', $combo_id);
            $discount = (float) get_field('desconto_em_valor', $combo_id);
            $addons_total_for_combo = 0;

            if (isset($item['selections']) && is_array($item['selections'])) {
                $selections_copy = $item['selections'];
                foreach ($selections_copy as &$selection) {
                    if (isset($selection['selectedAddons'])) {
                        $addons_total_for_combo += self::calculate_secure_addons_total($selection['selectedAddons']);
                    }
                }
                unset($selection);
                 $item['selections'] = $selections_copy;
            }
            $item_unit_price = ($base_price + $addons_total_for_combo) - $discount;

        } elseif ( isset( $item['product_id'] ) ) {
            $product_id = absint($item['product_id']);
            $product_base_price = 0;

            if ($is_offer_item) {
                 if (isset($item['total_item_price']) && $item['total_item_price'] == 0 && isset($item['original_price'])) {
                      $product_base_price = 0;
                 } else {
                     $current_cart_for_offer = self::get_cart_contents();
                     $applicable_offer = ND_Offers_Helper::get_applicable_offer($current_cart_for_offer);
                     if ($applicable_offer && $applicable_offer['product_to_offer_id'] == $product_id) {
                         $product_base_price = (float) $applicable_offer['promo_price'];
                         if (!isset($item['original_price'])) {
                            $item['original_price'] = (float) $applicable_offer['original_price'];
                         }
                     } else {
                         error_log("Nativa Delivery Cart Helper: Oferta não aplicável para ID: $product_id. Usando preço normal.");
                         $promo_price = (float) get_field( 'produto_preco_promocional', $product_id );
                         $regular_price = (float) get_field( 'produto_preco', $product_id );
                         $product_base_price = ( $promo_price > 0 && $promo_price < $regular_price ) ? $promo_price : $regular_price;
                     }
                 }
            } else {
                $promo_price = (float) get_field( 'produto_preco_promocional', $product_id );
                $regular_price = (float) get_field( 'produto_preco', $product_id );
                $product_base_price = ( $promo_price > 0 && $promo_price < $regular_price ) ? $promo_price : $regular_price;
            }

            $addons_total = 0;
            if (isset($item['selected_addons'])) {
                $addons_copy = $item['selected_addons'];
                $addons_total = self::calculate_secure_addons_total($addons_copy);
                $item['selected_addons'] = $addons_copy;
            }
            $item_unit_price = $product_base_price + $addons_total;
        }

        return round( $item_unit_price * $quantity, 2 );
    }

    public static function calculate_secure_addons_total( &$item_addons ) {
        if ( ! is_array( $item_addons ) ) {
            return 0.0;
        }

        $total_addons_price = 0.0;

        foreach ( $item_addons as $group_id => &$group ) {
            $group_post = get_post(absint($group_id));
             if (!$group_post || $group_post->post_type !== 'nativa_adic_grupo') {
                 continue;
             }
             $group_data = get_fields($group_id);

            if (!$group_data || !isset($group['items']) || !is_array($group['items'])) {
                continue;
            }

            $all_group_items_from_db = $group_data['grupo_adicional_itens'] ?? [];
            if (!is_array($all_group_items_from_db)) $all_group_items_from_db = [];

            $is_sabor_group = ($group_data['grupo_adicional_tipo_grupo'] ?? 'adicional') === 'sabor';

            if ($is_sabor_group) {
                $min_gratis = (int) ($group_data['grupo_adicional_minimo_gratis'] ?? 0);
                $preco_adicional_extra = (float) ($group_data['grupo_adicional_preco_sabor_adicional'] ?? 0);

                $selected_items_with_price = [];
                foreach ($group['items'] as $addon_index => $addon_data) {
                    if (isset($all_group_items_from_db[$addon_index])) {
                        $secure_price = (float) ($all_group_items_from_db[$addon_index]['item_preco'] ?? 0);
                        $selected_items_with_price[] = [
                            'price' => $secure_price,
                            'index' => $addon_index,
                        ];
                    }
                }

                usort($selected_items_with_price, function($a, $b) {
                    return $b['price'] <=> $a['price'];
                });

                $group_total_price = 0;
                $item_counter = 0;

                foreach ($selected_items_with_price as $item) {
                    $item_counter++;
                    $final_item_price = $item['price'];

                    if ($item_counter > $min_gratis) {
                        $final_item_price += $preco_adicional_extra;
                    }

                    $group_total_price += $final_item_price;

                    $original_index = $item['index'];
                    if (isset($group['items'][$original_index])) {
                        $group['items'][$original_index]['final_cost'] = $final_item_price;
                         $group['items'][$original_index]['itemPrice'] = $item['price'];
                    }
                }
                $total_addons_price += $group_total_price;

            } else {
                foreach ( $group['items'] as $addon_index => &$addon ) {
                    if (isset($all_group_items_from_db[$addon_index])) {
                        $secure_addon_price = (float) ($all_group_items_from_db[$addon_index]['item_preco'] ?? 0);
                        $quantity = intval($addon['itemQuantity'] ?? 1);
                        $total_addons_price += $secure_addon_price * $quantity;

                        $addon['itemPrice'] = $secure_addon_price;
                        $addon['final_cost'] = $secure_addon_price;
                    }
                }
                unset($addon);
            }
        }
        unset($group);

        return $total_addons_price;
    }


    public static function get_sanitized_cart_data() {
        $cart_contents = self::get_cart_contents();
        $sanitized_contents = [];
        $secure_total = 0.0;

        if ( empty( $cart_contents ) ) {
            return ['contents' => [], 'total' => 0];
        }

        foreach ( $cart_contents as $key => $item ) {
            if (!is_array($item)) {
                continue;
            }
            $secure_item_price = self::calculate_secure_item_price($item);
            $item['total_item_price'] = $secure_item_price;
            $sanitized_contents[$key] = $item;
            $secure_total += floatval($secure_item_price);
        }

        return ['contents' => $sanitized_contents, 'total' => round($secure_total, 2)];
    }


    public static function get_cart_item_count() {
        $count = 0;
        $cart = self::get_cart_contents();
        foreach ( $cart as $item ) {
            $count += ( isset( $item['quantity'] ) ? absint( $item['quantity'] ) : 0 );
        }
        return $count;
    }

    /**
     * Limpa o carrinho (apaga Transient e Cookie de Sessão).
     */
    public static function clear_cart() {
        // Apaga o transient atual
        if ( isset( $_COOKIE[ self::$session_cookie_name ] ) ) {
            $session_id = sanitize_text_field( wp_unslash( $_COOKIE[ self::$session_cookie_name ] ) );
            delete_transient( self::$transient_prefix . $session_id );
            
            // Remove o cookie de sessão
            setcookie( self::$session_cookie_name, '', time() - 3600, COOKIEPATH ?: '/', COOKIE_DOMAIN ?: '', is_ssl(), true );
            unset( $_COOKIE[self::$session_cookie_name] );
        }
        
        // Garante que o cookie legado também morra, se existir
        if ( isset( $_COOKIE[ self::$legacy_cookie_name ] ) ) {
             setcookie( self::$legacy_cookie_name, '', time() - 3600, COOKIEPATH ?: '/', COOKIE_DOMAIN ?: '', is_ssl(), true );
             unset( $_COOKIE[self::$legacy_cookie_name] );
        }
    }
}