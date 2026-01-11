// apps/consumer/boot-consumer.js

import { initBackgroundTasks } from '@shared/services/store-status.js';
import { initGlobalInteractions } from './layout/interactions.js';
import { Router } from './router.js';
import { hydrateStateFromWindow, fetchCoreData } from '@utils/helpers.js';
import { state } from '@core/state/global-state.js';
import { init as initCart } from './features/cart/cart-main.js';
import { init as initCheckout } from './pages/checkout/checkout-main.js';
import { init as initPixPayment } from '@shared/features/payment/pix/pix-logic.js';
import { registerSW } from 'virtual:pwa-register';
import { initPushSubscription } from '@shared/services/push.js';
import { showUpdatePrompt } from '@utils/ui-helpers.js';

if (state.isInitialized) {
    console.warn(
        '[Main] Tentativa de dupla inicialização bloqueada pelo state flag.'
    );
} else {
    state.isInitialized = true;

    console.log('Nativa Delivery App Initialized.');

    if ('serviceWorker' in navigator && !import.meta.env.DEV) {
        const isPedidosPage = window.nativaDeliveryData?.isPedidosPage;

        if (isPedidosPage === false) {
            console.log(
                '[Main] Página do Consumidor. Registrando o Service Worker da PWA principal.'
            );
            const updateSW = registerSW({
                onNeedRefresh() {
                    console.log(
                        'Nova versão do app disponível. Exibindo prompt para o usuário.'
                    );
                    showUpdatePrompt(updateSW);
                },
                onOfflineReady() {
                    console.log('App pronto para funcionar offline.');
                },
            });
        } else if (isPedidosPage === true) {
            console.log(
                '[Main] Página de Pedidos. Registrando o Service Worker do Dashboard.'
            );
            // --- INÍCIO DA MODIFICAÇÃO: Revertido para o caminho real do arquivo ---
            const swURL =
                window.nativaDeliveryData.pluginUrl +
                'assets/src/js/pedidos-sw.js';
            // --- FIM DA MODIFICAÇÃO ---
            navigator.serviceWorker
                .register(swURL, { scope: '/pedidos/' })
                .then((registration) => {
                    console.log(
                        `[Main] SW do Dashboard registrado com sucesso no escopo: ${registration.scope}`
                    );
                })
                .catch((error) => {
                    console.error(
                        `[Main] Falha ao registrar o SW do Dashboard: ${error}`
                    );
                });
        } else {
            console.warn(
                '[Main] Não foi possível determinar o contexto da página (isPedidosPage não definido). Nenhum Service Worker será registrado.'
            );
        }
    } else {
        console.log(
            '[Main] Modo de desenvolvimento detectado. Registro do Service Worker pulado.'
        );
    }

    document.addEventListener('DOMContentLoaded', async () => {
        // --- INÍCIO DA MODIFICAÇÃO: Lógica do dashboard removida ---
        // A verificação 'const pedidosDashboard = ...' e o bloco 'if (pedidosDashboard) { ... }'
        // foram removidos. Este arquivo agora é exclusivo do app do consumidor.
        // --- FIM DA MODIFICAÇÃO ---

        hydrateStateFromWindow();

        state.user.isLoggedIn = !!(
            window.nativaDeliveryData.ajax_nonce &&
            window.nativaDeliveryData.ajax_nonce !== ''
        );

        initPushSubscription();

        window.addEventListener('unhandledrejection', (event) => {
            console.error('Rejeição de promessa não tratada:', event.reason);
        });

        window.onerror = (message, source, lineno, colno, error) => {
            console.error('Erro de JavaScript não capturado:', {
                message,
                source,
                lineno,
                colno,
                error,
            });
        };

        window.addEventListener('offline', () => {
            console.warn(
                'Conexão perdida. As funcionalidades de rede podem não funcionar.'
            );
        });

        window.addEventListener('online', () => {
            console.info('Conexão restaurada.');
        });

        const appContainer = document.getElementById('nativa-app-container');
        const checkoutPage = document.getElementById('nativa-checkout-page');
        const pixPaymentWrapper = document.getElementById(
            'nativa-pix-payment-wrapper'
        );

        if (appContainer || checkoutPage || pixPaymentWrapper) {
            initGlobalInteractions();

            await fetchCoreData();

            initCart();
            initBackgroundTasks();

            if (appContainer) {
                console.log(
                    '[Main] Container da SPA detectado. Todos os dados carregados. Inicializando o roteador.'
                );
                Router.init();
                document.dispatchEvent(
                    new CustomEvent('nativa:storeStatusChanged')
                );
            } else if (checkoutPage) {
                console.log(
                    '[Main] Página de Checkout detectada. Inicializando o módulo de checkout.'
                );
                initCheckout();
            } else if (pixPaymentWrapper) {
                console.log(
                    '[Main] Página de pagamento PIX detectada. Inicializando o módulo PIX.'
                );
                initPixPayment();
            }
        }

        document.addEventListener('nativa:userLoggedIn', () => {
            console.log(
                '[Main] Evento nativa:userLoggedIn capturado. Atualizando a UI da página atual.'
            );
            state.user.isLoggedIn = true;

            initPushSubscription();

            if (appContainer) {
                Router.navigateTo(window.location.pathname);
            } else if (checkoutPage) {
                initCheckout();
            }
        });
    });
}
