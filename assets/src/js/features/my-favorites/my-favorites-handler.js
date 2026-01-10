// js/features/my-favorites/my-favorites-handler.js

/**
 * Módulo para gerenciar produtos favoritos e a interação com a API de favoritos.
 * Este arquivo foi criado como parte da refatoração para a arquitetura de módulos ES6.
 * CORREÇÃO: Move o estado do favorito pendente para o estado global (`state.menu.pendingFavorite`)
 * para resolver erros de referência e garantir a consistência dos dados.
 * ATUALIZAÇÃO (Disponibilidade): Verifica a disponibilidade do favorito (item base e adicionais)
 * antes de tentar adicioná-lo ao carrinho.
 * NOVO (PWA Check): Adiciona verificação para exigir instalação PWA antes de adicionar favorito ao carrinho.
 */

import { state } from '../../core/main-state.js';
import {
    getMyFavorites,
    addToCart,
    addComboToCart,
    deleteCustomFavorite,
    saveCustomFavorite,
} from '../../core/nativa-api-service.js';
import {
    showToast,
    showSpinner,
    hideSpinner,
    flyToCart,
    openSheet,
    closeSheet,
    enqueueUIAction,
    escapeHTML,
    // --- INÍCIO DA MODIFICAÇÃO ---
    checkPWAInstallAndProceed, // Importa a nova função
    // --- FIM DA MODIFICAÇÃO ---
} from '../../utils/nativa-ui-helpers.js';
import { showModal } from '../../utils/modal.js';
import { Router } from '../../core/router.js';
import { forceRefreshMenuData } from '../../utils/helpers.js';
import { handleModalitySheetDisplay } from '../cart/cart-handlers.js';

/**
 * Verifica se um favorito (incluindo adicionais) está disponível atualmente.
 * @param {object} favorite - O objeto do favorito.
 * @returns {boolean} - True se disponível, False caso contrário.
 */
function isFavoriteAvailable(favorite) {
    const allProducts = window.nativaDeliveryData.products || [];
    const productId = favorite.base_product_id;
    const productData = allProducts.find((p) => p.id == productId);

    // Verifica disponibilidade do item base
    if (
        !productData ||
        productData.availability === 'indisponivel' ||
        productData.availability === 'oculto'
    ) {
        return false;
    }

    // Verifica disponibilidade dos adicionais
    let addonsGroupsToProcess = [];
    if (favorite.is_combo_favorite && favorite.configuration?.selections) {
        addonsGroupsToProcess = favorite.configuration.selections.map(
            (sel) => sel.selectedAddons
        );
    } else if (favorite.configuration?.addons) {
        addonsGroupsToProcess = [favorite.configuration.addons];
    }

    for (const addons of addonsGroupsToProcess) {
        if (addons) {
            for (const groupId in addons) {
                const group = addons[groupId];
                if (group && group.items) {
                    for (const itemIndex in group.items) {
                        const addonGroupData =
                            window.nativaDeliveryData.adicionalGroups?.[
                                groupId
                            ];
                        const addonItemData =
                            addonGroupData?.itens?.[itemIndex];

                        if (
                            !addonItemData ||
                            addonItemData.item_disponibilidade ===
                                'indisponivel' ||
                            addonItemData.item_disponibilidade === 'oculto'
                        ) {
                            return false; // Adicional indisponível
                        }
                    }
                }
            }
        }
    }

    return true; // Item base e todos os adicionais estão disponíveis
}

async function _refreshMenuAfterFavoriteChange() {
    window.scrollTo(0, 0);
    setTimeout(() => {
        window.location.reload();
    }, 300);
}

