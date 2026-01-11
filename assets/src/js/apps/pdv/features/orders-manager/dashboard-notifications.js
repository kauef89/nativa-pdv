// apps/pdv/features/orders-manager/dashboard-notifications.js

import { showModal } from '@ui/modals/modal.js';
import { showToast } from '@utils/ui-helpers.js';
import * as api from './dashboard-api.js';
import { state } from './dashboard-state.js';

// Nome do canal deve ser o mesmo usado no Service Worker
const BROADCAST_CHANNEL_NAME = 'nativa-dashboard-updates';
let broadcastChannel = null;
let notificationAudio = null;
// CORREÇÃO: Removida a variável 'audioInterval' não utilizada
const originalTitle = document.title;
let lastPendingOrderIds = new Set(); // Mantém o controle dos pedidos pendentes já vistos/notificados

// --- Funções de Notificação Push ---
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function subscribeDashboardToPush() {
    const vapidPublicKey = window.nativaDeliveryData?.vapidPublicKey;
    if (!vapidPublicKey) {
        showToast('Chave de notificação não configurada no servidor.', 'error');
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            showToast('Permissão para notificações não concedida.', 'info');
            updatePushNotificationButton(permission);
            return;
        }

        const registration =
            await navigator.serviceWorker.getRegistration('/pedidos/');
        if (!registration) {
            showToast('Service Worker do dashboard não encontrado.', 'error');
            return;
        }

        let subscription = await registration.pushManager.getSubscription();
        if (!subscription) {
            const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: applicationServerKey,
            });
            console.log('Nova inscrição Push criada:', subscription);
        } else {
            console.log('Inscrição Push existente encontrada:', subscription);
        }

        await api.saveDashboardPushSubscription(subscription);
        showToast('Notificações ativadas para este dispositivo!', 'success');
        updatePushNotificationButton('granted');
    } catch (error) {
        console.error('Erro ao inscrever para push do dashboard:', error);
        showToast(
            'Não foi possível ativar as notificações. Verifique o console.',
            'error'
        );
        updatePushNotificationButton('default');
    }
}

export function updatePushNotificationButton(permission) {
    const button = document.getElementById('dashboard-push-toggle');
    if (!button) return;
    const buttonTextSpan = button.querySelector('.button-text');

    if (permission === 'granted') {
        button.innerHTML = `<span class="material-symbols-rounded">notifications_active</span><span class="button-text">Notificações Ativas</span>`;
        button.classList.add('active');
        button.classList.remove('is-denied');
        button.disabled = true;
        button.title = 'As notificações estão ativas para este dispositivo.';
    } else if (permission === 'denied') {
        button.innerHTML = `<span class="material-symbols-rounded">notifications_off</span><span class="button-text">Notificações Bloqueadas</span>`;
        button.classList.add('is-denied');
        button.classList.remove('active');
        button.disabled = false;
        button.title =
            'As notificações foram bloqueadas. Clique para saber mais.';
    } else {
        button.innerHTML = `<span class="material-symbols-rounded">add_alert</span><span class="button-text">Ativar Notificações</span>`;
        button.classList.remove('active', 'is-denied');
        button.disabled = false;
        button.title = 'Clique para ativar notificações de novos pedidos.';
    }

    if (buttonTextSpan) {
        // A lógica de esconder/mostrar texto pode ser CSS
    }
}

export function setupPushNotifications() {
    const headerActions = document.querySelector('.header-actions');
    if (!headerActions) return;

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push Notifications não são suportadas neste navegador.');
        return;
    }

    let button = document.getElementById('dashboard-push-toggle');
    if (!button) {
        button = document.createElement('button');
        button.id = 'dashboard-push-toggle';
        button.className = 'header-button icon-only';
        headerActions.appendChild(button);
    }

    updatePushNotificationButton(Notification.permission);

    button.addEventListener('click', () => {
        if (
            Notification.permission === 'prompt' ||
            Notification.permission === 'default'
        ) {
            subscribeDashboardToPush();
        } else if (Notification.permission === 'denied') {
            showModal({
                title: 'Notificações Bloqueadas',
                iconName: 'notifications_off',
                message:
                    'Você bloqueou as notificações para este site.\n\nPara reativá-las, procure pelas configurações de notificação do seu navegador e permita as notificações para este endereço.',
                confirmText: 'Entendi',
            });
        }
    });
}
// --- FIM Funções Push ---

/**
 * Inicializa o listener do BroadcastChannel para atualizações do Service Worker.
 * @param {Function} onUpdateReceived - Callback a ser executado quando uma atualização é recebida.
 */
