// js/core/global-interactions.js

/**
 * Módulo central para interações globais da aplicação.
 * ... (histórico de versões anterior) ...
 * CORREÇÃO (Oferta UX): Clicar fora da ficha de oferta/produto não marca mais a oferta como vista.
 * ATUALIZAÇÃO (FEEDBACK UI): Adiciona feedback visual (Toast) ao clicar em botões de modalidade desabilitados na ficha principal.
 */
import interact from 'interactjs';
import {
    openSheet,
    closeSheet,
    closeAllSheets,
    provideFeedbackForDisabledElement, // Importação adicionada
} from '../utils/nativa-ui-helpers.js';
import { handleModalitySheetDisplay } from '../features/cart/cart-handlers.js';
import { selectModality } from '../utils/helpers.js';
import { loadAndRenderCart } from '../features/cart/cart-handlers.js';
import { state } from './main-state.js'; // Import state

/**
 * Adiciona ou remove a classe 'is-on-home' do body
 * com base no caminho da URL atual.
 */
function updateUserInterfaceForRoute(path) {
    const appContainer = document.body;
    if (!appContainer) return;

    const cleanPath =
        path.endsWith('/') && path.length > 1 ? path.slice(0, -1) : path;
    const finalPath = window.nativaDeliveryData?.spa_routes?.includes(cleanPath)
        ? cleanPath
        : '/';

    if (finalPath === '/') {
        appContainer.classList.add('is-on-home');
    } else {
        appContainer.classList.remove('is-on-home');
    }
}

function _setupPwaInstallPrompt() {
    console.log(
        '[PWA INSTALL SONDA] Anexando listener para o evento "beforeinstallprompt".'
    );

    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();

        if (!window.nativaDelivery) {
            window.nativaDelivery = {};
        }

        window.nativaDelivery.deferredInstallPrompt = e;

        console.log(
            '[PWA INSTALL SONDA] SUCESSO: Evento "beforeinstallprompt" capturado e armazenado.'
        );
    });
}

