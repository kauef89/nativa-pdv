// apps/consumer/features/cart/cart-main.js

/**
 * Ponto de entrada que inicializa a lógica do carrinho.
 * Módulo refatorado para ES6.
 */

import * as CartHandlers from './cart-handlers.js';
import { MyAccountUI } from '../../pages/account/my-account-ui.js';
import { renderLoggedInUserAddresses as renderCheckoutAddresses } from '../../pages/checkout/checkout-ui.js';
import { state } from '@core/state/global-state.js';

let isCartInitialized = false;

export function init() {
    if (isCartInitialized) {
        return;
    }
    isCartInitialized = true;

    // --- Seletores dos Elementos ---
    const cartSheet = document.getElementById('nativa-cart-side-sheet');
    const addressSelectionSheet = document.getElementById(
        'nativa-address-selection-sheet'
    );
    const clearCartLink = document.getElementById('nativa-clear-cart-button');
    const checkoutButtonWrapper = document.getElementById(
        'nativa-checkout-button-wrapper'
    );
    const bairroSelect = document.getElementById('nativa-bairro-select');

    // --- Conexão dos Listeners de Eventos ---
    if (cartSheet) {
        cartSheet.addEventListener('click', CartHandlers.handleCartActions);
    }

    if (addressSelectionSheet) {
        addressSelectionSheet.addEventListener(
            'click',
            CartHandlers.handleAddressSelectionActions
        );
    }

    if (clearCartLink) {
        clearCartLink.addEventListener('click', (e) => {
            e.preventDefault();
            CartHandlers.handleClearCart();
        });
    }

    if (checkoutButtonWrapper) {
        checkoutButtonWrapper.addEventListener(
            'click',
            CartHandlers.handleCheckout
        );
    }

    if (bairroSelect) {
        bairroSelect.addEventListener(
            'change',
            CartHandlers.handleBairroChange
        );
    }

    document.addEventListener(
        'nativa:cartUpdated',
        CartHandlers.loadAndRenderCart
    );
    document.addEventListener(
        'nativa:modalityChanged',
        CartHandlers.loadAndRenderCart
    );

    // --- INÍCIO DA MODIFICAÇÃO (EVENTO DE ENDEREÇO) ---
    // Ouve o evento global de atualização de endereço.
    document.addEventListener('nativa:addressUpdated', (event) => {
        const { source, addresses } = event.detail;
        // Atualiza a UI do carrinho apenas se a ação veio do próprio carrinho.
        if (source === 'cart') {
            CartHandlers.reloadAndReopenCart();
        } else if (source === 'my-account') {
            MyAccountUI.renderAddressSection(addresses, state.allBairros);
        } else if (source === 'checkout') {
            renderCheckoutAddresses(addresses, state.allBairros);
        }
    });
    // --- FIM DA MODIFICAÇÃO ---
    // O carrinho agora também ouve o evento de mudança de status e se recarrega.
    document.addEventListener(
        'nativa:storeStatusChanged',
        CartHandlers.loadAndRenderCart
    );

    // --- Inicialização ---
    CartHandlers.loadAndRenderCart();

    console.log('Nativa Delivery Cart: Módulos carregados e prontos.');
}
