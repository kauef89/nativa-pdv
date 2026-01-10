// js/features/addons/addons-event-handlers.js

/**
 * NOVO ARQUIVO (Refatorado de addons-logic.js)
 * Módulo para gerenciar os manipuladores de eventos dos componentes de adicionais.
 * SONDA: Mantém logs para depuração.
 * CORREÇÃO (Null Addon): Garante que a entrada do adicional seja removida (`delete`)
 * do estado quando sua quantidade se torna zero em `handleItemQuantityChange`.
 * CORREÇÃO (Sugestão Estado v5): Atualiza o estado centralmente após chamar getSuggestionIndexesAndUpdateUI.
 */

import { formatPrice } from '../../utils/nativa-utils.js';
import { showToast } from '../../utils/nativa-ui-helpers.js';
// Importa funções dos módulos refatorados
import {
    updateSaborPriceUI,
    updateSaborProgressBar,
    getSuggestionIndexesAndUpdateUI, // Importa a nova função de sugestão
} from './addons-sabor.js';
import { updateGroupMaxSelectionState } from './addons-ui-state.js';

/**
 * Manipulador para seleção/desseleção de adicionais (checkbox/radio).
 * @param {Event} event - O evento 'change'.
 * @param {object} context - O contexto contendo o estado e callback.
 */
export function handleAddonSelection(event, context) {
    const input = event.target;
    // Garante que é um input de seleção dentro do container esperado
    if (
        !input.matches('input[type="radio"], input[type="checkbox"]') ||
        !input.closest('.nativa-addon-group')
    ) {
        return;
    }

    const groupId = input.dataset.groupId;
    const itemIndex = input.dataset.itemIndex;
    const group = window.nativaDeliveryData.adicionalGroups[String(groupId)];
    if (!group) return;
    const itemData = group.itens[itemIndex];
    if (!itemData) return;

    console.log(
        `[SONDA AddonsEvents handleAddonSelection ${groupId}-${itemIndex}] Evento change. Checked: ${input.checked}`
    ); // SONDA

    const addonGroupElement = input.closest('.nativa-addon-group');
    if (addonGroupElement) addonGroupElement.classList.remove('is-error'); // Remove erro visual

    // Garante que o estado para o grupo exista
    if (!context.state[String(groupId)])
        context.state[String(groupId)] = { items: {} };
    else if (!context.state[String(groupId)].items)
        // Garante que 'items' exista
        context.state[String(groupId)].items = {};

    // Limpa seleção se for radio button antes de adicionar o novo
    if (input.type === 'radio') context.state[String(groupId)].items = {};

    // Adiciona ou remove do estado
    if (input.checked) {
        context.state[String(groupId)].items[itemIndex] = {
            itemName: itemData.item_nome,
            itemPrice: parseFloat(itemData.item_preco), // Preço base
            itemQuantity: 1,
            final_cost: parseFloat(itemData.item_preco), // Custo inicial
        };
    } else {
        // Usa delete para remover completamente a entrada do objeto
        delete context.state[String(groupId)].items[itemIndex];
    }
    console.log(
        `[SONDA AddonsEvents handleAddonSelection ${groupId}-${itemIndex}] Estado após modificação:`,
        JSON.parse(JSON.stringify(context.state[String(groupId)]?.items || {}))
    ); // SONDA

    // Atualiza UI específica para sabores (reordenação, preços, barra)
    if (group.tipo_grupo === 'sabor') {
        const itemsContainer = input.closest('.nativa-addon-items');
        if (itemsContainer) {
            // Reordena visualmente
            const wrappers = Array.from(
                itemsContainer.querySelectorAll(
                    '.nativa-addon-item-button-wrapper'
                )
            );
            wrappers.sort((a, b) => {
                const aIsShuffle = a.classList.contains('is-shuffle-button');
                const bIsShuffle = b.classList.contains('is-shuffle-button');
                if (aIsShuffle) return -1;
                if (bIsShuffle) return 1;
                const inputA = a.querySelector('input');
                const inputB = b.querySelector('input');
                const labelA = a.querySelector('label')?.textContent || '';
                const labelB = b.querySelector('label')?.textContent || '';
                if (inputA && inputB && inputA.checked !== inputB.checked)
                    return inputA.checked ? -1 : 1;
                return labelA.localeCompare(labelB);
            });
            wrappers.forEach((wrapper) => itemsContainer.appendChild(wrapper));
        }
        updateSaborPriceUI(groupId, context);
        updateSaborProgressBar(groupId, context);
    }

    updateGroupMaxSelectionState(groupId, context); // Atualiza estado de máximo
    if (typeof context.onUpdate === 'function') context.onUpdate(); // Chama callback para atualizar preço total
}

