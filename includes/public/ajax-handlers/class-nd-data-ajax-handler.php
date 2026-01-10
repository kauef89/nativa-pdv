<?php
/**
 * Lida com as requisições AJAX de busca de dados gerais (menu, bairros, etc).
 * VERSÃO CORRIGIDA (ND): Corrige o nome da classe para ND_Data_Ajax_Handler para resolver erro fatal.
 * VERSÃO OTIMIZADA: Remove a função get_menu_data_ajax, que foi substituída por um endpoint da REST API.
 * VERSÃO CORRIGIDA: A função get_ruas_ajax agora retorna la lista completa de segmentos de rua para a lógica de auto-preenchimento de bairro.
 * VERSÃO CORRIGIDA (BUG HTTP 400): Remove a verificação de nonce (check_ajax_referer) de endpoints públicos que apenas
 * buscam dados e não modificam informações, resolvendo o erro que impedia o carregamento da aplicação.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Data_Ajax_Handler {

    public function __construct() {
        // --- INÍCIO DA MODIFICAÇÃO: Adiciona a nova ação ---
        $actions = [
            'get_bairros',
            'get_ruas',
            'get_live_status',
            'get_wait_times',
        ];
        // --- FIM DA MODIFICAÇÃO ---

        foreach ($actions as $action) {
            add_action("wp_ajax_nativa_delivery_{$action}", array($this, "{$action}_ajax"));
            add_action("wp_ajax_nopriv_nativa_delivery_{$action}", array($this, "{$action}_ajax"));
        }
    }
    
    // --- INÍCIO DA MODIFICAÇÃO: Nova função para fornecer os tempos de espera ---
    /**
     * Endpoint AJAX para buscar os tempos de espera calculados.
     */
    public function get_wait_times_ajax() {
        // Não é necessário nonce check para uma simples busca de dados públicos.
        if ( ! class_exists('ND_Wait_Time_Helper') ) {
            wp_send_json_error( 'Classe de cálculo de tempo não encontrada.', 500 );
            return;
        }
        $wait_times = ND_Wait_Time_Helper::calculate_wait_times();
        wp_send_json_success( $wait_times );
    }
    // --- FIM DA MODIFICAÇÃO ---

    public function get_bairros_ajax() {
        $cached_bairros = get_transient( 'nativa_all_bairros' );
        if ( false !== $cached_bairros ) {
            wp_send_json_success( array( 'bairros' => $cached_bairros ) );
            return;
        }
        $bairros_data = array();
        $bairros_query = new WP_Query( array(
            'post_type' => 'nativa_bairro', 'posts_per_page' => -1, 'post_status' => 'publish', 'orderby' => 'title', 'order' => 'ASC',
        ) );
        if ( $bairros_query->have_posts() ) {
            while ( $bairros_query->have_posts() ) {
                $bairros_query->the_post();
                $taxa_entrega = round(get_field( 'taxa_entrega', get_the_ID() ) ? floatval( get_field( 'taxa_entrega', get_the_ID() ) ) : 0.00, 2);
                $valor_minimo_frete_gratis = round(get_field( 'valor_minimo_frete_gratis', get_the_ID() ) ? floatval( get_field( 'valor_minimo_frete_gratis', get_the_ID() ) ) : 0.00, 2);
                $bairros_data[] = array( 'id' => get_the_ID(), 'nome' => get_the_title(), 'taxa_entrega' => $taxa_entrega, 'valor_minimo_frete_gratis' => $valor_minimo_frete_gratis, );
            }
            wp_reset_postdata();
        }
        set_transient( 'nativa_all_bairros', $bairros_data, 12 * HOUR_IN_SECONDS );
        wp_send_json_success( array( 'bairros' => $bairros_data ) );
    }

    public function get_ruas_ajax() {
        $bairro_id = isset( $_POST['bairro_id'] ) ? absint( $_POST['bairro_id'] ) : 0;
        $search_term = isset( $_POST['search_term'] ) ? sanitize_text_field( $_POST['search_term'] ) : '';
        $args = array( 'post_type' => 'nativa_rua', 'posts_per_page' => -1, 'post_status' => 'publish', 'orderby' => 'title', 'order' => 'ASC' );
        if ( $bairro_id ) $args['meta_query'] = array( array( 'key' => 'bairro_associado', 'value' => $bairro_id, 'compare' => '=' ) );
        if ( ! empty( $search_term ) ) $args['s'] = $search_term;
        $ruas_data = array();
        $ruas_query = new WP_Query( $args );
        if ( $ruas_query->have_posts() ) {
            while ( $ruas_query->have_posts() ) {
                $ruas_query->the_post();
                $rua_id = get_the_ID();
                $segmentos = get_field('rua_segmentos', $rua_id);
                $ruas_data[] = array( 
                    'id' => $rua_id, 
                    'nome' => get_the_title(), 
                    'segmentos' => $segmentos ?: [], 
                );
            }
            wp_reset_postdata();
        }
        wp_send_json_success( array( 'ruas' => $ruas_data ) );
    }

    public function get_live_status_ajax() {
        $status = ND_Hours_Helper::get_all_service_status();
        
        $status['nextOpeningTime'] = ! $status['is_store_open'] ? ND_Hours_Helper::get_next_opening_time_string() : '';
        
        wp_send_json_success( $status );
    }
}