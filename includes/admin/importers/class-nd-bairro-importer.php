<?php
/**
 * Classe para importar dados de Bairros via CSV.
 * VERSÃO OTIMIZADA: Adiciona validação numérica explícita para campos de valor e melhora as mensagens de erro.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/importers
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Bairro_Importer {

    public function import_csv( $csv_data, $headers ) {
        $processed_count = 0;
        $errors = array();

        foreach ( $csv_data as $row_index => $row ) {
            // Garante que a linha tem o mesmo número de colunas que os cabeçalhos
            if ( count( $row ) !== count( $headers ) ) {
                $errors[] = sprintf( __( 'Linha %d ignorada: número de colunas inválido.', 'nativa-delivery' ), $row_index + 2 ); // +2 para compensar o índice 0 e o cabeçalho
                continue;
            }

            $item_data = array_combine( $headers, $row );

            // --- INÍCIO DA MODIFICAÇÃO: Validação aprimorada ---
            $nome = sanitize_text_field( $item_data['nome'] ?? '' );
            $taxa_entrega_str = str_replace( ',', '.', $item_data['taxa_entrega'] ?? '0.00' );
            $valor_minimo_frete_gratis_str = str_replace( ',', '.', $item_data['valor_minimo_frete_gratis'] ?? '0.00' );

            if ( empty( $nome ) ) {
                $errors[] = sprintf( __( 'Linha %d ignorada: "nome" é obrigatório.', 'nativa-delivery' ), $row_index + 2 );
                continue;
            }

            if ( ! is_numeric( $taxa_entrega_str ) ) {
                $errors[] = sprintf( __( 'Linha %d (Bairro: %s) ignorada: "taxa_entrega" deve ser um número válido.', 'nativa-delivery' ), $row_index + 2, $nome );
                continue;
            }

            if ( ! is_numeric( $valor_minimo_frete_gratis_str ) ) {
                $errors[] = sprintf( __( 'Linha %d (Bairro: %s) ignorada: "valor_minimo_frete_gratis" deve ser um número válido.', 'nativa-delivery' ), $row_index + 2, $nome );
                continue;
            }

            $taxa_entrega = floatval( $taxa_entrega_str );
            $valor_minimo_frete_gratis = floatval( $valor_minimo_frete_gratis_str );
            // --- FIM DA MODIFICAÇÃO ---


            // Tenta encontrar um bairro existente pelo nome
            $existing_bairros = get_posts( array(
                'post_type'      => 'nativa_bairro',
                'title'          => $nome,
                'post_status'    => array( 'publish', 'pending', 'draft', 'auto-draft', 'future', 'private', 'inherit', 'trash' ), // Inclui todos os status para encontrar existente
                'posts_per_page' => 1,
                'fields'         => 'ids',
            ) );

            $post_id = 0;
            if ( ! empty( $existing_bairros ) ) {
                $post_id = $existing_bairros[0]; // Pega o primeiro encontrado
            }

            $post_data = array(
                'post_title'   => $nome,
                'post_type'    => 'nativa_bairro',
                'post_status'  => 'publish',
            );

            if ( $post_id ) {
                $post_data['ID'] = $post_id;
                $result = wp_update_post( $post_data, true );
            } else {
                $result = wp_insert_post( $post_data, true );
            }

            if ( is_wp_error( $result ) ) {
                $errors[] = sprintf( __( 'Linha %d falhou ao importar: %s', 'nativa-delivery' ), $row_index + 2, $result->get_error_message() );
            } else {
                // Atualiza campos ACF
                update_field( 'taxa_entrega', $taxa_entrega, $result );
                update_field( 'valor_minimo_frete_gratis', $valor_minimo_frete_gratis, $result );
                $processed_count++;
            }
        }

        return array(
            'processed_count' => $processed_count,
            'errors'          => $errors,
        );
    }
}