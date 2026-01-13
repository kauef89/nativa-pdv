// apps/consumer/pages/checkout/checkout-handlers.js

import {
    getMyAccountData,
    getMyAddresses,
    submitOrder,
    validateCoupon,
    getAddressesByUserId, // Importado de api-service.js
} from '@core/api/api-service.js';

import { state } from '@core/state/global-state.js';
import {
    decodeStreetNames,
    handleOpenAddressForm,
} from '@shared/features/address/address-handler.js';
import { openProductDetails } from '@shared/features/menu/product-sheet.js';
import { showModal } from '@ui/modals/modal.js';
import { calculateDeliveryFee, formatPrice } from '@utils/formatters.js';
import { selectModality } from '@utils/helpers.js';
import {
    applyStaggeredAnimation,
    checkPWAInstallAndProceed,
    hideSpinner,
    openSheet,
    provideFeedbackForDisabledElement,
    showSpinner,
    showToast,
} from '@utils/ui-helpers.js';
import { validateAllFields } from '@utils/validation.js';
import { loadAndRenderCart } from '../../features/cart/cart-handlers.js';
import { init as initOnboarding } from '../../features/onboarding/onboarding-handler.js';
import { Router } from '../../router.js';
import {
    renderLoggedInUserAddresses,
    renderOrderSummary,
    renderPaymentMethods,
    updateAddressActionButton,
    updateCheckoutModalityDisplay,
    updatePaymentMethodInfo,
    updateTotals,
} from './checkout-ui.js';

// Função para atualizar o texto do botão
export function updateCheckoutButtonText() {
    const submitButton = document.getElementById('nativa-confirm-order-button');
    if (!submitButton) return;

    const paymentInput = document.getElementById('nativa-payment-method');
    const selectedSlug = paymentInput?.value;
    const selectedMethod = state.serverData.paymentMethods.find(
        (m) => m.slug === selectedSlug
    );

    if (selectedMethod && selectedMethod.categoria === 'pix_automatico') {
        submitButton.textContent = 'Ir para Pagamento';
        submitButton.innerHTML =
            '<span class="material-symbols-rounded">qr_code_2</span> Ir para Pagamento';
    } else {
        submitButton.textContent = 'Finalizar Pedido';
        submitButton.innerHTML =
            '<span class="material-symbols-rounded">shopping_cart_checkout</span> Finalizar Pedido';
    }
}

async function _loadUserData() {
    const form = document.getElementById('nativa-checkout-form');
    if (!form) return;

    try {
        let addressesData;

        // LÓGICA PDV: Se for PDV e tivermos um cliente selecionado, busca os endereços DELE
        if (window.nativaData?.isPedidosPage && state.user?.id) {
            console.log(
                '[Checkout] Carregando endereços do cliente ID:',
                state.user.id
            );
            if (typeof getAddressesByUserId === 'function') {
                addressesData = await getAddressesByUserId(state.user.id);
            } else {
                addressesData = await getMyAddresses();
            }
        } else {
            // LÓGICA CONSUMER: Busca endereços do usuário logado (cookie)
            addressesData = await getMyAddresses();
        }

        if (!state.user) state.user = {};

        // Garante que addressesData seja um array
        const rawAddresses = Array.isArray(addressesData)
            ? addressesData
            : addressesData.addresses || [];

        const addresses = decodeStreetNames(rawAddresses);
        state.user.addresses = addresses;

        const cartSelectedAddressId = sessionStorage.getItem(
            'nativaCartSelectedAddressId'
        );

        renderLoggedInUserAddresses(
            addresses,
            state.allBairros,
            cartSelectedAddressId
        );

        let activeAddress = addresses.find(
            (addr) => addr.id === cartSelectedAddressId
        );
        if (!activeAddress) {
            activeAddress =
                addresses.find((addr) => addr.is_primary) || addresses[0];
        }

        if (activeAddress) {
            state.selectedBairro = state.allBairros.find(
                (b) => b.id == activeAddress.bairro_id
            );
            sessionStorage.setItem(
                'nativaCartSelectedAddressId',
                activeAddress.id
            );
        } else {
            state.selectedBairro = null;
            sessionStorage.removeItem('nativaCartSelectedAddressId');
        }

        updateAddressActionButton(addresses.length > 0);
    } catch (error) {
        console.error('Não foi possível carregar os dados do usuário.', error);
        // No PDV, falhas silenciosas são preferíveis a alertas intrusivos no load
        if (!window.nativaData?.isPedidosPage) {
            showToast('Erro ao carregar dados do usuário.', 'error');
        }
    }

    handleRecalculateTotalsAndFrete();
}

