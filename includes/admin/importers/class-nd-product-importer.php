<?php
/**
 * Classe para importar dados de Produtos via CSV.
 * VERSÃO ATUALIZADA: Mensagens de erro mais detalhadas e validação de IDs de grupos adicionais.
 * VERSÃO CORRIGIDA: Lógica de associação de categorias e tags aprimorada para garantir o ID correto.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/importers
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Product_Importer {

    public function import_csv( $csv_data, $headers ) {
        $processed_count = 0;
        $errors = array();

        // Cache para termos (categorias e tags)
        $term_cache = array(
            'category'  => array(),
            'post_tag'  => array(),
        );
        // Cache para IDs de Grupos de Adicionais
        $adicional_group_id_cache = array();

        foreach ( $csv_data as $row_index => $row ) {
            if ( count( $row ) !== count( $headers ) ) {
                $errors[] = sprintf( __( 'Linha %d ignorada: número de colunas inválido (%d colunas encontradas, %d esperadas).', 'nativa-delivery' ), $row_index + 2, count($row), count($headers) );
                continue;
            }

            $item_data = array_combine( $headers, $row );

            // Campos obrigatórios
            $nome_produto = sanitize_text_field( $item_data['nome'] ?? '' );
            $preco = floatval( str_replace( ',', '.', $item_data['preco'] ?? '0.00' ) );

            if ( empty( $nome_produto ) ) {
                $errors[] = sprintf( __( 'Linha %d ignorada: "nome" do produto é obrigatório.', 'nativa-delivery' ), $row_index + 2 );
                continue;
            }
            if ( $preco <= 0 ) {
                $errors[] = sprintf( __( 'Linha %d (Produto: %s) ignorada: "preco" do produto deve ser maior que zero.', 'nativa-delivery' ), $row_index + 2, $nome_produto );
                continue;
            }

            // Campos opcionais
            $promo_price_str = $item_data['preco_promocional'] ?? '';
            $preco_promocional = ! empty( $promo_price_str ) ? floatval( str_replace( ',', '.', $promo_price_str ) ) : 0;
            $descricao = sanitize_textarea_field( $item_data['descricao'] ?? '' );
            $disponibilidade = sanitize_key( $item_data['disponibilidade'] ?? 'disponivel' );
            $categorias_str = sanitize_text_field( $item_data['categorias'] ?? '' );
            $tags_str = sanitize_text_field( $item_data['tags'] ?? '' );
            $grupos_adicionais_str = sanitize_text_field( $item_data['grupos_adicionais'] ?? '' );

            // Validação de disponibilidade
            if ( ! in_array( $disponibilidade, array( 'disponivel', 'indisponivel', 'oculto' ) ) ) {
                $errors[] = sprintf( __( 'Linha %d (Produto: %s): Valor inválido para "disponibilidade". Usando "disponivel".', 'nativa-delivery' ), $row_index + 2, $nome_produto );
                $disponibilidade = 'disponivel';
            }

            // Tenta encontrar um produto existente pelo nome
            $existing_products = get_posts( array(
                'post_type'      => 'nativa_produto',
                'title'          => $nome_produto,
                'post_status'    => array( 'publish', 'pending', 'draft', 'auto-draft', 'future', 'private', 'inherit', 'trash' ),
                'posts_per_page' => 1,
                'fields'         => 'ids',
            ) );

            $post_id = 0;
            if ( ! empty( $existing_products ) ) {
                $post_id = $existing_products[0];
            }

            $post_data = array(
                'post_title'   => $nome_produto,
                'post_content' => $descricao,
                'post_type'    => 'nativa_produto',
                'post_status'  => 'publish',
            );

            if ( $post_id ) {
                $post_data['ID'] = $post_id;
                $result = wp_update_post( $post_data, true );
            } else {
                $result = wp_insert_post( $post_data, true );
            }

            if ( is_wp_error( $result ) ) {
                $errors[] = sprintf( __( 'Linha %d (Produto: %s) falhou ao importar: %s', 'nativa-delivery' ), $row_index + 2, $nome_produto, $result->get_error_message() );
            } else {
                // Atualiza campos ACF
                update_field( 'produto_preco', $preco, $result );
                update_field( 'produto_preco_promocional', $preco_promocional > 0 ? $preco_promocional : '', $result );
                update_field( 'produto_disponibilidade', $disponibilidade, $result );

                // --- INÍCIO DA CORREÇÃO: Lógica aprimorada para Categorias e Tags ---
                // Associa categorias (taxonomia 'category')
                $categories_to_assign = array();
                if ( ! empty( $categorias_str ) ) {
                    $category_names = array_map( 'trim', explode( ',', $categorias_str ) );
                    foreach ( $category_names as $cat_name ) {
                        if ( empty( $cat_name ) ) continue;

                        $term_id = 0;
                        if ( isset( $term_cache['category'][ $cat_name ] ) ) {
                            $term_id = $term_cache['category'][ $cat_name ];
                        } else {
                            $term_exists = term_exists( $cat_name, 'category' );
                            if ( $term_exists && is_array( $term_exists ) ) {
                                $term_id = (int) $term_exists['term_id'];
                            } else {
                                $new_term = wp_insert_term( $cat_name, 'category' );
                                if ( ! is_wp_error( $new_term ) ) {
                                    $term_id = (int) $new_term['term_id'];
                                } else {
                                    $errors[] = sprintf( __( 'Linha %d (Produto: %s): Erro ao criar categoria "%s": %s', 'nativa-delivery' ), $row_index + 2, $nome_produto, $cat_name, $new_term->get_error_message() );
                                }
                            }
                            if ( $term_id ) {
                                $term_cache['category'][ $cat_name ] = $term_id; // Atualiza o cache
                            }
                        }
                        if ( $term_id ) {
                            $categories_to_assign[] = $term_id;
                        }
                    }
                }
                wp_set_object_terms( $result, $categories_to_assign, 'category', false ); // 'false' para substituir, não anexar

                // Associa tags (taxonomia 'post_tag')
                $tags_to_assign = array();
                if ( ! empty( $tags_str ) ) {
                    $tag_names = array_map( 'trim', explode( ',', $tags_str ) );
                    foreach ( $tag_names as $tag_name ) {
                        if ( empty( $tag_name ) ) continue;

                        $term_id = 0;
                        if ( isset( $term_cache['post_tag'][ $tag_name ] ) ) {
                            $term_id = $term_cache['post_tag'][ $tag_name ];
                        } else {
                            $term_exists = term_exists( $tag_name, 'post_tag' );
                            if ( $term_exists && is_array( $term_exists ) ) {
                                $term_id = (int) $term_exists['term_id'];
                            } else {
                                $new_term = wp_insert_term( $tag_name, 'post_tag' );
                                if ( ! is_wp_error( $new_term ) ) {
                                    $term_id = (int) $new_term['term_id'];
                                } else {
                                    $errors[] = sprintf( __( 'Linha %d (Produto: %s): Erro ao criar tag "%s": %s', 'nativa-delivery' ), $row_index + 2, $nome_produto, $tag_name, $new_term->get_error_message() );
                                }
                            }
                            if ( $term_id ) {
                                $term_cache['post_tag'][ $tag_name ] = $term_id; // Atualiza o cache
                            }
                        }
                        if ( $term_id ) {
                            $tags_to_assign[] = $term_id;
                        }
                    }
                }
                wp_set_object_terms( $result, $tags_to_assign, 'post_tag', false ); // 'false' para substituir
                // --- FIM DA CORREÇÃO: Lógica aprimorada para Categorias e Tags ---

                // Associa grupos de adicionais (relacionamento de post_object)
                $adicional_group_ids_from_csv = array_filter( array_map( 'trim', explode( ',', $grupos_adicionais_str ) ) );
                $valid_adicional_groups = array();

                if ( ! empty( $adicional_group_ids_from_csv ) ) {
                    foreach ( $adicional_group_ids_from_csv as $group_id_str ) {
                        $group_id = absint( $group_id_str );
                        if ( $group_id === 0 ) {
                            $errors[] = sprintf( __( 'Linha %d (Produto: %s): ID de Grupo de Adicional inválido "%s".', 'nativa-delivery' ), $row_index + 2, $nome_produto, $group_id_str );
                            continue;
                        }

                        // Verifica se o ID já está no cache de grupos válidos
                        if ( isset( $adicional_group_id_cache[ $group_id ] ) ) {
                            $valid_adicional_groups[] = $group_id;
                            continue;
                        }

                        // Verifica se o CPT existe e é do tipo correto
                        $group_post = get_post( $group_id );
                        if ( $group_post && $group_post->post_type === 'nativa_adic_grupo' ) {
                            $valid_adicional_groups[] = $group_id;
                            $adicional_group_id_cache[ $group_id ] = true; // Adiciona ao cache
                        } else {
                            $errors[] = sprintf( __( 'Linha %d (Produto: %s): Grupo de Adicional com ID "%d" não encontrado ou não é um Grupo de Adicional válido.', 'nativa-delivery' ), $row_index + 2, $nome_produto, $group_id );
                        }
                    }
                }
                
                update_field( 'produto_grupos_adicionais', $valid_adicional_groups, $result );
                
                $processed_count++;
            }
        }

        return array(
            'processed_count' => $processed_count,
            'errors'          => $errors,
        );
    }
}