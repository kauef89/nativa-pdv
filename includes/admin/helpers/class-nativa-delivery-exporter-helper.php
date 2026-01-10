<?php
/**
 * Classe de assistente para gerar exportações de CPTs para o formato CSV.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/helpers
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Nativa_Delivery_Exporter_Helper {

    /**
     * Ponto de entrada principal. Roteia para a função de geração de CSV correta com base no CPT.
     *
     * @param string $cpt_slug O slug do Custom Post Type a ser exportado.
     * @param string $export_type O tipo de exportação ('data' ou 'template').
     * @return string|WP_Error O conteúdo CSV formatado ou um objeto de erro.
     */
    public static function generate_csv_for_cpt( $cpt_slug, $export_type = 'data' ) {
        $method_name = "_generate_{$cpt_slug}_csv";

        if ( method_exists( __CLASS__, $method_name ) ) {
            return self::$method_name($export_type); // Passa o tipo de exportação
        }

        return new WP_Error( 'invalid_cpt', __( 'Tipo de item não suportado para exportação.', 'nativa-delivery' ) );
    }

    /**
     * Gera uma string CSV a partir de cabeçalhos e dados.
     *
     * @param array $headers Array com os nomes das colunas.
     * @param array $data    Array de arrays, onde cada array interno é uma linha.
     * @return string A string formatada em CSV.
     */
    private static function _format_to_csv_string( $headers, $data ) {
        $output = fopen( 'php://memory', 'w' );
        
        // Adiciona o BOM para garantir a codificação UTF-8 correta no Excel
        fprintf($output, chr(0xEF).chr(0xBB).chr(0xBF));
        
        // --- INÍCIO DA CORREÇÃO: Adicionado parâmetros explícitos para evitar Deprecated warning no PHP 8.1+ ---
        fputcsv( $output, $headers, ',', '"', '\\' );
        foreach ( $data as $row ) {
            fputcsv( $output, $row, ',', '"', '\\' );
        }
        // --- FIM DA CORREÇÃO ---
        
        rewind( $output );
        $csv_string = stream_get_contents( $output );
        fclose( $output );
        
        return $csv_string;
    }
    
    /**
     * Define os cabeçalhos para um CPT específico.
     */
    private static function _get_cpt_headers( $cpt_slug ) {
        switch ($cpt_slug) {
            case 'nativa_bairro':
                return ['nome', 'taxa_entrega', 'valor_minimo_frete_gratis'];
            case 'nativa_rua':
                return ['nome_rua', 'segmentos_json'];
            case 'nativa_produto':
                return ['nome', 'descricao', 'preco', 'preco_promocional', 'disponibilidade', 'categorias', 'tags', 'grupos_adicionais'];
            case 'nativa_adic_grupo':
                return ['nome_grupo', 'nome_exibicao', 'tipo_grupo', 'min_selecao', 'max_selecao', 'minimo_gratis', 'preco_sabor_adicional', 'permitir_quantidade_item', 'grupo_disponibilidade', 'itens_json'];
            case 'nativa_combo':
                return ['nome_combo', 'preco_base_manual', 'descricao', 'desconto_em_valor', 'percentual_desconto', 'preco_por_pessoa', 'passos_do_combo_json'];
            case 'nativa_cupom':
                return ['codigo_cupom', 'tipo_desconto', 'valor_desconto', 'gasto_minimo', 'data_de_validade', 'limite_de_uso', 'status'];
            case 'nativa_oferta':
                return ['nome_oferta', 'produto_ofertado_nome', 'preco_promocional', 'texto_da_oferta', 'status', 'limite_total_usos', 'limite_usos_cliente', 'regras_de_ativacao_json', 'regras_de_exclusao_json'];
            case 'nativa_loyalty':
                return ['produto_resgatavel', 'custo_em_pontos'];
            default:
                return [];
        }
    }


    // --- MÉTODOS DE GERAÇÃO ESPECÍFICOS PARA CADA CPT ---

    private static function _generate_nativa_bairro_csv( $export_type ) {
        $headers = self::_get_cpt_headers('nativa_bairro');
        $data = [];
        
        if ( $export_type === 'template' ) {
            return self::_format_to_csv_string($headers, $data);
        }

        $query = new WP_Query(['post_type' => 'nativa_bairro', 'posts_per_page' => -1, 'post_status' => 'publish']);

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                $data[] = [
                    'nome' => get_the_title(),
                    'taxa_entrega' => get_field('taxa_entrega', $post_id),
                    'valor_minimo_frete_gratis' => get_field('valor_minimo_frete_gratis', $post_id),
                ];
            }
        }
        wp_reset_postdata();
        return self::_format_to_csv_string($headers, $data);
    }

    private static function _generate_nativa_rua_csv( $export_type ) {
        $headers = self::_get_cpt_headers('nativa_rua');
        $data = [];
        
        if ( $export_type === 'template' ) {
            return self::_format_to_csv_string($headers, $data);
        }
        
        $query = new WP_Query(['post_type' => 'nativa_rua', 'posts_per_page' => -1, 'post_status' => 'publish']);

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                $segmentos_data = get_field('rua_segmentos', $post_id);
                $segmentos_json_array = [];
                if (is_array($segmentos_data)) {
                    foreach ($segmentos_data as $segmento) {
                        $bairro_id = $segmento['bairro_associado'];
                        $segmentos_json_array[] = [
                            'bairro_nome' => get_the_title($bairro_id),
                            'numero_inicial' => $segmento['numero_inicial'],
                            'numero_final' => $segmento['numero_final'],
                        ];
                    }
                }
                $data[] = [
                    'nome_rua' => get_the_title(),
                    'segmentos_json' => json_encode($segmentos_json_array, JSON_UNESCAPED_UNICODE),
                ];
            }
        }
        wp_reset_postdata();
        return self::_format_to_csv_string($headers, $data);
    }

    private static function _generate_nativa_produto_csv( $export_type ) {
        $headers = self::_get_cpt_headers('nativa_produto');
        $data = [];
        
        if ( $export_type === 'template' ) {
            return self::_format_to_csv_string($headers, $data);
        }
        
        $query = new WP_Query(['post_type' => 'nativa_produto', 'posts_per_page' => -1, 'post_status' => 'publish']);

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                
                // Formata categorias
                $cats = get_the_terms($post_id, 'category');
                $cat_names = $cats && !is_wp_error($cats) ? implode(', ', wp_list_pluck($cats, 'name')) : '';
                
                // Formata tags
                $tags = get_the_terms($post_id, 'post_tag');
                $tag_names = $tags && !is_wp_error($tags) ? implode(', ', wp_list_pluck($tags, 'name')) : '';
                
                // Formata grupos de adicionais (IDs)
                $grupos = get_field('produto_grupos_adicionais', $post_id);
                $grupos_ids = is_array($grupos) ? implode(', ', $grupos) : '';

                $data[] = [
                    'nome' => get_the_title(),
                    'descricao' => get_post_field('post_content', $post_id), // Usa post_content pois o campo 'descricao' não existe no CPT, e sim o conteúdo
                    'preco' => get_field('produto_preco', $post_id),
                    'preco_promocional' => get_field('produto_preco_promocional', $post_id),
                    'disponibilidade' => get_field('produto_disponibilidade', $post_id),
                    'categorias' => $cat_names,
                    'tags' => $tag_names,
                    'grupos_adicionais' => $grupos_ids,
                ];
            }
        }
        wp_reset_postdata();
        return self::_format_to_csv_string($headers, $data);
    }
    
    private static function _generate_nativa_adic_grupo_csv( $export_type ) {
        $headers = self::_get_cpt_headers('nativa_adic_grupo');
        $data = [];
        
        if ( $export_type === 'template' ) {
            return self::_format_to_csv_string($headers, $data);
        }
        
        $query = new WP_Query(['post_type' => 'nativa_adic_grupo', 'posts_per_page' => -1, 'post_status' => 'publish']);

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                $itens_data = get_field('grupo_adicional_itens', $post_id);
                $itens_json_array = [];
                if (is_array($itens_data)) {
                    foreach ($itens_data as $item) {
                        $itens_json_array[] = [
                            'nome' => $item['item_nome'],
                            'preco' => $item['item_preco'],
                            'disponibilidade' => $item['item_disponibilidade'],
                        ];
                    }
                }
                
                $data[] = [
                    'nome_grupo' => get_the_title(),
                    'nome_exibicao' => get_field('grupo_adicional_nome_exibicao', $post_id),
                    'tipo_grupo' => get_field('grupo_adicional_tipo_grupo', $post_id),
                    'min_selecao' => get_field('grupo_adicional_min_selecao', $post_id),
                    'max_selecao' => get_field('grupo_adicional_max_selecao', $post_id),
                    'minimo_gratis' => get_field('grupo_adicional_minimo_gratis', $post_id),
                    'preco_sabor_adicional' => get_field('grupo_adicional_preco_sabor_adicional', $post_id),
                    'permitir_quantidade_item' => get_field('grupo_adicional_permitir_quantidade_item', $post_id) ? 'true' : 'false',
                    'grupo_disponibilidade' => get_field('grupo_adicional_disponibilidade', $post_id),
                    'itens_json' => json_encode($itens_json_array, JSON_UNESCAPED_UNICODE),
                ];
            }
        }
        wp_reset_postdata();
        return self::_format_to_csv_string($headers, $data);
    }
    
    private static function _generate_nativa_combo_csv( $export_type ) {
        $headers = self::_get_cpt_headers('nativa_combo');
        $data = [];
        
        if ( $export_type === 'template' ) {
            return self::_format_to_csv_string($headers, $data);
        }
        
        $query = new WP_Query(['post_type' => 'nativa_combo', 'posts_per_page' => -1, 'post_status' => 'publish']);

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                $passos_data = get_field('passos_do_combo', $post_id);
                $passos_json_array = [];
                if (is_array($passos_data)) {
                    foreach ($passos_data as $passo) {
                        $produtos_permitidos_nomes = array_map(function($id) {
                            return get_the_title($id);
                        }, $passo['produtos_permitidos'] ?? []);
                        $passos_json_array[] = [
                            'titulo' => $passo['passo_titulo'],
                            'quantidade' => $passo['quantidade'],
                            'produtos_permitidos_nomes' => implode(', ', $produtos_permitidos_nomes),
                        ];
                    }
                }
                
                $data[] = [
                    'nome_combo' => get_the_title(),
                    'preco_base_manual' => get_field('preco_base_manual', $post_id),
                    'descricao' => get_post_field('post_content', $post_id),
                    'desconto_em_valor' => get_field('desconto_em_valor', $post_id),
                    'percentual_desconto' => get_field('percentual_desconto', $post_id),
                    'preco_por_pessoa' => get_field('preco_por_pessoa', $post_id),
                    'passos_do_combo_json' => json_encode($passos_json_array, JSON_UNESCAPED_UNICODE),
                ];
            }
        }
        wp_reset_postdata();
        return self::_format_to_csv_string($headers, $data);
    }
    
    private static function _generate_nativa_cupom_csv( $export_type ) {
        $headers = self::_get_cpt_headers('nativa_cupom');
        $data = [];
        
        if ( $export_type === 'template' ) {
            return self::_format_to_csv_string($headers, $data);
        }

        $query = new WP_Query(['post_type' => 'nativa_cupom', 'posts_per_page' => -1, 'post_status' => 'publish']);

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                $data[] = [
                    'codigo_cupom' => get_the_title(),
                    'tipo_desconto' => get_field('tipo_desconto', $post_id),
                    'valor_desconto' => get_field('valor_desconto', $post_id),
                    'gasto_minimo' => get_field('gasto_minimo', $post_id),
                    'data_de_validade' => get_field('data_de_validade', $post_id),
                    'limite_de_uso' => get_field('limite_de_uso', $post_id),
                    'status' => get_field('cupom_status', $post_id) ? 'ativo' : 'inativo',
                ];
            }
        }
        wp_reset_postdata();
        return self::_format_to_csv_string($headers, $data);
    }
    
    private static function _generate_nativa_oferta_csv( $export_type ) {
        $headers = self::_get_cpt_headers('nativa_oferta');
        $data = [];
        
        if ( $export_type === 'template' ) {
            return self::_format_to_csv_string($headers, $data);
        }

        $query = new WP_Query(['post_type' => 'nativa_oferta', 'posts_per_page' => -1, 'post_status' => 'publish']);

        if ($query->have_posts()) {
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                
                $produto_ofertado_id = get_field('produto_ofertado', $post_id);
                $produto_ofertado_nome = $produto_ofertado_id ? get_the_title($produto_ofertado_id) : '';

                $regras_ativacao_data = get_field('regras_de_ativacao', $post_id);
                $regras_exclusao_data = get_field('regras_de_exclusao', $post_id);
                
                // Helper para formatar o campo de regras para JSON
                $format_rules = function($rules_data) {
                    if (!is_array($rules_data)) return '[]';
                    $formatted_rules = [];
                    foreach ($rules_data as $rule_group) {
                        $rule = $rule_group['regras'] ?? [];
                        if (empty($rule)) continue;
                        
                        $formatted_rule = [
                            'tipo_regra' => $rule['tipo_regra'] ?? '',
                            'operador' => $rule['operador'] ?? '',
                        ];
                        
                        if ($formatted_rule['tipo_regra'] === 'subtotal_carrinho') {
                            $formatted_rule['valor'] = $rule['valor'] ?? '';
                        } elseif (in_array($formatted_rule['tipo_regra'], ['categoria_no_carrinho', 'tag_no_carrinho'])) {
                            $term_id = $rule['valor_categoria'] ?? 0;
                            $term = get_term($term_id);
                            $formatted_rule['valor_categoria_nome'] = $term && !is_wp_error($term) ? $term->name : '';
                            $formatted_rule['valor'] = $rule['valor'] ?? '';
                        } elseif ($formatted_rule['tipo_regra'] === 'tipo_cliente') {
                            $formatted_rule['valor_cliente'] = $rule['valor_cliente'] ?? '';
                        } elseif ($formatted_rule['tipo_regra'] === 'lista_cpf') {
                            $formatted_rule['lista_cpf'] = $rule['lista_cpf'] ?? '';
                        }
                        
                        $formatted_rules[] = $formatted_rule;
                    }
                    return json_encode($formatted_rules, JSON_UNESCAPED_UNICODE);
                };

                $data[] = [
                    'nome_oferta' => get_the_title(),
                    'produto_ofertado_nome' => $produto_ofertado_nome,
                    'preco_promocional' => get_field('preco_promocional', $post_id),
                    'texto_da_oferta' => get_field('texto_da_oferta', $post_id),
                    'status' => get_field('oferta_status', $post_id) ? 'ativo' : 'inativo',
                    'limite_total_usos' => get_field('limite_total_usos', $post_id),
                    'limite_usos_cliente' => get_field('limite_usos_cliente', $post_id),
                    'regras_de_ativacao_json' => $format_rules($regras_ativacao_data),
                    'regras_de_exclusao_json' => $format_rules($regras_exclusao_data),
                ];
            }
        }
        wp_reset_postdata();
        return self::_format_to_csv_string($headers, $data);
    }

    private static function _generate_nativa_loyalty_csv( $export_type ) {
        $headers = self::_get_cpt_headers('nativa_loyalty');
        $data = [];
        
        if ( $export_type === 'template' ) {
            return self::_format_to_csv_string($headers, $data);
        }
        
        // Dados de Fidelidade estão na página de Opções, não em um CPT.
        $redemption_table = get_field('redemption_table', 'option');

        if (is_array($redemption_table)) {
            foreach ($redemption_table as $item) {
                $produto_id = $item['produto_resgatavel'] ?? 0;
                $produto_nome = $produto_id ? get_the_title($produto_id) : 'Produto Não Encontrado';
                $data[] = [
                    'produto_resgatavel' => $produto_nome,
                    'custo_em_pontos' => $item['custo_em_pontos'] ?? 0,
                ];
            }
        }

        return self::_format_to_csv_string($headers, $data);
    }
    
    // Métodos sem exportação real (retornam template vazio)
    private static function _generate_template_only_cpt( $cpt_slug, $export_type ) {
         $headers = self::_get_cpt_headers($cpt_slug);
         $data = [];
         return self::_format_to_csv_string($headers, $data);
    }
    
}