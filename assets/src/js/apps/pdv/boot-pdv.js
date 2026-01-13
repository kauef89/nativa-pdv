/**
 * assets/src/js/apps/pdv/boot-pdv.js
 * Ponto de entrada principal para a aplicação PDV.
 *
 * Responsabilidade:
 * 1. Importar estilos.
 * 2. Inicializar o Módulo Principal (Main).
 */

// 1. Importação de Estilos (Vite processa isso)
import '../../../styles/pdv/main.css';

// 2. Importação da Lógica Principal
// ATENÇÃO: Importamos apenas initPdv. As outras funções (switchView, etc)
// são expostas globalmente em window.pdvApp pelo próprio initPdv.
import { initPdv } from './pdv-main.js';

// 3. Inicialização Segura
const onReady = () => {
    console.log('[Boot PDV] DOM Carregado. Iniciando App...');
    initPdv();
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
} else {
    onReady();
}
