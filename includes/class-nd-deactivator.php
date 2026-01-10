<?php
/**
 * Lógica de desativação do plugin.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Deactivator {
    public static function deactivate() {
        // Lógica a ser executada na desativação do plugin.
        // Ex: Limpeza de dados temporários, agendamentos (cron jobs).
        // flush_rewrite_rules() será chamado pela classe Nativa_Delivery no hook de desativação.
    }
}