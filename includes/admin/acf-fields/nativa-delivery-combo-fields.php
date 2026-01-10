<?php
/**
 * Define os grupos de campos ACF para o Custom Post Type 'nativa_combo'.
 * VERSÃO REVISADA: Usa Desconto em Valor (R$) como funcional e Percentual (%) como ilustrativo.
 * VERSÃO CORRIGIDA: Habilita o campo de relacionamento na API REST para compatibilidade com o editor de blocos.
 * VERSÃO CORRIGIDA 2: Altera a posição dos campos para 'normal' para evitar conflito com a API REST do editor.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( function_exists( 'acf_add_local_field_group' ) ) :

    acf_add_local_field_group( array(
        'key' => 'group_nativa_delivery_combo_fields',
        'title' => 'Configurações do Combo',
        'fields' => array(
            // NOVO CAMPO FUNCIONAL: Desconto em Valor (R$)
            array(
                'key' => 'field_combo_desconto_em_valor',
                'label' => 'Desconto em Valor (R$)',
                'name' => 'desconto_em_valor',
                'type' => 'number',
                'instructions' => 'Este é o valor REAL de desconto que será subtraído do total dos itens do combo. Ex: 10.50',
                'required' => 1,
                'prepend' => 'R$',
                'step' => '0.01',
                'min' => 0.01,
                'wrapper' => array('width' => '50'),
            ),
            // Campo ILUSTRATIVO: Percentual de Desconto (%)
            array(
                'key' => 'field_combo_percentual_desconto',
                'label' => 'Percentual de Desconto (Ilustrativo)',
                'name' => 'percentual_desconto',
                'type' => 'number',
                'instructions' => 'Apenas para exibição no card do combo (ex: "20% OFF"). Não afeta o cálculo do preço.',
                'required' => 0,
                'append' => '%',
                'min' => 1,
                'max' => 100,
                'wrapper' => array('width' => '50'),
            ),
            // Campo Preço por Pessoa (mantido)
            array(
                'key' => 'field_combo_preco_por_pessoa',
                'label' => 'Preço por Pessoa',
                'name' => 'preco_por_pessoa',
                'type' => 'number',
                'instructions' => 'Valor informativo para o cliente, se aplicável.',
                'prepend' => 'R$',
                'step' => '0.01',
                'wrapper' => array('width' => '50'),
            ),
            // Campo informativo do Preço Base (manual)
        array(
            'key' => 'field_combo_preco_base_manual', // Nova chave para evitar cache
            'label' => 'Preço Base do Combo (Manual)',
            'name' => 'preco_base_manual', // Novo nome do campo
            'type' => 'number',
            'instructions' => 'Calcule e insira aqui a soma do preço base dos itens do combo. Ex: 10.50',
            'required' => 1,
            'prepend' => 'R$',
            'step' => '0.01',
            'min' => 0,
            'wrapper' => array('width' => '50'),
        ),
            // Campo Repetidor para os Passos do Combo (mantido)
            array(
                'key' => 'field_combo_passos',
                'label' => 'Passos de Montagem do Combo',
                'name' => 'passos_do_combo',
                'type' => 'repeater',
                'instructions' => 'Crie os passos que o cliente seguirá para montar o combo.',
                'layout' => 'block',
                'button_label' => 'Adicionar Passo',
                'sub_fields' => array(
                    array(
                        'key' => 'field_passo_titulo',
                        'label' => 'Título do Passo',
                        'name' => 'passo_titulo',
                        'type' => 'text',
                        'instructions' => 'Ex: "Passo 1: Escolha 2 pastéis salgados"',
                        'required' => 1,
                    ),
                    array(
                        'key' => 'field_passo_produtos_permitidos',
                        'label' => 'Produtos Permitidos (Opções)',
                        'name' => 'produtos_permitidos',
                        'type' => 'relationship',
                        'post_type' => array('nativa_produto'),
                        'instructions' => 'Selecione um ou mais produtos que o cliente pode escolher neste passo. IMPORTANTE: Todos os produtos aqui devem ter o mesmo preço base.',
                        'required' => 1,
                        'return_format' => 'id',
                        'multiple' => 1,
                        'ui' => 1,
                        'show_in_rest' => true,
                    ),
                    array(
                        'key' => 'field_passo_quantidade',
                        'label' => 'Quantidade a ser escolhida',
                        'name' => 'quantidade',
                        'type' => 'number',
                        'instructions' => 'Quantos itens desta lista o cliente deve escolher.',
                        'required' => 1,
                        'default_value' => 1,
                        'min' => 1,
                    ),
                ),
            ),
        ),
        'location' => array(
            array(
                array(
                    'param' => 'post_type',
                    'operator' => '==',
                    'value' => 'nativa_combo',
                ),
            ),
        ),
        'menu_order' => 0,
        'position' => 'normal', // --- INÍCIO E FIM DA MODIFICAÇÃO ---
        'style' => 'default',
    ) );

endif;