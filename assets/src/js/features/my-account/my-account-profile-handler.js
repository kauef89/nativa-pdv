// js/features/my-account/my-account-profile-handler.js

/**
 * Módulo para lidar com as ações do usuário relacionadas ao perfil na página "Minha Conta".
 * VERSÃO V3 (NUCLEAR): Sondas de carregamento + Remoção forçada de listeners antigos via clonagem de nó.
 */

// SONDA DE CARREGAMENTO (Deve aparecer assim que a página carregar/script for importado)
console.log(
    '🚀 [LOAD] Módulo Profile Handler Carregado (V3) - ' +
        new Date().toLocaleTimeString()
);

import { state } from '../../core/main-state.js';
import * as api from '../../core/nativa-api-service.js';
import { renderRewardsSheet } from './my-account-rewards-ui.js';
import { initializeMyAccount } from './my-account-data-manager.js';
import {
    showSpinner,
    hideSpinner,
    openSheet,
    closeSheet,
    showToast,
    checkPWAInstallAndProceed,
} from '../../utils/nativa-ui-helpers.js';
import { showModal } from '../../utils/modal.js';
import {
    maskPhone,
    validatePhoneInputs,
    updateValidationUI,
} from '../../utils/form-validation.js';
import { openProductDetails } from '../product-sheet/product-sheet-logic.js';
import { handleModalitySheetDisplay } from '../cart/cart-handlers.js';

// --- Função de Submit (Lógica de Negócio) ---
export async function handlePhoneEditSubmit(form) {
    console.group('🔍 [EXEC] handlePhoneEditSubmit (V3)');

    const button = form.querySelector('button[type="submit"]');
    const dddInput = form.querySelector('#phone-edit-input-ddd');
    const numberInput = form.querySelector('#phone-edit-input-number');

    if (!dddInput || !numberInput) {
        console.error('❌ Inputs não encontrados');
        console.groupEnd();
        return;
    }

    const dddValue = dddInput.value;
    const numberValue = numberInput.value;

    console.log('1. Validando:', { ddd: dddValue, number: numberValue });

    const validation = validatePhoneInputs(dddValue, numberValue);

    if (!validation.isValid) {
        console.warn('⚠️ Validação falhou:', validation.message);
        showToast(validation.message, 'error'); // Toast específico deve aparecer aqui

        const targetInput =
            validation.target === 'ddd' ? dddInput : numberInput;
        updateValidationUI(targetInput, false); // Classe is-error deve ser aplicada aqui
        targetInput.focus();

        targetInput.addEventListener(
            'input',
            function () {
                updateValidationUI(this, true);
                const formGroup = this.closest('.nativa-form-group');
                if (formGroup) formGroup.classList.remove('is-error');
            },
            { once: true }
        );

        console.groupEnd();
        return;
    }

    console.log('✅ Validação OK. Enviando API...');
    const fullPhoneNumber = dddInput.value + numberInput.value;

    showSpinner(button);
    try {
        const result = await api.updateMyPhone(fullPhoneNumber);
        state.user.profile.phone = result.phone;
        await initializeMyAccount(true);
        closeSheet(document.getElementById('nativa-phone-edit-sheet'));
        showToast(result.message, 'success');
    } catch (error) {
        console.error('❌ Erro API:', error);
        showToast(error.message || 'Erro ao atualizar.', 'error');
    } finally {
        hideSpinner(button);
        console.groupEnd();
    }
}

export async function handleDeleteAccount() {
    const confirmation = await showModal({
        title: 'Excluir conta',
        iconName: 'person_remove',
        message:
            'Esta ação é irreversível e irá apagar permanentemente sua conta, incluindo seu histórico de pedidos e pontos de fidelidade.\n\nDeseja realmente continuar?',
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        isCritical: true,
    });

    if (confirmation) {
        try {
            const result = await api.deleteMyAccount();
            showToast(result.message, 'success');
            sessionStorage.clear();
            localStorage.removeItem('nativa_push_subscription');
            setTimeout(() => {
                window.location.href = '/';
            }, 1500);
        } catch (error) {
            showToast(error.message || 'Erro ao excluir conta.', 'error');
        }
    }
}

export async function handleOpenRewardsSheet() {
    try {
        const rewardsData = await api.getAvailableRewards();
        if (!state.user) state.user = {};
        state.user.rewards = rewardsData;
        renderRewardsSheet(rewardsData.user_points, rewardsData.rewards);
        const sheet = document.getElementById('nativa-rewards-sheet');
        if (sheet) openSheet(sheet);
    } catch (error) {
        console.error('Erro ao carregar recompensas:', error);
        showToast('Não foi possível carregar as recompensas.', 'error');
    }
}

