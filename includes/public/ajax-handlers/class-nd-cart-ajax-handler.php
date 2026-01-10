<?php
/**
 * Lida com as requisições AJAX relacionadas ao carrinho de compras.
 * VERSÃO REATORADA: As responsabilidades de gerenciamento de favoritos foram movidas para a classe ND_Favorites_Ajax_Handler.
 * VERSÃO CORRIGIDA (LOGIN): A verificação de nonce foi removida das ações públicas do carrinho (adicionar, limpar, etc.)
 * para permitir que usuários logados e deslogados executem essas ações sem erros de permissão. A verificação foi mantida
 * apenas em ações que dependem de dados do usuário, como o resgate de recompensas.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-cart-helper.php';
require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-offers-helper.php';
require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/core/class-nd-validation-helper.php';


class ND_Cart_Ajax_Handler {

    public function __construct() {
        $actions = [
            'add_to_cart',
            'add_combo_to_cart',
            'get_cart_contents',
            'update_cart_item_quantity',
            'clear_cart',
            'add_offer_to_cart',
            'redeem_reward',
        ];

        foreach ($actions as $action) {
            add_action("wp_ajax_nativa_delivery_{$action}", array($this, "{$action}_ajax"));
           
            $nopriv_actions = ['add_to_cart', 'add_combo_to_cart', 'get_cart_contents', 'update_cart_item_quantity', 'clear_cart', 'add_offer_to_cart'];
            if (in_array($action, $nopriv_actions)) {
                add_action("wp_ajax_nopriv_nativa_delivery_{$action}", array($this, "{$action}_ajax"));
            }
        }
    }

    // --- INÍCIO DA CORREÇÃO ---
    // A função de verificação de permissão foi removida.
    // A lógica de segurança agora é tratada individualmente em cada método que a requer.
    // --- FIM DA CORREÇÃO ---

    public function add_offer_to_cart_ajax() {
        // A verificação de permissão foi removida daqui, pois é uma ação pública.
        
        $product_id_from_client = isset($_POST['product_id']) ? absint($_POST['product_id']) : 0;
        if (empty($product_id_from_client)) {
            wp_send_json_error(['message' => 'ID do produto da oferta inválido.']);
        }
        
        $current_cart = ND_Cart_Helper::get_cart_contents();
        $applicable_offer = ND_Offers_Helper::get_applicable_offer($current_cart);

        if ( ! $applicable_offer || $applicable_offer['product_to_offer_id'] != $product_id_from_client ) {
            wp_send_json_error(['message' => 'Esta oferta não está mais disponível para o seu carrinho.']);
        }

        $item_data = array(
            'product_id'       => $applicable_offer['product_to_offer_id'],
            'product_name'     => $applicable_offer['product_name'],
            'quantity'         => 1,
            'is_offer_item'    => true,
            'total_item_price' => $applicable_offer['promo_price'],
            'original_price'   => $applicable_offer['original_price'],
        );
        
        ND_Cart_Helper::add_item($item_data);
        $this->send_updated_cart_data('Oferta adicionada ao carrinho!');
    }

    public function add_to_cart_ajax() {
        // A verificação de permissão foi removida daqui, pois é uma ação pública.
        
        $product_id = isset($_POST['product_id']) ? absint($_POST['product_id']) : 0;
        $quantity = isset($_POST['quantity']) ? absint($_POST['quantity']) : 1;
        $selected_addons_json = isset($_POST['selected_addons']) ? wp_unslash($_POST['selected_addons']) : '{}';
        $selected_addons = json_decode($selected_addons_json, true);
        $cart_item_key = isset($_POST['cart_item_key']) ? sanitize_text_field(wp_unslash($_POST['cart_item_key'])) : null;
        
        $is_offer_item = isset($_POST['is_offer_item']) && $_POST['is_offer_item'] === 'true';
        $is_reward_item = isset($_POST['is_reward']) && $_POST['is_reward'] === 'true';
        $original_price_for_offer = isset($_POST['original_price']) ? floatval($_POST['original_price']) : 0;

        if (!$product_id) {
            wp_send_json_error(array('message' => 'ID do produto inválido.'));
        }

        $item_data = [];

        if ($is_reward_item) {
            if (!is_user_logged_in()) {
                wp_send_json_error(['message' => 'Você precisa estar logado para resgatar recompensas.'], 403);
            }
            check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce'); // Verificação de segurança aqui
            $user_id = get_current_user_id();

            $all_rewards = get_field('redemption_table', 'option');
            $reward_to_redeem = null;
            if (is_array($all_rewards)) {
                foreach ($all_rewards as $reward) {
                    if (isset($reward['produto_resgatavel']) && $reward['produto_resgatavel'] == $product_id) {
                        $reward_to_redeem = $reward;
                        break;
                    }
                }
            }

            if (!$reward_to_redeem) {
                wp_send_json_error(['message' => 'Este produto não está disponível para resgate.']);
            }

            $points_cost = (int) $reward_to_redeem['custo_em_pontos'];
            $user_points = (int) get_user_meta($user_id, 'nativa_user_points', true);

            if ($user_points < $points_cost) {
                wp_send_json_error(['message' => 'Você não tem pontos suficientes para este resgate.']);
            }
            
            $validation_result = ND_Validation_Helper::validate_addon_selections($product_id, $selected_addons);
            if (is_wp_error($validation_result)) {
                wp_send_json_error(['message' => $validation_result->get_error_message()]);
            }

            $new_points_balance = $user_points - $points_cost;
            update_user_meta($user_id, 'nativa_user_points', $new_points_balance);
            
            $item_data = [
                'product_id' => $product_id,
                'product_name' => get_the_title($product_id),
                'quantity' => $quantity,
                'selected_addons' => $selected_addons,
                'is_reward' => true,
            ];
        } else {
            if ($is_offer_item) {
                $current_cart = ND_Cart_Helper::get_cart_contents();
                $applicable_offer = ND_Offers_Helper::get_applicable_offer($current_cart);

                if (!$applicable_offer || $applicable_offer['product_to_offer_id'] != $product_id) {
                    wp_send_json_error(['message' => 'Esta oferta não está mais disponível para o seu carrinho.']);
                }
                
                $item_data['is_offer_item'] = true;
                $item_data['original_price'] = $original_price_for_offer;
                $item_data['offer_id'] = $applicable_offer['offer_id'];
            } else {
                $validation_result = ND_Validation_Helper::validate_addon_selections($product_id, $selected_addons);
                if (is_wp_error($validation_result)) {
                    wp_send_json_error(['message' => $validation_result->get_error_message()]);
                }
            }
            
            $item_data['product_id'] = $product_id;
            $item_data['product_name'] = get_the_title($product_id);
            $item_data['quantity'] = $quantity;
            $item_data['selected_addons'] = $selected_addons;
        }

        $item_data['total_item_price'] = ND_Cart_Helper::calculate_secure_item_price($item_data);

        if ($cart_item_key) {
            $item_data['cart_item_key'] = $cart_item_key;
        }
        
        ND_Cart_Helper::add_item($item_data);
        $message = $is_reward_item ? 'Recompensa adicionada ao carrinho!' : 'Item adicionado ao carrinho!';
        $this->send_updated_cart_data($message);
    }

    public function add_combo_to_cart_ajax() {
        // A verificação de permissão foi removida daqui, pois é uma ação pública.
        $combo_id = isset($_POST['combo_id']) ? absint($_POST['combo_id']) : 0;
        $selections = json_decode(isset($_POST['selections']) ? wp_unslash($_POST['selections']) : '[]', true);
        if (empty($combo_id) || empty($selections)) {
            wp_send_json_error(['message' => 'Dados do combo incompletos ou inválidos.']);
        }

        if (is_array($selections)) {
            foreach ($selections as $selection) {
                $product_id_in_combo = $selection['productId'] ?? 0;
                $addons_in_combo = $selection['selectedAddons'] ?? [];
                if ($product_id_in_combo) {
                    $validation_result = ND_Validation_Helper::validate_addon_selections($product_id_in_combo, $addons_in_combo);
                    if (is_wp_error($validation_result)) {
                        wp_send_json_error(['message' => $validation_result->get_error_message()]);
                        return;
                    }
                }
            }
        }

        $combo_item_data = array(
            'is_combo' => true, 
            'combo_id' => $combo_id, 
            'product_id' => $combo_id, 
            'product_name' => sanitize_text_field(wp_unslash($_POST['combo_title'])), 
            'quantity' => 1, 
            'selections' => $selections
        );

        $secure_price = ND_Cart_Helper::calculate_secure_item_price($combo_item_data);
        $combo_item_data['total_item_price'] = $secure_price;

        if (isset($_POST['cart_item_key'])) {
            $combo_item_data['cart_item_key'] = sanitize_text_field(wp_unslash($_POST['cart_item_key']));
        }
        ND_Cart_Helper::add_item($combo_item_data);
        $this->send_updated_cart_data('Combo adicionado com sucesso!');
    }
    
    public function get_cart_contents_ajax() {
        // A verificação de permissão foi removida daqui, pois é uma ação pública.
        $this->send_updated_cart_data();
    }

    public function update_cart_item_quantity_ajax() {
        // A verificação de permissão foi removida daqui, pois é uma ação pública.
        $cart_item_key = isset( $_POST['cart_item_key'] ) ? sanitize_text_field( wp_unslash( $_POST['cart_item_key'] ) ) : '';
        $quantity = isset( $_POST['quantity'] ) ? absint( $_POST['quantity'] ) : 0;
        if ( empty( $cart_item_key ) ) {
            wp_send_json_error( array( 'message' => 'Chave do item inválida.' ) );
        }
        if (!ND_Cart_Helper::update_item_quantity( $cart_item_key, $quantity )) {
            wp_send_json_error( array( 'message' => 'Falha ao atualizar a quantidade do item.' ) );
        }
        $this->send_updated_cart_data('Quantidade atualizada!');
    }

    public function clear_cart_ajax() {
        // A verificação de permissão foi removida daqui, pois é uma ação pública.
        ND_Cart_Helper::clear_cart();
        $this->send_updated_cart_data('Carrinho limpo com sucesso!', true);
    }
    
    public function redeem_reward_ajax() {
        if ( ! is_user_logged_in() ) { wp_send_json_error( array( 'message' => 'Você precisa estar logado para resgatar.' ), 403 ); }
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce'); // Verificação de segurança aqui

        $user_id = get_current_user_id();
        $product_id_to_redeem = isset($_POST['product_id']) ? absint($_POST['product_id']) : 0;
        $available_reward = ND_Offers_Helper::get_available_reward( ND_Cart_Helper::get_cart_contents() );

        if ( !$available_reward || $available_reward['product_id'] != $product_id_to_redeem ) {
            wp_send_json_error( array( 'message' => 'Esta recompensa não está mais disponível para você no momento.' ) );
        }

        $user_points = (int) get_user_meta( $user_id, 'nativa_user_points', true );
        $new_points_balance = $user_points - $available_reward['points_cost'];
        if ( $new_points_balance < 0 ) {
            wp_send_json_error( array( 'message' => 'Pontos insuficientes para este resgate.' ) );
        }
        update_user_meta($user_id, 'nativa_user_points', $new_points_balance);
        
        $item_data = array('product_id' => $available_reward['product_id'], 'product_name' => $available_reward['product_name'], 'quantity' => 1, 'is_reward' => true, 'total_item_price' => 0);
        ND_Cart_Helper::add_item( $item_data );

        $this->send_updated_cart_data('Recompensa adicionada ao carrinho!');
    }

    private function send_updated_cart_data($message = null, $is_clearing = false) {
        if ($is_clearing) {
            $sanitized_cart_data = ['contents' => [], 'total' => 0];
        } else {
            $sanitized_cart_data = ND_Cart_Helper::get_sanitized_cart_data();
        }

        $cart_contents = $sanitized_cart_data['contents'];

        $response = [
            'cart_contents' => $cart_contents,
            'cart_count'    => ND_Cart_Helper::get_cart_item_count(),
            'cart_total'    => $sanitized_cart_data['total'],
            'offer'         => ND_Offers_Helper::get_applicable_offer($cart_contents),
            'reward'        => ND_Offers_Helper::get_available_reward($cart_contents),
        ];

        if ($message) {
            $response['message'] = $message;
        }

        wp_send_json_success( $response );
    }
}