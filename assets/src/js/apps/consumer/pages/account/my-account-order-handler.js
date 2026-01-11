// apps/consumer/pages/account/my-account-order-handler.js

import {
    addSelectedItemsToCart,
    cancelMyOrder,
    getAvailableRewards, // ADICIONADO
} from '@core/api/api-service.js';
import { state } from '@core/state/global-state.js';
import { showModal } from '@ui/modals/modal.js';
import {
    formatNumberWithThousandSeparator,
    formatPrice,
} from '@utils/formatters.js';
import { fetchCoreData } from '@utils/helpers.js';
import {
    checkPWAInstallAndProceed,
    closeSheet,
    escapeHTML, // ADICIONADO
    hideSpinner,
    openSheet,
    showSpinner,
    showToast,
} from '@utils/ui-helpers.js';
import { handleModalitySheetDisplay } from '../../features/cart/cart-handlers.js';
import { initializeMyAccount } from './my-account-data-manager.js';
import { renderReorderSheet } from './my-account-order-ui.js';

// _updateReorderSheetTotal (MODIFICADO - Considera custo de pontos)
function _updateReorderSheetTotal() {
    const reorderSheet = document.getElementById('nativa-reorder-sheet');
    if (!reorderSheet) return;

    const orderId = document.getElementById(
        'reorder-sheet-order-id'
    )?.textContent;
    const allOrders = [
        ...(state.user.currentOrder ? [state.user.currentOrder] : []),
        ...(state.user.orders || []),
    ];
    const order = allOrders.find((o) => o.id == orderId);
    if (!order) return;

    try {
        const itemsFromHistory = JSON.parse(order.items_json || '{}');

        // CORREÇÃO: Mudado de const para let para permitir reatribuição
        let allProducts = state.menu.products || [];

        if (!Array.isArray(allProducts)) {
            console.error(
                '_updateReorderSheetTotal: state.menu.products is not an array.'
            );
            allProducts = []; // Fallback para array vazio
        }

        let currentMonetaryTotal = 0;
        let currentPointsTotal = 0; // Novo: Total de pontos
        const checkboxes = reorderSheet.querySelectorAll(
            '.reorder-item-checkbox-input:checked'
        );

        checkboxes.forEach((cb) => {
            const card = cb.closest('.reorder-item-card');
            const itemKey = card?.dataset.itemKey; // Acesso seguro
            const historicItem = Array.isArray(itemsFromHistory)
                ? itemsFromHistory.find(
                      (item, index) => String(index) === itemKey
                  ) // Compara como string
                : itemsFromHistory[itemKey];

            if (!historicItem) {
                console.warn(
                    `_updateReorderSheetTotal: Item histórico não encontrado para key ${itemKey}`
                );
                return;
            }

            const isReward = cb.dataset.isReward === 'true'; // Verifica se é recompensa pelo checkbox
            const rewardCost = parseInt(cb.dataset.rewardCost || '0', 10);

            if (isReward && rewardCost > 0) {
                currentPointsTotal += rewardCost; // Soma ao total de pontos
                // Preço monetário de recompensa é sempre 0, mas adicionais podem ter custo
            }
            // else { // Não é recompensa OU recompensa tem custo 0
            // Calcula preço monetário (base + adicionais)
            const productId = historicItem.is_combo
                ? historicItem.combo_id
                : historicItem.product_id;
            const productData = allProducts.find(
                (p) => String(p.id) === String(productId)
            ); // Compara como string

            if (productData) {
                // Preço base atual do produto
                const itemPrice = parseFloat(
                    productData.promo_price > 0
                        ? productData.promo_price
                        : productData.price
                );

                let addonsTotal = 0;
                let addonsGroupsToProcess = [];

                if (historicItem.is_combo && historicItem.selections) {
                    addonsGroupsToProcess = historicItem.selections.map(
                        (sel) => sel.selectedAddons
                    );
                } else if (historicItem.selected_addons) {
                    addonsGroupsToProcess = [historicItem.selected_addons];
                }

                // Calcula custo dos adicionais (usando dados atuais se possível)
                const allAdicionalGroupsData =
                    window.nativaDeliveryData?.adicionalGroups || {};
                addonsGroupsToProcess.forEach((addons) => {
                    if (addons && typeof addons === 'object') {
                        for (const groupId in addons) {
                            const group = addons[groupId];
                            const groupConfig = allAdicionalGroupsData[groupId];
                            const isSabor =
                                groupConfig?.grupo_adicional_tipo_grupo ===
                                'sabor';
                            let saborPrices = []; // Para calcular preço de sabor

                            if (
                                group &&
                                group.items &&
                                typeof group.items === 'object'
                            ) {
                                for (const itemIndex in group.items) {
                                    const item = group.items[itemIndex];
                                    const addonConfig =
                                        groupConfig?.grupo_adicional_itens?.[
                                            itemIndex
                                        ];
                                    const currentAddonPrice = parseFloat(
                                        addonConfig?.item_preco ||
                                            item.itemPrice ||
                                            0
                                    ); // Usa preço atual se disponível
                                    const addonQuantity = parseInt(
                                        item.itemQuantity || 1
                                    );

                                    if (isSabor) {
                                        saborPrices.push(currentAddonPrice);
                                    } else {
                                        addonsTotal +=
                                            currentAddonPrice * addonQuantity;
                                    }
                                }
                            }
                            // Calcula preço dos sabores para este grupo
                            if (isSabor && saborPrices.length > 0) {
                                saborPrices.sort((a, b) => b - a); // Mais caros primeiro
                                const minGratis = parseInt(
                                    groupConfig?.grupo_adicional_minimo_gratis ||
                                        0,
                                    10
                                );
                                const precoExtra = parseFloat(
                                    groupConfig?.grupo_adicional_preco_sabor_adicional ||
                                        0
                                );
                                saborPrices.forEach((price, index) => {
                                    addonsTotal += price;
                                    if (index >= minGratis) {
                                        // Começa do 0, então >=
                                        addonsTotal += precoExtra;
                                    }
                                });
                            }
                        }
                    }
                });
                // Soma apenas se NÃO for recompensa (ou se for recompensa mas adicionais tem custo)
                if (!isReward) {
                    currentMonetaryTotal +=
                        (itemPrice + addonsTotal) *
                        (historicItem.quantity || 1);
                } else {
                    // Se for recompensa, SOMA APENAS O CUSTO DOS ADICIONAIS
                    currentMonetaryTotal +=
                        addonsTotal * (historicItem.quantity || 1);
                }
            } else {
                console.warn(
                    `_updateReorderSheetTotal: Dados do produto atual não encontrados para ID ${productId}`
                );
                // Fallback: usa o preço antigo se o produto atual não for encontrado
                if (!isReward) {
                    currentMonetaryTotal += parseFloat(
                        historicItem.total_item_price || 0
                    );
                }
            }
            //}
        });

        const totalSpan = document.getElementById('reorder-sheet-total');
        const addToCartBtn = document.getElementById(
            'reorder-sheet-add-to-cart-btn'
        );

        // Monta a string do total
        let totalString = formatPrice(currentMonetaryTotal);
        if (currentPointsTotal > 0) {
            totalString += ` + ${formatNumberWithThousandSeparator(currentPointsTotal)} pts`;
        }

        if (totalSpan) totalSpan.textContent = totalString;
        if (addToCartBtn) addToCartBtn.disabled = checkboxes.length === 0;
    } catch (error) {
        console.error(
            'Erro ao processar JSON de itens para recalcular total:',
            error
        );
        showToast('Não foi possível recalcular o total do pedido.', 'error');
    }
}

