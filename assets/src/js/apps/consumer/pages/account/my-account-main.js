// apps/consumer/pages/account/my-account-main.js

/**
 * Ponto de entrada principal para a funcionalidade da página "Minha Conta".
 * Refatorado para a arquitetura de módulos ES6.
 * ATUALIZAÇÃO (UI): Reorganização de abas (Pedidos | Fidelidade | Meus Dados) e botões de ação.
 */
import {
    openSheet,
    showToast,
    applyStaggeredAnimation,
} from '@utils/ui-helpers.js';
import { initializeMyAccount } from './my-account-data-manager.js';
import {
    handleToggleDetails,
    appendToOrderHistory,
    renderOrderHistory,
} from './my-account-order-ui.js';
import { state } from '@core/state/global-state.js';

import {
    handleCancelOrderClick,
    handleOrderAgain,
    handleReorderCheckboxChange,
    handleReorderAddToCart,
} from './my-account-order-handler.js';

import {
    handleDeleteAccount,
    handleOpenPhoneEditSheet,
    handlePhoneEditSubmit,
    handleRedeemRewardClick,
} from './my-account-profile-handler.js';

import { init as initAddressHandler } from '@shared/features/address/address-handler.js';
import { showModal } from '@ui/modals/modal.js';
import { MyAccountUI } from './my-account-ui.js';

import {
    askForPushPermission,
    initPushSubscription,
} from '@shared/services/push.js';
import { init as prepareSocialLogin } from '../../features/auth/login-prompt-handler.js';

let myAccountSection = null;
let isMyAccountInitialized = false;

// CORREÇÃO: Removido 'historyObserver' não utilizado
let allPastOrders = [];
let currentlyDisplayedCount = 0;

const INITIAL_LOAD_SIZE = 1;
const LOAD_MORE_BATCH_SIZE = 5;

async function setupPushNotificationButton() {
    const buttonContainer = document.getElementById('push-notification-prompt');
    if (!buttonContainer) return;

    if (
        !('serviceWorker' in navigator) ||
        !('PushManager' in window) ||
        !('Notification' in window)
    ) {
        buttonContainer.style.display = 'none';
        return;
    }

    try {
        const permission = Notification.permission;
        const button = buttonContainer.querySelector(
            '#enable-push-notifications'
        );
        if (!button) return;

        button.classList.remove('needs-attention', 'is-failure');

        if (permission === 'prompt' || permission === 'default') {
            buttonContainer.style.display = 'block';
            button.innerHTML = `<span class="material-symbols-rounded">notifications_active</span> Ativar Notificações de Pedidos`;
            button.disabled = false;
            button.classList.add('needs-attention');
            button.onclick = async () => {
                // CORREÇÃO: Removido 'permissionResult' não utilizado
                await askForPushPermission();
                setupPushNotificationButton();
            };
        } else if (permission === 'denied') {
            buttonContainer.style.display = 'block';
            button.innerHTML = `<span class="material-symbols-rounded">notifications_off</span> Notificações Bloqueadas`;
            button.disabled = false;
            button.classList.add('is-failure');
            button.onclick = () => {
                showModal({
                    title: 'Notificações Bloqueadas',
                    iconName: 'notifications_off',
                    message:
                        'Você bloqueou as notificações para este site. Para receber avisos sobre seus pedidos e promoções, por favor, reative-as nas configurações de notificação do seu navegador.',
                    confirmText: 'Entendi',
                });
            };
        } else {
            buttonContainer.style.display = 'none';
            await initPushSubscription();
        }
    } catch (error) {
        console.error('Erro ao configurar botão de push:', error);
        if (buttonContainer) buttonContainer.style.display = 'none';
    }
}

function _showLegalSheet(contentId) {
    const legalSheet = document.getElementById('nativa-legal-sheet');
    const titleEl = document.getElementById('nativa-legal-sheet-title');
    const contentEl = document.getElementById('nativa-legal-sheet-content');
    const sourceContentEl = document.getElementById(
        `legal-content-${contentId}`
    );

    if (!legalSheet || !titleEl || !contentEl || !sourceContentEl) {
        console.error(
            `[MyAccount Main] Elementos da ficha legal não encontrados.`
        );
        showToast('Não foi possível carregar o conteúdo.', 'error');
        return;
    }

    const titleText =
        contentId === 'privacy'
            ? 'Política de Privacidade'
            : 'Termos de Serviço';

    titleEl.textContent = titleText;
    contentEl.innerHTML = sourceContentEl.innerHTML;
    // openSheet continua sendo usado aqui, mas não closeSheet
    // Se precisar abrir a sheet, openSheet já foi importado.
    // O import de closeSheet foi removido lá em cima pois não é usado neste arquivo.
    // Nota: openSheet está sendo usado na linha 391 deste arquivo original (dentro de init -> isLoggedOutView listener)
    // Então openSheet deve ser mantido.
}

