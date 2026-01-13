/**
 * assets/src/js/apps/pdv/pdv-main.js
 * Ponto de entrada do PDV.
 */

import * as UI from './features/pdv-ui.js';
import * as Customer from './features/pdv-customer.js';
import * as Payment from './features/pdv-payment.js';
import { loadAndRenderCart } from '@shared/features/cart/cart-handlers.js';
import { init as initDashboard } from './features/orders-manager/dashboard-handlers.js';
import { loadAndRenderCheckout } from '@apps/consumer/pages/checkout/checkout-handlers.js';

export function initPdv() {
    console.log('[PDV Main] Inicializando sistema...');

    try {
        initDashboard();
    } catch (e) {
        console.error('[PDV Main] Erro ao iniciar Dashboard:', e);
    }

    UI.switchView('delivery');
    UI.encapsulateModalsForPdv();

    document.addEventListener('keydown', (e) => {
        if (e.key === 'F5') {
            e.preventDefault();
            const sheet = document.getElementById('new-order-sheet');
            // F5 só abre o modal de pagamento se NÃO estivermos no fluxo de Novo Pedido
            if (!sheet || !sheet.classList.contains('is-open')) {
                Payment.openPaymentModal();
            }
        }
    });

    // --- INTERCEPTADOR DE NAVEGAÇÃO ---
    document.addEventListener('nativa:navigate', (e) => {
        const targetPath = e.detail?.path;
        const newOrderSheet = document.getElementById('new-order-sheet');
        const isNewOrderFlow =
            newOrderSheet && newOrderSheet.classList.contains('is-open');

        if (targetPath === '/checkout') {
            if (isNewOrderFlow) {
                // FLUXO ATENDENTE: Alterna para a visão de Checkout na mesma aba
                console.log('[PDV] Alternando para visão de Checkout...');
                UI.switchTab('tab-cart');
                UI.toggleCartView('checkout');
                loadAndRenderCheckout();
            } else {
                // FLUXO BALCÃO: Modal Clássico
                Payment.openPaymentModal();
            }
        } else if (targetPath === '/cardapio') {
            UI.switchTab('tab-menu');
        }
    });
}

function switchTabWithRefresh(tabId) {
    UI.switchTab(tabId);
    if (tabId === 'tab-cart') {
        loadAndRenderCart();
        // Garante que resetamos para a lista se o usuário clicar na aba
        UI.toggleCartView('cart');
    }
}

window.pdvApp = {
    initPdv,
    switchView: UI.switchView,
    openNewOrderSheet: UI.openNewOrderSheet,
    closeNewOrderSheet: UI.closeNewOrderSheet,
    resetNewOrderSteps: UI.resetNewOrderSteps,
    switchTab: switchTabWithRefresh,
    toggleCartView: UI.toggleCartView, // Exportado para o botão "Voltar"
    searchCustomer: Customer.searchCustomer,
    selectCustomerForOrder: Customer.selectCustomerForOrder,
    openPaymentModal: Payment.openPaymentModal,
    closePaymentModal: Payment.closePaymentModal,
    selectMethod: Payment.selectMethod,
    addPayment: Payment.addPayment,
    finalizeOrder: Payment.finalizeOrder,
    openClientModal: Payment.openClientModal,
    closeClientModal: Payment.closeClientModal,
    handleSearch: () => {},
    selectClient: () => {},
    searchGovApi: () => {},
    resetClientModal: Payment.resetClientModal,
    finalizeRegistration: Payment.finalizeRegistration,
    closeOptionsModal: Payment.closeOptionsModal,
    confirmOptions: Payment.confirmOptions,
};