// handleOrderAgain (inalterado)
export async function handleOrderAgain(orderId) {
    sessionStorage.removeItem('nativaDeliverySelectedModality');
    state.selectedModality = null;

    const allOrders = [
        ...(state.user.currentOrder ? [state.user.currentOrder] : []),
        ...(state.user.orders || []),
    ];
    const order = allOrders.find((o) => o.id == orderId);

    if (!order) {
        showToast(
            'Não foi possível encontrar os detalhes deste pedido.',
            'error'
        );
        return;
    }

    const processReorder = () => {
        const allProducts = state.menu.products || [];
        renderReorderSheet(order, allProducts);

        const sheet = document.getElementById('nativa-reorder-sheet');
        if (sheet) {
            openSheet(sheet);
            _updateReorderSheetTotal(); // Chama para calcular o total inicial
        }
    };

    // Garante que dados de produtos e recompensas estejam carregados
    if (
        state.menu.products &&
        state.menu.products.length > 0 &&
        state.user.rewards
    ) {
        processReorder();
    } else {
        try {
            // fetchCoreData pode precisar ser atualizado para buscar recompensas se ainda não o faz
            await fetchCoreData(); // Garante menu
            // Busca recompensas explicitamente se necessário (ou integra no fetchCoreData)
            if (!state.user.rewards) {
                // CORREÇÃO: Removido 'api.' e usado import direto
                const rewardsData = await getAvailableRewards();
                state.user.rewards = rewardsData;
            }
            processReorder();
        } catch (error) {
            console.error(
                'Erro ao carregar dados para Pedir Novamente:',
                error
            );
            showToast(
                'Erro ao carregar dados do cardápio/recompensas para validar os itens.',
                'error'
            );
        }
    }
}

