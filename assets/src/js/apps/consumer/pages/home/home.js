// apps/consumer/pages/home/home.js

/**
 * Módulo para a página inicial da aplicação.
 * ... (histórico de versões anterior) ...
 * REATORAÇÃO: Exporta a função setDynamicBackground para ser reutilizável.
 * CORREÇÃO (ROTEAMENTO): Garante que a imagem de fundo seja atualizada toda vez que o usuário navega para a home, sem reiniciar a aplicação.
 * CORREÇÃO (FLICKERING): Adiciona lógica de persistência para evitar que a imagem de fundo mude aleatoriamente em recarregamentos de estado rápidos.
 */

import { state } from '@core/state/global-state.js';
import {
    applyStaggeredAnimation,
    closeSheet,
    openSheet,
} from '@utils/ui-helpers.js';

let isHomeInitialized = false;

// --- INÍCIO DA MODIFICAÇÃO (FLICKERING) ---
// Variáveis para armazenar o estado visual da home e evitar trocas desnecessárias
let lastStoreOpenStatus = null; // null for first run
let currentBackgroundImageUrl = null;
// --- FIM DA MODIFICAÇÃO ---

const dayMap = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
];
const dayNames = {
    monday: 'Segunda',
    tuesday: 'Terça',
    wednesday: 'Quarta',
    thursday: 'Quinta',
    friday: 'Sexta',
    saturday: 'Sábado',
    sunday: 'Domingo',
};

const _displayAppVersion = () => {
    // Só exibe se for admin
    if (!state.serverData.is_admin) {
        const oldVersionEl = document.getElementById(
            'nativa-app-version-display'
        );
        if (oldVersionEl) {
            oldVersionEl.remove();
        }
        return;
    }

    const version = state.serverData.app_version;
    if (!version) return;

    let versionEl = document.getElementById('nativa-app-version-display');
    if (!versionEl) {
        versionEl = document.createElement('div');
        versionEl.id = 'nativa-app-version-display';
        Object.assign(versionEl.style, {
            position: 'fixed',
            top: '10px',
            left: '10px',
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            color: 'white',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '10px',
            fontWeight: 'bold',
            zIndex: '9999',
            fontFamily: 'monospace',
            pointerEvents: 'none',
        });
        document.body.appendChild(versionEl);
    }
    versionEl.textContent = `v${version}`;
};

const _setupInstallButton = () => {
    const installButton = document.getElementById('nativa-install-pwa-btn');
    const deferredPrompt = window.nativaDelivery?.deferredInstallPrompt;

    if (installButton) {
        if (deferredPrompt) {
            installButton.style.display = 'inline-flex';
            installButton.addEventListener(
                'click',
                async () => {
                    deferredPrompt.prompt();
                    const { outcome } = await deferredPrompt.userChoice;
                    console.log(`PWA setup user choice: ${outcome}`);
                    installButton.style.display = 'none';
                    if (window.nativaDelivery) {
                        window.nativaDelivery.deferredInstallPrompt = null;
                    }
                },
                { once: true }
            );
        } else {
            installButton.style.display = 'none';
        }
    }
};

