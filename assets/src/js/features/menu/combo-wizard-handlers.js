// js/features/menu/combo-wizard-handlers.js

/**
 * NOVO ARQUIVO: Isola toda a lógica de manipulação do wizard de montagem de combos.
 * ... (histórico de versões anterior) ...
 * ATUALIZAÇÃO (UX): Garante que a modalidade de serviço selecionada pelo usuário
 * seja lida do sessionStorage, evitando que a ficha de seleção apareça
 * desnecessariamente ao iniciar a montagem de um combo.
 * ATUALIZAÇÃO (UX): Remove a verificação de modalidade ao iniciar o wizard. A verificação
 * agora é responsabilidade da ação de adicionar ao carrinho.
 * NOVO (PWA Check): Adiciona verificação para exigir instalação PWA antes de adicionar ao carrinho.
 */

import { state } from '../../core/main-state.js';
import { initAndShowWizard, renderWizardStep } from './combo-wizard-ui.js';
import { addComboToCart } from '../../core/nativa-api-service.js';
import {
    showToast,
    showSpinner,
    hideSpinner,
    flyToCart,
    closeAllSheets,
    openSheet,
    closeSheet,
    // --- INÍCIO DA MODIFICAÇÃO ---
    checkPWAInstallAndProceed, // Importa a nova função
    // --- FIM DA MODIFICAÇÃO ---
} from '../../utils/nativa-ui-helpers.js';
import { validateAddonSelections } from '../addons/addons-validation.js';
import { handleModalitySheetDisplay } from '../cart/cart-handlers.js';

function generateFlatWizardSteps(combo) {
    const generatedSteps = [];
    if (!combo || !combo.passos_do_combo) return [];
    combo.passos_do_combo.forEach((passoConfig) => {
        const qty = parseInt(passoConfig.quantidade, 10) || 1;
        for (let i = 0; i < qty; i++) {
            generatedSteps.push({
                titulo: `${passoConfig.passo_titulo}${qty > 1 ? ` (${i + 1}/${qty})` : ''}`,
                produtos_permitidos: passoConfig.produtos_permitidos,
                stepConfig: passoConfig,
            });
        }
    });
    return generatedSteps;
}

/**
 * Tenta inicializar e exibir o wizard do combo com um atraso.
 * Isso resolve a corrida de condição onde o DOM ainda não está totalmente pronto.
 */
function _tryInitAndShowWizard(attempts = 0) {
    const sheet = document.getElementById('nativa-combo-wizard-sheet');
    const MAX_ATTEMPTS = 5;

    if (sheet) {
        initAndShowWizard(state.menu);
    } else if (attempts < MAX_ATTEMPTS) {
        setTimeout(() => _tryInitAndShowWizard(attempts + 1), 200);
    } else {
        console.error(
            'Não foi possível encontrar a ficha do combo após várias tentativas.'
        );
        showToast(
            'Ocorreu um erro ao carregar o combo. Por favor, tente novamente.',
            'error'
        );
    }
}

export function initFromMenu(cardElement) {
    state.menu.lastClickedCardElement = cardElement;
    const comboId = cardElement.dataset.comboId;
    state.menu.currentComboData = window.nativaDeliveryData.comboSteps[comboId];

    if (!state.menu.currentComboData) {
        console.error(
            `Dados do combo com ID ${comboId} não encontrados em window.nativaDeliveryData.comboSteps`
        );
        showToast(
            'Ocorreu um erro ao carregar os detalhes deste combo.',
            'error'
        );
        return;
    }

    state.menu.flatSteps = generateFlatWizardSteps(state.menu.currentComboData);
    state.menu.userSelections = state.menu.flatSteps.map(() => ({
        productId: null,
        selectedAddons: {},
    }));
    state.menu.currentStepIndex = 0;
    state.menu.editingCartItemKey = null;

    _tryInitAndShowWizard();
}

export function initFromCartForEdit(cartItem, cartKey) {
    const comboId = cartItem.combo_id;
    state.menu.currentComboData = window.nativaDeliveryData.comboSteps[comboId];

    if (!state.menu.currentComboData) {
        showToast(
            'Não foi possível encontrar os dados deste combo para edição.',
            'error'
        );
        return;
    }

    state.menu.flatSteps = generateFlatWizardSteps(state.menu.currentComboData);
    state.menu.userSelections = JSON.parse(JSON.stringify(cartItem.selections));
    state.menu.currentStepIndex = 0;
    state.menu.editingCartItemKey = cartKey;

    _tryInitAndShowWizard();
}

export function handleRadioChange(e) {
    const productId = e.target.value;
    state.menu.userSelections[state.menu.currentStepIndex].selectedAddons = {};
    state.menu.userSelections[state.menu.currentStepIndex].productId =
        productId;
    renderWizardStep(state.menu);
}

