// js/features/addons/addons-sabor.js

/**
 * NOVO ARQUIVO (Refatorado de addons-logic.js)
 * Módulo para gerenciar a lógica específica de grupos de adicionais do tipo 'sabor',
 * incluindo cálculo de preço dinâmico, barra de progresso e sugestões.
 * SONDA: Mantém logs para depuração.
 * CORREÇÃO (Sugestão Preço v2): Executa atualizações de UI e recálculo de preço de forma síncrona após a lógica da sugestão.
 * CORREÇÃO (Sugestão Estado v3): Cria um novo objeto de estado para o grupo ao aplicar sugestão para evitar problemas de referência.
 * CORREÇÃO (Sugestão Estado v4): Modifica a atualização do estado para limpar e popular o objeto 'items' existente, preservando a referência original.
 * CORREÇÃO (Sugestão Estado v5): handleSuggestion agora retorna os índices selecionados, a atualização do estado é feita pelo chamador.
 */

import { formatPrice } from '../../utils/nativa-utils.js';
import { showToast } from '../../utils/nativa-ui-helpers.js';
// Importa funções de atualização de UI necessárias de outros módulos
import { updateGroupMaxSelectionState } from './addons-ui-state.js';

/**
 * Atualiza o estado e a UI de um grupo de adicionais do tipo 'sabor', ajustando os preços.
 * @param {string} groupId - O ID do grupo de adicionais.
 * @param {object} context - O objeto de contexto que contém o estado e os dados.
 */
export function updateSaborPriceUI(groupId, context) {
    const strGroupId = String(groupId);
    const group = window.nativaDeliveryData.adicionalGroups[strGroupId];
    if (!group || group.tipo_grupo !== 'sabor') return;

    // Garante que o estado exista antes de tentar acessá-lo
    if (!context.state[strGroupId]) {
        console.warn(
            `[SONDA AddonsSabor updateSaborPriceUI ${groupId}] Estado para o grupo não encontrado. Criando.`
        );
        context.state[strGroupId] = { items: {} };
    } else if (!context.state[strGroupId].items) {
        // Garante que o objeto 'items' exista dentro do estado do grupo
        console.warn(
            `[SONDA AddonsSabor updateSaborPriceUI ${groupId}] Objeto 'items' não encontrado no estado do grupo. Criando.`
        );
        context.state[strGroupId].items = {};
    }

    console.log(
        `[SONDA AddonsSabor updateSaborPriceUI ${groupId}] Estado ANTES da atualização de preços:`,
        JSON.parse(JSON.stringify(context.state[strGroupId]?.items || {}))
    );

    const selections = context.state[strGroupId].items; // Acessa diretamente após garantir que existe
    const minGratis = parseInt(group.minimo_gratis || 0, 10);
    const precoAdicional = parseFloat(group.preco_sabor_adicional || 0);

    const selectedItemsList = [];
    for (const itemIndex in selections) {
        // Verifica se a propriedade pertence ao objeto (evita problemas com protótipo)
        if (Object.hasOwnProperty.call(selections, itemIndex)) {
            const itemMasterData = group.itens[itemIndex];
            if (!itemMasterData) {
                console.warn(
                    `[SONDA AddonsSabor updateSaborPriceUI ${groupId}] Item ${itemIndex} encontrado no estado, mas não nos dados mestre. Pulando.`
                );
                // Remove o item inválido do estado
                delete selections[itemIndex];
                continue;
            }
            selectedItemsList.push({
                index: itemIndex,
                price: parseFloat(itemMasterData.item_preco),
            });
        }
    }

    selectedItemsList.sort((a, b) => b.price - a.price); // Mais caros primeiro

    // Atualiza o estado com o preço final correto para cada item
    for (const itemIndex in selections) {
        if (Object.hasOwnProperty.call(selections, itemIndex)) {
            const itemRank = selectedItemsList.findIndex(
                (selected) => selected.index == itemIndex
            );
            const isInBubble = itemRank !== -1 && itemRank < minGratis;
            const itemOriginalPrice = parseFloat(
                group.itens[itemIndex]?.item_preco || 0
            );

            const finalPriceForItem = isInBubble
                ? itemOriginalPrice
                : itemOriginalPrice + precoAdicional;
            selections[itemIndex].itemPrice = itemOriginalPrice; // Mantém o preço base original
            selections[itemIndex].final_cost = finalPriceForItem; // Armazena o custo final calculado
        }
    }
    console.log(
        `[SONDA AddonsSabor updateSaborPriceUI ${groupId}] Estado DEPOIS da atualização de preços:`,
        JSON.parse(JSON.stringify(context.state[strGroupId]?.items || {}))
    );

    // Atualiza as etiquetas de preço na UI
    group.itens.forEach((item, itemIndex) => {
        const inputElement = document.getElementById(
            `addon-item-${groupId}-${itemIndex}`
        );
        if (!inputElement) return;

        const labelElement = inputElement.nextElementSibling;
        const priceTag = labelElement?.querySelector(
            '.nativa-addon-item-price-tag'
        );
        if (!priceTag) return;

        const itemOriginalPrice = parseFloat(item.item_preco);
        const isItemSelected = inputElement.checked;
        let finalPriceToShow = -1; // Usar -1 para indicar que não deve mostrar preço se for 0

        // Recalcula o preço a ser exibido com base no estado ATUALIZADO
        const itemState = selections[itemIndex];
        if (itemState && isItemSelected) {
            finalPriceToShow = itemState.final_cost;
        } else {
            // Se não está selecionado, calcula como seria o preço se fosse selecionado AGORA
            const currentSelectionCount = selectedItemsList.length; // Quantos JÁ estão selecionados
            const potentialRank = isItemSelected
                ? selectedItemsList.findIndex((sel) => sel.index == itemIndex)
                : currentSelectionCount; // Qual seria a posição se adicionado/mantido
            const wouldBeInBubble =
                potentialRank !== -1 && potentialRank < minGratis;

            finalPriceToShow = wouldBeInBubble
                ? itemOriginalPrice
                : itemOriginalPrice + precoAdicional;
        }

        // Garante que o preço a exibir não seja negativo (caso itemOriginalPrice seja 0 e precoAdicional seja > 0 mas não esteja na bolha)
        finalPriceToShow = Math.max(0, finalPriceToShow);

        priceTag.textContent =
            finalPriceToShow > 0 ? `+ ${formatPrice(finalPriceToShow)}` : '';
    });
}

