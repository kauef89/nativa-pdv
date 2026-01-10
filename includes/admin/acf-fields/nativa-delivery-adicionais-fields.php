<?php
/**
 * Define os grupos de campos ACF para o Custom Post Type 'nativa_adic_grupo'.
 * VERSÃO ATUALIZADA: Adiciona o Modo de Sugestão e simplifica a "Lista Definida" para um campo de texto.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( function_exists( 'acf_add_local_field_group' ) ) :

    acf_add_local_field_group( array(
        'key'                   => 'group_nativa_delivery_adicionais_group_fields',
        'title'                 => __( 'Configurações de Grupo de Adicionais', 'nativa-delivery' ),
        'fields'                => array(
            array(
                'key'               => 'field_nativa_adic_grupo_nome_exibicao',
                'label'             => __( 'Nome de Exibição (Frontend)', 'nativa-delivery' ),
                'name'              => 'grupo_adicional_nome_exibicao',
                'type'              => 'text',
                'instructions'      => __( 'Este nome será exibido para os clientes no frontend.', 'nativa-delivery' ),
                'required'          => 1,
                'placeholder'       => __( 'Ex: Escolha seu Sabor, Adicionais (Opcional)', 'nativa-delivery' ),
            ),
            array(
                'key' => 'field_nativa_adic_grupo_descricao',
                'label' => 'Descrição do Grupo',
                'name' => 'grupo_adicional_descricao',
                'type' => 'textarea',
                'instructions' => 'Esta descrição aparecerá abaixo do nome do grupo.',
                'required' => 0,
                'rows' => 2,
            ),
            array(
                'key'               => 'field_nativa_adic_grupo_tipo_grupo',
                'label'             => __( 'Tipo de Grupo', 'nativa-delivery' ),
                'name'              => 'grupo_adicional_tipo_grupo',
                'type'              => 'radio',
                'instructions'      => __( 'Define a natureza deste grupo de adicionais.', 'nativa-delivery' ),
                'required'          => 1,
                'choices'           => array(
                    'opcao'     => __( 'Opção (Seleção Única)', 'nativa-delivery' ),
                    'adicional' => __( 'Adicional (Múltipla Seleção)', 'nativa-delivery' ),
                    'sabor'     => __( 'Sabor (Múltipla Seleção com Mín. Grátis)', 'nativa-delivery' ),
                ),
                'default_value'     => 'adicional',
                'layout'            => 'vertical',
            ),
            array(
                'key' => 'field_nativa_adic_grupo_modo_sugestao',
                'label' => 'Modo de Sugestão ("Me dê uma sugestão!")',
                'name' => 'suggestion_mode',
                'type' => 'radio',
                'instructions' => 'Selecione como o botão de sugestão deve se comportar para este grupo.',
                'choices' => array(
                    'random' => 'Aleatório (seleciona itens aleatoriamente)',
                    'defined_list' => 'Lista Definida (use combinações pré-definidas)',
                    'best_sellers' => 'Mais Vendidos (sugere os itens mais populares)',
                ),
                'default_value' => 'random',
                'layout' => 'vertical',
                'conditional_logic' => array(
                    array(
                        array(
                            'field' => 'field_nativa_adic_grupo_tipo_grupo',
                            'operator' => '==',
                            'value' => 'sabor',
                        ),
                    ),
                ),
            ),
            // --- INÍCIO DA MODIFICAÇÃO ---
            array(
                'key' => 'field_nativa_adic_grupo_lista_definida_textarea',
                'label' => 'Combinações Pré-definidas',
                'name' => 'suggestion_defined_list_textarea',
                'type' => 'textarea',
                'instructions' => 'Digite as combinações de sabores, uma por linha. Separe os sabores em cada linha por vírgula. Ex:<br>Abacaxi, Coco ralado, Doce de leite<br>Brigadeiro, Morango',
                'rows' => 10,
                'conditional_logic' => array(
                    array(
                        array(
                            'field' => 'field_nativa_adic_grupo_modo_sugestao',
                            'operator' => '==',
                            'value' => 'defined_list',
                        ),
                    ),
                ),
            ),
            // --- FIM DA MODIFICAÇÃO ---
            array(
                'key'               => 'field_nativa_adic_grupo_min_selecao',
                'label'             => __( 'Mínimo de Seleções', 'nativa-delivery' ),
                'name'              => 'grupo_adicional_min_selecao',
                'type'              => 'number',
                'instructions'      => __( 'Número mínimo de itens que devem ser selecionados.', 'nativa-delivery' ),
                'required'          => 1,
                'default_value'     => 0,
                'min'               => 0,
                'conditional_logic' => array(
                    array(
                        array(
                            'field'    => 'field_nativa_adic_grupo_tipo_grupo',
                            'operator' => '!=',
                            'value'    => 'opcao',
                        ),
                    ),
                ),
            ),
            array(
                'key'               => 'field_nativa_adic_grupo_max_selecao',
                'label'             => __( 'Máximo de Seleções', 'nativa-delivery' ),
                'name'              => 'grupo_adicional_max_selecao',
                'type'              => 'number',
                'instructions'      => __( 'Número máximo de itens que podem ser selecionados.', 'nativa-delivery' ),
                'required'          => 1,
                'default_value'     => 0,
                'min'               => 0,
                'conditional_logic' => array(
                    array(
                        array(
                            'field'    => 'field_nativa_adic_grupo_tipo_grupo',
                            'operator' => '!=',
                            'value'    => 'opcao',
                        ),
                    ),
                ),
            ),
            array(
                'key'               => 'field_nativa_adic_grupo_minimo_gratis',
                'label'             => __( 'Máximo Grátis', 'nativa-delivery' ),
                'name'              => 'grupo_adicional_minimo_gratis',
                'type'              => 'number',
                'instructions'      => __( 'Número de "Sabores" que são grátis.', 'nativa-delivery' ),
                'conditional_logic' => array(
                    array(
                        array(
                            'field'    => 'field_nativa_adic_grupo_tipo_grupo',
                            'operator' => '==',
                            'value'    => 'sabor',
                        ),
                    ),
                ),
            ),
            array(
                'key'               => 'field_nativa_adic_grupo_preco_sabor_adicional',
                'label'             => __( 'Preço por Sabor Adicional', 'nativa-delivery' ),
                'name'              => 'grupo_adicional_preco_sabor_adicional',
                'type'              => 'number',
                'instructions'      => __( 'Preço de cada "Sabor" extra.', 'nativa-delivery' ),
                'prepend'           => 'R$',
                'conditional_logic' => array(
                    array(
                        array(
                            'field'    => 'field_nativa_adic_grupo_tipo_grupo',
                            'operator' => '==',
                            'value'    => 'sabor',
                        ),
                    ),
                ),
            ),
            array(
                'key'               => 'field_nativa_adic_grupo_permitir_quantidade_item',
                'label'             => __( 'Permitir Quantidade por Item', 'nativa-delivery' ),
                'name'              => 'grupo_adicional_permitir_quantidade_item',
                'type'              => 'true_false',
                'instructions'      => __( 'Permite selecionar quantidade para cada item (ex: 2x Cheddar).', 'nativa-delivery' ),
                'ui'                => 1,
                'ui_on_text'        => 'Sim',
                'ui_off_text'       => 'Não',
            ),
            array(
                'key'            => 'field_nativa_adic_grupo_itens',
                'label'          => __( 'Itens do Grupo', 'nativa-delivery' ),
                'name'           => 'grupo_adicional_itens',
                'type'           => 'repeater',
                'required'       => 1,
                'min'            => 1,
                'layout'         => 'table',
                'button_label'   => __( 'Adicionar Item', 'nativa-delivery' ),
                'sub_fields'     => array(
                    array(
                        'key'           => 'field_nativa_adic_item_nome',
                        'label'         => __( 'Nome do Item', 'nativa-delivery' ),
                        'name'          => 'item_nome',
                        'type'          => 'text',
                        'required'      => 1,
                    ),
                    array(
                        'key'               => 'field_nativa_adic_item_preco',
                        'label'             => __( 'Preço Adicional', 'nativa-delivery' ),
                        'name'              => 'item_preco',
                        'type'              => 'number',
                        'prepend'           => 'R$',
                    ),
                    array(
                        'key'               => 'field_nativa_adic_item_disponibilidade',
                        'label'             => __( 'Disponibilidade do Item', 'nativa-delivery' ),
                        'name'              => 'item_disponibilidade',
                        'type'              => 'select',
                        'choices'           => array(
                            'disponivel'   => __( 'Disponível', 'nativa-delivery' ),
                            'indisponivel' => __( 'Indisponível', 'nativa-delivery' ),
                            'oculto'       => __( 'Oculto', 'nativa-delivery' ),
                        ),
                    ),
                ),
            ),
            array(
                'key'           => 'field_nativa_adicional_grupo_disponibilidade',
                'label'         => __( 'Disponibilidade do Grupo', 'nativa-delivery' ),
                'name'          => 'grupo_disponibilidade',
                'type'          => 'select',
                'choices'       => array(
                    'disponivel'   => __( 'Disponível', 'nativa-delivery' ),
                    'oculto'       => __( 'Oculto', 'nativa-delivery' ),
                ),
            ),
        ),
        'location'              => array(
            array(
                array(
                    'param'    => 'post_type',
                    'operator' => '==',
                    'value'    => 'nativa_adic_grupo',
                ),
            ),
        ),
        'position'              => 'normal',
    ) );

endif;