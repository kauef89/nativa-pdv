// js/features/checkout/checkout-handlers.js

/**
 * Lida com todas as interações e a lógica de negócio da página de Checkout.
 * CORREÇÃO: Corrige erro 'not iterable' ao converter o objeto do carrinho em array para rastreamento.
 * ATUALIZAÇÃO (Onboarding Rules): Refina a lógica para exigir endereço apenas se a modalidade for Delivery.
 */

import {
    getMyAccountData,
    getMyAddresses,
    validateCoupon,
    submitOrder,
} from '../../core/nativa-api-service.js';
import {
    showToast,
    showSpinner,
    hideSpinner,
    openSheet,
    closeSheet,
    applyStaggeredAnimation,
    provideFeedbackForDisabledElement,
    checkPWAInstallAndProceed,
} from '../../utils/nativa-ui-helpers.js';
import {
    renderOrderSummary,
    updateTotals,
    updateCheckoutModalityDisplay,
    renderLoggedInUserAddresses,
    updateAddressActionButton,
    updatePaymentMethodInfo,
    renderPaymentMethods,
} from './checkout-ui.js';
import { validateAllFields } from '../../utils/form-validation.js';
import {
    handleOpenAddressForm,
    decodeStreetNames,
} from '../address/address-handler.js';
import { state } from '../../core/main-state.js';
import { init as initOnboarding } from '../onboarding/onboarding-handler.js';
import { openProductDetails } from '../product-sheet/product-sheet-logic.js';
import { calculateDeliveryFee, formatPrice } from '../../utils/nativa-utils.js';
import { showModal } from '../../utils/modal.js';
import { selectModality } from '../../utils/helpers.js';
import { Router } from '../../core/router.js';
import { loadAndRenderCart } from '../cart/cart-handlers.js';

// Função para atualizar o texto do botão
function updateCheckoutButtonText() {
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
        const addressesData = await getMyAddresses();

        if (!state.user) state.user = {};
        const addresses = decodeStreetNames(addressesData);
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
        console.error(
            'Não foi possível carregar os dados do usuário logado.',
            error
        );
        showToast(
            'Erro ao carregar seus dados. Tente recarregar a página.',
            'error'
        );
    }

    handleRecalculateTotalsAndFrete();
}

async function _startOnboardingFlow() {
    try {
        const accountData = await getMyAccountData();

        // 1. Dados Pessoais (Prioridade Máxima)
        if (!accountData.is_profile_complete) {
            const needsDob = !accountData.dateOfBirth;
            if (initOnboarding) {
                initOnboarding(needsDob);
                return true; // Interrompe fluxo para onboarding de dados
            } else {
                console.error(
                    'OnboardingHandler não encontrado. Não foi possível iniciar o wizard.'
                );
                showToast('Erro ao iniciar o formulário de cadastro.', 'error');
            }
        }
        // 2. Endereço (Apenas se for Delivery)
        else if (
            state.user.addresses.length === 0 &&
            state.selectedModality === 'delivery'
        ) {
            // --- INÍCIO DA MODIFICAÇÃO (Onboarding Rules) ---
            // Apenas força a criação de endereço se a modalidade for Delivery.
            // Para Retirada, Mesa ou sem modalidade (independente), não exige endereço aqui.
            handleOpenAddressSheet();
            return true; // Interrompe fluxo para onboarding de endereço
            // --- FIM DA MODIFICAÇÃO ---
        }
    } catch {
        showToast('Não foi possível verificar os dados da sua conta.', 'error');
    }
    return false; // Fluxo liberado
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
    } else {
        showToast('Produto da oferta não encontrado.', 'error');
    }
}

function _checkForAndShowOffer() {
    console.log('[SONDA Ofertas FE] _checkForAndShowOffer INICIADA.');
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

    if (!offerDataStr || !productId) {
        showToast('Erro: Dados da oferta incompletos.', 'error');
        return;
    }

    try {
        const offerData = JSON.parse(offerDataStr);
        const product = window.nativaDeliveryData.products.find(
            (p) => p.id == productId
        );

        if (product) {
            openProductDetails(product, null, null, offerData);
        } else {
            showToast('Produto da oferta não encontrado.', 'error');
        }
    } catch (e) {
        console.error('Erro ao processar dados da oferta:', e);
        showToast('Erro ao tentar exibir a oferta.', 'error');
    }
}

