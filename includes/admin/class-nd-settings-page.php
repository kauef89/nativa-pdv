<?php
/**
 * Classe para gerenciar a página de Configurações Gerais do plugin.
 * VERSÃO ATUALIZADA (FISCAL V2): 
 * - Aba Fiscal adaptada para o modelo "Hardcoded Security".
 * - Exibe status das constantes definidas no wp-config.php.
 * - Gerencia apenas a numeração (Série/NNF) via banco de dados.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Settings_Page {

    private $option_name = 'nativa_delivery_options';
    private $fiscal_option_name = 'nativa_delivery_fiscal_options';

    public function __construct() {
        add_action( 'admin_init', array( $this, 'register_settings' ) );
    }

    public function register_settings() {
        // --- 1. Configurações Gerais ---
        register_setting( 'nativa_delivery_options_group', $this->option_name, array( $this, 'sanitize_options' ) );

        add_settings_section( 'nativa_delivery_general_section', 'Configurações de Página', array( $this, 'render_section_description' ), 'nativa-delivery-general-settings' );
        add_settings_field( 'app_page_id', 'Página Principal da Aplicação', array( $this, 'render_app_page_field' ), 'nativa-delivery-general-settings', 'nativa_delivery_general_section' );
        add_settings_field( 'checkout_page_id', 'Página de Finalização de Pedido', array( $this, 'render_checkout_page_field' ), 'nativa-delivery-general-settings', 'nativa_delivery_general_section' );

        add_settings_section( 'nativa_delivery_pwa_section', 'Configurações do App (PWA)', null, 'nativa-delivery-general-settings' );
        add_settings_field( 'require_pwa_install', 'Exigir Instalação do App', array( $this, 'render_pwa_toggle_field' ), 'nativa-delivery-general-settings', 'nativa_delivery_pwa_section' );

        add_settings_section( 'nativa_delivery_tracking_section', 'Rastreamento de Conversão', function() { echo '<p>Configuração de Pixel e Google Ads.</p>'; }, 'nativa-delivery-general-settings' );
        add_settings_field( 'meta_pixel_id', 'Meta Pixel ID', array( $this, 'render_text_field' ), 'nativa-delivery-general-settings', 'nativa_delivery_tracking_section', ['id' => 'meta_pixel_id', 'placeholder' => 'Ex: 123456789012345'] );
        add_settings_field( 'google_ads_id', 'Google Ads ID', array( $this, 'render_text_field' ), 'nativa-delivery-general-settings', 'nativa_delivery_tracking_section', ['id' => 'google_ads_id', 'placeholder' => 'Ex: AW-123456789'] );
        add_settings_field( 'google_ads_label', 'Rótulo de Conversão', array( $this, 'render_text_field' ), 'nativa-delivery-general-settings', 'nativa_delivery_tracking_section', ['id' => 'google_ads_label', 'placeholder' => 'Ex: AbCdEfGhIjKlMnOpQr'] );

        add_settings_section( 'nativa_gov_api_section', 'Integração Gov.br (Serpro)', null, 'nativa-delivery-general-settings' );
        add_settings_field( 'gov_client_id', 'Client ID', array( $this, 'render_text_field' ), 'nativa-delivery-general-settings', 'nativa_gov_api_section', ['id' => 'gov_client_id'] );
        add_settings_field( 'gov_client_secret', 'Client Secret', array( $this, 'render_password_field' ), 'nativa-delivery-general-settings', 'nativa_gov_api_section', ['id' => 'gov_client_secret'] );
        add_settings_field( 'gov_operator_cpf', 'CPF do Operador', array( $this, 'render_text_field' ), 'nativa-delivery-general-settings', 'nativa_gov_api_section', ['id' => 'gov_operator_cpf'] );

        // --- NOVA SEÇÃO DE SEGURANÇA ---
        add_settings_section( 'nativa_security_section', 'Segurança do PDV', null, 'nativa-delivery-general-settings' );
        
        add_settings_field( 
            'supervisor_pin', 
            'PIN do Supervisor (Numérico)', 
            array( $this, 'render_password_field' ), // Usa campo de senha para não mostrar
            'nativa-delivery-general-settings', 
            'nativa_security_section', 
            ['id' => 'supervisor_pin', 'desc' => 'Digite apenas se quiser ALTERAR o PIN atual.'] 
        );

        // --- 2. Configurações Fiscais (NOVA ESTRUTURA) ---
        register_setting( 'nativa_delivery_fiscal_options_group', $this->fiscal_option_name, array( $this, 'sanitize_fiscal_options' ) );

        // Seção A: Status do Sistema (Apenas Leitura)
        add_settings_section(
            'nativa_fiscal_status_section',
            'Status do Motor Fiscal (wp-config.php)',
            function() { 
                echo '<p>Estas configurações são definidas no arquivo <code>wp-config.php</code> por segurança. Para alterar, edite o arquivo no servidor.</p>'; 
            },
            'nativa-delivery-fiscal-settings'
        );

        add_settings_field( 'fiscal_env_status', 'Ambiente', array( $this, 'render_fiscal_status_row' ), 'nativa-delivery-fiscal-settings', 'nativa_fiscal_status_section', ['key' => 'NATIVA_FISCAL_ENV', 'label_map' => [1 => 'Produção (Valendo)', 2 => 'Homologação (Testes)']] );
        add_settings_field( 'fiscal_cert_status', 'Certificado A1', array( $this, 'render_fiscal_status_row' ), 'nativa-delivery-fiscal-settings', 'nativa_fiscal_status_section', ['key' => 'NATIVA_FISCAL_CERT_PATH', 'is_path' => true] );
        add_settings_field( 'fiscal_pass_status', 'Senha do Certificado', array( $this, 'render_fiscal_status_row' ), 'nativa-delivery-fiscal-settings', 'nativa_fiscal_status_section', ['key' => 'NATIVA_FISCAL_CERT_PASS', 'is_secret' => true] );
        add_settings_field( 'fiscal_csc_id_status', 'ID do Token (CSC)', array( $this, 'render_fiscal_status_row' ), 'nativa-delivery-fiscal-settings', 'nativa_fiscal_status_section', ['key' => 'NATIVA_FISCAL_CSC_ID'] );
        add_settings_field( 'fiscal_csc_token_status', 'Hash do Token (CSC)', array( $this, 'render_fiscal_status_row' ), 'nativa-delivery-fiscal-settings', 'nativa_fiscal_status_section', ['key' => 'NATIVA_FISCAL_CSC_TOKEN', 'is_secret' => true] );

        // Seção B: Controle Operacional (Editável)
        add_settings_section( 
            'nativa_fiscal_operational_section', 
            'Controle de Numeração', 
            function() { echo '<p>Defina a sequência atual das suas notas fiscais.</p>'; }, 
            'nativa-delivery-fiscal-settings' 
        );
        
        add_settings_field( 'serie', 'Série Atual', array( $this, 'render_fiscal_number_field' ), 'nativa-delivery-fiscal-settings', 'nativa_fiscal_operational_section', ['id' => 'serie', 'default' => 1] );
        add_settings_field( 'next_nnf', 'Próximo Número (NFC-e)', array( $this, 'render_fiscal_number_field' ), 'nativa-delivery-fiscal-settings', 'nativa_fiscal_operational_section', ['id' => 'next_nnf', 'default' => 1, 'desc' => 'O sistema incrementará este número automaticamente após cada venda autorizada.'] );
    }

    // --- Renderers Gerais ---
    public function render_section_description() { echo '<p>Defina as páginas principais usadas pelo sistema Nativa Delivery.</p>'; }
    public function render_app_page_field() {
        $options = get_option( $this->option_name );
        wp_dropdown_pages( array( 'name' => $this->option_name . '[app_page_id]', 'selected' => $options['app_page_id'] ?? '', 'show_option_none' => '— Selecione —', 'option_none_value' => '0' ) );
    }
    public function render_checkout_page_field() {
        $options = get_option( $this->option_name );
        wp_dropdown_pages( array( 'name' => $this->option_name . '[checkout_page_id]', 'selected' => $options['checkout_page_id'] ?? '', 'show_option_none' => '— Selecione —', 'option_none_value' => '0' ) );
    }
    public function render_pwa_toggle_field() {
        $options = get_option( $this->option_name );
        $value = isset( $options['require_pwa_install'] ) ? $options['require_pwa_install'] : 'off';
        ?> <label><input type="checkbox" name="<?php echo esc_attr( $this->option_name ); ?>[require_pwa_install]" <?php checked( $value, 'on' ); ?>> Bloquear adição ao carrinho fora do App instalado (PWA)</label> <?php
    }
    public function render_text_field( $args ) {
        $options = get_option( $this->option_name );
        $val = $options[$args['id']] ?? '';
        $placeholder = $args['placeholder'] ?? '';
        echo "<input type='text' name='{$this->option_name}[{$args['id']}]' value='" . esc_attr( $val ) . "' class='regular-text' placeholder='" . esc_attr($placeholder) . "'>";
    }
    public function render_password_field( $args ) {
        $options = get_option( $this->option_name );
        $val = $options[$args['id']] ?? '';
        echo "<input type='password' name='{$this->option_name}[{$args['id']}]' value='" . esc_attr( $val ) . "' class='regular-text'>";
    }

    // --- Renderers Fiscais (Novos) ---
    public function render_fiscal_status_row( $args ) {
        $const_name = $args['key'];
        
        if ( defined( $const_name ) && constant( $const_name ) !== '' ) {
            $value = constant( $const_name );
            
            if ( isset( $args['is_secret'] ) && $args['is_secret'] ) {
                echo '<span style="color: green; font-weight: bold;">✔ Configurado e Protegido</span>';
                echo '<p class="description">Valor oculto por segurança.</p>';
            } elseif ( isset( $args['label_map'] ) ) {
                $label = $args['label_map'][$value] ?? $value;
                echo '<strong style="color: green;">' . esc_html( $label ) . '</strong>';
            } elseif ( isset( $args['is_path'] ) && $args['is_path'] ) {
                // Verifica se o arquivo existe realmente
                if ( file_exists( $value ) ) {
                    echo '<span style="color: green; font-weight: bold;">✔ Arquivo Encontrado</span>';
                    echo '<p class="description">' . esc_html( basename( $value ) ) . '</p>';
                } else {
                    echo '<span style="color: red; font-weight: bold;">❌ Arquivo NÃO encontrado no servidor</span>';
                    echo '<p class="description">Caminho buscado: ' . esc_html( $value ) . '</p>';
                }
            } else {
                echo '<code>' . esc_html( $value ) . '</code>';
            }
        } else {
            echo '<span style="color: red; font-weight: bold;">❌ Não Definido</span>';
            echo '<p class="description">Adicione <code>define(\'' . $const_name . '\', \'valor\');</code> no wp-config.php</p>';
        }
    }

    public function render_fiscal_number_field( $args ) {
        $options = get_option( $this->fiscal_option_name );
        $val = $options[$args['id']] ?? $args['default'];
        echo "<input type='number' name='{$this->fiscal_option_name}[{$args['id']}]' value='" . esc_attr( $val ) . "' class='small-text' min='1'>";
        if ( ! empty( $args['desc'] ) ) {
            echo "<p class='description'>{$args['desc']}</p>";
        }
    }

    // --- Sanitização ---
public function sanitize_options( $input ) {
        $new_input = array();
        // ... (Campos existentes mantidos) ...
        if ( isset( $input['app_page_id'] ) ) $new_input['app_page_id'] = absint( $input['app_page_id'] );
        if ( isset( $input['checkout_page_id'] ) ) $new_input['checkout_page_id'] = absint( $input['checkout_page_id'] );
        if ( isset( $input['require_pwa_install'] ) ) $new_input['require_pwa_install'] = $input['require_pwa_install'];
        
        foreach(['gov_client_id', 'gov_client_secret', 'gov_operator_cpf', 'meta_pixel_id', 'google_ads_id', 'google_ads_label'] as $key) {
            if ( isset( $input[$key] ) ) $new_input[$key] = sanitize_text_field( $input[$key] );
        }

        // --- LÓGICA DO PIN (TAREFA 11) ---
        // O campo 'supervisor_pin' não é salvo na array de options principal, ele vai para uma option separada e hashada.
        if ( ! empty( $input['supervisor_pin'] ) ) {
            // Se o usuário digitou algo, atualiza o PIN usando o Helper
            if ( class_exists( 'ND_Security_Helper' ) ) {
                ND_Security_Helper::set_supervisor_pin( sanitize_text_field( $input['supervisor_pin'] ) );
            }
        }
        // Remove do array para não salvar em texto plano no banco (nativa_delivery_options)
        unset( $new_input['supervisor_pin'] );
        
        return $new_input;
    }

    public function sanitize_fiscal_options( $input ) {
        $new_input = array();
        if ( isset( $input['serie'] ) ) $new_input['serie'] = absint( $input['serie'] );
        if ( isset( $input['next_nnf'] ) ) $new_input['next_nnf'] = absint( $input['next_nnf'] );
        return $new_input;
    }

    // --- Exibição ---
    public function display_unified_settings_page() {
        ?>
        <div class="wrap">
            <h1>Configurações do Nativa Delivery</h1>
            <?php $active_tab = isset( $_GET['tab'] ) ? sanitize_key( $_GET['tab'] ) : 'geral'; ?>
            <nav class="nav-tab-wrapper">
                <a href="?page=nativa-delivery&tab=geral" class="nav-tab <?php echo $active_tab == 'geral' ? 'nav-tab-active' : ''; ?>">Geral</a>
                <a href="?page=nativa-delivery&tab=fiscal" class="nav-tab <?php echo $active_tab == 'fiscal' ? 'nav-tab-active' : ''; ?>">Fiscal (NFC-e)</a>
                <a href="?page=nativa-delivery&tab=horarios" class="nav-tab <?php echo $active_tab == 'horarios' ? 'nav-tab-active' : ''; ?>">Horários</a>
                <a href="?page=nativa-delivery&tab=pagamentos" class="nav-tab <?php echo $active_tab == 'pagamentos' ? 'nav-tab-active' : ''; ?>">Pagamentos</a>
                <a href="?page=nativa-delivery&tab=whatsapp" class="nav-tab <?php echo $active_tab == 'whatsapp' ? 'nav-tab-active' : ''; ?>">WhatsApp</a>
                <a href="?page=nativa-delivery&tab=tempos" class="nav-tab <?php echo $active_tab == 'tempos' ? 'nav-tab-active' : ''; ?>">Tempos de Espera</a>
                <a href="?page=nativa-delivery&tab=updates" class="nav-tab <?php echo $active_tab == 'updates' ? 'nav-tab-active' : ''; ?>">Atualizações</a>
            </nav>
            <?php if ($active_tab !== 'updates') : ?><form action="options.php" method="post"><?php endif; ?>
                <?php
                switch ( $active_tab ) {
                    case 'horarios': settings_fields( 'nativa_delivery_hours_options_group' ); $this->render_horarios_tab_content(); break;
                    case 'pagamentos': settings_fields( 'nativa_delivery_payments_options_group' ); do_settings_sections( 'nativa-delivery-payments-settings' ); break;
                    case 'whatsapp': settings_fields( 'nativa_delivery_whatsapp_options_group' ); do_settings_sections( 'nativa-delivery-whatsapp-settings' ); break;
                    case 'tempos': settings_fields( 'nativa_delivery_wait_times_options_group' ); do_settings_sections( 'nativa-delivery-wait-times-settings' ); break;
                    case 'fiscal': settings_fields( 'nativa_delivery_fiscal_options_group' ); do_settings_sections( 'nativa-delivery-fiscal-settings' ); break;
                    case 'updates': $this->display_updates_page(); break;
                    case 'geral': default: settings_fields( 'nativa_delivery_options_group' ); do_settings_sections( 'nativa-delivery-general-settings' ); break;
                }
                if ($active_tab !== 'updates') { submit_button( 'Salvar Alterações' ); }
                ?>
            <?php if ($active_tab !== 'updates') : ?></form><?php endif; ?>
        </div>
        <?php
    }

    private function render_horarios_tab_content() {
        $options = get_option('nativa_delivery_hours_options');
        $days_of_week = array('monday' => 'Segunda-feira', 'tuesday' => 'Terça-feira', 'wednesday' => 'Quarta-feira', 'thursday' => 'Quinta-feira', 'friday' => 'Sexta-feira', 'saturday' => 'Sábado', 'sunday' => 'Domingo');
        $service_types = array('store_hours' => 'Loja (Geral)', 'delivery' => 'Entrega', 'pickup' => 'Retirada', 'table' => 'Na Mesa');
        $hours_settings = new ND_Hours_Settings();
        do_settings_sections('nativa-delivery-hours-settings');
        echo '<hr><h2>Horários da Semana</h2><table class="form-table"><thead><tr><th>Dia da Semana</th><th>Ativo</th>';
        foreach ($service_types as $type_label) { echo '<th colspan="2">' . esc_html($type_label) . '</th>'; }
        echo '</tr><tr><th></th><th></th>';
        foreach ($service_types as $type_key => $type_label) { echo '<th>Abre</th><th>Fecha</th>'; }
        echo '</tr></thead><tbody>';
        foreach ($days_of_week as $day_key => $day_name) {
            echo '<tr id="row-' . esc_attr($day_key) . '"><td><strong>' . esc_html($day_name) . '</strong></td><td><label><input type="checkbox" name="nativa_delivery_hours_options[' . esc_attr($day_key) . '][is_active]" ' . checked(isset($options[$day_key]['is_active']) ? $options[$day_key]['is_active'] : 'off', 'on', false) . ' value="on"> Ativo</label></td>';
            foreach ($service_types as $type_key => $type_label) {
                echo '<td>'; $hours_settings->generate_time_input("{$day_key}][{$type_key}][open", $options[$day_key][$type_key]['open'] ?? '00:00'); echo '</td>';
                echo '<td>'; $hours_settings->generate_time_input("{$day_key}][{$type_key}][close", $options[$day_key][$type_key]['close'] ?? '00:00'); echo '</td>';
            }
            echo '</tr>';
        }
        echo '</tbody></table><hr><h3>Ferramentas de Horários</h3><button type="button" id="copy-hours-monday" class="button button-secondary">Copiar horários de Segunda para todos os dias</button>';
    }

    public function display_updates_page() {
        $template_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/nativa-updates-page-template.php';
        if ( file_exists( $template_path ) ) { require_once $template_path; } 
    }
}