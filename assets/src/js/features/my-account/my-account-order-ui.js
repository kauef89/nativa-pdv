// js/features/my-account/my-account-order-ui.js

/**
 * Módulo de UI para renderizar todos os componentes relacionados a pedidos
 * na página "Minha Conta".
 * Refatorado para a arquitetura de módulos ES6.
 *
 * ATUALIZAÇÃO (CORREÇÃO CANCELAR): Adiciona 'aguardando-pagamento' à lista de status
 * que permitem o cancelamento na renderização do cartão do pedido atual.
 */

import {
    formatPrice,
    formatNumberWithThousandSeparator,
} from '../../utils/nativa-utils.js';
import * as OrderDetailsUI from './my-account-order-details-ui.js';
import * as PaymentUI from './my-account-payment-ui.js';
import { escapeHTML } from '../../utils/nativa-ui-helpers.js';
import { state } from '../../core/main-state.js';

const selectors = {
    currentOrderContainer: document.getElementById(
        'nativa-current-order-card-wrapper'
    ),
    orderHistoryContainer: document.getElementById(
        'my-account-order-history-container'
    ),
    pendingPaymentContainer: document.getElementById(
        'nativa-pending-payment-container'
    ),
};

// _renderAddons (inalterada)
const _renderAddons = (addons) => {
    let addonsHtml = '<ul class="order-details-sublist">';
    for (const groupId in addons) {
        if (addons?.[groupId]?.items) {
            for (const addonKey in addons[groupId].items) {
                const addon = addons[groupId].items[addonKey];
                const qty =
                    addon.itemQuantity > 1 ? `${addon.itemQuantity}x ` : '';
                const price =
                    (addon.final_cost ?? addon.itemPrice) > 0
                        ? ` (+${formatPrice(addon.final_cost ?? addon.itemPrice)})`
                        : '';
                addonsHtml += `<li>↳ ${escapeHTML(qty)}${escapeHTML(addon.itemName)}${price}</li>`;
            }
        }
    }
    return addonsHtml + '</ul>';
};

// _createPaymentConfirmationHtml (inalterada)
const _createPaymentConfirmationHtml = (order) => {
    if (!order.payment_received) {
        return '';
    }

    const recebidoLog = (order.status_log || []).find(
        (log) => log.status === 'recebido' && log.payment_info
    );

    if (
        !recebidoLog ||
        !recebidoLog.payment_info ||
        !recebidoLog.payment_info.amount
    ) {
        return `
            <div class="order-details-block is-payment-confirmed">
                <span class="material-symbols-rounded paid-order">verified</span>
                <div class="paid-order-info">
                    <strong>Pagamento Confirmado</strong>
                    <span>${order.total}</span>
                </div>
            </div>`;
    }

    const paymentTimestamp = new Date(recebidoLog.timestamp * 1000);
    const paymentTime = paymentTimestamp.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
    });
    const paymentDate = paymentTimestamp.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });

    return `
        <div class="order-details-block is-payment-confirmed">
            <span class="material-symbols-rounded">verified</span>
            <div class="order-details-info">
                <strong>Pagamento Confirmado</strong>
                <span>${formatPrice(recebidoLog.payment_info.amount)} às ${paymentTime}</span>
                <span>${paymentDate}</span>
            </div>
        </div>`;
};

