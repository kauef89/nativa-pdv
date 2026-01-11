// apps/consumer/pages/checkout/checkout-ui.js

import { state } from '@core/state/global-state.js';
import { decodeStreetNames } from '@shared/features/address/address-handler.js';
import { formatPrice } from '@utils/formatters.js';
import { escapeHTML } from '@utils/ui-helpers.js';
import { renderCartItemHTML } from '../../features/cart/cart-ui.js';

export const renderOrderSummary = (cartContents) => {
    const orderSummaryContainer = document.getElementById(
        'nativa-checkout-order-summary'
    );
    if (!orderSummaryContainer) return;

    orderSummaryContainer.innerHTML = '';

    if (Object.keys(cartContents).length === 0) {
        orderSummaryContainer.innerHTML = '<p>Seu carrinho está vazio.</p>';
        const confirmOrderButton = document.getElementById(
            'nativa-confirm-order-button'
        );
        if (confirmOrderButton) confirmOrderButton.disabled = true;
        return;
    }

    let summaryHtml = '<div class="nativa-order-summary-list">';
    for (const key in cartContents) {
        const item = cartContents[key];
        summaryHtml += renderCartItemHTML(item, key, true);
    }
    summaryHtml += '</div>';
    orderSummaryContainer.innerHTML = summaryHtml;
};

export const updateTotals = (state) => {
    const subtotalSpan = document.getElementById('nativa-checkout-subtotal');
    const deliveryFeeRow = document.getElementById(
        'nativa-checkout-delivery-fee-row'
    );
    const deliveryFeeLabel = deliveryFeeRow?.querySelector('span:first-child');
    const deliveryFeeSpan = document.getElementById(
        'nativa-checkout-delivery-fee'
    );
    const discountRow = document.getElementById('nativa-checkout-discount-row');
    const discountSpan = document.getElementById('nativa-checkout-discount');
    const totalSpan = document.getElementById('nativa-checkout-total');

    const { subtotal } = state.cart;
    const { deliveryFee, appliedCoupon } = state;

    if (subtotalSpan) subtotalSpan.textContent = formatPrice(subtotal);

    if (deliveryFeeRow && deliveryFeeSpan && deliveryFeeLabel) {
        if (state.selectedModality === 'delivery') {
            deliveryFeeLabel.textContent = 'Taxa de Entrega';
            const hasAchievedFreeShipping =
                deliveryFee === 0 &&
                state.selectedBairro?.valor_minimo_frete_gratis > 0;
            deliveryFeeSpan.innerHTML = hasAchievedFreeShipping
                ? '<span class="frete-gratis-tag">GRÁTIS</span>'
                : formatPrice(deliveryFee);
        } else if (state.selectedModality === 'pickup') {
            deliveryFeeLabel.textContent = 'Taxa de Retirada';
            deliveryFeeSpan.textContent = 'R$ 0,00';
        } else if (state.selectedModality === 'table') {
            deliveryFeeLabel.textContent = 'Taxa de Serviço (Mesa)';
            deliveryFeeSpan.textContent = 'R$ 0,00';
        }
    }

    if (discountRow && discountSpan) {
        if (appliedCoupon.amount > 0) {
            discountSpan.textContent = `- ${formatPrice(appliedCoupon.amount)}`;
            discountRow.style.display = '';
        } else {
            discountRow.style.display = 'none';
        }
    }

    if (totalSpan) {
        const finalTotal =
            subtotal -
            appliedCoupon.amount +
            (state.selectedModality === 'delivery' ? deliveryFee : 0);
        totalSpan.textContent = formatPrice(finalTotal);
    }
};

