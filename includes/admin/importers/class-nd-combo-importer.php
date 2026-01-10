<?php
/**
 * Importador de Combos (Nativa Delivery).
 * * Lida com a lógica específica de importar Combos, incluindo a complexidade
 * dos "Passos do Combo" e a busca de produtos pelo nome.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Combo_Importer {

    /**
     * Processa os dados do CSV para Combos.
     *
     * @param array $csv_data Dados do CSV (linhas).
     * @param array $headers Cabeçalhos do CSV.
     * @return array Resultado da importação (processed_count, errors).
     */
    public function import_csv( $csv_data, $headers ) {
        $processed_count = 0;
        $errors = array();

        foreach ( $csv_data as $index => $row ) {
            // Mapeia o cabeçalho para o valor
            $row_data = array_combine( $headers, $row );
            $row_number = $index + 2; // +1 header, +1 array index 0

            // Validação básica: Nome do Combo é obrigatório
            if ( empty( $row_data['nome_combo'] ) ) {
                $errors[] = sprintf( __( 'Linha %d ignorada: Nome do Combo não informado.', 'nativa-delivery' ), $row_number );
                continue;
            }

            $combo_name = sanitize_text_field( $row_data['nome_combo'] );
            
            // Tenta encontrar o Combo existente pelo título
            $combo_id = 0;
            $existing_combo = get_page_by_title( $combo_name, OBJECT, 'nativa_combo' );
            
            if ( $existing_combo ) {
                $combo_id = $existing_combo->ID;
            } else {
                // Se não existe, cria um novo (opcional, dependendo da sua regra de negócio)
                // Para este exemplo, vamos focar em atualizar ou criar se não existir
                 $combo_id = wp_insert_post( array(
                    'post_title'  => $combo_name,
                    'post_type'   => 'nativa_combo',
                    'post_status' => 'publish',
                ));
            }

            if ( ! $combo_id || is_wp_error( $combo_id ) ) {
                $errors[] = sprintf( __( 'Linha %d: Erro ao criar/atualizar Combo "%s".', 'nativa-delivery' ), $row_number, $combo_name );
                continue;
            }

            // Atualiza meta dados simples
            if ( isset( $row_data['descricao'] ) ) {
                update_post_meta( $combo_id, 'nativa_combo_descricao', wp_kses_post( $row_data['descricao'] ) );
            }
            if ( isset( $row_data['preco_base_manual'] ) ) {
                // Converte vírgula para ponto se necessário para o banco
                $price = str_replace( ',', '.', $row_data['preco_base_manual'] );
                update_post_meta( $combo_id, 'nativa_combo_preco_base', floatval( $price ) );
            }
            if ( isset( $row_data['desconto_em_valor'] ) ) {
                $desc_val = str_replace( ',', '.', $row_data['desconto_em_valor'] );
                update_post_meta( $combo_id, 'nativa_combo_desconto_valor', floatval( $desc_val ) );
            }
             if ( isset( $row_data['percentual_desconto'] ) ) {
                $desc_perc = str_replace( ',', '.', $row_data['percentual_desconto'] );
                update_post_meta( $combo_id, 'nativa_combo_desconto_percentual', floatval( $desc_perc ) );
            }

            // --- Processamento Complexo: Passos do Combo (JSON) ---
            if ( ! empty( $row_data['passos_do_combo_json'] ) ) {
                // Decodifica o JSON vindo do CSV (remove barras invertidas extras se houver)
                $json_raw = stripslashes( $row_data['passos_do_combo_json'] );
                $steps_data = json_decode( $json_raw, true );

                if ( json_last_error() === JSON_ERROR_NONE && is_array( $steps_data ) ) {
                    $processed_steps = $this->process_combo_steps( $steps_data, $row_number, $combo_name, $errors );
                    
                    if ( ! empty( $processed_steps ) ) {
                        update_post_meta( $combo_id, 'nativa_combo_passos', $processed_steps );
                    }
                } else {
                    $errors[] = sprintf( __( 'Linha %d (Combo: %s): JSON de passos inválido.', 'nativa-delivery' ), $row_number, $combo_name );
                }
            }

            $processed_count++;
        }

        return array( 'processed_count' => $processed_count, 'errors' => $errors );
    }

    /**
     * Processa o array de passos e converte nomes de produtos em IDs.
     */
    private function process_combo_steps( $steps, $row_number, $combo_name, &$errors ) {
        $final_steps = array();

        foreach ( $steps as $step_index => $step ) {
            if ( empty( $step['produtos_permitidos_nomes'] ) ) {
                continue;
            }

            $product_ids = array();
            
            // CORREÇÃO CRÍTICA:
            // Usa Regex para separar por vírgula APENAS SE não estiver entre números.
            // (?<!\d) -> Não precedido por dígito
            // ,       -> A vírgula
            // (?!\d)  -> Não seguido por dígito
            // Isso preserva "1,5l" mas separa "X-Bacon, X-Salada"
            $product_names_raw = preg_split( '/(?<!\d),(?!\d)/', $step['produtos_permitidos_nomes'] );
            
            foreach ( $product_names_raw as $name ) {
                $name = trim( $name );
                if ( empty( $name ) ) continue;

                // Busca o produto pelo título exato
                $product = get_page_by_title( $name, OBJECT, 'nativa_produto' );

                if ( $product ) {
                    $product_ids[] = $product->ID;
                } else {
                    // Tenta uma busca mais flexível se falhar (ex: case insensitive)
                    $args = array(
                        'post_type' => 'nativa_produto',
                        'title' => $name,
                        'posts_per_page' => 1,
                        'post_status' => 'publish'
                    );
                    $query = new WP_Query($args);
                    
                    if( $query->have_posts() ) {
                        $product_ids[] = $query->posts[0]->ID;
                    } else {
                        // Loga erro mas não para o processo
                        $errors[] = sprintf( 
                            __( 'Linha %d (Combo: %s): Produto "%s" não encontrado para o passo "%s".', 'nativa-delivery' ), 
                            $row_number, 
                            $combo_name, 
                            $name,
                            isset($step['titulo']) ? $step['titulo'] : 'Sem título'
                        );
                    }
                }
            }

            // Reconstrói a estrutura do passo para o formato salvo no meta
            $final_steps[] = array(
                'titulo' => isset($step['titulo']) ? sanitize_text_field($step['titulo']) : '',
                'quantidade' => isset($step['quantidade']) ? intval($step['quantidade']) : 1,
                'obrigatorio' => isset($step['obrigatorio']) ? (bool)$step['obrigatorio'] : true,
                'produtos' => $product_ids // Array de IDs recuperados
            );
        }

        return $final_steps;
    }
}