/**
 * Manipulador para alteração de quantidade de itens (+/-).
 * @param {Event} event - O evento 'click'.
 * @param {object} context - O contexto contendo o estado e callback.
 */
export function handleItemQuantityChange(event, context) {
    const button = event.target.closest('.quantity-button');
    if (!button) return;

    const groupId = button.dataset.groupId;
    const itemIndex = button.dataset.itemIndex;
    const group = window.nativaDeliveryData.adicionalGroups[String(groupId)];
    if (!group) return;
    const action = button.dataset.action;
    const itemData = group.itens[itemIndex];
    if (!itemData) return;
    const row = button.closest('.nativa-addon-item-with-qty');
    const quantityInput = row.querySelector('.addon-item-qty-input');
    const checkbox = row.querySelector('input[type="checkbox"]');
    const minusBtn = row.querySelector('.quantity-button[data-action="minus"]');
    let currentQuantity = parseInt(quantityInput.value, 10);

    console.log(
        `[SONDA AddonsEvents handleItemQuantityChange ${groupId}-${itemIndex}] Botão ${action} clicado. Qtd atual: ${currentQuantity}`
    ); // SONDA

    const addonGroupElement = button.closest('.nativa-addon-group');
    if (addonGroupElement) addonGroupElement.classList.remove('is-error'); // Remove erro visual

    // Calcula nova quantidade
    if (action === 'plus') {
        currentQuantity++;
    } else if (action === 'minus' && currentQuantity > 0) {
        currentQuantity--;
    }

    // Atualiza a UI do input e botões
    quantityInput.value = currentQuantity;
    checkbox.checked = currentQuantity > 0;
    minusBtn.disabled = currentQuantity === 0;

    // Atualiza o estado
    // Garante que o estado do grupo exista
    if (!context.state[String(groupId)]) {
        context.state[String(groupId)] = { items: {} };
    } else if (!context.state[String(groupId)].items) {
        context.state[String(groupId)].items = {};
    }

    if (currentQuantity > 0) {
        // Atualiza ou adiciona o item com a nova quantidade
        context.state[String(groupId)].items[itemIndex] = {
            itemName: itemData.item_nome,
            itemPrice: parseFloat(itemData.item_preco),
            itemQuantity: currentQuantity,
            final_cost: parseFloat(itemData.item_preco), // Custo inicial, será corrigido por updateSaborPriceUI se necessário
        };
    } else {
        // Se a quantidade for 0, REMOVE completamente a entrada do objeto 'items'
        if (context.state[String(groupId)]?.items?.[itemIndex]) {
            delete context.state[String(groupId)].items[itemIndex];
            console.log(
                `[SONDA AddonsEvents handleItemQuantityChange ${groupId}-${itemIndex}] Item removido do estado (quantidade 0).`
            ); // SONDA
        }
    }

    console.log(
        `[SONDA AddonsEvents handleItemQuantityChange ${groupId}-${itemIndex}] Estado após modificação:`,
        JSON.parse(JSON.stringify(context.state[String(groupId)]?.items || {}))
    ); // SONDA

    // Atualiza UI específica (só relevante para sabor, mas não custa chamar)
    if (group.tipo_grupo === 'sabor') {
        updateSaborPriceUI(groupId, context);
        updateSaborProgressBar(groupId, context);
    }
    updateGroupMaxSelectionState(groupId, context); // Atualiza estado de máximo
    if (typeof context.onUpdate === 'function') context.onUpdate(); // Chama callback para atualizar preço total
}

// --- INÍCIO DA MODIFICAÇÃO (Listeners v6) ---
/**
 * Anexa o listener de eventos ao container de adicionais para lidar com
 * feedback de itens desabilitados e o botão de sugestão.
 * Usa delegação de eventos.
 * @param {HTMLElement} container - O elemento container dos grupos de adicionais.
 * @param {object} context - O contexto contendo o estado e callback.
 * @param {object} listenerHandlers - O objeto para armazenar a referência do handler.
 */
