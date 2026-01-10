<?php
/**
 * Classe para gerenciar a página de Configurações de Pagamento.
 * VERSÃO CORRIGIDA E COMPLETA: Adicionado campo "Tipo de Chave" para o PIX manual.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Payments_Settings {

    private $option_group = 'nativa_delivery_payments_options_group';
    private $option_name  = 'nativa_delivery_payments_options';

    public function __construct() {
        add_action( 'admin_init', array( $this, 'register_settings' ) );
    }

    public function register_settings() {
        register_setting( $this->option_group, $this->option_name, array( $this, 'sanitize_options' ) );

        add_settings_section(
            'pix_mode_section',
            'Modo de Operação PIX',
            function() { echo '<p>Selecione como o PIX deve funcionar no checkout.</p>'; },
            'nativa-delivery-payments-settings'
        );
        add_settings_field( 'pix_mode', 'Modo PIX', array( $this, 'render_pix_mode_field' ), 'nativa-delivery-payments-settings', 'pix_mode_section' );
        
        add_settings_section(
            'sicredi_pix_section',
            'Configurações do PIX Automático (API Sicredi)',
            null,
            'nativa-delivery-payments-settings'
        );
        add_settings_field( 'client_id', 'Client ID', array( $this, 'render_text_field' ), 'nativa-delivery-payments-settings', 'sicredi_pix_section', ['name' => 'client_id', 'constant' => 'NATIVA_SICREDI_CLIENT_ID'] );
        add_settings_field( 'client_secret', 'Client Secret', array( $this, 'render_password_field' ), 'nativa-delivery-payments-settings', 'sicredi_pix_section', ['name' => 'client_secret', 'constant' => 'NATIVA_SICREDI_CLIENT_SECRET'] );
        add_settings_field( 'chave_pix', 'Sua Chave PIX (Automático)', array( $this, 'render_text_field' ), 'nativa-delivery-payments-settings', 'sicredi_pix_section', ['name' => 'chave_pix', 'constant' => 'NATIVA_SICREDI_CHAVE_PIX'] );
        add_settings_field( 'path_cert', 'Caminho do Certificado (.pem)', array( $this, 'render_text_field' ), 'nativa-delivery-payments-settings', 'sicredi_pix_section', ['name' => 'path_cert', 'placeholder' => '/home/usuario/certs/sicredi.pem', 'constant' => 'NATIVA_SICREDI_CERT_PATH'] );
        add_settings_field( 'path_key', 'Caminho da Chave Privada (.key)', array( $this, 'render_text_field' ), 'nativa-delivery-payments-settings', 'sicredi_pix_section', ['name' => 'path_key', 'placeholder' => '/home/usuario/certs/sicredi.key', 'constant' => 'NATIVA_SICREDI_KEY_PATH'] );

        add_settings_section(
            'manual_pix_section',
            'Configurações do PIX Manual (Fallback)',
            function() { echo '<p>Estas chaves serão mostradas ao cliente se o modo manual estiver ativo ou se o modo automático falhar.</p>'; },
            'nativa-delivery-payments-settings'
        );
        
        add_settings_field( 'manual_pix_principal_tipo', 'Tipo de Chave (Principal)', array( $this, 'render_select_field' ), 'nativa-delivery-payments-settings', 'manual_pix_section', ['name' => 'manual_pix_principal_tipo', 'options' => ['telefone' => 'Telefone', 'cnpj' => 'CNPJ', 'email' => 'E-mail', 'aleatoria' => 'Aleatória']] );
        add_settings_field( 'manual_pix_principal_chave', 'Chave PIX Principal', array( $this, 'render_text_field' ), 'nativa-delivery-payments-settings', 'manual_pix_section', ['name' => 'manual_pix_principal_chave'] );
        add_settings_field( 'manual_pix_principal_nome', 'Nome do Titular (Principal)', array( $this, 'render_text_field' ), 'nativa-delivery-payments-settings', 'manual_pix_section', ['name' => 'manual_pix_principal_nome'] );
        add_settings_field( 'manual_pix_frequencia', 'Frequência da Chave Principal', array( $this, 'render_number_field' ), 'nativa-delivery-payments-settings', 'manual_pix_section', ['name' => 'manual_pix_frequencia', 'min' => 0, 'max' => 1, 'step' => 0.1, 'desc' => 'Valor de 0 a 1 (ex: 0.8 para 80% de chance de usar a chave principal).'] );

        add_settings_field( 'manual_pix_secundaria_tipo', 'Tipo de Chave (Secundária)', array( $this, 'render_select_field' ), 'nativa-delivery-payments-settings', 'manual_pix_section', ['name' => 'manual_pix_secundaria_tipo', 'options' => ['telefone' => 'Telefone', 'cnpj' => 'CNPJ', 'email' => 'E-mail', 'aleatoria' => 'Aleatória']] );
        add_settings_field( 'manual_pix_secundaria_chave', 'Chave PIX Secundária', array( $this, 'render_text_field' ), 'nativa-delivery-payments-settings', 'manual_pix_section', ['name' => 'manual_pix_secundaria_chave'] );
        add_settings_field( 'manual_pix_secundaria_nome', 'Nome do Titular (Secundária)', array( $this, 'render_text_field' ), 'nativa-delivery-payments-settings', 'manual_pix_section', ['name' => 'manual_pix_secundaria_nome'] );
    }

    public function render_section_description() {
        // Esta descrição não é mais necessária, pois a lógica está em cada campo.
    }

    public function render_pix_mode_field() {
        $options = get_option($this->option_name);
        $value = $options['pix_mode'] ?? 'automatico';
        ?>
        <label><input type="radio" name="<?php echo esc_attr($this->option_name); ?>[pix_mode]" value="automatico" <?php checked('automatico', $value); ?>> Automático (Integração com API)</label><br>
        <label><input type="radio" name="<?php echo esc_attr($this->option_name); ?>[pix_mode]" value="manual" <?php checked('manual', $value); ?>> Manual (Exibir chave para o cliente)</label>
        <p class="description">Se o modo automático falhar, o sistema usará o modo manual como fallback.</p>
        <?php
    }

    public function render_text_field( $args ) {
        $constant_name = $args['constant'] ?? null;
        if ( $constant_name && defined($constant_name) ) {
            echo "<p class='description' style='color: green;'>✔ Definido com segurança em <code>wp-config.php</code>.</p>";
        } else {
            $value = get_option($this->option_name)[$args['name']] ?? '';
            $placeholder = $args['placeholder'] ?? '';
            echo "<input type='text' name='{$this->option_name}[{$args['name']}]' value='" . esc_attr( $value ) . "' class='regular-text' placeholder='" . esc_attr($placeholder) . "'>";
            if ($constant_name) {
                echo "<p class='description'>Para máxima segurança, defina a constante <code>{$constant_name}</code> em seu arquivo <code>wp-config.php</code>.</p>";
            }
        }
    }

    public function render_password_field( $args ) {
        $constant_name = $args['constant'] ?? null;
        if ( $constant_name && defined($constant_name) ) {
            echo "<p class='description' style='color: green;'>✔ Definido com segurança em <code>wp-config.php</code>.</p>";
        } else {
            $value = get_option($this->option_name)[$args['name']] ?? '';
            echo "<input type='password' name='{$this->option_name}[{$args['name']}]' value='" . esc_attr( $value ) . "' class='regular-text'>";
             if ($constant_name) {
                echo "<p class='description'>Para máxima segurança, defina a constante <code>{$constant_name}</code> em seu arquivo <code>wp-config.php</code>.</p>";
            }
        }
    }

    public function render_number_field( $args ) {
        $options = get_option($this->option_name);
        $value = $options[$args['name']] ?? '1';
        $min = $args['min'] ?? '0';
        $max = $args['max'] ?? '1';
        $step = $args['step'] ?? '0.1';
        $desc = $args['desc'] ?? '';
        
        echo "<input type='number' name='{$this->option_name}[{$args['name']}]' value='" . esc_attr( $value ) . "' min='{$min}' max='{$max}' step='{$step}'>";
        if ($desc) {
            echo "<p class='description'>{$desc}</p>";
        }
    }

    public function render_select_field( $args ) {
        $options = get_option($this->option_name);
        $field_name = $args['name'];
        $select_options = $args['options'];
        $value = $options[$field_name] ?? '';
        
        echo "<select name='{$this->option_name}[{$field_name}]'>";
        foreach ($select_options as $val => $label) {
            echo "<option value='" . esc_attr($val) . "'" . selected($value, $val, false) . ">" . esc_html($label) . "</option>";
        }
        echo "</select>";
    }

    public function sanitize_options( $input ) {
        $sanitized_input = array();
        $options = get_option($this->option_name);
        
        $current_options = is_array($options) ? $options : [];
        $sanitized_input = $current_options;

        if (isset($input['pix_mode'])) { $sanitized_input['pix_mode'] = sanitize_text_field($input['pix_mode']); }
        
        $text_fields = [
            'manual_pix_principal_chave', 'manual_pix_principal_nome',
            'manual_pix_secundaria_chave', 'manual_pix_secundaria_nome'
        ];
        foreach ($text_fields as $field) { if (isset($input[$field])) { $sanitized_input[$field] = sanitize_text_field($input[$field]); } }

        $select_fields = ['manual_pix_principal_tipo', 'manual_pix_secundaria_tipo'];
        foreach ($select_fields as $field) { if (isset($input[$field])) { $sanitized_input[$field] = sanitize_key($input[$field]); } }

        if (isset($input['manual_pix_frequencia'])) { $sanitized_input['manual_pix_frequencia'] = floatval($input['manual_pix_frequencia']); }

        $fields_from_config = ['client_id', 'client_secret', 'chave_pix', 'path_cert', 'path_key'];
        foreach ($fields_from_config as $field_name) {
            if (!defined('NATIVA_SICREDI_' . strtoupper($field_name)) && isset($input[$field_name])) {
                $sanitized_input[$field_name] = sanitize_text_field($input[$field_name]);
            }
        }
        
        return $sanitized_input;
    }
}