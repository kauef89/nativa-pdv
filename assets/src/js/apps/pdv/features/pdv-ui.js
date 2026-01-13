import { closeSheet } from '@utils/ui-helpers.js';

// --- Navegação Geral (Sidebar) ---
export function switchView(viewId) {
    document
        .querySelectorAll('.nav-item')
        .forEach((btn) => btn.classList.remove('active'));
    const targetBtn = document.querySelector(
        `.nav-item[onclick*="'${viewId}'"]`
    );
    if (targetBtn) targetBtn.classList.add('active');

    document.querySelectorAll('.pdv-view').forEach((view) => {
        view.classList.remove('active');
        view.style.display = 'none';
    });

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
        targetView.style.display = 'block';
        setTimeout(() => targetView.classList.add('active'), 10);
    }
}

// --- Side Sheet (Novo Pedido) ---
export function openNewOrderSheet() {
    const overlay = document.getElementById('new-order-sheet-overlay');
    const sheet = document.getElementById('new-order-sheet');

    if (overlay && sheet) {
        resetNewOrderSteps();
        overlay.classList.add('is-visible');
        sheet.classList.add('is-open');

        setTimeout(() => {
            const input = document.getElementById('new-order-client-term');
            if (input) {
                input.value = '';
                input.focus();
            }
        }, 300);
    }
}

export function closeNewOrderSheet() {
    const overlay = document.getElementById('new-order-sheet-overlay');
    const sheet = document.getElementById('new-order-sheet');

    if (overlay && sheet) {
        overlay.classList.remove('is-visible');
        sheet.classList.remove('is-open');
        setTimeout(() => {
            resetNewOrderSteps();
        }, 300);
    }
}

export function resetNewOrderSteps() {
    const step1 = document.getElementById('step-client-search');
    const step2 = document.getElementById('step-order-builder');

    if (step1) {
        step1.classList.add('active');
        step1.style.display = 'block';
    }
    if (step2) {
        step2.classList.remove('active');
        step2.style.display = 'none';
    }

    const results = document.getElementById('new-order-client-results');
    if (results) {
        results.style.display = 'none';
        results.innerHTML = '';
    }
    const loader = document.getElementById('new-order-loading');
    if (loader) loader.style.display = 'none';

    // Reseta a visão da sacola para "Lista de Itens" sempre que abrir
    toggleCartView('cart');
    switchTab('tab-menu');
}

export function switchTab(tabId) {
    document
        .querySelectorAll('.pdv-tab-pane')
        .forEach((el) => el.classList.remove('active'));
    document
        .querySelectorAll('.pdv-tab-btn')
        .forEach((el) => el.classList.remove('active'));

    const targetPane = document.getElementById(tabId);
    if (targetPane) targetPane.classList.add('active');

    const targetBtn = document.querySelector(
        `.pdv-tab-btn[data-target="${tabId}"]`
    );
    if (targetBtn) targetBtn.classList.add('active');
}

// --- Alternância de Visão na Aba Sacola (Carrinho <-> Checkout) ---
export function toggleCartView(viewName) {
    const cartWrapper = document.getElementById('nativa-cart-view-wrapper');
    const checkoutWrapper = document.getElementById(
        'nativa-checkout-view-wrapper'
    );

    if (!cartWrapper || !checkoutWrapper) return;

    if (viewName === 'checkout') {
        cartWrapper.style.display = 'none';
        checkoutWrapper.style.display = 'flex'; // Exibe o checkout
    } else {
        checkoutWrapper.style.display = 'none';
        cartWrapper.style.display = 'flex'; // Exibe a lista
    }
}

// --- Encapsulamento de Modais (Desktop) ---
export function encapsulateModalsForPdv() {
    const pdvContainer = document.getElementById('new-order-sheet');
    const cartViewWrapper = document.getElementById('nativa-cart-view-wrapper'); // Destino correto do cart

    if (!pdvContainer) return;

    const modaisToMove = [
        'nativa-product-details-sheet',
        'options-modal',
        'nativa-combo-wizard-sheet',
        'nativa-offer-sheet',
        'nativa-modality-sheet',
    ];

    // 1. Modais Flutuantes (Product, Combo, etc) -> Vão para o container principal
    modaisToMove.forEach((modalId) => {
        const modalElement = document.getElementById(modalId);
        if (modalElement && modalElement.parentNode !== pdvContainer) {
            pdvContainer.appendChild(modalElement);
            modalElement.classList.add('is-encapsulated');

            // Adiciona botão voltar se necessário
            if (
                modalId === 'nativa-product-details-sheet' ||
                modalId === 'nativa-combo-wizard-sheet'
            ) {
                const header = modalElement.querySelector(
                    '.nativa-bottom-sheet-header'
                );
                if (header && !header.querySelector('.pdv-sheet-back-btn')) {
                    const backBtn = document.createElement('button');
                    backBtn.className = 'pdv-sheet-back-btn';
                    backBtn.type = 'button';
                    backBtn.innerHTML =
                        '<span class="material-symbols-rounded">arrow_back</span>';
                    backBtn.onclick = () => closeSheet(modalElement);
                    header.insertBefore(backBtn, header.firstChild);
                }
            }
        }
    });

    // 2. Carrinho (Caso Especial) -> Vai para DENTRO do wrapper de visão
    const cartSheet = document.getElementById('nativa-cart-side-sheet');
    if (
        cartSheet &&
        cartViewWrapper &&
        cartSheet.parentNode !== cartViewWrapper
    ) {
        cartViewWrapper.appendChild(cartSheet);
        cartSheet.classList.add('is-embedded'); // Classe para estilizar como conteúdo estático
    }
}
