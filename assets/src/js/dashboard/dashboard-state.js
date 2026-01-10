/**
 * Módulo para centralizar o estado da aplicação do dashboard de pedidos.
 * As variáveis de estado são exportadas para serem importadas em outros módulos.
 * ATUALIZAÇÃO: Adiciona currentFilteredOrders e currentlyDisplayedOrders.
 * ATUALIZAÇÃO (Fase 3 Pagamentos): Adiciona 'allPaymentMethods' para armazenar o mapa de CPTs de pagamento.
 */
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