// _createTimelineHtml (inalterada)
const _createTimelineHtml = (order) => {
    const statusLabels = {
        recebido: 'Recebido',
        aceito: 'Preparando',
        pronto: 'Pronto',
        enviado: 'Enviado',
        finalizado: 'Finalizado',
        cancelado: 'Cancelado',
    };
    const statusTimeMap = (order.status_log || []).reduce((acc, log) => {
        if (log && log.status) {
            acc[log.status] = log.timestamp;
        }
        return acc;
    }, {});

    if (
        order.status_slug === 'recebido' &&
        !statusTimeMap.recebido &&
        order.timestamp
    ) {
        statusTimeMap.recebido = order.timestamp;
    }

    let baseSequence = order.available_statuses || [];
    const currentStatus = order.status_slug;

    let displaySequence = baseSequence.filter(
        (slug) =>
            slug !== 'pendente' &&
            slug !== 'aguardando-pagamento' &&
            slug !== 'cancelado'
    );

    if (currentStatus === 'cancelado') {
        const statusLog = (order.status_log || []).map((log) => log.status);
        let lastAchievedStatus = null;
        for (let i = statusLog.length - 1; i >= 0; i--) {
            if (statusLog[i] !== 'cancelado' && statusLog[i] !== 'pendente') {
                lastAchievedStatus = statusLog[i];
                break;
            }
        }

        if (lastAchievedStatus) {
            const lastStatusIndex = displaySequence.indexOf(lastAchievedStatus);
            if (lastStatusIndex > -1) {
                displaySequence = displaySequence.slice(0, lastStatusIndex + 1);
            }
        } else {
            displaySequence = [];
        }
        displaySequence.push('cancelado');
    }

    const activeIndex = displaySequence.indexOf(currentStatus);

    let timelineHtml = '<ul class="nativa-order-timeline">';
    displaySequence.forEach((statusSlug, index) => {
        let statusClass = 'is-pending';
        if (index < activeIndex) {
            statusClass = 'is-done';
        } else if (index === activeIndex) {
            statusClass =
                statusSlug === 'cancelado'
                    ? 'is-done is-cancelled'
                    : 'is-active';
        }

        if (statusSlug === 'cancelado') {
            statusClass = 'is-done is-cancelled';
        }

        const timestamp = statusTimeMap[statusSlug];
        const timeHtml = timestamp
            ? `<span class="timeline-status-time">às ${new Date(timestamp * 1000).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>`
            : '';

        timelineHtml += `
            <li class="timeline-step ${statusClass}" data-status="${statusSlug}">
                <div class="timeline-node"></div>
                <div class="timeline-label">
                    <span class="timeline-status-name">${statusLabels[statusSlug] || statusSlug}</span>
                    ${timeHtml}
                </div>
            </li>`;
    });
    return timelineHtml + '</ul>';
};

// _clearCurrentOrder (inalterada)
const _clearCurrentOrder = () => {
    if (selectors.currentOrderContainer) {
        selectors.currentOrderContainer.innerHTML = `
            <div class="nativa-no-current-order">
                <h4>Nenhum pedido ativo no momento</h4>
                <span class="material-symbols-rounded">no_meals</span>
                <p>Que tal escolher algo delicioso no nosso cardápio?</p>
                <a href="/cardapio" id="no-orders-primary-cta" class="nativa-button-primary" data-route="/cardapio">
                <span class="material-symbols-rounded">restaurant_menu</span>
                <span class="cta-text">Ver cardápio</span>
            </a>
            </div>`;
    }
    if (selectors.pendingPaymentContainer) {
        selectors.pendingPaymentContainer.innerHTML = '';
        selectors.pendingPaymentContainer.style.display = 'none';
    }
    if (PaymentUI && typeof PaymentUI.stopPolling === 'function') {
        PaymentUI.stopPolling();
    }
};

// handleToggleDetails (inalterada)
export function handleToggleDetails(event) {
    const button = event.target.closest('.toggle-details-btn');
    if (!button) return;

    const orderId = button.dataset.orderId;
    const detailsContainer = document.getElementById(
        `details-content-${orderId}`
    );
    if (!detailsContainer) return;

    const isVisible = detailsContainer.classList.toggle('is-visible');
    button.innerHTML = isVisible
        ? `Menos detalhes <span class="material-symbols-rounded">expand_less</span>`
        : `Mais detalhes <span class="material-symbols-rounded">expand_more</span>`;
}