export async function handleRedeemRewardClick(productId) {
    const shouldProceed = await checkPWAInstallAndProceed();
    if (!shouldProceed) return;

    const rewardsSheet = document.getElementById('nativa-rewards-sheet');
    const reward = state.user?.rewards?.rewards.find(
        (r) => r.product_id == productId
    );

    if (!reward) {
        showToast('Detalhes da recompensa não encontrados.', 'error');
        return;
    }

    const product = window.nativaDeliveryData.products.find(
        (p) => p.id == productId
    );
    if (!product) {
        showToast('Produto de recompensa não encontrado.', 'error');
        return;
    }

    if (!state.selectedModality) {
        if (rewardsSheet) closeSheet(rewardsSheet);
        const pendingRewardItem = {
            product_id: reward.product_id,
            is_reward: true,
            product_name: product.name,
            quantity: 1,
            total_item_price: 0,
        };
        sessionStorage.setItem(
            'nativaPendingRewardItem',
            JSON.stringify([pendingRewardItem])
        );
        state.menu.afterModalityAction = null;
        setTimeout(() => {
            handleModalitySheetDisplay();
        }, 300);
        return;
    }

    try {
        const latestAccountData = await api.getMyAccountData();
        const userHasEnoughPoints =
            latestAccountData.loyaltyPoints >= reward.points_cost;

        if (!userHasEnoughPoints) {
            showToast('Pontos insuficientes.', 'error');
            handleOpenRewardsSheet();
            return;
        }

        if (rewardsSheet) closeSheet(rewardsSheet);
        setTimeout(() => {
            openProductDetails(product, null, null, null, reward);
        }, 300);
    } catch (error) {
        showToast('Erro ao verificar recompensa.', 'error');
    }
}

// --- CONFIGURAÇÃO DA UI DO MODAL ---
export function handleOpenPhoneEditSheet() {
    console.log('🚀 [EXEC] handleOpenPhoneEditSheet chamado (V3)');

    const phoneSheet = document.getElementById('nativa-phone-edit-sheet');
    if (!phoneSheet) {
        console.error(
            '❌ Modal #nativa-phone-edit-sheet não encontrado no DOM'
        );
        return;
    }

    // 1. Localiza o form original
    const originalForm = phoneSheet.querySelector('form');
    let form = originalForm;

    // --- OPÇÃO NUCLEAR: Substituição do Nó para Remover Listeners Antigos ---
    if (originalForm) {
        console.log(
            '☢️ [NUCLEAR] Substituindo elemento <form> para remover listeners antigos...'
        );
        const newForm = originalForm.cloneNode(true); // Clona o form e seus filhos
        originalForm.parentNode.replaceChild(newForm, originalForm); // Substitui no DOM
        form = newForm; // Atualiza referência
    } else {
        console.error('❌ Elemento <form> não encontrado dentro do modal.');
        return;
    }

    // 2. Preenche os dados (agora buscando inputs DENTRO do novo form)
    const phoneDddInput = form.querySelector('#phone-edit-input-ddd');
    const phoneNumberInput = form.querySelector('#phone-edit-input-number');
    const phone = state.user.profile.phone || '';

    if (phone.length === 11) {
        phoneDddInput.value = phone.substring(0, 2);
        phoneNumberInput.value = phone.substring(2);
    } else {
        phoneDddInput.value = '';
        phoneNumberInput.value = '';
    }

    // 3. Re-aplica máscaras (necessário pois cloneNode não copia event listeners de inputs)
    if (phoneNumberInput) {
        // Remove listener antigo (se houver, por segurança)
        phoneNumberInput.removeEventListener('input', maskPhone);
        // Adiciona novo
        phoneNumberInput.addEventListener('input', () =>
            maskPhone(phoneNumberInput)
        );
    }

    // 4. Anexa o Listener de Submit (Agora garantido ser o ÚNICO)
    console.log('🔌 [WIRING] Anexando listener de submit V3...');
    form.setAttribute('novalidate', true); // Desativa validação nativa do browser

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopImmediatePropagation(); // Garante prioridade máxima
        console.log('⚡ [EVENT] Submit interceptado V3!');
        handlePhoneEditSubmit(e.target);
    });

    // 5. Botão Cancelar (Fora do form, mas dentro do sheet)
    const cancelButton = phoneSheet.querySelector(
        '#nativa-phone-edit-cancel-btn'
    );
    if (cancelButton) {
        // Truque do clone também para o botão cancelar, para evitar múltiplos clicks
        const newCancel = cancelButton.cloneNode(true);
        cancelButton.parentNode.replaceChild(newCancel, cancelButton);
        newCancel.addEventListener('click', () => closeSheet(phoneSheet));
    }

    openSheet(phoneSheet);
}
