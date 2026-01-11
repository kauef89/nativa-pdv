// apps/pdv/features/orders-manager/dashboard-main.js

import { showToast } from '@utils/ui-helpers.js';
import { init as initHandlers } from './dashboard-handlers.js';

export function init() {
    // --- INÍCIO DA MODIFICAÇÃO ---
    // A mensagem de log foi atualizada para "Dashboard de Pedidos".
    showToast('Dashboard de Pedidos v3.1 Carregado', 'success');
    // --- FIM DA MODIFICAÇÃO ---
    initHandlers();
    console.log('Dashboard de Pedidos inicializado com sucesso.');
}
