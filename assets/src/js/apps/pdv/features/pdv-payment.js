import { state } from '@core/state/global-state.js';
import { formatPrice } from '@utils/formatters.js';
import { showToast } from '@utils/ui-helpers.js';

// Função auxiliar interna
function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;
    if (show) {
        modal.classList.add('is-visible');
        const input = modal.querySelector('input:not([type="hidden"])');
        if (input) setTimeout(() => input.focus(), 100);
    } else {
        modal.classList.remove('is-visible');
    }
}

export function openPaymentModal() {
    // Lê do estado global compartilhado
    const cartContents = state.cart.contents || {};
    const hasItems = Object.keys(cartContents).length > 0;

    if (!hasItems) {
        showToast('Cesta vazia!', 'warning');
        return;
    }

    const modal = document.getElementById('payment-modal');
    if (modal) {
        modal.classList.add('is-visible');

        // Calcula total incluindo taxas (simplificado)
        const totalValue = state.cart.subtotal + (state.deliveryFee || 0);

        const totalDisplay = document.getElementById('pay-total-display');
        if (totalDisplay) totalDisplay.textContent = formatPrice(totalValue);

        setTimeout(() => {
            const input = document.getElementById('pay-input-val');
            if (input) input.focus();
        }, 100);
    }
}

export function closePaymentModal() {
    toggleModal('payment-modal', false);
}

export function selectMethod(method, btnElement) {
    // Apenas visual por enquanto (classe selected)
    document
        .querySelectorAll('.nativa-payment-button')
        .forEach((b) => b.classList.remove('selected'));
    if (btnElement) btnElement.classList.add('selected');
}

export function addPayment() {
    const input = document.getElementById('pay-input-val');
    const value = parseFloat(input?.value);
    if (!value || value <= 0) return;

    const list = document.getElementById('pay-list-container');
    if (list) {
        const itemDiv = document.createElement('div');
        itemDiv.style.cssText =
            'display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;';
        itemDiv.innerHTML = `<span>Lançamento</span> <strong>${formatPrice(value)}</strong>`;
        list.appendChild(itemDiv);
    }

    if (input) {
        input.value = '';
        input.focus();
    }
}

export function finalizeOrder() {
    showToast('Venda Finalizada!', 'success');
    // Limpa o modal e fecha
    closePaymentModal();
    // Aqui futuramente chamaremos a API para limpar o carrinho e salvar o pedido
    const list = document.getElementById('pay-list-container');
    if (list) list.innerHTML = '';
}

// --- Funções Legadas (Placeholders para compatibilidade) ---
export function openClientModal() {
    toggleModal('client-modal', true);
}
export function closeClientModal() {
    toggleModal('client-modal', false);
}
export function resetClientModal() {}
export function finalizeRegistration() {}
export function closeOptionsModal() {
    toggleModal('options-modal', false);
}
export function confirmOptions() {
    closeOptionsModal();
}