// renderCurrentOrder (MODIFICADA)
export function renderCurrentOrder(order) {
    const container = selectors.currentOrderContainer;
    if (!container) return;

    if (!order) {
        _clearCurrentOrder();
        return;
    }

    const whatsAppLink = `https://wa.me/${window.nativaDeliveryData?.whatsappNumber}?text=${encodeURIComponent(`Olá! Gostaria de saber sobre o meu pedido #${order.id}.`)}`;
    const timelineHtml = _createTimelineHtml(order);
    const paymentConfirmationHtml = _createPaymentConfirmationHtml(order);

    // --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO CANCELAR) ---
    // Adiciona 'aguardando-pagamento' à lista de status que permitem cancelamento
    const isCancellable = [
        'pendente',
        'recebido',
        'aguardando-pagamento',
    ].includes(order.status_slug);
    // --- FIM DA MODIFICAÇÃO ---

    const disabledAttribute = !isCancellable ? 'disabled' : '';
    const cancelButtonHtml = `
        <button class="nativa-button-secondary cancel-order-btn" data-order-id="${order.id}" ${disabledAttribute} style="flex: 1;">
            Cancelar
        </button>
    `;

    let mainContentHtml = '';

    if (order.status_slug === 'pendente' && !order.payment_received) {
        mainContentHtml = `<div class="nativa-order-pending-state">
               <div class="pending-spinner-wrapper"><span class="nativa-spinner"></span></div>
               <p>Aguarde seu pedido ser recebido pela loja.</p>
           </div>`;
    } else if (order.status_slug === 'aguardando-pagamento') {
        mainContentHtml = '';
    } else {
        mainContentHtml = timelineHtml;
    }

    container.innerHTML = `
        <div class="nativa-current-order-card">
            <div class="current-order-main-grid">
                <div class="current-order-left-col">
                    ${mainContentHtml}
                </div>
                <div class="current-order-right-col">
                    <div class="order-details-block">
                         <div class="order-details-info">
                            <strong>Pedido #${order.id}</strong>
                            <span>${order.date}</span>
                         </div>
                    </div>
                    ${paymentConfirmationHtml}
                </div>
            </div>
            <div class="order-details-content" id="details-content-${order.id}">
                ${OrderDetailsUI.createOrderDetailsHtml(order)}
            </div>
            <div class="order-card-actions">
                <button class="nativa-button-secondary toggle-details-btn" data-order-id="${order.id}">
                    Mais detalhes <span class="material-symbols-rounded">expand_more</span>
                </button>
                <div class="order-card-actions-row" style="display: flex; gap: 8px; width: 100%;">
                    ${cancelButtonHtml}
                    <a href="${whatsAppLink}" target="_blank" rel="noopener noreferrer" class="nativa-button-secondary track-order-btn" style="flex: 1;">
                        Atendimento
                    </a>
                </div>
            </div>
        </div>`;
}

// clearCurrentOrder (inalterada)
export function clearCurrentOrder() {
    _clearCurrentOrder();
}

// renderOrderHistoryBatch (inalterada)
function renderOrderHistoryBatch(ordersBatch) {
    if (!selectors.orderHistoryContainer) return;
    const list = selectors.orderHistoryContainer.querySelector(
        '.order-history-list'
    );
    if (!list) return;

    ordersBatch.forEach((order) => {
        const listItem = document.createElement('li');
        listItem.className = 'order-history-item';

        const pointsHtml =
            order.status_slug !== 'cancelado' &&
            order.details.pedido_pontos_ganhos > 0
                ? `
            <div class="order-item-points">
                <span class="material-symbols-rounded">diamond</span>
                +${formatNumberWithThousandSeparator(order.details.pedido_pontos_ganhos)}
            </div>`
                : '';

        const statusSlug = order.status_slug || '';
        const statusClass = ['finalizado', 'cancelado'].includes(statusSlug)
            ? statusSlug
            : '';

        listItem.innerHTML = `
            <div class="order-item-header">
                <span class="order-item-id">Pedido #${order.id}</span>
                <span class="order-item-date">${order.date}</span>
            </div>
            <div class="order-item-body">
                <span class="order-item-status ${statusClass}">${escapeHTML(order.status)}</span>
                ${pointsHtml}
                <span class="order-item-total">${order.total}</span>
            </div>
            <div class="order-details-content" id="details-content-${order.id}">
                ${OrderDetailsUI.createOrderDetailsHtml(order)}
            </div>
            <div class="order-item-actions">
                <button class="nativa-button-secondary toggle-details-btn" data-order-id="${order.id}">
                    Mais detalhes <span class="material-symbols-rounded">expand_more</span>
                </button>
                <button class="nativa-button-secondary order-again-btn" data-order-id="${order.id}">
                    <span class="material-symbols-rounded">replay</span>Pedir novamente
                </button>
            </div>`;
        list.appendChild(listItem);
    });
}

