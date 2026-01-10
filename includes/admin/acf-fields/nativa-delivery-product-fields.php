<?php
/**
 * Define os grupos de campos ACF para o Custom Post Type 'nativa_produto'.
 * VERSÃO ATUALIZADA (FISCAL): Adiciona aba de dados fiscais para emissão de NFC-e (Simples Nacional).
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/acf-fields
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( function_exists( 'acf_add_local_field_group' ) ) :

    acf_add_local_field_group( array(
        'key'                   => 'group_nativa_delivery_product_fields',
        'title'                 => __( 'Configurações de Produto', 'nativa-delivery' ),
        'fields'                => array(
            
            // --- ABA GERAL (Comercial) ---
            array(
                'key' => 'tab_nativa_produto_geral',
                'label' => 'Geral',
                'type' => 'tab',
                'placement' => 'top',
                'endpoint' => 0,
            ),
            array(
                'key'               => 'field_nativa_produto_preco',
                'label'             => __( 'Preço (R$)', 'nativa-delivery' ),
                'name'              => 'produto_preco',
                'type'              => 'number',
                'instructions'      => __( 'Preço base de venda do produto.', 'nativa-delivery' ),
                'required'          => 1,
                'default_value'     => 0,
                'min'               => 0,
                'step'              => '0.01',
                'prepend'           => 'R$',
                'wrapper'           => array( 'width' => '50' ),
            ),
            array(
                'key'               => 'field_nativa_produto_preco_promocional',
                'label'             => __( 'Preço Promocional (R$)', 'nativa-delivery' ),
                'name'              => 'produto_preco_promocional',
                'type'              => 'number',
                'instructions'      => __( 'Se preenchido, será o preço de venda. Deixe vazio para usar o preço normal.', 'nativa-delivery' ),
                'required'          => 0,
                'min'               => 0,
                'step'              => '0.01',
                'prepend'           => 'R$',
                'wrapper'           => array( 'width' => '50' ),
            ),
            array(
                'key'               => 'field_nativa_produto_disponibilidade',
                'label'             => __( 'Disponibilidade', 'nativa-delivery' ),
                'name'              => 'produto_disponibilidade',
                'type'              => 'select',
                'required'          => 1,
                'default_value'     => 'disponivel',
                'choices'           => array(
                    'disponivel'   => __( 'Disponível (Visível e Selecionável)', 'nativa-delivery' ),
                    'indisponivel' => __( 'Indisponível (Visível, mas travado)', 'nativa-delivery' ),
                    'oculto'       => __( 'Oculto (Não aparece no cardápio)', 'nativa-delivery' ),
                ),
            ),
            array(
                'key'               => 'field_nativa_produto_grupos_adicionais',
                'label'             => __( 'Grupos de Adicionais', 'nativa-delivery' ),
                'name'              => 'produto_grupos_adicionais',
                'type'              => 'post_object',
                'instructions'      => __( 'Selecione os grupos de complementos (ex: Sabores, Bordas) para este produto.', 'nativa-delivery' ),
                'required'          => 0,
                'post_type'         => array( 'nativa_adic_grupo' ),
                'allow_null'        => 1,
                'multiple'          => 1,
                'return_format'     => 'id',
                'ui'                => 1,
                'show_in_rest'      => true,
            ),

            // --- ABA FISCAL (NFC-e / Simples Nacional) ---
            array(
                'key' => 'tab_nativa_produto_fiscal',
                'label' => 'Fiscal (NFC-e)',
                'type' => 'tab',
                'placement' => 'top',
                'endpoint' => 0,
            ),
            array(
                'key' => 'field_nativa_produto_ncm',
                'label' => 'NCM (Nomenclatura Comum do Mercosul)',
                'name' => 'produto_ncm',
                'type' => 'text',
                'instructions' => 'Obrigatório para nota fiscal. Ex: 2106.90.90 (Bebidas/Sorvetes) ou 2106.90.90 (Refeições). Consulte seu contador.',
                'required' => 0, // Pode deixar opcional no cadastro rápido, mas o sistema deve validar na emissão
                'placeholder' => '0000.00.00',
                'maxlength' => 10,
                'wrapper' => array( 'width' => '50' ),
            ),
            array(
                'key' => 'field_nativa_produto_cest',
                'label' => 'CEST (Código Subst. Tributária)',
                'name' => 'produto_cest',
                'type' => 'text',
                'instructions' => 'Preencher apenas se o produto tiver Substituição Tributária (CSOSN 500).',
                'placeholder' => '00.000.00',
                'maxlength' => 10,
                'wrapper' => array( 'width' => '50' ),
            ),
            array(
                'key' => 'field_nativa_produto_cfop',
                'label' => 'CFOP (Código Fiscal de Operações)',
                'name' => 'produto_cfop',
                'type' => 'select',
                'instructions' => 'Geralmente 5.102 (Venda) ou 5.405 (Venda com ST).',
                'required' => 1,
                'default_value' => '5102',
                'choices' => array(
                    '5102' => '5.102 - Venda de mercadoria adquirida ou recebida de terceiros',
                    '5405' => '5.405 - Venda de mercadoria adquirida ou recebida de terceiros com ST',
                    '5101' => '5.101 - Venda de produção do estabelecimento',
                ),
                'ui' => 1,
                'wrapper' => array( 'width' => '100' ),
            ),
            array(
                'key' => 'field_nativa_produto_origem',
                'label' => 'Origem da Mercadoria',
                'name' => 'produto_origem',
                'type' => 'select',
                'required' => 1,
                'default_value' => '0',
                'choices' => array(
                    '0' => '0 - Nacional',
                    '1' => '1 - Estrangeira (Importação direta)',
                    '2' => '2 - Estrangeira (Adquirida no mercado interno)',
                ),
                'wrapper' => array( 'width' => '50' ),
            ),
            array(
                'key' => 'field_nativa_produto_csosn',
                'label' => 'CSOSN (Situação Tributária - Simples Nacional)',
                'name' => 'produto_csosn',
                'type' => 'select',
                'instructions' => 'Define como o imposto é calculado.',
                'required' => 1,
                'default_value' => '102',
                'choices' => array(
                    '102' => '102 - Tributada pelo Simples Nacional sem permissão de crédito (Padrão)',
                    '500' => '500 - ICMS cobrado anteriormente por substituição tributária (ex: Bebidas Frias)',
                    '900' => '900 - Outros',
                ),
                'wrapper' => array( 'width' => '50' ),
            ),
        ),
        'location'              => array(
            array(
                array(
                    'param'    => 'post_type',
                    'operator' => '==',
                    'value'    => 'nativa_produto',
                ),
            ),
        ),
        'menu_order'            => 0,
        'position'              => 'normal',
        'style'                 => 'default',
        'label_placement'       => 'top',
        'instruction_placement' => 'label',
        'hide_on_screen'        => '',
        'active'                => true,
        'description'           => __( 'Campos de configuração do Produto (Comercial e Fiscal).', 'nativa-delivery' ),
    ) );

endif;