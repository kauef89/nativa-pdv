/**
 * Gerencia o carregamento e a atualização dos dados para a página "Minha Conta".
 * Refatorado para a arquitetura de módulos ES6.
 * OTIMIZAÇÃO (CACHE-FIRST): Implementa estratégia Stale-While-Revalidate para
 * exibir dados instantaneamente ao navegar, eliminando a sensação de "loading".
 */

import { state } from '../../core/main-state.js';
import {
    getMyAccountData,
    getMyAddresses,
    getMyOrderHistory,
    getAvailableRewards,
} from '../../core/nativa-api-service.js';
import { MyAccountUI } from './my-account-ui.js';
import {
    showToast,
    showOnboardingSheet,
} from '../../utils/nativa-ui-helpers.js';
import { decodeStreetNames } from '../address/address-handler.js';
import { formatNumberWithThousandSeparator } from '../../utils/nativa-utils.js';

let isPageVisible = true;
const originalPageTitle = document.title;
const PIX_EXPIRATION_SECONDS = 600; // 10 minutos

function _updatePageTitle(newStatusName) {
    if (newStatusName) {
        document.title = `Pedido ${newStatusName} - ${originalPageTitle}`;
    } else {
        document.title = originalPageTitle;
    }
}

export function updateNavigationLock(isLocked) {
    const navItems = document.querySelectorAll('.nativa-nav-item[data-route]');
    navItems.forEach((item) => {
        if (item.dataset.route === '/minha-conta') return;
        if (isLocked) {
            item.classList.add('is-disabled');
            item.setAttribute('aria-disabled', 'true');
            item.setAttribute('title', 'Complete seu cadastro para navegar');
        } else {
            item.classList.remove('is-disabled');
            item.removeAttribute('aria-disabled');
            item.removeAttribute('title');
        }
    });
    const navLockStyles = document.getElementById('nativa-nav-lock-styles');
    if (isLocked && !navLockStyles) {
        const style = document.createElement('style');
        style.id = 'nativa-nav-lock-styles';
        style.innerHTML = `.nativa-nav-item.is-disabled { pointer-events: none; opacity: 0.5; }`;
        document.head.appendChild(style);
    } else if (!isLocked && navLockStyles) {
        navLockStyles.remove();
    }
}

export async function loadOrderHistory() {
    try {
        const data = await getMyOrderHistory();

        if (!data || !Array.isArray(data.orders)) {
            console.error(
                'API retornou dados de histórico em formato inesperado:',
                data
            );
            return { currentOrder: null, pastOrders: [] };
        }

        const nowInSeconds = Date.now() / 1000;
        let currentOrder = null;
        let pastOrders = [];

        const ordersWithPaymentStatus = data.orders.map((order) => {
            if (order.payment_status) {
                if (order.payment_status === 'awaiting_api') {
                    const ageInSeconds = nowInSeconds - order.timestamp;
                    if (ageInSeconds > PIX_EXPIRATION_SECONDS) {
                        order.payment_status = 'expired';
                    }
                }
                return order;
            }

            const paymentMethod = order.details.pedido_metodo_pagamento;
            const isPixOrder =
                paymentMethod === 'pix-sicredi' ||
                paymentMethod === 'pix-manual' ||
                paymentMethod === 'pix-fallback' ||
                paymentMethod === 'pix-manual-fallback';

            if (order.payment_received) {
                order.payment_status = 'paid';
            } else if (isPixOrder) {
                const ageInSeconds = nowInSeconds - order.timestamp;
                order.payment_status =
                    ageInSeconds > PIX_EXPIRATION_SECONDS
                        ? 'expired'
                        : 'pending';
            } else {
                order.payment_status = 'not_applicable';
            }
            return order;
        });

        currentOrder =
            ordersWithPaymentStatus.find(
                (order) =>
                    !['finalizado', 'cancelado'].includes(order.status_slug)
            ) || null;

        if (currentOrder) {
            pastOrders = data.orders.filter(
                (order) => order.id !== currentOrder.id
            );
        } else {
            pastOrders = data.orders;
        }

        return { currentOrder, pastOrders };
    } catch (error) {
        console.error('Erro ao carregar histórico de pedidos:', error);
        const historyContainer = document.getElementById(
            'my-account-order-history-container'
        );
        if (historyContainer)
            historyContainer.innerHTML =
                '<p>Não foi possível carregar seu histórico.</p>';
        return { currentOrder: null, pastOrders: [] };
    }
}

