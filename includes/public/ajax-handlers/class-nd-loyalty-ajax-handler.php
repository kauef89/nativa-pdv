<?php
/**
 * Lida com as requisições AJAX relacionadas ao programa de fidelidade.
 * VERSÃO ATUALIZADA (ND): Corrige as referências para as classes Helper.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/public/ajax-handlers
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Loyalty_Ajax_Handler {

    public function __construct() {
        $actions = [
            'get_available_rewards',
            'redeem_reward',
        ];

        foreach ($actions as $action) {
            add_action("wp_ajax_nativa_delivery_{$action}", array($this, "{$action}_ajax"));
        }
    }

    /**
     * Busca as recompensas disponíveis e o saldo de pontos do usuário.
     */
    public function get_available_rewards_ajax() {
        // CORREÇÃO: Verifica se o usuário está logado antes de checar o nonce.
        if ( ! is_user_logged_in() ) {
            wp_send_json_error(['message' => 'Você precisa estar logado para ver as recompensas.'], 403);
            return;
        }
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');
        
        $user_id = get_current_user_id();
        $user_points = get_user_meta( $user_id, 'nativa_user_points', true );
        $user_points = empty( $user_points ) ? 0 : intval( $user_points );
        
        $rewards_list = [];
        $rewards_data = get_field('redemption_table', 'option');
        
        if ( is_array($rewards_data) && !empty($rewards_data) ) {
            foreach ($rewards_data as $reward) {
                $product_id = $reward['produto_resgatavel'] ?? 0;
                $points_cost = $reward['custo_em_pontos'] ?? 0;
                
                if ( !$product_id || !$points_cost ) continue;
                
                $product = get_post($product_id);
                if ( !$product ) continue;

                $category_image_url = '';
                $categories = get_the_terms($product_id, 'category');
                if ($categories && !is_wp_error($categories)) {
                    $category_image_url = get_field('category_image', 'category_' . $categories[0]->term_id);
                }
                
                $rewards_list[] = [
                    'product_id' => $product_id,
                    'product_name' => $product->post_title,
                    'points_cost' => (int) $points_cost,
                    'category_image_url' => $category_image_url ?: ''
                ];
            }
        }
        
        usort($rewards_list, function($a, $b) {
            return $a['points_cost'] <=> $b['points_cost'];
        });

        wp_send_json_success(['user_points' => $user_points, 'rewards' => $rewards_list]);
    }

    /**
     * Resgata uma recompensa, deduzindo os pontos e adicionando o item ao carrinho.
     */
    public function redeem_reward_ajax() {
        error_log("[SONDA 4/4] BACKEND: redeem_reward_ajax iniciada."); // SONDA

        // CORREÇÃO: Verifica se o usuário está logado antes de checar o nonce.
        if ( ! is_user_logged_in() ) { 
            error_log("[SONDA ERRO] Usuário não logado.");
            wp_send_json_error( array( 'message' => 'Você precisa estar logado para resgatar.' ), 403 ); 
            return;
        }
        check_ajax_referer('nativa_delivery_ajax_nonce', 'nonce');

        $user_id = get_current_user_id();
        $product_id_to_redeem = isset($_POST['product_id']) ? absint($_POST['product_id']) : 0;
        error_log("[SONDA 4/4] BACKEND: Recebido product_id: " . $product_id_to_redeem); // SONDA
        
        $all_rewards = get_field('redemption_table', 'option');
        $reward_to_redeem = null;

        if (is_array($all_rewards)) {
            foreach ($all_rewards as $reward) {
                if (isset($reward['produto_resgatavel']) && $reward['produto_resgatavel'] == $product_id_to_redeem) {
                    $reward_to_redeem = $reward;
                    break;
                }
            }
        }

        if ( !$reward_to_redeem ) {
            error_log("[SONDA ERRO] Recompensa não encontrada na tabela de resgate (redemption_table).");
            wp_send_json_error( array( 'message' => 'Esta recompensa não é mais válida.' ) );
        }
        error_log("[SONDA 4/4] BACKEND: Recompensa encontrada: " . print_r($reward_to_redeem, true)); // SONDA

        $points_cost = (int) $reward_to_redeem['custo_em_pontos'];
        $product = get_post($product_id_to_redeem);

        if (!$product) {
            error_log("[SONDA ERRO] Produto associado à recompensa (ID: " . $product_id_to_redeem . ") não encontrado.");
            wp_send_json_error( array( 'message' => 'O produto desta recompensa não foi encontrado.' ) );
        }

        $user_points = (int) get_user_meta( $user_id, 'nativa_user_points', true );
        error_log("[SONDA 4/4] BACKEND: Pontos do usuário: " . $user_points . " | Custo da recompensa: " . $points_cost); // SONDA
        $new_points_balance = $user_points - $points_cost;

        if ( $new_points_balance < 0 ) {
            error_log("[SONDA ERRO] Pontos insuficientes. Saldo: " . $user_points . ", Custo: " . $points_cost);
            wp_send_json_error( array( 'message' => 'Pontos insuficientes para este resgate.' ) );
        }

        update_user_meta($user_id, 'nativa_user_points', $new_points_balance);
        error_log("[SONDA 4/4] BACKEND: Pontos do usuário (ID: " . $user_id . ") atualizados para: " . $new_points_balance); // SONDA

        $item_data = array(
            'product_id' => $product_id_to_redeem,
            'product_name' => $product->post_title . ' (Resgate)',
            'quantity' => 1,
            'is_reward' => true,
            'total_item_price' => 0
        );

        error_log("[SONDA 4/4] BACKEND: Preparando para adicionar item ao carrinho: " . print_r($item_data, true)); // SONDA
        ND_Cart_Helper::add_item( $item_data );
        error_log("[SONDA 4/4] BACKEND: Item adicionado ao carrinho com sucesso."); // SONDA
        
        $cart_contents = ND_Cart_Helper::get_cart_contents();
        $response_data = array(
            'message' => 'Recompensa adicionada ao carrinho!',
            'cart_count' => ND_Cart_Helper::get_cart_item_count(),
            'cart_total' => ND_Cart_Helper::get_cart_total(),
            'offer' => ND_Offers_Helper::get_applicable_offer($cart_contents),
            'reward' => ND_Offers_Helper::get_available_reward($cart_contents)
        );
        
        error_log("[SONDA 4/4] BACKEND: Enviando resposta de sucesso: " . print_r($response_data, true)); // SONDA
        wp_send_json_success($response_data);
    }
}