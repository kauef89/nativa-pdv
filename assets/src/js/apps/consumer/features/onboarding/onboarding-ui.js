// apps/consumer/features/onboarding/onboarding-ui.js

import { maskCpf, maskPhone } from '@utils/validation.js';

export function renderOnboardingStep(stepNumber) {
    const contentContainer = document.getElementById(
        'nativa-onboarding-step-content'
    );
    const titleElement = document.getElementById('nativa-onboarding-title');
    const stepTextElement = document.getElementById(
        'nativa-onboarding-step-text'
    );
    const progressElement = document.getElementById(
        'nativa-onboarding-progress'
    );
    const backBtn = document.getElementById('nativa-onboarding-back-btn');
    const nextBtn = document.getElementById('nativa-onboarding-next-btn');

    // Limpa conteúdo anterior
    contentContainer.innerHTML = '';

    // Configuração base dos botões
    // MODIFICAÇÃO: Botão voltar sempre visível, mas desativado visualmente no início
    backBtn.style.display = 'block';
    if (stepNumber === 1) {
        backBtn.classList.add('is-visually-disabled');
    } else {
        backBtn.classList.remove('is-visually-disabled');
    }

    nextBtn.textContent = 'Continuar';
    nextBtn.classList.remove('is-loading');

    if (stepNumber === 1) {
        // --- PASSO 1: CPF & IDENTIFICAÇÃO ---
        titleElement.textContent = 'Vamos começar pelo seu CPF';
        stepTextElement.textContent = 'Passo 1 de 2';
        progressElement.value = 50;

        contentContainer.innerHTML = `
            <div class="nativa-onboarding-step">
                <p class="nativa-step-description">Digite seu CPF para localizarmos seu cadastro.</p>
                
                <div class="nativa-form-group">
                    <label for="onboarding-cpf">CPF</label>
                    <input type="tel" id="onboarding-cpf" name="onboarding-cpf" class="nativa-input" placeholder="000.000.000-00" maxlength="14" inputmode="numeric">
                </div>

                <div id="onboarding-cpf-result-container" style="display: none;">
                    
                    <div class="nativa-success-badge">
                        <span class="material-symbols-rounded">check_circle</span>
                        <span>Identidade Confirmada</span>
                    </div>

                    <div class="nativa-form-group">
                        <label for="onboarding-full-name">Nome Completo</label>
                        <input type="text" id="onboarding-full-name" name="onboarding-full-name" class="nativa-input is-locked" readonly>
                    </div>

                    <div class="nativa-form-group">
                        <label for="onboarding-dob-display">Data de Nascimento</label>
                        <input type="text" id="onboarding-dob-display" class="nativa-input is-locked" readonly>
                        <input type="hidden" id="onboarding-dob-day" name="onboarding-dob-day">
                        <input type="hidden" id="onboarding-dob-month" name="onboarding-dob-month">
                        <input type="hidden" id="onboarding-dob-year" name="onboarding-dob-year">
                    </div>
                </div>
            </div>
        `;

        // Máscara de CPF
        const cpfInput = document.getElementById('onboarding-cpf');
        if (cpfInput) {
            cpfInput.addEventListener('input', (e) => {
                maskCpf(e.target);
            });
        }
    } else if (stepNumber === 2) {
        // --- PASSO 2: CONTATO (WHATSAPP) ---
        titleElement.textContent = 'Seu contato';
        stepTextElement.textContent = 'Passo 2 de 2';
        progressElement.value = 100;
        nextBtn.textContent = 'Finalizar';

        contentContainer.innerHTML = `
            <div class="nativa-onboarding-step">
                <p class="nativa-step-description">Informe seu WhatsApp para receber atualizações do pedido.</p>
                
                <div class="nativa-form-group-split nativa-phone-group">
                    <div class="nativa-form-group ddd-group">
                        <label for="onboarding-phone-ddd">DDD</label>
                        <input type="tel" id="onboarding-phone-ddd" name="onboarding-phone-ddd" class="nativa-input" placeholder="XX" maxlength="2" inputmode="numeric">
                    </div>
                    <div class="nativa-form-group number-group">
                        <label for="onboarding-phone-number">WhatsApp</label>
                        <input type="tel" id="onboarding-phone-number" name="onboarding-phone-number" class="nativa-input" placeholder="90000-0000" maxlength="10" inputmode="numeric">
                    </div>
                </div>
            </div>
        `;

        // Máscara de Telefone
        const dddInput = document.getElementById('onboarding-phone-ddd');
        const phoneInput = document.getElementById('onboarding-phone-number');

        if (dddInput) {
            dddInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '');
                if (e.target.value.length === 2) phoneInput.focus();
            });
        }

        if (phoneInput) {
            phoneInput.addEventListener('input', (e) => {
                maskPhone(e.target);
            });
        }
    }
}
