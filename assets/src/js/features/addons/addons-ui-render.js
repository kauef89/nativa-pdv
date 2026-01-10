/**
 * NOVO ARQUIVO (Refatorado de addons-logic.js)
 * Módulo para renderizar o HTML dos grupos de adicionais e seus itens.
 */

import { formatPrice } from '../../utils/nativa-utils.js';
import { escapeHTML } from '../../utils/nativa-ui-helpers.js';

/**
 * Cria o HTML para um único grupo de adicionais e seus itens.
 * @param {string} groupId - O ID do grupo.
 * @param {object} group - Os dados do grupo (vindo de window.nativaDeliveryData).
 * @param {object} context - O contexto contendo o estado (para marcar checked) e se está no combo.
 * @returns {HTMLElement|null} O elemento fieldset do grupo ou null se o grupo estiver oculto.
 */
export function createGroupElement(groupId, group, context) {
    // Pula grupos ocultos
    if (!group || group.grupo_disponibilidade === 'oculto') return null;

    const groupElement = document.createElement('fieldset');
    groupElement.className = 'nativa-addon-group';
    groupElement.dataset.groupId = groupId;

    const descriptionHtml = group.grupo_adicional_descricao
        ? `<p class="nativa-addon-group-description">${escapeHTML(group.grupo_adicional_descricao)}</p>`
        : '';
    let rulesText = '';
    // Ajusta texto de regras
    if (group.tipo_grupo === 'opcao') {
        rulesText = '(Escolha 1 opção)';
    } else if (group.minimo > 0 || group.maximo > 0) {
        rulesText = `(Mín: ${group.minimo || 0}, Máx: ${group.maximo || 'sem limite'})`;
    }

    let progressBarHtml = '';
    if (group.tipo_grupo === 'sabor') {
        rulesText = ''; // Remove Mín/Máx do título para sabores
        const maxSelections = parseInt(group.maximo, 10) || 0;
        if (maxSelections > 0) {
            const progressBarClass = context.isCombo
                ? 'nativa-addon-progress-bar is-in-combo'
                : 'nativa-addon-progress-bar';
            progressBarHtml = `
                <div class="nativa-addon-progress-bar-wrapper">
                    <div class="${progressBarClass}">
                        <div class="progress" style="width: 0%;"></div>
                    </div>
                    <span class="nativa-addon-progress-text">0 de ${maxSelections} selecionado(s)</span>
                </div>
            `;
        }
    }

    // Header do grupo
    groupElement.innerHTML = `
        <div class="nativa-addon-group-header">
            <h4 class="nativa-addon-group-title">${escapeHTML(group.nome_exibicao)}</h4>
            ${progressBarHtml}
        </div>
        ${descriptionHtml}
    `;

    // Container dos itens
    const itemsContainer = document.createElement('div');
    groupElement.appendChild(itemsContainer);

    // Renderiza itens com ou sem quantidade
    if (group.permitir_quantidade_item) {
        groupElement.classList.add('addon-has-qty');
        itemsContainer.className = 'nativa-addon-items-list';
        // Ordena itens por preço
        const sortedItems = [...group.itens].sort(
            (a, b) => parseFloat(a.item_preco) - parseFloat(b.item_preco)
        );
        sortedItems.forEach((item) => {
            const itemIndex = group.itens.indexOf(item); // Pega o índice original
            if (item.item_disponibilidade !== 'oculto') {
                const itemWrapper = createItemWithQuantityElement(
                    groupId,
                    itemIndex,
                    item,
                    context
                );
                itemsContainer.appendChild(itemWrapper);
            }
        });
    } else {
        itemsContainer.className = 'nativa-addon-items';
        // Adiciona botão "Não sei" para sabores
        if (
            group.tipo_grupo === 'sabor' &&
            group.suggestion_mode &&
            group.suggestion_mode !== 'none'
        ) {
            const shuffleButtonHtml = `
                <div class="nativa-addon-item-button-wrapper is-shuffle-button">
                    <button type="button" class="nativa-addon-item-button-label suggestion-sabores-btn" data-group-id="${groupId}">
                        <span class="material-symbols-rounded">auto_awesome</span>
                        Não sei
                    </button>
                </div>
            `;
            itemsContainer.innerHTML += shuffleButtonHtml;
        }
        // Ordena itens (selecionados primeiro para sabor)
        let sortedItems = [...group.itens];
        if (group.tipo_grupo === 'sabor') {
            sortedItems.sort((a, b) => {
                const aIndex = group.itens.findIndex((i) => i === a);
                const bIndex = group.itens.findIndex((i) => i === b);
                const aIsSelected =
                    !!context.state[String(groupId)]?.items?.[aIndex];
                const bIsSelected =
                    !!context.state[String(groupId)]?.items?.[bIndex];
                if (aIsSelected !== bIsSelected) return aIsSelected ? -1 : 1;
                return a.item_nome.localeCompare(b.item_nome);
            });
        }
        sortedItems.forEach((item) => {
            const itemIndex = group.itens.indexOf(item);
            if (item.item_disponibilidade !== 'oculto') {
                const itemWrapper = createItemWithoutQuantityElement(
                    groupId,
                    itemIndex,
                    item,
                    group,
                    context
                );
                itemsContainer.appendChild(itemWrapper);
            }
        });
    }

    return groupElement;
}

