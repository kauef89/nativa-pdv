// js/dashboard/dashboard-handlers.js

/**
 * Módulo que contém os manipuladores de eventos e a lógica principal do dashboard de pedidos.
 * ... (histórico de versões anterior) ...
 * CORREÇÃO: Garante que seletores e listeners para filtros e botões do header estejam corretos.
 * CORREÇÃO (TOAST): Corrige a exibição de toasts duplicados (sucesso/erro) ao copiar mensagens de erro.
 * CORREÇÃO (UI REFRESH): Garante que a tabela seja totalmente recarregada após qualquer ação que modifique um pedido (mudança de status, etc.), eliminando a necessidade de atualização manual da página.
 * ATUALIZAÇÃO (Real-time): Adiciona listener para BroadcastChannel para receber atualizações do Service Worker.
 * SONDA (Filtro Hoje): Adiciona logs para depurar o filtro "Hoje".
 * REATORAÇÃO (Módulos): Refatora o arquivo para ser o orquestrador principal,
 * delegando lógica para os módulos 'dashboard-actions', 'dashboard-fetch',
 * 'dashboard-filters', 'dashboard-notifications' e 'dashboard-load-more'.
 */

import { state } from './dashboard-state.js';
import * as ui from './dashboard-ui.js';
import * as api from './dashboard-api.js';
import { showToast } from '../utils/nativa-ui-helpers.js';

// --- INÍCIO DA MODIFICAÇÃO (REATORAÇÃO MÓDULOS) ---
// Importa os módulos especialistas
import * as actions from './dashboard-actions.js';
import * as filters from './dashboard-filters.js';
import * as notifications from './dashboard-notifications.js';
import * as loadMore from './dashboard-load-more.js';
import { fetchData } from './dashboard-fetch.js'; // Importa a função principal de busca
// --- FIM DA MODIFICAÇÃO ---

let isInitialLoad = true;
let lastPendingOrderIds = new Set();

// Objeto para guardar referências aos elementos do DOM
const selectors = {
    tableContainer: null,
    statusFilterContainer: null,
    searchTermInput: null,
    autoRefreshToggle: null,
    dateFilterGroup: null,
};

// --- INÍCIO DA MODIFICAÇÃO (REATORAÇÃO MÓDULOS) ---
// Funções de Notificação, Filtro e Busca (fetchData, applyFiltersAndRender, etc.)
// foram movidas para seus próprios módulos (dashboard-notifications.js,
// dashboard-filters.js, dashboard-fetch.js) e removidas daqui.
// --- FIM DA MODIFICAÇÃO ---

// --- Função toggleAutoRefresh ---
function toggleAutoRefresh() {
    if (!selectors.autoRefreshToggle) return;
    const buttonTextSpan =
        selectors.autoRefreshToggle.querySelector('.button-text');

    if (state.refreshInterval) {
        // Desativa o auto-refresh
        clearInterval(state.refreshInterval);
        state.refreshInterval = null;
        state.isAutoRefreshActive = false;
        selectors.autoRefreshToggle.classList.remove('active');
        selectors.autoRefreshToggle.title = 'Ativar atualização automática';
        if (buttonTextSpan) buttonTextSpan.textContent = 'Auto-Refresh';
        console.log('Auto-Refresh Desativado');
        notifications.handlePendingOrderNotifications(isInitialLoad); // Atualiza título
    } else {
        // Ativa o auto-refresh
        const currentFilter =
            selectors.dateFilterGroup?.querySelector('.is-active')?.dataset
                .filter || 'today';

        // Busca dados imediatamente ao ativar
        fetchData(false, currentFilter, false, selectors);

        // Define o intervalo
        state.refreshInterval = setInterval(
            () => fetchData(false, currentFilter, false, selectors),
            15000 // 15 segundos
        );
        state.isAutoRefreshActive = true;
        selectors.autoRefreshToggle.classList.add('active');
        selectors.autoRefreshToggle.title = 'Desativar atualização automática';
        if (buttonTextSpan) buttonTextSpan.textContent = 'Auto Ativo';
        console.log('Auto-Refresh Ativado');
        notifications.handlePendingOrderNotifications(isInitialLoad); // Atualiza título
    }
}
// --- FIM toggleAutoRefresh ---

// --- Função de Inicialização (init) ---
export const init = () => {
    // 1. Mapeia os seletores principais
    selectors.tableContainer = document.getElementById(
        'pedidos-table-container'
    );
    selectors.statusFilterContainer = document.getElementById(
        'status-filter-container'
    );
    selectors.searchTermInput = document.getElementById('search-term');
    selectors.autoRefreshToggle = document.getElementById(
        'auto-refresh-toggle'
    );
    selectors.dateFilterGroup = document.getElementById('date-filter-group');

    // 2. Inicializa o áudio de notificação
    notifications.initializeAudio();

    // 3. Carrega filtros salvos (se houver) e define o filtro de data inicial
    const savedFilters = filters.loadFiltersFromSession(selectors);
    const initialDateFilter = savedFilters?.date || 'today';

    // 4. Busca os dados iniciais
    // A função 'fetchData' agora é importada de 'dashboard-fetch.js'
    // Ela mesma vai chamar 'applyFiltersAndRender' (de 'dashboard-filters.js')
    // quando os dados chegarem.
    fetchData(true, initialDateFilter, true, selectors)
        .then(() => {
            // Callback de sucesso (se necessário, mas fetchData já cuida da renderização)
            if (isInitialLoad) isInitialLoad = false;
        })
        .catch((err) => {
            // Erro já tratado em fetchData, mas podemos logar aqui
            console.error('Falha na busca inicial de dados do dashboard:', err);
        });

    // 5. Anexa todos os listeners de eventos
    initializeEventListeners();

    // 6. Ativa o auto-refresh por padrão
    toggleAutoRefresh();

    // 7. Configura as notificações Push do dashboard
    notifications.setupPushNotifications();

    // 8. Inicializa o listener do BroadcastChannel
    // Passa a função de callback que deve ser executada ao receber uma mensagem
    notifications.initializeBroadcastChannelListener(() => {
        const currentFilter =
            selectors.dateFilterGroup?.querySelector('.is-active')?.dataset
                .filter || 'today';
        // Simplesmente busca por atualizações, sem recarregar tudo
        fetchData(false, currentFilter, false, selectors);
    });

    console.log('Dashboard Handlers Inicializado.');
};

