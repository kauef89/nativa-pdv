// js/features/addons/addons-validation.js

/**
 * Módulo de validação para seleções de adicionais.
 * Contém a lógica de validação de regras de "mínimo" e "máximo" de um grupo.
 * SONDA: Adiciona logs detalhados.
 */

import { showToast } from '../../utils/nativa-ui-helpers.js';

/**
 * Valida as seleções de adicionais de um produto.
 * @param {object} product O objeto do produto.
 * @param {object} userSelections As seleções do usuário para os grupos de adicionais.
 * @param {HTMLElement} container O container HTML para aplicar classes de erro.
 * @returns {boolean} True se a validação passar, False caso contrário.
 */
export const validateAddonSelections = (product, userSelections, container) => {
    let isValid = true;
    let firstErrorElement = null;

    // --- INÍCIO DA MODIFICAÇÃO (LOG VALIDAÇÃO) ---
    console.log(
        '[SONDA AddonsValidation validateAddonSelections] Iniciando validação. Estado userSelections recebido:',
        JSON.parse(JSON.stringify(userSelections)) // Loga o estado recebido
    );
    // --- FIM DA MODIFICAÇÃO ---

    if (!container) {
        console.error('Container de validação não encontrado.');
        return false;
    }

    // Limpa os estados de erro anteriores.
    container
        .querySelectorAll('.nativa-addon-group.is-error')
        .forEach((groupEl) => {
            groupEl.classList.remove('is-error');
        });

    if (product?.adicional_groups) {
        product.adicional_groups.forEach((groupId) => {
            const strGroupId = String(groupId); // Garante que groupId seja string para acesso
            const groupEl = container.querySelector(
                `.nativa-addon-group[data-group-id="${strGroupId}"]`
            );
            // Pula se o elemento do grupo não estiver no DOM (pode acontecer se o grupo for condicionalmente oculto)
            if (!groupEl) {
                console.log(
                    `[SONDA AddonsValidation] Elemento para grupo ${strGroupId} não encontrado no DOM. Pulando validação.`
                );
                return;
            }

            const groupConfig =
                window.nativaDeliveryData.adicionalGroups[strGroupId];
            // Pula se a configuração do grupo não for encontrada (erro de dados mestre)
            if (!groupConfig) {
                console.warn(
                    `[SONDA AddonsValidation] Configuração para grupo ${strGroupId} não encontrada nos dados mestre. Pulando validação.`
                );
                return;
            }

            // --- INÍCIO DA MODIFICAÇÃO (LOG VALIDAÇÃO) ---
            // Acessa as seleções para este grupo específico
            const selections = userSelections[strGroupId]?.items || {};
            console.log(
                `[SONDA AddonsValidation] Validando grupo ${strGroupId} (${groupConfig.nome_exibicao}). Itens selecionados:`,
                JSON.parse(JSON.stringify(selections))
            );
            // --- FIM DA MODIFICAÇÃO ---

            const minSelections = parseInt(groupConfig.minimo, 10) || 0;
            const maxSelections = parseInt(groupConfig.maximo, 10) || 0;
            let currentSelectionCount = 0;

            if (groupConfig.permitir_quantidade_item) {
                currentSelectionCount = Object.values(selections).reduce(
                    (sum, item) => sum + (item.itemQuantity || 0),
                    0
                );
            } else {
                currentSelectionCount = Object.keys(selections).length;
            }
            console.log(
                `[SONDA AddonsValidation] Grupo ${strGroupId}: Contagem atual = ${currentSelectionCount}, Mínimo = ${minSelections}, Máximo = ${maxSelections}`
            );

            // Validação de mínimo (incluindo tipo 'opcao')
            if (
                (groupConfig.tipo_grupo === 'opcao' &&
                    currentSelectionCount === 0) ||
                (minSelections > 0 && currentSelectionCount < minSelections)
            ) {
                isValid = false;
                groupEl.classList.add('is-error');
                if (!firstErrorElement) firstErrorElement = groupEl;
                const minRequired = minSelections > 0 ? minSelections : 1; // Para tipo 'opcao', o mínimo implícito é 1
                const msg = `Selecione no mínimo ${minRequired} opção(ões) para "${groupConfig.nome_exibicao}".`;
                console.log(
                    `[SONDA AddonsValidation] Erro Mínimo Grupo ${strGroupId}: ${msg}`
                );
                showToast(msg, 'error');
            }
            // Validação de máximo (apenas se max > 0)
            else if (
                maxSelections > 0 &&
                currentSelectionCount > maxSelections
            ) {
                isValid = false;
                groupEl.classList.add('is-error');
                if (!firstErrorElement) firstErrorElement = groupEl;
                const msg = `Selecione no máximo ${maxSelections} opção(ões) para "${groupConfig.nome_exibicao}".`;
                console.log(
                    `[SONDA AddonsValidation] Erro Máximo Grupo ${strGroupId}: ${msg}`
                );
                showToast(msg, 'error');
            }
        });
    }

    if (!isValid && firstErrorElement) {
        firstErrorElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
        });
    }

    console.log(
        `[SONDA AddonsValidation validateAddonSelections] Resultado final da validação: ${isValid}`
    );
    return isValid;
};