/**
 * Cria o HTML para um item de adicional COM controle de quantidade.
 * @param {string} groupId
 * @param {number} itemIndex
 * @param {object} item - Dados do item.
 * @param {object} context
 * @returns {HTMLElement} O elemento div do item.
 */
function createItemWithQuantityElement(groupId, itemIndex, item, context) {
    const itemWrapper = document.createElement('div');
    itemWrapper.className = 'nativa-addon-item-with-qty';
    if (item.item_disponibilidade === 'indisponivel')
        itemWrapper.classList.add('is-unavailable');

    const isDisabled = item.item_disponibilidade === 'indisponivel';
    const savedItemState = context.state[String(groupId)]?.items?.[itemIndex];
    const savedQty = savedItemState ? savedItemState.itemQuantity : 0;
    const isChecked = savedQty > 0;
    const labelClassQty = context.isCombo
        ? 'nativa-addon-item-label is-in-combo'
        : 'nativa-addon-item-label';
    const quantitySelectorClass = context.isCombo
        ? 'nativa-addon-item-quantity-selector is-small is-in-combo'
        : 'nativa-addon-item-quantity-selector is-small';

    itemWrapper.innerHTML = `
        <input type="checkbox" id="addon-item-${groupId}-${itemIndex}" data-group-id="${groupId}" data-item-index="${itemIndex}" ${isDisabled ? 'disabled' : ''} ${isChecked ? 'checked' : ''} style="display:none;">
        <label class="${labelClassQty}">${escapeHTML(item.item_nome)}</label>
        <div class="${quantitySelectorClass}">
            <button class="quantity-button" data-action="minus" data-group-id="${groupId}" data-item-index="${itemIndex}" ${isDisabled || !isChecked ? 'disabled' : ''}>
                <span class="material-symbols-rounded">remove</span>
            </button>
            <input type="number" class="addon-item-qty-input" value="${savedQty}" min="0" readonly>
            <button class="quantity-button" data-action="plus" data-group-id="${groupId}" data-item-index="${itemIndex}" ${isDisabled ? 'disabled' : ''}>
                <span class="material-symbols-rounded">add</span>
            </button>
        </div>
        <div class="nativa-addon-item-price-cell">
            ${item.item_preco > 0 ? `+ ${formatPrice(item.item_preco)}` : ''}
        </div>
    `;
    return itemWrapper;
}

/**
 * Cria o HTML para um item de adicional SEM controle de quantidade (checkbox/radio).
 * @param {string} groupId
 * @param {number} itemIndex
 * @param {object} item - Dados do item.
 * @param {object} group - Dados do grupo (para saber o tipo).
 * @param {object} context
 * @returns {HTMLElement} O elemento div do item.
 */
function createItemWithoutQuantityElement(
    groupId,
    itemIndex,
    item,
    group,
    context
) {
    const itemWrapper = document.createElement('div');
    itemWrapper.className = 'nativa-addon-item-button-wrapper';
    if (item.item_disponibilidade === 'indisponivel')
        itemWrapper.classList.add('is-unavailable');

    const isDisabled = item.item_disponibilidade === 'indisponivel';
    const inputType = group.tipo_grupo === 'opcao' ? 'radio' : 'checkbox';
    const inputId = `addon-item-${groupId}-${itemIndex}`;
    const isChecked = !!context.state[String(groupId)]?.items?.[itemIndex];

    let priceHtml = '';
    if (group.tipo_grupo === 'sabor') {
        // Preço será atualizado dinamicamente por addons-sabor.js
        priceHtml = `<span class="nativa-addon-item-price-tag"></span>`;
    } else if (item.item_preco > 0) {
        // Preço fixo para Opção/Adicional
        priceHtml = `<span class="nativa-addon-item-price-tag">+ ${formatPrice(item.item_preco)}</span>`;
    }

    const labelClass = context.isCombo
        ? 'nativa-addon-item-button-label is-in-combo'
        : 'nativa-addon-item-button-label';

    itemWrapper.innerHTML = `
        <input type="${inputType}" id="${inputId}" name="addon-group-${groupId}" value="${itemIndex}" data-group-id="${groupId}" data-item-index="${itemIndex}" ${isDisabled ? 'disabled' : ''} ${isChecked ? 'checked' : ''}>
        <label for="${inputId}" class="${labelClass}">${escapeHTML(item.item_nome)}${priceHtml}</label>
    `;
    return itemWrapper;
}
