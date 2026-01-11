/**
 * assets/src/js/apps/pdv/boot-pdv.js
 * Ponto de entrada do Painel de Pedidos (PDV).
 * Conecta a Shell (pdv-logic) com o Motor de Pedidos (orders-manager).
 */

// 1. Importa a lógica da Shell (Layout, Sidebar, Modais Genéricos)
import {
    initPdv,
    switchView,
    closeClientModal,
    handleSearch,
    searchGovApi,
    resetClientModal,
    finalizeRegistration,
    selectClient,
    openClientModal,
    closeOptionsModal,
    confirmOptions,
    selectMethod,
    addPayment,
    finalizeOrder,
    openPaymentModal,
    closePaymentModal,
} from './pdv-logic.js';

// 2. Importa o Motor de Pedidos Existente (Dashboard de Delivery)
// Ajuste o caminho conforme sua estrutura real. Baseado no que você enviou:
import { init as initOrderManager } from './features/orders-manager/dashboard-main.js';

// Inicializa a aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    console.log('[Nativa PDV] Boot iniciado.');

    // A. Inicia a estrutura visual e navegação
    initPdv();

    // B. Inicia o gerenciador de pedidos (bater na API, renderizar tabela, sons, etc.)
    // Isso vai buscar os elementos que acabamos de colocar no delivery.php
    try {
        initOrderManager();
        console.log('[Nativa PDV] Gerenciador de Pedidos conectado.');
    } catch (e) {
        console.error('[Nativa PDV] Falha ao iniciar Order Manager:', e);
    }
});

// EXPORTAR GLOBALMENTE (Para o HTML acessar via onclick)
window.pdvApp = {
    initPdv,
    switchView,

    // Funções de Cliente
    closeClientModal,
    handleSearch,
    searchGovApi,
    resetClientModal,
    finalizeRegistration,
    selectClient,
    openClientModal,

    // Funções de Produto/Opções
    closeOptionsModal,
    confirmOptions,

    // Funções de Pagamento
    selectMethod,
    addPayment,
    finalizeOrder,
    openPaymentModal,
    closePaymentModal,
};

console.log('[Nativa PDV] Funções globais exportadas para window.pdvApp');
