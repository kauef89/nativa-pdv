<?php
/**
 * Define os grupos de campos ACF para o Custom Post Type 'nativa_cupom'.
 * VERSÃO ATUALIZADA: Adicionado campo de Limite de Uso (Ilimitado, Por Cliente, Geral).
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( function_exists( 'acf_add_local_field_group' ) ) :

    acf_add_local_field_group( array(
        'key'                   => 'group_nativa_cupom_settings',
        'title'                 => 'Configurações do Cupom',
        'fields'                => array(
            array(
                'key' => 'field_cupom_instrucao',
                'label' => 'Instrução',
                'name' => '',
                'type' => 'message',
                'message' => 'O <b>Código do Cupom</b> é o <b>Título</b> desta página (campo acima). Use este campo para definir o código que seu cliente irá digitar.',
                'new_lines' => 'wpautop',
                'esc_html' => 0,
            ),
            array(
                'key' => 'field_nativa_cupom_tipo_desconto',
                'label' => 'Tipo de Desconto',
                'name' => 'tipo_desconto',
                'type' => 'radio',
                'choices' => array(
                    'fixed' => 'Valor Fixo (R$)',
                    'percentage' => 'Percentual (%)',
                ),
                'layout' => 'horizontal',
                'return_format' => 'value',
                'default_value' => 'fixed',
                'wrapper' => array('width' => '50'),
            ),
            array(
                'key' => 'field_nativa_cupom_valor_desconto',
                'label' => 'Valor do Desconto',
                'name' => 'valor_desconto',
                'type' => 'number',
                'instructions' => 'Insira o valor do desconto. Ex: 10.00 para R$10 ou 10 para 10%.',
                'required' => 1,
                'prepend' => 'R$ / %',
                'min' => 0,
                'step' => '0.01',
                 'wrapper' => array('width' => '50'),
            ),
            array(
                'key' => 'field_nativa_cupom_valor_minimo',
                'label' => 'Gasto Mínimo',
                'name' => 'gasto_minimo',
                'type' => 'number',
                'instructions' => 'Opcional. O cupom só será válido para pedidos acima deste valor. Deixe 0 para não aplicar.',
                'prepend' => 'R$',
                'min' => 0,
                'step' => '0.01',
                'wrapper' => array('width' => '50'),
            ),
            array(
                'key' => 'field_nativa_cupom_data_validade',
                'label' => 'Data de Validade',
                'name' => 'data_de_validade',
                'type' => 'date_picker',
                'instructions' => 'Opcional. O cupom será inválido após esta data.',
                'display_format' => 'd/m/Y',
                'return_format' => 'Ymd',
                 'wrapper' => array('width' => '50'),
            ),
            // --- INÍCIO DA ATUALIZAÇÃO ---
            array(
                'key'               => 'field_nativa_cupom_limite_uso',
                'label'             => 'Limite de Uso',
                'name'              => 'limite_de_uso',
                'type'              => 'radio',
                'instructions'      => 'Defina como este cupom pode ser utilizado.',
                'required'          => 1,
                'choices'           => array(
                    'ilimitado'     => 'Ilimitado',
                    'por_cliente'   => 'Um uso por cliente (CPF)',
                    'geral'         => 'Um uso no total (geral)',
                ),
                'default_value'     => 'ilimitado',
                'layout'            => 'vertical',
                'return_format'     => 'value',
                'wrapper' => array('width' => '50'),
            ),
            // --- FIM DA ATUALIZAÇÃO ---
            array(
                'key'               => 'field_nativa_cupom_status',
                'label'             => 'Status',
                'name'              => 'cupom_status',
                'type'              => 'true_false',
                'instructions'      => 'Marque para ativar este cupom.',
                'required'          => 0,
                'message'           => '',
                'default_value'     => 1,
                'ui'                => 1,
                'ui_on_text'        => 'Ativo',
                'ui_off_text'       => 'Inativo',
                 'wrapper' => array('width' => '50'),
            ),
        ),
        'location'              => array(
            array(
                array(
                    'param'    => 'post_type',
                    'operator' => '==',
                    'value'    => 'nativa_cupom',
                ),
            ),
        ),
        'menu_order'            => 0,
        'position'              => 'normal',
        'style'                 => 'default',
        'label_placement'       => 'top',
        'instruction_placement' => 'label',
        'active'                => true,
    ) );

endif;