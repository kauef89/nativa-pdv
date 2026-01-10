<?php
/**
 * Lida com as requisições AJAX para upload e importação de arquivos CSV.
 * VERSÃO CORRIGIDA (2.0): Suporte a campos multiline e detecção avançada de delimitador.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_CSV_Importer_Ajax_Handler {

    public function __construct() {
        add_action( 'wp_ajax_nativa_delivery_upload_csv', array( $this, 'handle_csv_upload' ) );
    }

    public function handle_csv_upload() {
        ob_start();

        if ( ! current_user_can( 'manage_options' ) ) {
            ob_get_clean();
            wp_send_json_error( array( 'message' => __( 'Acesso negado.', 'nativa-delivery' ) ) );
        }

        if ( ! isset( $_POST['nativa_csv_upload_nonce'] ) || ! wp_verify_nonce( $_POST['nativa_csv_upload_nonce'], 'nativa_delivery_csv_upload' ) ) {
            ob_get_clean();
            wp_send_json_error( array( 'message' => __( 'Nonce de segurança inválido.', 'nativa-delivery' ) ) );
        }

        if ( ! isset( $_FILES['csv_file'] ) || empty( $_FILES['csv_file']['tmp_name'] ) ) {
            ob_get_clean();
            wp_send_json_error( array( 'message' => __( 'Nenhum arquivo enviado.', 'nativa-delivery' ) ) );
        }

        $cpt_type = isset( $_POST['cpt_type'] ) ? sanitize_key( $_POST['cpt_type'] ) : '';
        $special_importers = ['nativa_loyalty'];
        
        if ( ! post_type_exists( $cpt_type ) && ! in_array( $cpt_type, $special_importers, true ) ) {
            ob_get_clean();
            wp_send_json_error( array( 'message' => __( 'Tipo de CPT inválido.', 'nativa-delivery' ) ) );
        }

        $filepath = $_FILES['csv_file']['tmp_name'];

        // --- INÍCIO DA LEITURA ROBUSTA (fgetcsv) ---
        $csv_data = [];
        if ( ( $handle = fopen( $filepath, 'r' ) ) !== FALSE ) {
            
            // 1. Detectar BOM (Byte Order Mark) e remover
            $bom = fread($handle, 3);
            if ($bom !== pack('H*','EFBBBF')) {
                rewind($handle); // Se não tiver BOM, volta pro início
            }
            
            // 2. Detectar Delimitador (Lê a primeira linha para analisar)
            $first_line = fgets($handle);
            $delimiter = ',';
            if ( $first_line && substr_count( $first_line, ';' ) > substr_count( $first_line, ',' ) ) {
                $delimiter = ';';
            }
            
            // Volta o ponteiro para o início (após o BOM, se houver, ou total)
            rewind($handle);
            if ($bom === pack('H*','EFBBBF')) {
                fread($handle, 3); // Pula o BOM novamente se ele existia
            }

            // 3. Ler o CSV respeitando quebras de linha dentro das células (fgetcsv)
            while ( ( $row = fgetcsv( $handle, 0, $delimiter ) ) !== FALSE ) {
                // Ignora linhas totalmente vazias (fgetcsv pode retornar [null])
                if ( array_filter( $row ) ) {
                    $csv_data[] = $row;
                }
            }
            fclose( $handle );
        }

        if ( empty( $csv_data ) || count( $csv_data ) < 2 ) {
            ob_get_clean();
            wp_send_json_error( array( 'message' => __( 'O arquivo CSV está vazio ou ilegível.', 'nativa-delivery' ) ) );
        }
        // --- FIM DA LEITURA ---

        // O cabeçalho é a primeira linha extraída
        $headers = array_map( 'sanitize_title', array_shift( $csv_data ) );
        
        // Remove possíveis caracteres invisíveis do início do primeiro cabeçalho (segurança extra contra BOM)
        if ( ! empty( $headers ) ) {
            $headers[0] = preg_replace( '/[\x00-\x1F\x80-\xFF]/', '', $headers[0] );
        }

        $processed_count = 0;
        $errors = array();

        switch ( $cpt_type ) {
            case 'nativa_produto':
                require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-product-importer.php';
                $importer = new ND_Product_Importer();
                break;
            case 'nativa_bairro':
                require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-bairro-importer.php';
                $importer = new ND_Bairro_Importer();
                break;
            case 'nativa_rua':
                require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-rua-importer.php';
                $importer = new ND_Rua_Importer();
                break;
            case 'nativa_adic_grupo': 
                require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-adicional-importer.php'; 
                $importer = new ND_Adicional_Group_Importer();
                break;
            case 'nativa_combo': 
                require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-combo-importer.php';
                $importer = new ND_Combo_Importer();
                break;
            case 'nativa_cupom': 
                require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-coupon-importer.php';
                $importer = new ND_Coupon_Importer();
                break;
            case 'nativa_oferta': 
                require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-offer-importer.php';
                $importer = new ND_Offer_Importer();
                break;
            case 'nativa_loyalty': 
                require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/importers/class-nd-loyalty-importer.php';
                $importer = new ND_Loyalty_Importer();
                break;
            default:
                ob_get_clean();
                wp_send_json_error( array( 'message' => __( 'Tipo de CPT não suportado para importação.', 'nativa-delivery' ) ) );
                return;
        }

        $import_result = $importer->import_csv( $csv_data, $headers );
        $processed_count = $import_result['processed_count'];
        $errors = $import_result['errors'];
        
        $last_uploads = get_option( 'nativa_delivery_last_uploads', array() );
        $status_message = sprintf( __( '%d item(ns) processado(s).', 'nativa-delivery' ), $processed_count );
        $status_text = 'success';

        if ( ! empty( $errors ) ) {
            $status_text = 'error';
            $status_message .= ' ' . sprintf( __( '%d erro(s) encontrado(s).', 'nativa-delivery' ), count( $errors ) );
        }

        $last_uploads[ $cpt_type ] = array(
            'timestamp' => current_time( 'timestamp' ), 'status' => $status_text,
            'message' => $status_message, 'errors_details' => $errors,
        );
        update_option( 'nativa_delivery_last_uploads', $last_uploads );

        $output = ob_get_clean();
        if ( ! empty( $output ) ) {
             // Opcional: Logar output inesperado para debug, mas não quebrar o JSON se possível
             // $errors[] = 'Debug: ' . $output; 
        }

        wp_send_json_success( array(
            'message' => __( 'Importação concluída.', 'nativa-delivery' ) . ' ' . $status_message,
            'timestamp' => date_i18n( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), current_time( 'timestamp' ) ),
            'status' => $status_text, 'details' => $status_message, 'errors' => $errors,
        ) );
    }
}