// handleReorderCheckboxChange (chama _updateReorderSheetTotal)
export function handleReorderCheckboxChange() {
    _updateReorderSheetTotal();
}

// handleReorderAddToCart (MODIFICADO - Processa ofertas e recompensas)
export async function handleReorderAddToCart(button) {
    if (button.disabled) return;

    const shouldProceed = await checkPWAInstallAndProceed();
    if (!shouldProceed) {
        return;
    }

    const reorderSheet = document.getElementById('nativa-reorder-sheet');
    const orderId = document.getElementById(
        'reorder-sheet-order-id'
    )?.textContent;
    const allOrders = [
        ...(state.user.currentOrder ? [state.user.currentOrder] : []),
        ...(state.user.orders || []),
    ];
    const order = allOrders.find((o) => o.id == orderId);
    if (!order) return;

    try {
        const itemsFromHistory = JSON.parse(order.items_json || '{}');
        // CORREÇÃO: Removida variável 'itemsToProcess' não utilizada

        const itemsToAdd = [];
        let totalPointsToDeduct = 0;
        let insufficientPoints = false;
        const currentUserPoints = state.user.rewards?.user_points || 0;

        reorderSheet
            .querySelectorAll('.reorder-item-checkbox-input:checked')
            .forEach((cb) => {
                if (insufficientPoints) return; // Para se já detectou erro de pontos

                const card = cb.closest('.reorder-item-card');
                const itemKey = card?.dataset.itemKey; // Acesso seguro
                // Encontra o item histórico correspondente
                const historicItem = Array.isArray(itemsFromHistory)
                    ? itemsFromHistory.find(
                          (item, index) => String(index) === itemKey
                      )
                    : itemsFromHistory[itemKey];

                if (!historicItem) {
                    console.warn(
                        `handleReorderAddToCart: Item histórico não encontrado para key ${itemKey}`
                    );
                    return; // Pula item inválido
                }

                // Cria uma cópia profunda para modificar
                const itemToAdd = JSON.parse(JSON.stringify(historicItem));

                const isReward = cb.dataset.isReward === 'true';
                const isOffer = cb.dataset.isOffer === 'true';
                const rewardCost = parseInt(cb.dataset.rewardCost || '0', 10);

                if (isReward) {
                    if (currentUserPoints >= totalPointsToDeduct + rewardCost) {
                        totalPointsToDeduct += rewardCost;
                        itemToAdd.is_reward = true; // Garante que a flag vá para o backend
                        itemToAdd.is_offer_item = false; // Garante que não seja ambos
                        // Preço já deve ser 0 (calculado pelo helper no backend), mas podemos forçar aqui
                        itemToAdd.total_item_price = 0; // Força preço zero para recompensa no payload
                        itemsToAdd.push(itemToAdd);
                    } else {
                        insufficientPoints = true;
                        // CORREÇÃO: escapeHTML importado e usado
                        showToast(
                            `Pontos insuficientes para resgatar ${escapeHTML(itemToAdd.product_name || itemToAdd.name)}. Você tem ${currentUserPoints} pts.`,
                            'error'
                        );
                    }
                } else if (isOffer) {
                    // Remove a flag de oferta, o backend calculará o preço atual
                    delete itemToAdd.is_offer_item;
                    delete itemToAdd.original_price; // Remove preço original antigo
                    itemToAdd.is_reward = false; // Garante que não é recompensa
                    itemsToAdd.push(itemToAdd);
                } else {
                    // Item normal, apenas adiciona
                    itemToAdd.is_reward = false;
                    itemToAdd.is_offer_item = false;
                    itemsToAdd.push(itemToAdd);
                }
            });

        // Se houve erro de pontos, interrompe
        if (insufficientPoints) {
            return;
        }

        // Se não há itens válidos para adicionar (ex: todos eram recompensas sem pontos)
        if (itemsToAdd.length === 0) {
            showToast(
                'Nenhum item selecionado ou válido para adicionar.',
                'info'
            );
            return;
        }

        // Continua com a lógica de salvar na sessionStorage e mostrar modalidade
        sessionStorage.setItem(
            'nativaPendingReorderItems',
            JSON.stringify(itemsToAdd)
        );
        // --- INÍCIO DA MODIFICAÇÃO ---
        // Armazena os pontos a serem deduzidos para uso posterior pela API
        if (totalPointsToDeduct > 0) {
            sessionStorage.setItem(
                'nativaPendingReorderPoints',
                totalPointsToDeduct.toString()
            );
        } else {
            sessionStorage.removeItem('nativaPendingReorderPoints'); // Limpa se não houver pontos
        }
        // --- FIM DA MODIFICAÇÃO ---
        closeSheet(reorderSheet);

        // Define a ação pós-modalidade para lidar com a adição (incluindo pontos)
        state.menu.afterModalityAction = 'add_reorder_items_after_selection';

        setTimeout(() => {
            handleModalitySheetDisplay();
        }, 250); // Atraso para transição da sheet
    } catch (error) {
        console.error('Erro ao processar JSON de itens para reordenar:', error);
        showToast('Não foi possível processar os itens deste pedido.', 'error');
    }
}

