<?php
/**
 * Template para a Ficha de Oferta.
 * ESTRUTURA PADRONIZADA
 * ATUALIZAÇÃO (UI): Adiciona o nome do produto ofertado.
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="nativa-offer-sheet" class="nativa-bottom-sheet is-draggable">
    <div class="nativa-bottom-sheet-content">

        <div class="nativa-bottom-sheet-handle"></div>

        <div id="nativa-offer-header" class="nativa-bottom-sheet-header">
            <h3 class="nativa-sheet-title">Uma oferta para você!</h3>
        </div>

        <div id="nativa-offer-content" class="nativa-offer-content nativa-bottom-sheet-body">
            <p id="nativa-offer-sheet-text"></p>
            {/* --- INÍCIO DA MODIFICAÇÃO --- */}
            <h4 id="nativa-offer-sheet-product-name" class="nativa-offer-product-name"></h4>
            {/* --- FIM DA MODIFICAÇÃO --- */}
            <div id="nativa-offer-sheet-price-container" class="nativa-offer-price">
                <span class="original-price"></span>
                <span class="material-symbols-rounded offer-arrow">arrow_forward</span>
                <span class="promo-price"></span>
            </div>
        </div>
        <div class="nativa-separator"></div>
        <div class="nativa-bottom-sheet-actions">
            <button id="nativa-offer-decline-btn" class="nativa-button-secondary">Não, obrigado</button>
            <button id="nativa-add-offer-btn" class="nativa-button-primary">Eu quero!</button>
        </div>

    </div>
</div>
