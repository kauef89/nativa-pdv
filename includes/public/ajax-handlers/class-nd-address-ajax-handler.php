<?php
/**
 * Lida com chamadas AJAX relacionadas aos endereços dos usuários.
 * ... (histórico de versões anterior) ...
 * VERSÃO CORRIGIDA (SINTAXE): Remove um fecha-chaves '}' extra no final do ficheiro que causava um erro fatal silencioso.
 * VERSÃO ATUALIZADA: Adiciona validação para impedir apelidos de endereço duplicados por usuário.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Address_Ajax_Handler {

    public static function register_hooks() {
        add_action( 'wp_ajax_nativa_delivery_get_my_addresses', array( __CLASS__, 'get_my_addresses_ajax' ) );
        add_action( 'wp_ajax_nativa_delivery_add_or_update_address', array( __CLASS__, 'add_or_update_address_ajax' ) );
        add_action( 'wp_ajax_nativa_delivery_delete_address', array( __CLASS__, 'delete_address_ajax' ) );
    }

    private static function get_sorted_addresses( $user_id ) {
        $addresses = get_user_meta( $user_id, 'nativa_user_addresses', true );
        if ( ! is_array( $addresses ) ) {
            return array();
        }
        // Ordena para que o primário venha primeiro, depois por apelido
        usort($addresses, function($a, $b) {
            $primary_a = $a['is_primary'] ?? false;
            $primary_b = $b['is_primary'] ?? false;
            if ($primary_a !== $primary_b) {
                return $primary_b - $primary_a; // Primário primeiro
            }
            return strcasecmp($a['apelido'] ?? '', $b['apelido'] ?? ''); // Ordena por apelido
        });
        return $addresses;
    }

    public static function get_my_addresses_ajax() {
        if ( ! is_user_logged_in() ) {
            wp_send_json_error( array( 'message' => 'Usuário não está logado.' ), 403 );
            return;
        }
        check_ajax_referer( 'nativa_delivery_ajax_nonce', 'nonce' );

        $user_id = get_current_user_id();
        $migration_done = get_user_meta( $user_id, '_nativa_address_migration_done', true );

        if ( ! $migration_done ) {
            $migrated_addresses = array();
            $old_addresses_query = new WP_Query( array(
                'post_type'      => 'enderecos',
                'posts_per_page' => -1,
                'author'         => $user_id,
                'post_status'    => 'publish'
            ) );

            if ( $old_addresses_query->have_posts() ) {
                while ( $old_addresses_query->have_posts() ) {
                    $old_addresses_query->the_post();
                    $address_id = get_the_ID();
                    $migrated_addresses[] = array(
                        'id'          => 'migrated_' . $address_id,
                        'apelido'     => get_the_title(),
                        'street'      => urlencode(get_post_meta( $address_id, 'street', true )),
                        'number'      => get_post_meta( $address_id, 'number', true ),
                        'complement'  => get_post_meta( $address_id, 'complement', true ),
                        'bairro_id'   => intval(get_post_meta( $address_id, 'bairro_id', true )),
                        'is_primary'  => (bool) get_post_meta( $address_id, 'is_primary', true ),
                         // Adiciona campos de geolocalização vazios para consistência
                        'latitude'    => '',
                        'longitude'   => '',
                    );
                    wp_delete_post( $address_id, true );
                }
            }
            wp_reset_postdata();

            if ( ! empty( $migrated_addresses ) ) {
                $existing_addresses = get_user_meta( $user_id, 'nativa_user_addresses', true );
                if( !is_array($existing_addresses) ) $existing_addresses = [];
                $all_addresses = array_merge($existing_addresses, $migrated_addresses);
                update_user_meta( $user_id, 'nativa_user_addresses', $all_addresses );
            }
            update_user_meta( $user_id, '_nativa_address_migration_done', true );
        }

        wp_send_json_success( self::get_sorted_addresses($user_id) );
    }

    public static function add_or_update_address_ajax() {
        if ( ! is_user_logged_in() ) {
            wp_send_json_error( array( 'message' => 'Usuário não está logado.' ), 403 );
            return;
        }
        check_ajax_referer( 'nativa_delivery_ajax_nonce', 'nonce' );

        if ( ! isset( $_POST['form_data'] ) ) {
            wp_send_json_error( array( 'message' => 'Dados do formulário não recebidos.' ), 400 );
            return;
        }

        parse_str( $_POST['form_data'], $form_data );

        $required_fields = array( 'nativa-delivery-address-street-name', 'bairro_id', 'apelido' ); // Adicionado 'apelido' aos obrigatórios
        if ( ! isset( $form_data['no_number'] ) || $form_data['no_number'] !== 'on' ) {
            $required_fields[] = 'number';
        }

        foreach ( $required_fields as $field ) {
            if ( empty( $form_data[ $field ] ) ) {
                 // Adiciona uma verificação específica para o apelido
                $error_message = ($field === 'apelido')
                    ? "O Apelido do endereço é obrigatório (Ex: Casa, Trabalho)."
                    : "Campos obrigatórios do endereço ausentes ({$field}).";
                wp_send_json_error( array( 'message' => $error_message ), 400 );
                return;
            }
        }
        
        $user_id = get_current_user_id();
        $addresses = get_user_meta( $user_id, 'nativa_user_addresses', true );
        if ( ! is_array( $addresses ) ) {
            $addresses = array();
        }

        $address_id_from_form = isset( $form_data['address_id'] ) && !empty($form_data['address_id']) ? $form_data['address_id'] : null;
        $submitted_apelido = sanitize_text_field( $form_data['apelido'] );
        $is_primary = isset( $form_data['is_primary'] ) && $form_data['is_primary'] === 'on';

        // --- INÍCIO DA MODIFICAÇÃO: Validação de apelido duplicado ---
        $submitted_apelido_lower = strtolower( trim( $submitted_apelido ) );
        foreach ( $addresses as $index => $existing_address ) {
            $existing_apelido_lower = strtolower( trim( $existing_address['apelido'] ?? '' ) );
            $existing_id = $existing_address['id'] ?? null;

            // Compara apelidos E verifica se os IDs são diferentes
            // (permite salvar o mesmo apelido ao EDITAR um endereço existente)
            if ( $existing_apelido_lower === $submitted_apelido_lower && $existing_id !== $address_id_from_form ) {
                wp_send_json_error( array( 'message' => 'Você já possui um endereço com o apelido "' . esc_html($submitted_apelido) . '". Escolha um apelido diferente.' ), 400 );
                return;
            }
        }
        // --- FIM DA MODIFICAÇÃO ---

        $address_id = $address_id_from_form ?: 'new_' . uniqid(); // Usa ID existente ou gera um novo

        if ( $is_primary ) {
            foreach ( $addresses as &$addr ) { // Usa referência para modificar o array original
                $addr['is_primary'] = false;
            }
            unset($addr); // Quebra a referência
        } elseif ( empty($addresses) ) {
             // Se for o primeiro endereço, força a ser primário
             $is_primary = true;
        }

        $new_address_data = array(
            'id'          => $address_id,
            'apelido'     => $submitted_apelido, // Já sanitizado
            'street'      => urlencode(sanitize_text_field( $form_data['nativa-delivery-address-street-name'] )),
            'number'      => isset( $form_data['no_number'] ) && $form_data['no_number'] === 'on' ? 'S/N' : sanitize_text_field( $form_data['number'] ),
            'complement'  => sanitize_text_field( $form_data['complement'] ?? '' ),
            'bairro_id'   => intval( $form_data['bairro_id'] ),
            'is_primary'  => $is_primary,
            'latitude'    => isset( $form_data['latitude'] ) ? sanitize_text_field( $form_data['latitude'] ) : '', // Sanitiza lat/lon
            'longitude'   => isset( $form_data['longitude'] ) ? sanitize_text_field( $form_data['longitude'] ) : '', // Sanitiza lat/lon
        );
        
        $address_index = false;
        if($address_id_from_form) { // Só busca índice se estiver editando
             $address_index = array_search( $address_id_from_form, array_column( $addresses, 'id' ) );
        }

        if ( $address_index !== false ) {
            $addresses[ $address_index ] = $new_address_data;
        } else {
            $addresses[] = $new_address_data;
        }

        update_user_meta( $user_id, 'nativa_user_addresses', $addresses );

        wp_send_json_success( array(
            'message' => 'Endereço salvo com sucesso!',
            'addresses' => self::get_sorted_addresses($user_id)
        ) );
    }

    public static function delete_address_ajax() {
        if ( ! is_user_logged_in() ) {
            wp_send_json_error( array( 'message' => 'Usuário não está logado.' ), 403 );
            return;
        }
        check_ajax_referer( 'nativa_delivery_ajax_nonce', 'nonce' );

        $address_id = isset( $_POST['address_id'] ) ? sanitize_text_field( $_POST['address_id'] ) : '';
        if ( empty( $address_id ) ) {
            wp_send_json_error( array( 'message' => 'ID do endereço inválido.' ), 400 );
            return;
        }

        $user_id = get_current_user_id();
        $addresses = get_user_meta( $user_id, 'nativa_user_addresses', true );

        if ( ! is_array( $addresses ) ) {
            wp_send_json_error( array( 'message' => 'Nenhum endereço para excluir.' ), 404 );
            return;
        }
        
        $address_found = false;
        $updated_addresses = array();
        $deleted_was_primary = false; // Flag para verificar se o primário foi excluído

        foreach ( $addresses as $address ) {
            if ( isset( $address['id'] ) && $address['id'] == $address_id ) {
                $address_found = true;
                if ($address['is_primary'] ?? false) {
                     $deleted_was_primary = true;
                }
                continue; // Não adiciona o endereço excluído ao novo array
            }
            $updated_addresses[] = $address;
        }

        if ( ! $address_found ) {
            wp_send_json_error( array( 'message' => 'Endereço não encontrado.' ), 404 );
            return;
        }

        // Se o endereço excluído era o primário e ainda existem outros endereços,
        // define o primeiro endereço restante como primário.
        if ($deleted_was_primary && !empty($updated_addresses)) {
             $updated_addresses[0]['is_primary'] = true;
        }


        update_user_meta( $user_id, 'nativa_user_addresses', $updated_addresses );

        wp_send_json_success( array(
            'message' => 'Endereço excluído com sucesso.',
            'addresses' => self::get_sorted_addresses($user_id)
        ) );
    }
}

ND_Address_Ajax_Handler::register_hooks();