// handleCancelOrderClick (inalterado)
export async function handleCancelOrderClick(button) {
    const orderId = button.dataset.orderId;
    const allOrders = [
        ...(state.user.currentOrder ? [state.user.currentOrder] : []),
        ...(state.user.orders || []),
    ];
    const order = allOrders.find((o) => o.id == orderId);

    if (!order) {
        showToast(
            'Não foi possível encontrar os detalhes deste pedido.',
            'error'
        );
        return;
    }

    // Usa status_slug para verificar se é cancelável
    const canCancel = ['pendente', 'recebido', 'aguardando-pagamento'].includes(
        order.status_slug
    );

    if (!canCancel) {
        showToast('Este pedido não pode mais ser cancelado.', 'warning');
        return;
    }

    const confirmation = await showModal({
        title: 'Cancelar Pedido',
        iconName: 'cancel',
        message: `Tem certeza que deseja cancelar o pedido #${orderId}?`,
        confirmText: 'Sim, Cancelar', // Ação destrutiva
        cancelText: 'Não', // Ação segura
        isCritical: true, // Aplica o estilo de perigo ao botão de confirmação
    });

    if (confirmation) {
        showSpinner(button);
        try {
            await cancelMyOrder(orderId);
            showToast('Pedido cancelado.', 'info');
            if (initializeMyAccount) {
                // Atraso maior para dar tempo da API processar antes de recarregar
                setTimeout(() => initializeMyAccount(true), 1500);
            }
        } catch (error) {
            const errorMessage = error.message || '';
            if (
                errorMessage.includes('Erro HTTP: 400') ||
                errorMessage.includes('Erro HTTP: 403')
            ) {
                showToast(
                    'Sua sessão de segurança expirou. Por favor, atualize a página e tente novamente.',
                    'error'
                );
            } else {
                showToast(
                    errorMessage || 'Não foi possível cancelar o pedido.',
                    'error'
                );
            }
        } finally {
            hideSpinner(button);
        }
    }
}

