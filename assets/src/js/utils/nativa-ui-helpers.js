// js/utils/nativa-ui-helpers.js

/**
 * Módulo com funções auxiliares globais que manipulam diretamente
 * componentes da UI e o DOM, como toasts, spinners, sheets, etc.
 * ATUALIZADO: Adiciona a função 'showUpdatePrompt' para notificar o usuário
 * sobre novas versões do PWA e permitir a atualização imediata.
 * ATUALIZAÇÃO (UX): Adiciona uma animação de contorno (outline) aos toasts para melhorar a visibilidade em temas escuros.
 * NOVO: Adiciona a função checkPWAInstallAndProceed para restringir ações fora do PWA.
 * ATUALIZAÇÃO (iOS Install): Adiciona detecção de iOS/Safari para mostrar um modal informativo em vez de um botão de instalação não funcional.
 * ATUALIZAÇÃO (PWA TOGGLE): Lê a configuração do backend para decidir se a verificação PWA deve ser executada.
 */

import { init as prepareSocialLogin } from '../features/login/login-prompt-handler.js';
import { init as initOnboarding } from '../features/onboarding/onboarding-handler.js';
import { showModal } from './modal.js'; // Importa a função showModal

export const escapeHTML = (str) => {
    const stringified = String(str ?? '');
    return stringified.replace(/[&<>"']/g, function (match) {
        return {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#x27;',
        }[match];
    });
};

export let uiLock = Promise.resolve();
export let isSheetOpen = false;

export const enqueueUIAction = (actionCallback) => {
    uiLock = uiLock.then(() => {
        return new Promise((resolve) => {
            actionCallback();
            setTimeout(resolve, 300);
        });
    });
};

export const showToast = (message, type = 'info') => {
    uiLock = uiLock.then(() => {
        return new Promise((resolve) => {
            if (!document.getElementById('nativa-toast-animation-styles')) {
                const style = document.createElement('style');
                style.id = 'nativa-toast-animation-styles';
                style.innerHTML = `
                    @keyframes toast-focus-pulse {
                      0% { outline-color: transparent; }
                      25% { outline-color: var(--md-sys-color-on-surface); }
                      75% { outline-color: var(--md-sys-color-on-surface); }
                      100% { outline-color: transparent; }
                    }
                    .nativa-toast.is-pulsing-outline {
                        outline: 2px solid transparent;
                        animation: toast-focus-pulse 1.2s ease-in-out;
                    }
                `;
                document.head.appendChild(style);
            }

            const scrim = document.createElement('div');
            scrim.className = 'nativa-toast-scrim';
            const toast = document.createElement('div');
            toast.className = `nativa-toast is-${type}`;
            const iconMap = {
                success: 'check_circle',
                error: 'error',
                info: 'info',
            };
            toast.innerHTML = `<div class="nativa-toast-icon-container"><span class="material-symbols-rounded">${
                iconMap[type]
            }</span></div><div class="nativa-toast-separator"></div><div class="nativa-toast-message">${escapeHTML(
                message
            )}</div>`;
            scrim.appendChild(toast);
            document.body.appendChild(scrim);

            setTimeout(() => {
                scrim.classList.add('is-visible');
                toast.classList.add('is-visible');
                toast.classList.add('is-pulsing-outline');
                toast.addEventListener(
                    'animationend',
                    () => {
                        toast.classList.remove('is-pulsing-outline');
                    },
                    { once: true }
                );
            }, 10);

            const closeToast = () => {
                toast.classList.remove('is-visible');
                scrim.classList.remove('is-visible');
                setTimeout(() => {
                    scrim.remove();
                    resolve();
                }, 300);
            };

            scrim.addEventListener('click', closeToast);
            setTimeout(closeToast, 2500);
        });
    });
};

export const provideFeedbackForDisabledElement = (event, selector, message) => {
    const disabledElement = event.target.closest(selector);
    if (disabledElement && disabledElement.disabled) {
        showToast(message, 'info');
        return true;
    }
    return false;
};

export const showSpinner = (button) => {
    if (!button) return;
    const computedStyle = window.getComputedStyle(button);
    button.style.width = computedStyle.width;
    button.style.height = computedStyle.height;
    button.dataset.originalContent = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="nativa-spinner"></span>';
};

