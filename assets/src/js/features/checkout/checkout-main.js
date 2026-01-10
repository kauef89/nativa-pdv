/**
 * Ponto de entrada e registro de eventos para a página de Checkout.
 * ... (histórico de versões anterior) ...
 * ATUALIZAÇÃO (Checkout SPA): A navegação do botão "Voltar ao cardápio"
 * agora utiliza o roteador da SPA (Router.navigateTo) em vez de um
 * redirecionamento de página inteira, completando a integração.
 * CORREÇÃO (Oferta UI): Adiciona listener para 'nativa:cartUpdated' para redesenhar o resumo do pedido após adicionar oferta.
 */

import {
    handlePageLoad,
    handleModalityChange,
    handlePaymentMethodChange,
    handleApplyCoupon,
    handleFormSubmit,
    handleAddressSelection,
    handleAddOfferToCart,
    // --- INÍCIO DA MODIFICAÇÃO (Oferta UI) ---
    handleRecalculateTotalsAndFrete, // Importa a função de recalcular totais
    // --- FIM DA MODIFICAÇÃO ---
} from './checkout-handlers.js';
import { maskCpf, isValidCpf } from '../../utils/form-validation.js';
import {
    showToast,
    openSheet,
    showSpinner,
    hideSpinner,
} from '../../utils/nativa-ui-helpers.js';
import {
    getLiveStatus,
    validateCoupon,
} from '../../core/nativa-api-service.js';
import { state } from '../../core/main-state.js';
import { handleOpenAddressForm } from '../address/address-handler.js';
// --- INÍCIO DA MODIFICAÇÃO (Oferta UI) ---
import {
    renderLoggedInUserAddresses,
    renderOrderSummary, // Importa a função de renderizar o resumo
} from './checkout-ui.js';
// --- FIM DA MODIFICAÇÃO ---
import { Router } from '../../core/router.js';

let isCheckoutInitialized = false;

const _connectFormValidation = () => {
    const checkoutForm = document.getElementById('nativa-checkout-form');
    if (!checkoutForm) return;
    const cpfInput = checkoutForm['nativa-customer-cpf'];
    if (cpfInput) {
        cpfInput.setAttribute('type', 'tel');
        cpfInput.setAttribute('inputmode', 'numeric');
        cpfInput.addEventListener('input', () => {
            maskCpf(cpfInput);
            isValidCpf(cpfInput);
        });
    }
};

export const init = () => {
    if (isCheckoutInitialized) {
        // --- INÍCIO DA MODIFICAÇÃO (Oferta UI) ---
        // Se já inicializado, apenas chama handlePageLoad para garantir
        // que o estado mais recente do carrinho seja usado ao re-navegar.
        handlePageLoad();
        // --- FIM DA MODIFICAÇÃO ---
        return;
    }
    isCheckoutInitialized = true;

    const paymentMethodInput = document.getElementById('nativa-payment-method');
    if (paymentMethodInput) {
        const activePaymentButton = document.querySelector(
            '.nativa-payment-button.is-active'
        );
        if (!activePaymentButton) {
            paymentMethodInput.value = '';
        }
    }

    const checkoutForm = document.getElementById('nativa-checkout-form');
    const modalityContainer = document.getElementById(
        'nativa-checkout-modality-options'
    );
    const paymentOptionsContainer = document.getElementById(
        'nativa-payment-method-options'
    );
    const applyCouponButton = document.getElementById(
        'nativa-apply-coupon-button'
    );
    const addressFormSheet = document.getElementById(
        'nativa-address-form-sheet'
    );
    const editOrderButton = document.getElementById('nativa-edit-order-button');
    const backToMenuButton = document.getElementById(
        'nativa-back-to-menu-button'
    );
    const addressActionBtn = document.getElementById(
        'nativa-checkout-address-action-btn'
    );
    const addressCardsContainer = document.getElementById(
        'nativa-checkout-address-cards-container'
    );
    const offerSheet = document.getElementById('nativa-offer-sheet');

    if (checkoutForm) checkoutForm.addEventListener('submit', handleFormSubmit);
    if (modalityContainer)
        modalityContainer.addEventListener('click', handleModalityChange);
    if (paymentOptionsContainer)
        paymentOptionsContainer.addEventListener(
            'click',
            handlePaymentMethodChange
        );

    if (applyCouponButton) {
        applyCouponButton.addEventListener('click', async (event) => {
            showSpinner(applyCouponButton);
            try {
                await handleApplyCoupon(event);
            } catch (error) {
                showToast(error.message, 'error');
            } finally {
                hideSpinner(applyCouponButton);
            }
        });
    }

    if (addressFormSheet) {
        addressFormSheet.addEventListener('submit', (e) => {
            if (e.target.classList.contains('address-form')) {
                e.preventDefault();
            }
        });
    }
    if (editOrderButton) {
        editOrderButton.addEventListener('click', () => {
            const cartSheet = document.getElementById('nativa-cart-side-sheet');
            if (cartSheet) openSheet(cartSheet);
        });
    }

    if (backToMenuButton) {
        backToMenuButton.addEventListener('click', () =>
            Router.navigateTo('/cardapio')
        );
    }

    if (addressActionBtn)
        addressActionBtn.addEventListener('click', () =>
            handleOpenAddressForm('checkout')
        );
    if (addressCardsContainer) {
        addressCardsContainer.addEventListener(
            'change',
            handleAddressSelection
        );
    }
    if (offerSheet) {
        offerSheet.addEventListener('click', (event) => {
            const offerButton = event.target.closest('#nativa-add-offer-btn');
            if (offerButton) {
                handleAddOfferToCart(offerButton);
            }
        });
    }

    document.addEventListener('nativa:addressUpdated', (event) => {
        const { source, addresses } = event.detail;
        if (source === 'checkout') {
            renderLoggedInUserAddresses(addresses, state.allBairros);
        }
    });

    // --- INÍCIO DA MODIFICAÇÃO (Oferta UI) ---
    // Adiciona listener para atualizar o resumo do pedido quando o carrinho muda
    // Garante que o listener seja anexado apenas uma vez
    if (!window.nativaCheckoutCartUpdateListener) {
        document.addEventListener('nativa:cartUpdated', (event) => {
            console.log(
                '[Checkout Main] Evento nativa:cartUpdated recebido. Atualizando resumo e totais.'
            );

            // Atualiza o estado global do carrinho com os dados do evento, se disponíveis
            // Isso garante que o estado local reflita o que o backend retornou
            if (event.detail && event.detail.cart_contents !== undefined) {
                Object.assign(state.cart, {
                    contents: event.detail.cart_contents,
                    subtotal: event.detail.cart_total,
                    count: event.detail.cart_count,
                    offer: event.detail.offer,
                    reward: event.detail.reward,
                });
                console.log(
                    '[Checkout Main] Estado do carrinho atualizado a partir do evento.'
                );
            } else {
                console.warn(
                    '[Checkout Main] Evento nativa:cartUpdated não continha detalhes do carrinho. Usando estado existente.'
                );
            }

            // Re-renderiza o resumo com o estado atualizado do carrinho
            renderOrderSummary(state.cart.contents);
            // Recalcula e re-renderiza os totais
            handleRecalculateTotalsAndFrete();
        });
        window.nativaCheckoutCartUpdateListener = true; // Marca que o listener foi anexado
        console.log(
            '[Checkout Main] Listener para nativa:cartUpdated anexado.'
        );
    }
    // --- FIM DA MODIFICAÇÃO ---

    handlePageLoad();
    _connectFormValidation();
};
