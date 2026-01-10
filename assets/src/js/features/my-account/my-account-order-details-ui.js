/**
 * Módulo de UI dedicado a renderizar os detalhes de um pedido,
 * incluindo a lista de itens, adicionais, combos e resumo financeiro.
 * Refatorado para a arquitetura de módulos ES6.
 * REATORAÇÃO (Fase 3 Pagamentos): Remove o 'paymentMethodMap' estático.
 * A função 'createOrderDetailsHtml' agora constrói um mapa dinâmico
 * usando 'state.serverData.paymentMethods' e um fallback legado.
 */

import { formatPrice } from '../../utils/nativa-utils.js';
import { escapeHTML } from '../../utils/nativa-ui-helpers.js';
// --- INÍCIO DA MODIFICAÇÃO (Fase 3 Pagamentos) ---
import { state } from '../../core/main-state.js'; // Importa o estado global
// --- FIM DA MODIFICAÇÃO ---

function _renderAddons(addons) {
    let addonsHtml = '<ul class="order-details-sublist">';
    for (const groupId in addons) {
        if (addons?.[groupId]?.items) {
            for (const addonKey in addons[groupId].items) {
                const addon = addons[groupId].items[addonKey];
                const qty =
                    addon.itemQuantity > 1 ? `${addon.itemQuantity} × ` : '';
                const price =
                    (addon.final_cost ?? addon.itemPrice) > 0
                        ? ` (+${formatPrice(addon.final_cost ?? addon.itemPrice)})`
                        : '';
                addonsHtml += `<li>↳ ${escapeHTML(qty)}${escapeHTML(addon.itemName)}${price}</li>`;
            }
        }
    }
    return addonsHtml + '</ul>';
}

export function createOrderDetailsHtml(order) {
    let itemsHtml =
        '<tr><td colspan="2">Erro ao processar itens do pedido.</td></tr>';
    // --- INÍCIO DA MODIFICAÇÃO (ACESSO SEGURO) ---
    const details = order?.details || {};

    try {
        const items = JSON.parse(details.pedido_itens_json || '{}');
        if (Object.keys(items).length > 0) {
            itemsHtml = '';
            for (const key in items) {
                const item = items[key];
                if (!item) continue; // Pula itens nulos/inválidos

                let itemDetails = '';

                if (item.is_combo && Array.isArray(item.selections)) {
                    itemDetails +=
                        '<ul class="order-details-sublist is-combo-selection">';
                    item.selections.forEach((sel) => {
                        itemDetails += `<li><strong>${escapeHTML(sel.productName)}</strong></li>`;
                        if (
                            sel.selectedAddons &&
                            Object.keys(sel.selectedAddons).length > 0
                        ) {
                            itemDetails += _renderAddons(sel.selectedAddons);
                        }
                    });
                    itemDetails += '</ul>';
                } else if (
                    item.selected_addons &&
                    Object.keys(item.selected_addons).length > 0
                ) {
                    itemDetails = _renderAddons(item.selected_addons);
                }

                let itemName = `${item.quantity || 1} × ${escapeHTML(item.product_name || item.name)}`;
                if (item.is_offer_item) {
                    itemName +=
                        ' <span class="item-tag-in-details">(oferta)</span>';
                } else if (item.is_reward) {
                    itemName +=
                        ' <span class="item-tag-in-details">(fidelidade)</span>';
                }
                const itemPrice = formatPrice(item.total_item_price || 0);

                itemsHtml += `<tr class="order-item-row"><td class="order-item-name-cell">${itemName}</td><td class="order-item-price-cell">${itemPrice}</td></tr>`;

                if (itemDetails) {
                    itemsHtml += `<tr class="order-item-details-row"><td colspan="2">${itemDetails}</td></tr>`;
                }
            }
        } else {
            itemsHtml = '<tr><td colspan="2">Nenhum item encontrado.</td></tr>';
        }
    } catch (e) {
        console.error(
            `Erro ao processar JSON de itens para o pedido #${order?.id}:`,
            e
        );
    }

    // --- INÍCIO DA MODIFICAÇÃO (Fase 3 Pagamentos) ---
    // 1. Define o mapa legado como fallback
    const legacyPaymentMap = {
        dinheiro: 'Dinheiro',
        pix: 'PIX',
        credito: 'C. de Crédito',
        debito: 'C. de Débito',
        alelo: 'Alelo Ref.',
        'pix-sicredi': 'PIX', // Legado automático
        'pix-manual': 'PIX', // Legado manual
        'pix-fallback': 'PIX', // Legado fallback
        'pix-manual-fallback': 'PIX', // Legado fallback
    };

    // 2. Cria o mapa dinâmico a partir do state.serverData.paymentMethods
    const dynamicPaymentMap = {};
    if (state.serverData && Array.isArray(state.serverData.paymentMethods)) {
        state.serverData.paymentMethods.forEach((method) => {
            dynamicPaymentMap[method.slug] = method.title;
        });
    }

    // 3. Mescla os mapas, dando preferência aos dados dinâmicos (CPTs)
    const paymentMap = { ...legacyPaymentMap, ...dynamicPaymentMap };

    // 4. Usa o mapa mesclado
    const paymentMethodSlug = details.pedido_metodo_pagamento || 'N/A';
    const paymentMethod =
        paymentMap[paymentMethodSlug] ||
        details.pedido_metodo_pagamento ||
        'N/A';
    // --- FIM DA MODIFICAÇÃO ---

    const discountValue = parseFloat(details.pedido_desconto || 0);
    const discountHtml =
        discountValue > 0
            ? `<tr><td>Desconto</td><td><strong>- ${formatPrice(discountValue)}</strong></td></tr>`
            : '';

    return `
        <div class="order-details-separator"></div>
        <div class="order-details-items">
            <h4>Itens do Pedido</h4>
            <table class="order-details-item-table">
                <tbody>
                    ${itemsHtml}
                </tbody>
            </table>
        </div>
        <div class="order-details-summary">
            <h4>Resumo Financeiro</h4>
            <table>
                <tbody>
                    <tr><td>Subtotal</td><td><strong>${formatPrice(details.pedido_subtotal || 0)}</strong></td></tr>
                    <tr><td>Entrega</td><td><strong>${formatPrice(details.pedido_taxa_entrega || 0)}</strong></td></tr>
                    ${discountHtml}
                    <tr><td>Pagamento</td><td><strong>${escapeHTML(paymentMethod)}</strong></td></tr>
                    <tr class="total"><td>Valor total</td><td><strong>${order?.total || 'R$ 0,00'}</strong></td></tr>
                </tbody>
            </table>
        </div>`;
    // --- FIM DA MODIFICAÇÃO ---
}