/**
 * Reestrutura o DOM da página "Minha Conta" para usar uma interface de abas.
 * ORDEM ATUALIZADA: Pedidos | Fidelidade | Meus Dados
 */
function _setupTabs() {
    const loggedInView = document.getElementById('my-account-logged-in-view');
    if (!loggedInView || loggedInView.querySelector('.nativa-tabs-nav')) {
        return;
    }

    const profileCard = loggedInView.querySelector('.nativa-profile-card');
    const pendingPayment = document.getElementById(
        'nativa-pending-payment-container'
    );
    const currentOrder = document.getElementById(
        'nativa-current-order-card-wrapper'
    );
    const orderHistory = document.getElementById(
        'my-account-order-history-container'
    );
    const allCards = loggedInView.querySelectorAll('.nativa-account-card');
    let addressCard = null;
    let managementCard = null;
    let naFaixaCardPlaceholder = null;
    let loyaltyRulesCard = null;
    let rewardsListCard = null;

    allCards.forEach((card) => {
        if (card.querySelector('#address-list-container')) addressCard = card;
        else if (card.querySelector('#manage-account-name'))
            managementCard = card;
        else if (card.querySelector('.nativa-loyalty-balance-card'))
            naFaixaCardPlaceholder = card;
        else if (card.querySelector('#loyalty-rules-details'))
            loyaltyRulesCard = card;
        else if (card.querySelector('#nativa-rewards-list-container'))
            rewardsListCard = card;
    });

    const pushPromptContainer = document.createElement('div');
    pushPromptContainer.id = 'push-notification-prompt';
    pushPromptContainer.className = 'push-notification-prompt-container';
    pushPromptContainer.style.display = 'none';
    pushPromptContainer.innerHTML = `<button id="enable-push-notifications" class="nativa-button-secondary"></button>`;

    const tabNav = document.createElement('div');
    tabNav.className = 'nativa-tabs-nav';
    // --- ALTERAÇÃO: Ordem e Nomes das Abas ---
    tabNav.innerHTML = `
        <button class="nativa-tab-item is-active" data-tab="pedidos">Pedidos</button>
        <button class="nativa-tab-item" data-tab="fidelidade">Fidelidade</button>
        <button class="nativa-tab-item" data-tab="meus-dados">Meus Dados</button>
    `;

    const tabContent = document.createElement('div');
    tabContent.className = 'nativa-tabs-content';

    // Painel 1: Pedidos
    const panelPedidos = document.createElement('div');
    panelPedidos.id = 'tab-pedidos';
    panelPedidos.className = 'nativa-tab-panel is-active';

    // Painel 2: Fidelidade (Antigo Na Faixa)
    const panelFidelidade = document.createElement('div');
    panelFidelidade.id = 'tab-fidelidade';
    panelFidelidade.className = 'nativa-tab-panel';

    // Painel 3: Meus Dados (Antigo Informações)
    const panelMeusDados = document.createElement('div');
    panelMeusDados.id = 'tab-meus-dados';
    panelMeusDados.className = 'nativa-tab-panel';

    // Distribuição de Conteúdo
    if (pendingPayment) panelPedidos.appendChild(pendingPayment);
    if (currentOrder) panelPedidos.appendChild(currentOrder);
    if (orderHistory) panelPedidos.appendChild(orderHistory);

    if (naFaixaCardPlaceholder)
        panelFidelidade.appendChild(naFaixaCardPlaceholder);
    if (loyaltyRulesCard) panelFidelidade.appendChild(loyaltyRulesCard);
    if (rewardsListCard) panelFidelidade.appendChild(rewardsListCard);

    if (managementCard) panelMeusDados.appendChild(managementCard);
    if (addressCard) panelMeusDados.appendChild(addressCard);

    // --- ALTERAÇÃO: Card de Ações (Sair/Excluir/Legal) ---
    const actionsCard = document.createElement('div');
    actionsCard.className = 'nativa-account-card is-actions-card';
    if (managementCard) {
        const logoutBtn = managementCard.querySelector(
            '#my-account-logout-button'
        );
        const deleteLink = managementCard.querySelector(
            '.nativa-delete-account-link'
        );
        const legalLinksFooter = managementCard.querySelector(
            '.nativa-legal-links-footer'
        );

        if (logoutBtn) actionsCard.appendChild(logoutBtn);
        if (deleteLink) actionsCard.appendChild(deleteLink);
        if (legalLinksFooter) actionsCard.appendChild(legalLinksFooter);
    }

    // Adiciona o card de ações DENTRO da aba Meus Dados
    if (actionsCard.hasChildNodes()) {
        panelMeusDados.appendChild(actionsCard);
    }

    // Montagem final do DOM
    loggedInView.innerHTML = '';
    if (profileCard) {
        loggedInView.appendChild(profileCard);
        profileCard.insertAdjacentElement('afterend', pushPromptContainer);
    }
    loggedInView.appendChild(tabNav);

    // Ordem dos painéis no DOM
    tabContent.appendChild(panelPedidos);
    tabContent.appendChild(panelFidelidade);
    tabContent.appendChild(panelMeusDados);

    loggedInView.appendChild(tabContent);

    // Listener de Navegação
    tabNav.addEventListener('click', (event) => {
        const button = event.target.closest('.nativa-tab-item');
        if (!button || button.classList.contains('is-active')) return;

        loggedInView
            .querySelector('.nativa-tab-item.is-active')
            ?.classList.remove('is-active');
        loggedInView
            .querySelector('.nativa-tab-panel.is-active')
            ?.classList.remove('is-active');

        button.classList.add('is-active');
        const newActivePanelId = `tab-${button.dataset.tab}`;
        const newActivePanel = document.getElementById(newActivePanelId);
        if (newActivePanel) newActivePanel.classList.add('is-active');
    });
}

