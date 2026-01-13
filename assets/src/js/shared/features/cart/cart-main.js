// assets/src/js/shared/features/cart/cart-main.js

/**
 * Ponto de entrada (Entry Point) do Carrinho Compartilhado.
 * Inicializa listeners e conecta a UI aos Handlers.
 * * LOCALIZAÇÃO: Shared (assets/src/js/shared/features/cart/cart-main.js)
 * * ATUALIZADO: Listener para a sheet de modalidade.
 */

import * as CartHandlers from './cart-handlers.js';

let isCartInitialized = false;

export function init() {
    if (isCartInitialized) {
        return;
    }
    isCartInitialized = true;

    // --- Seletores Principais ---
    const cartSheet = document.getElementById('nativa-cart-side-sheet');
    const addressSelectionSheet = document.getElementById(
        'nativa-address-selection-sheet'
    );
    const clearCartLink = document.getElementById('nativa-clear-cart-button');
    const checkoutButtonWrapper = document.getElementById(
        'nativa-checkout-button-wrapper'
    );
    // NOVO: Seletor da sheet de modalidade (que agora vive dentro da side sheet no PDV)
    const modalitySheet = document.getElementById('nativa-modality-sheet');

    // --- Listeners de Eventos (Delegação) ---

    // 1. Ações dentro da folha do carrinho (remover, editar, mudar quantidade)
    if (cartSheet) {
        cartSheet.addEventListener('click', CartHandlers.handleCartActions);
    } else {
        // Fallback: Tenta encontrar o container pelo ID genérico se a sheet não existir (cenário PDV embed)
        const cartContainer = document.getElementById('nativa-cart-container');
        if (cartContainer) {
            cartContainer.addEventListener(
                'click',
                CartHandlers.handleCartActions
            );
        }
    }

    // 2. Seleção de Endereço
    if (addressSelectionSheet) {
        addressSelectionSheet.addEventListener(
            'click',
            CartHandlers.handleAddressSelectionActions
        );
    }

    // 3. Limpar Carrinho
    if (clearCartLink) {
        clearCartLink.addEventListener('click', (e) => {
            e.preventDefault();
            CartHandlers.handleClearCart();
        });
    }

    // 4. Botão de Checkout (Ir para pagamento)
    if (checkoutButtonWrapper) {
        checkoutButtonWrapper.addEventListener(
            'click',
            CartHandlers.handleCheckout
        );
    }

    // 5. NOVO: Ações da Sheet de Modalidade (Seleção de Entrega/Retirada)
    if (modalitySheet) {
        modalitySheet.addEventListener(
            'click',
            CartHandlers.handleModalitySheetActions
        );
    }

    // --- Eventos Globais do Sistema (Pub/Sub) ---

    // Atualização do Carrinho (addItem, removeItem, etc)
    document.addEventListener('nativa:cartUpdated', (e) =>
        CartHandlers.loadAndRenderCart(e)
    );

    // Mudança de Modalidade (Delivery/Retirada)
    document.addEventListener('nativa:modalityChanged', () =>
        CartHandlers.loadAndRenderCart()
    );

    // Atualização de Endereços (Ao salvar/editar um endereço)
    document.addEventListener('nativa:addressUpdated', () => {
        // Recarrega o carrinho para refletir possíveis mudanças de taxa de entrega
        CartHandlers.reloadAndReopenCart();
    });

    // Mudança de Status da Loja (Abre/Fecha)
    document.addEventListener('nativa:storeStatusChanged', () =>
        CartHandlers.loadAndRenderCart()
    );

    // --- Inicialização Automática ---
    // Carrega os dados iniciais do carrinho ao iniciar o módulo
    CartHandlers.loadAndRenderCart();

    console.log('[Shared Cart Main] Inicializado com sucesso.');
}
