<?php
/**
 * Template para a Ficha de Detalhes do Produto.
 * ESTRUTURA PADRONIZADA (Rodapé revertido ao layout original)
 * ATUALIZAÇÃO (Oferta Unificada): Adiciona elementos para exibir informações da oferta.
 * CORREÇÃO (Comentários): Usa a sintaxe correta de comentários HTML.
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="nativa-product-details-sheet" class="nativa-bottom-sheet is-draggable">
    <div class="nativa-bottom-sheet-content">

        <div class="nativa-bottom-sheet-handle"></div>

        <div class="nativa-bottom-sheet-header">
            <div class="product-details-header">
                <!-- --- INÍCIO DA MODIFICAÇÃO: Título da Oferta --- -->
                <h3 id="product-details-offer-title" class="nativa-sheet-title" style="display: none;">Uma oferta para você!</h3>
                <!-- --- FIM DA MODIFICAÇÃO --- -->
                <h2 id="product-details-title"></h2>
            </div>
        </div>

        <!-- --- INÍCIO DA MODIFICAÇÃO: Seção de Oferta --- -->
        <div id="product-details-offer-content" class="nativa-offer-content nativa-bottom-sheet-body" style="display: none;">
             <p id="product-details-offer-text"></p>
             <div id="product-details-offer-price-container" class="nativa-offer-price">
                 <span class="original-price"></span>
                 <span class="material-symbols-rounded offer-arrow">arrow_forward</span>
                 <span class="promo-price"></span>
             </div>
        </div>
        <!-- --- FIM DA MODIFICAÇÃO --- -->

        <div id="product-details-description" class="nativa-product-description-wrapper"></div>

        <div class="nativa-separator" id="product-details-separator"></div>

        <div id="product-details-addons" class="nativa-product-addons nativa-bottom-sheet-body">
            <!-- Adicionais renderizados aqui -->
        </div>

        <div class="nativa-separator"></div>

        <div class="nativa-bottom-sheet-actions product-details-footer">
            <!-- --- INÍCIO DA MODIFICAÇÃO: Botão Cancelar Oferta --- -->
            <button type="button" id="product-details-cancel-offer-btn" class="nativa-button-secondary" style="display: none;">Hoje não</button>
            <!-- --- FIM DA MODIFICAÇÃO --- -->
            <div class="nativa-product-quantity-selector">
                <button id="quantity-minus" class="quantity-button"><span class="material-symbols-rounded">remove</span></button>
                <input type="number" id="product-quantity" value="1" min="1" readonly>
                <button id="quantity-plus" class="quantity-button"><span class="material-symbols-rounded">add</span></button>
            </div>
            <span id="product-details-price" class="nativa-product-price">R$ 0,00</span>
            <button id="add-to-cart-final-button" class="nativa-add-to-cart-button">Quero</button>
        </div>

    </div>
</div>