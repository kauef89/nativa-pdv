// apps/pdv/features/orders-manager/dashboard-filters.js

import * as loadMore from './dashboard-load-more.js';
import * as notifications from './dashboard-notifications.js';
import { state } from './dashboard-state.js';
import * as ui from './dashboard-ui.js';

const FILTERS_STORAGE_KEY = 'nativaPedidosFilters';

/**
 * Salva os filtros atuais na sessionStorage.
 * @param {object} selectors - Referências aos elementos do DOM.
 */
export function saveFiltersToSession(selectors) {
    const statusCheckboxes = selectors.statusFilterContainer?.querySelectorAll(
        'input[data-filter-type="status"]:checked'
    );
    const modalityCheckboxes =
        selectors.statusFilterContainer?.querySelectorAll(
            'input[data-filter-type="modality"]:checked'
        );
    const dateButtonActive =
        selectors.dateFilterGroup?.querySelector('.is-active');
    const searchInput = selectors.searchTermInput;

    const selectedStatuses = statusCheckboxes
        ? [...statusCheckboxes].map((cb) => cb.value)
        : [];
    let selectedModalities = modalityCheckboxes
        ? [...modalityCheckboxes].map((cb) => cb.value)
        : [];

    // CORREÇÃO: Lógica simplificada para remover 'else if' duplicado/inalcançável
    // Se "Todas" estiver selecionado OU nada estiver selecionado, define como ['all']
    if (selectedModalities.includes('all') || selectedModalities.length === 0) {
        selectedModalities = ['all'];
    }
    // O bloco 'else if' anterior era inalcançável porque a condição includes('all')
    // já era capturada pelo 'if' acima.

    const selectedDateFilter = dateButtonActive?.dataset.filter || 'today';
    const searchTerm = searchInput?.value || '';

    const filters = {
        statuses: selectedStatuses,
        modalities: selectedModalities,
        date: selectedDateFilter,
        search: searchTerm,
    };
    try {
        sessionStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch (e) {
        console.error('Erro ao salvar filtros na sessionStorage:', e);
    }
}

/**
 * Carrega os filtros da sessionStorage e aplica na UI.
 * @param {object} selectors - Referências aos elementos do DOM.
 * @returns {object|null} Os filtros carregados ou null.
 */
export function loadFiltersFromSession(selectors) {
    const savedFiltersJson = sessionStorage.getItem(FILTERS_STORAGE_KEY);
    if (!savedFiltersJson) return null;
    try {
        const savedFilters = JSON.parse(savedFiltersJson);
        console.log(
            '[SONDA _loadFiltersFromSession] Filtros carregados:',
            JSON.parse(JSON.stringify(savedFilters))
        );

        // Aplica filtro de data na UI
        if (savedFilters.date && selectors.dateFilterGroup) {
            selectors.dateFilterGroup
                .querySelectorAll('.nativa-toggle-button')
                .forEach((btn) => {
                    btn.classList.toggle(
                        'is-active',
                        btn.dataset.filter === savedFilters.date
                    );
                });
        } else if (selectors.dateFilterGroup) {
            // Garante default 'today'
            selectors.dateFilterGroup
                .querySelectorAll('.nativa-toggle-button')
                .forEach((btn) => {
                    btn.classList.toggle(
                        'is-active',
                        btn.dataset.filter === 'today'
                    );
                });
        }

        // Aplica filtros de status e modalidade na UI (se o painel existir)
        if (selectors.statusFilterContainer) {
            selectors.statusFilterContainer
                .querySelectorAll('input[data-filter-type="status"]')
                .forEach((cb) => {
                    cb.checked =
                        savedFilters.statuses?.includes(cb.value) ?? false;
                });
            const modalitiesToLoad = savedFilters.modalities ?? ['all'];
            const loadAll = modalitiesToLoad.includes('all');
            selectors.statusFilterContainer
                .querySelectorAll('input[data-filter-type="modality"]')
                .forEach((cb) => {
                    if (cb.value === 'all') {
                        cb.checked = loadAll;
                    } else {
                        cb.checked =
                            !loadAll && modalitiesToLoad.includes(cb.value);
                    }
                });
            handleModalityAllToggle(null, selectors); // Aplica lógica 'all' na UI
        }

        // Aplica termo de busca na UI
        if (selectors.searchTermInput) {
            selectors.searchTermInput.value = savedFilters.search || '';
        }

        return savedFilters; // Retorna os filtros carregados
    } catch (e) {
        console.error('Erro ao carregar filtros da sessão:', e);
        sessionStorage.removeItem(FILTERS_STORAGE_KEY);
        return null;
    }
}

/**
 * Aplica os filtros atuais aos pedidos e renderiza a tabela.
 * @param {object} selectors - Referências aos elementos do DOM.
 * @param {boolean} fullTableRender - Se a tabela deve ser limpa antes de renderizar.
 */
export function applyFiltersAndRender(selectors, fullTableRender = true) {
    console.log('[SONDA applyFiltersAndRender] Iniciando...');
    if (
        !selectors.statusFilterContainer ||
        !selectors.dateFilterGroup ||
        !selectors.searchTermInput
    ) {
        console.warn(
            'Elementos de filtro não encontrados, pulando aplicação de filtros.'
        );
        state.currentFilteredOrders = [...state.allOrders].sort(
            (a, b) => b.id - a.id
        );
        console.log(
            '[SONDA applyFiltersAndRender] Sem controles de filtro, usando state.allOrders:',
            JSON.parse(JSON.stringify(state.currentFilteredOrders))
        );
        state.currentlyDisplayedOrders = state.currentFilteredOrders.slice(
            0,
            loadMore.BATCH_SIZE
        );
        if (selectors.tableContainer) {
            ui.renderOrdersTable(state.currentlyDisplayedOrders, true);
        }
        loadMore.renderLoadMoreButton(selectors);
        notifications.handlePendingOrderNotifications(
            state.currentFilteredOrders
        );
        return;
    }

    // Coleta os filtros da UI
    const statusCheckboxes = selectors.statusFilterContainer.querySelectorAll(
        'input[data-filter-type="status"]:checked'
    );
    const modalityCheckboxes = selectors.statusFilterContainer.querySelectorAll(
        'input[data-filter-type="modality"]:checked'
    );
    const searchTerm = selectors.searchTermInput.value.toLowerCase().trim();
    const uiDateFilter =
        selectors.dateFilterGroup?.querySelector('.is-active')?.dataset
            .filter || 'default';
    console.log(
        '[SONDA applyFiltersAndRender] Filtro de data da UI:',
        uiDateFilter
    );

    const selectedStatuses = [...statusCheckboxes].map((cb) => cb.value);
    let selectedModalities = [...modalityCheckboxes].map((cb) => cb.value);

    if (selectedModalities.includes('all') || selectedModalities.length === 0) {
        selectedModalities = ['all']; // Internamente, 'all' representa sem filtro de modalidade
    }
    console.log('[SONDA applyFiltersAndRender] Filtros aplicados:', {
        selectedStatuses,
        selectedModalities,
        searchTerm,
    });
    console.log(
        '[SONDA applyFiltersAndRender] state.allOrders ANTES de filtrar:',
        JSON.parse(JSON.stringify(state.allOrders))
    );

    // Aplica os filtros ao array `state.allOrders`
    state.currentFilteredOrders = state.allOrders
        .filter((order) => {
            if (!order || !order.details) return false;

            // Filtro de Status
            const statusMatch =
                selectedStatuses.length === 0 || // Mostra todos se nenhum status selecionado
                selectedStatuses.includes(order.status);

            // Filtro de Modalidade
            const modalityMatch =
                selectedModalities.includes('all') || // Mostra todos se 'all' selecionado
                selectedModalities.includes(order.details.pedido_tipo_servico);

            // Filtro de Busca (Nome, ID, Telefone)
            const customerFirstName = (order.customer_name || '')
                .split(' ')[0]
                .toLowerCase();
            const rawPhone = (
                order.details.pedido_whatsapp_cliente || ''
            ).replace(/\D/g, '');
            const searchMatch =
                !searchTerm || // Mostra todos se busca vazia
                customerFirstName.includes(searchTerm) ||
                String(order.id).includes(searchTerm) ||
                rawPhone.includes(searchTerm);

            return statusMatch && modalityMatch && searchMatch;
        })
        .sort((a, b) => b.id - a.id); // Ordena por ID decrescente

    console.log(
        '[SONDA applyFiltersAndRender] state.currentFilteredOrders DEPOIS de filtrar:',
        JSON.parse(JSON.stringify(state.currentFilteredOrders))
    );

    // Define o lote inicial para exibição
    state.currentlyDisplayedOrders = state.currentFilteredOrders.slice(
        0,
        loadMore.BATCH_SIZE
    );
    console.log(
        '[SONDA applyFiltersAndRender] state.currentlyDisplayedOrders (batch inicial):',
        JSON.parse(JSON.stringify(state.currentlyDisplayedOrders))
    );

    // Renderiza a tabela (limpando ou não)
    if (selectors.tableContainer) {
        ui.renderOrdersTable(state.currentlyDisplayedOrders, fullTableRender);
    } else {
        console.error(
            '[SONDA applyFiltersAndRender] Erro: selectors.tableContainer não encontrado para renderizar a tabela.'
        );
    }

    // Atualiza o botão "Carregar Mais"
    loadMore.renderLoadMoreButton(selectors);
    // Salva os filtros aplicados
    saveFiltersToSession(selectors);
    // Atualiza notificações (som, título da página)
    notifications.handlePendingOrderNotifications(state.currentFilteredOrders);
}

/**
 * Gerencia a lógica de seleção do checkbox "Todas" modalidades.
 * @param {HTMLInputElement|null} clickedCheckbox - O checkbox que foi clicado.
 * @param {object} selectors - Referências aos elementos do DOM.
 */
export function handleModalityAllToggle(clickedCheckbox = null, selectors) {
    const panel = selectors.statusFilterContainer?.querySelector(
        '.status-filter-dropdown-panel'
    );
    if (!panel) return;

    const allCheckbox = panel.querySelector('#modality-all');
    const specificCheckboxes = panel.querySelectorAll(
        'input[data-filter-type="modality"]:not(#modality-all)'
    );

    if (!allCheckbox) return;

    let shouldRecheck = false; // Flag para reavaliar no final

    if (clickedCheckbox === allCheckbox) {
        // Clicou em 'Todas'
        if (allCheckbox.checked) {
            // Marcou 'Todas': desmarca os outros
            specificCheckboxes.forEach((cb) => {
                if (cb.checked) {
                    cb.checked = false;
                    shouldRecheck = true; // Mudou o estado de outros
                }
            });
        } else {
            // Desmarcou 'Todas': força a remarcação (não pode ficar sem seleção)
            allCheckbox.checked = true;
        }
    } else if (
        clickedCheckbox &&
        clickedCheckbox.dataset.filterType === 'modality'
    ) {
        // Clicou em um específico
        if (clickedCheckbox.checked) {
            // Marcou um específico: desmarca 'Todas'
            if (allCheckbox.checked) {
                allCheckbox.checked = false;
                shouldRecheck = true;
            }
        } else {
            // Desmarcou um específico, precisa verificar se sobrou algum
            shouldRecheck = true;
        }
    } else if (!clickedCheckbox) {
        // Chamada inicial (loadFiltersFromSession), apenas garante a consistência
        shouldRecheck = true;
    }

    // Verificação final: Garante que 'Todas' seja marcado se nenhum específico estiver
    if (shouldRecheck) {
        const anySpecificChecked = [...specificCheckboxes].some(
            (cb) => cb.checked
        );
        // Se NENHUM específico está marcado E 'Todas' NÃO está marcado => marca 'Todas'
        if (!anySpecificChecked && !allCheckbox.checked) {
            allCheckbox.checked = true;
        }
        // Se ALGUM específico está marcado E 'Todas' ESTÁ marcado => desmarca 'Todas' (redundante com a lógica acima, mas seguro)
        else if (anySpecificChecked && allCheckbox.checked) {
            allCheckbox.checked = false;
        }
    }
}

/**
 * Adiciona o listener de 'change' ao painel de filtros.
 * @param {object} selectors - Referências aos elementos do DOM.
 */
export function attachFilterPanelListeners(selectors) {
    const panel = selectors.statusFilterContainer?.querySelector(
        '.status-filter-dropdown-panel'
    );
    if (!panel) return;

    // Remove listener antigo para evitar duplicação
    panel.removeEventListener('change', handleFilterChange); // Usa uma função nomeada
    // Adiciona o novo listener
    panel.addEventListener('change', handleFilterChange);
}

/**
 * Handler para o evento 'change' no painel de filtros.
 * @param {Event} e - O evento change.
 */
function handleFilterChange(e) {
    // Precisa dos seletores aqui dentro também ou passar como argumento
    // Por simplicidade, vamos buscar novamente
    const localSelectors = {
        statusFilterContainer: document.getElementById(
            'status-filter-container'
        ),
        dateFilterGroup: document.getElementById('date-filter-group'),
        searchTermInput: document.getElementById('search-term'),
        tableContainer: document.getElementById('pedidos-table-container'),
    };

    const checkbox = e.target.closest('input.filter-checkbox');
    if (checkbox) {
        if (checkbox.dataset.filterType === 'modality') {
            handleModalityAllToggle(checkbox, localSelectors);
        }
        // Aplica os filtros e renderiza novamente a tabela completa
        applyFiltersAndRender(localSelectors, true);
    }
}
