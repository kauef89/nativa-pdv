<?php
/**
 * Funções auxiliares para validação de dados.
 * VERSÃO ATUALIZADA: Lógica de validação de CPF implementada.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/helpers
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Validation_Helper {
    
    /**
     * Valida um número de CPF.
     *
     * @param string $cpf O CPF a ser validado.
     * @return bool True se o CPF for válido, false caso contrário.
     */
    public static function validate_cpf( $cpf ) {
        // 1. Limpa o CPF, removendo caracteres não numéricos.
        $cpf = preg_replace( '/[^0-9]/is', '', $cpf );

        // 2. Verifica se o CPF tem 11 dígitos.
        if ( strlen( $cpf ) != 11 ) {
            return false;
        }

        // 3. Verifica se o CPF não é uma sequência de dígitos repetidos (ex: 111.111.111-11).
        if ( preg_match( '/(\d)\1{10}/', $cpf ) ) {
            return false;
        }

        // 4. Calcula os dígitos verificadores para validar o CPF.
        for ( $t = 9; $t < 11; $t++ ) {
            for ( $d = 0, $c = 0; $c < $t; $c++ ) {
                $d += $cpf[ $c ] * ( ( $t + 1 ) - $c );
            }
            $d = ( ( 10 * $d ) % 11 ) % 10;
            if ( $cpf[ $c ] != $d ) {
                return false;
            }
        }
        
        return true;
    }

    /**
     * Valida as seleções de adicionais para um produto contra as regras do servidor.
     *
     * @param int $product_id O ID do produto.
     * @param array|null $selected_addons Os adicionais selecionados enviados pelo cliente.
     * @return true|WP_Error Retorna true se for válido, ou um objeto WP_Error em caso de falha.
     */
    public static function validate_addon_selections( $product_id, $selected_addons ) {
        $product_addon_group_ids = get_field('produto_grupos_adicionais', $product_id);

        if ( empty( $product_addon_group_ids ) ) {
            return true; // Produto não tem grupos de adicionais, então é válido.
        }

        if ( ! is_array( $selected_addons ) ) {
            $selected_addons = array();
        }

        foreach ( $product_addon_group_ids as $group_id ) {
            $group_data = get_fields($group_id);
            // --- INÍCIO DA MODIFICAÇÃO ---
            if ( ! $group_data || ($group_data['grupo_adicional_disponibilidade'] ?? 'disponivel') === 'oculto' ) {
            // --- FIM DA MODIFICAÇÃO ---
                continue;
            }

            $selections = $selected_addons[$group_id]['items'] ?? array();
            
            $min = (int) ($group_data['grupo_adicional_min_selecao'] ?? 0);
            $max = (int) ($group_data['grupo_adicional_max_selecao'] ?? 0);
            $is_option_type = ($group_data['grupo_adicional_tipo_grupo'] ?? 'adicional') === 'opcao';
            
            $effective_min = $is_option_type ? 1 : $min;
            $effective_max = $is_option_type ? 1 : ($max === 0 ? INF : $max);

            $current_selection_count = 0;
            if ( ! empty( $group_data['grupo_adicional_permitir_quantidade_item'] ) ) {
                $current_selection_count = array_reduce($selections, function($sum, $item) {
                    return $sum + ($item['itemQuantity'] ?? 0);
                }, 0);
            } else {
                $current_selection_count = count($selections);
            }

            if ( $current_selection_count < $effective_min ) {
                return new WP_Error('addon_validation_failed', 'Seleção inválida para o grupo "' . $group_data['grupo_adicional_nome_exibicao'] . '". Mínimo de ' . $effective_min . ' item(ns) requerido.');
            }

            if ( $current_selection_count > $effective_max ) {
                return new WP_Error('addon_validation_failed', 'Seleção inválida para o grupo "' . $group_data['grupo_adicional_nome_exibicao'] . '". Máximo de ' . $effective_max . ' item(ns) permitido.');
            }
        }

        return true;
    }

    /**
     * Verifica se uma rua pertence a um determinado bairro.
     *
     * @param string $street_name O nome da rua a ser verificada.
     * @param int $bairro_id O ID do post do bairro.
     * @return bool True se a rua pertencer ao bairro, false caso contrário.
     */
    public static function is_street_in_bairro( $street_name, $bairro_id ) {
        if ( empty( $street_name ) || empty( $bairro_id ) ) {
            return false;
        }

        $decoded_street_name = urldecode($street_name);
        $street_post = get_page_by_title( $decoded_street_name, OBJECT, 'nativa_rua' );

        if ( ! $street_post ) {
            return false;
        }

        $segmentos = get_field( 'rua_segmentos', $street_post->ID );

        if ( is_array( $segmentos ) ) {
            foreach ( $segmentos as $segmento ) {
                if ( isset( $segmento['bairro_associado'] ) && (int) $segmento['bairro_associado'] === (int) $bairro_id ) {
                    return true;
                }
            }
        }

        return false;
    }
    
}