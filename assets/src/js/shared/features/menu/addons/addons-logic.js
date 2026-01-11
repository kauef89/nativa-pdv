// shared/features/menu/addons/addons-logic.js

import { createGroupElement } from './addons-ui-render.js';
import { updateSaborPriceUI, updateSaborProgressBar } from './addons-sabor.js';
import { updateGroupMaxSelectionState } from './addons-ui-state.js';
import {
    handleAddonSelection,
    handleItemQuantityChange,
    attachFeedbackListener,
} from './addons-event-handlers.js';

// --- INÍCIO DA MODIFICAÇÃO (Listeners v6) ---
// Armazena referências aos handlers vinculados para poder removê-los depois
const listenerHandlers = {
    selection: null,
    quantity: null,
    feedback: null, // O feedback handler é gerenciado internamente em event-handlers
};
// --- FIM DA MODIFICAÇÃO ---

/**
 * Renderiza os adicionais de um produto no DOM, orquestrando a criação
 * e atualização inicial da UI.
 * @param {string[]} adicionalGroupIds - O IDs dos grupos de adicionais.
 * @param {HTMLElement} targetContainer - O contêiner onde os adicionais serão renderizados.
 * @param {object} context - O objeto de contexto com o estado e a função de callback.
 */
export const renderProductAddons = (
    adicionalGroupIds,
    targetContainer,
    context
) => {
    console.log(
        '[SONDA AddonsLogic renderProductAddons] Iniciando renderização...'
    ); // SONDA
    if (!targetContainer || !context) {
        console.error(
            '[SONDA AddonsLogic renderProductAddons] Erro: targetContainer ou context ausente.'
        ); // SONDA ERRO
        return;
    }

    // --- INÍCIO DA MODIFICAÇÃO (Listeners v6) ---
    // Remove listeners antigos ANTES de limpar o container.
    // A função removeAddonListeners cuidará de verificar se os handlers existem.
    removeAddonListeners(targetContainer);
    // --- FIM DA MODIFICAÇÃO ---

    targetContainer.innerHTML = ''; // Limpa o container

    // Garante que o estado exista
    if (typeof context.state !== 'object' || context.state === null) {
        context.state = {};
        console.log(
            '[SONDA AddonsLogic renderProductAddons] Context.state inicializado.'
        ); // SONDA
    }

    if (
        !adicionalGroupIds ||
        adicionalGroupIds.length === 0 ||
        !window.nativaDeliveryData.adicionalGroups
    ) {
        console.log(
            '[SONDA AddonsLogic renderProductAddons] Sem IDs de grupo ou dados mestre. Nada a renderizar.'
        ); // SONDA
        targetContainer.style.display = 'none'; // Esconde o container se não há nada
        return;
    }

    let hasVisibleAddons = false;
    adicionalGroupIds.forEach((groupId) => {
        const groupData =
            window.nativaDeliveryData.adicionalGroups[String(groupId)];
        // Garante que o estado para este grupo exista antes de criar o elemento
        if (
            groupData &&
            groupData.grupo_disponibilidade !== 'oculto' &&
            !context.state[String(groupId)]
        ) {
            context.state[String(groupId)] = { items: {} };
        }

        // Cria o elemento HTML do grupo usando a função importada
        const groupElement = createGroupElement(groupId, groupData, context);

        if (groupElement) {
            hasVisibleAddons = true;
            targetContainer.appendChild(groupElement); // Adiciona ao DOM

            // Chama as funções de atualização inicial da UI para este grupo
            if (groupData.tipo_grupo === 'sabor') {
                updateSaborPriceUI(groupId, context);
                updateSaborProgressBar(groupId, context);
            }
            updateGroupMaxSelectionState(groupId, context);
        }
    });

    if (hasVisibleAddons) {
        targetContainer.style.display = 'block';
        attachAddonListeners(targetContainer, context); // Anexa listeners ao container geral
        console.log(
            '[SONDA AddonsLogic renderProductAddons] Renderização concluída, listeners anexados.'
        ); // SONDA
    } else {
        targetContainer.style.display = 'none';
        console.log(
            '[SONDA AddonsLogic renderProductAddons] Nenhum addon visível para renderizar.'
        ); // SONDA
    }
};

/**
 * Anexa os listeners de eventos principais ao container dos adicionais.
 * Delega a execução para os handlers importados.
 * @param {HTMLElement} container - O elemento container dos grupos de adicionais.
 * @param {object} context - O contexto contendo o estado e callback.
 */
export const attachAddonListeners = (container, context) => {
    console.log(
        '[SONDA AddonsLogic attachAddonListeners] Anexando listeners principais...'
    ); // SONDA

    // --- INÍCIO DA MODIFICAÇÃO (Listeners v6) ---
    // Cria novas funções vinculadas com o CONTEXTO ATUAL
    listenerHandlers.selection = (event) =>
        handleAddonSelection(event, context);
    listenerHandlers.quantity = (event) =>
        handleItemQuantityChange(event, context);

    // Adiciona os novos listeners
    container.addEventListener('change', listenerHandlers.selection);
    container.addEventListener('click', listenerHandlers.quantity);

    // Anexa o listener de feedback/sugestão (que tem sua própria lógica interna)
    // Passa a referência ao objeto listenerHandlers
    attachFeedbackListener(container, context, listenerHandlers);
    // --- FIM DA MODIFICAÇÃO ---

    console.log(
        '[SONDA AddonsLogic attachAddonListeners] Listeners principais anexados.'
    ); // SONDA
};

// --- INÍCIO DA MODIFICAÇÃO (Listeners v6) ---
/**
 * Remove os listeners de eventos principais do container dos adicionais.
 * @param {HTMLElement} container - O elemento container dos grupos de adicionais.
 */
export const removeAddonListeners = (container) => {
    console.log(
        '[SONDA AddonsLogic removeAddonListeners] Removendo listeners antigos...'
    );
    if (listenerHandlers.selection) {
        container.removeEventListener('change', listenerHandlers.selection);
        listenerHandlers.selection = null; // Limpa a referência
        console.log('  -> Listener de seleção removido.');
    }
    if (listenerHandlers.quantity) {
        container.removeEventListener('click', listenerHandlers.quantity);
        listenerHandlers.quantity = null; // Limpa a referência
        console.log('  -> Listener de quantidade removido.');
    }
    // Adiciona a remoção do listener de feedback
    if (listenerHandlers.feedback) {
        container.removeEventListener('click', listenerHandlers.feedback);
        listenerHandlers.feedback = null;
        console.log('  -> Listener de feedback removido.');
    }

    // Remove o marcador do listener de feedback (se ainda existir)
    if (container.dataset.feedbackListenerAttached) {
        delete container.dataset.feedbackListenerAttached;
        console.log('  -> Marcador do listener de feedback removido.');
    }
};
// --- FIM DA MODIFICAÇÃO ---
