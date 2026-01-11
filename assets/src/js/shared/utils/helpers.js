// shared/utils/helpers.js

import { openProductDetails } from '@shared/features/menu/product-sheet.js';
import {
    getMenuData,
    getBairros,
    addSelectedItemsToCart,
} from '@core/api/api-service.js';
import { state } from '@core/state/global-state.js';
import { hideLoader, showToast, openSheet, closeSheet } from './ui-helpers.js';
import { initFromMenu as initComboWizardFromMenu } from '@shared/features/menu/wizard/combo-wizard-handlers.js';

/**
 * Popula o estado inicial da aplicação (sincronamente) a partir dos dados
 * injetados no objeto `window.nativaDeliveryData`.
 */
export function hydrateStateFromWindow() {
    if (window.nativaDeliveryData) {
        // --- INÍCIO DA MODIFICAÇÃO (CPT Pagamentos / Restrição) ---
        Object.assign(state.serverData, {
            serviceStatus: window.nativaDeliveryData.serviceStatus || {},
            operatingHours: window.nativaDeliveryData.operatingHours || {},
            paymentMethods: window.nativaDeliveryData.paymentMethods || [], // Carrega os métodos de pagamento
            googleClientId: window.nativaDeliveryData.google_client_id || null,
            whatsappNumber: window.nativaDeliveryData.whatsappNumber || null,
            logoutUrl: window.nativaDeliveryData.logout_url || null,
            checkoutUrl: window.nativaDeliveryData.checkout_url || null,
            app_version: window.nativaDeliveryData.app_version || null,
            homeBackgrounds: window.nativaDeliveryData.homeBackgrounds || {
                open: [],
                closed: [],
            },
        });

        // Hidrata os dados do usuário, incluindo a restrição de pagamento
        if (window.nativaDeliveryData.currentUser) {
            state.user.paymentRestriction =
                window.nativaDeliveryData.currentUser.paymentRestriction ||
                null;
        }
        // --- FIM DA MODIFICAÇÃO ---
    } else {
        console.error(
            '[HELPERS] FATAL: window.nativaDeliveryData não foi encontrado durante a inicialização.'
        );
    }
}

// Promise para garantir que o carregamento de dados via API ocorra apenas uma vez por sessão.
let dataLoadedPromise = null;

/**
 * Garante que os dados essenciais da aplicação (menu, bairros, etc.) sejam carregados do servidor
 * (assincronamente) e populados no estado centralizado. Utiliza um "promise" para evitar múltiplas chamadas.
 */
export function fetchCoreData() {
    if (!dataLoadedPromise) {
        console.log(
            '[HELPERS] Criando nova promise para carregamento de dados essenciais...'
        );

        const dataFetchPromise = Promise.all([getMenuData(), getBairros()]);
        const minDelayPromise = new Promise((resolve) =>
            setTimeout(resolve, 1500)
        );

        dataLoadedPromise = new Promise((resolve, reject) => {
            Promise.all([dataFetchPromise, minDelayPromise])
                .then(([[menuData, bairrosData]]) => {
                    Object.assign(state.menu, {
                        categories: menuData.categories || [],
                        products: menuData.products || [],
                        adicionalGroups: menuData.adicionalGroups || {},
                        comboSteps: menuData.comboSteps || {},
                    });
                    state.allBairros = bairrosData.bairros || [];

                    console.log(
                        '[HELPERS] Dados de menu e bairros carregados e populados no estado.'
                    );
                    hideLoader();
                    resolve([menuData, bairrosData]);
                })
                .catch((error) => {
                    console.error('Falha ao carregar dados essenciais:', error);
                    showToast(
                        'Não foi possível carregar os dados do cardápio. Tente recarregar a página.',
                        'error'
                    );
                    hideLoader();
                    dataLoadedPromise = null; // Permite uma nova tentativa
                    reject(error);
                });
        });
    }
    return dataLoadedPromise;
}

/**
 * Força uma nova busca dos dados do menu, invalidando o cache local.
 */
export async function forceRefreshMenuData() {
    console.log('[HELPERS] Forçando a atualização dos dados do menu...');
    dataLoadedPromise = null;

    if (state.menu) {
        state.menu.products = [];
    }

    try {
        await fetchCoreData();
        console.log(
            '[HELPERS] Dados do menu atualizados com sucesso do servidor.'
        );
    } catch (error) {
        console.error(
            'Falha ao forçar a atualização dos dados do menu:',
            error
        );
        throw error;
    }
}

/**
 * Define a modalidade de pedido, salva o estado e executa ações pendentes.
 * @param {string} modality - A modalidade escolhida (ex: 'delivery', 'pickup').
 */
export function selectModality(modality) {
    // --- INÍCIO DA SONDA DE DEPURAÇÃO ---
    console.log(
        `%c[SONDA HELPERS 1/1] selectModality chamada. Definindo modalidade para: "${modality}"`,
        'color: #2ECC71; font-weight: bold;'
    );
    // --- FIM DA SONDA DE DEPURAÇÃO ---

    const modalitySheet = document.getElementById('nativa-modality-sheet');

    state.selectedModality = modality;
    sessionStorage.setItem('nativaDeliverySelectedModality', modality);

    document.dispatchEvent(
        new CustomEvent('nativa:modalityChanged', {
            detail: { modality: modality },
        })
    );

    if (modalitySheet) closeSheet(modalitySheet);

    // Executa ações que estavam aguardando a seleção de modalidade
    const afterAction = state.menu.afterModalityAction;
    if (afterAction === 'open_product_details' && state.menu.currentProduct) {
        setTimeout(() => {
            openProductDetails(state.menu.currentProduct);
        }, 150);
    } else if (
        afterAction === 'open_combo_wizard' &&
        state.menu.lastClickedCardElement
    ) {
        setTimeout(() => {
            initComboWizardFromMenu(state.menu.lastClickedCardElement);
        }, 150);
    }

    const pendingItemsJSON =
        sessionStorage.getItem('nativaPendingReorderItems') ||
        sessionStorage.getItem('nativaPendingOfferItem') ||
        sessionStorage.getItem('nativaPendingRewardItem');

    if (pendingItemsJSON) {
        addSelectedItemsToCart(pendingItemsJSON)
            .then((resultData) => {
                document.dispatchEvent(
                    new CustomEvent('nativa:cartUpdated', {
                        detail: resultData,
                    })
                );
                try {
                    const pendingItems = JSON.parse(pendingItemsJSON);
                    if (Array.isArray(pendingItems)) {
                        const message =
                            pendingItems.length === 1
                                ? 'Item adicionado ao seu carrinho!'
                                : `${pendingItems.length} itens adicionados ao seu carrinho!`;
                        showToast(message, 'success');
                    } else {
                        showToast(
                            'Itens adicionados ao seu carrinho!',
                            'success'
                        );
                    }
                } catch {
                    // CORREÇÃO: Removido (e) não utilizado
                    showToast('Itens adicionados ao seu carrinho!', 'success');
                }
                setTimeout(() => {
                    const cartSheet = document.getElementById(
                        'nativa-cart-side-sheet'
                    );
                    if (cartSheet) openSheet(cartSheet);
                }, 500);
            })
            .catch((error) => {
                showToast(error.message, 'error');
            })
            .finally(() => {
                sessionStorage.removeItem('nativaPendingReorderItems');
                sessionStorage.removeItem('nativaPendingOfferItem');
                sessionStorage.removeItem('nativaPendingRewardItem');
            });
    }

    state.menu.afterModalityAction = null; // Limpa a ação pendente
}
