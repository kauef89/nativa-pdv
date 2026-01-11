// shared/features/menu/addons/addons-ui-state.js

/**
 * Atualiza o estado visual (habilitado/desabilitado) dos itens de um grupo
 * com base na regra de seleção máxima.
 * @param {string} groupId - O ID do grupo.
 * @param {object} context - O objeto de contexto que contém o estado atual das seleções.
 */
export function updateGroupMaxSelectionState(groupId, context) {
    const strGroupId = String(groupId);
    const group = window.nativaDeliveryData.adicionalGroups[strGroupId];
    // Se não há grupo, ou não há máximo definido (maximo === 0), não faz nada.
    if (!group || !group.maximo || parseInt(group.maximo, 10) === 0) {
        // Garante que a classe de desabilitado seja removida se a regra não se aplica
        const groupElement = document.querySelector(
            `.nativa-addon-group[data-group-id="${strGroupId}"]`
        );
        groupElement
            ?.querySelectorAll('.is-disabled-by-max')
            .forEach((el) => el.classList.remove('is-disabled-by-max'));
        groupElement
            ?.querySelectorAll('input:disabled, button:disabled')
            .forEach((el) => {
                // Reabilita apenas se não estiver indisponível por falta de estoque
                const wrapper = el.closest('.is-unavailable');
                if (!wrapper) el.disabled = false;
            });
        return;
    }

    const selections = context.state[strGroupId]?.items || {};
    const maxSelections = parseInt(group.maximo, 10);
    let currentSelectionCount = 0;

    // Calcula a contagem atual de seleções
    if (group.permitir_quantidade_item) {
        // Soma as quantidades individuais
        currentSelectionCount = Object.values(selections).reduce(
            (sum, item) => sum + (item.itemQuantity || 0),
            0
        );
    } else {
        // Conta o número de itens selecionados
        currentSelectionCount = Object.keys(selections).length;
    }

    const isMaxReached = currentSelectionCount >= maxSelections;

    // Itera sobre os itens do grupo NO DOM para aplicar o estado visual
    group.itens.forEach((itemData, itemIndex) => {
        // Usa itemData para verificar disponibilidade real
        const itemElement = document.getElementById(
            `addon-item-${groupId}-${itemIndex}`
        );
        const itemWrapper = itemElement?.closest(
            '.nativa-addon-item-button-wrapper, .nativa-addon-item-with-qty'
        );
        if (!itemWrapper) return; // Pula se o elemento não for encontrado

        const mainInput = itemWrapper.querySelector(
            'input[type="checkbox"], input[type="radio"]'
        );
        const isCurrentlySelected =
            selections[itemIndex] &&
            (group.permitir_quantidade_item
                ? selections[itemIndex].itemQuantity > 0
                : true);
        const isItemAvailable =
            itemData.item_disponibilidade !== 'indisponivel'; // Verifica disponibilidade real

        if (group.permitir_quantidade_item) {
            // Para itens com quantidade
            const plusButton = itemWrapper.querySelector(
                '.quantity-button[data-action="plus"]'
            );
            if (plusButton) {
                // Desabilita '+' se o máximo foi atingido OU se o item está indisponível
                plusButton.disabled = !isItemAvailable || isMaxReached;
            }
            // Adiciona classe visual de desabilitado se o máximo foi atingido e o item não está selecionado (e está disponível)
            itemWrapper.classList.toggle(
                'is-disabled-by-max',
                isItemAvailable && isMaxReached && !isCurrentlySelected
            );
        } else {
            // Para itens sem quantidade (checkbox/radio)
            if (mainInput) {
                // Desabilita o input se o máximo foi atingido E este item NÃO está selecionado E o item está disponível
                const shouldDisable =
                    isItemAvailable && isMaxReached && !mainInput.checked;
                mainInput.disabled = shouldDisable;
                itemWrapper.classList.toggle(
                    'is-disabled-by-max',
                    shouldDisable
                );

                // Garante que não fique desabilitado se estiver indisponível (a classe 'is-unavailable' já trata disso)
                if (!isItemAvailable) {
                    mainInput.disabled = true; // Sempre desabilitado se indisponível
                    itemWrapper.classList.remove('is-disabled-by-max'); // Remove a classe específica de max
                }
            }
        }
    });
}