// appendToOrderHistory (inalterada)
export function appendToOrderHistory(ordersBatch) {
    renderOrderHistoryBatch(ordersBatch);
}

// renderOrderHistory (inalterada)
export function renderOrderHistory(initialBatch) {
    if (!selectors.orderHistoryContainer) return;

    selectors.orderHistoryContainer.innerHTML = '<h4>Histórico de Pedidos</h4>';
    if (!initialBatch || initialBatch.length === 0) {
        selectors.orderHistoryContainer.innerHTML +=
            '<p>Você ainda não fez nenhum pedido.</p>';
        return;
    }

    const list = document.createElement('ul');
    list.className = 'order-history-list';
    selectors.orderHistoryContainer.appendChild(list);

    renderOrderHistoryBatch(initialBatch);

    const totalOrders = state.user.orders.length;
    const initialCount = initialBatch.length;

    if (totalOrders > initialCount) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'order-history-actions';
        actionsDiv.innerHTML = `<button id="show-full-history-btn" class="nativa-button-primary"><span class="material-symbols-rounded">history</span>Ver histórico completo</button>`;
        selectors.orderHistoryContainer.appendChild(actionsDiv);
    }
}

// isHistoricItemAvailable (inalterada)
function isHistoricItemAvailable(historicItem, allProducts) {
    const productId = historicItem.is_combo
        ? historicItem.combo_id
        : historicItem.product_id;
    const productData = allProducts.find((p) => p.id == productId);

    if (
        !productData ||
        productData.availability === 'indisponivel' ||
        productData.availability === 'oculto'
    ) {
        return false;
    }

    let addonsGroupsToProcess = [];
    if (historicItem.is_combo && historicItem.selections) {
        addonsGroupsToProcess = historicItem.selections.map(
            (sel) => sel.selectedAddons
        );
    } else if (historicItem.selected_addons) {
        addonsGroupsToProcess = [historicItem.selected_addons];
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
                            return false;
                        }
                    }
                }
            }
        }
    }

    return true;
}