async function _startOnboardingFlow() {
    // No PDV, pulamos validações de perfil do usuário (assumimos que o atendente já resolveu)
    if (window.nativaData?.isPedidosPage) return false;

    try {
        const accountData = await getMyAccountData();

        // 1. Dados Pessoais (Prioridade Máxima)
        if (!accountData.is_profile_complete) {
            const needsDob = !accountData.dateOfBirth;
            if (initOnboarding) {
                initOnboarding(needsDob);
                return true;
            }
        }
        // 2. Endereço (Apenas se for Delivery)
        else if (
            state.user.addresses.length === 0 &&
            state.selectedModality === 'delivery'
        ) {
            handleOpenAddressSheet();
            return true;
        }
    } catch {
        // Ignora erro silenciosamente
    }
    return false;
}

export function handlePaymentMethodChange(e) {
    if (
        provideFeedbackForDisabledElement(
            e,
            '.nativa-payment-button',
            'Sua conta está restrita à pagamentos via Pix'
        )
    ) {
        return;
    }

    const button = e.target.closest('.nativa-payment-button');
    if (!button) return;

    const selectedSlug = button.dataset.value;
    const selectedMethod = state.serverData.paymentMethods.find(
        (m) => m.slug === selectedSlug
    );

    const container = button.closest('#nativa-payment-method-options');
    if (container) {
        container.classList.remove('is-error');
        container
            .querySelectorAll('.nativa-payment-button')
            .forEach((btn) => btn.classList.remove('is-active'));
    }
    button.classList.add('is-active');

    const hiddenInput = document.getElementById('nativa-payment-method');
    if (hiddenInput) {
        hiddenInput.value = selectedSlug;
    }

    updatePaymentMethodInfo(selectedMethod);
    updateCheckoutButtonText();
}

function _showOfferSheet(offerData) {
    const product = window.nativaDeliveryData.products.find(
        (p) => p.id == offerData.product_to_offer_id
    );
    if (product) {
        openProductDetails(product, null, null, offerData);
    }
}

function _checkForAndShowOffer() {
    const offer = state.cart.offer;
    if (offer) {
        _showOfferSheet(offer);
    }
}

export async function handleAddOfferToCart(button) {
    const shouldProceed = await checkPWAInstallAndProceed();
    if (!shouldProceed) {
        return;
    }

    const offerDataStr = button.dataset.offerData;
    const productId = button.dataset.productId;

    if (!offerDataStr || !productId) return;

    try {
        const offerData = JSON.parse(offerDataStr);
        const product = window.nativaDeliveryData.products.find(
            (p) => p.id == productId
        );

        if (product) {
            openProductDetails(product, null, null, offerData);
        }
    } catch (e) {
        console.error('Erro oferta:', e);
    }
}

// --- Handler Principal de Carregamento da Página ---
export async function handlePageLoad() {
    if (!state.user.isLoggedIn) {
        const loginSheet = document.getElementById('nativa-login-prompt-sheet');
        if (loginSheet) {
            showToast('Faça login para continuar.', 'info');
            loginSheet.classList.add('is-unclosable');
            openSheet(loginSheet);
        }
        return;
    }

    try {
        // Verifica se carrinho tem itens
        if (
            !state.cart.contents ||
            Object.keys(state.cart.contents).length === 0
        ) {
            showToast('Carrinho vazio!', 'warning');

            // Navegação de volta
            if (
                window.nativaData?.isPedidosPage &&
                window.pdvApp?.toggleCartView
            ) {
                window.pdvApp.toggleCartView('cart');
            } else {
                Router.navigateTo('/');
            }
            return;
        }

        renderOrderSummary(state.cart.contents);
        updateCheckoutModalityDisplay(state.selectedModality);
        renderPaymentMethods();

        await _loadUserData();

        const needsOnboarding = await _startOnboardingFlow();
        if (!needsOnboarding) {
            _checkForAndShowOffer();
        }

        const scheduleSection = document.getElementById(
            'nativa-schedule-order-section'
        );
        if (scheduleSection) {
            scheduleSection.style.display = 'none';
        }

        updateCheckoutButtonText();

        setTimeout(() => {
            applyStaggeredAnimation(
                '#nativa-checkout-page',
                '.nativa-fade-in-up'
            );
        }, 50);
    } catch (error) {
        console.error('Erro handlePageLoad:', error);
    }
}

