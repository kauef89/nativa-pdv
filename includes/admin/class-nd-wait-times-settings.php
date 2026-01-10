<?php
/**
 * NOVO ARQUIVO
 * Classe para gerenciar a página de Configurações de Tempos de Espera.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Wait_Times_Settings {

    private $option_group = 'nativa_delivery_wait_times_options_group';
    private $option_name  = 'nativa_delivery_wait_times_options';

    public function __construct() {
        add_action( 'admin_init', array( $this, 'register_settings' ) );
    }

    /**
     * Registra as configurações, seções e campos.
     */
    public function register_settings() {
        register_setting(
            $this->option_group,
            $this->option_name,
            array( $this, 'sanitize_options' )
        );

        // Seção 1: Cálculo do Tempo de Cozinha
        add_settings_section(
            'nativa_wait_time_kitchen_section',
            'Cálculo do Tempo de Cozinha',
            function() { echo '<p>Premissas usadas para calcular o tempo de preparo dos pedidos (aplicável a todas as modalidades).</p>'; },
            'nativa-delivery-wait-times-settings'
        );

        add_settings_field(
            'wait_time_base_prep',
            'Tempo base de preparo (minutos)',
            array( $this, 'render_number_field' ),
            'nativa-delivery-wait-times-settings',
            'nativa_wait_time_kitchen_section',
            [
                'name' => 'base_prep_time',
                'desc' => 'O tempo mínimo para preparar um pedido, mesmo com a cozinha vazia.'
            ]
        );
        
        add_settings_field(
            'wait_time_load_factor',
            'Fator de carga por pedido ativo (minutos)',
            array( $this, 'render_number_field' ),
            'nativa-delivery-wait-times-settings',
            'nativa_wait_time_kitchen_section',
            [
                'name' => 'load_factor_per_order',
                'desc' => 'Minutos a serem adicionados à espera para cada pedido na fila (com status "Recebido" ou "Aceito").'
            ]
        );

        // Seção 2: Cálculo do Tempo de Entrega
        add_settings_section(
            'nativa_wait_time_delivery_section',
            'Cálculo do Tempo de Entrega (Logística)',
            function() { echo '<p>Premissas adicionais usadas para calcular o tempo total de pedidos para Entrega.</p>'; },
            'nativa-delivery-wait-times-settings'
        );

        add_settings_field(
            'wait_time_driver_pickup',
            'Tempo médio de alocação do entregador (minutos)',
            array( $this, 'render_number_field' ),
            'nativa-delivery-wait-times-settings',
            'nativa_wait_time_delivery_section',
            [
                'name' => 'avg_driver_pickup_time',
                'desc' => 'O tempo médio entre o pedido ficar pronto e um entregador coletá-lo.'
            ]
        );

        add_settings_field(
            'wait_time_avg_travel',
            'Tempo médio de viagem (minutos)',
            array( $this, 'render_number_field' ),
            'nativa-delivery-wait-times-settings',
            'nativa_wait_time_delivery_section',
            [
                'name' => 'avg_travel_time',
                'desc' => 'Uma média de tempo de deslocamento para as entregas na sua região.'
            ]
        );
    }

    /**
     * Renderiza um campo de número reutilizável.
     */
    public function render_number_field( $args ) {
        $options = get_option( $this->option_name );
        $value = $options[ $args['name'] ] ?? '15';
        ?>
        <input type="number" name="<?php echo esc_attr( $this->option_name ); ?>[<?php echo esc_attr( $args['name'] ); ?>]" value="<?php echo esc_attr( $value ); ?>" min="0" step="1" class="regular-text">
        <p class="description"><?php echo esc_html( $args['desc'] ); ?></p>
        <?php
    }

    /**
     * Sanitiza os dados antes de salvar.
     */
    public function sanitize_options( $input ) {
        $sanitized_input = array();
        if ( ! is_array( $input ) ) {
            return $sanitized_input;
        }

        $fields = ['base_prep_time', 'load_factor_per_order', 'avg_driver_pickup_time', 'avg_travel_time'];
        
        foreach ($fields as $field) {
            if ( isset( $input[$field] ) ) {
                $sanitized_input[$field] = absint( $input[$field] );
            }
        }

        return $sanitized_input;
    }
}