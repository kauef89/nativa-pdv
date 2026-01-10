<?php
/**
 * NOVO ARQUIVO
 * Define os campos ACF para o Custom Post Type 'nativa_pagamento'.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/acf-fields
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( function_exists( 'acf_add_local_field_group' ) ) :

    acf_add_local_field_group( array(
        'key' => 'group_nativa_payment_method_fields',
        'title' => 'Configurações da Forma de Pagamento',
        'fields' => array(
            array(
                'key' => 'field_pagamento_categoria',
                'label' => 'Categoria da Forma de Pagamento',
                'name' => 'pagamento_categoria',
                'type' => 'radio',
                'instructions' => 'Define como o sistema deve processar este pagamento.',
                'required' => 1,
                'choices' => array(
                    'manual' => 'Manual (Ex: Dinheiro, Cartão na Entrega)',
                    'pix_automatico' => 'PIX Automático (Integração API)',
                    'pix_manual' => 'PIX Manual (Exibe chave ao cliente)',
                ),
                'default_value' => 'manual',
                'layout' => 'vertical',
                'return_format' => 'value',
            ),
            array(
                'key' => 'field_pagamento_disponibilidade',
                'label' => 'Disponibilidade',
                'name' => 'pagamento_disponibilidade',
                'type' => 'select',
                'instructions' => 'Define se este método de pagamento está visível e selecionável no checkout.',
                'required' => 1,
                'choices' => array(
                    'disponivel' => 'Disponível (Visível e Selecionável)',
                    'indisponivel' => 'Indisponível (Visível, mas não Selecionável)',
                    'oculto' => 'Oculto (Não aparece no checkout)',
                ),
                'default_value' => 'disponivel',
                'allow_null' => 0,
                'multiple' => 0,
                'ui' => 1,
                'ajax' => 0,
                'return_format' => 'value',
            ),
            array(
                'key' => 'field_pagamento_info_adicional',
                'label' => 'Texto de Informação Adicional',
                'name' => 'pagamento_info_adicional',
                'type' => 'textarea',
                'instructions' => 'Opcional. Texto que será exibido para o cliente no checkout quando este método for selecionado (Ex: "O pagamento é feito na entrega." ou "O QR Code será gerado na próxima tela.").',
                'rows' => 3,
            ),
            array(
                'key' => 'field_pagamento_exige_troco',
                'label' => 'Habilitar Campo de Troco?',
                'name' => 'pagamento_exige_troco',
                'type' => 'true_false',
                'instructions' => 'Marque "Sim" se este método de pagamento (ex: Dinheiro) deve exibir o campo de "Troco para:" no checkout.',
                'default_value' => 0,
                'ui' => 1,
                'ui_on_text' => 'Sim',
                'ui_off_text' => 'Não',
            ),
        ),
        'location' => array(
            array(
                array(
                    'param' => 'post_type',
                    'operator' => '==',
                    'value' => 'nativa_pagamento', // Associa ao nosso novo CPT
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