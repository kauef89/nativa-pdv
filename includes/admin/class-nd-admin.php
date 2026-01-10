<?php
/**
 * Classe principal para a área de administração do plugin.
 * VERSÃO ATUALIZADA (FISCAL): Adiciona a aba 'Fiscal (NFC-e)' no menu de configurações.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Admin {

    protected $plugin_name;
    protected $version;
    private $debug_urls = [];

    public function __construct( $plugin_name, $version ) {
        $this->plugin_name = $plugin_name;
        $this->version     = $version;

        add_action( 'admin_menu', array( $this, 'add_plugin_admin_menu' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_scripts' ) );
        add_action( 'admin_head', array( $this, 'print_debug_urls' ) );
        add_action( 'admin_action_nativa_export_csv', array( $this, 'handle_csv_export' ) );
        add_filter( 'script_loader_tag', array( $this, 'add_module_type_attribute_admin' ), 10, 2 );
        
        // Hooks de Perfil e Quick Edit
        add_action( 'show_user_profile', array( $this, 'add_payment_restriction_field' ) );
        add_action( 'edit_user_profile', array( $this, 'add_payment_restriction_field' ) );
        add_action( 'personal_options_update', array( $this, 'save_payment_restriction_field' ) );
        add_action( 'edit_user_profile_update', array( $this, 'save_payment_restriction_field' ) );
        add_action( 'wp_ajax_nativa_quick_field_update', array( $this, 'handle_quick_field_update_ajax' ) );
        add_action( 'admin_footer', array( $this, 'inject_quick_status_script' ) );
    }

    public function add_module_type_attribute_admin( $tag, $handle ) {
        if ( $this->plugin_name . '-admin-scripts' === $handle ) {
            return str_replace( ' src=', ' type="module" src=', $tag );
        }
        return $tag;
    }

    public function print_debug_urls() {
        if ( ! empty( $this->debug_urls ) ) {
            echo "\n";
            foreach ( $this->debug_urls as $handle => $url ) {
                echo "\n";
            }
            echo "\n";
        }
    }

    public function add_plugin_admin_menu() {
        add_menu_page(
            __( 'Nativa Delivery', 'nativa-delivery' ),
            __( 'Nativa Delivery', 'nativa-delivery' ),
            'manage_options',
            $this->plugin_name,
            array( $this, 'display_unified_settings_page' ),
            'dashicons-store',
            25
        );
    
        add_submenu_page(
            $this->plugin_name,
            __( 'Configurações', 'nativa-delivery' ),
            __( 'Configurações', 'nativa-delivery' ),
            'manage_options',
            $this->plugin_name, 
            array( $this, 'display_unified_settings_page' )
        );

        add_submenu_page( 'nativa-delivery', 'Categorias de Produtos', 'Categorias', 'manage_options', 'edit-tags.php?taxonomy=category&post_type=nativa_produto' );
        add_submenu_page( $this->plugin_name, __( 'Ofertas de Carrinho', 'nativa-delivery' ), __( 'Ofertas', 'nativa-delivery' ), 'manage_options', 'edit.php?post_type=nativa_oferta' );
        add_submenu_page( $this->plugin_name, __( 'Notificações Push', 'nativa-delivery' ), __( 'Notificações Push', 'nativa-delivery' ), 'manage_options', $this->plugin_name . '-push-notifications', array( $this, 'display_push_notifications_page' ) );
        add_submenu_page( $this->plugin_name, __( 'Clientes', 'nativa-delivery' ), __( 'Clientes', 'nativa-delivery' ), 'manage_options', $this->plugin_name . '-customers', array( $this, 'display_customers_page' ) );
        add_submenu_page( $this->plugin_name, __( 'Fidelidade Na Faixa', 'nativa-delivery' ), __( 'Fidelidade', 'nativa-delivery' ), 'manage_options', 'nativa-delivery-loyalty-settings', array( $this, 'display_loyalty_settings_page' ) );
        add_submenu_page( $this->plugin_name, __( 'Entregadores', 'nativa-delivery' ), __( 'Entregadores', 'nativa-delivery' ), 'manage_options', 'edit.php?post_type=nativa_entregador' );
    }
    
    public function display_addresses_page() {}

    public function handle_csv_export() {
        if ( ! current_user_can( 'manage_options' ) ) wp_die( __( 'Acesso negado.', 'nativa-delivery' ) );
        $cpt_slug = isset( $_GET['cpt'] ) ? sanitize_key( $_GET['cpt'] ) : '';
        $export_type = isset( $_GET['type'] ) ? sanitize_key( $_GET['type'] ) : 'data';
        
        if ( empty( $cpt_slug ) ) wp_die( __( 'Tipo de item para exportação não especificado.', 'nativa-delivery' ) );
        check_admin_referer( 'nativa_export_nonce_' . $cpt_slug );
        
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/helpers/class-nativa-delivery-exporter-helper.php';
        $csv_content = Nativa_Delivery_Exporter_Helper::generate_csv_for_cpt( $cpt_slug, $export_type );
        if ( is_wp_error( $csv_content ) ) wp_die( $csv_content->get_error_message() );
        
        $filename_suffix = ($export_type === 'template') ? '_template_' : '_export_';
        $filename = $cpt_slug . $filename_suffix . date( 'Y-m-d' ) . '.csv';
        header( 'Content-Type: text/csv; charset=utf-8' );
        header( 'Content-Disposition: attachment; filename=' . $filename );
        echo $csv_content;
        exit();
    }

    // --- AQUI ESTÁ A MÁGICA: Adicionando a aba Fiscal ---
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
                    case 'updates': $this->display_updates_page(); break;
                    
                    // LÓGICA DA ABA FISCAL
                    case 'fiscal': 
                        settings_fields( 'nativa_delivery_fiscal_options_group' ); 
                        do_settings_sections( 'nativa-delivery-fiscal-settings' ); 
                        break;
                    // FIM LÓGICA FISCAL

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

    public function display_push_notifications_page() {
        $template_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/nativa-push-notifications-page-template.php';
        if ( file_exists( $template_path ) ) { require_once $template_path; } 
        else { echo '<div class="wrap"><h1>Notificações Push</h1><p>Em desenvolvimento...</p></div>'; }
    }

    public function display_customers_page() {
        $template_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/nativa-customers-page-template.php';
        if ( file_exists( $template_path ) ) { require_once $template_path; } 
        else { echo '<div class="wrap"><h1>Erro</h1><p>O arquivo de template da página de clientes não foi encontrado.</p></div>'; }
    }

    public function display_updates_page() {
        $template_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/nativa-updates-page-template.php';
        if ( file_exists( $template_path ) ) { require_once $template_path; } 
        else { echo '<div class="wrap"><h1>Erro Fatal</h1><p>O arquivo de template da página de atualizações não foi encontrado.</p></div>'; }
    }

    public function display_loyalty_settings_page() {
        acf_form_head();
        ?>
        <div class="wrap"><h1>Configurações do Programa de Fidelidade "Na Faixa"</h1><p>Defina as regras...</p>
            <?php acf_form(array('post_id' => 'options', 'field_groups' => array('group_nativa_loyalty_settings'), 'submit_value' => 'Salvar Configurações...', 'updated_message' => 'Configurações salvas...',)); ?>
        </div>
        <?php
    }

    public function add_payment_restriction_field( $user ) {
        if ( ! current_user_can( 'manage_options' ) ) return;
        $restriction = get_user_meta( $user->ID, '_nativa_payment_restriction', true );
        $is_restricted = ( $restriction === 'pix_only' );
        ?>
        <h3><?php _e( 'Controle de Pagamento (Nativa Delivery)', 'nativa-delivery' ); ?></h3>
        <table class="form-table">
            <tr>
                <th><label for="nativa-payment-restriction"><?php _e( 'Restringir Pagamento', 'nativa-delivery' ); ?></label></th>
                <td>
                    <label>
                        <input type="checkbox" name="_nativa_payment_restriction" id="nativa-payment-restriction" value="pix_only" <?php checked( $is_restricted, true ); ?>>
                        <?php _e( 'Restringir esta conta para pagamentos via PIX (Automático ou Manual)', 'nativa-delivery' ); ?>
                    </label>
                    <p class="description"><?php _e( 'Se marcado, este cliente só poderá finalizar pedidos usando formas de pagamento com a categoria "PIX Automático" ou "PIX Manual". Todas as outras (dinheiro, cartão) aparecerão desabilitadas.', 'nativa-delivery' ); ?></p>
                </td>
            </tr>
        </table>
        <?php
    }

    public function save_payment_restriction_field( $user_id ) {
        if ( ! current_user_can( 'manage_options' ) ) return;
        if ( ! check_admin_referer( 'update-user_' . $user_id ) ) return;
        $new_value = isset( $_POST['_nativa_payment_restriction'] ) ? sanitize_key( $_POST['_nativa_payment_restriction'] ) : '';
        if ( ! empty( $new_value ) && $new_value === 'pix_only' ) {
            update_user_meta( $user_id, '_nativa_payment_restriction', $new_value );
        } else {
            delete_user_meta( $user_id, '_nativa_payment_restriction' );
        }
    }

    public function handle_quick_field_update_ajax() {
        if ( ! current_user_can( 'manage_options' ) ) wp_send_json_error( array( 'message' => 'Sem permissão.' ) );
        $post_id   = isset( $_POST['post_id'] ) ? absint( $_POST['post_id'] ) : 0;
        $field_key = isset( $_POST['field_key'] ) ? sanitize_text_field( $_POST['field_key'] ) : '';
        $value     = isset( $_POST['value'] ) ? sanitize_text_field( $_POST['value'] ) : '';
        if ( ! $post_id || ! $field_key ) wp_send_json_error( array( 'message' => 'Dados incompletos.' ) );
        if ( function_exists( 'update_field' ) ) {
            update_field( $field_key, $value, $post_id );
            $post_type = get_post_type( $post_id );
            if ( $post_type === 'nativa_produto' || $post_type === 'nativa_adic_grupo' ) { delete_transient( 'nativa_menu_data_cache_0' ); }
            wp_send_json_success( array( 'message' => 'Atualizado com sucesso.' ) );
        } else {
            wp_send_json_error( array( 'message' => 'ACF não encontrado.' ) );
        }
    }

    public function inject_quick_status_script() {
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            $('.nativa-quick-status-select').on('change', function() {
                var $select = $(this);
                var post_id = $select.data('post-id');
                var field_key = $select.data('field-key');
                var new_value = $select.val();
                $select.prop('disabled', true).css('opacity', '0.5');
                $.ajax({
                    url: ajaxurl,
                    type: 'POST',
                    data: { action: 'nativa_quick_field_update', post_id: post_id, field_key: field_key, value: new_value },
                    success: function(response) {
                        if (response.success) {
                            $select.css('border-color', '#46b450'); setTimeout(function() { $select.css('border-color', ''); }, 2000);
                        } else {
                            alert('Erro ao atualizar: ' + (response.data.message || 'Desconhecido')); $select.css('border-color', '#dc3232');
                        }
                    },
                    error: function() { alert('Erro de conexão.'); $select.css('border-color', '#dc3232'); },
                    complete: function() { $select.prop('disabled', false).css('opacity', '1'); }
                });
            });
        });
        </script>
        <?php
    }

    public function enqueue_scripts( $hook_suffix ) {
        $admin_style_path = NATIVADELIVERY_PLUGIN_DIR . 'assets/src/css/admin-style.css';
        $admin_style_url = NATIVADELIVERY_PLUGIN_URL . 'assets/src/css/admin-style.css';
        $admin_style_version = file_exists($admin_style_path) ? filemtime($admin_style_path) : $this->version;
        wp_enqueue_style( $this->plugin_name . '-admin-style', $admin_style_url, array(), $admin_style_version, 'all' );
        
        $this->debug_urls[$this->plugin_name . '-admin-style'] = $admin_style_url;
        
        $is_customers_page = strpos($hook_suffix, 'nativa-delivery-customers') !== false;
        if ($is_customers_page) {
            wp_enqueue_style( 'nativa-delivery-admin-material-symbols', 'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0,0' );
            $customers_style_path = NATIVADELIVERY_PLUGIN_DIR . 'assets/src/css/admin-customers-page.css';
            $customers_style_url = NATIVADELIVERY_PLUGIN_URL . 'assets/src/css/admin-customers-page.css';
            $customers_style_version = file_exists($customers_style_path) ? filemtime($customers_style_path) : $this->version;
            wp_enqueue_style( $this->plugin_name . '-admin-customers-style', $customers_style_url, array(), $customers_style_version, 'all' );
            $this->debug_urls[$this->plugin_name . '-admin-customers-style'] = $customers_style_url;
        }
        
        $screen = get_current_screen();
        $current_tab = $_GET['tab'] ?? '';

        $is_combo_edit_page = ( 'post.php' === $hook_suffix || 'post-new.php' === $hook_suffix ) && isset( $screen->post_type ) && 'nativa_combo' === $screen->post_type;
        $is_coupon_edit_page = ( 'post.php' === $hook_suffix || 'post-new.php' === $hook_suffix ) && isset( $screen->post_type ) && 'nativa_cupom' === $screen->post_type;
        $is_settings_page = 'toplevel_page_nativa-delivery' === $hook_suffix;
        $is_horarios_tab = $is_settings_page && 'horarios' === $current_tab;
        $is_updates_tab = $is_settings_page && 'updates' === $current_tab;
        $is_push_page = strpos($hook_suffix, 'nativa-delivery-push-notifications') !== false;
        
        if ($is_combo_edit_page || $is_coupon_edit_page || $is_horarios_tab || $is_updates_tab || $is_push_page) { 
            wp_enqueue_script(
                $this->plugin_name . '-admin-scripts',
                NATIVADELIVERY_PLUGIN_URL . 'assets/src/js/admin/admin-main.js', 
                array('jquery'),
                $this->version,
                true
            );

            wp_localize_script(
                $this->plugin_name . '-admin-scripts',
                'nativaAdminAjax',
                array(
                    'ajax_url' => admin_url( 'admin-ajax.php' ),
                    'nonce'    => wp_create_nonce( 'nativa_delivery_csv_upload' ),
                )
            );
        }
    }   
}