<?php
/**
 * Template para a página "Meus Endereços" da SPA.
 * VERSÃO ATUALIZADA: Removida a estrutura duplicada da bottom sheet de endereço,
 * que agora é carregada globalmente a partir de nativa-bottom-sheets.php.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div class="nativa-page-container">
    <div class="nativa-my-account-header">
        <div class="header-content">
            <a href="/minha-conta" class="back-link" data-route="/minha-conta">
                <span class="material-symbols-rounded">arrow_back</span>
            </a>
            <h1>Meus Endereços</h1>
        </div>
        <div class="header-separator"></div>
    </div>

    <div id="address-list-container" class="nativa-address-list-container">
        <p>Carregando seus endereços...</p>
    </div>

    <div class="nativa-my-account-actions">
        <button id="add-new-address-btn" class="nativa-button-primary">
            <span class="material-symbols-rounded">add</span>
            Adicionar Novo Endereço
        </button>
    </div>

</div>