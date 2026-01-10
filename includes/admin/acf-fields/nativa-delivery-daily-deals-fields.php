<?php
/**
 * NOVO ARQUIVO
 * Define os campos ACF para a página de configurações de Promoções Diárias.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( function_exists( 'acf_add_local_field_group' ) ) :

    acf_add_local_field_group( array(
        'key' => 'group_nativa_daily_deals_settings',
        'title' => 'Gerenciador de Promoções Diárias',
        'fields' => array(
            array(
                'key' => 'field_daily_deals_repeater',
                'label' => 'Promoções da Semana',
                'name' => 'daily_deals_week',
                'type' => 'repeater',
                'instructions' => 'Configure o card de promoção para cada dia da semana. Apenas os dias com um Título preenchido serão exibidos na página inicial.',
                'required' => 0,
                'layout' => 'block',
                'button_label' => 'Adicionar Dia',
                'min' => 7, // Força a existência dos 7 dias
                'max' => 7, // Impede que mais de 7 sejam criados
                'sub_fields' => array(
                    // Campo para o Título da Promoção
                    array(
                        'key' => 'field_daily_deal_title',
                        'label' => 'Título da Promoção',
                        'name' => 'deal_title',
                        'type' => 'text',
                        'placeholder' => 'Ex: Terça-feira em Dobro!',
                        'wrapper' => array('width' => '50'),
                    ),
                    // Campo para a Imagem de Fundo
                    array(
                        'key' => 'field_daily_deal_background_image',
                        'label' => 'Imagem de Fundo',
                        'name' => 'deal_background_image',
                        'type' => 'image',
                        'instructions' => 'Imagem que aparecerá no fundo do card.',
                        'return_format' => 'url', // Salva apenas a URL da imagem para ser mais leve
                        'preview_size' => 'thumbnail',
                        'wrapper' => array('width' => '50'),
                    ),
                    // Campo para o Conteúdo/Descrição
                    array(
                        'key' => 'field_daily_deal_content',
                        'label' => 'Conteúdo / Descrição da Promoção',
                        'name' => 'deal_content',
                        'type' => 'textarea',
                        'placeholder' => 'Ex: Compre qualquer pastel e ganhe outro de mesmo valor ou inferior.',
                        'rows' => 3,
                    ),
                ),
            ),
        ),
        'location' => array(
            array(
                array(
                    'param' => 'options_page',
                    'operator' => '==',
                    'value' => 'nativa-delivery-daily-deals', // O slug da nossa página de opções.
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
    ) );

endif;