export function attachFeedbackListener(container, context, listenerHandlers) {
    // --- FIM DA MODIFICAÇÃO ---
    // Verifica se o listener já foi anexado para evitar duplicação
    if (container.dataset.feedbackListenerAttached === 'true') {
        console.log(
            '[SONDA AddonsEvents attachFeedbackListener] Listener JÁ estava anexado.'
        ); // SONDA
        return;
    }

    // --- INÍCIO DA MODIFICAÇÃO (Listeners v6) ---
    // Define o handler e o armazena no objeto de referência
    const feedbackHandler = function (event) {
        // --- FIM DA MODIFICAÇÃO ---
        const suggestionButton = event.target.closest(
            '.suggestion-sabores-btn'
        );
        // --- INÍCIO DA MODIFICAÇÃO (Sugestão Estado v5) ---
        if (suggestionButton) {
            console.log(
                `[SONDA AddonsEvents Listener Feedback] Botão Sugestão clicado para grupo ${suggestionButton.dataset.groupId}`
            ); // SONDA
            event.preventDefault();
            const groupId = suggestionButton.dataset.groupId;
            const groupElement = suggestionButton.closest(
                '.nativa-addon-group'
            );
            const groupConfig =
                window.nativaDeliveryData.adicionalGroups[String(groupId)];

            if (!groupElement || !groupConfig) {
                console.error(
                    `[SONDA AddonsEvents] Grupo ${groupId} ou seu elemento não encontrado.`
                );
                return;
            }

            // 1. Chama a função que calcula a sugestão, atualiza a UI e retorna os índices
            const selectedIndexes = getSuggestionIndexesAndUpdateUI(
                groupId,
                groupElement
            );

            // 2. Limpa o estado atual para este grupo
            if (!context.state[String(groupId)]) {
                context.state[String(groupId)] = { items: {} };
            } else {
                context.state[String(groupId)].items = {}; // Limpa o objeto items
            }
            const currentGroupStateItems = context.state[String(groupId)].items;

            // 3. Popula o estado com base nos índices retornados
            selectedIndexes.forEach((itemIndex) => {
                const itemData = groupConfig.itens[itemIndex];
                if (itemData) {
                    currentGroupStateItems[itemIndex] = {
                        itemName: itemData.item_nome,
                        itemPrice: parseFloat(itemData.item_preco),
                        itemQuantity: 1,
                        final_cost: parseFloat(itemData.item_preco), // Preço inicial, será ajustado
                    };
                }
            });

            console.log(
                `[SONDA AddonsEvents Listener Feedback] Estado após sugestão (ANTES de calcular preços):`,
                JSON.parse(JSON.stringify(currentGroupStateItems || {}))
            );

            // 4. Chama as funções de atualização de UI e o callback principal
            console.log(
                `[SONDA AddonsEvents Listener Feedback] Chamando atualizações de UI e onUpdate.`
            );
            updateSaborPriceUI(groupId, context);
            updateSaborProgressBar(groupId, context);
            updateGroupMaxSelectionState(groupId, context);
            if (typeof context.onUpdate === 'function') {
                context.onUpdate();
            }

            return; // Encerra o handler aqui
        }
        // --- FIM DA MODIFICAÇÃO ---

        // Lógica de feedback para itens desabilitados (inalterada)
        const label = event.target.closest('label');
        const button = event.target.closest('button');

        if (label && label.htmlFor) {
            const input = document.getElementById(label.htmlFor);
            if (input && input.disabled) {
                const wrapper = input.closest(
                    '.nativa-addon-item-button-wrapper, .nativa-addon-item-with-qty'
                );
                if (wrapper && wrapper.classList.contains('is-unavailable')) {
                    showToast(
                        'Este item está indisponível no momento.',
                        'error'
                    );
                } else if (
                    wrapper &&
                    wrapper.classList.contains('is-disabled-by-max')
                ) {
                    const groupId = input.dataset.groupId;
                    const group =
                        window.nativaDeliveryData.adicionalGroups[
                            String(groupId)
                        ];
                    showToast(
                        `O máximo de ${group.maximo} seleções para "${group.nome_exibicao}" já foi atingido.`,
                        'info'
                    );
                }
            }
        } else if (
            button &&
            button.disabled &&
            !button.closest('.suggestion-sabores-btn')
        ) {
            const wrapper = button.closest('.nativa-addon-item-with-qty');
            if (wrapper && wrapper.classList.contains('is-unavailable')) {
                showToast('Este item está indisponível no momento.', 'error');
            } else if (
                wrapper &&
                wrapper.classList.contains('is-disabled-by-max')
            ) {
                const groupId = button.dataset.groupId;
                const group =
                    window.nativaDeliveryData.adicionalGroups[String(groupId)];
                showToast(
                    `O máximo de ${group.maximo} seleções para "${group.nome_exibicao}" já foi atingido.`,
                    'info'
                );
            } else if (
                button.classList.contains('quantity-button') &&
                button.dataset.action === 'minus'
            ) {
                // Nenhuma ação necessária para botão '-' desabilitado (quantidade já é 0)
            }
        }
    };

    // --- INÍCIO DA MODIFICAÇÃO (Listeners v6) ---
    // Armazena a referência e anexa o handler
    listenerHandlers.feedback = feedbackHandler;
    container.addEventListener('click', listenerHandlers.feedback);
    // --- FIM DA MODIFICAÇÃO ---

    container.dataset.feedbackListenerAttached = 'true'; // Marca que o listener foi anexado
    console.log(
        '[SONDA AddonsEvents attachFeedbackListener] Listener de feedback/sugestão anexado.'
    ); // SONDA
}
