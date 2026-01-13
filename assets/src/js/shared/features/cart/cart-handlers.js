// assets/src/js/shared/features/cart/cart-handlers.js

/**
 * Lida com todas as interações e a lógica de negócio do Carrinho.
 * LOCALIZAÇÃO: Shared (Compartilhado entre Consumer e PDV).
 *
 * Refatorado para:
 * 1. Usar aliases globais (@core, @utils, etc).
 * 2. Desacoplar Router (usa eventos 'nativa:navigate').
 * 3. Adicionado handleModalitySheetActions para a sheet de modalidade.
 * 4. ATUALIZADO: Bloqueio do prompt "Salvar Favorito" no contexto do PDV.
 */

import {
    clearCart,
    getBairros,
    getCartContents,
    getLiveStatus,
    getMyAddresses,
    redeemReward,
    updateCartItemQuantity,
} from '@core/api/api-service.js';
import { state } from '@core/state/global-state.js';
import {
    decodeStreetNames,
    handleOpenAddressForm,
} from '@shared/features/address/address-handler.js';
import { openProductDetails as openProductSheet } from '@shared/features/menu/product-sheet.js';
import { showModal } from '@ui/modals/modal.js';
import {
    calculateDeliveryFee,
    isWithinSchedulingWindow,
} from '@utils/formatters.js';
import { selectModality } from '@utils/helpers.js';
import {
    closeAllSheets,
    closeSheet,
    hideSpinner,
    openSheet,
    provideFeedbackForDisabledElement,
    showSpinner,
    showToast,
} from '@utils/ui-helpers.js';

// Importação do Consumer via Alias (Pode ser null no PDV se não carregado)
import { promptToSaveFavorite } from '@apps/consumer/features/favorites/my-favorites-handler.js';

import {
    renderCartUI,
    updateCartDisplay,
    updateFinancialSummary,
    updateFreteGratisMessage,
    updateModalityDisplay,
} from './cart-ui.js';

export function reloadAndReopenCart() {
    loadAndRenderCart();
    const cartSheet = document.getElementById('nativa-cart-side-sheet');
    if (cartSheet) {
        setTimeout(() => openSheet(cartSheet), 300);
    }
}

function isUserAllowedToCheckout() {
    // Garante que serverData existe (pode ser mockado no PDV se necessário)
    const { serviceStatus, operatingHours } = state.serverData || {};

    if (!serviceStatus || !operatingHours) return false;
    if (operatingHours.open_24_7 === 'on') return true;
    if (serviceStatus.is_store_open) return true;
    if (isWithinSchedulingWindow(operatingHours)) return true;

    return false;
}

function _recalculateAndRenderTotals() {
    const subtotal = state.cart.subtotal || 0;
    const modality = state.selectedModality;

    const deliveryFee = calculateDeliveryFee(
        subtotal,
        modality,
        state.selectedBairro
    );
    state.deliveryFee = deliveryFee;

    const finalTotal =
        subtotal + deliveryFee - (state.appliedCoupon?.amount || 0);

    updateFinancialSummary({ subtotal, deliveryFee, finalTotal, modality });
    updateFreteGratisMessage(subtotal, state.selectedBairro, modality);
}

