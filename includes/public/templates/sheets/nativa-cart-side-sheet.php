<?php
/**
 * Template para a Ficha Lateral do Carrinho.
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="nativa-cart-side-sheet" class="nativa-side-sheet">
    <div class="nativa-side-sheet-content">
        <div class="nativa-side-sheet-header">
        </div>
        <div class="nativa-cart-body">
            <div id="nativa-cart-modality-display" class="nativa-cart-modality-display">
                <div id="nativa-cart-modality-selection" class="nativa-cart-modality-selection">
                    <div class="nativa-modality-options-cart">
                        <button class="nativa-order-button" data-modality="delivery"><span class="material-symbols-rounded">moped</span>Entrega</button>
                        <button class="nativa-order-button" data-modality="pickup"><span class="material-symbols-rounded">storefront</span>Retirada</button>
                        <button class="nativa-order-button" data-modality="table"><span class="material-symbols-rounded">restaurant</span>Na Mesa</button>
                    </div>
                </div>
                <div id="nativa-cart-guest-bairro-container" style="display: none;"><select id="nativa-bairro-select" class="nativa-bairro-dropdown"><option value="">Selecione seu bairro</option></select></div>
                <div id="nativa-cart-user-address-container" style="display: none;"><div id="nativa-cart-primary-address-card"></div></div>
            </div>
            <div id="nativa-cart-items" class="nativa-cart-items-container"><div class="cart-loader-spinner"><span class="nativa-spinner"></span></div></div>
        </div>
        <div class="nativa-cart-summary">
            <div class="nativa-cart-summary-line"><span>Subtotal</span><span id="nativa-cart-subtotal" class="nativa-cart-total-value">R$ 0,00</span></div>
            <div class="nativa-cart-summary-line" id="cart-delivery-fee-line"><span>Taxa de Entrega</span><span id="nativa-cart-delivery-fee">--</span></div>
            <div class="nativa-separator cart-separator"></div>
            <div class="nativa-cart-summary-line is-total"><strong>Total</strong><strong id="nativa-cart-final-total" class="nativa-cart-total-value">R$ 0,00</strong></div>
        </div>
        <div class="nativa-cart-footer">
            <div id="nativa-checkout-button-wrapper"><button id="nativa-checkout-button" class="nativa-checkout-button">Finalizar Pedido</button></div>
            <a href="#" id="nativa-clear-cart-button" class="nativa-clear-cart-link">Limpar Carrinho</a>
        </div>
    </div>
</div>