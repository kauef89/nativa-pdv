<?php
/**
 * Define os grupos de campos ACF para o CPT 'nativa_oferta'.
 * ... (histórico de versões anterior) ...
 * ATUALIZAÇÃO (Limites de Oferta): Adiciona o campo 'limite_usos_cliente' para
 * permitir a configuração de um limite de resgates por usuário, além do limite total.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( function_exists( 'acf_add_local_field_group' ) ) :

    acf_add_local_field_group( array(
        'key' => 'group_nativa_oferta_settings',
        'title' => 'Configurações da Oferta de Carrinho',
        'fields' => array(
            // Aba 1: O que será ofertado?
            array(
                'key' => 'field_oferta_tab_produto',
                'label' => 'Produto da Oferta',
                'type' => 'tab',
            ),
            array(
                'key' => 'field_oferta_produto_ofertado',
                'label' => 'Produto a ser Ofertado',
                'name' => 'produto_ofertado',
                'type' => 'post_object',
                'instructions' => 'Selecione o produto que será oferecido com desconto.',
                'required' => 1,
                'post_type' => array('nativa_produto'),
                'return_format' => 'id',
                'ui' => 1,
            ),
            array(
                'key' => 'field_oferta_preco_promocional',
                'label' => 'Preço Promocional',
                'name' => 'preco_promocional',
                'type' => 'number',
                'instructions' => 'Digite o preço especial para este produto APENAS nesta oferta.',
                'required' => 1,
                'prepend' => 'R$',
                'step' => '0.01',
            ),
            array(
                'key' => 'field_oferta_texto_chamada',
                'label' => 'Texto de Chamada da Oferta',
                'name' => 'texto_da_oferta',
                'type' => 'text',
                'instructions' => 'Ex: "Oferta especial para você! Leve uma porção de fritas por apenas..."',
                'required' => 1,
                'placeholder' => 'Aproveite! Leve uma sobremesa por apenas...'
            ),

            // Aba 2: Regras de Ativação
            array(
                'key' => 'field_oferta_tab_regras',
                'label' => 'Regras da Oferta',
                'type' => 'tab',
            ),
            array(
                'key' => 'field_oferta_regras_ativacao',
                'label' => 'Condições para Ativar a Oferta (SE)',
                'name' => 'regras_de_ativacao',
                'type' => 'repeater',
                'instructions' => 'A oferta aparecerá se TODAS estas condições forem verdadeiras.',
                'layout' => 'table',
                'button_label' => 'Adicionar Regra',
                'sub_fields' => array(
                    // Sub-campos de regras são definidos abaixo
                ),
            ),
            array(
                'key' => 'field_oferta_regras_exclusao',
                'label' => 'Condições de Exclusão (E NÃO SE)',
                'name' => 'regras_de_exclusao',
                'type' => 'repeater',
                'instructions' => 'A oferta NÃO aparecerá se QUALQUER uma destas condições for verdadeira.',
                'layout' => 'table',
                'button_label' => 'Adicionar Regra de Exclusão',
                'sub_fields' => array(
                    // Mesmos sub-campos das regras de ativação
                ),
            ),

            // Aba 3: Status e Limites
            array(
                'key' => 'field_oferta_tab_status',
                'label' => 'Status e Limites',
                'type' => 'tab',
            ),
            array(
                'key'               => 'field_nativa_oferta_status',
                'label'             => 'Status da Oferta',
                'name'              => 'oferta_status',
                'type'              => 'true_false',
                'instructions'      => 'Marque para ativar esta oferta.',
                'default_value'     => 1,
                'ui'                => 1,
                'ui_on_text'        => 'Ativa',
                'ui_off_text'       => 'Inativa',
            ),
            array(
                'key' => 'field_nativa_oferta_limite_usos',
                'label' => 'Limite Total de Usos',
                'name' => 'limite_total_usos',
                'type' => 'number',
                'instructions' => 'Quantas vezes esta oferta pode ser resgatada por <strong>todos os clientes</strong>. Deixe 0 para ilimitado.',
                'min' => 0,
                'step' => 1,
                'default_value' => 0,
                'wrapper' => array('width' => '50'),
            ),
            array(
                'key' => 'field_nativa_oferta_limite_usos_cliente',
                'label' => 'Limite de Usos por Cliente',
                'name' => 'limite_usos_cliente',
                'type' => 'number',
                'instructions' => 'Quantas vezes <strong>cada cliente</strong> pode resgatar esta oferta. Deixe 0 para ilimitado.',
                'min' => 0,
                'step' => 1,
                'default_value' => 1,
                'wrapper' => array('width' => '50'),
            ),
        ),
        'location' => array(
            array(
                array(
                    'param' => 'post_type',
                    'operator' => '==',
                    'value' => 'nativa_oferta',
                ),
            ),
        ),
        'style' => 'default',
        'label_placement' => 'top',
    ));

    // --- INÍCIO DA MODIFICAÇÃO: Definição dos sub-campos de regras ---
    $rule_sub_fields = array(
        // Seletor do Tipo de Regra
        array(
            'key' => 'field_oferta_regra_tipo',
            'label' => 'Tipo de Regra',
            'name' => 'tipo_regra',
            'type' => 'select',
            'choices' => array(
                'subtotal_carrinho' => 'Subtotal do Carrinho',
                'categoria_no_carrinho' => 'Itens de uma Categoria',
                'tag_no_carrinho' => 'Itens com uma Tag',
                'tipo_cliente' => 'Tipo de Cliente',
                'lista_cpf' => 'CPF está na Lista',
            ),
            'wrapper' => array('width' => '30%'),
        ),
        // Seletor de Condição (Operador)
        array(
            'key' => 'field_oferta_regra_operador',
            'label' => 'Condição',
            'name' => 'operador',
            'type' => 'select',
            'choices' => array(
                'maior_igual' => 'É maior ou igual a',
                'menor_igual' => 'É menor ou igual a',
                'igual' => 'É exatamente',
                'contem' => 'Contém o item',
                'nao_contem' => 'Não contém o item',
            ),
            'wrapper' => array('width' => '30%'),
            'conditional_logic' => array(array(array('field' => 'field_oferta_regra_tipo', 'operator' => '!=', 'value' => 'tipo_cliente'), array('field' => 'field_oferta_regra_tipo', 'operator' => '!=', 'value' => 'lista_cpf'))),
        ),
        // Campo de Valor Numérico (para subtotal, quantidade)
        array(
            'key' => 'field_oferta_regra_valor_numerico',
            'label' => 'Valor',
            'name' => 'valor',
            'type' => 'number',
            'prepend' => 'Qtd / R$',
            'wrapper' => array('width' => '40%'),
            'conditional_logic' => array(array(array('field' => 'field_oferta_regra_tipo', 'operator' => '==', 'value' => 'subtotal_carrinho'),), array(array('field' => 'field_oferta_regra_tipo', 'operator' => '==', 'value' => 'categoria_no_carrinho'),), array(array('field' => 'field_oferta_regra_tipo', 'operator' => '==', 'value' => 'tag_no_carrinho'),)),
        ),
        // Campo de Seleção de Categoria
        array(
            'key' => 'field_oferta_regra_valor_categoria',
            'label' => 'Categoria',
            'name' => 'valor_categoria',
            'type' => 'taxonomy',
            'taxonomy' => 'category',
            'field_type' => 'select',
            'return_format' => 'id',
            'wrapper' => array('width' => '40%'),
            'conditional_logic' => array(array(array('field' => 'field_oferta_regra_tipo', 'operator' => '==', 'value' => 'categoria_no_carrinho'))),
        ),
        // NOVO: Campo de Seleção de Tipo de Cliente
        array(
            'key' => 'field_oferta_regra_valor_cliente',
            'label' => 'Tipo de Cliente',
            'name' => 'valor_cliente',
            'type' => 'select',
            'choices' => array(
                'novo' => 'Novo (Primeira Compra)',
                'logado' => 'Logado (Qualquer)',
                'visitante' => 'Visitante (Não Logado)',
            ),
            'wrapper' => array('width' => '70%'),
            'conditional_logic' => array(array(array('field' => 'field_oferta_regra_tipo', 'operator' => '==', 'value' => 'tipo_cliente'))),
        ),
        // NOVO: Campo de Lista de CPFs
        array(
            'key' => 'field_oferta_regra_lista_cpf',
            'label' => 'Lista de CPFs',
            'name' => 'lista_cpf',
            'type' => 'textarea',
            'instructions' => 'Um CPF por linha, sem pontos ou traços.',
            'wrapper' => array('width' => '70%'),
            'conditional_logic' => array(array(array('field' => 'field_oferta_regra_tipo', 'operator' => '==', 'value' => 'lista_cpf'))),
        ),
    );
    // --- FIM DA MODIFICAÇÃO ---

    // Adiciona os sub-campos aos dois repetidores
    acf_add_local_field(array('parent' => 'field_oferta_regras_ativacao', 'key' => 'field_oferta_sub_ativacao', 'name' => 'regras', 'type' => 'group', 'sub_fields' => $rule_sub_fields, 'layout' => 'table'));
    acf_add_local_field(array('parent' => 'field_oferta_regras_exclusao', 'key' => 'field_oferta_sub_exclusao', 'name' => 'regras', 'type' => 'group', 'sub_fields' => $rule_sub_fields, 'layout' => 'table'));

endif;