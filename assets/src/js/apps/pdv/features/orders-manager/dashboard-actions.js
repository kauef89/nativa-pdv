// apps/pdv/features/orders-manager/dashboard-actions.js

import { showModal } from '@ui/modals/modal.js';
import { copyToClipboard, escapeHTML, showToast } from '@utils/ui-helpers.js';
import {
    printCourierReport,
    printKitchenReport,
} from '../../services/printer.js';
import * as api from './dashboard-api.js';
import { fetchData } from './dashboard-fetch.js';
import { state } from './dashboard-state.js';

// --- CSS DE FALLBACK PARA MODAIS ---
// Garante que os modais de impressão tenham estilo mesmo se o modal.js não tiver sido acionado ainda.
const _ensureModalStyles = () => {
    if (!document.getElementById('nativa-dashboard-print-modal-styles')) {
        const style = document.createElement('style');
        style.id = 'nativa-dashboard-print-modal-styles';
        style.innerHTML = `
            .nativa-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0, 0, 0, 0.6); z-index: 10000;
                display: flex; justify-content: center; align-items: center;
                padding: 16px; box-sizing: border-box;
                opacity: 0; transition: opacity 0.2s ease-in-out;
                pointer-events: none;
            }
            .nativa-modal-overlay.is-visible { opacity: 1; pointer-events: auto; }
            .nativa-modal-dialog {
                background-color: #fff;
                background-color: var(--md-sys-color-surface, #fff);
                color: #000;
                color: var(--md-sys-color-on-surface, #000);
                padding: 24px; border-radius: 28px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                width: 100%; max-width: 500px;
                max-height: 90vh; overflow-y: auto;
                text-align: center;
                transform: scale(0.95); opacity: 0;
                transition: transform 0.2s ease-in-out, opacity 0.2s ease-in-out;
                display: flex; flex-direction: column; gap: 16px;
            }
            .nativa-modal-overlay.is-visible .nativa-modal-dialog {
                transform: scale(1); opacity: 1;
            }
            /* Botões dentro do modal */
            .nativa-modal-actions button {
                cursor: pointer;
            }
        `;
        document.head.appendChild(style);
        console.log('[SONDA ACTIONS] Estilos de modal injetados manualmente.');
    }
};

