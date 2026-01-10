<?php
/**
 * Helper para analisar dados de pedidos e extrair estatísticas, como itens mais vendidos.
 * VERSÃO OTIMIZADA: Substitui WP_Query + Loop por uma única consulta SQL direta ($wpdb),
 * reduzindo de 500+ queries para apenas 1, economizando memória e CPU.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Stats_Helper {

    /**
     * Analisa o histórico de pedidos para encontrar os sabores mais populares de um grupo de adicional.
     */
    public static function get_best_selling_addon_items( $group_id, $limit = 5 ) {
        $transient_key = 'best_sellers_group_' . $group_id;
        $cached_data = get_transient( $transient_key );

        if ( false !== $cached_data ) {
            return $cached_data;
        }

        global $wpdb;
        $item_counts = [];
        $meta_key = 'pedido_itens_json'; // Nome do campo ACF/Meta onde o JSON está salvo
        $query_limit = 500; // Analisar os últimos 500 pedidos

        // --- INÍCIO DA OTIMIZAÇÃO SQL ---
        // Busca apenas o conteúdo do meta_value (JSON) dos últimos pedidos publicados.
        // Ignora carregamento de objetos WP_Post, Taxonomias, Autores, etc.
        $sql = $wpdb->prepare(
            "SELECT pm.meta_value
            FROM {$wpdb->postmeta} pm
            INNER JOIN {$wpdb->posts} p ON pm.post_id = p.ID
            INNER JOIN {$wpdb->term_relationships} tr ON (p.ID = tr.object_id)
            INNER JOIN {$wpdb->term_taxonomy} tt ON (tr.term_taxonomy_id = tt.term_taxonomy_id)
            INNER JOIN {$wpdb->terms} t ON (tt.term_id = t.term_id)
            WHERE p.post_type = 'nativa_pedido'
            AND p.post_status = 'publish'
            AND pm.meta_key = %s
            AND t.slug = 'finalizado' 
            ORDER BY p.post_date DESC
            LIMIT %d",
            $meta_key,
            $query_limit
        );
        
        // Nota: O JOIN com 'terms' garante que pegamos apenas pedidos 'finalizados' (taxonomia nativa_order_status),
        // replicando a lógica original da WP_Query anterior com muito mais performance.

        $results = $wpdb->get_col( $sql );
        // --- FIM DA OTIMIZAÇÃO SQL ---

        if ( $results ) {
            foreach ( $results as $items_json ) {
                if ( empty( $items_json ) ) continue;
                
                $items = json_decode( $items_json, true );
                if ( is_array( $items ) ) {
                    self::count_items_in_addons( $items, $group_id, $item_counts );
                }
            }
        }
        
        arsort( $item_counts );
        $top_items = array_slice( array_keys( $item_counts ), 0, $limit );
        
        set_transient( $transient_key, $top_items, 12 * HOUR_IN_SECONDS ); // Cache por 12 horas

        return $top_items;
    }

    /**
     * Função recursiva para contar itens em estruturas de adicionais e combos.
     */
    private static function count_items_in_addons($items_array, $target_group_id, &$item_counts) {
        foreach ($items_array as $item) {
            if (isset($item['is_combo']) && $item['is_combo'] && isset($item['selections'])) {
                foreach ($item['selections'] as $selection) {
                    if (isset($selection['selectedAddons'])) {
                         self::count_items_in_addons([['selected_addons' => $selection['selectedAddons']]], $target_group_id, $item_counts);
                    }
                }
            }
            
            if (isset($item['selected_addons'][$target_group_id]['items'])) {
                foreach ($item['selected_addons'][$target_group_id]['items'] as $addon) {
                    $item_name = $addon['itemName'];
                    if (!isset($item_counts[$item_name])) {
                        $item_counts[$item_name] = 0;
                    }
                    $item_counts[$item_name]++;
                }
            }
        }
    }
}