function loadMoreHistoryItems() {
    if (!Array.isArray(allPastOrders)) allPastOrders = [];

    if (currentlyDisplayedCount >= allPastOrders.length) {
        const trigger = document.getElementById('show-full-history-btn');
        if (trigger) trigger.remove();
        return;
    }

    const nextBatch = allPastOrders.slice(
        currentlyDisplayedCount,
        currentlyDisplayedCount + LOAD_MORE_BATCH_SIZE
    );
    appendToOrderHistory(nextBatch);
    currentlyDisplayedCount += nextBatch.length;

    if (currentlyDisplayedCount >= allPastOrders.length) {
        const trigger = document.getElementById('show-full-history-btn');
        if (trigger) trigger.remove();
    }
}

function setupHistoryLoader() {
    const triggerButton = document.getElementById('show-full-history-btn');
    if (!triggerButton) return;

    triggerButton.removeEventListener('click', loadMoreHistoryItems);
    triggerButton.addEventListener('click', loadMoreHistoryItems);
}

async function handleLogout() {
    const confirmation = await showModal({
        title: 'Sair da Conta',
        iconName: 'logout',
        message: 'Tem certeza que deseja sair da sua conta?',
        confirmText: 'Sim, Sair',
        cancelText: 'Não',
        isCritical: true,
    });

    if (confirmation) {
        const logoutUrl = window.nativaDeliveryData?.logout_url;
        if (logoutUrl) {
            window.location.href = logoutUrl;
        } else {
            console.error('URL de logout não encontrada.');
            showToast('Erro ao tentar sair. URL não configurada.', 'error');
        }
    }
}

function handleCancelOrder(button) {
    if (button.disabled) {
        showToast(
            'Não é possível cancelar um pedido que já está sendo preparado.',
            'info'
        );
    } else {
        handleCancelOrderClick(button);
    }
}

