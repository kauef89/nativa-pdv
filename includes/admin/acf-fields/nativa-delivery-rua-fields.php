<?php
/**
 * Define os grupos de campos ACF para o Custom Post Type 'nativa_rua'.
 * VERSÃO ATUALIZADA: Campo 'bairro_associado' substituído por repetidor de 'Segmentos de Rua'.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/acf-fields
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( function_exists( 'acf_add_local_field_group' ) ) :

    acf_add_local_field_group( array(
        'key'                   => 'group_nativa_rua_settings',
        'title'                 => 'Configurações da Rua',
        'fields'                => array(
            // --- INÍCIO DA MODIFICAÇÃO: Substituição por campo Repetidor ---
            array(
                'key'               => 'field_nativa_rua_segmentos',
                'label'             => 'Segmentos da Rua por Bairro',
                'name'              => 'rua_segmentos',
                'type'              => 'repeater',
                'instructions'      => 'Defina os segmentos desta rua, associando-os a um bairro e a uma faixa de numeração. Adicione um item para cada bairro que a rua abrange.',
                'required'          => 1,
                'min'               => 1, // Pelo menos um segmento
                'layout'            => 'block', // 'block' para melhor visualização dos subcampos
                'button_label'      => 'Adicionar Segmento de Rua',
                'sub_fields'        => array(
                    array(
                        'key'           => 'field_nativa_rua_segmento_bairro',
                        'label'         => 'Bairro Associado',
                        'name'          => 'bairro_associado',
                        'type'          => 'post_object',
                        'instructions'  => 'Selecione o bairro deste segmento da rua.',
                        'required'      => 1,
                        'post_type'     => array('nativa_bairro'),
                        'return_format' => 'id',
                        'ui'            => 1,
                        'allow_null'    => 0,
                        'multiple'      => 0,
                        'wrapper'       => array(
                            'width' => '50',
                        ),
                    ),
                    array(
                        'key'           => 'field_nativa_rua_segmento_num_inicial',
                        'label'         => 'Número Inicial',
                        'name'          => 'numero_inicial',
                        'type'          => 'text', // Usar texto para permitir "S/N" ou outros casos, ou padronizar para número
                        'instructions'  => 'O número inicial do imóvel que corresponde a este segmento da rua e bairro (ex: 1, 700).',
                        'required'      => 1,
                        'placeholder'   => 'Ex: 1 ou 700',
                        'wrapper'       => array(
                            'width' => '25',
                        ),
                    ),
                    array(
                        'key'           => 'field_nativa_rua_segmento_num_final',
                        'label'         => 'Número Final',
                        'name'          => 'numero_final',
                        'type'          => 'text', // Usar texto para permitir "até o final", etc.
                        'instructions'  => 'O número final do imóvel que corresponde a este segmento (ex: 699, ou deixe em branco se for "em diante").',
                        'required'      => 0, // Não obrigatório, se for "em diante"
                        'placeholder'   => 'Ex: 699',
                        'wrapper'       => array(
                            'width' => '25',
                        ),
                    ),
                ),
            ),
            // --- FIM DA MODIFICAÇÃO ---
        ),
        'location'              => array(
            array(
                array(
                    'param'    => 'post_type',
                    'operator' => '==',
                    'value'    => 'nativa_rua',
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

endif;