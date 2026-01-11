// apps/pdv/features/orders-manager/dashboard-state.js

export const state = {
    allOrders: [],
    allStatuses: [],
    allEntregadores: [],
    // --- INÍCIO DA MODIFICAÇÃO (Fase 3 Pagamentos) ---
    allPaymentMethods: {}, // Armazenará o mapa (slug => Nome) vindo da API
    // --- INÍCIO DA MODIFICAÇÃO (Subtarefa 2) ---
    allPaymentMethodsData: [], // Armazenará o array de objetos [slug, title, categoria]
    // --- FIM DA MODIFICAÇÃO ---
    // --- FIM DA MODIFICAÇÃO ---
    lastCheckTimestamp: null,
    activeTooltip: null,
    refreshInterval: null,
    isAutoRefreshActive: false,
    // --- NEW ---
    currentFilteredOrders: [], // Pedidos que correspondem aos filtros atuais
    currentlyDisplayedOrders: [], // Subconjunto de pedidos filtrados atualmente exibidos
    // --- END NEW ---
};