// --- EXPORTAÇÃO CRUCIAL (Alias para compatibilidade com importação no PDV) ---
export const loadAndRenderCheckout = handlePageLoad;

export function handleModalityChange(event) {
    if (provideFeedbackForDisabledElement(event, '.nativa-order-button'))
        return;

    const button = event.target.closest('.nativa-order-button');
    if (!button) return;

    const newModality = button.dataset.modality;
    selectModality(newModality);

    updateCheckoutModalityDisplay(newModality);
    handleRecalculateTotalsAndFrete();
    updateCheckoutButtonText();
}

export function handleRecalculateTotalsAndFrete() {
    const deliveryFee = calculateDeliveryFee(
        state.cart.subtotal,
        state.selectedModality,
        state.selectedBairro
    );
    state.deliveryFee = deliveryFee;
    updateTotals(state);
}

export async function handleApplyCoupon(event) {
    const button = event.target.closest('button');
    const form = button.closest('form');
    const couponInput = form.querySelector('#nativa-coupon-code');
    const cpfInput = form.querySelector('#nativa-customer-cpf');

    if (!couponInput.value) {
        showToast('Insira um código de cupom.', 'warning');
        return;
    }

    try {
        const cpfValue = cpfInput?.value || '';
        const result = await validateCoupon(
            couponInput.value,
            state.cart.subtotal,
            cpfValue
        );

        state.appliedCoupon.code = result.coupon_code;
        state.appliedCoupon.amount = result.discount_amount;
        updateTotals(state);
        showToast(result.message, 'success');
        couponInput.classList.add('is-valid-coupon');
        couponInput.classList.remove('is-error-coupon');
    } catch (error) {
        state.appliedCoupon.code = null;
        state.appliedCoupon.amount = 0;
        updateTotals(state);
        couponInput.classList.add('is-error-coupon');
        couponInput.classList.remove('is-valid-coupon');

        const msg = error.message || 'Cupom inválido.';
        showToast(msg, 'error');
    }
}

async function _validateCheckoutPrerequisites(form) {
    const paymentMethod = form['nativa-payment-method']?.value;
    const needsChange = form['nativa-needs-troco-toggle']?.checked;
    const changeValueInput = form['nativa-troco-para'];
    const changeValue = parseFloat(changeValueInput?.value || 0);
    const totalValue =
        state.cart.subtotal + state.deliveryFee - state.appliedCoupon.amount;

    if (
        paymentMethod === 'dinheiro' &&
        needsChange &&
        changeValue <= totalValue
    ) {
        const userConfirmation = await showModal({
            title: 'Troco Inválido?',
            iconName: 'request_quote',
            message: `Valor para troco (${formatPrice(changeValue)}) é menor que o total (${formatPrice(totalValue)}). Continuar sem troco?`,
            confirmText: 'Sim, sem troco',
            cancelText: 'Corrigir',
        });

        if (!userConfirmation) {
            if (changeValueInput) changeValueInput.focus();
            return false;
        }
    }

    if (state.selectedModality === 'delivery' && !state.selectedBairro) {
        showToast('Selecione um endereço para entrega.', 'error');
        return false;
    }

    return validateAllFields(form, state.selectedModality);
}

function _buildOrderPayload(form) {
    const formData = new URLSearchParams(new FormData(form)).toString();
    const couponCodeToSend = state.appliedCoupon.code || '';

    return {
        form_data: formData,
        modality: state.selectedModality,
        applied_coupon_code: couponCodeToSend,
        discount_amount: state.appliedCoupon.amount,
        bairro_id: state.selectedBairro ? state.selectedBairro.id : null,
    };
}