/**
 * Atualiza a barra de progresso para grupos do tipo 'sabor'.
 * @param {string} groupId - O ID do grupo.
 * @param {object} context - O objeto de contexto que contém o estado.
 */
export function updateSaborProgressBar(groupId, context) {
    const strGroupId = String(groupId);
    const groupElement = document.querySelector(
        `.nativa-addon-group[data-group-id="${strGroupId}"]`
    );
    if (!groupElement) return;

    const group = window.nativaDeliveryData.adicionalGroups[strGroupId];
    if (!group || group.tipo_grupo !== 'sabor') return; // Adiciona verificação de group

    const maxSelections = parseInt(group.maximo, 10) || 0;
    const minGratis = parseInt(group.minimo_gratis, 10) || 0;
    // Garante que o estado existe antes de acessar
    const currentSelectionCount = Object.keys(
        context.state[strGroupId]?.items || {}
    ).length;
    const progressPercentage =
        maxSelections > 0 ? (currentSelectionCount / maxSelections) * 100 : 0;

    const progressBarWrapper = groupElement.querySelector(
        '.nativa-addon-progress-bar'
    );
    const progressBar = progressBarWrapper?.querySelector('.progress');
    const progressText = groupElement.querySelector(
        '.nativa-addon-progress-text'
    );

    if (progressBar) {
        progressBar.style.width = `${progressPercentage}%`;
        progressBarWrapper.classList.toggle(
            'is-over-free-limit',
            minGratis > 0 && currentSelectionCount > minGratis
        );
    }
    if (progressText) {
        progressText.textContent = `${currentSelectionCount} de ${maxSelections} selecionado(s)`;
    }
}

/**
 * Calcula e retorna os índices dos sabores sugeridos para um grupo.
 * Atualiza a UI (checkboxes) e reordena visualmente. NÃO modifica o context.state.
 * @param {string} groupId - O ID do grupo de sabores.
 * @param {object} groupElement - O elemento HTML do grupo.
 * @returns {Array<number>} Um array com os índices (itemIndex) dos sabores selecionados.
 */