export const setDynamicBackground = (targetElementId) => {
    const targetSection = document.getElementById(targetElementId);
    if (!targetSection) {
        return;
    }

    const isOpen = state.serverData?.serviceStatus?.is_store_open || false;

    // --- INÍCIO DA MODIFICAÇÃO (FLICKERING) ---
    // Lógica de estabilização:
    // Se o status (aberto/fechado) não mudou E já temos uma imagem definida,
    // reaplicamos a MESMA imagem em vez de sortear uma nova.
    if (lastStoreOpenStatus === isOpen && currentBackgroundImageUrl) {
        // Verifica se o estilo já está aplicado (para evitar reflow desnecessário),
        // mas reaplica se o elemento foi recriado (ex: navegação SPA).
        const currentStyle = targetSection.style.getPropertyValue(
            '--home-background-image'
        );
        const expectedStyle = `url('${currentBackgroundImageUrl}')`;

        if (currentStyle !== expectedStyle) {
            targetSection.style.setProperty(
                '--home-background-image',
                expectedStyle
            );
            targetSection.classList.add('home-background-active');
            console.log(
                '[Home Background] Imagem persistida reaplicada (Status inalterado).'
            );
        } else {
            // console.log('[Home Background] Imagem já está correta. Nenhuma ação necessária.');
        }
        return; // Sai da função, evitando novo sorteio
    }
    // --- FIM DA MODIFICAÇÃO ---

    const backgroundPool = isOpen
        ? state.serverData?.homeBackgrounds?.open
        : state.serverData?.homeBackgrounds?.closed;

    let imageUrl;
    if (backgroundPool && backgroundPool.length > 0) {
        const randomIndex = Math.floor(Math.random() * backgroundPool.length);
        imageUrl = backgroundPool[randomIndex];
    } else {
        imageUrl = isOpen
            ? '/wp-content/plugins/nativa-delivery/assets/images/placeholder_aberto.webp'
            : '/wp-content/plugins/nativa-delivery/assets/images/placeholder_fechado.webp';
    }

    // --- INÍCIO DA MODIFICAÇÃO (FLICKERING) ---
    // Atualiza o estado de controle
    lastStoreOpenStatus = isOpen;
    currentBackgroundImageUrl = imageUrl;
    console.log(
        `[Home Background] Nova imagem definida. Status: ${isOpen ? 'Aberto' : 'Fechado'}`
    );
    // --- FIM DA MODIFICAÇÃO ---

    targetSection.style.setProperty(
        '--home-background-image',
        `url('${imageUrl}')`
    );
    targetSection.classList.add('home-background-active');
};

const setHomeBackground = () => {
    setDynamicBackground('home-section');
};

const populateAndShowHoursPopup = () => {
    const weeklyHoursPopup = document.getElementById(
        'nativa-weekly-hours-popup'
    );
    const contentDiv = document.getElementById('weekly-hours-popup-content');
    const operatingHours = state.serverData?.operatingHours;

    if (!weeklyHoursPopup || !contentDiv || !operatingHours) {
        console.warn(
            'Elementos do popup de horários ou dados não encontrados.'
        );
        return;
    }

    const closeButtonTop = weeklyHoursPopup.querySelector(
        '.nativa-bottom-sheet-close'
    );
    if (closeButtonTop) {
        closeButtonTop.style.display = 'none';
    }

    let tableHtml = `<table class="nativa-hours-table">`;
    const todayIndex = new Date().getDay();
    dayMap.forEach((dayKey, index) => {
        const dayData = operatingHours[dayKey];
        const isTodayClass = index === todayIndex ? 'is-today' : '';
        let hoursText = 'Fechado';
        if (dayData && dayData.is_active === 'on') {
            const openTime = dayData.store_hours?.open || '--:--';
            const closeTime = dayData.store_hours?.close || '--:--';
            if (openTime === '00:00' && closeTime === '23:59') {
                hoursText = 'Aberto 24h';
            } else {
                hoursText = `${openTime} - ${closeTime}`;
            }
        }
        tableHtml += `<tr class="${isTodayClass}"><td class="day-name">${dayNames[dayKey]}</td><td class="hours">${hoursText}</td></tr>`;
    });
    tableHtml += '</table>';
    contentDiv.innerHTML = tableHtml;

    if (!contentDiv.querySelector('.close-hours-btn')) {
        const closeButtonBottom = document.createElement('button');
        closeButtonBottom.textContent = 'Fechar';
        closeButtonBottom.className = 'nativa-button-primary close-hours-btn';
        closeButtonBottom.style.marginTop = 'var(--space-lg)';
        closeButtonBottom.addEventListener('click', () =>
            closeSheet(weeklyHoursPopup)
        );
        contentDiv.appendChild(closeButtonBottom);
    }

    if (!weeklyHoursPopup.dataset.clickOutsideListener) {
        weeklyHoursPopup.addEventListener('click', (event) => {
            if (event.target === weeklyHoursPopup) {
                closeSheet(weeklyHoursPopup);
            }
        });
        weeklyHoursPopup.dataset.clickOutsideListener = 'true';
    }

    openSheet(weeklyHoursPopup);
};