export function loadAndRenderCart(event) {
    if (event && event.detail && event.detail.newly_added_item_data) {
        const { newly_added_item_data } = event.detail;
        const verb =
            newly_added_item_data.quantity > 1 ? 'adicionados' : 'adicionado';
        showToast(
            `${newly_added_item_data.quantity} × ${newly_added_item_data.name} ${verb}!`,
            'success'
        );

        // Verifica se é PDV para bloquear o prompt de favorito
        const isPdv = window.nativaData?.isPedidosPage === true;

        // Verifica se a função existe antes de chamar (segurança para PDV)
        if (
            !isPdv && // Só executa se NÃO for PDV
            typeof promptToSaveFavorite === 'function' &&
            !newly_added_item_data.is_reward &&
            !newly_added_item_data.is_offer_item
        ) {
            promptToSaveFavorite(newly_added_item_data);
        }
    } else if (event && event.detail && event.detail.showSuccessToast) {
        showToast(event.detail.toastMessage, 'success');
    }

    const isLoggedIn = state.user.isLoggedIn;
    let userAddresses = [];

    const cartItemsContainer = document.getElementById('nativa-cart-items');
    if (cartItemsContainer) {
        cartItemsContainer.innerHTML = `
            <div class="nativa-cart-loader" style="display: flex; justify-content: center; align-items: center; min-height: 150px;">
                <span class="nativa-spinner"></span>
            </div>`;
    }

    Promise.all([
        getBairros(),
        getCartContents(),
        isLoggedIn ? getMyAddresses() : Promise.resolve([]),
    ])
        .then(([bairrosData, cartData, addressesData]) => {
            console.log(
                '[Cart Handlers] Dados do carrinho recebidos:',
                JSON.parse(JSON.stringify(cartData))
            );

            state.selectedModality =
                sessionStorage.getItem('nativaDeliverySelectedModality') ||
                null;

            userAddresses = decodeStreetNames(addressesData);
            const bairros = bairrosData.bairros || [];
            state.allBairros = bairros;
            state.user.addresses = userAddresses;

            Object.assign(state.cart, {
                contents: cartData.cart_contents,
                subtotal: cartData.cart_total,
                count: cartData.cart_count,
                offer: cartData.offer,
                reward: cartData.reward,
            });

            updateCartDisplay(cartData.cart_count, cartData.cart_total);

            const serverStatus = state.serverData?.serviceStatus || {
                is_store_open: true,
            };
            const canCheckout = isUserAllowedToCheckout();

            renderCartUI(cartData, canCheckout, serverStatus);
            handleModalityChanged(userAddresses, bairros);
        })
        .catch((error) => {
            console.error('Erro em loadAndRenderCart:', error);
            if (cartItemsContainer)
                cartItemsContainer.innerHTML = `<p>Erro ao carregar o carrinho.</p>`;
        });
}

async function handleRedeemReward(productId, button) {
    showSpinner(button);
    try {
        const resultData = await redeemReward(productId);
        document.dispatchEvent(
            new CustomEvent('nativa:cartUpdated', { detail: resultData })
        );
        showToast(resultData.message || 'Recompensa adicionada!', 'success');
    } catch (error) {
        showToast(
            error.message || 'Não foi possível resgatar a recompensa.',
            'error'
        );
    } finally {
        hideSpinner(button);
    }
}

export async function handleModalitySheetDisplay() {
    const modalitySheet = document.getElementById('nativa-modality-sheet');
    if (!modalitySheet) {
        return;
    }

    const serviceStatus = state.serverData.serviceStatus;
    const optionsWrapper = document.getElementById(
        'nativa-modality-options-wrapper'
    );
    const closedWrapper = document.getElementById(
        'nativa-modality-closed-wrapper'
    );

    const deliveryEl = document.getElementById('wait-time-delivery');
    const pickupEl = document.getElementById('wait-time-pickup');
    const tableEl = document.getElementById('wait-time-table');

    openSheet(modalitySheet);

    if (serviceStatus && !serviceStatus.is_store_open) {
        if (optionsWrapper) optionsWrapper.style.display = 'none';
        if (closedWrapper) {
            closedWrapper.innerHTML = `
                <span class="material-symbols-rounded store-closed" style="font-size: 48px; margin-bottom: 8px;">shopping_cart_off</span>
                <h4 class="status-title">Fechado agora</h4>
                <p class="status-subtitle">Voltamos ${serviceStatus.next_opening}.<br/>
                Você pode navegar pelo cardápio, mas não poderá finalizar seu pedido.</p>
                <button id="nativa-modality-closed-confirm-btn" class="nativa-button-primary">Entendi</button>
            `;
            closedWrapper.style.display = 'flex';

            const closeButton = document.getElementById(
                'nativa-modality-closed-confirm-btn'
            );
            closeButton?.addEventListener(
                'click',
                () => closeSheet(modalitySheet),
                { once: true }
            );
        }
    } else {
        if (optionsWrapper) optionsWrapper.style.display = 'block';
        if (closedWrapper) closedWrapper.style.display = 'none';

        if (deliveryEl) deliveryEl.textContent = '...';
        if (pickupEl) pickupEl.textContent = '...';
        if (tableEl) tableEl.textContent = '...';

        try {
            const ajaxUrl =
                window.nativaData?.ajax_url || '/wp-admin/admin-ajax.php';
            const response = await fetch(ajaxUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({
                    action: 'nativa_delivery_get_wait_times',
                }),
            });

            if (!response.ok) throw new Error('Network response was not ok');

            const result = await response.json();
            if (!result.success) throw new Error(result.data || 'API Error');

            const waitTimes = result.data;
            // Atualiza globalmente se possível
            if (window.nativaData) {
                window.nativaData.waitTimes = waitTimes;
            }

            if (deliveryEl)
                deliveryEl.textContent = waitTimes.delivery || '-- min';
            if (pickupEl) pickupEl.textContent = waitTimes.pickup || '-- min';
            if (tableEl) tableEl.textContent = waitTimes.table || '-- min';
        } catch (error) {
            console.error('Falha ao buscar tempos de espera:', error);
            if (deliveryEl) deliveryEl.textContent = '-- min';
            if (pickupEl) pickupEl.textContent = '-- min';
            if (tableEl) tableEl.textContent = '-- min';
        }

        const modalityButtons = modalitySheet.querySelectorAll(
            '.nativa-order-button'
        );
        modalityButtons.forEach((btn) => {
            const modality = btn.dataset.modality;
            const isAvailable = serviceStatus && serviceStatus[modality];

            btn.disabled = !isAvailable;
            btn.classList.toggle('is-unavailable', !isAvailable);
        });
    }
}

