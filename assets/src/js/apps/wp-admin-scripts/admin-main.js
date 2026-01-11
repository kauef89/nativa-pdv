// apps/wp-admin-scripts/admin-main.js

import { init } from './admin-scripts.js';

document.addEventListener('DOMContentLoaded', () => {
    // Inicializa a lógica dos scripts do admin.
    // Esta função contém os listeners para os botões de copiar, o gerador de cupom,
    // e o importador de CSV.
    init();

    console.log('Admin Dashboard: Módulos carregados e prontos.');
});
