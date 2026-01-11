// shared/utils/validation.js

import { showToast } from './ui-helpers.js';

/**
 * Atualiza a interface de um campo de formulário para refletir seu estado de validação.
 * @param {HTMLElement} element - O elemento do formulário (input, select, etc.).
 * @param {boolean} isValid - True se o campo for válido, false caso contrário.
 */
export const updateValidationUI = (element, isValid) => {
    if (!element) return;

    // 1. Aplica no INPUT (Borda vermelha direta)
    if (isValid) {
        element.classList.remove('is-error');
        element.classList.add('is-valid');
    } else {
        element.classList.remove('is-valid');
        element.classList.add('is-error');
    }

    // 2. Aplica no GRUPO (Ícones, textos de ajuda, cor do label)
    const formGroup = element.closest(
        '.has-validation-icon, .nativa-form-group'
    );
    if (formGroup) {
        formGroup.classList.toggle('is-valid', isValid);
        formGroup.classList.toggle('is-error', !isValid);
    }
};

export const maskCpf = (cpfInput) => {
    let value = cpfInput.value.replace(/\D/g, '');
    value = value.substring(0, 11);
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d)/, '$1.$2');
    value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
    cpfInput.value = value;
};

export const maskPhone = (phoneInput) => {
    let value = phoneInput.value.replace(/\D/g, '');
    value = value.substring(0, 9);
    if (value.length > 5) {
        value = value.replace(/(\d{5})(\d)/, '$1-$2');
    }
    phoneInput.value = value;
};

/**
 * Valida os campos de telefone (DDD e Número) e retorna feedback específico.
 */
export const validatePhoneInputs = (ddd, number) => {
    const cleanDdd = ddd ? ddd.replace(/\D/g, '') : '';
    const cleanNumber = number ? number.replace(/\D/g, '') : '';

    // Caso 1: Esqueceu o DDD
    if (!cleanDdd) {
        return {
            isValid: false,
            message: 'O campo DDD é obrigatório.',
            target: 'ddd',
        };
    }

    // Caso 2: DDD incompleto
    if (cleanDdd.length < 2) {
        return {
            isValid: false,
            message: 'O DDD precisa de 2 dígitos.',
            target: 'ddd',
        };
    }

    // Caso 3: Esqueceu o número
    if (!cleanNumber) {
        return {
            isValid: false,
            message: 'O campo de número é obrigatório.',
            target: 'number',
        };
    }

    // Caso 4: Número muito curto
    if (cleanNumber.length < 8) {
        return {
            isValid: false,
            message: 'Número de telefone inválido (curto demais).',
            target: 'number',
        };
    }

    return { isValid: true, message: '', target: null };
};

export const isValidFullName = (nameInput) => {
    if (!nameInput.required) return true;
    const fullNameRegex =
        /^[a-zA-Z\u00C0-\u017F']{2,}(?:\s[a-zA-Z\u00C0-\u017F']{2,})+$/;
    const isValid = fullNameRegex.test(nameInput.value.trim());
    updateValidationUI(nameInput, isValid);
    return isValid;
};

export const isValidCpf = (cpfInput) => {
    if (!cpfInput.required && cpfInput.value.trim() === '') {
        const formGroup = cpfInput.closest(
            '.has-validation-icon, .nativa-form-group'
        );
        if (formGroup) {
            formGroup.classList.remove('is-valid', 'is-error');
        }
        return true;
    }

    let cpf = cpfInput.value.replace(/[^\d]+/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
        updateValidationUI(cpfInput, false);
        return false;
    }
    let sum = 0,
        remainder;
    for (let i = 1; i <= 9; i++)
        sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(9, 10))) {
        updateValidationUI(cpfInput, false);
        return false;
    }
    sum = 0;
    for (let i = 1; i <= 10; i++)
        sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.substring(10, 11))) {
        updateValidationUI(cpfInput, false);
        return false;
    }
    updateValidationUI(cpfInput, true);
    return true;
};

export const isRequiredFieldValid = (input) => {
    if (!input) return false;
    const isValid = input.value.trim() !== '';
    updateValidationUI(input, isValid);
    return isValid;
};

export const validateAllFields = (form, modality) => {
    let allValid = true;
    let firstErrorMessage = '';
    let firstErrorElement = null;

    const fieldsToValidate = [
        {
            selector: 'input[name="nativa-customer-name"]:required',
            validator: isValidFullName,
            message: 'Por favor, insira seu nome completo.',
        },
        {
            selector: 'input[name="nativa-customer-cpf"]:required',
            validator: isValidCpf,
            message: 'Por favor, insira um CPF válido.',
        },
    ];

    if (modality === 'delivery') {
        fieldsToValidate.push({
            selector: 'input[name="selected_address"]:required',
            // CORREÇÃO: Removido parâmetro 'element' não utilizado
            validator: () =>
                form.querySelector('input[name="selected_address"]:checked'),
            message: 'Por favor, selecione um endereço para a entrega.',
        });
    }

    fieldsToValidate.forEach((field) => {
        const element = form.querySelector(field.selector);
        if (element && !field.validator(element)) {
            allValid = false;
            if (!firstErrorMessage) {
                firstErrorMessage = field.message;
                firstErrorElement = element;
            }
        }
    });

    const paymentInput = form.querySelector(
        'input[name="nativa-payment-method"]'
    );
    const paymentContainer = document.getElementById(
        'nativa-payment-method-options'
    );

    if (paymentInput && paymentInput.required) {
        const isPaymentValid = paymentInput.value.trim() !== '';
        if (!isPaymentValid) {
            allValid = false;
            if (!firstErrorMessage) {
                firstErrorMessage =
                    'Por favor, selecione um método de pagamento.';
                firstErrorElement = paymentContainer;
            }
        }
        if (paymentContainer) {
            paymentContainer.classList.toggle('is-valid', isPaymentValid);
            paymentContainer.classList.toggle('is-error', !isPaymentValid);
        }
    }

    if (!allValid && firstErrorMessage) {
        showToast(firstErrorMessage, 'error');
        if (firstErrorElement) {
            firstErrorElement.focus();
            firstErrorElement.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
            });
        }
    }

    return allValid;
};