export async function handleNextStep() {
    const currentSelection =
        state.menu.userSelections[state.menu.currentStepIndex];
    if (!currentSelection || !currentSelection.productId) {
        showToast('Por favor, selecione uma opção para continuar.', 'error');
        return;
    }

    const selectedProduct = window.nativaDeliveryData.products.find(
        (p) => p.id == currentSelection.productId
    );
    if (!selectedProduct) {
        showToast('Erro: Produto selecionado não encontrado.', 'error');
        return;
    }

    const productOptionElement = document
        .querySelector(
            `#combo-step-${state.menu.currentStepIndex}-product-${selectedProduct.id}`
        )
        .closest('.nativa-combo-product-option');
    const addonContainerForValidation = productOptionElement.querySelector(
        '.nativa-combo-product-addons-container'
    );
    if (
        !validateAddonSelections(
            selectedProduct,
            currentSelection.selectedAddons,
            addonContainerForValidation
        )
    ) {
        return;
    }

    if (state.menu.currentStepIndex < state.menu.flatSteps.length - 1) {
        state.menu.currentStepIndex++;
        renderWizardStep(state.menu);
    } else {
        await finalizeAndAddToCart();
    }
}

async function finalizeAndAddToCart() {
    // --- INÍCIO DA MODIFICAÇÃO (PWA CHECK) ---
    // Verifica se está no PWA antes de prosseguir
    const shouldProceed = await checkPWAInstallAndProceed();
    if (!shouldProceed) {
        // Se a função retornar false, interrompe a adição do combo
        // O modal de instalação já foi tratado pela função auxiliar
        return;
    }
    // --- FIM DA MODIFICAÇÃO ---

    // A verificação de modalidade foi movida para esta função.
    if (!state.selectedModality) {
        state.selectedModality =
            sessionStorage.getItem('nativaDeliverySelectedModality') || null;
    }

    if (!state.selectedModality) {
        // Define uma ação específica para finalizar o combo após a seleção da modalidade.
        state.menu.afterModalityAction = 'finalize_combo_after_selection';

        // Fecha o assistente de combo atual antes de mostrar a seleção de modalidade.
        const wizardSheet = document.getElementById(
            'nativa-combo-wizard-sheet'
        );
        if (wizardSheet) {
            closeSheet(wizardSheet);
        }

        // Mostra a seleção de modalidade após um breve atraso.
        setTimeout(() => {
            handleModalitySheetDisplay();
        }, 300);

        return; // Interrompe a execução até que a modalidade seja escolhida.
    }

    const wizardNextButton = document.getElementById(
        'nativa-combo-wizard-next-btn'
    );
    showSpinner(wizardNextButton);

    const finalSelections = state.menu.userSelections.map((selection) => ({
        productId: selection.productId,
        productName:
            window.nativaDeliveryData.products.find(
                (p) => p.id == selection.productId
            )?.name || 'Produto',
        selectedAddons: selection.selectedAddons,
    }));

    let total = parseFloat(state.menu.currentComboData.preco_base_manual || 0);
    state.menu.userSelections.forEach((selection) => {
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
    const discount = parseFloat(
        state.menu.currentComboData.desconto_em_valor || 0
    );
    const finalPrice = total - discount;

    try {
        const resultData = await addComboToCart({
            combo_id: state.menu.currentComboData.id,
            combo_title: state.menu.currentComboData.title,
            selections: JSON.stringify(finalSelections),
            cart_item_key: state.menu.editingCartItemKey,
            total_item_price: finalPrice,
        });

        if (state.menu.lastClickedCardElement) {
            flyToCart(state.menu.lastClickedCardElement);
        }

        const newlyAddedItemData = {
            base_product_id: state.menu.currentComboData.id,
            name: state.menu.currentComboData.title,
            quantity: 1,
            addons: {
                is_combo_configuration: true,
                selections: finalSelections,
            },
            is_reward: false,
            is_offer_item: false,
        };

        const eventDetail = {
            ...resultData,
            showSuccessToast: true,
            toastMessage: state.menu.editingCartItemKey
                ? 'Combo atualizado!'
                : 'Combo adicionado!',
            newly_added_item_data: newlyAddedItemData,
        };

        document.dispatchEvent(
            new CustomEvent('nativa:cartUpdated', { detail: eventDetail })
        );

        setTimeout(() => closeAllSheets(), 800);
    } catch (error) {
        showToast(error.message, 'error');
    } finally {
        setTimeout(() => hideSpinner(wizardNextButton), 200);
    }
}

export function handlePreviousStep() {
    if (state.menu.currentStepIndex > 0) {
        state.menu.currentStepIndex--;
        renderWizardStep(state.menu);
    }
}

document.addEventListener('nativa:editComboFromCart', (event) => {
    if (event.detail) {
        const { itemToEdit, cartItemKey } = event.detail;
        initFromCartForEdit(itemToEdit, cartItemKey);
    }
});

document.addEventListener('nativa:modalityChanged', () => {
    if (state.menu.afterModalityAction === 'finalize_combo_after_selection') {
        state.menu.afterModalityAction = null; // Limpa a ação pendente
        finalizeAndAddToCart(); // Tenta adicionar o combo ao carrinho novamente
    }
});