// --- NOVO HANDLER: Ações da Sheet de Modalidade ---
export function handleModalitySheetActions(event) {
    const target = event.target;
    const button = target.closest('.nativa-order-button');

    if (button && !button.disabled) {
        const modality = button.dataset.modality;

        // 1. Atualiza a modalidade no sistema
        selectModality(modality);

        // 2. Fecha a sheet de modalidade
        const sheet = document.getElementById('nativa-modality-sheet');
        if (sheet) {
            closeSheet(sheet);
        }
    }
}

const _handleAddressPillClick = (target) => {
    const addressId = target.dataset.addressId;
    const selectedAddress = state.user.addresses.find(
        (addr) => addr.id === addressId
    );

    if (selectedAddress) {
        state.selectedBairro = state.allBairros.find(
            (b) => b.id == selectedAddress.bairro_id
        );
        sessionStorage.setItem('nativaCartSelectedAddressId', addressId);
        document.querySelectorAll('.address-pill').forEach((pill) => {
            pill.classList.toggle(
                'is-active',
                pill.dataset.addressId === addressId
            );
        });
        _recalculateAndRenderTotals();
    }
};

const _handleRemoveItemClick = (target) => {
    const cartItemKey = target.dataset.key;
    showModal({
        title: 'Remover Item',
        iconName: 'remove_shopping_cart',
        message: 'Tem certeza que deseja remover este item do carrinho?',
        confirmText: 'Remover',
        cancelText: 'Cancelar',
        isCritical: true,
    }).then((result) => {
        if (result) {
            updateCartItemBackend(cartItemKey, 0);
        }
    });
};

const _handleEditItemClick = (target) => {
    const cartItemKey = target.dataset.cartItemKey;
    const itemToEdit = state.cart.contents[cartItemKey];
    if (!itemToEdit) return;
    closeAllSheets();
    if (itemToEdit.is_combo) {
        document.dispatchEvent(
            new CustomEvent('nativa:editComboFromCart', {
                detail: {
                    itemToEdit: itemToEdit,
                    cartItemKey: cartItemKey,
                },
            })
        );
    } else {
        const productData = (state.menu.products || []).find(
            (p) => p.id == itemToEdit.product_id
        );
        if (productData) {
            openProductSheet(productData, itemToEdit, cartItemKey);
        } else {
            showToast(
                'Não foi possível encontrar os dados deste produto para edição.',
                'error'
            );
        }
    }
};