const initializeStatusSection = () => {
    const statusSection = document.querySelector('.open-closed-section');
    const serviceStatus = state.serverData?.serviceStatus;
    const operatingHours = state.serverData?.operatingHours; // Ainda precisamos de operatingHours para a lista de serviços

    if (!statusSection || !serviceStatus || !operatingHours) {
        return;
    }

    const isOpen = !!serviceStatus.is_store_open;
    const isAdmin247 = serviceStatus.closing_time === 'Admin (24h)';
    // CORREÇÃO: Removido 'isOpen247' não utilizado

    const statusTitle = statusSection.querySelector('.status-title');
    const statusSubtitle = statusSection.querySelector('.status-subtitle');
    const servicesList = statusSection.querySelector(
        '#hero-services-status-list'
    );
    const primaryCta = statusSection.querySelector('#hero-primary-cta');

    if (statusTitle) {
        statusTitle.textContent = isOpen ? 'Aberto agora!' : 'Fechado agora';
    }

    if (statusSubtitle) {
        let newSubtitle = '';
        if (isAdmin247) {
            newSubtitle = 'Estamos abertos para pedidos! (Modo Admin)';
        } else if (isOpen) {
            newSubtitle = `Funcionamos hoje até ${serviceStatus.closing_time || '--:--'}`;
        } else {
            const nextOpening = serviceStatus.next_opening || 'em breve';
            newSubtitle = `Voltaremos ${nextOpening}`;
        }
        statusSubtitle.textContent = newSubtitle;
    }

    statusSection.classList.toggle('is-open', isOpen);
    statusSection.classList.toggle('is-closed', !isOpen);

    if (primaryCta) {
        const ctaTextSpan = primaryCta.querySelector('.cta-text');
        const ctaIconSpan = primaryCta.querySelector(
            '.material-symbols-rounded'
        );

        if (isOpen) {
            if (ctaTextSpan) ctaTextSpan.textContent = 'Ver cardápio';
            if (ctaIconSpan) ctaIconSpan.textContent = 'restaurant_menu';
            primaryCta.href = '/cardapio';
            primaryCta.dataset.route = '/cardapio';
            primaryCta.onclick = null;
            delete primaryCta.dataset.listenerAttached;
        } else {
            if (ctaTextSpan) ctaTextSpan.textContent = 'Ver horários';
            if (ctaIconSpan) ctaIconSpan.textContent = 'update';
            primaryCta.href = '#';
            primaryCta.removeAttribute('data-route');

            if (!primaryCta.dataset.listenerAttached) {
                primaryCta.removeEventListener(
                    'click',
                    populateAndShowHoursPopup
                );
                primaryCta.addEventListener('click', (e) => {
                    e.preventDefault();
                    populateAndShowHoursPopup();
                });
                primaryCta.dataset.listenerAttached = 'true';
            }
        }
    }

    if (servicesList) {
        const serviceItems = servicesList.querySelectorAll('li[data-service]');
        serviceItems.forEach((item) => {
            const serviceKey = item.dataset.service;
            const isAvailable =
                serviceStatus && serviceStatus[serviceKey] === true;
            const availabilitySpan = item.querySelector(
                '.service-availability'
            );
            if (availabilitySpan) {
                let iconSpan = availabilitySpan.querySelector(
                    '.material-symbols-rounded'
                );
                if (!iconSpan) {
                    iconSpan = document.createElement('span');
                    iconSpan.className = 'material-symbols-rounded';
                    availabilitySpan.innerHTML = '';
                    availabilitySpan.appendChild(iconSpan);
                }
                iconSpan.textContent = isAvailable ? 'check_circle' : 'cancel';
                item.classList.toggle('is-open', isAvailable);
                item.classList.toggle('is-closed', !isAvailable);
            }
        });
    }
};

export function init() {
    const homeSection = document.getElementById('home-section');
    if (!homeSection) {
        return;
    }

    console.log('[Home] Exibindo a página inicial...');
    setHomeBackground();
    initializeStatusSection();
    _setupInstallButton();
    _displayAppVersion();

    if (isHomeInitialized) {
        return;
    }
    isHomeInitialized = true;

    console.log('[Home] Realizando a primeira inicialização...');

    applyStaggeredAnimation('#home-section', '.nativa-fade-in-up');

    if (!window.nativaHomeStatusListenerAttached) {
        // CORREÇÃO: Removido parâmetro 'event' não utilizado
        document.addEventListener('nativa:storeStatusChanged', () => {
            console.log(
                '[Home] Evento nativa:storeStatusChanged recebido via background task.'
            );
            initializeStatusSection();
            setHomeBackground();
        });
        window.nativaHomeStatusListenerAttached = true;
        console.log(
            '[Home] Listener para nativa:storeStatusChanged adicionado.'
        );
    }
}
