<?php
/**
 * Controlador REST API para Produtos no PDV.
 * VERSÃO 2.1 (CORREÇÃO ACF): Mapeamento correto dos campos de adicionais.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

class ND_Products_API_Controller {

    public function register_routes() {
        register_rest_route( 'nativa-delivery/v1', '/products/pos', array(
            'methods'             => 'GET',
            'callback'            => array( $this, 'get_products_for_pos' ),
            'permission_callback' => '__return_true', 
        ) );
    }

    public function get_products_for_pos( $request ) {
        $args = array(
            'post_type'      => 'nativa_produto',
            'post_status'    => 'publish',
            'posts_per_page' => -1,
            'fields'         => 'ids',
        );

        $query = new WP_Query( $args );
        $products = array();

        if ( $query->have_posts() ) {
            foreach ( $query->posts as $post_id ) {
                
                // Filtros
                $availability = get_field( 'produto_disponibilidade', $post_id );
                if ( $availability === 'oculto' ) continue;

                // Preços
                $price_base = (float) get_field( 'produto_preco', $post_id );
                $promo = (float) get_field( 'produto_preco_promocional', $post_id );
                $final_price = ($promo > 0 && $promo < $price_base) ? $promo : $price_base;
                $image_url = get_the_post_thumbnail_url( $post_id, 'thumbnail' );

                // PROCESSAMENTO DE GRUPOS (Com Chaves Corretas do ACF)
                $linked_groups = get_field( 'produto_grupos_adicionais', $post_id );
                $modifiers = array();

                if ( $linked_groups && is_array( $linked_groups ) ) {
                    foreach ( $linked_groups as $group_id ) {
                        if ( get_post_status( $group_id ) !== 'publish' ) continue;

                        // Chaves corrigidas conforme nativa-delivery-adicionais-fields.php
                        $type = get_field( 'grupo_adicional_tipo_grupo', $group_id ); // 'opcao', 'adicional', 'sabor'
                        $min  = (int) get_field( 'grupo_adicional_min_selecao', $group_id );
                        $max  = (int) get_field( 'grupo_adicional_max_selecao', $group_id );
                        
                        // Se for tipo "Opção", força min 1 max 1 (Lógica de Radio Button)
                        if ( $type === 'opcao' ) {
                            $min = 1; 
                            $max = 1;
                        }

                        $items_raw = get_field( 'grupo_adicional_itens', $group_id ); // Repeater

                        $group_items = array();
                        if ( $items_raw && is_array( $items_raw ) ) {
                            foreach ( $items_raw as $item ) {
                                // Verifica disponibilidade do item
                                $item_status = $item['item_disponibilidade'] ?? 'disponivel';
                                if ( $item_status === 'oculto' || $item_status === 'indisponivel' ) continue;

                                $group_items[] = array(
                                    'name'  => $item['item_nome'] ?? 'Item',
                                    'price' => (float) ($item['item_preco'] ?? 0),
                                );
                            }
                        }

                        if ( ! empty( $group_items ) ) {
                            $modifiers[] = array(
                                'id'    => $group_id,
                                'title' => get_field('grupo_adicional_nome_exibicao', $group_id) ?: get_the_title( $group_id ),
                                'type'  => $type,
                                'min'   => $min,
                                'max'   => $max,
                                'items' => $group_items
                            );
                        }
                    }
                }

                $products[] = array(
                    'id'        => $post_id,
                    'name'      => get_the_title( $post_id ),
                    'price'     => $final_price,
                    'img'       => $image_url,
                    'groups'    => $modifiers // Array de grupos populado corretamente
                );
            }
        }

        return new WP_REST_Response( array( 
            'success'  => true, 
            'count'    => count($products),
            'products' => $products 
        ), 200 );
    }
}