// renderReorderSheet (inalterada)
export function renderReorderSheet(order, allProducts) {
    const sheet = document.getElementById('nativa-reorder-sheet');
    if (!sheet) return;

    document.getElementById('reorder-sheet-order-id').textContent = order.id;
    const itemsList = document.getElementById('nativa-reorder-items-list');
    itemsList.innerHTML = '';

    const currentRewardsData = state.user.rewards || {
        user_points: 0,
        rewards: [],
    };
    const currentUserPoints = currentRewardsData.user_points;
    const availableRewardDefs = currentRewardsData.rewards;

    try {
        const itemsFromHistory = JSON.parse(order.items_json || '{}');
        const itemsToProcess = Array.isArray(itemsFromHistory)
            ? itemsFromHistory
            : Object.values(itemsFromHistory);

        if (itemsToProcess.length === 0) {
            itemsList.innerHTML =
                '<p>Nenhum item encontrado para este pedido.</p>';
            return;
        }

        const contentHtml = itemsToProcess
            .map((historicItem, index) => {
                if (typeof historicItem !== 'object' || historicItem === null)
                    return '';

                const key = Array.isArray(itemsFromHistory)
                    ? index
                    : Object.keys(itemsFromHistory)[index];
                const checkboxId = `reorder-item-${key}`;

                const isAvailable = isHistoricItemAvailable(
                    historicItem,
                    allProducts
                );

                let isSelectable = isAvailable;
                let unavailableNote = '';
                let rewardNote = '';
                let rewardCost = 0;
                let itemIsReward = historicItem.is_reward ?? false;
                let itemIsOffer = historicItem.is_offer_item ?? false;

                if (itemIsReward) {
                    if (!isAvailable) {
                        unavailableNote =
                            '<div class="reorder-item-unavailable-note">Recompensa indisponível no momento</div>';
                        isSelectable = false;
                    } else {
                        const rewardDef = availableRewardDefs.find(
                            (r) => r.product_id == historicItem.product_id
                        );
                        if (rewardDef) {
                            rewardCost = rewardDef.points_cost;
                            if (currentUserPoints >= rewardCost) {
                                rewardNote = `<div class="reorder-item-reward-note">Custo: ${formatNumberWithThousandSeparator(rewardCost)} pts</div>`;
                            } else {
                                unavailableNote = `<div class="reorder-item-unavailable-note">Pontos insuficientes (${formatNumberWithThousandSeparator(currentUserPoints)}/${formatNumberWithThousandSeparator(rewardCost)})</div>`;
                                isSelectable = false;
                            }
                        } else {
                            unavailableNote =
                                '<div class="reorder-item-unavailable-note">Recompensa não mais disponível</div>';
                            isSelectable = false;
                        }
                    }
                } else if (itemIsOffer) {
                    if (isAvailable) {
                        unavailableNote =
                            '<div class="reorder-item-offer-note">Item de oferta (será adicionado pelo preço atual)</div>';
                    } else {
                        unavailableNote =
                            '<div class="reorder-item-unavailable-note">Item de oferta indisponível no momento</div>';
                        isSelectable = false;
                    }
                    isSelectable = false;
                } else if (!isAvailable) {
                    unavailableNote =
                        '<div class="reorder-item-unavailable-note">Item ou adicionais indisponíveis</div>';
                    isSelectable = false;
                }

                const checkedAttribute = isSelectable ? 'checked' : '';
                const disabledAttribute = !isSelectable ? 'disabled' : '';

                const detailsHtml =
                    OrderDetailsUI.getReorderItemDetailsHtml(historicItem);

                const toggleHtml = `
                <div class="nativa-toggle-switch is-small">
                    <div class="nativa-toggle-control">
                        <input type="checkbox"
                               class="reorder-item-checkbox-input"
                               id="${checkboxId}"
                               ${checkedAttribute}
                               ${disabledAttribute}
                               ${itemIsReward && rewardCost > 0 ? `data-reward-cost="${rewardCost}"` : ''}
                               ${itemIsOffer ? `data-is-offer="true"` : ''}
                               ${itemIsReward ? `data-is-reward="true"` : ''}
                               data-product-id="${historicItem.product_id || historicItem.combo_id}">
                        <label for="${checkboxId}" class="nativa-toggle-ui"></label>
                    </div>
                </div>`;

                let displayPrice = 0;
                if (!itemIsReward) {
                    const currentProductData = allProducts.find(
                        (p) =>
                            p.id ==
                            (historicItem.product_id || historicItem.combo_id)
                    );
                    if (currentProductData) {
                        displayPrice = historicItem.total_item_price || 0;
                    }
                }

                return `
                <div class="reorder-item-card ${!isSelectable ? 'is-unavailable' : ''} ${itemIsReward ? 'is-reward-history' : ''} ${itemIsOffer ? 'is-offer-history' : ''}" data-item-key="${key}">
                    <div class="reorder-item-checkbox">${toggleHtml}</div>
                    <div class="reorder-item-info">
                        <div class="reorder-item-name">${escapeHTML(historicItem.quantity || 1)}x ${escapeHTML(historicItem.product_name || historicItem.name)}</div>
                        <div class="reorder-item-details">${detailsHtml}</div>
                        ${rewardNote}
                        ${unavailableNote}
                    </div>
                    <div class="reorder-item-price">${formatPrice(displayPrice)}</div>
                </div>`;
            })
            .join('');

        itemsList.innerHTML =
            contentHtml || '<p>Nenhum item válido encontrado.</p>';
    } catch (error) {
        console.error('Erro ao processar itens do pedido anterior:', error);
        itemsList.innerHTML =
            '<p class="error-message">Não foi possível carregar os itens deste pedido.</p>';
    }
}

// renderPendingPaymentInfo (inalterada)
export function renderPendingPaymentInfo(order) {
    if (PaymentUI) {
        PaymentUI.renderPendingPayment(
            order,
            selectors.pendingPaymentContainer
        );
    }
}