export const hideSpinner = (button) => {
    if (!button) return;
    button.disabled = false;
    if (button.dataset.originalContent) {
        button.innerHTML = button.dataset.originalContent;
    }
    button.style.width = '';
    button.style.height = '';
};

export const flyToCart = (element) => {
    const cartButton = document.getElementById('nativa-cart-button');
    if (!element || !cartButton) return;

    const rect = element.getBoundingClientRect();
    const cartRect = cartButton.getBoundingClientRect();
    const dummy = document.createElement('div');
    dummy.className = 'nativa-fly-to-cart-dummy';
    Object.assign(dummy.style, {
        width: `${rect.width}px`,
        height: `${rect.height}px`,
        top: `${rect.top}px`,
        left: `${rect.left}px`,
        borderRadius: window.getComputedStyle(element).borderRadius,
    });
    document.body.appendChild(dummy);

    requestAnimationFrame(() => {
        Object.assign(dummy.style, {
            top: `${cartRect.top + cartRect.height / 2}px`,
            left: `${cartRect.left + cartRect.width / 2}px`,
            width: '20px',
            height: '20px',
            opacity: '0',
        });
    });

    dummy.addEventListener('transitionend', () => {
        dummy.remove();
        cartButton.classList.add('is-pulsing');
        setTimeout(() => cartButton.classList.remove('is-pulsing'), 500);
    });
};

function _updateBodyScrollState() {
    setTimeout(() => {
        const anyOtherSheetVisible = document.querySelector(
            '.nativa-bottom-sheet.is-visible, .nativa-side-sheet.is-visible'
        );

        if (!anyOtherSheetVisible) {
            document.body.classList.remove(
                'nativa-sheet-is-open',
                'nativa-no-scroll'
            );
            isSheetOpen = false;
        } else {
            isSheetOpen = true;
        }
    }, 0);
}

export const openSheet = (sheet) => {
    if (!sheet) {
        console.warn(
            'openSheet: O elemento da ficha fornecida é nulo ou não existe no DOM.'
        );
        return;
    }

    if (
        sheet.id === 'nativa-login-prompt-sheet' &&
        typeof prepareSocialLogin === 'function'
    ) {
        prepareSocialLogin();
    }

    closeAllSheets();

    sheet.classList.add('is-visible');

    document.body.classList.add('nativa-sheet-is-open', 'nativa-no-scroll');
    isSheetOpen = true;
};

export const closeSheet = (sheet) => {
    if (!sheet) return;

    const contentContainer = sheet.querySelector(
        '.nativa-bottom-sheet-content, .nativa-side-sheet-content'
    );

    if (
        contentContainer &&
        contentContainer.classList.contains('is-content-driven-height')
    ) {
        const sheetHeight = contentContainer.getBoundingClientRect().height;
        contentContainer.style.height = `${sheetHeight}px`;

        requestAnimationFrame(() => {
            contentContainer.classList.remove('is-content-driven-height');
            sheet.classList.remove('is-visible');
        });

        sheet.addEventListener(
            'transitionend',
            () => {
                if (!sheet.classList.contains('is-visible')) {
                    contentContainer.style.height = '';
                    _updateBodyScrollState();
                }
            },
            { once: true }
        );
    } else {
        sheet.classList.remove('is-visible');
        _updateBodyScrollState();
    }
};

export const closeAllSheets = () => {
    document
        .querySelectorAll(
            '.nativa-bottom-sheet.is-visible, .nativa-side-sheet.is-visible'
        )
        .forEach((sheet) => {
            closeSheet(sheet);
        });
};

export const applyStaggeredAnimation = (
    containerSelector,
    elementSelector,
    delayStep = 80
) => {
    const container = document.querySelector(containerSelector);
    if (!container) return;

    const elements = container.querySelectorAll(elementSelector);

    elements.forEach((el, index) => {
        el.style.animationDelay = `${index * delayStep}ms`;
    });
};