async function handlePageEvents(event) {
    const target = event.target;

    const toggleBtn = target.closest('.toggle-details-btn');
    if (toggleBtn) {
        const detailsId = toggleBtn.dataset.orderId;
        if (detailsId === 'loyalty-rules') {
            const rulesContent = document.querySelector(
                '.loyalty-rules-content'
            );
            if (rulesContent) {
                const isVisible = rulesContent.style.display === 'block';
                rulesContent.style.display = isVisible ? 'none' : 'block';
                toggleBtn.innerHTML = isVisible
                    ? `Ver Regras <span class="material-symbols-rounded">expand_more</span>`
                    : `Ocultar Regras <span class="material-symbols-rounded">expand_less</span>`;
            }
        } else {
            handleToggleDetails(event);
        }
        return;
    }

    const redeemBtn = target.closest(
        '.nativa-redeem-product-btn:not([disabled])'
    );
    if (redeemBtn) {
        handleRedeemRewardClick(redeemBtn.dataset.productId);
        return;
    }

    const actionMap = {
        '#my-account-logout-button': handleLogout,
        '.cancel-order-btn': (btn) => handleCancelOrder(btn),
        '.order-again-btn': (btn) => handleOrderAgain(btn.dataset.orderId),
        '.nativa-delete-account-link': (link, e) => {
            e.preventDefault();
            handleDeleteAccount();
        },
        '#edit-phone-btn': handleOpenPhoneEditSheet,
    };

    for (const selector in actionMap) {
        const element = target.closest(selector);
        if (element) {
            actionMap[selector](element, event);
            return;
        }
    }

    const legalLink = target.closest('.nativa-legal-link');
    if (legalLink) {
        event.preventDefault();
        const contentId = legalLink.dataset.contentId;
        if (contentId) {
            _showLegalSheet(contentId);
        }
        return;
    }

    if (target.closest('.nativa-redeem-product-btn[disabled]')) {
        showToast(
            'Você ainda não tem pontos suficientes para esta recompensa.',
            'info'
        );
        return;
    }
}

function handleSheetEvents(event) {
    const target = event.target;

    const reorderCheckbox = target.closest('.reorder-item-checkbox-input');
    if (reorderCheckbox) {
        handleReorderCheckboxChange();
        return;
    }

    const reorderAddBtn = target.closest('#reorder-sheet-add-to-cart-btn');
    if (reorderAddBtn) {
        handleReorderAddToCart(reorderAddBtn);
        return;
    }
}

function handleDelegatedSubmits(event) {
    const phoneForm = event.target.closest('#phone-edit-form');
    if (phoneForm) {
        event.preventDefault();
        handlePhoneEditSubmit(phoneForm);
    }
}

