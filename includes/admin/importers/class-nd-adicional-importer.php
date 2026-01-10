<?php
/**
 * Classe para importar dados de Grupos de Adicionais via CSV.
 * VERSÃO ATUALIZADA: Mensagens de erro mais detalhadas.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/importers
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Adicional_Group_Importer {

    public function import_csv( $csv_data, $headers ) {
        $processed_count = 0;
        $errors = array();

        foreach ( $csv_data as $row_index => $row ) {
            // Garante que a linha tem o mesmo número de colunas que os cabeçalhos
            if ( count( $row ) !== count( $headers ) ) {
                $errors[] = sprintf( __( 'Linha %d ignorada: número de colunas inválido (%d colunas encontradas, %d esperadas).', 'nativa-delivery' ), $row_index + 2, count($row), count($headers) );
                continue;
            }

            $item_data = array_combine( $headers, $row );

            // Campos obrigatórios
            $nome_grupo = sanitize_text_field( $item_data['nome_grupo'] ?? '' );
            $nome_exibicao = sanitize_text_field( $item_data['nome_exibicao'] ?? '' );
            $tipo_grupo = sanitize_key( $item_data['tipo_grupo'] ?? 'adicional' ); // 'opcao', 'adicional', 'sabor'

            if ( empty( $nome_grupo ) || empty( $nome_exibicao ) ) {
                $errors[] = sprintf( __( 'Linha %d ignorada: "nome_grupo" e "nome_exibicao" são obrigatórios.', 'nativa-delivery' ), $row_index + 2 );
                continue;
            }

            // Validação de tipo_grupo
            if ( ! in_array( $tipo_grupo, array( 'opcao', 'adicional', 'sabor' ) ) ) {
                $errors[] = sprintf( __( 'Linha %d (Grupo: %s): "tipo_grupo" inválido ("%s"). Usando "adicional".', 'nativa-delivery' ), $row_index + 2, $nome_grupo, $tipo_grupo );
                $tipo_grupo = 'adicional';
            }

            // Campos opcionais/condicionais
            $min_selecao = absint( $item_data['min_selecao'] ?? 0 );
            $max_selecao = absint( $item_data['max_selecao'] ?? 0 );
            $minimo_gratis = absint( $item_data['minimo_gratis'] ?? 0 );
            $preco_sabor_adicional = floatval( str_replace( ',', '.', $item_data['preco_sabor_adicional'] ?? '0.00' ) );
            $permitir_quantidade_item = filter_var( ( $item_data['permitir_quantidade_item'] ?? false ), FILTER_VALIDATE_BOOLEAN );
            $grupo_disponibilidade = sanitize_key( $item_data['grupo_disponibilidade'] ?? 'disponivel' ); // 'disponivel', 'indisponivel', 'oculto'
            $itens_json = wp_unslash( $item_data['itens_json'] ?? '[]' ); // JSON string dos itens internos

            // Validação de grupo_disponibilidade
            if ( ! in_array( $grupo_disponibilidade, array( 'disponivel', 'indisponivel', 'oculto' ) ) ) {
                $errors[] = sprintf( __( 'Linha %d (Grupo: %s): "grupo_disponibilidade" inválido ("%s"). Usando "disponivel".', 'nativa-delivery' ), $row_index + 2, $nome_grupo, $grupo_disponibilidade );
                $grupo_disponibilidade = 'disponivel';
            }

            // Tenta encontrar um grupo existente pelo nome
            $existing_groups = get_posts( array(
                'post_type'      => 'nativa_adic_grupo',
                'title'          => $nome_grupo,
                'post_status'    => array( 'publish', 'pending', 'draft', 'auto-draft', 'future', 'private', 'inherit', 'trash' ),
                'posts_per_page' => 1,
                'fields'         => 'ids',
            ) );

            $post_id = 0;
            if ( ! empty( $existing_groups ) ) {
                $post_id = $existing_groups[0];
            }

            $post_data = array(
                'post_title'   => $nome_grupo,
                'post_type'    => 'nativa_adic_grupo',
                'post_status'  => 'publish',
            );

            if ( $post_id ) {
                $post_data['ID'] = $post_id;
                $result = wp_update_post( $post_data, true );
            } else {
                $result = wp_insert_post( $post_data, true );
            }

            if ( is_wp_error( $result ) ) {
                $errors[] = sprintf( __( 'Linha %d (Grupo: %s) falhou ao importar o Post Type: %s', 'nativa-delivery' ), $row_index + 2, $nome_grupo, $result->get_error_message() );
            } else {
                // Decodifica e sanitiza os itens do grupo
                $itens_array = json_decode( $itens_json, true );
                $json_last_error_msg = json_last_error_msg(); // Captura erro JSON

                if ( ! is_array( $itens_array ) || json_last_error() !== JSON_ERROR_NONE ) {
                    $errors[] = sprintf( __( 'Linha %d (Grupo: %s): "itens_json" inválido ou mal formatado. Erro JSON: %s. JSON recebido: %s', 'nativa-delivery' ), $row_index + 2, $nome_grupo, $json_last_error_msg, $itens_json );
                    // Continua processando o grupo, mas com itens vazios para evitar fatal error e permitir salvar outros campos.
                    $sanitized_itens = array(); 
                } else {
                    $sanitized_itens = array();
                    foreach ( $itens_array as $item_idx => $item ) { // Adicionado item_idx para depuração
                        $item_nome = sanitize_text_field( $item['nome'] ?? '' );
                        $item_preco = floatval( str_replace( ',', '.', $item['preco'] ?? '0.00' ) );
                        $item_disponibilidade = sanitize_key( $item['disponibilidade'] ?? 'disponivel' );

                        if ( empty( $item_nome ) ) {
                             $errors[] = sprintf( __( 'Linha %d (Grupo: %s, Item: %d): Nome do item de adicional é obrigatório.', 'nativa-delivery' ), $row_index + 2, $nome_grupo, $item_idx + 1 );
                             continue; // Pula este item, mas continua com o próximo
                        }
                        // Validação de item_disponibilidade
                        if ( ! in_array( $item_disponibilidade, array( 'disponivel', 'indisponivel', 'oculto' ) ) ) {
                            $errors[] = sprintf( __( 'Linha %d (Grupo: %s, Item: %d): Disponibilidade do item inválida ("%s"). Usando "disponivel".', 'nativa-delivery' ), $row_index + 2, $nome_grupo, $item_idx + 1, $item_disponibilidade );
                            $item_disponibilidade = 'disponivel';
                        }

                        $sanitized_itens[] = array(
                            'item_nome'          => $item_nome,
                            'item_preco'         => $item_preco,
                            'item_disponibilidade' => $item_disponibilidade,
                        );
                    }
                }
                
                // Atualiza campos ACF
                update_field( 'grupo_adicional_nome_exibicao', $nome_exibicao, $result );
                update_field( 'grupo_adicional_tipo_grupo', $tipo_grupo, $result );
                update_field( 'grupo_adicional_min_selecao', $min_selecao, $result );
                update_field( 'grupo_adicional_max_selecao', $max_selecao, $result );
                update_field( 'grupo_adicional_minimo_gratis', $minimo_gratis, $result );
                update_field( 'grupo_adicional_preco_sabor_adicional', $preco_sabor_adicional, $result );
                update_field( 'grupo_adicional_permitir_quantidade_item', $permitir_quantidade_item, $result );
                update_field( 'grupo_adicional_disponibilidade', $grupo_disponibilidade, $result );
                update_field( 'grupo_adicional_itens', $sanitized_itens, $result ); // Campo repetidor

                $processed_count++;
            }
        }

        return array(
            'processed_count' => $processed_count,
            'errors'          => $errors, // Retorna as mensagens de erro detalhadas
        );
    }
}