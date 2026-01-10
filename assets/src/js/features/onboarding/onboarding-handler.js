// js/features/onboarding/onboarding-handler.js
// VERSÃO DEBUG: Sondas para rastrear validação de telefone

import { state } from '../../core/main-state.js';
import * as api from '../../core/nativa-api-service.js';
import {
    openSheet,
    closeSheet,
    showToast,
    showSpinner,
    hideSpinner,
} from '../../utils/nativa-ui-helpers.js';
import { renderOnboardingStep } from './onboarding-ui.js';
import {
    isValidCpf,
    validatePhoneInputs,
    updateValidationUI,
} from '../../utils/form-validation.js';
import { handleOpenAddressForm } from '../address/address-handler.js';

// Estado local
let currentStep = 1;
let isCpfConfirmed = false;
let cachedCpfData = null;

const STORAGE_KEY = 'nativa_onboarding_state';

function saveState() {
    let previousState = {};
    try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        if (saved) previousState = JSON.parse(saved);
    } catch (e) {}

    const cpfEl = document.getElementById('onboarding-cpf');
    const dddEl = document.getElementById('onboarding-phone-ddd');
    const phoneEl = document.getElementById('onboarding-phone-number');

    const stateToSave = {
        currentStep,
        isCpfConfirmed,
        cachedCpfData,
        tempCpf: cpfEl ? cpfEl.value : previousState.tempCpf || '',
        tempDdd: dddEl ? dddEl.value : previousState.tempDdd || '',
        tempPhone: phoneEl ? phoneEl.value : previousState.tempPhone || '',
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
}

function loadState() {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved) {
        try {
            return JSON.parse(saved);
        } catch (e) {
            return null;
        }
    }
    return null;
}

function clearState() {
    sessionStorage.removeItem(STORAGE_KEY);
    currentStep = 1;
    isCpfConfirmed = false;
    cachedCpfData = null;
}

export function init(needsDob = true) {
    const sheet = document.getElementById('nativa-onboarding-sheet');
    if (!sheet) return;

    const savedState = loadState();

    if (savedState) {
        currentStep = savedState.currentStep || 1;
        isCpfConfirmed = savedState.isCpfConfirmed || false;
        cachedCpfData = savedState.cachedCpfData || null;
    } else {
        currentStep = 1;
        isCpfConfirmed = false;
        cachedCpfData = null;
    }

    renderOnboardingStep(currentStep);

    const nextBtn = document.getElementById('nativa-onboarding-next-btn');
    const backBtn = document.getElementById('nativa-onboarding-back-btn');

    // Clona para remover listeners antigos e garantir "fresh start"
    const newNextBtn = nextBtn.cloneNode(true);
    const newBackBtn = backBtn.cloneNode(true);

    nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);
    backBtn.parentNode.replaceChild(newBackBtn, backBtn);

    newNextBtn.addEventListener('click', handleNextClick);
    newBackBtn.addEventListener('click', handleBackClick);

    // Lógica de restauração de estado (passo 1)
    if (currentStep === 1 && isCpfConfirmed && cachedCpfData) {
        setTimeout(() => {
            const cpfInput = document.getElementById('onboarding-cpf');
            if (cpfInput && savedState.tempCpf) {
                cpfInput.value = savedState.tempCpf;
                cpfInput.disabled = true;
            }
            populateCpfResults(cachedCpfData);

            const nBtn = document.getElementById('nativa-onboarding-next-btn');
            if (nBtn) nBtn.textContent = 'Confirmar dados';
        }, 50);
    }

    // Lógica de restauração de estado (passo 2)
    if (currentStep === 2 && savedState) {
        setTimeout(() => {
            const dddInput = document.getElementById('onboarding-phone-ddd');
            const phoneInput = document.getElementById(
                'onboarding-phone-number'
            );
            if (dddInput) dddInput.value = savedState.tempDdd || '';
            if (phoneInput) phoneInput.value = savedState.tempPhone || '';
        }, 50);
    }

    sheet.addEventListener('input', () => {
        saveState();
    });

    openSheet(sheet);
}