export async function handlePageLoad() {
    if (!state.user.isLoggedIn) {
        const loginSheet = document.getElementById('nativa-login-prompt-sheet');
        if (loginSheet) {
            showToast('Faça login para continuar com seu pedido.', 'info');
            loginSheet.classList.add('is-unclosable');
            openSheet(loginSheet);
        }
        return;
    }

    try {
        if (state.cart.count === 0) {
            showToast(
                'Seu carrinho está vazio! Adicione itens para finalizar o pedido.',
                'info'
            );
            Router.navigateTo('/');
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
        console.error('Erro no handlePageLoad do checkout:', error);
        showToast(
            'Erro ao carregar dados do checkout. Tente recarregar.',
            'error'
        );
    }
}

export function handleModalityChange(event) {
    if (
        provideFeedbackForDisabledElement(
            event,
            '.nativa-order-button',
            'Este serviço não está disponível no momento.'
        )
    ) {
        return;
    }
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
        throw new APIError('Por favor, insira um código de cupom.');
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
        if (error instanceof APIError) {
            throw error;
        } else {
            throw new APIError(error.message || 'Erro ao validar cupom.');
        }
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
            title: 'Pagamento em Dinheiro',
            iconName: 'request_quote',
            message: `Você indicou que precisa de troco, mas o valor informado (${formatPrice(changeValue)}) é menor ou igual ao total do pedido (${formatPrice(totalValue)}). Deseja continuar assim mesmo (sem troco)?`,
            confirmText: 'Continuar sem Troco',
            cancelText: 'Voltar e Corrigir',
        });

        if (!userConfirmation) {
            if (changeValueInput) {
                changeValueInput.focus();
                changeValueInput.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            }
            return false;
        }
    }

    if (state.selectedModality === 'delivery' && !state.selectedBairro) {
        showToast(
            'Por favor, selecione ou cadastre um endereço para a entrega.',
            'error'
        );
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

    // --- CORREÇÃO: Transforma o Objeto de itens do carrinho em Array ---
    // state.cart.contents é um Objeto { "hash1": {...}, "hash2": {...} }
    // Usamos Object.values() para torná-lo iterável para o GA4 e Pixel.
    const cartItemsForTracking = Object.values(state.cart.contents || {});

    if (typeof loadAndRenderCart === 'function') {
        loadAndRenderCart();
    }

    document.dispatchEvent(new CustomEvent('nativa:newOrderPlaced'));

    const orderTotal = parseFloat(result.order_total || 0);
    const orderId = result.order_id;
    const trackingData = window.nativaDeliveryData || {};
    const googleAdsId = trackingData.googleAdsId;
    const googleAdsLabel = trackingData.googleAdsLabel;

    if (orderTotal > 0) {
        // --- META PIXEL COM DESDUPLICAÇÃO ---
        if (typeof fbq === 'function') {
            console.log('[Pixel] Disparando Purchase com EventID:', {
                value: orderTotal,
                order_id: orderId,
                eventID: orderId.toString(),
            });
            fbq(
                'track',
                'Purchase',
                {
                    value: orderTotal,
                    currency: 'BRL',
                    content_ids: [orderId],
                    content_type: 'product',
                    num_items: cartItemsForTracking.length,
                },
                { eventID: orderId.toString() }
            );
        }

        // --- GOOGLE ADS CONVERSION ---
        if (typeof gtag === 'function' && googleAdsId && googleAdsLabel) {
            const sendTo = `${googleAdsId}/${googleAdsLabel}`;
            console.log('[Google Ads] Disparando Conversão:', {
                send_to: sendTo,
                value: orderTotal,
                transaction_id: orderId,
            });
            gtag('event', 'conversion', {
                send_to: sendTo,
                value: orderTotal,
                currency: 'BRL',
                transaction_id: orderId,
            });
        }

        // --- GA4 PURCHASE EVENT (NOVO) ---
        if (typeof gtag === 'function') {
            const ga4Items = cartItemsForTracking.map((item) => ({
                item_id: item.id || item.product_id, // Fallback para product_id se id do item não existir
                item_name: item.name || item.product_name,
                price: item.price || item.total_item_price,
                quantity: item.quantity,
            }));

            console.log('[GA4] Disparando Purchase:', {
                transaction_id: orderId,
                value: orderTotal,
                currency: 'BRL',
                items: ga4Items,
            });

            gtag('event', 'purchase', {
                transaction_id: orderId,
                value: orderTotal,
                currency: 'BRL',
                tax: 0,
                shipping: state.deliveryFee || 0,
                items: ga4Items,
            });
        } else {
            console.log('[GA4/Ads] Tag Global (gtag) não encontrada.');
        }
    }

    switch (result.action) {
        case 'redirect_to_payment':
            window.location.href = result.url;
            break;
        case 'redirect':
        default:
            Router.navigateTo('/minha-conta');
            break;
    }
}

export async function handleFormSubmit(e) {
    e.preventDefault();
    const form = e.target;
    const submitButton = form.querySelector('#nativa-confirm-order-button');

    try {
        const isPrerequisitesValid = await _validateCheckoutPrerequisites(form);
        if (!isPrerequisitesValid) {
            return;
        }

        showSpinner(submitButton);
        const payload = _buildOrderPayload(form);
        const result = await submitOrder(payload);
        _handleOrderSubmissionResponse(result);
    } catch (error) {
        if (error.name === 'APIError') {
            showToast(error.message, 'error');
        } else {
            console.error('Erro inesperado no envio:', error);
            showToast(
                'Ocorreu um erro inesperado ao enviar o pedido.',
                'error'
            );
        }
        if (submitButton) hideSpinner(submitButton);
    }
}

export function handleOpenAddressSheet() {
    const addressButton = document.getElementById(
        'nativa-checkout-address-action-btn'
    );
    if (addressButton) {
        addressButton.classList.remove('is-error');
    }
    handleOpenAddressForm('checkout');
}

export function handleAddressSelection(e) {
    const radio = e.target;
    if (!radio || radio.name !== 'selected_address') return;

    document
        .querySelectorAll('.checkout-address-card')
        .forEach((c) => c.classList.remove('is-selected'));
    const selectedCard = radio.closest('.checkout-address-card');
    if (selectedCard) {
        selectedCard.classList.add('is-selected');
    }

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

class APIError extends Error {
    constructor(message, status = null, data = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

export const init = () => {
    const checkoutForm = document.getElementById('nativa-checkout-form');
    if (checkoutForm) checkoutForm.addEventListener('submit', handleFormSubmit);
    handlePageLoad();
};