function _setupEventListeners() {
    document.addEventListener('click', (event) => {
        const target = event.target;

        const loginTriggerBtn = target.closest(
            '.trigger-login-prompt-btn, #nativa-trigger-login-prompt'
        );
        if (loginTriggerBtn) {
            event.preventDefault();
            const loginSheet = document.getElementById(
                'nativa-login-prompt-sheet'
            );
            if (loginSheet) {
                openSheet(loginSheet);
            }
            return;
        }

        const sheetTrigger = target.closest('[data-sheet-id]');
        if (sheetTrigger) {
            const sheetId = sheetTrigger.dataset.sheetId;
            const sheet = document.getElementById(sheetId);
            if (sheet) {
                if (sheetId === 'nativa-cart-side-sheet') {
                    // Garante que os dados do carrinho sejam sempre os mais recentes ao abrir a ficha.
                    loadAndRenderCart(); // Recarrega os dados do carrinho
                    openSheet(sheet); // Abre a ficha
                } else if (sheetId === 'nativa-modality-sheet') {
                    handleModalitySheetDisplay();
                } else {
                    openSheet(sheet);
                }
            }
        }

        const sheetCloseButton = target.closest(
            '.nativa-bottom-sheet-close, .nativa-side-sheet-back-button, #nativa-how-to-order-understood-btn'
        );
        if (sheetCloseButton) {
            const sheet = target.closest(
                '.nativa-bottom-sheet, .nativa-side-sheet'
            );
            if (sheet && !sheet.classList.contains('is-unclosable')) {
                closeSheet(sheet);
            }
        }

        // --- INÍCIO DA MODIFICAÇÃO (FECHAR OFERTA) ---
        // Verifica se o clique foi diretamente no overlay E se a sheet não é "unclosable"
        if (
            target.matches('.nativa-bottom-sheet') ||
            target.matches('.nativa-side-sheet')
        ) {
            if (
                !target.classList.contains('is-unclosable') &&
                target === event.target
            ) {
                // Apenas fecha a sheet, sem marcar a oferta como vista aqui.
                // A lógica de marcar a oferta foi movida para o product-sheet-logic.js
                closeSheet(target);
            }
        }
        // --- FIM DA MODIFICAÇÃO ---

        // --- INÍCIO DA MODIFICAÇÃO (FEEDBACK UI) ---
        // Verifica se clicou em um botão de modalidade desabilitado na ficha principal
        if (
            provideFeedbackForDisabledElement(
                event,
                '#nativa-modality-sheet .nativa-order-button',
                'Este serviço não está disponível no momento.'
            )
        ) {
            return;
        }
        // --- FIM DA MODIFICAÇÃO ---

        const modalityButton = target.closest(
            '#nativa-modality-sheet .nativa-order-button'
        );
        if (modalityButton && !modalityButton.disabled) {
            const modality = modalityButton.dataset.modality;
            if (modality) {
                selectModality(modality);
            }
        }

        const contactButton = target.closest('#nativa-contact-cta-btn');
        if (contactButton) {
            event.preventDefault();
            const whatsappNumber = window.nativaDeliveryData.whatsappNumber;
            const defaultMessage =
                'Oi! Vim pelo site de vocês e gostaria de tirar uma dúvida';
            if (whatsappNumber) {
                const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
                    defaultMessage
                )}`;
                window.open(whatsappUrl, '_blank');
            } else {
                console.error('Número do WhatsApp não encontrado.');
            }
        }
    });
}

function handleCartIconAnimation(event) {
    if (
        event.detail &&
        (event.detail.newly_added_item_data ||
            event.detail.message?.includes('adicionada'))
    ) {
        const cartIcon = document.getElementById('nativa-cart-icon');
        if (cartIcon) {
            cartIcon.classList.add('is-jumping');
            cartIcon.addEventListener(
                'animationend',
                () => {
                    cartIcon.classList.remove('is-jumping');
                },
                { once: true }
            );
        }
    }
}

export function initGlobalInteractions() {
    _setupEventListeners();
    _setupPwaInstallPrompt();

    if (!document.getElementById('nativa-dynamic-styles')) {
        const style = document.createElement('style');
        style.id = 'nativa-dynamic-styles';
        style.innerHTML = `
            body.nativa-sheet-dragging {
                overscroll-behavior-y: contain !important;
            }
            #nativa-combo-wizard-sheet .nativa-bottom-sheet-content.is-content-driven-height {
                height: auto;
                max-height: 85vh;
            }
            body.is-on-home .nativa-bottom-nav-scrim {
                background-color: transparent;
                backdrop-filter: none;
                -webkit-backdrop-filter: none;
                border-top: none;
                box-shadow: none;
            }
            .nativa-bottom-sheet .nativa-bottom-sheet-header {
                cursor: grab;
            }
            body.nativa-sheet-dragging .nativa-bottom-sheet .nativa-bottom-sheet-header {
                cursor: grabbing;
            }
        `;
        document.head.appendChild(style);
    }

    console.log(
        '[SONDA DRAG] Configurando interactjs para .nativa-bottom-sheet...'
    );
    interact('.nativa-bottom-sheet').draggable({
        inertia: true,
        allowFrom: '.nativa-bottom-sheet-header', // Permite drag a partir do header
        modifiers: [
            interact.modifiers.restrictRect({
                restriction: 'parent',
                endOnly: true,
            }),
        ],
        autoScroll: false,
        listeners: {
            start(event) {
                console.log('[SONDA DRAG] Evento: start', event.target.id);
                if (event.target.classList.contains('is-unclosable')) {
                    console.log(
                        '[SONDA DRAG] Ação: Drag impedido (is-unclosable)'
                    );
                    event.stopImmediatePropagation();
                    return;
                }
                const sheet = event.target;
                const content = sheet.querySelector(
                    '.nativa-bottom-sheet-content'
                );
                if (content) {
                    content.style.transition = 'none';
                }
                document.body.classList.add('nativa-sheet-dragging');
                console.log('[SONDA DRAG] Ação: Drag iniciado');
            },
            move(event) {
                if (event.target.classList.contains('is-unclosable')) {
                    return;
                }
                const sheet = event.target;
                const content = sheet.querySelector(
                    '.nativa-bottom-sheet-content'
                );
                if (content) {
                    const y =
                        (parseFloat(content.getAttribute('data-y')) || 0) +
                        event.dy;
                    if (y > 0) {
                        // Only allow dragging down
                        content.style.transform = `translateY(${y}px)`;
                        content.setAttribute('data-y', y);
                    }
                }
            },
            end(event) {
                console.log('[SONDA DRAG] Evento: end', event.target.id);
                if (event.target.classList.contains('is-unclosable')) {
                    console.log(
                        '[SONDA DRAG] Ação: Fim do drag ignorado (is-unclosable)'
                    );
                    document.body.classList.remove('nativa-sheet-dragging');
                    return;
                }
                const sheet = event.target;
                const content = sheet.querySelector(
                    '.nativa-bottom-sheet-content'
                );
                if (content) {
                    const y = parseFloat(content.getAttribute('data-y')) || 0;
                    const sheetHeight = content.offsetHeight;
                    const dragVelocity =
                        typeof event.vy === 'number' ? event.vy : 0;
                    const threshold = sheetHeight * 0.1; // 10% threshold

                    console.log(
                        `[SONDA DRAG] Dados Finais: y=${y.toFixed(2)}, sheetHeight=${sheetHeight}, threshold=${threshold.toFixed(2)}, dragVelocity=${dragVelocity.toFixed(2)}`
                    );

                    content.removeAttribute('data-y');

                    // Check if dragged down significantly OR flicked down
                    const shouldClose =
                        y > threshold || (y > 0 && dragVelocity > 0.5);
                    console.log(
                        `[SONDA DRAG] Condições: y > threshold (${y > threshold}), y > 0 && dragVelocity > 0.5 (${y > 0 && dragVelocity > 0.5}). shouldClose=${shouldClose}`
                    );

                    if (shouldClose) {
                        console.log(
                            '[SONDA DRAG] Ação: Fechando a sheet (limite atingido ou flick)'
                        );
                        content.style.transform = ''; // Reset transform before closing animation
                        content.style.transition = ''; // Reset transition before closing animation
                        closeSheet(sheet);
                    } else {
                        console.log(
                            '[SONDA DRAG] Ação: Retornando a sheet à posição original'
                        );
                        content.style.transition = 'transform 0.3s ease-out';
                        content.style.transform = 'translateY(0px)';
                    }
                } else {
                    console.warn(
                        '[SONDA DRAG] Elemento .nativa-bottom-sheet-content não encontrado no evento end.'
                    );
                }
                document.body.classList.remove('nativa-sheet-dragging');
            },
        },
    });

    document.addEventListener('nativa:cartUpdated', loadAndRenderCart);
    document.addEventListener('nativa:cartUpdated', handleCartIconAnimation);

    if (document.getElementById('nativa-cart-side-sheet')) {
        loadAndRenderCart();
    }

    document.addEventListener('nativa:routeChanged', (e) =>
        updateUserInterfaceForRoute(e.detail.path)
    );
    updateUserInterfaceForRoute(window.location.pathname);
}