export const populateDobForm = (formIdPrefix) => {
    const daySelect = document.getElementById(`${formIdPrefix}-day`);
    const monthSelect = document.getElementById(`${formIdPrefix}-month`);
    const yearSelect = document.getElementById(`${formIdPrefix}-year`);

    if (!daySelect || daySelect.options.length > 1) return;

    daySelect.innerHTML = '<option value="">Dia</option>';
    for (let i = 1; i <= 31; i++) {
        daySelect.innerHTML += `<option value="${i}">${i}</option>`;
    }

    monthSelect.innerHTML = '<option value="">Mês</option>';
    const months = [
        'Janeiro',
        'Fevereiro',
        'Março',
        'Abril',
        'Maio',
        'Junho',
        'Julho',
        'Agosto',
        'Setembro',
        'Outubro',
        'Novembro',
        'Dezembro',
    ];
    months.forEach((month, index) => {
        monthSelect.innerHTML += `<option value="${index + 1}">${month}</option>`;
    });

    yearSelect.innerHTML = '<option value="">Ano</option>';
    const currentYear = new Date().getFullYear();
    for (let i = currentYear - 18; i >= currentYear - 100; i--) {
        yearSelect.innerHTML += `<option value="${i}">${i}</option>`;
    }
};

export const showOnboardingSheet = (needsDob) => {
    const onboardingSheet = document.getElementById('nativa-onboarding-sheet');
    if (onboardingSheet) {
        openSheet(onboardingSheet);
        if (typeof initOnboarding === 'function') {
            initOnboarding(needsDob);
        } else {
            console.error(
                'initOnboarding não foi encontrado. O script foi carregado?'
            );
        }
    } else {
        console.error(
            'Elemento da ficha de onboarding NÃO foi encontrado no DOM.'
        );
    }
};

export const updateActiveNavItem = (currentPath) => {
    const navItems = document.querySelectorAll(
        '.nativa-bottom-nav-container .nativa-nav-item'
    );
    const contactButton = document.getElementById('nativa-contact-trigger-btn');

    if (currentPath === '/home') {
        currentPath = '/';
    }

    navItems.forEach((item) => {
        const itemRoute = item.dataset.route;
        if (item.id === 'nativa-contact-trigger-btn') return;

        if (itemRoute === currentPath) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });

    if (contactButton) {
        contactButton.classList.remove('active');
    }
};

export const copyToClipboard = (text) => {
    navigator.clipboard
        .writeText(text)
        .then(() => {
            showToast('Copiado para a área de transferência!', 'success');
        })
        .catch((err) => {
            console.error('Falha ao copiar texto: ', err);
            showToast('Não foi possível copiar.', 'error');
        });
};

export const showHowToOrderTooltip = () => {
    const tooltip = document.getElementById('nativa-how-to-order-tooltip');
    if (
        tooltip &&
        localStorage.getItem('nativaHowToOrderUnderstood') !== 'true'
    ) {
        setTimeout(() => {
            openSheet(tooltip);
        }, 500);
    }
};

export const hideHowToOrderTooltip = () => {
    const tooltip = document.getElementById('nativa-how-to-order-tooltip');
    if (tooltip) {
        closeSheet(tooltip);
        localStorage.setItem('nativaHowToOrderUnderstood', 'true');
    }
};

export const showLoader = () => {
    const loader = document.getElementById('nativa-app-loader');
    if (loader) loader.classList.add('is-visible');
};

export const hideLoader = () => {
    const loader = document.getElementById('nativa-app-loader');
    if (loader) {
        loader.classList.remove('is-visible');
        document.dispatchEvent(new CustomEvent('nativa:loaderHidden'));
    }
};

export const createElement = (tag, options = {}) => {
    const el = document.createElement(tag);
    if (options.className) {
        el.className = options.className;
    }
    if (options.dataset) {
        Object.assign(el.dataset, options.dataset);
    }
    if (options.textContent) {
        el.textContent = options.textContent;
    }
    if (options.children && Array.isArray(options.children)) {
        options.children.forEach((child) => {
            if (child) el.appendChild(child);
        });
    }
    return el;
};