export function handleCartActions(event) {
    const target = event.target;

    const modalityButton = target.closest(
        '.nativa-modality-options-cart .nativa-order-button'
    );
    if (modalityButton) {
        const modalitySelection = document.getElementById(
            'nativa-cart-modality-selection'
        );
        if (modalitySelection) {
            modalitySelection.classList.remove('is-error');
        }
        selectModality(modalityButton.dataset.modality);
        return;
    }

    const actionMap = {
        '.address-pill:not(.add-new)': _handleAddressPillClick,
        '#cart-add-new-address-btn-pill': () => handleOpenAddressForm('cart'),
        '.bairro-pill': (el) =>
            handleBairroChange({ value: el.dataset.bairroId }),
        '#go-to-menu-from-cart': () => {
            // Emite evento para navegação desacoplada
            document.dispatchEvent(
                new CustomEvent('nativa:navigate', {
                    detail: { path: '/cardapio' },
                })
            );
            // Se estiver no PDV, podemos forçar o fechamento de sheets extras
            const cartSheet = document.getElementById('nativa-cart-side-sheet');
            if (cartSheet) closeSheet(cartSheet);
        },
        '.nativa-cart-item-remove-button': _handleRemoveItemClick,
        '.nativa-cart-item-edit-button': _handleEditItemClick,
        '#nativa-redeem-reward-btn': (el) =>
            handleRedeemReward(el.dataset.productId, el),
        '#nativa-cart-add-address-btn': () => handleOpenAddressForm('cart'),
    };

    if (
        provideFeedbackForDisabledElement(
            event,
            '.nativa-modality-options-cart .nativa-order-button',
            'Este serviço não está disponível no momento.'
        )
    ) {
        return;
    }

    for (const selector in actionMap) {
        const element = target.closest(selector);
        if (element) {
            actionMap[selector](element);
            return;
        }
    }
}

export function handleAddressSelectionActions(event) {
    const target = event.target;

    const addressRadio = target.closest('input[name="cart-selected-address"]');
    if (addressRadio) {
        const addressId = addressRadio.value;
        const selectedAddress = state.user.addresses.find(
            (addr) => addr.id === addressId
        );
        if (selectedAddress) {
            state.selectedBairro = state.allBairros.find(
                (b) => b.id == selectedAddress.bairro_id
            );
            sessionStorage.setItem('nativaCartSelectedAddressId', addressId);
        }
        _recalculateAndRenderTotals();
        return;
    }

    const confirmButton = target.closest(
        '#nativa-address-selection-confirm-btn'
    );
    if (confirmButton) {
        const addressSheet = document.getElementById(
            'nativa-address-selection-sheet'
        );
        if (addressSheet) {
            closeSheet(addressSheet);
        }
        loadAndRenderCart();
        return;
    }

    const addNewAddressBtn = target.closest(
        '#nativa-address-selection-add-new-btn'
    );
    if (addNewAddressBtn) {
        handleOpenAddressForm('cart');
        return;
    }
}

async function updateCartItemBackend(cartItemKey, newQuantity) {
    try {
        const resultData = await updateCartItemQuantity(
            cartItemKey,
            newQuantity
        );
        document.dispatchEvent(
            new CustomEvent('nativa:cartUpdated', { detail: resultData })
        );
        showToast('Carrinho atualizado!', 'success');
    } catch (error) {
        showToast(error.message, 'error');
        await loadAndRenderCart();
    }
}

export async function handleClearCart() {
    showModal({
        title: 'Limpar Carrinho',
        iconName: 'delete_sweep',
        message: 'Tem certeza que deseja limpar todo o carrinho?',
        confirmText: 'Limpar',
        cancelText: 'Cancelar',
        isCritical: true,
    }).then((result) => {
        if (result) {
            const clearButton = document.getElementById(
                'nativa-clear-cart-button'
            );
            if (clearButton) showSpinner(clearButton);

            state.selectedBairro = null;
            state.selectedModality = null;
            sessionStorage.removeItem('nativaDeliverySelectedBairroId');
            sessionStorage.removeItem('nativaOfferActioned');
            sessionStorage.removeItem('nativaDeliverySelectedModality');

            clearCart()
                .then((resultData) => {
                    showToast('Carrinho limpo com sucesso!', 'success');
                    document.dispatchEvent(
                        new CustomEvent('nativa:cartUpdated', {
                            detail: resultData,
                        })
                    );
                })
                .catch((error) => {
                    showToast(error.message, 'error');
                    loadAndRenderCart();
                })
                .finally(() => {
                    if (clearButton) hideSpinner(clearButton);
                });
        }
    });
}