export function getSuggestionIndexesAndUpdateUI(groupId, groupElement) {
    console.log(
        `[SONDA AddonsSabor getSuggestionIndexesAndUpdateUI ${groupId}] Calculando sugestão.`
    );
    const strGroupId = String(groupId);
    const group = window.nativaDeliveryData.adicionalGroups[strGroupId];
    if (!group || group.tipo_grupo !== 'sabor') return [];

    const minGratis = parseInt(group.minimo_gratis || group.maximo, 10);
    const maxSelections = parseInt(group.maximo, 10);
    let potentialItemsToSelectNames = [];

    // 1. Coleta itens candidatos (lógica inalterada)
    switch (group.suggestion_mode) {
        case 'defined_list':
            const combinations = group.suggestion_data || [];
            if (combinations.length > 0) {
                potentialItemsToSelectNames =
                    combinations[
                        Math.floor(Math.random() * combinations.length)
                    ];
            }
            console.log(
                `[SONDA AddonsSabor getSuggestion ${groupId}] Modo defined_list. Candidatos:`,
                potentialItemsToSelectNames
            );
            break;
        case 'best_sellers':
            potentialItemsToSelectNames = group.suggestion_data || [];
            console.log(
                `[SONDA AddonsSabor getSuggestion ${groupId}] Modo best_sellers. Candidatos:`,
                potentialItemsToSelectNames
            );
            break;
        case 'random':
        default:
            potentialItemsToSelectNames = group.itens.map(
                (item) => item.item_nome
            );
            console.log(
                `[SONDA AddonsSabor getSuggestion ${groupId}] Modo random. Candidatos:`,
                potentialItemsToSelectNames
            );
            break;
    }

    // 2. Filtra candidatos por disponibilidade (lógica inalterada)
    const availableItemsToSelect = potentialItemsToSelectNames.filter(
        (itemName) => {
            const itemIndex = group.itens.findIndex(
                (item) => item.item_nome === itemName
            );
            if (itemIndex === -1) return false;
            const itemData = group.itens[itemIndex];
            const isAvailable =
                itemData.item_disponibilidade !== 'indisponivel' &&
                itemData.item_disponibilidade !== 'oculto';
            if (!isAvailable)
                console.log(
                    `[SONDA AddonsSabor getSuggestion ${groupId}] Item "${itemName}" filtrado.`
                );
            return isAvailable;
        }
    );

    if (availableItemsToSelect.length === 0) {
        console.log(
            `[SONDA AddonsSabor getSuggestion ${groupId}] Nenhum item disponível.`
        );
        showToast('Não há itens disponíveis para sugerir.', 'info');
        return []; // Retorna array vazio
    }

    // 3. Determina quantos e quais itens selecionar (lógica inalterada)
    let finalItemsToSelectNames = [];
    let numToSelect = 0;
    if (group.suggestion_mode === 'defined_list') {
        numToSelect = Math.min(availableItemsToSelect.length, maxSelections);
        finalItemsToSelectNames = availableItemsToSelect.slice(0, numToSelect);
    } else {
        const minToSelect = Math.min(
            minGratis,
            availableItemsToSelect.length,
            maxSelections
        );
        const maxToSelect = Math.min(
            availableItemsToSelect.length,
            maxSelections
        );
        const effectiveMin = Math.min(minToSelect, maxToSelect);
        numToSelect =
            Math.floor(Math.random() * (maxToSelect - effectiveMin + 1)) +
            effectiveMin;
        let itemsPool = [...availableItemsToSelect];
        if (group.suggestion_mode === 'random') {
            itemsPool.sort(() => 0.5 - Math.random());
        }
        finalItemsToSelectNames = itemsPool.slice(0, numToSelect);
    }
    console.log(
        `[SONDA AddonsSabor getSuggestion ${groupId}] Itens finais (${numToSelect}):`,
        finalItemsToSelectNames
    );

    // 4. Limpa UI e Atualiza UI (Marca checkboxes selecionados)
    console.log(
        `[SONDA AddonsSabor getSuggestion ${groupId}] Limpando e atualizando UI.`
    );
    const selectedIndexes = [];
    groupElement
        ?.querySelectorAll('input[type="checkbox"]')
        .forEach((input) => (input.checked = false)); // Desmarca UI
    finalItemsToSelectNames.forEach((itemName) => {
        const itemIndex = group.itens.findIndex(
            (item) => item.item_nome === itemName
        );
        if (itemIndex > -1) {
            selectedIndexes.push(itemIndex); // Guarda o índice
            const checkbox = document.getElementById(
                `addon-item-${groupId}-${itemIndex}`
            );
            if (checkbox) checkbox.checked = true;
        } else {
            console.warn(
                `[SONDA AddonsSabor getSuggestion ${groupId}] Item "${itemName}" não encontrado.`
            );
        }
    });

    // 5. Reordena UI (lógica inalterada)
    const itemsContainer = groupElement?.querySelector('.nativa-addon-items');
    if (itemsContainer) {
        const wrappers = Array.from(
            itemsContainer.querySelectorAll('.nativa-addon-item-button-wrapper')
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
        console.log(
            `[SONDA AddonsSabor getSuggestion ${groupId}] UI reordenada.`
        );
    }

    // 6. Feedback (lógica inalterada)
    const numSabores = finalItemsToSelectNames.length;
    const saborText = numSabores === 1 ? 'sabor' : 'sabores';
    const escolhidoText = numSabores === 1 ? 'escolhido' : 'escolhidos';
    showToast(
        `${numSabores} ${saborText} ${escolhidoText} pra você!`,
        'success'
    );

    console.log(
        `[SONDA AddonsSabor getSuggestion ${groupId}] Finalizado. Retornando índices:`,
        selectedIndexes
    );
    return selectedIndexes; // Retorna os índices selecionados
}
