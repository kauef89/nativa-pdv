<?php
/**
 * Classe para importar dados de Ruas via CSV.
 * VERSÃO ATUALIZADA: Suporta campo repetidor 'rua_segmentos' com múltiplos bairros e numerações.
 * VERSÃO CORRIGIDA: Mensagens de erro mais detalhadas.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/importers
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Rua_Importer {

    public function import_csv( $csv_data, $headers ) {
        $processed_count = 0;
        $errors = array();

        // Mapear nomes de bairros para seus IDs para evitar consultas repetidas ao DB
        $bairros_cache = array();
        $all_bairros_posts = get_posts(array(
            'post_type' => 'nativa_bairro',
            'posts_per_page' => -1,
            'post_status' => 'publish',
        ));
        foreach ($all_bairros_posts as $bairro_post) {
            $bairros_cache[sanitize_title($bairro_post->post_title)] = $bairro_post->ID;
            // Armazena também o nome original para facilitar a depuração se necessário
            $bairros_cache[$bairro_post->post_title] = $bairro_post->ID; 
        }

        foreach ( $csv_data as $row_index => $row ) {
            // Garante que a linha tem o mesmo número de colunas que os cabeçalhos
            if ( count( $row ) !== count( $headers ) ) {
                $errors[] = sprintf( __( 'Linha %d ignorada: número de colunas inválido (%d colunas encontradas, %d esperadas).', 'nativa-delivery' ), $row_index + 2, count($row), count($headers) ); // Adiciona contagem para depuração
                continue;
            }

            $item_data = array_combine( $headers, $row );

            // Campos obrigatórios
            $nome_rua = sanitize_text_field( $item_data['nome_rua'] ?? '' );
            $segmentos_json = wp_unslash( $item_data['segmentos_json'] ?? '[]' ); 

            if ( empty( $nome_rua ) ) {
                $errors[] = sprintf( __( 'Linha %d ignorada: "nome_rua" é obrigatório.', 'nativa-delivery' ), $row_index + 2 );
                continue;
            }
            if ( empty( $segmentos_json ) || $segmentos_json === '[]' ) {
                $errors[] = sprintf( __( 'Linha %d (Rua: %s) ignorada: "segmentos_json" é obrigatório e deve conter ao menos um segmento.', 'nativa-delivery' ), $row_index + 2, $nome_rua );
                continue;
            }

            // Decodifica e sanitiza os segmentos da rua
            $segmentos_array = json_decode( $segmentos_json, true );
            $json_last_error_msg = json_last_error_msg(); // Obtém a última mensagem de erro JSON

            if ( ! is_array( $segmentos_array ) || json_last_error() !== JSON_ERROR_NONE ) { // Verifica se é array E se não houve erro de JSON
                $errors[] = sprintf( __( 'Linha %d (Rua: %s) ignorada: "segmentos_json" inválido ou mal formatado. Erro JSON: %s. JSON recebido: %s', 'nativa-delivery' ), $row_index + 2, $nome_rua, $json_last_error_msg, $segmentos_json ); // Mensagem de erro mais detalhada
                continue;
            }

            $sanitized_segmentos = array();
            foreach ( $segmentos_array as $seg_index => $segmento ) { // Adiciona índice do segmento para depuração
                $bairro_nome = sanitize_text_field( $segmento['bairro_nome'] ?? '' );
                $numero_inicial = sanitize_text_field( $segmento['numero_inicial'] ?? '' );
                $numero_final = sanitize_text_field( $segmento['numero_final'] ?? '' );

                if ( empty( $bairro_nome ) || empty( $numero_inicial ) ) {
                    $errors[] = sprintf( __( 'Linha %d (Rua: %s, Segmento: %d) ignorado: "bairro_nome" ou "numero_inicial" é obrigatório.', 'nativa-delivery' ), $row_index + 2, $nome_rua, $seg_index + 1 );
                    continue;
                }

                $bairro_id = 0;
                // Tenta encontrar o ID do bairro usando o cache (primeiro o nome original, depois o sanitizado)
                if ( isset( $bairros_cache[ $bairro_nome ] ) ) {
                    $bairro_id = $bairros_cache[ $bairro_nome ];
                } elseif ( isset( $bairros_cache[ sanitize_title( $bairro_nome ) ] ) ) {
                    $bairro_id = $bairros_cache[ sanitize_title( $bairro_nome ) ];
                } else {
                    // Se não encontrou no cache, tenta buscar no banco de dados (mais lento, mas garante)
                    $existing_bairros = get_posts( array(
                        'post_type'      => 'nativa_bairro',
                        'title'          => $bairro_nome, 
                        'post_status'    => 'publish',
                        'posts_per_page' => 1,
                        'fields'         => 'ids',
                    ) );
                    if ( ! empty( $existing_bairros ) ) {
                        $bairro_id = $existing_bairros[0];
                        $bairros_cache[ $bairro_nome ] = $bairro_id; 
                    }
                }

                if ( ! $bairro_id ) {
                    $errors[] = sprintf( __( 'Linha %d (Rua: %s, Segmento: %d) ignorado: Bairro "%s" não encontrado no sistema.', 'nativa-delivery' ), $row_index + 2, $nome_rua, $seg_index + 1, $bairro_nome );
                    continue;
                }

                $sanitized_segmentos[] = array(
                    'bairro_associado' => $bairro_id,
                    'numero_inicial'   => $numero_inicial,
                    'numero_final'     => $numero_final,
                );
            }

            if ( empty( $sanitized_segmentos ) ) {
                $errors[] = sprintf( __( 'Linha %d ignorada: Nenhum segmento de rua válido pôde ser processado para "%s". (Possíveis erros em segmentos anteriores)', 'nativa-delivery' ), $row_index + 2, $nome_rua );
                continue;
            }

            // Tenta encontrar uma rua existente pelo nome
            $existing_ruas = get_posts( array(
                'post_type'      => 'nativa_rua',
                'title'          => $nome_rua,
                'post_status'    => array( 'publish', 'pending', 'draft', 'auto-draft', 'future', 'private', 'inherit', 'trash' ),
                'posts_per_page' => 1,
                'fields'         => 'ids',
            ) );

            $post_id = 0;
            if ( ! empty( $existing_ruas ) ) {
                $post_id = $existing_ruas[0];
            }

            $post_data = array(
                'post_title'   => $nome_rua,
                'post_type'    => 'nativa_rua',
                'post_status'  => 'publish',
            );

            if ( $post_id ) {
                $post_data['ID'] = $post_id;
                $result = wp_update_post( $post_data, true );
            } else {
                $result = wp_insert_post( $post_data, true );
            }

            if ( is_wp_error( $result ) ) {
                $errors[] = sprintf( __( 'Linha %d (Rua: %s) falhou ao importar: %s', 'nativa-delivery' ), $row_index + 2, $nome_rua, $result->get_error_message() );
            } else {
                // Atualiza o campo repetidor ACF
                update_field( 'rua_segmentos', $sanitized_segmentos, $result );
                $processed_count++;
            }
        }

        return array(
            'processed_count' => $processed_count,
            'errors'          => $errors,
        );
    }
}