export async function handleCheckout(event) {
    if (
        provideFeedbackForDisabledElement(
            event,
            '#nativa-checkout-button',
            'A loja está fechada. Não é possível finalizar o pedido agora.'
        )
    ) {
        return;
    }
    const checkoutButton = event.target.closest('#nativa-checkout-button');
    if (!checkoutButton || checkoutButton.disabled) return;

    const currentModality = state.selectedModality;

    if (
        !currentModality &&
        !isWithinSchedulingWindow(state.serverData.operatingHours)
    ) {
        showToast('Por favor, selecione como você quer seu pedido.', 'error');
        const modalitySelection = document.getElementById(
            'nativa-cart-modality-selection'
        );
        if (modalitySelection) {
            modalitySelection.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
            modalitySelection.classList.add('is-error');
        }
        return;
    }

    if (
        currentModality === 'delivery' &&
        (!state.selectedBairro || !state.selectedBairro.id)
    ) {
        const isLoggedIn = state.user.isLoggedIn;
        const errorMessage = isLoggedIn
            ? 'Por favor, selecione ou cadastre um endereço.'
            : 'Por favor, selecione seu bairro para a entrega.';
        showToast(errorMessage, 'error');

        const elementToFocus = isLoggedIn
            ? document.getElementById('cart-add-new-address-btn-pill')
            : document.querySelector('.bairro-pills-container');
        if (elementToFocus) {
            elementToFocus.classList.add('is-error');
            elementToFocus.focus();
            elementToFocus.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
        return;
    }

    showSpinner(checkoutButton);

    try {
        const liveStatus = await getLiveStatus();

        if (
            !liveStatus.is_store_open &&
            !isWithinSchedulingWindow(state.serverData.operatingHours)
        ) {
            showToast(
                'Ops! Parece que fechamos enquanto você finalizava o pedido. Tente novamente no nosso próximo horário.',
                'error'
            );
            await loadAndRenderCart();
            return;
        }

        closeAllSheets();

        const targetPath = '/checkout';
        document.dispatchEvent(
            new CustomEvent('nativa:navigate', { detail: { path: targetPath } })
        );
    } catch (error) {
        console.error('Falha crítica no checkout:', error);
        showToast(
            error.message ||
                'Desculpe, não foi possível completar seu pedido agora.',
            'error'
        );
    } finally {
        hideSpinner(checkoutButton);
    }
}

export function handleBairroChange(e) {
    const bairroId = e.value ?? e.target?.value;

    if (bairroId) {
        state.selectedBairro =
            state.allBairros.find((b) => b.id == bairroId) || null;
        sessionStorage.setItem('nativaDeliverySelectedBairroId', bairroId);

        const pillsContainer = document.querySelector(
            '.bairro-pills-container'
        );
        if (pillsContainer) {
            pillsContainer.querySelectorAll('.bairro-pill').forEach((pill) => {
                pill.classList.toggle(
                    'is-active',
                    pill.dataset.bairroId == bairroId
                );
            });
        }
    } else {
        state.selectedBairro = null;
        sessionStorage.removeItem('nativaDeliverySelectedBairroId');
        const pillsContainer = document.querySelector(
            '.bairro-pills-container'
        );
        if (pillsContainer) {
            pillsContainer
                .querySelectorAll('.bairro-pill')
                .forEach((pill) => pill.classList.remove('is-active'));
        }
    }

    _recalculateAndRenderTotals();
}

export async function handleModalityChanged(
    addresses = [],
    bairros = [],
    newModality = null
) {
    if (newModality) {
        state.selectedModality = newModality;
    }
    const isLoggedIn = state.user.isLoggedIn;
    const canCheckout = isUserAllowedToCheckout();

    if (state.selectedModality === 'delivery') {
        if (isLoggedIn) {
            const cartSelectedAddressId = sessionStorage.getItem(
                'nativaCartSelectedAddressId'
            );
            let activeAddress = addresses.find(
                (addr) => addr.id === cartSelectedAddressId
            );
            if (!activeAddress) {
                activeAddress =
                    addresses.find((addr) => addr.is_primary) || addresses[0];
            }

            if (activeAddress) {
                state.selectedBairro =
                    state.allBairros.find(
                        (b) => b.id == activeAddress.bairro_id
                    ) || null;
                sessionStorage.setItem(
                    'nativaCartSelectedAddressId',
                    activeAddress.id
                );
            } else {
                state.selectedBairro = null;
                sessionStorage.removeItem('nativaCartSelectedAddressId');
            }
        } else {
            const persistedBairroId = sessionStorage.getItem(
                'nativaDeliverySelectedBairroId'
            );
            if (persistedBairroId) {
                state.selectedBairro =
                    state.allBairros.find((b) => b.id == persistedBairroId) ||
                    null;
            } else {
                state.selectedBairro = null;
            }
        }
    } else {
        state.selectedBairro = null;
    }

    updateModalityDisplay(
        state.selectedModality,
        canCheckout,
        addresses,
        bairros
    );

    _recalculateAndRenderTotals();
}
