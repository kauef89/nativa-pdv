<?php
/**
 * Classe para gerenciar a página de Configurações da Mensagem do WhatsApp.
 * VERSÃO 2.1 - Adicionados templates para status "Recebido" e "Entregue".
 * VERSÃO OTIMIZADA: Adiciona a tag {bairro} nas instruções do template do entregador.
 * VERSÃO ATUALIZADA: Adiciona o seletor para habilitar/desabilitar a comunicação via WhatsApp.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Whatsapp_Settings {

    private $option_group = 'nativa_delivery_whatsapp_options_group';
    private $option_name  = 'nativa_delivery_whatsapp_options';

    public function __construct() {
        add_action( 'admin_init', array( $this, 'register_settings' ) );
    }

    /**
     * Registra todas as configurações, seções e campos na API de Configurações do WordPress.
     */
    public function register_settings() {
        register_setting(
            $this->option_group,
            $this->option_name,
            array( $this, 'sanitize_options' )
        );

        add_settings_section(
            'nativa_whatsapp_contact_section',
            'Contato Principal da Loja',
            null,
            'nativa-delivery-whatsapp-settings'
        );

        add_settings_field(
            'whatsapp_number',
            'Número do WhatsApp para Pedidos',
            array( $this, 'render_whatsapp_number_field' ),
            'nativa-delivery-whatsapp-settings',
            'nativa_whatsapp_contact_section'
        );

        // --- INÍCIO DA MODIFICAÇÃO ---
        add_settings_field(
            'whatsapp_communication_enabled',
            'Comunicação via WhatsApp',
            array( $this, 'render_whatsapp_enabled_field' ),
            'nativa-delivery-whatsapp-settings',
            'nativa_whatsapp_contact_section'
        );
        // --- FIM DA MODIFICAÇÃO ---
        
        add_settings_section(
            'nativa_whatsapp_customer_messages_section',
            'Modelos de Mensagem para o Cliente',
            array( $this, 'render_customer_section_description' ),
            'nativa-delivery-whatsapp-settings'
        );

        add_settings_field(
            'message_template_recebido', 'Pedido Recebido', array( $this, 'render_message_field' ), 'nativa-delivery-whatsapp-settings', 'nativa_whatsapp_customer_messages_section',
            ['name' => 'message_template_recebido', 'description' => 'Enviada quando o pedido é movido para "Recebido".']
        );
        add_settings_field(
            'message_template_aceito', 'Pedido Aceito', array( $this, 'render_message_field' ), 'nativa-delivery-whatsapp-settings', 'nativa_whatsapp_customer_messages_section',
            ['name' => 'message_template_aceito', 'description' => 'Enviada quando o pedido é movido para "Aceito" e a cozinha inicia o preparo.']
        );
         add_settings_field(
            'message_template_pronto', 'Pedido Pronto para Retirada', array( $this, 'render_message_field' ), 'nativa-delivery-whatsapp-settings', 'nativa_whatsapp_customer_messages_section',
            ['name' => 'message_template_pronto', 'description' => 'Enviada quando um pedido de "Retirada" está pronto para ser coletado pelo cliente.']
        );
        add_settings_field(
            'message_template_enviado', 'Pedido Enviado', array( $this, 'render_message_field' ), 'nativa-delivery-whatsapp-settings', 'nativa_whatsapp_customer_messages_section',
            ['name' => 'message_template_enviado', 'description' => 'Enviada quando o motoboy coleta o pedido para entrega.']
        );
        add_settings_field(
            'message_template_finalizado', 'Pedido Finalizado', array( $this, 'render_message_field' ), 'nativa-delivery-whatsapp-settings', 'nativa_whatsapp_customer_messages_section',
            ['name' => 'message_template_finalizado', 'description' => 'Enviada quando a entrega é concluída ou o cliente retira o pedido.']
        );
        add_settings_field(
            'message_template_cancelado', 'Pedido Cancelado', array( $this, 'render_message_field' ), 'nativa-delivery-whatsapp-settings', 'nativa_whatsapp_customer_messages_section',
            ['name' => 'message_template_cancelado', 'description' => 'Enviada quando o pedido é cancelado.']
        );

        add_settings_section(
            'nativa_whatsapp_internal_messages_section',
            'Configurações de Comunicação Interna',
            array( $this, 'render_internal_section_description' ),
            'nativa-delivery-whatsapp-settings'
        );
        
        add_settings_field(
            'whatsapp_group_link', 'Link do Grupo de Entregadores', array( $this, 'render_group_link_field' ), 'nativa-delivery-whatsapp-settings', 'nativa_whatsapp_internal_messages_section'
        );

        add_settings_field(
            'message_template_entregador', 'Acionar Entrega (Status "Pronto")', array( $this, 'render_message_field' ), 'nativa-delivery-whatsapp-settings', 'nativa_whatsapp_internal_messages_section',
            ['name' => 'message_template_entregador', 'description' => 'Mensagem enviada para o grupo de entregadores. Use as tags {primeiro_nome}, {telefone_cliente}, {endereco_completo}, {bairro}, {link_Maps}, {status_pagamento}, {valor_total} e {troco_para}.']
        );
    }
    
    // --- INÍCIO DA MODIFICAÇÃO ---
    public function render_whatsapp_enabled_field() {
        $options = get_option( $this->option_name );
        $value = isset( $options['whatsapp_communication_enabled'] ) ? $options['whatsapp_communication_enabled'] : 'on';
        ?>
        <label>
            <input type="checkbox" name="<?php echo esc_attr( $this->option_name ); ?>[whatsapp_communication_enabled]" <?php checked($value, 'on'); ?>>
            Ativar comunicação (envio de pedido para a loja e notificações para o cliente)
        </label>
        <p class="description">Se desativado, o botão "Finalizar Pedido" não abrirá o WhatsApp e os botões de notificação desaparecerão do painel de entregas.</p>
        <?php
    }
    // --- FIM DA MODIFICAÇÃO ---

    public function render_customer_section_description() {
        echo '<p>Personalize as mensagens automáticas enviadas para o WhatsApp do cliente. Você pode usar as tags <code>{primeiro_nome}</code> e <code>{id_pedido}</code>.</p>';
    }

    public function render_internal_section_description() {
        echo '<p>Configure o link do grupo e a mensagem para acionar a equipe de entrega.</p>';
    }

    public function render_whatsapp_number_field() {
        $options = get_option( $this->option_name );
        $whatsapp_number = isset( $options['whatsapp_number'] ) ? $options['whatsapp_number'] : '';
        ?>
        <input type="text" name="<?php echo esc_attr( $this->option_name ); ?>[whatsapp_number]" value="<?php echo esc_attr( $whatsapp_number ); ?>" class="regular-text" placeholder="5547912345678">
        <p class="description">Digite o número completo, incluindo código do país e DDD, sem espaços ou símbolos (ex: 5547999998888). Este número será usado para o cliente enviar o pedido.</p>
        <?php
    }

    public function render_message_field( $args ) {
        $options = get_option( $this->option_name );
        $name = $args['name'];
        $value = isset( $options[$name] ) ? $options[$name] : '';
        echo "<textarea name='{$this->option_name}[{$name}]' rows='5' class='large-text'>{$value}</textarea>";
        if ( ! empty( $args['description'] ) ) {
            echo "<p class='description'>" . esc_html( $args['description'] ) . "</p>";
        }
    }
    
    public function render_group_link_field() {
        $options = get_option( $this->option_name );
        $value = isset( $options['whatsapp_group_link'] ) ? $options['whatsapp_group_link'] : '';
        echo "<input type='url' name='{$this->option_name}[whatsapp_group_link]' value='" . esc_attr( $value ) . "' class='regular-text' placeholder='https://chat.whatsapp.com/CODIGO_DO_GRUPO'>";
        echo "<p class='description'>Insira o link de convite completo do grupo de WhatsApp da sua equipe de entregas.</p>";
    }

    public function sanitize_options( $input ) {
        $sanitized_input = array();
        
        if ( isset( $input['whatsapp_number'] ) ) {
            $sanitized_input['whatsapp_number'] = preg_replace( '/\D/', '', $input['whatsapp_number'] );
        }

        // --- INÍCIO DA MODIFICAÇÃO ---
        $sanitized_input['whatsapp_communication_enabled'] = isset( $input['whatsapp_communication_enabled'] ) ? 'on' : 'off';
        // --- FIM DA MODIFICAÇÃO ---

        if ( isset( $input['whatsapp_group_link'] ) ) {
            $sanitized_input['whatsapp_group_link'] = esc_url_raw( $input['whatsapp_group_link'] );
        }

        $message_fields = ['message_template_recebido', 'message_template_aceito', 'message_template_pronto', 'message_template_enviado', 'message_template_finalizado', 'message_template_cancelado', 'message_template_entregador'];
        foreach ( $message_fields as $field ) {
            if ( isset( $input[$field] ) ) {
                $sanitized_input[$field] = wp_kses_post( $input[$field] );
            }
        }

        return $sanitized_input;
    }
}