export const updateCheckoutModalityDisplay = (currentModality) => {
    const modalityContainer = document.getElementById(
        'nativa-checkout-modality-options'
    );
    const storeClosedMessage = document.getElementById(
        'nativa-checkout-store-closed-message'
    );
    const confirmOrderButton = document.getElementById(
        'nativa-confirm-order-button'
    );

    if (!modalityContainer || !window.nativaDeliveryData.serviceStatus) return;

    let anyServiceOpen = false;
    const buttons = modalityContainer.querySelectorAll('.nativa-order-button');
    // --- INÍCIO DA MODIFICAÇÃO ---
    const waitTimes = window.nativaDeliveryData.waitTimes || {};
    // --- FIM DA MODIFICAÇÃO ---

    buttons.forEach((btn) => {
        const modality = btn.dataset.modality;
        const isOpen = window.nativaDeliveryData.serviceStatus[modality];

        btn.classList.toggle('active', modality === currentModality);

        if (!isOpen) {
            btn.disabled = true;
            btn.classList.add('is-closed');
        } else {
            anyServiceOpen = true;
            btn.disabled = false;
            btn.classList.remove('is-closed');
        }

        // --- INÍCIO DA MODIFICAÇÃO ---
        // Adiciona ou atualiza o span com o tempo de espera.
        let waitTimeEl = btn.querySelector('.modality-wait-time');
        if (!waitTimeEl) {
            waitTimeEl = document.createElement('span');
            waitTimeEl.className = 'modality-wait-time';
            btn.appendChild(waitTimeEl);
        }
        waitTimeEl.textContent = waitTimes[modality] || '-- min';
        // --- FIM DA MODIFICAÇÃO ---
    });

    if (!anyServiceOpen && storeClosedMessage) {
        storeClosedMessage.style.display = 'block';
        if (confirmOrderButton) confirmOrderButton.disabled = true;
    } else {
        if (storeClosedMessage) storeClosedMessage.style.display = 'none';
        if (confirmOrderButton) confirmOrderButton.disabled = false;
    }

    const personalDataSection = document.querySelector(
        '.nativa-personal-data-section'
    );
    const shouldBeVisible = currentModality === 'delivery';

    if (personalDataSection) {
        personalDataSection.style.display = shouldBeVisible ? 'block' : 'none';
    }
};

export const renderLoggedInUserAddresses = (addresses, allBairros) => {
    const container = document.getElementById(
        'nativa-checkout-address-cards-container'
    );
    if (!container) return;

    const decodedAddresses = decodeStreetNames(addresses);

    if (decodedAddresses && decodedAddresses.length > 0) {
        container.innerHTML = decodedAddresses
            .map((address) => {
                const isPrimary = address.is_primary;
                const isChecked = isPrimary ? 'checked' : '';
                const isSelectedClass = isPrimary ? 'is-selected' : '';

                const bairroInfo = allBairros.find(
                    (b) => b.id == address.bairro_id
                );

                const bairroName = bairroInfo
                    ? escapeHTML(bairroInfo.nome)
                    : 'Bairro não encontrado';

                const streetName = escapeHTML(address.street || '');
                const addressApelido = escapeHTML(address.apelido);
                const addressNumber = escapeHTML(address.number);
                const complementHtml = address.complement
                    ? `<p class="checkout-address-card-complement">${escapeHTML(address.complement)}</p>`
                    : '';

                return `
                <label class="checkout-address-card ${isSelectedClass}" for="address-${address.id}">
                    <input type="radio" name="selected_address" id="address-${address.id}" value="${address.id}" ${isChecked}>
                    <div class="checkout-address-card-header">
                        <strong class="checkout-address-card-title">${addressApelido}</strong>
                        ${isPrimary ? '<span class="checkout-address-card-primary-tag">Principal</span>' : ''}
                    </div>
                    <p class="checkout-address-card-info">${streetName}, ${addressNumber} - ${bairroName}</p>
                    ${complementHtml}
                </label>
            `;
            })
            .join('');
    } else {
        container.innerHTML =
            '<p>Nenhum endereço cadastrado. Adicione um para continuar.</p>';
    }
};

export const updateAddressActionButton = () => {
    const button = document.getElementById(
        'nativa-checkout-address-action-btn'
    );
    const buttonText = document.getElementById(
        'nativa-checkout-address-action-btn-text'
    );
    if (!button || !buttonText) return;

    button.style.display = 'inline-flex';
    buttonText.textContent = 'Adicionar novo endereço';
};

