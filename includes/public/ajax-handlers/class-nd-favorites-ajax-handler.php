<?php
/**
 * NOVO ARQUIVO
 * Lida com as requisições AJAX relacionadas aos favoritos dos usuários.
 * VERSÃO ATUALIZADA: Centraliza TODA a lógica de favoritos, incluindo funções legadas
 * e implementa uma "lazy migration" para exibir favoritos antigos no novo formato.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-cart-helper.php';

class ND_Favorites_Ajax_Handler {

    public function __construct() {
        $actions = [
            'get_my_favorites',
            'save_custom_favorite',
            'delete_custom_favorite',
            // Funções legadas movidas de ND_Profile_Ajax_Handler
            'update_my_favorites',
            'merge_my_favorites',
        ];

        foreach ($actions as $action) {
            add_action("wp_ajax_nativa_delivery_{$action}", array($this, "{$action}_ajax"));
        }
    }

    /**
     * Busca e retorna a lista de favoritos, convertendo favoritos antigos para o novo formato.
     * Esta função realiza uma "lazy migration" para garantir compatibilidade.
     */
    public function get_my_favorites_ajax() {
        // CORREÇÃO: Verifica se o usuário está logado antes de checar o nonce.
        if ( ! is_user_logged_in() ) {
            wp_send_json_error( array( 'message' => 'Usuário não está logado.' ), 403 );
            return;
        }
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');

        $user_id = get_current_user_id();
        
        // 1. Busca os favoritos no novo formato (customizados)
        $custom_favorites = get_user_meta($user_id, 'nativa_custom_favorites', true);
        if ( ! is_array($custom_favorites) ) {
            $custom_favorites = [];
        }

        // 2. Busca os favoritos no formato legado (array de IDs de produto)
        $legacy_favorites = get_user_meta($user_id, 'nativa_user_favorites', true);

        if ( is_array($legacy_favorites) && !empty($legacy_favorites) ) {
            $migrated = false;
            foreach ($legacy_favorites as $product_id) {
                $product_id = absint($product_id);
                if (!$product_id) continue;

                $favorite_key = 'legacy_fav_' . $product_id;
                
                if (isset($custom_favorites[$favorite_key])) continue;
                
                $product = get_post($product_id);
                if ($product) {
                    $price_calc_data = ['product_id' => $product_id, 'selected_addons' => []];
                    $price = ND_Cart_Helper::calculate_secure_item_price($price_calc_data);

                    // Converte o favorito legado para o novo formato
                    $custom_favorites[$favorite_key] = [
                        'is_combo_favorite' => false,
                        'base_product_id'   => $product_id,
                        'nickname'          => $product->post_title,
                        'name'              => $product->post_title,
                        'total_item_price'  => $price,
                        'configuration'     => ['quantity' => 1, 'addons' => []],
                        'timestamp'         => time(),
                    ];
                    $migrated = true;
                }
            }

            // Se algum favorito foi migrado, atualiza o meta do usuário e apaga o antigo.
            if ($migrated) {
                update_user_meta($user_id, 'nativa_custom_favorites', $custom_favorites);
                delete_user_meta($user_id, 'nativa_user_favorites');
            }
        }

        wp_send_json_success($custom_favorites);
    }
    
    /**
     * Salva uma nova configuração de produto ou combo como um favorito customizado.
     */
    public function save_custom_favorite_ajax() {
        // CORREÇÃO: Verifica se o usuário está logado antes de checar o nonce.
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Você precisa estar logado para salvar favoritos.'], 403);
        }
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');
    
        $item_data_json = isset($_POST['item_data']) ? wp_unslash($_POST['item_data']) : null;
        if (!$item_data_json) {
            wp_send_json_error(['message' => 'Dados do favorito não recebidos.'], 400);
        }
    
        $item_data = json_decode($item_data_json, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            wp_send_json_error(['message' => 'O formato dos dados do favorito é inválido.'], 400);
        }
    
        $new_favorite_data = [];
        $is_combo = isset($item_data['configuration']['selections']);
    
        if ($is_combo) {
            $combo_id = isset($item_data['base_product_id']) ? absint($item_data['base_product_id']) : 0;
            $selections = $item_data['configuration']['selections'] ?? [];
            $name = get_the_title($combo_id);
            $nickname = !empty($item_data['nickname']) ? sanitize_text_field($item_data['nickname']) : $name;
            
            $price_calc_data = [
                'is_combo' => true,
                'combo_id' => $combo_id,
                'selections' => $selections
            ];
            $total_item_price = ND_Cart_Helper::calculate_secure_item_price($price_calc_data);

            if (empty($combo_id) || empty($selections)) {
                wp_send_json_error(['message' => 'Dados do combo favorito inválidos.'], 400);
            }
    
            $new_favorite_data = [
                'is_combo_favorite' => true,
                'base_product_id'   => $combo_id,
                'nickname'          => $nickname,
                'name'              => $name,
                'total_item_price'  => $total_item_price,
                'configuration'     => ['selections' => $selections],
                'timestamp'         => time(),
            ];
        } else {
            $product_id = isset($item_data['base_product_id']) ? absint($item_data['base_product_id']) : 0;
            $name = get_the_title($product_id);
            $nickname = !empty($item_data['nickname']) ? sanitize_text_field($item_data['nickname']) : $name;
            $base_quantity = isset($item_data['configuration']['quantity']) ? absint($item_data['configuration']['quantity']) : 1;
            $addons_config = isset($item_data['configuration']['addons']) ? $item_data['configuration']['addons'] : [];
            
            $price_calc_data = [
                'product_id' => $product_id,
                'selected_addons' => $addons_config
            ];
            $total_item_price = ND_Cart_Helper::calculate_secure_item_price($price_calc_data) * $base_quantity;

            if (empty($product_id)) {
                wp_send_json_error(['message' => 'Dados do favorito inválidos. O produto base não foi identificado.'], 400);
            }
    
            $new_favorite_data = [
                'is_combo_favorite' => false,
                'base_product_id'   => $product_id,
                'nickname'          => $nickname,
                'name'              => $name,
                'total_item_price'  => $total_item_price,
                'configuration'     => ['quantity' => $base_quantity, 'addons' => $addons_config],
                'timestamp'         => time(),
            ];
        }
    
        $user_id = get_current_user_id();
        $custom_favorites = get_user_meta($user_id, 'nativa_custom_favorites', true);
        if (!is_array($custom_favorites)) {
            $custom_favorites = [];
        }
    
        $new_favorite_key = uniqid('fav_', true);
        $custom_favorites[$new_favorite_key] = $new_favorite_data;
    
        update_user_meta($user_id, 'nativa_custom_favorites', $custom_favorites);
        
        delete_transient('nativa_menu_data_cache_' . $user_id);
        
        wp_send_json_success(['message' => 'Favorito salvo com sucesso!']);
    }
    
    /**
     * Exclui um favorito customizado da lista do usuário.
     */
    public function delete_custom_favorite_ajax() {
        // CORREÇÃO: Verifica se o usuário está logado antes de checar o nonce.
        if ( ! is_user_logged_in() ) {
            wp_send_json_error( ['message' => 'Você precisa estar logado para excluir favoritos.'], 403 );
        }
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');

        $favorite_id_to_delete = isset($_POST['favorite_id']) ? sanitize_text_field($_POST['favorite_id']) : null;
        if ( ! $favorite_id_to_delete ) {
            wp_send_json_error( ['message' => 'ID do favorito não fornecido.'], 400 );
        }

        $user_id = get_current_user_id();
        $custom_favorites = get_user_meta( $user_id, 'nativa_custom_favorites', true );
        if ( ! is_array($custom_favorites) ) {
            $custom_favorites = [];
        }

        if ( isset($custom_favorites[$favorite_id_to_delete]) ) {
            unset($custom_favorites[$favorite_id_to_delete]);
            update_user_meta( $user_id, 'nativa_custom_favorites', $custom_favorites );
            
            delete_transient('nativa_menu_data_cache_' . $user_id);
            
            wp_send_json_success(['message' => 'Favorito removido com sucesso!']);
        } else {
            wp_send_json_error( ['message' => 'Favorito não encontrado para exclusão.'], 404 );
        }
    }

    /**
     * Função legada movida de ND_Profile_Ajax_Handler.
     */
    public function update_my_favorites_ajax() {
        // CORREÇÃO: Verifica se o usuário está logado antes de checar o nonce.
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Usuário não logado.'], 403);
        }
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');
        $favorites_json = isset($_POST['favorites']) ? wp_unslash($_POST['favorites']) : '[]';
        $favorites = json_decode($favorites_json, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            // Esta função legada ainda escreve no meta antigo, mas a função get_my_favorites_ajax irá migrá-los.
            update_user_meta(get_current_user_id(), 'nativa_user_favorites', $favorites);
            wp_send_json_success(['message' => 'Favoritos atualizados.']);
        } else {
            wp_send_json_error(['message' => 'Dados de favoritos inválidos.'], 400);
        }
    }
    
    /**
     * Função legada movida de ND_Profile_Ajax_Handler.
     */
    public function merge_my_favorites_ajax() {
        // CORREÇÃO: Verifica se o usuário está logado antes de checar o nonce.
        if (!is_user_logged_in()) {
            wp_send_json_error(['message' => 'Usuário não logado.'], 403);
        }
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');
        $local_favorites_json = isset($_POST['favorites']) ? wp_unslash($_POST['favorites']) : '{}';
        $local_favorites = json_decode($local_favorites_json, true);
        if (json_last_error() !== JSON_ERROR_NONE || !is_array($local_favorites)) {
            wp_send_json_error(['message' => 'Dados de favoritos locais inválidos.'], 400);
        }
        
        $user_id = get_current_user_id();
        $server_favorites = get_user_meta($user_id, 'nativa_user_favorites', true);
        if (!is_array($server_favorites)) {
            $server_favorites = [];
        }

        $merged_favorites = array_merge($server_favorites, $local_favorites);
        // Esta função legada ainda escreve no meta antigo, mas a função get_my_favorites_ajax irá migrá-los.
        update_user_meta($user_id, 'nativa_user_favorites', $merged_favorites);
        
        wp_send_json_success(['message' => 'Favoritos unidos com sucesso!', 'favorites' => $merged_favorites]);
    }
}