<?php
/**
 * Define os grupos de campos ACF para o Custom Post Type 'nativa_pedido'.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/acf-fields
 * VERSÃO ATUALIZADA: Adiciona o campo de Pontos de Fidelidade Ganhos.
 * REMOÇÃO (Agendamento): Remove o campo pedido_horario_agendado.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( function_exists( 'acf_add_local_field_group' ) ) :

    acf_add_local_field_group( array(
        'key' => 'group_nativa_delivery_pedido_fields',
        'title' => 'Detalhes do Pedido',
        'fields' => array(
            // Aba de Dados do Cliente
            array(
                'key' => 'tab_cliente',
                'label' => 'Dados do Cliente',
                'type' => 'tab',
                'placement' => 'top',
            ),
            array(
                'key' => 'field_pedido_nome_cliente',
                'label' => 'Nome do Cliente',
                'name' => 'pedido_nome_cliente',
                'type' => 'text',
                'required' => 1,
                'readonly' => 1,
            ),
            array(
                'key' => 'field_pedido_cpf_cliente',
                'label' => 'CPF do Cliente',
                'name' => 'pedido_cpf_cliente',
                'type' => 'text',
                'readonly' => 1,
            ),
            array(
                'key' => 'field_pedido_whatsapp_cliente',
                'label' => 'WhatsApp do Cliente',
                'name' => 'pedido_whatsapp_cliente',
                'type' => 'text',
                'required' => 1,
                'readonly' => 1,
            ),

            // Aba de Detalhes da Entrega
            array(
                'key' => 'tab_entrega',
                'label' => 'Detalhes da Entrega',
                'type' => 'tab',
            ),
            array(
                'key' => 'field_pedido_tipo_servico',
                'label' => 'Tipo de Serviço',
                'name' => 'pedido_tipo_servico',
                'type' => 'select',
                'choices' => array(
                    'delivery' => 'Entrega',
                    'pickup' => 'Retirada',
                    'table' => 'Na Mesa',
                ),
                'readonly' => 1,
            ),
            array(
                'key' => 'group_pedido_endereco',
                'label' => 'Endereço de Entrega',
                'name' => 'pedido_endereco',
                'type' => 'group',
                'layout' => 'block',
                'conditional_logic' => array(
                    array(
                        array(
                            'field' => 'field_pedido_tipo_servico',
                            'operator' => '==',
                            'value' => 'delivery',
                        ),
                    ),
                ),
                'sub_fields' => array(
                    array('key' => 'field_pedido_rua', 'label' => 'Rua', 'name' => 'pedido_rua', 'type' => 'text', 'readonly' => 1),
                    array('key' => 'field_pedido_numero', 'label' => 'Número', 'name' => 'pedido_numero', 'type' => 'text', 'readonly' => 1),
                    array('key' => 'field_pedido_complemento', 'label' => 'Complemento/Ref.', 'name' => 'pedido_complemento', 'type' => 'text', 'readonly' => 1),
                    array('key' => 'field_pedido_bairro', 'label' => 'Bairro', 'name' => 'pedido_bairro', 'type' => 'text', 'readonly' => 1),
                    array(
                        'key' => 'field_pedido_latitude',
                        'label' => 'Latitude',
                        'name' => 'pedido_latitude',
                        'type' => 'text',
                        'readonly' => 1,
                        'wrapper' => array('width' => '50'),
                    ),
                    array(
                        'key' => 'field_pedido_longitude',
                        'label' => 'Longitude',
                        'name' => 'pedido_longitude',
                        'type' => 'text',
                        'readonly' => 1,
                        'wrapper' => array('width' => '50'),
                    ),
                )
            ),
            // --- INÍCIO DA MODIFICAÇÃO (REMOÇÃO AGENDAMENTO) ---
            // O campo 'pedido_horario_agendado' foi removido desta seção.
            // --- FIM DA MODIFICAÇÃO ---

            // Aba de Valores e Pagamento
            array(
                'key' => 'tab_valores',
                'label' => 'Valores e Pagamento',
                'type' => 'tab',
            ),
            array(
                'key' => 'field_pedido_subtotal', 'label' => 'Subtotal', 'name' => 'pedido_subtotal', 'type' => 'number', 'prepend' => 'R$', 'readonly' => 1
            ),
            array(
                'key' => 'field_pedido_taxa_entrega', 'label' => 'Taxa de Entrega', 'name' => 'pedido_taxa_entrega', 'type' => 'number', 'prepend' => 'R$', 'readonly' => 1
            ),
            array(
                'key' => 'field_pedido_desconto', 'label' => 'Desconto Aplicado', 'name' => 'pedido_desconto', 'type' => 'number', 'prepend' => 'R$', 'readonly' => 1
            ),
            array(
                'key' => 'field_pedido_total_final', 'label' => 'Total Final', 'name' => 'pedido_total_final', 'type' => 'number', 'prepend' => 'R$', 'readonly' => 1
            ),
            array(
                'key' => 'field_pedido_pontos_ganhos',
                'label' => 'Pontos Ganhos',
                'name' => 'pedido_pontos_ganhos',
                'type' => 'number',
                'instructions' => 'Pontos de fidelidade gerados por este pedido.',
                'readonly' => 1,
                'prepend' => 'Pts',
            ),
            array(
                'key' => 'field_pedido_metodo_pagamento', 'label' => 'Método de Pagamento', 'name' => 'pedido_metodo_pagamento', 'type' => 'text', 'readonly' => 1
            ),
            array(
                'key' => 'field_pedido_troco_para', 'label' => 'Troco Para', 'name' => 'pedido_troco_para', 'type' => 'text', 'readonly' => 1
            ),
             array( // Campo de Cupom Utilizado (mantido)
                'key' => 'field_pedido_cupom_utilizado',
                'label' => 'Cupom Utilizado',
                'name' => 'pedido_cupom_utilizado',
                'type' => 'text',
                'readonly' => 1,
            ),

            // Aba de Itens do Pedido
            array(
                'key' => 'tab_itens',
                'label' => 'Itens do Pedido',
                'type' => 'tab',
            ),
            array(
                'key' => 'field_pedido_itens_json',
                'label' => 'Itens (JSON)',
                'name' => 'pedido_itens_json',
                'type' => 'textarea',
                'readonly' => 1,
                'rows' => 15, // Aumenta um pouco a altura
            ),

            // Aba de Controle Interno
            array(
                'key' => 'tab_controle',
                'label' => 'Controle Interno',
                'type' => 'tab',
            ),
            array(
                'key' => 'field_pedido_entregador_designado',
                'label' => 'Entregador Designado',
                'name' => 'pedido_entregador_designado',
                'type' => 'post_object',
                'post_type' => array('nativa_entregador'),
                'return_format' => 'object', // Pode manter como object ou mudar para ID se preferir
                'ui' => 1,
                'allow_null' => 1, // Permite desassociar
            ),
            array( // Campo para logs de status (mantido)
                'key' => 'field_pedido_status_log',
                'label' => 'Log de Status',
                'name' => 'pedido_status_log',
                'type' => 'textarea',
                'readonly' => 1,
                 'rows' => 8,
            ),
        ),
        'location' => array(
            array(
                array(
                    'param' => 'post_type',
                    'operator' => '==',
                    'value' => 'nativa_pedido',
                ),
            ),
        ),
        'menu_order' => 0,
        'position' => 'normal',
        'style' => 'default',
        'label_placement' => 'top',
        'instruction_placement' => 'label',
        'hide_on_screen' => array('the_content', 'excerpt', 'discussion', 'comments', 'revisions', 'slug', 'author', 'format', 'page_attributes', 'categories', 'tags', 'send-trackbacks'),
        'active' => true,
        'description' => 'Campos personalizados para os pedidos do Nativa Delivery',
    ) );

endif;