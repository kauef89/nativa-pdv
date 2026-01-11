// apps / consumer / router.js;

('use strict');

import * as menuModule from '@shared/features/menu/menu-main.js';
import { updateActiveNavItem } from '@utils/ui-helpers.js';
import * as myAccountModule from './pages/account/my-account-main.js';
import * as checkoutModule from './pages/checkout/checkout-main.js';
import * as homeModule from './pages/home/home.js';

let navigateTo;

const validRoutes =
    (window.nativaDeliveryData && window.nativaDeliveryData.spa_routes) || [];
console.log(
    '[ROUTER] Rotas válidas recebidas do backend:',
    JSON.parse(JSON.stringify(validRoutes))
);
let isInitialized = false;

// --- INÍCIO DA MODIFICAÇÃO ---
const routeToSectionIdMap = {
    '/cardapio': 'cardapio-section',
    '/checkout': 'checkout-section',
    '/minha-conta': 'my-account-section',
    '/login': 'my-account-section',
    '/meus-enderecos': 'my-account-section',
    '/fidelidade': 'fidelidade-section',
    '/privacidade': 'legal-section', // Adicionado
    '/termos': 'legal-section', // Adicionado
    default: 'home-section',
};
// --- FIM DA MODIFICAÇÃO ---

navigateTo = async function (path) {
    console.log(`[ROUTER] Tentando navegar para: "${path}"`);

    const url = new URL(path, window.location.origin);
    const pathname = url.pathname;

    const cleanPath =
        pathname.endsWith('/') && pathname.length > 1
            ? pathname.slice(0, -1)
            : pathname;

    const finalPath = validRoutes.includes(cleanPath) ? cleanPath : '/';

    const appContainer = document.getElementById('nativa-app-container');
    if (!appContainer) {
        console.error(
            '[ROUTER] Erro crítico: Container #nativa-app-container não encontrado.'
        );
        return;
    }

    document.dispatchEvent(
        new CustomEvent('nativa:routeChanged', { detail: { path: finalPath } })
    );

    const sections = appContainer.querySelectorAll('.nativa-page-section');
    const targetSectionId =
        routeToSectionIdMap[finalPath] || routeToSectionIdMap.default;

    console.log(
        `[ROUTER] Rota final: "${finalPath}", Seção alvo: "${targetSectionId}"`
    );

    let targetFound = false;
    sections.forEach((section) => {
        if (section.id === targetSectionId) {
            section.style.display = 'block';
            targetFound = true;
        } else {
            section.style.display = 'none';
        }
    });

    if (!targetFound) {
        console.error(
            `[ROUTER] Seção alvo "${targetSectionId}" não foi encontrada no DOM!`
        );
    }

    try {
        let pageModule;
        switch (finalPath) {
            case '/cardapio':
                pageModule = menuModule;
                break;
            case '/checkout':
                pageModule = checkoutModule;
                break;
            // --- INÍCIO DA MODIFICAÇÃO ---
            case '/minha-conta':
            case '/login':
            case '/meus-enderecos':
            case '/fidelidade':
            case '/privacidade': // Adicionado
            case '/termos': // Adicionado
                pageModule = myAccountModule;
                break;
            // --- FIM DA MODIFICAÇÃO ---
            default:
                pageModule = homeModule;
                break;
        }

        if (pageModule && typeof pageModule.init === 'function') {
            pageModule.init();
        }
    } catch (error) {
        console.error(
            `[ROUTER] Falha ao carregar o módulo para a rota "${finalPath}":`,
            error
        );
    }

    if (typeof updateActiveNavItem === 'function') {
        updateActiveNavItem(finalPath);
    }

    window.scrollTo(0, 0);
};

/**
 * Manipula cliques em links e botões para roteamento dentro da SPA.
 * @param {Event} event - O evento de clique.
 */
function handleLinkClick(event) {
    // 1. Prioriza links que possuem o atributo `data-route`.
    const link = event.target.closest('[data-route]');

    // 2. Se não encontrar, ou se for um clique com modificador (botão direito, ctrl+clique, etc.), deixa o navegador seguir o comportamento padrão.
    if (
        !link ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey
    ) {
        return;
    }

    // 3. Pega o caminho do atributo `data-route`.
    const path = link.dataset.route;

    // 4. Valida se o caminho é uma rota conhecida pela SPA.
    const cleanPath =
        path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
    const finalPath = cleanPath === '' ? '/' : cleanPath; // Trata o caso da home ("/")

    if (validRoutes.includes(finalPath)) {
        // 5. Previne o recarregamento da página ou a ação padrão do link/botão.
        event.preventDefault();

        // 6. Navega para a nova rota se ela for diferente da atual.
        if (window.location.pathname !== path) {
            history.pushState({ path }, '', path);
            navigateTo(path);
        }
    }
}

function init() {
    if (window.location.pathname.startsWith('/pedidos')) {
        console.log(
            '[ROUTER] Página de pedidos detectada. Roteador da SPA não será inicializado.'
        );
        return;
    }

    if (isInitialized) {
        return;
    }
    isInitialized = true;

    console.log('[ROUTER] Inicializando o roteador Nativa Delivery...');
    document.body.addEventListener('click', handleLinkClick);

    window.addEventListener('popstate', (e) => {
        const path =
            e.state && e.state.path ? e.state.path : window.location.pathname;
        navigateTo(path);
    });

    navigateTo(window.location.pathname);
}

export const Router = {
    init,
    navigateTo,
};
