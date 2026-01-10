<?php
/**
 * Template para incluir todas as bottom sheets da aplicação.
 * VERSÃO CORRIGIDA: Adiciona o sheet de edição de telefone.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$sheets_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/sheets/';

// Inclui cada ficha a partir de seu próprio arquivo de template.
include_once $sheets_path . 'nativa-modality-sheet.php';
include_once $sheets_path . 'nativa-product-details-sheet.php';
include_once $sheets_path . 'nativa-address-form-sheet.php';
include_once $sheets_path . 'nativa-cart-side-sheet.php';
include_once $sheets_path . 'nativa-combo-wizard-sheet.php';
include_once $sheets_path . 'nativa-login-prompt-sheet.php';
include_once $sheets_path . 'nativa-onboarding-sheet.php';
include_once $sheets_path . 'nativa-loyalty-rules-sheet.php';

// --- INÍCIO DA MODIFICAÇÃO: OBRIGATÓRIO PARA O BOTÃO FUNCIONAR ---
include_once $sheets_path . 'nativa-phone-edit-sheet.php';
// --- FIM DA MODIFICAÇÃO ---

include_once $sheets_path . 'nativa-reorder-sheet.php';
include_once $sheets_path . 'nativa-rewards-sheet.php';
include_once $sheets_path . 'nativa-save-favorite-sheet.php';
include_once $sheets_path . 'nativa-legal-sheet.php';
include_once $sheets_path . 'nativa-contact-sheet.php';

?>
<div class="nativa-hidden-content" aria-hidden="true" style="display: none;">
    <?php
    include_once $sheets_path . 'nativa-legal-content.php';
    ?>
</div>