// --- Função de Inicialização de Listeners (initializeEventListeners) ---
const initializeEventListeners = () => {
    // Listener para o painel de filtros (abrir/fechar)
    const filtersContainer = document.querySelector('.header-filters');
    if (filtersContainer) {
        filtersContainer.addEventListener('click', (e) => {
            const dropdownButton = e.target.closest(
                '.status-filter-dropdown-button'
            );
            if (dropdownButton) {
                const panel = dropdownButton.nextElementSibling;
                if (
                    panel &&
                    panel.classList.contains('status-filter-dropdown-panel')
                ) {
                    panel.classList.toggle('is-open');
                    dropdownButton.setAttribute(
                        'aria-expanded',
                        panel.classList.contains('is-open')
                    );
                }
            }
        });
    } else {
        console.warn("Container de filtros '.header-filters' não encontrado.");
    }

    // Listener para fechar o painel de filtros ao clicar fora
    document.addEventListener('click', (e) => {
        if (
            selectors.statusFilterContainer &&
            !selectors.statusFilterContainer.contains(e.target)
        ) {
            const panel = selectors.statusFilterContainer.querySelector(
                '.status-filter-dropdown-panel.is-open'
            );
            if (panel) {
                panel.classList.remove('is-open');
                const button = selectors.statusFilterContainer.querySelector(
                    '.status-filter-dropdown-button'
                );
                if (button) button.setAttribute('aria-expanded', 'false');
            }
        }
    });

    // Listener para o campo de busca
    selectors.searchTermInput?.addEventListener('input', () =>
        filters.applyFiltersAndRender(selectors, true)
    );

    // Listener para o botão de auto-refresh
    selectors.autoRefreshToggle?.addEventListener('click', toggleAutoRefresh);

    // Listener para os botões de filtro de data (Hoje/Todos)
    selectors.dateFilterGroup?.addEventListener('click', (e) => {
        const button = e.target.closest('.nativa-toggle-button');
        if (!button || button.classList.contains('is-active')) return;

        // Fecha tooltip ativo se houver
        if (state.activeTooltip && state.activeTooltip.row) {
            ui.toggleTooltip(state.activeTooltip.row);
        }

        // Atualiza UI dos botões
        selectors.dateFilterGroup
            .querySelectorAll('.nativa-toggle-button')
            .forEach((btn) => btn.classList.remove('is-active'));
        button.classList.add('is-active');
        const filterValue = button.dataset.filter;

        // Mostra o loader
        if (selectors.tableContainer) {
            selectors.tableContainer.innerHTML =
                '<div class="dashboard-loader"><span class="material-symbols-rounded is-loading">hourglass_top</span><span>Carregando pedidos...</span></div>';
        }

        lastPendingOrderIds.clear(); // Limpa o tracker de pedidos pendentes

        // Busca os dados (full reload) com o novo filtro de data
        fetchData(true, filterValue, false, selectors);
    });

    // Listener principal da tabela (para tooltips, selects e botões)
    if (selectors.tableContainer) {
        // Delegação de cliques na tabela
        selectors.tableContainer.addEventListener('click', async (e) => {
            const target = e.target;

            // 1. Ação: Copiar
            const copyElement = target.closest('[data-copy-text]');
            if (copyElement) {
                actions.handleCopyAction(copyElement); // Delega para o módulo de ações
                // Impede que o clique se propague e feche o tooltip
                if (copyElement.classList.contains('order-actions-button')) {
                    e.stopPropagation();
                    return;
                }
            }

            // 2. Ação: Botões do Tooltip (Mudar Status, Notificar, etc.)
            const actionButton = target.closest('.order-actions-button');
            if (actionButton) {
                e.stopPropagation(); // Impede que o clique feche o tooltip
                // --- INÍCIO DA MODIFICAÇÃO (BUG 3) ---
                // Delega a ação para o módulo de ações, passando os seletores E o objeto 'ui'
                await actions.handleTooltipAction(actionButton, selectors, ui); // 'ui' foi adicionado
                // --- FIM DA MODIFICAÇÃO ---
                return; // Encerra o handler
            }

            // 3. Ação: Abrir/Fechar Tooltip (clique na linha)
            const row = target.closest('tr[data-order-id]');
            if (row && !target.closest('select, a, button, input')) {
                ui.toggleTooltip(row);
            }
        });

        // Delegação de 'change' na tabela (para selects de Status e Entregador)
        selectors.tableContainer.addEventListener('change', async (e) => {
            const target = e.target;

            // 4. Ação: Mudar Status ou Entregador (Select)
            if (target.matches('.entregador-select, .status-select')) {
                // Delega a ação para o módulo de ações, passando os seletores
                await actions.handleTableSelectChange(target, selectors);
            }
        });
    } else {
        console.error(
            "Container da tabela '#pedidos-table-container' não encontrado para adicionar listeners."
        );
    }
};
