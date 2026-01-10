<?php
/**
 * Lógica de ativação do plugin.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes
 * VERSÃO CORRIGIDA: Garante que os CPTs e Taxonomias sejam registrados
 * e as regras de reescrita sejam atualizadas no momento da ativação.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Activator {
    public static function activate() {
        // --- INÍCIO DA MODIFICAÇÃO ---
        // Garante que as dependências para registro de CPTs e Taxonomias estejam carregadas.
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/class-nd-cpt-manager.php';
        require_once NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/class-nd-taxonomy-manager.php';

        // Instancia os gerenciadores e registra os CPTs e Taxonomias.
        // Isso é crucial para que o WordPress os reconheça ANTES de atualizar os links permanentes.
        $cpt_manager = new ND_CPT_Manager();
        $cpt_manager->register_custom_post_types();

        $taxonomy_manager = new ND_Taxonomy_Manager();
        $taxonomy_manager->register_custom_taxonomies();
        $taxonomy_manager->register_default_terms();

        // Atualiza as regras de reescrita do WordPress para incluir os novos CPTs.
        // Este é o passo que efetivamente "salva" os links permanentes.
        flush_rewrite_rules();
        // --- FIM DA MODIFICAÇÃO ---
    }
}