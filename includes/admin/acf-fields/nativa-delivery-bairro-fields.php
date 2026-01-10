<?php
/**
 * Define os campos ACF para o Custom Post Type 'nativa_bairro'.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/acf-fields
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( function_exists( 'acf_add_local_field_group' ) ) {

    acf_add_local_field_group( array(
        'key'                   => 'group_nativa_bairro_settings',
        'title'                 => 'Configurações do Bairro',
        'fields'                => array(
            array(
                'key'               => 'field_nativa_bairro_taxa_entrega',
                'label'             => 'Taxa de Entrega',
                'name'              => 'taxa_entrega',
                'type'              => 'number',
                'instructions'      => 'Valor da taxa de entrega para este bairro (ex: 5.00 para R$ 5,00).',
                'required'          => 1,
                'conditional_logic' => 0,
                'wrapper'           => array(
                    'width' => '50',
                    'class' => '',
                    'id'    => '',
                ),
                'default_value'     => 0.00,
                'placeholder'       => '0.00',
                'prepend'           => 'R$',
                'append'            => '',
                'min'               => 0,
                'step'              => '0.01',
            ),
            array(
                'key'               => 'field_nativa_bairro_valor_minimo_frete_gratis',
                'label'             => 'Valor Mínimo para Frete Grátis',
                'name'              => 'valor_minimo_frete_gratis',
                'type'              => 'number',
                'instructions'      => 'Valor mínimo do pedido para que o frete seja grátis neste bairro (ex: 50.00 para R$ 50,00). Deixe 0 se não houver frete grátis por valor.',
                'required'          => 0,
                'conditional_logic' => 0,
                'wrapper'           => array(
                    'width' => '50',
                    'class' => '',
                    'id'    => '',
                ),
                'default_value'     => 0.00,
                'placeholder'       => '0.00',
                'prepend'           => 'R$',
                'append'            => '',
                'min'               => 0,
                'step'              => '0.01',
            ),
        ),
        'location'              => array(
            array(
                array(
                    'param'    => 'post_type',
                    'operator' => '==',
                    'value'    => 'nativa_bairro',
                ),
            ),
        ),
        'menu_order'            => 0,
        'position'              => 'normal',
        'style'                 => 'default',
        'label_placement'       => 'top',
        'instruction_placement' => 'label',
        'hide_on_screen'        => array( 'the_content', 'excerpt', 'discussion', 'comments', 'revisions', 'slug', 'author', 'format', 'page_attributes', 'featured_image', 'categories', 'tags', 'send-trackbacks' ),
        'active'                => true,
        'description'           => '',
    ) );

}