// --- MODAL 1: Checklist de Cozinha ---
function _openKitchenPrintModal(order) {
    console.log(
        '[SONDA ACTIONS] _openKitchenPrintModal iniciado. Pedido:',
        order
    );
    _ensureModalStyles();

    if (!order || !order.details) {
        console.error(
            '[SONDA ACTIONS] Erro: Objeto pedido inválido ou sem detalhes.',
            order
        );
        showToast('Dados do pedido incompletos.', 'error');
        return;
    }

    let items = {};
    try {
        console.log(
            '[SONDA ACTIONS] Tentando parsear JSON de itens:',
            order.details.pedido_itens_json
        );
        items = JSON.parse(order.details.pedido_itens_json || '{}');
    } catch (e) {
        console.error('[SONDA ACTIONS] Erro ao parsear JSON:', e);
        showToast('Erro ao ler itens do pedido.', 'error');
        return;
    }

    const itemKeys = Object.keys(items);
    if (itemKeys.length === 0) {
        console.warn('[SONDA ACTIONS] Pedido sem itens (keys.length = 0).');
        showToast('Pedido sem itens.', 'error');
        return;
    }

    // Criação manual do DOM para controle total
    const overlay = document.createElement('div');
    overlay.className = 'nativa-modal-overlay'; // Inicialmente invisível (sem is-visible)
    overlay.style.zIndex = '10001';

    const dialog = document.createElement('div');
    dialog.className = 'nativa-modal-dialog';
    dialog.style.maxWidth = '500px';
    dialog.style.textAlign = 'left';

    // Checkbox "Selecionar Todos"
    let headerChecklistHtml = `
        <div style="padding: 10px 10px 5px 10px; display: flex; align-items: center; gap: 10px; border-bottom: 2px solid var(--md-sys-color-outline-variant);">
            <input type="checkbox" id="kp-toggle-all" checked style="width: 20px; height: 20px; accent-color: var(--md-sys-color-primary); cursor: pointer;">
            <label for="kp-toggle-all" style="font-weight: bold; cursor: pointer; color: var(--md-sys-color-on-surface);">Selecionar/Desmarcar Todos</label>
        </div>
    `;

    // Lista de Itens
    let checklistHtml =
        '<div class="kitchen-print-checklist" style="max-height: 400px; overflow-y: auto; margin: 0 0 10px 0; border: 1px solid var(--md-sys-color-outline-variant); border-top: none; border-radius: 0 0 8px 8px; padding: 10px;">';

    itemKeys.forEach((key) => {
        const item = items[key];
        const name = item.product_name || item.name;
        const qty = parseInt(item.quantity, 10) || 1;
        const displayQty = qty > 1 ? `<strong>${qty}x</strong> ` : '';

        let detailsHtml = '';

        if (item.is_combo && Array.isArray(item.selections)) {
            item.selections.forEach((sel) => {
                detailsHtml += `<div style="font-size: 0.85em; color: var(--md-sys-color-on-surface-variant); margin-left: 10px;">• ${escapeHTML(sel.productName)}</div>`;
                if (sel.selectedAddons) {
                    Object.values(sel.selectedAddons).forEach((group) => {
                        Object.values(group.items || {}).forEach((addon) => {
                            const aQty = parseInt(addon.itemQuantity, 10);
                            const aPrefix =
                                aQty > 1 ? `<strong>${aQty}x</strong> ` : '';
                            detailsHtml += `<div style="font-size: 0.85em; color: var(--md-sys-color-outline); margin-left: 20px;">+ ${aPrefix}${escapeHTML(addon.itemName)}</div>`;
                        });
                    });
                }
            });
        } else if (item.selected_addons) {
            Object.values(item.selected_addons).forEach((group) => {
                Object.values(group.items || {}).forEach((addon) => {
                    const aQty = parseInt(addon.itemQuantity, 10);
                    const aPrefix =
                        aQty > 1 ? `<strong>${aQty}x</strong> ` : '';
                    detailsHtml += `<div style="font-size: 0.85em; color: var(--md-sys-color-on-surface-variant); margin-left: 10px;">+ ${aPrefix}${escapeHTML(addon.itemName)}</div>`;
                });
            });
        }

        if (item.observacoes) {
            detailsHtml += `<div style="font-size: 0.85em; color: var(--md-sys-color-on-surface-variant); margin-left: 10px; font-style: italic;">Obs: ${escapeHTML(item.observacoes)}</div>`;
        }

        checklistHtml += `
            <label style="display: flex; align-items: flex-start; gap: 10px; padding: 12px 0; border-bottom: 1px dashed var(--md-sys-color-outline-variant); cursor: pointer;">
                <input type="checkbox" class="kp-item-checkbox" value="${key}" checked style="width: 20px; height: 20px; accent-color: var(--md-sys-color-primary); margin-top: 4px; flex-shrink: 0;">
                <div style="display: flex; flex-direction: column; width: 100%;">
                    <span style="font-size: 1rem; color: var(--md-sys-color-on-surface); line-height: 1.4;">${displayQty}${escapeHTML(name)}</span>
                    ${detailsHtml}
                </div>
            </label>
        `;
    });
    checklistHtml += '</div>';

    dialog.innerHTML = `
        <h2 class="nativa-modal-title" style="text-align: center;">Imprimir Cozinha</h2>
        <p class="nativa-modal-message" style="text-align: center; margin-bottom: 5px;">Selecione os itens para impressão:</p>
        ${headerChecklistHtml}
        ${checklistHtml}
        <div class="nativa-modal-actions" style="display: flex; justify-content: space-between; gap: 10px; margin-top: 15px;">
            <button id="kp-cancel" class="nativa-button-secondary" style="flex: 1;">Cancelar</button>
            <button id="kp-selected" class="nativa-button-primary" style="flex: 2;">Imprimir Selecionados</button>
            <button id="kp-all" class="nativa-button-secondary" style="flex: 1;" title="Imprimir todos independente da seleção">Tudo</button>
        </div>
    `;

    console.log('[SONDA ACTIONS] Appending kitchen modal to document.body');
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    // Força reflow e animação
    requestAnimationFrame(() => {
        overlay.classList.add('is-visible');
    });

    // --- Lógica de Seleção ---
    const toggleAllCheckbox = dialog.querySelector('#kp-toggle-all');
    const itemCheckboxes = dialog.querySelectorAll('.kp-item-checkbox');

    toggleAllCheckbox.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        itemCheckboxes.forEach((cb) => {
            cb.checked = isChecked;
        });
    });

    itemCheckboxes.forEach((cb) => {
        cb.addEventListener('change', () => {
            const allChecked = Array.from(itemCheckboxes).every(
                (c) => c.checked
            );
            const someChecked = Array.from(itemCheckboxes).some(
                (c) => c.checked
            );
            toggleAllCheckbox.checked = allChecked;
            toggleAllCheckbox.indeterminate = someChecked && !allChecked;
        });
    });

    const close = () => {
        overlay.classList.remove('is-visible');
        setTimeout(() => overlay.remove(), 250);
    };

    dialog.querySelector('#kp-cancel').addEventListener('click', close);

    dialog.querySelector('#kp-all').addEventListener('click', () => {
        printKitchenReport(order, null); // null = imprimir todos
        close();
    });

    dialog.querySelector('#kp-selected').addEventListener('click', () => {
        const selectedCheckboxes = dialog.querySelectorAll(
            '.kp-item-checkbox:checked'
        );
        const selectedKeys = Array.from(selectedCheckboxes).map(
            (cb) => cb.value
        );

        if (selectedKeys.length === 0) {
            showToast('Nenhum item selecionado.', 'warning');
            return;
        }

        printKitchenReport(order, selectedKeys);
        close();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
}

// --- MODAL 2: Confirmação de Motoboy (Manual) ---
function _openCourierPrintModal(order) {
    console.log(
        '[SONDA ACTIONS] _openCourierPrintModal iniciado. Pedido:',
        order
    );
    _ensureModalStyles();

    const overlay = document.createElement('div');
    overlay.className = 'nativa-modal-overlay'; // Inicialmente invisível
    overlay.style.zIndex = '10001';

    const dialog = document.createElement('div');
    dialog.className = 'nativa-modal-dialog';

    dialog.innerHTML = `
        <span class="material-symbols-rounded nativa-modal-icon icon-big" style="font-size: 48px; color: var(--md-sys-color-outline); margin-bottom: 8px;">receipt_long</span>
        <h2 class="nativa-modal-title" style="margin: 0 0 8px 0; font-size: 1.5rem;">Imprimir Relatório Geral</h2>
        <div class="nativa-modal-message" style="margin-bottom: 16px;">Deseja imprimir o cupom geral (Motoboy/Cliente) para o pedido #${order.id}?</div>
        <div class="nativa-modal-actions" style="display: flex; gap: 8px; justify-content: center;">
            <button id="cp-cancel" class="nativa-button-secondary">Cancelar</button>
            <button id="cp-confirm" class="nativa-button-primary">Imprimir</button>
        </div>
    `;

    console.log('[SONDA ACTIONS] Appending courier modal to document.body');
    overlay.appendChild(dialog);
    document.body.appendChild(overlay);

    requestAnimationFrame(() => {
        overlay.classList.add('is-visible');
    });

    const close = () => {
        overlay.classList.remove('is-visible');
        setTimeout(() => overlay.remove(), 250);
    };

    dialog.querySelector('#cp-cancel').addEventListener('click', close);

    dialog.querySelector('#cp-confirm').addEventListener('click', () => {
        printCourierReport(order);
        close();
    });

    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
    });
}

