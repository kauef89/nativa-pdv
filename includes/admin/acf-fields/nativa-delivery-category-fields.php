<?php
/**
 * NOVO ARQUIVO
 * Define os campos ACF para a taxonomia 'category'.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/acf-fields
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( function_exists( 'acf_add_local_field_group' ) ) :

    acf_add_local_field_group( array(
        'key' => 'group_nativa_category_fields',
        'title' => 'Campos da Categoria',
        'fields' => array(
            array(
                'key' => 'field_category_image',
                'label' => 'Imagem da Categoria',
                'name' => 'category_image',
                'type' => 'image',
                'instructions' => 'Envie uma imagem que represente esta categoria. Tamanho recomendado: 120x120 pixels.',
                'required' => 0,
                'return_format' => 'url',
                'preview_size' => 'thumbnail',
                'library' => 'all',
                'min_width' => 120,
                'min_height' => 120,
            ),
        ),
        'location' => array(
            array(
                array(
                    'param' => 'taxonomy',
                    'operator' => '==',
                    'value' => 'category',
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
        'description' => 'Adiciona campos personalizados para as categorias de produtos.',
    ));

endif;