async function handleConfirmSaveFavorite() {
    // A lógica agora lê e manipula 'state.menu.pendingFavorite' do estado global.
    if (!state.menu.pendingFavorite) {
        return;
    }

    const saveSheet = document.getElementById('nativa-save-favorite-sheet');
    const button = document.getElementById('confirm-save-favorite-btn');
    const nicknameInput = document.getElementById('favorite-nickname-input');
    const nickname = nicknameInput ? nicknameInput.value.trim() : '';

    const payload = {
        base_product_id: state.menu.pendingFavorite.base_product_id,
        name: state.menu.pendingFavorite.name,
        total_item_price: state.menu.pendingFavorite.total_item_price,
        nickname: nickname,
    };
    const isCombo =
        state.menu.pendingFavorite.addons &&
        state.menu.pendingFavorite.addons.is_combo_configuration;
    if (isCombo) {
        payload.configuration = {
            selections: state.menu.pendingFavorite.addons.selections,
        };
    } else {
        payload.configuration = {
            quantity: state.menu.pendingFavorite.quantity,
            addons: state.menu.pendingFavorite.addons,
        };
    }

    showSpinner(button);
    try {
        const result = await saveCustomFavorite({
            item_data: JSON.stringify(payload),
        });
        if (saveSheet) closeSheet(saveSheet);
        showToast(result.message, 'success');
        await _refreshMenuAfterFavoriteChange();
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideSpinner(button);
        // Limpa o estado pendente após a operação.
        state.menu.pendingFavorite = null;
    }
}

function initializeSaveFavoriteListener() {
    document.addEventListener('DOMContentLoaded', () => {
        const confirmButton = document.getElementById(
            'confirm-save-favorite-btn'
        );
        if (confirmButton && !confirmButton.dataset.listenerAttached) {
            confirmButton.addEventListener('click', handleConfirmSaveFavorite);
            confirmButton.dataset.listenerAttached = 'true';
        }
    });
}

initializeSaveFavoriteListener();

export async function loadFavoriteProducts() {
    if (state.user.isLoggedIn) {
        try {
            const favorites = await getMyFavorites();
            state.menu.favoriteProducts = favorites || {};
        } catch (error) {
            console.error('Erro ao carregar favoritos:', error);
            state.menu.favoriteProducts = {};
        }
    } else {
        state.menu.favoriteProducts = {};
    }
}

export async function handleAddCustomFavoriteToCart(favoriteId, cardElement) {
    const favorite = state.menu.favoriteProducts[favoriteId];
    if (!favorite) {
        showToast(
            'Favorito não encontrado. Tente atualizar a página.',
            'error'
        );
        return;
    }

    // Verifica a disponibilidade ANTES de qualquer outra ação.
    if (!isFavoriteAvailable(favorite)) {
        showToast(
            'Este favorito contém itens que não estão disponíveis no momento.',
            'warning'
        );
        return;
    }

    // --- INÍCIO DA MODIFICAÇÃO (PWA CHECK) ---
    // Verifica se está no PWA antes de pedir confirmação
    const shouldProceed = await checkPWAInstallAndProceed();
    if (!shouldProceed) {
        return; // Interrompe se não for PWA e o usuário não instalar
    }
    // --- FIM DA MODIFICAÇÃO ---

    const confirmed = await showModal({
        title: 'Adicionar ao carrinho',
        iconName: 'add_shopping_cart',
        message: `Quer adicionar "${escapeHTML(favorite.nickname || favorite.name)}" ao seu carrinho?`, // Usa escapeHTML aqui também
        confirmText: 'Quero',
        cancelText: 'Cancelar',
    });

    if (!confirmed) return;

    if (!state.selectedModality) {
        state.selectedModality =
            sessionStorage.getItem('nativaDeliverySelectedModality') || null;
    }
    if (!state.selectedModality) {
        state.menu.afterModalityAction = `add_favorite_${favoriteId}`;
        handleModalitySheetDisplay();
        return;
    }

    showSpinner(cardElement);
    try {
        let resultData;
        if (favorite.is_combo_favorite) {
            resultData = await addComboToCart({
                combo_id: favorite.base_product_id,
                combo_title: favorite.name,
                selections: JSON.stringify(favorite.configuration.selections),
                cart_item_key: null,
                total_item_price: favorite.total_item_price,
            });
        } else {
            resultData = await addToCart({
                product_id: favorite.base_product_id,
                quantity: favorite.configuration.quantity,
                selected_addons: JSON.stringify(favorite.configuration.addons),
            });
        }
        flyToCart(cardElement);
        document.dispatchEvent(
            new CustomEvent('nativa:cartUpdated', { detail: resultData })
        );
        showToast(
            // Mostra o toast DEPOIS de adicionar
            `"${escapeHTML(favorite.nickname || favorite.name)}" adicionado ao carrinho!`,
            'success'
        );
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        hideSpinner(cardElement);
    }
}