/**
 * Lida com cliques em botões de ação dentro do tooltip do pedido.
 */
export async function handleTooltipAction(actionButton, selectors, ui) {
    const action = actionButton.dataset.action;
    const orderId = actionButton.dataset.orderId;
    const order = state.allOrders.find((o) => o.id == orderId);
    const currentFilter =
        selectors.dateFilterGroup?.querySelector('.is-active')?.dataset
            .filter || 'today';

    const originalHtml = actionButton.innerHTML;

    console.log(
        '[SONDA ACTIONS] handleTooltipAction chamado. Ação:',
        action,
        'OrderId:',
        orderId
    );

    switch (action) {
        case 'print-courier': {
            if (!order) {
                console.error(
                    '[SONDA ACTIONS] Erro: Pedido não encontrado no state.allOrders para ID:',
                    orderId
                );
                showToast('Erro: Pedido não encontrado.', 'error');
                return;
            }
            console.log('[SONDA ACTIONS] Chamando _openCourierPrintModal...');
            _openCourierPrintModal(order);
            break;
        }

        case 'print-kitchen': {
            if (!order) {
                console.error(
                    '[SONDA ACTIONS] Erro: Pedido não encontrado no state.allOrders para ID:',
                    orderId
                );
                showToast('Erro: Pedido não encontrado.', 'error');
                return;
            }
            console.log('[SONDA ACTIONS] Chamando _openKitchenPrintModal...');
            _openKitchenPrintModal(order);
            break;
        }

        case 'status-change': {
            const nextStatus = actionButton.dataset.nextStatus;
            const statusObj = state.allStatuses.find(
                (s) => s.slug === nextStatus
            );
            const statusLabel = statusObj?.name || nextStatus;

            const statusConfirmed = await showModal({
                title: 'Confirmar Alteração',
                iconName: 'published_with_changes',
                message: `Mudar status do pedido #${orderId} para "${statusLabel}"?`,
                confirmText: 'Confirmar',
                cancelText: 'Cancelar',
            });
            if (statusConfirmed) {
                actionButton.disabled = true;
                actionButton.classList.add('is-loading');
                try {
                    await api.updateOrderStatus(orderId, nextStatus);
                    await fetchData(true, currentFilter, false, selectors);
                    if (state.activeTooltip && state.activeTooltip.row) {
                        ui.toggleTooltip(state.activeTooltip.row);
                    }
                } catch (err) {
                    showToast(`Erro: ${err.message}`, 'error');
                    actionButton.disabled = false;
                    actionButton.classList.remove('is-loading');
                    actionButton.innerHTML = originalHtml;
                }
            }
            break;
        }

        case 'recognize-payment': {
            const paymentConfirmed = await showModal({
                title: 'Confirmar Pagamento',
                iconName: 'price_check',
                message: `Confirmar recebimento PIX p/ pedido #${orderId}? (Irreversível)`,
                confirmText: 'Confirmar',
                cancelText: 'Cancelar',
                isCritical: false,
            });
            if (paymentConfirmed) {
                actionButton.disabled = true;
                actionButton.classList.add('is-loading');
                try {
                    await api.recognizePayment(orderId);
                    await fetchData(true, currentFilter, false, selectors);
                    if (state.activeTooltip && state.activeTooltip.row) {
                        ui.toggleTooltip(state.activeTooltip.row);
                    }
                } catch (err) {
                    showToast(`Erro: ${err.message}`, 'error');
                    actionButton.disabled = false;
                    actionButton.classList.remove('is-loading');
                    actionButton.innerHTML = originalHtml;
                }
            }
            break;
        }

        case 'refund-status': {
            if (!order) {
                showToast('Pedido não encontrado.', 'error');
                break;
            }
            const currentRefundState = order.payment_refunded;
            const actionText = currentRefundState
                ? 'DESFAZER ESTORNO'
                : 'MARCAR COMO ESTORNADO';
            const refundConfirmed = await showModal({
                title: `Confirmar ${
                    currentRefundState ? 'Desfazer Estorno' : 'Estorno'
                }`,
                iconName: currentRefundState ? 'undo' : 'credit_card_off',
                message: `Deseja ${actionText} o pagamento do pedido #${orderId}?`,
                confirmText: 'Confirmar',
                cancelText: 'Cancelar',
                isCritical: !currentRefundState,
            });
            if (refundConfirmed) {
                actionButton.disabled = true;
                actionButton.classList.add('is-loading');
                try {
                    await api.updatePaymentRefundStatus(
                        orderId,
                        !currentRefundState
                    );
                    await fetchData(true, currentFilter, false, selectors);
                    if (state.activeTooltip && state.activeTooltip.row) {
                        ui.toggleTooltip(state.activeTooltip.row);
                    }
                } catch (err) {
                    showToast(`Erro: ${err.message}`, 'error');
                    actionButton.disabled = false;
                    actionButton.classList.remove('is-loading');
                    actionButton.innerHTML = originalHtml;
                }
            }
            break;
        }

        case 'notify-customer': {
            const notifyUrl = actionButton.dataset.url;
            if (!notifyUrl) {
                showToast('Link de notificação indisponível.', 'warning');
                break;
            }
            const status = actionButton.dataset.status;
            const statusName =
                state.allStatuses.find((s) => s.slug === status)?.name ||
                status;
            const notifyConfirmed = await showModal({
                title: 'Notificar Cliente',
                iconName: 'send',
                message: `Notificar cliente sobre status "${statusName}" do pedido #${orderId}?`,
                confirmText: 'Notificar',
                cancelText: 'Cancelar',
            });
            if (notifyConfirmed) {
                window.open(notifyUrl, '_blank');
                sessionStorage.setItem(`notified_${orderId}_${status}`, 'true');
                actionButton.classList.add('active');
                actionButton.innerHTML = `<span class="material-symbols-rounded">check</span>Notificado`;
            }
            break;
        }

        case 'notify-delivery': {
            const textToCopy = decodeURI(actionButton.dataset.copyText || '');
            if (textToCopy) {
                copyToClipboard(textToCopy);
            } else {
                showToast(
                    'Dados de entrega não encontrados para cópia.',
                    'error'
                );
            }
            break;
        }
    }
}

export async function handleTableSelectChange(selectElement, selectors) {
    const orderId = selectElement.dataset.orderId;
    const originalValue = selectElement.dataset.originalValue;
    const newValue = selectElement.value;
    const currentFilter =
        selectors.dateFilterGroup?.querySelector('.is-active')?.dataset
            .filter || 'today';

    if (selectElement.matches('.entregador-select')) {
        selectElement.disabled = true;
        try {
            await api.assignEntregador(orderId, newValue);
            showToast('Entregador designado!', 'success');
            await fetchData(true, currentFilter, false, selectors);
        } catch (err) {
            showToast(`Erro: ${err.message}`, 'error');
            selectElement.value = originalValue;
            selectElement.disabled = false;
        }
    } else if (selectElement.matches('.status-select')) {
        selectElement.value = originalValue;
    }
}

export function handleCopyAction(copyElement) {
    const textToCopy = decodeURI(copyElement.dataset.copyText || '');
    const isErrorMessage = textToCopy.toLowerCase().includes('erro');
    copyToClipboard(textToCopy);
    if (!isErrorMessage) {
        showToast('Copiado!', 'success');
    } else {
        showToast(textToCopy, 'error');
    }
}