export function getReorderItemDetailsHtml(historicItem) {
    let detailsHtml = '';
    if (historicItem.is_combo && Array.isArray(historicItem.selections)) {
        const selectionsDetails = historicItem.selections
            .map((selection) => {
                let addonsHtml = '';
                if (
                    selection.selectedAddons &&
                    typeof selection.selectedAddons === 'object'
                ) {
                    const addonsList = Object.values(
                        selection.selectedAddons
                    ).flatMap((group) =>
                        Object.values(group.items || {}).map((addon) => {
                            const qty =
                                addon.itemQuantity > 1
                                    ? `${addon.itemQuantity} × `
                                    : '';

                            // --- INÍCIO DA MODIFICAÇÃO (Adiciona a tag de preço) ---
                            const priceTag =
                                (addon.final_cost ?? addon.itemPrice) > 0
                                    ? ` <span class="reorder-item-addon-price">(+${formatPrice(addon.final_cost ?? addon.itemPrice)})</span>`
                                    : '';
                            return `<li>${escapeHTML(qty)}${escapeHTML(addon.itemName)}${priceTag}</li>`;
                            // --- FIM DA MODIFICAÇÃO ---
                        })
                    );
                    if (addonsList.length > 0) {
                        addonsHtml = `<ul class="reorder-item-addons-sublist">${addonsList.join('')}</ul>`;
                    }
                }
                return `<div class="reorder-item-combo-selection">↳ ${escapeHTML(selection.productName)}${addonsHtml}</div>`;
            })
            .join('');
        detailsHtml = selectionsDetails;
    } else if (
        historicItem.selected_addons &&
        typeof historicItem.selected_addons === 'object'
    ) {
        const addons = Object.values(historicItem.selected_addons).flatMap(
            (group) =>
                Object.values(group.items || {}).map((addon) => {
                    const qty =
                        addon.itemQuantity > 1
                            ? `${addon.itemQuantity} × `
                            : '';

                    // --- INÍCIO DA MODIFICAÇÃO (Adiciona a tag de preço) ---
                    const priceTag =
                        (addon.final_cost ?? addon.itemPrice) > 0
                            ? ` <span class="reorder-item-addon-price">(+${formatPrice(addon.final_cost ?? addon.itemPrice)})</span>`
                            : '';
                    return `<li>↳ ${escapeHTML(qty)}${escapeHTML(addon.itemName)}${priceTag}</li>`;
                    // --- FIM DA MODIFICAÇÃO ---
                })
        );
        if (addons.length > 0) {
            detailsHtml = `<ul class="reorder-item-addons-sublist">${addons.join('')}</ul>`;
        }
    }
    return detailsHtml;
}
