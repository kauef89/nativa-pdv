/**
 * NOVO ARQUIVO (Refatorado de menu-ui.js)
 * Módulo de UI dedicado exclusivamente ao wizard de montagem de combos.
 */

import { formatPrice } from '../../utils/nativa-utils.js';
import { renderProductAddons } from '../addons/addons-logic.js';
import { openSheet } from '../../utils/nativa-ui-helpers.js';

// Objeto para armazenar os seletores do DOM do wizard.
const wizardSelectors = {};

/**
 * Atualiza a interface geral do wizard (título, progresso, botões, etc.).
 * @param {object} state - O estado atual do wizard.
 */
export function updateWizardUI(state) {
    const { currentStepIndex, flatSteps, editingCartItemKey } = state;
    wizardSelectors.stepText.textContent = `Passo ${currentStepIndex + 1} de ${
        flatSteps.length
    }`;
    wizardSelectors.progress.value =
        ((currentStepIndex + 1) / flatSteps.length) * 100;
    wizardSelectors.backButton.style.visibility =
        currentStepIndex > 0 ? 'visible' : 'hidden';
    wizardSelectors.nextButton.textContent =
        currentStepIndex === flatSteps.length - 1
            ? editingCartItemKey
                ? 'Atualizar'
                : 'Quero'
            : 'Continuar';

    // --- INÍCIO DA MODIFICAÇÃO: Lógica do sumário removida ---
    // O bloco de código que gerava o HTML do sumário e controlava sua
    // visibilidade foi completamente removido.
    // --- FIM DA MODIFICAÇÃO ---

    updateComboPriceDisplay(state);
}

/**
 * Atualiza o preço exibido no rodapé do wizard.
 * @param {object} state - O estado atual do wizard.
 */
export function updateComboPriceDisplay(state) {
    if (!state.currentComboData) return;
    let total = parseFloat(state.currentComboData.preco_base_manual || 0);
    state.userSelections.forEach((selection) => {
        if (selection && selection.selectedAddons) {
            for (const groupId in selection.selectedAddons) {
                const group = selection.selectedAddons[groupId];
                if (group.items) {
                    for (const itemIndex in group.items) {
                        const item = group.items[itemIndex];
                        total +=
                            (item.itemPrice || 0) * (item.itemQuantity || 1);
                    }
                }
            }
        }
    });
    const discount = parseFloat(state.currentComboData.desconto_em_valor || 0);

    const finalPrice = total - discount;
    const roundedPrice = Math.round(finalPrice * 100) / 100;

    if (wizardSelectors.footerPrice) {
        wizardSelectors.footerPrice.textContent = formatPrice(roundedPrice);
    }
}

/**
 * Renderiza o conteúdo do passo atual do wizard.
 * @param {object} state - O estado atual do wizard.
 */
export function renderWizardStep(state) {
    const { flatSteps, currentStepIndex, userSelections } = state;
    const stepData = flatSteps[currentStepIndex];
    if (!stepData) return;
    wizardSelectors.stepContent.innerHTML = `<h3 class="nativa-combo-step-title">${stepData.titulo}</h3>`;
    const productsContainer = document.createElement('div');
    productsContainer.className = 'nativa-combo-products-container';
    wizardSelectors.stepContent.appendChild(productsContainer);

    stepData.produtos_permitidos.forEach((productId) => {
        const product = window.nativaDeliveryData.products.find(
            (p) => p.id == productId
        );
        if (product) {
            const optionId = `combo-step-${currentStepIndex}-product-${productId}`;
            const optionWrapper = document.createElement('div');
            optionWrapper.className = 'nativa-combo-product-option';
            optionWrapper.innerHTML = `
                <input type="radio" id="${optionId}" name="combo-step-${currentStepIndex}" value="${productId}">
                <label for="${optionId}"><span class="product-name">${product.name}</span></label>
                <div class="nativa-combo-product-addons-container" data-product-id="${productId}" style="display: none;"></div>
            `;
            productsContainer.appendChild(optionWrapper);
        }
    });

    const currentSelection = userSelections[currentStepIndex];
    if (currentSelection && currentSelection.productId) {
        const selectedRadio = wizardSelectors.stepContent.querySelector(
            `input[value="${currentSelection.productId}"]`
        );
        if (selectedRadio) {
            selectedRadio.checked = true;
            const addonsContainer = selectedRadio
                .closest('.nativa-combo-product-option')
                .querySelector('.nativa-combo-product-addons-container');
            renderAddonsForSelectedProduct(
                currentSelection.productId,
                addonsContainer,
                state
            );
        }
    }
    updateWizardUI(state);
}

