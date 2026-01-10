/**
 * Módulo para exibir o Cardápio Digital de Mesa (SVG).
 */

export function init() {
    console.log('[Table Menu] Inicializando cardápio de mesa...');

    // 1. Verifica se o container principal existe, se não, cria.
    let tableMenuSection = document.getElementById('table-menu-section');
    if (!tableMenuSection) {
        const appContainer = document.getElementById('nativa-app-container');
        if (appContainer) {
            tableMenuSection = document.createElement('section');
            tableMenuSection.id = 'table-menu-section';
            tableMenuSection.className = 'nativa-page-section';
            appContainer.appendChild(tableMenuSection);
        }
    }

    // 2. Renderiza o conteúdo (SVG) se ainda não estiver lá
    if (tableMenuSection && tableMenuSection.innerHTML.trim() === '') {
        // Substitua pelo caminho real do seu arquivo SVG
        const svgUrl =
            '/wp-content/plugins/nativa-delivery/assets/images/cardapio-mesa.svg';

        tableMenuSection.innerHTML = `
            <div class="table-menu-container fade-in">
                <div class="table-menu-header">
                    <button class="nativa-icon-button" onclick="history.back()">
                        <span class="material-symbols-rounded">arrow_back</span>
                    </button>
                    <h2>Cardápio Digital</h2>
                </div>
                <div class="table-menu-content">
                    <img src="${svgUrl}" alt="Cardápio Completo" class="table-menu-svg">
                </div>
                <div class="table-menu-actions">
                    <a href="/cardapio" data-route="/cardapio" class="nativa-button-primary">
                        Fazer Pedido Agora
                    </a>
                </div>
            </div>
        `;
    }
}