export async function initializeMyAccount(forceReload = false) {
    if (!forceReload) {
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && !isPageVisible) {
                console.log(
                    '[Página SONDA] App voltou ao primeiro plano. Atualizando dados...'
                );
                initializeMyAccount(true);
            }
            isPageVisible = document.visibilityState === 'visible';
        });

        if (window.BroadcastChannel) {
            const channel = new BroadcastChannel('nativa-sw-channel');
            channel.onmessage = (event) => {
                if (event.data && event.data.type === 'STATUS_UPDATE') {
                    showToast('Seu pedido foi atualizado!', 'success');
                    initializeMyAccount(true);
                }
            };
        }
    }

    // --- INÍCIO DA OTIMIZAÇÃO (CACHE-FIRST) ---
    // Se já tivermos dados no estado e não for um recarregamento forçado,
    // renderizamos IMEDIATAMENTE o que temos na memória.
    // Isso elimina a sensação de "reload" ou "espera" ao navegar entre abas.
    if (!forceReload && state.user.profile && state.user.isLoggedIn) {
        console.log(
            '[MyAccount] Renderizando dados em cache (Instant Load)...'
        );
        const cachedRenderData = {
            ...state.user.profile,
            addresses: state.user.addresses,
            bairros: state.allBairros,
            currentOrder: state.user.currentOrder,
            orderHistory: state.user.orders,
            pendingPaymentOrder: state.user.pendingPaymentOrder,
            rewards: state.user.rewards,
        };
        // Renderiza instantaneamente
        MyAccountUI.renderMyAccountPage(cachedRenderData);

        if (state.user.currentOrder) {
            _updatePageTitle(state.user.currentOrder.status);
        }
    }
    // --- FIM DA OTIMIZAÇÃO ---

    try {
        // Busca os dados atualizados em segundo plano (Revalidate)
        const [accountData, addressesData, orderData, rewardsData] =
            await Promise.all([
                getMyAccountData(),
                getMyAddresses(),
                loadOrderHistory(),
                getAvailableRewards(),
            ]);

        // Atualiza o estado global
        Object.assign(state.user, {
            profile: accountData,
            addresses: decodeStreetNames(addressesData),
            currentOrder: orderData.currentOrder,
            pendingPaymentOrder:
                orderData.currentOrder &&
                (orderData.currentOrder.payment_status === 'pending' ||
                    orderData.currentOrder.payment_status ===
                        'manual_pending' ||
                    orderData.currentOrder.payment_status === 'awaiting_api' ||
                    orderData.currentOrder.payment_status ===
                        'failed_generation')
                    ? orderData.currentOrder
                    : null,
            orders: orderData.pastOrders,
            rewards: rewardsData,
        });

        const renderData = {
            ...accountData,
            addresses: state.user.addresses,
            bairros: state.allBairros,
            currentOrder: state.user.currentOrder,
            orderHistory: state.user.orders,
            pendingPaymentOrder: state.user.pendingPaymentOrder,
            rewards: state.user.rewards,
        };

        // Re-renderiza com os dados frescos (suavemente)
        MyAccountUI.renderMyAccountPage(renderData);

        if (orderData.currentOrder) {
            _updatePageTitle(orderData.currentOrder.status);
        } else {
            _updatePageTitle(null);
        }

        const pointsElement = MyAccountUI.selectors.profile.points;
        if (pointsElement) {
            const pointsGained = parseInt(
                sessionStorage.getItem('nativaLastOrderPoints'),
                10
            );
            if (pointsGained && pointsGained > 0) {
                const finalPoints = accountData.loyaltyPoints;
                const initialPoints = finalPoints - pointsGained;
                MyAccountUI.animatePoints(
                    pointsElement,
                    initialPoints,
                    finalPoints,
                    1500
                );
                sessionStorage.removeItem('nativaLastOrderPoints');
            }
        }

        if (!accountData.is_profile_complete) {
            updateNavigationLock(true);
            showOnboardingSheet(!accountData.dateOfBirth);
        } else {
            updateNavigationLock(false);
        }
    } catch (error) {
        console.warn('Falha ao inicializar dados da conta:', error.message);
        // Se falhar e não tínhamos dados em cache, aí sim mostramos erro ou deslogamos
        if (!state.user.profile) {
            state.user.isLoggedIn = false;
            throw error;
        }
    }
}
