<?php
/**
 * Define os campos ACF para a página de configurações de Fidelidade.
 * VERSÃO FINAL: Todos os campos da página são gerenciados pelo ACF para consistência.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( function_exists( 'acf_add_local_field_group' ) ) :

    acf_add_local_field_group( array(
        'key' => 'group_nativa_loyalty_settings',
        'title' => 'Campos de Configuração de Fidelidade',
        'fields' => array(
            array(
                'key' => 'field_loyalty_points_per_real',
                'label' => 'Pontos por R$ 1,00 gasto',
                'name' => 'points_per_real',
                'type' => 'number',
                'instructions' => 'Digite quantos pontos o cliente ganha a cada R$ 1,00 gasto no subtotal dos produtos (não inclui frete).',
                'required' => 1,
                'default_value' => 1,
                'min' => 0,
                'step' => 0.1,
            ),
            array(
                'key' => 'field_loyalty_max_redemptions',
                'label' => 'Máximo de Resgates por Pedido',
                'name' => 'max_redemptions_per_order',
                'type' => 'number',
                'instructions' => 'Defina quantos produtos de resgate um cliente pode adicionar a um único pedido.',
                'required' => 1,
                'default_value' => 1,
                'min' => 1,
                'step' => 1,
            ),
            array(
                'key' => 'field_loyalty_redemption_table',
                'label' => 'Tabela de Resgate de Produtos',
                'name' => 'redemption_table',
                'type' => 'repeater',
                'instructions' => 'Adicione os produtos que podem ser resgatados com pontos.',
                'required' => 0,
                'layout' => 'table',
                'button_label' => 'Adicionar Recompensa',
                'sub_fields' => array(
                    array(
                        'key' => 'field_loyalty_repeater_product',
                        'label' => 'Produto',
                        'name' => 'produto_resgatavel',
                        'type' => 'post_object',
                        'post_type' => array(
                            0 => 'nativa_produto',
                        ),
                        'allow_null' => 0,
                        'multiple' => 0,
                        'return_format' => 'id',
                        'ui' => 1,
                        'wrapper' => array(
                            'width' => '60',
                        ),
                    ),
                    array(
                        'key' => 'field_loyalty_repeater_points',
                        'label' => 'Custo em Pontos',
                        'name' => 'custo_em_pontos',
                        'type' => 'number',
                        'min' => 1,
                        'required' => 1,
                        'wrapper' => array(
                            'width' => '40',
                        ),
                    ),
                ),
            ),
        ),
        'location' => array(
            array(
                array(
                    'param' => 'options_page',
                    'operator' => '==',
                    'value' => 'nativa-delivery-loyalty-settings', // O slug da nossa página de opções.
                ),
            ),
        ),
        'menu_order' => 0,
        'position' => 'normal',
        'style' => 'default',
        'label_placement' => 'top',
        'instruction_placement' => 'label',
        'hide_on_screen' => '',
        'active' => true,
        'description' => '',
    ) );

endif;