// --- INÍCIO DA MODIFICAÇÃO ---
// Adiciona listener para 'nativa:modalityChanged' para lidar com a ação pendente
document.addEventListener('nativa:modalityChanged', async () => {
    if (
        state.menu.afterModalityAction === 'add_reorder_items_after_selection'
    ) {
        state.menu.afterModalityAction = null; // Limpa a ação

        const pendingItemsJSON = sessionStorage.getItem(
            'nativaPendingReorderItems'
        );
        const pendingPointsStr = sessionStorage.getItem(
            'nativaPendingReorderPoints'
        );
        const pointsToDeduct = pendingPointsStr
            ? parseInt(pendingPointsStr, 10)
            : 0;

        sessionStorage.removeItem('nativaPendingReorderItems');
        sessionStorage.removeItem('nativaPendingReorderPoints');

        if (pendingItemsJSON) {
            try {
                // Chama a API para adicionar os itens processados
                const resultData =
                    await addSelectedItemsToCart(pendingItemsJSON);

                // Dispara evento para atualizar o carrinho na UI
                document.dispatchEvent(
                    new CustomEvent('nativa:cartUpdated', {
                        detail: resultData,
                    })
                );

                // Mostra mensagem de sucesso
                const pendingItems = JSON.parse(pendingItemsJSON);
                const message =
                    pendingItems.length === 1
                        ? 'Item adicionado ao seu carrinho!'
                        : `${pendingItems.length} itens adicionados ao seu carrinho!`;
                showToast(message, 'success');

                // Atualiza pontos do usuário na UI se houve dedução
                if (pointsToDeduct > 0 && state.user.rewards) {
                    state.user.rewards.user_points -= pointsToDeduct;
                    // Força recarregamento dos dados da conta para refletir os pontos (ou atualiza a UI diretamente)
                    // Idealmente, o backend deveria retornar o novo saldo, mas vamos recarregar por segurança
                    console.log(
                        `[Reorder] Pontos deduzidos: ${pointsToDeduct}. Recarregando dados da conta.`
                    );
                    initializeMyAccount(true); // Força recarga para atualizar pontos
                }

                // Abre a ficha do carrinho
                setTimeout(() => {
                    const cartSheet = document.getElementById(
                        'nativa-cart-side-sheet'
                    );
                    if (cartSheet) openSheet(cartSheet);
                }, 500);
            } catch (error) {
                console.error(
                    "Erro ao adicionar itens de 'Pedir Novamente' via API:",
                    error
                );
                showToast(
                    error.message ||
                        'Não foi possível adicionar os itens ao carrinho.',
                    'error'
                );
                // Se falhou, precisa restaurar os pontos? O backend idealmente não deduziu.
                // Mas se deduziu e falhou ao adicionar, seria um problema.
                // A solução mais segura é recarregar os dados da conta para garantir consistência.
                initializeMyAccount(true);
            }
        }
    }
});
// --- FIM DA MODIFICAÇÃO ---