// --- INÍCIO DA MODIFICAÇÃO (CPT Pagamentos / Restrição) ---
/**
 * Renderiza dinamicamente os botões de método de pagamento.
 * Aplica a lógica de restrição de pagamento.
 */
export const renderPaymentMethods = () => {
    const container = document.getElementById('nativa-payment-method-options');
    if (!container) return;

    const methods = state.serverData.paymentMethods || [];
    const restriction = state.user.paymentRestriction; // ex: 'pix_only' ou null
    let html = '';

    if (methods.length === 0) {
        container.innerHTML = '<p>Nenhuma forma de pagamento configurada.</p>';
        return;
    }

    methods.forEach((method) => {
        let isDisabled = false;
        let title = '';
        // --- INÍCIO DA MODIFICAÇÃO (MISSÃO 1.1) ---
        let unavailableClass = ''; // Inicia a classe como vazia
        // --- FIM DA MODIFICAÇÃO (MISSÃO 1.1) ---

        // 1. Verifica a disponibilidade do CPT
        if (method.disponibilidade === 'indisponivel') {
            isDisabled = true;
            title = 'Forma de pagamento temporariamente indisponível.';
            // --- INÍCIO DA MODIFICAÇÃO (MISSÃO 1.1) ---
            unavailableClass = 'is-unavailable'; // Adiciona a classe
            // --- FIM DA MODIFICAÇÃO (MISSÃO 1.1) ---
        }

        // 2. Verifica a restrição do usuário (tem prioridade)
        // --- INÍCIO DA MODIFICAÇÃO (MISSÃO 1) ---
        if (
            restriction === 'pix_only' &&
            method.categoria !== 'pix_automatico' &&
            method.categoria !== 'pix_manual'
        ) {
            isDisabled = true;
            title = 'Sua conta está restrita à pagamentos via Pix'; // Mensagem atualizada
            // --- INÍCIO DA MODIFICAÇÃO (MISSÃO 1.1) ---
            unavailableClass = 'is-unavailable'; // Adiciona a classe
            // --- FIM DA MODIFICAÇÃO (MISSÃO 1.1) ---
        }
        // --- FIM DA MODIFICAÇÃO (MISSÃO 1) ---

        html += `
            <button type="button" 
                    class="nativa-payment-button ${unavailableClass}" 
                    data-value="${escapeHTML(method.slug)}" 
                    ${isDisabled ? 'disabled' : ''}
                    title="${escapeHTML(title)}">
                <span>${escapeHTML(method.title)}</span>
            </button>
        `;
    });

    container.innerHTML = html;
};

/**
 * Atualiza o card de informações e o campo de troco com base no método selecionado.
 * @param {object|null} selectedMethod - O objeto completo do método de pagamento selecionado.
 */
export const updatePaymentMethodInfo = (selectedMethod) => {
    // --- FIM DA MODIFICAÇÃO ---
    const infoCard = document.getElementById('nativa-payment-info-card');
    const trocoField = document.getElementById('nativa-troco-field');
    if (!infoCard || !trocoField) return;

    infoCard.style.display = 'none';
    infoCard.innerHTML = '';
    trocoField.style.display = 'none';

    // --- INÍCIO DA MODIFICAÇÃO (CPT Pagamentos) ---
    // Se nenhum método for selecionado (limpando a seleção), esconde tudo.
    if (!selectedMethod) {
        return;
    }

    const infoText = selectedMethod.info_adicional || '';
    const exigeTroco = selectedMethod.exige_troco || false;

    // Exibe o card de informação se houver texto
    if (infoText) {
        infoCard.innerHTML = `<span class="material-symbols-rounded">info</span><p>${escapeHTML(
            infoText
        )}</p>`;
        infoCard.style.display = 'flex';
    }

    // Exibe o campo de troco se o CPT exigir
    if (exigeTroco) {
        trocoField.style.display = 'block';
    }
    // --- FIM DA MODIFICAÇÃO ---
};