export async function handleDeleteCustomFavorite(favoriteId) {
    const favorite = state.menu.favoriteProducts[favoriteId];
    if (!favorite) {
        showToast('Favorito não encontrado para exclusão.', 'error');
        return;
    }

    const confirmResult = await showModal({
        title: 'Excluir Favorito',
        iconName: 'heart_broken ou delete',
        message: `Tem certeza de que deseja remover "${escapeHTML(favorite.nickname || favorite.name)}"? Esta ação é irreversível.`, // Usa escapeHTML
        confirmText: 'Cancelar', // Ação segura
        cancelText: 'Excluir', // Ação destrutiva
        isCritical: true, // Marca o botão "Excluir" como crítico
    });

    // A lógica original estava invertida. confirmResult=true significa que clicou em "Cancelar".
    // A exclusão deve ocorrer quando confirmResult for false (clicou em "Excluir").
    if (confirmResult === false) {
        try {
            await deleteCustomFavorite(favoriteId);
            showToast('Favorito excluído.', 'success');
            await _refreshMenuAfterFavoriteChange();
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
}

function _getFavoriteItemDescription(itemData) {
    const getAddonsHtml = (addons) => {
        if (!addons || typeof addons !== 'object') return '';
        const addonsList = [];
        for (const groupId in addons) {
            const group = addons[groupId];
            if (group && group.items) {
                for (const itemIndex in group.items) {
                    const item = group.items[itemIndex];
                    const qty =
                        item.itemQuantity > 1 ? `${item.itemQuantity} × ` : '';
                    addonsList.push(
                        `${escapeHTML(qty)}${escapeHTML(item.itemName)}`
                    );
                }
            }
        }
        return addonsList.length > 0 ? ` (${addonsList.join(', ')})` : '';
    };

    const isCombo = itemData.addons && itemData.addons.is_combo_configuration;

    if (isCombo) {
        const selectionsDetails = (itemData.addons.selections || [])
            .map((selection) => {
                const addonsHtml = getAddonsHtml(selection.selectedAddons);
                return `<li>${escapeHTML(selection.productName)}${addonsHtml}</li>`;
            })
            .join('');
        return `<strong>${escapeHTML(itemData.name)}</strong><ul class="nativa-combo-favorite-details">${selectionsDetails}</ul>`;
    } else {
        const quantity = itemData.quantity || 1;
        const addonsHtml = getAddonsHtml(itemData.addons);
        return `${quantity} × ${escapeHTML(itemData.name)}${addonsHtml}`;
    }
}

export function promptToSaveFavorite(itemData) {
    if (!state.user.isLoggedIn) return;

    if (!itemData.base_product_id) return;

    enqueueUIAction(() => {
        // A variável 'pendingFavoriteData' foi removida e substituída por 'state.menu.pendingFavorite'.
        state.menu.pendingFavorite = itemData;
        const saveSheet = document.getElementById('nativa-save-favorite-sheet');
        if (saveSheet) {
            const descriptionEl = saveSheet.querySelector(
                '#save-favorite-description'
            );
            if (descriptionEl) {
                descriptionEl.innerHTML = _getFavoriteItemDescription(itemData);
            }

            const nicknameInput = saveSheet.querySelector(
                '#favorite-nickname-input'
            );
            if (nicknameInput) {
                nicknameInput.value = '';
                nicknameInput.placeholder = 'Ex: Meu Xis Salada Completo'; // Placeholder atualizado
            }
            openSheet(saveSheet);
        } else {
            console.error(
                'A ficha #nativa-save-favorite-sheet não foi encontrada no DOM.'
            );
        }
    });
}

document.addEventListener('nativa:modalityChanged', () => {
    if (state.menu.afterModalityAction?.startsWith('add_favorite_')) {
        const favoriteId = state.menu.afterModalityAction.replace(
            'add_favorite_',
            ''
        );
        const cardElement = document.querySelector(
            `.is-custom-favorite[data-favorite-id="${favoriteId}"]`
        );
        state.menu.afterModalityAction = null;
        if (cardElement) {
            handleAddCustomFavoriteToCart(favoriteId, cardElement);
        }
    }
});
