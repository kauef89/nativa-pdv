<?php
/**
 * Gerencia o fechamento financeiro e fiscal dos pedidos.
 * Centraliza Lançamento de Caixa e Disparo de Nota Fiscal.
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

class ND_Financial_Handler {

    private $wpdb;

    public function __construct() {
        global $wpdb;
        $this->wpdb = $wpdb;
    }

    /**
     * Processa o fechamento de um pedido (Caixa + Fiscal).
     * Deve ser chamado quando o pedido atinge status 'finalizado'.
     */
    public function process_order_closing( $order_id ) {
        $order = $this->get_order_data( $order_id );
        
        if ( ! $order ) {
            error_log( "ND_Financial: Pedido #$order_id não encontrado para fechamento." );
            return;
        }

        // 1. Lançamento no Fluxo de Caixa
        $this->register_cash_entries( $order );

        // 2. Emissão Fiscal (NFC-e)
        // Só emite se configurado e se o ambiente for propício (ex: Produção ou Homologação Ativa)
        if ( defined('NATIVA_FISCAL_ENV') ) {
            $this->trigger_fiscal_emission( $order );
        }
    }

    /**
     * Lança os valores recebidos no Caixa Aberto.
     */
    private function register_cash_entries( $order ) {
        // Verifica se já foi lançado para evitar duplicidade
        $table_mov = $this->wpdb->prefix . 'nativa_caixa_movimentos';
        $exists = $this->wpdb->get_var( $this->wpdb->prepare(
            "SELECT id FROM $table_mov WHERE pedido_id = %d AND tipo LIKE 'venda_%'", 
            $order->id 
        ));

        if ( $exists ) return; // Já contabilizado

        // Busca pagamentos do pedido
        $payments = $this->get_order_payments( $order->id );
        if ( empty( $payments ) ) return;

        // Busca sessão de caixa aberta (do operador do pedido ou genérica)
        // Prioridade: Caixa do usuário que fechou o pedido -> Caixa Admin -> Erro
        $user_id = get_current_user_id() ?: $order->cliente_id; // Fallback
        $session_id = $this->get_open_session_id( $user_id );

        if ( ! $session_id ) {
            error_log( "ND_Financial: Nenhuma sessão de caixa aberta para registrar Venda #{$order->id}." );
            return; 
        }

        foreach ( $payments as $pay ) {
            // Apenas pagamentos aprovados entram no caixa
            if ( $pay->status !== 'aprovado' ) continue;

            $tipo_movimento = 'venda_' . $this->map_method_to_slug( $pay->metodo_pagamento );
            
            $this->wpdb->insert(
                $table_mov,
                [
                    'sessao_id'   => $session_id,
                    'tipo'        => $tipo_movimento, // ex: venda_dinheiro, venda_credito
                    'valor'       => $pay->valor,
                    'descricao'   => "Venda Pedido #{$order->id}",
                    'autor_id'    => $user_id,
                    'pedido_id'   => $order->id,
                    'created_at'  => current_time( 'mysql' )
                ],
                ['%d', '%s', '%f', '%s', '%d', '%d', '%s']
            );
        }
    }

    /**
     * Prepara e dispara a emissão da NFC-e.
     */
    private function trigger_fiscal_emission( $order ) {
        // Verifica se já foi emitida
        $meta = json_decode( $order->metadados_json, true );
        if ( ! empty( $meta['fiscal']['nfce_status'] ) && $meta['fiscal']['nfce_status'] === 'emitida' ) {
            return;
        }

        // Monta o payload fiscal (Item a item com NCM, CFOP, etc)
        $payload = $this->build_fiscal_payload( $order );

        // AQUI ENTRARIA A CHAMADA PARA SUA CLASSE DE CERTIFICADO/API
        // Exemplo: $result = ND_Fiscal_Certificate_Helper::emitir($payload);
        
        // Mock de sucesso por enquanto para salvar a intenção
        $this->log_fiscal_attempt( $order->id, 'pending', 'Aguardando implementação da API SEFAZ' );
    }

    // --- Helpers de Dados ---

    private function get_order_data( $order_id ) {
        $table = $this->wpdb->prefix . 'nativa_pdv_pedidos';
        return $this->wpdb->get_row( $this->wpdb->prepare( "SELECT * FROM $table WHERE id = %d", $order_id ) );
    }

    private function get_order_payments( $order_id ) {
        $table = $this->wpdb->prefix . 'nativa_pdv_pagamentos';
        return $this->wpdb->get_results( $this->wpdb->prepare( "SELECT * FROM $table WHERE pedido_id = %d", $order_id ) );
    }

    private function get_open_session_id( $user_id ) {
        $table = $this->wpdb->prefix . 'nativa_caixa_sessoes';
        // Tenta caixa do usuário
        $id = $this->wpdb->get_var( $this->wpdb->prepare( "SELECT id FROM $table WHERE user_id = %d AND status = 'aberto'", $user_id ) );
        if ( $id ) return $id;

        // Fallback: Qualquer caixa aberto (ex: caixa principal da loja)
        return $this->wpdb->get_var( "SELECT id FROM $table WHERE status = 'aberto' ORDER BY id DESC LIMIT 1" );
    }

    private function map_method_to_slug( $method ) {
        // Simplifica slugs para o padrão do caixa (venda_dinheiro, venda_cartao, etc)
        if ( strpos( $method, 'dinheiro' ) !== false ) return 'dinheiro';
        if ( strpos( $method, 'pix' ) !== false ) return 'pix';
        if ( strpos( $method, 'credito' ) !== false ) return 'credito';
        if ( strpos( $method, 'debito' ) !== false ) return 'debito';
        return 'outros';
    }

    private function build_fiscal_payload( $order ) {
        // Busca itens para montar o XML
        $table_itens = $this->wpdb->prefix . 'nativa_pdv_itens_pedido';
        $items = $this->wpdb->get_results( $this->wpdb->prepare( "SELECT * FROM $table_itens WHERE pedido_id = %d", $order->id ) );
        
        $fiscal_items = [];
        foreach ( $items as $item ) {
            // Aqui buscaríamos NCM/CEST do cadastro do produto (CPT)
            $ncm = get_field('fiscal_ncm', $item->produto_id) ?: '00000000';
            
            $fiscal_items[] = [
                'code' => $item->produto_id,
                'name' => $item->nome_produto,
                'ncm'  => $ncm,
                'qty'  => $item->quantidade,
                'price'=> $item->preco_unitario,
                'total'=> $item->subtotal
            ];
        }

        return [
            'order_id' => $order->id,
            'total'    => $order->total_geral,
            'items'    => $fiscal_items,
            // ... dados do cliente, pagamentos, etc.
        ];
    }

    private function log_fiscal_attempt( $order_id, $status, $msg ) {
        $order = $this->get_order_data($order_id);
        $meta = json_decode($order->metadados_json, true) ?: [];
        
        $meta['fiscal'] = [
            'nfce_status' => $status,
            'last_msg' => $msg,
            'timestamp' => current_time('mysql')
        ];

        $this->wpdb->update(
            $this->wpdb->prefix . 'nativa_pdv_pedidos',
            ['metadados_json' => json_encode($meta, JSON_UNESCAPED_UNICODE)],
            ['id' => $order_id]
        );
    }
}