/**
 * Módulo de UI para renderizar os componentes de perfil e gerenciamento
 * na página "Minha Conta".
 * Refatorado para a arquitetura de módulos ES6.
 */

import {
    formatPhone,
    formatNumberWithThousandSeparator,
} from '../../utils/nativa-utils.js';
import { openSheet } from '../../utils/nativa-ui-helpers.js';

// ATUALIZADO: O objeto `selectors` continua sendo a base.
const selectors = {};

// Esta função agora será chamada assim que o módulo for carregado pela primeira vez.
function _initSelectors() {
    selectors.profile = {
        avatarPlaceholder: document.getElementById(
            'my-account-avatar-placeholder'
        ),
        firstName: document.getElementById('my-account-first-name'),
        // --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO DE SELETOR) ---
        // O ID foi corrigido de 'my-account-user-points' para 'my-account-points-value'
        // para corresponder ao ID real do elemento no HTML.
        points: document.getElementById('my-account-points-value'),
        // --- FIM DA MODIFICAÇÃO ---
    };
    selectors.management = {
        fullName: document.getElementById('manage-account-name'),
        email: document.getElementById('manage-account-email'),
        cpf: document.getElementById('manage-account-cpf'),
        dobDisplay: document.getElementById('manage-account-dob'),
        phoneValue: document.getElementById('manage-account-phone'),
    };
    selectors.phoneEditSheet = document.getElementById(
        'nativa-phone-edit-sheet'
    );
    selectors.phoneEditDddInput = document.getElementById(
        'phone-edit-input-ddd'
    );
    selectors.phoneEditNumberInput = document.getElementById(
        'phone-edit-input-number'
    );
}

// ATUALIZADO: A inicialização acontece imediatamente.
_initSelectors();

// ATUALIZADO: As funções agora são exportadas diretamente. O objeto MyAccountProfileUI e a função init() foram removidos.
export function renderProfileCard(data) {
    if (selectors.profile.avatarPlaceholder)
        selectors.profile.avatarPlaceholder.innerHTML = data.userAvatar || '';
    if (selectors.profile.firstName)
        selectors.profile.firstName.textContent =
            data.userFirstName || 'Cliente';
    if (selectors.profile.points) {
        selectors.profile.points.textContent =
            formatNumberWithThousandSeparator(data.loyaltyPoints || 0);
    }
}

export function renderManagementCard(data) {
    if (selectors.management.fullName)
        selectors.management.fullName.textContent =
            data.userName || 'Não informado';
    if (selectors.management.email)
        selectors.management.email.textContent =
            data.userEmail || 'Não informado';
    if (selectors.management.cpf)
        selectors.management.cpf.textContent =
            data.cpf || 'Aguardando preenchimento...';
    if (selectors.management.dobDisplay)
        selectors.management.dobDisplay.textContent =
            data.dateOfBirth || 'Não informado';
    if (selectors.management.phoneValue)
        selectors.management.phoneValue.textContent =
            formatPhone(data.phone) || 'Aguardando preenchimento...';
}

export function showPhoneEditSheet(currentPhone) {
    if (selectors.phoneEditSheet) {
        const phoneStr = (currentPhone || '').replace(/\D/g, '');
        if (selectors.phoneEditDddInput)
            selectors.phoneEditDddInput.value = phoneStr.substring(0, 2);
        if (selectors.phoneEditNumberInput)
            selectors.phoneEditNumberInput.value = phoneStr.substring(2);
        openSheet(selectors.phoneEditSheet);
    }
}
