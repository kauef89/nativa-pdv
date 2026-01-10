<?php
/**
 * Classe para gerenciar a página de Horários de Funcionamento.
 * VERSÃO ATUALIZADA: Adicionado o campo "Aberta o tempo todo" (flag de desenvolvimento).
 * ATUALIZAÇÃO (DELIVERY OFF): Adiciona flag para desativar apenas o delivery (ex: falta de motoboy).
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Hours_Settings {

    private $option_group = 'nativa_delivery_hours_options_group';
    private $option_name = 'nativa_delivery_hours_options';

    public function __construct() {
        add_action( 'admin_init', array( $this, 'register_settings' ) );
    }

    /**
     * Registra a configuração na Settings API do WordPress.
     */
    public function register_settings() {
        register_setting(
            $this->option_group,
            $this->option_name,
            array( $this, 'sanitize_hours_options' )
        );

        // --- INÍCIO DA OTIMIZAÇÃO: Seção para a flag de desenvolvimento ---
        add_settings_section(
            'nativa_delivery_dev_mode_section',
            'Modo de Operação Geral',
            function() { echo '<p>Use estas opções para forçar a loja a ficar aberta ou fechada, independentemente dos horários abaixo.</p>'; },
            'nativa-delivery-hours-settings' // A página onde esta seção aparecerá
        );

        add_settings_field(
            'open_close_flags',
            'Controles Gerais da Loja',
            array( $this, 'render_open_close_flags_field' ),
            'nativa-delivery-hours-settings',
            'nativa_delivery_dev_mode_section'
        );
        // --- FIM DA OTIMIZAÇÃO ---
    }

    /**
     * Renderiza os checkboxes para as flags "Aberta" e "Fechada".
     */
    public function render_open_close_flags_field() {
        $options = get_option($this->option_name);
        $open_checked = isset($options['open_24_7']) && $options['open_24_7'] === 'on';
        $closed_checked = isset($options['closed_24_7']) && $options['closed_24_7'] === 'on';
        // --- INÍCIO DA MODIFICAÇÃO (DELIVERY OFF) ---
        $disable_delivery_checked = isset($options['disable_delivery_temp']) && $options['disable_delivery_temp'] === 'on';
        // --- FIM DA MODIFICAÇÃO ---
        ?>
        <div style="display: flex; gap: 20px; align-items: center; flex-wrap: wrap;">
            <label>
                <input type="checkbox" name="<?php echo esc_attr($this->option_name); ?>[open_24_7]" <?php checked($open_checked, true); ?>>
                <strong>Aberta o tempo todo</strong> (para testes)
            </label>
            <label>
                <input type="checkbox" name="<?php echo esc_attr($this->option_name); ?>[closed_24_7]" <?php checked($closed_checked, true); ?>>
                <strong>Fechada o tempo todo</strong> (para imprevistos)
            </label>
            <label style="color: #d63638;">
                <input type="checkbox" name="<?php echo esc_attr($this->option_name); ?>[disable_delivery_temp]" <?php checked($disable_delivery_checked, true); ?>>
                <strong>Desativar Apenas Delivery</strong> (Sem motoboy)
            </label>
            </div>
        <?php
    }


    /**
     * Sanitiza os dados dos horários antes de salvar no banco de dados.
     */
    public function sanitize_hours_options( $input ) {
        $sanitized_input = array();
        $days_of_week = array( 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday' );
        $time_fields = array( 'delivery', 'pickup', 'table', 'store_hours' );

        $sanitized_input['open_24_7'] = isset($input['open_24_7']) ? 'on' : 'off';
        $sanitized_input['closed_24_7'] = isset($input['closed_24_7']) ? 'on' : 'off';
        // --- INÍCIO DA MODIFICAÇÃO (DELIVERY OFF) ---
        $sanitized_input['disable_delivery_temp'] = isset($input['disable_delivery_temp']) ? 'on' : 'off';
        // --- FIM DA MODIFICAÇÃO ---

        foreach ( $days_of_week as $day ) {
            $sanitized_input[ $day ]['is_active'] = isset( $input[ $day ]['is_active'] ) ? 'on' : 'off';

            foreach ( $time_fields as $field ) {
                $open_time = $input[ $day ][ $field ]['open'] ?? '00:00';
                $close_time = $input[ $day ][ $field ]['close'] ?? '00:00';

                // Valida o formato HH:MM
                $sanitized_input[ $day ][ $field ]['open'] = preg_match( '/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $open_time ) ? $open_time : '00:00';
                $sanitized_input[ $day ][ $field ]['close'] = preg_match( '/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/', $close_time ) ? $close_time : '00:00';
            }
        }

        return $sanitized_input;
    }

    /**
     * Renderiza um campo de input de texto para os horários.
     */
    public function generate_time_input( $name, $selected_time ) {
        $option_name_base = 'nativa_delivery_hours_options';
        echo '<input type="text" name="' . esc_attr( $option_name_base . '[' . $name . ']' ) . '" value="' . esc_attr( $selected_time ) . '" size="5" placeholder="HH:MM" />';
    }
}