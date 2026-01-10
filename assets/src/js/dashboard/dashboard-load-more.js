// js/dashboard/dashboard-load-more.js
/**
 * Módulo para gerenciar a funcionalidade "Carregar Mais" no dashboard.
 */

import { state } from './dashboard-state.js';
import * as ui from './dashboard-ui.js';

export const BATCH_SIZE = 10; // Tamanho do lote a ser carregado

/**
 * Carrega e renderiza o próximo lote de pedidos.
 * @param {object} selectors - Referências aos elementos do DOM.
 */
function loadMoreOrders(selectors) {
    if (
        state.currentlyDisplayedOrders.length >=
        state.currentFilteredOrders.length
    ) {
        renderLoadMoreButton(selectors); // Esconde/remove o botão se não há mais itens
        return;
    }

    // Calcula o próximo lote
    const nextBatch = state.currentFilteredOrders.slice(
        state.currentlyDisplayedOrders.length,
        state.currentlyDisplayedOrders.length + BATCH_SIZE
    );

    // Adiciona o novo lote aos pedidos exibidos
    state.currentlyDisplayedOrders.push(...nextBatch);

    // Renderiza apenas os novos pedidos (append)
    if (selectors.tableContainer) {
        ui.renderOrdersTable(nextBatch, false);
    }

    // Atualiza o estado do botão "Carregar Mais"
    renderLoadMoreButton(selectors);
}

/**
 * Renderiza ou remove o botão "Carregar Mais" com base nos pedidos filtrados e exibidos.
 * @param {object} selectors - Referências aos elementos do DOM.
 */
export function renderLoadMoreButton(selectors) {
    if (!selectors.tableContainer) return;

    let buttonContainer = document.getElementById('load-more-container');
    // Cria o container do botão se ele não existir
    if (!buttonContainer) {
        buttonContainer = document.createElement('div');
        buttonContainer.id = 'load-more-container';
        // Insere o container APÓS o container da tabela
        selectors.tableContainer.parentNode.insertBefore(
            buttonContainer,
            selectors.tableContainer.nextSibling
        );
    }

    // Verifica se ainda há pedidos filtrados para carregar
    if (
        state.currentlyDisplayedOrders.length <
        state.currentFilteredOrders.length
    ) {
        const remaining =
            state.currentFilteredOrders.length -
            state.currentlyDisplayedOrders.length;
        const countToShow = Math.min(remaining, BATCH_SIZE);
        // Atualiza o HTML do botão
        buttonContainer.innerHTML = `<button id="load-more-btn" class="nativa-button-primary">Carregar Mais ${countToShow} Pedido${countToShow > 1 ? 's' : ''}</button>`;
        const loadMoreBtn = document.getElementById('load-more-btn');
        if (loadMoreBtn) {
            // Garante que o listener esteja anexado corretamente
            loadMoreBtn.removeEventListener('click', () =>
                loadMoreOrders(selectors)
            ); // Remove listener antigo referenciando a função diretamente
            loadMoreBtn.addEventListener('click', () =>
                loadMoreOrders(selectors)
            ); // Adiciona novo listener passando os seletores
        }
    } else {
        // Remove o conteúdo do container (o botão) se não há mais itens
        buttonContainer.innerHTML = '';
    }
}