function _handleOrderSubmissionResponse(result) {
    if (result.points_earned && result.points_earned > 0) {
        sessionStorage.setItem('nativaLastOrderPoints', result.points_earned);
    }

    // Emite evento global
    document.dispatchEvent(new CustomEvent('nativa:newOrderPlaced'));

    const orderTotal = parseFloat(result.order_total || 0);
    const orderId = result.order_id;
    const trackingData = window.nativaDeliveryData || {};
    const googleAdsId = trackingData.googleAdsId;
    const googleAdsLabel = trackingData.googleAdsLabel;

    // --- TRACKING ---
    if (orderTotal > 0) {
        if (typeof window.fbq === 'function') {
            window.fbq(
                'track',
                'Purchase',
                {
                    value: orderTotal,
                    currency: 'BRL',
                    content_ids: [orderId],
                    content_type: 'product',
                },
                { eventID: orderId.toString() }
            );
        }

        if (typeof window.gtag === 'function') {
            if (googleAdsId && googleAdsLabel) {
                const sendTo = `${googleAdsId}/${googleAdsLabel}`;
                window.gtag('event', 'conversion', {
                    send_to: sendTo,
                    value: orderTotal,
                    currency: 'BRL',
                    transaction_id: orderId,
                });
            }
            window.gtag('event', 'purchase', {
                transaction_id: orderId,
                value: orderTotal,
                currency: 'BRL',
                tax: 0,
                shipping: state.deliveryFee || 0,
            });
        }
    }

    // --- LÓGICA DE REDIRECIONAMENTO ---

    // 1. Pix Automático
    if (result.action === 'redirect_to_payment') {
        window.location.href = result.url;
        return;
    }

    // 2. Fluxo PDV (Sucesso = Limpar e Fechar)
    if (window.nativaData?.isPedidosPage) {
        showToast('Pedido criado com sucesso!', 'success');

        // Limpa o carrinho visualmente
        if (typeof loadAndRenderCart === 'function') {
            loadAndRenderCart();
        }

        // Fecha a Side Sheet
        if (window.pdvApp?.closeNewOrderSheet) {
            window.pdvApp.closeNewOrderSheet();
        }
        return;
    }

    // 3. Fluxo Consumer App
    Router.navigateTo('/minha-conta');
}

export async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('#nativa-confirm-order-button');

    try {
        const isPrerequisitesValid = await _validateCheckoutPrerequisites(form);
        if (!isPrerequisitesValid) return;

        showSpinner(submitButton);
        const payload = _buildOrderPayload(form);
        const result = await submitOrder(payload);
        _handleOrderSubmissionResponse(result);
    } catch (error) {
        console.error('Erro checkout:', error);

        let msg = 'Erro ao enviar pedido.';
        // Verifica o erro pelo NOME, já que a classe pode não ser a mesma referência
        if (error.name === 'APIError' && error.message) msg = error.message;

        showToast(msg, 'error');
    } finally {
        if (submitButton) hideSpinner(submitButton);
    }
}

export function handleOpenAddressSheet() {
    handleOpenAddressForm('checkout');
}

export function handleAddressSelection(e) {
    const radio = e.target;
    if (!radio || radio.name !== 'selected_address') return;

    document
        .querySelectorAll('.checkout-address-card')
        .forEach((c) => c.classList.remove('is-selected'));
    const selectedCard = radio.closest('.checkout-address-card');
    if (selectedCard) selectedCard.classList.add('is-selected');

    const selectedAddressId = radio.value;
    const selectedAddress = state.user.addresses.find(
        (addr) => addr.id == selectedAddressId
    );

    if (selectedAddress) {
        state.selectedBairro = state.allBairros.find(
            (b) => b.id == selectedAddress.bairro_id
        );
        sessionStorage.setItem(
            'nativaCartSelectedAddressId',
            selectedAddressId
        );
    } else {
        state.selectedBairro = null;
    }

    handleRecalculateTotalsAndFrete();
}

export const init = () => {
    const checkoutForm = document.getElementById('nativa-checkout-form');
    if (checkoutForm) checkoutForm.addEventListener('submit', handleFormSubmit);
    handlePageLoad();
};
