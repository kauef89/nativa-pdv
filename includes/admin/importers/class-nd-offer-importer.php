<?php
/**
 * Classe para importar dados de Ofertas de Carrinho via CSV.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/importers
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Offer_Importer {

    public function import_csv( $csv_data, $headers ) {
        $processed_count = 0;
        $errors = array();

        // Cache para IDs de termos (categorias)
        $term_cache = array();

        foreach ( $csv_data as $row_index => $row ) {
            if ( count( $row ) !== count( $headers ) ) {
                $errors[] = sprintf( __( 'Linha %d ignorada: número de colunas inválido.', 'nativa-delivery' ), $row_index + 2 );
                continue;
            }

            $item_data = array_combine( $headers, $row );

            // Campos obrigatórios
            $nome_oferta = sanitize_text_field( $item_data['nome_oferta'] ?? '' );
            $produto_ofertado_nome = sanitize_text_field( $item_data['produto_ofertado_nome'] ?? '' ); // Nome do produto ofertado
            $preco_promocional_str = $item_data['preco_promocional'] ?? '';
            $texto_da_oferta = sanitize_text_field( $item_data['texto_da_oferta'] ?? '' );

            if ( empty( $nome_oferta ) || empty( $produto_ofertado_nome ) || empty( $preco_promocional_str ) || empty( $texto_da_oferta ) ) {
                $errors[] = sprintf( __( 'Linha %d ignorada: Campos obrigatórios "nome_oferta", "produto_ofertado_nome", "preco_promocional" e "texto_da_oferta" são necessários.', 'nativa-delivery' ), $row_index + 2 );
                continue;
            }

            $preco_promocional = floatval( str_replace( ',', '.', $preco_promocional_str ) );
            if ( $preco_promocional < 0 ) {
                $errors[] = sprintf( __( 'Linha %d: "preco_promocional" deve ser maior ou igual a zero para a oferta "%s".', 'nativa-delivery' ), $row_index + 2, $nome_oferta );
                continue;
            }

            // Tenta encontrar o ID do produto ofertado
            $produto_ofertado_id = get_page_by_title( $produto_ofertado_nome, OBJECT, 'nativa_produto' );
            if ( ! $produto_ofertado_id ) {
                $errors[] = sprintf( __( 'Linha %d: Produto ofertado "%s" não encontrado para a oferta "%s".', 'nativa-delivery' ), $row_index + 2, $produto_ofertado_nome, $nome_oferta );
                continue;
            }
            $produto_ofertado_id = $produto_ofertado_id->ID;

            // Campos opcionais / regras
            $oferta_status = filter_var( ( $item_data['status'] ?? 'ativo' ), FILTER_VALIDATE_BOOLEAN );
            $regras_ativacao_json = wp_unslash( $item_data['regras_de_ativacao_json'] ?? '[]' );
            $regras_exclusao_json = wp_unslash( $item_data['regras_de_exclusao_json'] ?? '[]' );

            // Tenta encontrar uma oferta existente pelo nome
            $existing_offers = get_posts( array(
                'post_type'      => 'nativa_oferta',
                'title'          => $nome_oferta,
                'post_status'    => array( 'publish', 'pending', 'draft', 'auto-draft', 'future', 'private', 'inherit', 'trash' ),
                'posts_per_page' => 1,
                'fields'         => 'ids',
            ) );

            $post_id = 0;
            if ( ! empty( $existing_offers ) ) {
                $post_id = $existing_offers[0];
            }

            $post_data = array(
                'post_title'   => $nome_oferta,
                'post_type'    => 'nativa_oferta',
                'post_status'  => 'publish',
            );

            if ( $post_id ) {
                $post_data['ID'] = $post_id;
                $result = wp_update_post( $post_data, true );
            } else {
                $result = wp_insert_post( $post_data, true );
            }

            if ( is_wp_error( $result ) ) {
                $errors[] = sprintf( __( 'Linha %d (Oferta: %s) falhou ao importar: %s', 'nativa-delivery' ), $row_index + 2, $nome_oferta, $result->get_error_message() );
            } else {
                // Processa e sanitiza as regras de ativação e exclusão
                $sanitized_regras_ativacao = $this->process_rules_json( $regras_ativacao_json, $row_index + 2, $nome_oferta, $errors, $term_cache );
                $sanitized_regras_exclusao = $this->process_rules_json( $regras_exclusao_json, $row_index + 2, $nome_oferta, $errors, $term_cache );

                // Atualiza campos ACF
                update_field( 'produto_ofertado', $produto_ofertado_id, $result );
                update_field( 'preco_promocional', $preco_promocional, $result );
                update_field( 'texto_da_oferta', $texto_da_oferta, $result );
                update_field( 'oferta_status', $oferta_status, $result );
                update_field( 'regras_de_ativacao', $sanitized_regras_ativacao, $result );
                update_field( 'regras_de_exclusao', $sanitized_regras_exclusao, $result );

                $processed_count++;
            }
        }

        return array(
            'processed_count' => $processed_count,
            'errors'          => $errors,
        );
    }

    /**
     * Helper para processar o JSON de regras (ativação ou exclusão).
     */
    private function process_rules_json( $rules_json, $line_number, $offer_name, &$errors, &$term_cache ) {
        $rules_array = json_decode( $rules_json, true );
        $sanitized_rules = array();

        if ( is_array( $rules_array ) ) {
            foreach ( $rules_array as $rule ) {
                $tipo_regra = sanitize_key( $rule['tipo_regra'] ?? '' ); // 'categoria_no_carrinho', 'tag_no_carrinho', 'subtotal_carrinho'
                $operador = sanitize_key( $rule['operador'] ?? '' );     // 'maior_igual', 'menor_igual', 'igual'
                $valor = floatval( str_replace( ',', '.', $rule['valor'] ?? '0.00' ) );
                $valor_categoria_nome = sanitize_text_field( $rule['valor_categoria_nome'] ?? '' ); // Nome da categoria/tag

                if ( empty( $tipo_regra ) || empty( $operador ) ) {
                    $errors[] = sprintf( __( 'Linha %d (Oferta: %s): Regra inválida (tipo ou operador ausente).', 'nativa-delivery' ), $line_number, $offer_name );
                    continue;
                }
                
                // Validação e busca de ID para categorias/tags
                $valor_categoria_id = 0;
                if ( in_array( $tipo_regra, array( 'categoria_no_carrinho', 'tag_no_carrinho' ) ) ) {
                    $taxonomy = ( $tipo_regra === 'categoria_no_carrinho' ) ? 'category' : 'post_tag';
                    if ( ! empty( $valor_categoria_nome ) ) {
                        if ( ! isset( $term_cache[ $taxonomy ][ $valor_categoria_nome ] ) ) {
                            $term = get_term_by( 'name', $valor_categoria_nome, $taxonomy );
                            if ( $term && ! is_wp_error( $term ) ) {
                                $term_cache[ $taxonomy ][ $valor_categoria_nome ] = (int) $term->term_id;
                            } else {
                                $errors[] = sprintf( __( 'Linha %d (Oferta: %s): Categoria/Tag "%s" para regra não encontrada.', 'nativa-delivery' ), $line_number, $offer_name, $valor_categoria_nome );
                                continue;
                            }
                        }
                        $valor_categoria_id = $term_cache[ $taxonomy ][ $valor_categoria_nome ];
                    } else {
                         $errors[] = sprintf( __( 'Linha %d (Oferta: %s): Nome da Categoria/Tag é obrigatório para este tipo de regra.', 'nativa-delivery' ), $line_number, $offer_name );
                         continue;
                    }
                }

                $sanitized_rules[] = array(
                    'tipo_regra'        => $tipo_regra,
                    'operador'          => $operador,
                    'valor'             => $valor,
                    'valor_categoria'   => $valor_categoria_id, // Guarda o ID
                );
            }
        }
        return $sanitized_rules;
    }
}