async function handleNextClick() {
    const nextBtn = document.getElementById('nativa-onboarding-next-btn');
    const backBtn = document.getElementById('nativa-onboarding-back-btn');

    // --- LÓGICA PASSO 1 (CPF) ---
    if (currentStep === 1) {
        const cpfInput = document.getElementById('onboarding-cpf');
        const cpfValue = cpfInput.value.replace(/\D/g, '');

        if (!isCpfConfirmed) {
            if (!isValidCpf(cpfInput)) {
                showToast('Por favor, insira um CPF válido.', 'error');
                cpfInput.focus();
                return;
            }

            if (cachedCpfData && cachedCpfData.ni === cpfValue) {
                populateCpfResults(cachedCpfData);
                isCpfConfirmed = true;
                nextBtn.textContent = 'Confirmar dados';
                saveState();
                return;
            }

            showSpinner(nextBtn);
            cpfInput.disabled = true;

            try {
                const data = await api.fetchCpfData(cpfValue);
                data.ni = cpfValue;
                cachedCpfData = data;

                populateCpfResults(data);
                isCpfConfirmed = true;

                nextBtn.textContent = 'Confirmar dados';
                saveState();
            } catch (error) {
                console.error(error);
                showToast(
                    error.message || 'CPF não encontrado ou inválido.',
                    'error'
                );
                cpfInput.disabled = false;
                cpfInput.focus();
            } finally {
                hideSpinner(nextBtn);
            }
            return;
        } else {
            currentStep++;
            renderOnboardingStep(currentStep);
            saveState();
            return;
        }
    }

    // --- LÓGICA PASSO 2 (CONTATO) ---
    if (currentStep === 2) {
        console.group('🔍 [ONBOARDING] Validação de Telefone');
        const dddInput = document.getElementById('onboarding-phone-ddd');
        const numberInput = document.getElementById('onboarding-phone-number');

        if (!dddInput || !numberInput) {
            console.error('❌ Inputs de telefone não encontrados no DOM.');
            console.groupEnd();
            return;
        }

        const ddd = dddInput.value;
        const number = numberInput.value;
        console.log('1. Valores:', { ddd, number });

        const validation = validatePhoneInputs(ddd, number);
        console.log('2. Resultado da Validação:', validation);

        if (!validation.isValid) {
            console.warn('⚠️ Validação falhou:', validation.message);
            showToast(validation.message, 'error');

            const targetInput =
                validation.target === 'ddd' ? dddInput : numberInput;

            console.log('3. Aplicando erro visual em:', targetInput);
            updateValidationUI(targetInput, false);
            targetInput.focus();

            targetInput.addEventListener(
                'input',
                function () {
                    console.log('4. Usuário corrigindo...');
                    updateValidationUI(this, true); // Limpa erro
                },
                { once: true }
            );

            console.groupEnd();
            return;
        }
        console.log('✅ Validação OK. Prosseguindo...');
        console.groupEnd();

        showSpinner(nextBtn);

        const payload = new URLSearchParams();

        payload.append('onboarding-phone-ddd', ddd);
        payload.append('onboarding-phone-number', number.replace(/\D/g, ''));

        const savedState = loadState();

        const cpfToSend =
            cachedCpfData && cachedCpfData.ni
                ? cachedCpfData.ni
                : savedState?.tempCpf || '';

        const dobDate = cachedCpfData?.dob || '';
        const fullNameToSend = cachedCpfData?.name || '';

        payload.append('onboarding-cpf', cpfToSend);
        payload.append('onboarding-full-name', fullNameToSend);

        if (dobDate) {
            const [year, month, day] = dobDate.split('-');
            payload.append('onboarding-dob-day', day);
            payload.append('onboarding-dob-month', month);
            payload.append('onboarding-dob-year', year);
        }

        if (!cpfToSend) {
            showToast(
                'Erro: CPF perdido. Por favor, volte e confirme o CPF.',
                'error'
            );
            hideSpinner(nextBtn);
            return;
        }

        try {
            await api.completeOnboardingData(payload.toString());

            if (!state.user.profile) state.user.profile = {};
            state.user.profile.phone = ddd + number.replace(/\D/g, '');

            clearState();
            closeSheet(document.getElementById('nativa-onboarding-sheet'));
            showToast('Cadastro concluído com sucesso!', 'success');

            document.dispatchEvent(
                new CustomEvent('nativa:onboardingCompleted')
            );

            if (state.selectedModality === 'delivery') {
                setTimeout(() => {
                    handleOpenAddressForm('checkout');
                }, 500);
            }
        } catch (error) {
            console.error('❌ Erro no envio API:', error);
            showToast(error.message || 'Erro ao salvar dados.', 'error');
        } finally {
            hideSpinner(nextBtn);
        }
    }
}

function handleBackClick() {
    const nextBtn = document.getElementById('nativa-onboarding-next-btn');
    const backBtn = document.getElementById('nativa-onboarding-back-btn');

    if (currentStep === 1 && isCpfConfirmed) {
        isCpfConfirmed = false;

        const resultContainer = document.getElementById(
            'onboarding-cpf-result-container'
        );
        const cpfInput = document.getElementById('onboarding-cpf');

        if (resultContainer) resultContainer.style.display = 'none';

        if (cpfInput) {
            cpfInput.disabled = false;
            cpfInput.focus();
        }

        nextBtn.textContent = 'Continuar';
        backBtn.classList.add('is-visually-disabled');

        saveState();
    } else if (currentStep > 1) {
        currentStep--;
        renderOnboardingStep(currentStep);

        if (currentStep === 1 && isCpfConfirmed && cachedCpfData) {
            setTimeout(() => {
                const cpfInput = document.getElementById('onboarding-cpf');
                const savedState = loadState();
                if (cpfInput && savedState?.tempCpf) {
                    cpfInput.value = savedState.tempCpf;
                    cpfInput.disabled = true;
                }
                populateCpfResults(cachedCpfData);

                const nBtn = document.getElementById(
                    'nativa-onboarding-next-btn'
                );
                if (nBtn) nBtn.textContent = 'Confirmar dados';
            }, 50);
        }

        saveState();
    }
}

function populateCpfResults(data) {
    const resultContainer = document.getElementById(
        'onboarding-cpf-result-container'
    );
    const nameInput = document.getElementById('onboarding-full-name');
    const dobDisplayInput = document.getElementById('onboarding-dob-display');

    const dayInput = document.getElementById('onboarding-dob-day');
    const monthInput = document.getElementById('onboarding-dob-month');
    const yearInput = document.getElementById('onboarding-dob-year');

    if (nameInput) nameInput.value = data.name;

    if (data.dob && dobDisplayInput) {
        const [year, month, day] = data.dob.split('-');
        dobDisplayInput.value = `${day}/${month}/${year}`;

        if (dayInput) dayInput.value = day;
        if (monthInput) monthInput.value = month;
        if (yearInput) yearInput.value = year;
    }

    if (resultContainer) resultContainer.style.display = 'flex';

    const backBtn = document.getElementById('nativa-onboarding-back-btn');
    if (backBtn) {
        backBtn.classList.remove('is-visually-disabled');
    }
}