export function init() {
    const currentPath = window.location.pathname.replace(/\/$/, '');

    if (currentPath === '/privacidade' || currentPath === '/termos') {
        const legalSection = document.getElementById('legal-section');
        if (legalSection) {
            const loggedInView = document.getElementById(
                'my-account-logged-in-view'
            );
            const loggedOutView = document.getElementById(
                'my-account-logged-out-view'
            );
            if (loggedInView) loggedInView.style.display = 'none';
            if (loggedOutView) loggedOutView.style.display = 'none';

            const privacyContent = document.getElementById(
                'legal-content-privacy'
            );
            const termsContent = document.getElementById('legal-content-terms');

            if (privacyContent && termsContent) {
                if (currentPath === '/privacidade') {
                    privacyContent.style.display = 'block';
                    termsContent.style.display = 'none';
                } else {
                    privacyContent.style.display = 'none';
                    termsContent.style.display = 'block';
                }
            }
        }
        return;
    }

    myAccountSection = document.getElementById('my-account-section');
    if (!myAccountSection) {
        console.warn(
            '[MyAccount Main] Seção #my-account-section não encontrada.'
        );
        return;
    }

    if (
        isMyAccountInitialized &&
        myAccountSection.dataset.initialized === 'true'
    ) {
        const isLoggedInView = document.getElementById(
            'my-account-logged-in-view'
        );
        const isLoggedOutView = document.getElementById(
            'my-account-logged-out-view'
        );

        if (state.user.isLoggedIn && isLoggedInView && isLoggedOutView) {
            isLoggedInView.style.display = 'block';
            isLoggedOutView.style.display = 'none';
            setupPushNotificationButton();
        } else if (
            !state.user.isLoggedIn &&
            isLoggedInView &&
            isLoggedOutView
        ) {
            isLoggedInView.style.display = 'none';
            isLoggedOutView.style.display = 'block';
            const loginContainer = isLoggedOutView.querySelector(
                '#nativa-social-login-container'
            );
            if (loginContainer && typeof prepareSocialLogin === 'function') {
                prepareSocialLogin();
            }
        }
        return;
    }

    isMyAccountInitialized = true;
    myAccountSection.dataset.initialized = 'true';

    const isLoggedInView = document.getElementById('my-account-logged-in-view');
    const isLoggedOutView = document.getElementById(
        'my-account-logged-out-view'
    );

    if (isLoggedOutView && !state.user.isLoggedIn) {
        applyStaggeredAnimation(
            '#my-account-logged-out-view',
            '.nativa-fade-in-up'
        );
        const loginContainer = isLoggedOutView.querySelector(
            '#nativa-social-login-container'
        );
        if (loginContainer && typeof prepareSocialLogin === 'function') {
            prepareSocialLogin();
        }
        if (isLoggedInView) isLoggedInView.style.display = 'none';
        isLoggedOutView.style.display = 'block';

        isLoggedOutView.addEventListener('click', (event) => {
            const legalLink = event.target.closest('.nativa-legal-link');
            if (legalLink) {
                event.preventDefault();
                const contentId = legalLink.dataset.contentId;
                if (contentId) {
                    _showLegalSheet(contentId);
                }
                return;
            }
            const loginBtn = event.target.closest(
                '#nativa-trigger-login-prompt'
            );
            if (loginBtn) {
                const loginSheet = document.getElementById(
                    'nativa-login-prompt-sheet'
                );
                // openSheet também precisa ser importado e usado, ele está aqui e ok.
                if (loginSheet) openSheet(loginSheet);
            }
        });
    } else if (isLoggedInView && state.user.isLoggedIn) {
        if (isLoggedOutView) isLoggedOutView.style.display = 'none';
        isLoggedInView.style.display = 'block';

        myAccountSection.removeEventListener('click', handlePageEvents);
        myAccountSection.addEventListener('click', handlePageEvents);
        document.body.removeEventListener('click', handleSheetEvents);
        document.body.addEventListener('click', handleSheetEvents);
        myAccountSection.removeEventListener('submit', handleDelegatedSubmits);
        myAccountSection.addEventListener('submit', handleDelegatedSubmits);

        initAddressHandler('my-account-section');

        if (!window.nativaMyAccountAddressListener) {
            document.addEventListener('nativa:addressUpdated', (event) => {
                const { source, addresses } = event.detail;
                if (source === 'my-account') {
                    MyAccountUI.renderAddressSection(
                        addresses,
                        state.allBairros
                    );
                }
            });
            window.nativaMyAccountAddressListener = true;
        }

        if (!window.nativaMyAccountOrderListener) {
            document.addEventListener('nativa:newOrderPlaced', () => {
                initializeMyAccount(true);
            });
            window.nativaMyAccountOrderListener = true;
        }

        try {
            _setupTabs();
            setupPushNotificationButton();

            initializeMyAccount()
                .then(() => {
                    allPastOrders = state.user.orders || [];
                    const initialBatch = allPastOrders.slice(
                        0,
                        INITIAL_LOAD_SIZE
                    );
                    currentlyDisplayedCount = initialBatch.length;

                    renderOrderHistory(initialBatch);

                    if (allPastOrders.length > currentlyDisplayedCount) {
                        setupHistoryLoader();
                    }
                })
                .catch((error) => {
                    console.error(
                        '[MyAccount Main] Erro CRÍTICO ao carregar dados da conta:',
                        error
                    );
                    showToast(
                        'Não foi possível carregar os dados da sua conta. Tente recarregar a página.',
                        'error'
                    );
                    if (isLoggedInView) isLoggedInView.style.display = 'none';
                    if (isLoggedOutView) {
                        isLoggedOutView.style.display = 'block';
                        const loginContainer = isLoggedOutView.querySelector(
                            '#nativa-social-login-container'
                        );
                        if (
                            loginContainer &&
                            typeof prepareSocialLogin === 'function'
                        ) {
                            prepareSocialLogin();
                        }
                    }
                });
        } catch (error) {
            console.error(
                '[MyAccount Main] Erro na configuração inicial da UI logada:',
                error
            );
            showToast('Erro ao configurar a página Minha Conta.', 'error');
            if (isLoggedInView) isLoggedInView.style.display = 'none';
            if (isLoggedOutView) {
                isLoggedOutView.style.display = 'block';
                const loginContainer = isLoggedOutView.querySelector(
                    '#nativa-social-login-container'
                );
                if (
                    loginContainer &&
                    typeof prepareSocialLogin === 'function'
                ) {
                    prepareSocialLogin();
                }
            }
        }
    } else {
        myAccountSection.innerHTML =
            '<p>Ocorreu um erro ao carregar esta seção. Tente recarregar a página.</p>';
    }
}
