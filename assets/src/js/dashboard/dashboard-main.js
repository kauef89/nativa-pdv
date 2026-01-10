// js/dashboard/dashboard-main.js

/**
 * Ponto de entrada que inicializa o dashboard de pedidos.
 * ATUALIZADO: Nomenclatura ajustada para refletir o novo escopo.
 * CORREÇÃO (Multi-Entry): Adiciona a chamada de auto-execução para 'init()'
 * para que o dashboard seja inicializado quando este arquivo for usado
 * como o ponto de entrada (entry point) do Vite.
 */
import { init as initHandlers } from './dashboard-handlers.js';
// --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO DE IMPORTAÇÃO) ---
import { showToast } from '../utils/nativa-ui-helpers.js';
// --- FIM DA MODIFICAÇÃO ---

export function init() {
    // --- INÍCIO DA MODIFICAÇÃO ---
    // A mensagem de log foi atualizada para "Dashboard de Pedidos".
    showToast('Dashboard de Pedidos v3.1 Carregado', 'success');
    // --- FIM DA MODIFICAÇÃO ---
    initHandlers();
    console.log('Dashboard de Pedidos inicializado com sucesso.');
}

// --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO Multi-Entry) ---
// Auto-executa a inicialização quando este script é carregado
// na página /pedidos/, garantindo que o DOM esteja pronto.
document.addEventListener('DOMContentLoaded', () => {
    // Verifica se o elemento principal do dashboard existe
    if (document.getElementById('pedidos-app')) {
        init();
    }
});
// --- FIM DA MODIFICAÇÃO ---
