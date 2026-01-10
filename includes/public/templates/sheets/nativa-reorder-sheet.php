<?php
/**
 * Template para a Ficha de "Pedir Novamente".
 * ESTRUTURA PADRONIZADA
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="nativa-reorder-sheet" class="nativa-bottom-sheet is-draggable">
    <div class="nativa-bottom-sheet-content">
        
        <div class="nativa-bottom-sheet-handle"></div>

        <div class="nativa-bottom-sheet-header">
            <span class="material-symbols-rounded nativa-sheet-header-icon">replay</span>
            <h3 class="nativa-sheet-title">Pedir Novamente</h3>
        </div>

        <div class="nativa-separator"></div>
        
        <div class="nativa-bottom-sheet-body">
            <p class="nativa-sheet-description">Selecione os itens do seu pedido <strong>#<span id="reorder-sheet-order-id"></span></strong> que deseja adicionar ao carrinho.</p>
            <div id="nativa-reorder-items-list" class="nativa-reorder-items-container">
                <p class="loading-message">Analisando itens do pedido anterior...</p>
            </div>
        </div>

        <div class="nativa-separator"></div>

        <div class="nativa-bottom-sheet-actions">
            <div class="nativa-reorder-summary">
                <strong id="reorder-sheet-total">R$ 0,00</strong>
            </div>
            <button id="reorder-sheet-add-to-cart-btn" class="nativa-button-primary" disabled>Quero</button>
        </div>

    </div>
</div>