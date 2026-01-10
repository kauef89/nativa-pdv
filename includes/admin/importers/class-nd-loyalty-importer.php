<?php
/**
 * Classe para importar a tabela de resgate de Pontos de Fidelidade via CSV.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/importers
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Loyalty_Importer {

    public function import_csv( $csv_data, $headers ) {
        $processed_count = 0;
        $errors = array();

        // 1. Cache para IDs de produtos, para evitar buscas repetidas no banco
        $product_id_cache = array();

        foreach ( $csv_data as $row_index => $row ) {
            if ( count( $row ) !== count( $headers ) ) {
                $errors[] = sprintf( 'Linha %d ignorada: número de colunas inválido.', $row_index + 2 );
                continue;
            }

            $item_data = array_combine( $headers, $row );

            // 2. Extrai e "limpa" os dados do CSV
            $product_name = sanitize_text_field( $item_data['produto_resgatavel'] ?? '' );
            $points_cost_str = $item_data['custo_em_pontos'] ?? '';

            if ( empty( $product_name ) || empty( $points_cost_str ) ) {
                $errors[] = sprintf( 'Linha %d ignorada: As colunas "produto_resgatavel" e "custo_em_pontos" são obrigatórias.', $row_index + 2 );
                continue;
            }

            if ( ! is_numeric( $points_cost_str ) ) {
                $errors[] = sprintf( 'Linha %d (Produto: %s) ignorada: "custo_em_pontos" deve ser um número.', $row_index + 2, $product_name );
                continue;
            }
            
            $points_cost = absint( $points_cost_str );

            // 3. Encontra o ID do produto pelo nome
            $product_id = 0;
            if ( isset( $product_id_cache[$product_name] ) ) {
                $product_id = $product_id_cache[$product_name];
            } else {
                $product_post = get_page_by_title( $product_name, OBJECT, 'nativa_produto' );
                if ( $product_post ) {
                    $product_id = $product_post->ID;
                    $product_id_cache[$product_name] = $product_id; // Salva no cache
                }
            }

            if ( ! $product_id ) {
                $errors[] = sprintf( 'Linha %d ignorada: Produto "%s" não encontrado no sistema.', $row_index + 2, $product_name );
                continue;
            }

            // 4. Estrutura os dados para o campo repetidor do ACF
            $new_redemption_item = array(
                'produto_resgatavel' => $product_id,
                'custo_em_pontos'    => $points_cost,
            );

            // 5. Adiciona o novo item à tabela de resgate existente
            // O campo 'redemption_table' está na página de Opções, então o post_id é 'option'
            add_row('redemption_table', $new_redemption_item, 'option');

            $processed_count++;
        }

        return array(
            'processed_count' => $processed_count,
            'errors'          => $errors,
        );
    }
}