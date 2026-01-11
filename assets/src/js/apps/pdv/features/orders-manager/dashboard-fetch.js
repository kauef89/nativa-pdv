// apps/pdv/features/orders-manager/dashboard-fetch.js

import * as api from './dashboard-api.js';
import * as filters from './dashboard-filters.js';
import { state } from './dashboard-state.js';
import * as ui from './dashboard-ui.js';

// Referência aos seletores (serão atualizados no início de fetchData)
let localSelectors = {};

/**
 * Busca os dados iniciais ou atualizados do servidor.
 * @param {boolean} isFullReload - True para buscar todos os dados, False para buscar apenas atualizações.
 * @param {string} dateFilter - O filtro de data selecionado ('today', 'all', etc.).
 * @param {boolean} isInitialLoad - Indica se é a primeira carga da página.
 * @param {object} selectors - Referências aos elementos do DOM.
 */
export async function fetchData(
    isFullReload = false,
    dateFilter = 'today',
    isInitialLoad = false,
    selectors
) {
    localSelectors = selectors; // Atualiza referência local
    // --- INÍCIO SONDA ---
    console.log('[SONDA fetchData] Iniciando...', { isFullReload, dateFilter });
    // --- FIM SONDA ---

    if (isInitialLoad && isFullReload && localSelectors.tableContainer) {
        localSelectors.tableContainer.innerHTML =
            '<div class="dashboard-loader"><span class="material-symbols-rounded is-loading">hourglass_top</span><span>Carregando pedidos...</span></div>';
    }

    try {
        let data;
        let ordersChanged = false;

        if (isFullReload) {
            data = await api.fetchInitialData(dateFilter);
            // --- INÍCIO SONDA ---
            console.log(
                `[SONDA fetchData] Dados recebidos (full reload, filter=${dateFilter}):`,
                JSON.parse(JSON.stringify(data))
            );
            state.allOrders = Array.isArray(data.orders) ? data.orders : [];
            if (!Array.isArray(data.orders)) {
                console.warn(
                    '[SONDA fetchData] Atenção: API não retornou um array para data.orders em full reload.'
                );
            }
            // --- FIM SONDA ---
            state.allStatuses = data.statuses || [];
            state.allEntregadores = data.entregadores || [];
            // --- INÍCIO DA MODIFICAÇÃO (Subtarefa 3) ---
            state.allPaymentMethods = data.payment_methods_map || {}; // Salva o mapa (slug => Nome)
            state.allPaymentMethodsData = data.payment_methods_data || []; // Salva o array [ {slug, title, categoria} ]
            // --- FIM DA MODIFICAÇÃO ---
            state.lastCheckTimestamp = data.server_timestamp;
            ordersChanged = true;

            if (isInitialLoad && localSelectors.statusFilterContainer) {
                ui.renderStatusFilter(); // Renderiza os elementos do filtro
                filters.loadFiltersFromSession(localSelectors); // Carrega filtros salvos e aplica na UI
                filters.attachFilterPanelListeners(localSelectors); // Adiciona listeners ao painel
            }
        } else {
            data = await api.fetchUpdatedData(state.lastCheckTimestamp);
            // --- INÍCIO SONDA ---
            console.log(
                '[SONDA fetchData] Atualizações recebidas:',
                JSON.parse(JSON.stringify(data))
            );
            // --- FIM SONDA ---
            const updatedOrders = data.updated_orders || [];
            const deletedOrderIds = data.deleted_order_ids || [];

            if (deletedOrderIds.length > 0) {
                const originalLength = state.allOrders.length;
                state.allOrders = state.allOrders.filter(
                    (order) => !deletedOrderIds.includes(String(order.id))
                );
                if (state.allOrders.length !== originalLength) {
                    ordersChanged = true;
                }
            }

            if (updatedOrders.length > 0) {
                ordersChanged = true;
                updatedOrders.forEach((updatedOrder) => {
                    const updatedOrderId = String(updatedOrder.id);
                    const existingIndex = state.allOrders.findIndex(
                        (order) => String(order.id) == updatedOrderId
                    );
                    if (existingIndex > -1) {
                        if (
                            JSON.stringify(state.allOrders[existingIndex]) !==
                            JSON.stringify(updatedOrder)
                        ) {
                            state.allOrders[existingIndex] = updatedOrder;
                        }
                    } else {
                        state.allOrders.push(updatedOrder); // Adiciona novo
                    }
                });
                // --- INÍCIO SONDA ---
                const newOrdersAdded = updatedOrders.some(
                    (newOrder) =>
                        !state.allOrders.find(
                            (existingOrder) =>
                                String(existingOrder.id) === String(newOrder.id)
                        )
                );
                if (newOrdersAdded) {
                    console.log(
                        '[SONDA fetchData] Novos pedidos adicionados, reordenando state.allOrders...'
                    );
                    state.allOrders.sort((a, b) => b.id - a.id);
                } else {
                    console.log(
                        '[SONDA fetchData] Apenas atualizações, sem reordenar state.allOrders.'
                    );
                }
                // --- FIM SONDA ---
            }
            state.lastCheckTimestamp = data.server_timestamp;
            if (!ordersChanged) {
                // Mesmo sem mudanças, chama applyFiltersAndRender para garantir que notificações sejam atualizadas
                filters.applyFiltersAndRender(localSelectors, false); // Passa false para não limpar a tabela desnecessariamente
                console.log(
                    '[SONDA fetchData] Nenhuma alteração detectada nas atualizações.'
                );
                return;
            }
        }

        // --- INÍCIO SONDA ---
        console.log(
            '[SONDA fetchData] state.allOrders atualizado:',
            JSON.parse(JSON.stringify(state.allOrders))
        );
        // --- FIM SONDA ---
        filters.applyFiltersAndRender(localSelectors, true); // True para forçar re-renderização completa da tabela visível
    } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
        if (error && error.status === 403) {
            console.warn(
                'Erro 403 detectado. Tentando redirecionar para login...'
            );
            const loginUrl = window.nativaDeliveryData?.login_url;
            if (loginUrl) {
                window.location.href = loginUrl;
                return; // Impede a exibição da mensagem de erro abaixo
            } else {
                console.error(
                    'URL de login não encontrada em window.nativaDeliveryData. Exibindo erro padrão.'
                );
                if (
                    isInitialLoad &&
                    isFullReload &&
                    localSelectors.tableContainer
                ) {
                    localSelectors.tableContainer.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">Falha ao carregar pedidos: Sessão inválida ou expirada. Por favor, <a href="javascript:location.reload();">recarregue a página</a> para fazer login.</p>`;
                }
            }
        } else {
            // Exibe erro genérico apenas na carga inicial completa
            if (
                isInitialLoad &&
                isFullReload &&
                localSelectors.tableContainer
            ) {
                localSelectors.tableContainer.innerHTML = `<p style="color: red; text-align: center; padding: 20px;">Falha ao carregar pedidos: ${error.message}</p>`;
            }
        }
        // Retorna uma Promise rejeitada para que o chamador saiba que houve erro
        throw error; // Re-lança o erro
    }
}
