// js/features/menu/menu-main.js

/**
 * Ponto de entrada e registro de eventos para a página de Cardápio.
 * Refatorado para a sintaxe ES6 e uso de módulos.
 */

import * as MenuHandlers from './menu-handlers.js';
import { MenuUI } from './menu-ui.js';
import * as ComboWizardHandler from './combo-wizard-handlers.js';
import { state } from '../../core/main-state.js';
// --- INÍCIO DA MODIFICAÇÃO ---
// A importação de 'initWelcomeSheet' foi removida.
// --- FIM DA MODIFICAÇÃO ---

let isMenuInitialized = false;

export function init() {
    if (isMenuInitialized) {
        return;
    }
    isMenuInitialized = true;

    // --- INÍCIO DA MODIFICAÇÃO ---
    // A chamada para initWelcomeSheet() foi removida.
    // --- FIM DA MODIFICAÇÃO ---

    const cardapioPageSection = document.getElementById('nativa-cardapio-page');
    if (!cardapioPageSection) {
        return;
    }

    MenuHandlers.handlePageLoad();
    MenuHandlers.setupProductListListener();

    const searchInput = document.getElementById('nativa-product-search');
    const wizardSheet = document.getElementById('nativa-combo-wizard-sheet');
    const categoryPillsContainer = cardapioPageSection.querySelector(
        '.nativa-category-pills-container'
    );

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const searchTerm = searchInput.value;
            MenuUI.filterMenuItems(
                searchTerm,
                'all',
                state.menu.isFavoriteFilterActive
            );
        });
    }

    if (categoryPillsContainer) {
        categoryPillsContainer.addEventListener('click', (event) => {
            const pill = event.target.closest('.nativa-category-pill');
            if (pill) {
                const categorySlug = pill.dataset.categorySlug;
                MenuHandlers.scrollToCategory(categorySlug);
            }
        });
    }

    // Atualiza os listeners do wizard para chamar o novo ComboWizardHandler
    if (wizardSheet) {
        const stepContent = document.getElementById(
            'nativa-combo-wizard-step-content'
        );
        const backButton = document.getElementById(
            'nativa-combo-wizard-back-btn'
        );
        const nextButton = document.getElementById(
            'nativa-combo-wizard-next-btn'
        );

        if (stepContent) {
            stepContent.addEventListener('change', (event) => {
                if (
                    event.target.type === 'radio' &&
                    event.target.name.startsWith('combo-step-')
                ) {
                    ComboWizardHandler.handleRadioChange(event);
                }
            });
        }
        if (backButton)
            backButton.addEventListener(
                'click',
                ComboWizardHandler.handlePreviousStep
            );
        if (nextButton)
            nextButton.addEventListener(
                'click',
                ComboWizardHandler.handleNextStep
            );
    }
}