/**
 * Renderiza os adicionais para o produto selecionado no passo atual.
 * @param {number} productId - ID do produto.
 * @param {HTMLElement} container - O elemento onde os adicionais serão renderizados.
 * @param {object} state - O estado atual do wizard.
 */
export function renderAddonsForSelectedProduct(productId, container, state) {
    const product = window.nativaDeliveryData.products.find(
        (p) => p.id == productId
    );
    if (
        !product ||
        !product.adicional_groups ||
        product.adicional_groups.length === 0
    ) {
        container.innerHTML = '';
        container.style.display = 'none';
        return;
    }
    const wizardStepContext = {
        state: state.userSelections[state.currentStepIndex].selectedAddons,
        onUpdate: () => updateComboPriceDisplay(state),
        containerElement: container,
        isCombo: true, // Adiciona a flag para identificar o contexto do combo.
    };
    renderProductAddons(product.adicional_groups, container, wizardStepContext);
    container.style.display = 'block';
}

/**
 * Inicializa os seletores e exibe a ficha do wizard.
 * @param {object} state - O estado atual do wizard.
 */
export function initAndShowWizard(state) {
    wizardSelectors.sheet = document.getElementById(
        'nativa-combo-wizard-sheet'
    );
    wizardSelectors.title = document.getElementById(
        'nativa-combo-wizard-title'
    );
    wizardSelectors.stepText = document.getElementById(
        'nativa-combo-wizard-step-text'
    );
    wizardSelectors.progress = document.getElementById(
        'nativa-combo-wizard-progress'
    );
    wizardSelectors.stepContent = document.getElementById(
        'nativa-combo-wizard-step-content'
    );
    wizardSelectors.backButton = document.getElementById(
        'nativa-combo-wizard-back-btn'
    );
    wizardSelectors.nextButton = document.getElementById(
        'nativa-combo-wizard-next-btn'
    );
    wizardSelectors.footerPrice = document.getElementById(
        'nativa-combo-wizard-price'
    );
    // --- INÍCIO DA MODIFICAÇÃO: Seletor do sumário removido ---
    // wizardSelectors.summaryContainer = document.getElementById(
    //     'nativa-combo-wizard-summary'
    // );
    // --- FIM DA MODIFICAÇÃO ---

    if (!wizardSelectors.sheet || !wizardSelectors.title) {
        console.error(
            'Elementos essenciais do Combo Wizard não foram encontrados no DOM.'
        );
        return;
    }

    const contentContainer = wizardSelectors.sheet.querySelector(
        '.nativa-bottom-sheet-content'
    );
    if (contentContainer) {
        contentContainer.classList.add('is-content-driven-height');
    }

    const { currentComboData } = state;
    if (!currentComboData) return;

    const wizardHeader = wizardSelectors.sheet.querySelector(
        '.nativa-combo-wizard-header'
    );
    if (wizardHeader) {
        const existingImg = wizardHeader.querySelector(
            '.nativa-category-image'
        );
        if (existingImg) existingImg.remove();

        const comboProductData = window.nativaDeliveryData.products.find(
            (p) => p.id == currentComboData.id
        );
        if (comboProductData) {
            const categorySlug = comboProductData.category_slug;
            const categoryData = window.nativaDeliveryData.categories.find(
                (c) => c.slug === categorySlug
            );

            if (categoryData && categoryData.image_url) {
                const img = document.createElement('img');
                img.src = categoryData.image_url;
                img.alt = `Imagem da categoria ${comboProductData.category_name}`;
                img.className = 'nativa-category-image';
                img.width = 80;
                img.height = 80;
                wizardHeader.prepend(img);
            }
        }
    }

    wizardSelectors.title.textContent = `Montando: ${currentComboData.title}`;
    openSheet(wizardSelectors.sheet);
    renderWizardStep(state);
}
