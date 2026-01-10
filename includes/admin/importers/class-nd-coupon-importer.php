<?php
/**
 * Classe para importar dados de Cupons via CSV.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/importers
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Coupon_Importer {

    public function import_csv( $csv_data, $headers ) {
        $processed_count = 0;
        $errors = array();

        foreach ( $csv_data as $row_index => $row ) {
            if ( count( $row ) !== count( $headers ) ) {
                $errors[] = sprintf( __( 'Linha %d ignorada: número de colunas inválido.', 'nativa-delivery' ), $row_index + 2 );
                continue;
            }

            $item_data = array_combine( $headers, $row );

            // Campos obrigatórios
            $codigo_cupom = sanitize_text_field( $item_data['codigo_cupom'] ?? '' );
            $tipo_desconto = sanitize_key( $item_data['tipo_desconto'] ?? '' ); // 'fixed' ou 'percentage'
            $valor_desconto_str = $item_data['valor_desconto'] ?? '';

            if ( empty( $codigo_cupom ) || empty( $tipo_desconto ) || empty( $valor_desconto_str ) ) {
                $errors[] = sprintf( __( 'Linha %d ignorada: "codigo_cupom", "tipo_desconto" e "valor_desconto" são obrigatórios.', 'nativa-delivery' ), $row_index + 2 );
                continue;
            }

            $valor_desconto = floatval( str_replace( ',', '.', $valor_desconto_str ) );

            if ( ! in_array( $tipo_desconto, array( 'fixed', 'percentage' ) ) ) {
                $errors[] = sprintf( __( 'Linha %d: "tipo_desconto" inválido para o cupom "%s". Usando "fixed".', 'nativa-delivery' ), $row_index + 2, $codigo_cupom );
                $tipo_desconto = 'fixed';
            }
            if ( $valor_desconto <= 0 ) {
                $errors[] = sprintf( __( 'Linha %d: "valor_desconto" deve ser maior que zero para o cupom "%s".', 'nativa-delivery' ), $row_index + 2, $codigo_cupom );
                continue;
            }

            // Campos opcionais
            $gasto_minimo_str = $item_data['gasto_minimo'] ?? '';
            $gasto_minimo = ! empty( $gasto_minimo_str ) ? floatval( str_replace( ',', '.', $gasto_minimo_str ) ) : 0;
            $data_de_validade_str = sanitize_text_field( $item_data['data_de_validade'] ?? '' ); // Formato YYYY-MM-DD
            $limite_de_uso = sanitize_key( $item_data['limite_de_uso'] ?? 'ilimitado' ); // 'ilimitado', 'por_cliente', 'geral'
            $cupom_status = filter_var( ( $item_data['status'] ?? 'ativo' ), FILTER_VALIDATE_BOOLEAN ); // true/false para 'ativo' ou 'inativo'

            // Validação de limite_de_uso
            if ( ! in_array( $limite_de_uso, array( 'ilimitado', 'por_cliente', 'geral' ) ) ) {
                $errors[] = sprintf( __( 'Linha %d: "limite_de_uso" inválido para o cupom "%s". Usando "ilimitado".', 'nativa-delivery' ), $row_index + 2, $codigo_cupom );
                $limite_de_uso = 'ilimitado';
            }
            
            // Tenta encontrar um cupom existente pelo código (título)
            $existing_coupons = get_posts( array(
                'post_type'      => 'nativa_cupom',
                'title'          => $codigo_cupom,
                'post_status'    => array( 'publish', 'pending', 'draft', 'auto-draft', 'future', 'private', 'inherit', 'trash' ),
                'posts_per_page' => 1,
                'fields'         => 'ids',
            ) );

            $post_id = 0;
            if ( ! empty( $existing_coupons ) ) {
                $post_id = $existing_coupons[0];
            }

            $post_data = array(
                'post_title'   => $codigo_cupom,
                'post_type'    => 'nativa_cupom',
                'post_status'  => 'publish', // Cupons inativos ainda são posts publicados, o status é um campo ACF
            );

            if ( $post_id ) {
                $post_data['ID'] = $post_id;
                $result = wp_update_post( $post_data, true );
            } else {
                $result = wp_insert_post( $post_data, true );
            }

            if ( is_wp_error( $result ) ) {
                $errors[] = sprintf( __( 'Linha %d (Cupom: %s) falhou ao importar: %s', 'nativa-delivery' ), $row_index + 2, $codigo_cupom, $result->get_error_message() );
            } else {
                // Atualiza campos ACF
                update_field( 'tipo_desconto', $tipo_desconto, $result );
                update_field( 'valor_desconto', $valor_desconto, $result );
                update_field( 'gasto_minimo', $gasto_minimo, $result );
                update_field( 'data_de_validade', $data_de_validade_str, $result ); // ACF aceita YYYYMMDD ou YYYY-MM-DD
                update_field( 'limite_de_uso', $limite_de_uso, $result );
                update_field( 'cupom_status', $cupom_status, $result );

                $processed_count++;
            }
        }

        return array(
            'processed_count' => $processed_count,
            'errors'          => $errors,
        );
    }
}