export function initializeBroadcastChannelListener(onUpdateReceived) {
    if (!window.BroadcastChannel) {
        console.warn(
            'BroadcastChannel não é suportado neste navegador. As atualizações em tempo real entre abas podem não funcionar.'
        );
        return;
    }
    if (broadcastChannel) {
        broadcastChannel.close();
    }
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
    console.log(
        '[Dashboard Notifications] Ouvindo mensagens no BroadcastChannel:',
        BROADCAST_CHANNEL_NAME
    );

    broadcastChannel.onmessage = (event) => {
        console.log(
            '[Dashboard Notifications] Mensagem recebida via BroadcastChannel:',
            event.data
        );
        if (event.data && event.data.type === 'order_update') {
            console.log(
                '[Dashboard Notifications] Mensagem de order_update recebida. Acionando callback...'
            );
            onUpdateReceived(); // Chama a função passada (que deve chamar fetchData)
        }
    };
    broadcastChannel.onmessageerror = (event) => {
        console.error(
            '[Dashboard Notifications] Erro ao receber mensagem via BroadcastChannel:',
            event
        );
    };
}

/**
 * Exibe uma notificação nativa do navegador.
 * @param {Array} newOrders - Array de novos pedidos (usado para gerar a mensagem).
 */
function showNativeNotification(newOrders) {
    if (!('Notification' in window) || Notification.permission !== 'granted')
        return;
    if (!Array.isArray(newOrders) || newOrders.length === 0) return;
    const firstNewOrder = newOrders[0];
    if (!firstNewOrder || !firstNewOrder.id || !firstNewOrder.customer_name) {
        console.warn('Dados incompletos para notificação nativa.');
        return;
    }
    const title = `Novo Pedido Recebido (#${firstNewOrder.id})!`;
    const body =
        newOrders.length > 1
            ? `Você recebeu ${newOrders.length} novos pedidos.`
            : `Novo pedido de ${firstNewOrder.customer_name}.`;
    const iconPath = window.nativaDeliveryData?.pluginUrl
        ? window.nativaDeliveryData.pluginUrl +
          'assets/icons/dashboard/icon-192x192.png'
        : '/wp-content/plugins/nativa-delivery/assets/icons/dashboard/icon-192x192.png';
    new Notification(title, {
        body: body,
        icon: iconPath,
        tag: 'nativa-delivery-novo-pedido',
        renotify: true,
    });
}

/**
 * Gerencia o som de notificação e o título da página com base nos pedidos pendentes.
 * @param {boolean} isInitialLoad - Indica se é a primeira carga da página.
 */
export function handlePendingOrderNotifications(isInitialLoad) {
    const allFilteredOrders = state.currentFilteredOrders; // Usa o estado filtrado atual
    if (!Array.isArray(allFilteredOrders)) return;

    const pendingOrders = allFilteredOrders.filter(
        (order) =>
            order.status === 'pendente' ||
            order.status === 'aguardando-pagamento'
    );
    const currentPendingIds = new Set(pendingOrders.map((order) => order.id));
    const newPendingOrders = pendingOrders.filter(
        (order) => !lastPendingOrderIds.has(order.id)
    );

    // Toca som apenas uma vez por novo pedido pendente detectado
    if (
        newPendingOrders.length > 0 &&
        notificationAudio &&
        state.isAutoRefreshActive
    ) {
        console.log(
            '[Dashboard Notifications] Novo(s) pedido(s) pendente(s) detectado(s). Tocando som...'
        );
        notificationAudio
            .play()
            .catch((e) =>
                console.warn(
                    'Não foi possível tocar o áudio de notificação:',
                    e
                )
            );
    }

    // Mostra notificação nativa (se não for a carga inicial)
    if (!isInitialLoad && newPendingOrders.length > 0) {
        showNativeNotification(newPendingOrders);
    }

    // Atualiza título da página
    document.title =
        pendingOrders.length > 0
            ? `(${pendingOrders.length}) Novo(s) Pedido(s)!`
            : originalTitle;

    // Atualiza o set de IDs pendentes para a próxima verificação
    lastPendingOrderIds = currentPendingIds;
}

/**
 * Inicializa o elemento de áudio.
 */
export function initializeAudio() {
    const audioEl = document.getElementById('nativa-notification-sound');
    if (audioEl) {
        notificationAudio = audioEl;
        // Tenta 'desbloquear' o áudio para autoplay em navegadores restritivos
        const playAudio = () => {
            if (!notificationAudio) return;
            notificationAudio
                .play()
                .then(() => {
                    notificationAudio.pause(); // Pausa imediatamente após tocar um instante
                    // Remove listeners após sucesso
                    document.removeEventListener('click', playAudio, true);
                    document.removeEventListener('touchstart', playAudio, true);
                    console.log(
                        '[Dashboard Notifications] Áudio desbloqueado para autoplay.'
                    );
                })
                .catch(() => {
                    // Ignora erros (autoplay pode estar bloqueado até interação)
                    console.warn(
                        '[Dashboard Notifications] Autoplay do áudio possivelmente bloqueado. Aguardando interação.'
                    );
                });
        };
        // Tenta tocar silenciosamente no carregamento
        playAudio();
        // Adiciona listeners para interação do usuário como fallback
        document.addEventListener('click', playAudio, {
            once: true,
            capture: true,
        });
        document.addEventListener('touchstart', playAudio, {
            once: true,
            capture: true,
        });
    } else {
        console.error(
            '[Dashboard Notifications] Elemento de áudio para notificação não encontrado.'
        );
    }
}
