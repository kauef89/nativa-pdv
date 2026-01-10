// js/utils/welcome-sheet.js

/**
 * Módulo para gerenciar a ficha de boas-vindas e o consentimento de cookies.
 * ATUALIZADO: A verificação de path foi alterada de '/entregas' para '/pedidos'
 * para impedir que o tutorial do cliente apareça no dashboard de pedidos.
 */
import { openSheet, closeSheet } from './nativa-ui-helpers.js';

const STORAGE_KEY = 'nativaWelcomeSheetSeen';

/**
 * Verifica se o usuário já viu e dispensou a ficha de boas-vindas.
 * @returns {boolean} - Retorna true se a flag estiver no localStorage, caso contrário, false.
 */
function hasSeenWelcomeSheet() {
    return localStorage.getItem(STORAGE_KEY) === 'true';
}

/**
 * Define a flag no localStorage para indicar que a ficha foi vista e não deve ser mostrada novamente.
 */
function setWelcomeSheetSeen() {
    localStorage.setItem(STORAGE_KEY, 'true');
}

/**
 * Popula e abre a ficha de conteúdo legal (Termos e Privacidade).
 * @param {string} contentId - O identificador do conteúdo ('terms' ou 'privacy').
 */
function showLegalSheet(contentId) {
    const legalSheet = document.getElementById('nativa-legal-sheet');
    const titleEl = document.getElementById('nativa-legal-sheet-title');
    const contentEl = document.getElementById('nativa-legal-sheet-content');

    const legalData = window.nativaDeliveryData?.legalPages?.[contentId];

    if (legalSheet && titleEl && contentEl && legalData) {
        titleEl.textContent = legalData.title;
        contentEl.innerHTML = legalData.content;
        openSheet(legalSheet);
    } else {
        console.error(
            `Conteúdo legal para '${contentId}' não encontrado em window.nativaDeliveryData.legalPages`
        );
    }
}

/**
 * Inicializa a funcionalidade da ficha de boas-vindas, que também serve como banner de cookies.
 */
export function initWelcomeSheet() {
    // --- INÍCIO DA MODIFICAÇÃO ---
    // Previne a execução no dashboard interno de pedidos.
    if (window.location.pathname.includes('/pedidos')) {
        return;
    }
    // --- FIM DA MODIFICAÇÃO ---

    const welcomeSheet = document.getElementById('nativa-welcome-sheet');
    if (!welcomeSheet) return;

    if (hasSeenWelcomeSheet()) {
        return;
    }

    setTimeout(() => {
        openSheet(welcomeSheet);
    }, 1500);

    const handleDismiss = (event) => {
        const target = event.target;
        const acceptBtn = target.closest('#nativa-welcome-accept-btn');
        const closeBtn = target.closest('.nativa-bottom-sheet-close');
        const overlay = target.matches('.nativa-bottom-sheet');

        if (acceptBtn || closeBtn || overlay) {
            setWelcomeSheetSeen();
            closeSheet(welcomeSheet);
            return;
        }

        const legalLink = target.closest('.legal-link');
        if (legalLink) {
            event.preventDefault();
            const contentId = legalLink.dataset.contentId;
            if (contentId) {
                showLegalSheet(contentId);
            }
        }
    };

    if (!welcomeSheet.dataset.listenerAttached) {
        welcomeSheet.addEventListener('click', handleDismiss);
        welcomeSheet.dataset.listenerAttached = 'true';
    }
}