export const showUpdatePrompt = (updateSW) => {
    uiLock = uiLock.then(() => {
        return new Promise((resolve) => {
            const scrim = document.createElement('div');
            scrim.className = 'nativa-toast-scrim is-persistent';
            const toast = document.createElement('div');
            toast.className = 'nativa-toast is-info has-action';
            toast.innerHTML = `
                <div class="nativa-toast-icon-container"><span class="material-symbols-rounded">update</span></div>
                <div class="nativa-toast-separator"></div>
                <div class="nativa-toast-message">Uma nova versão está disponível.</div>
                <button id="sw-update-button" class="nativa-button-secondary is-small">Recarregar</button>
            `;
            scrim.appendChild(toast);
            document.body.appendChild(scrim);

            setTimeout(() => {
                scrim.classList.add('is-visible');
                toast.classList.add('is-visible');
            }, 10);

            const updateButton = document.getElementById('sw-update-button');
            if (updateButton) {
                updateButton.addEventListener('click', async () => {
                    toast.classList.remove('is-visible');
                    scrim.classList.remove('is-visible');
                    await updateSW(true);
                    resolve();
                });
            }
        });
    });
};

// --- INÍCIO DA MODIFICAÇÃO (PWA TOGGLE) ---
export const checkPWAInstallAndProceed = async () => {
    // 1. Verifica a configuração do backend
    const requireInstall = window.nativaDeliveryData?.requirePwaInstall;

    // Se a exigência estiver desligada no backend, permite prosseguir imediatamente.
    if (requireInstall === false) {
        return true;
    }

    // 2. Continua com a lógica original se a exigência estiver ligada (ou indefinida, por segurança)
    const isPWA =
        window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone;

    if (isPWA) {
        return true; // Prossegue normalmente se já for PWA
    }

    // Verifica se é iOS (iPhone, iPad, iPod)
    const isIOS =
        /iPad|iPhone|iPod/.test(navigator.platform) ||
        (navigator.platform === 'MacIntel' &&
            navigator.maxTouchPoints > 1 &&
            !window.MSStream);
    // Verifica se é Safari (e não outro navegador baseado em WebKit como Chrome no iOS)
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(
        navigator.userAgent
    );
    const isIOSSafari = isIOS && isSafari;

    // Se for iOS Safari, mostra modal informativo
    if (isIOSSafari) {
        await showModal({
            title: 'Instale nosso app',
            iconName: 'install_mobile', // Ícone sugerido para instalação
            message:
                'Para continuar com seu pedido, adicione nosso app à sua Tela de Início:\n\n1. Toque no botão Compartilhar <span class="material-symbols-rounded" style="font-size: 1.1em; vertical-align: bottom;">ios_share</span>\n2. Role para baixo e toque em "Adicionar à Tela de Início"\n3. Toque em "Adicionar"',
            confirmText: 'Entendi',
            cancelText: null, // Apenas um botão de confirmação
        });
        return false; // Interrompe a ação original
    }

    // Para outros navegadores, continua com a lógica do prompt de instalação
    const deferredPrompt = window.nativaDelivery?.deferredInstallPrompt;

    const userChoice = await showModal({
        title: 'Continue no app',
        iconName: 'install_mobile',
        message:
            'Para adicionar itens ao carrinho e fazer pedidos, por favor, instale nosso aplicativo em seu telefone.',
        confirmText: 'Instalar',
        cancelText: 'Voltar',
        isCritical: false,
    });

    if (userChoice) {
        // Usuário clicou em "Instalar"
        if (deferredPrompt) {
            try {
                deferredPrompt.prompt();
                await deferredPrompt.userChoice;
                if (window.nativaDelivery) {
                    window.nativaDelivery.deferredInstallPrompt = null;
                }
                return false; // Interrompe a ação original após tentar instalar
            } catch (error) {
                console.error('Erro ao tentar exibir o prompt PWA:', error);
                showToast(
                    'Não foi possível iniciar a instalação. Você pode tentar adicionar manualmente à tela inicial.',
                    'error'
                );
                return false; // Interrompe a ação original
            }
        } else {
            showToast(
                'A instalação não está disponível no momento. Tente adicionar o site à sua tela inicial manualmente.',
                'info'
            );
            return false; // Interrompe a ação original
        }
    } else {
        // Usuário clicou em "Voltar" ou fechou modal
        return false; // Interrompe a ação original
    }
};
// --- FIM DA MODIFICAÇÃO (PWA TOGGLE) ---
