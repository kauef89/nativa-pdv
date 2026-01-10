// assets/src/js/sw-logic.js - Service Worker
// VERSÃO DE DEPURAÇÃO: Adiciona logs detalhados para rastrear o recebimento e exibição de notificações.
// ATUALIZAÇÃO (UI Sync): Adiciona a lógica de BroadcastChannel para notificar a aplicação
// em primeiro plano sobre atualizações de status, permitindo a atualização em tempo real da UI.
// ATUALIZAÇÃO (Ícones): Atualiza o caminho dos ícones de notificação para a nova estrutura de pastas.
// ATUALIZAÇÃO (Filtro 'Finalizado'): Impede a exibição de notificações para o status 'finalizado'.

import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate, CacheFirst } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

precacheAndRoute(self.__WB_MANIFEST || []);

registerRoute(
    ({ url }) => url.pathname.includes('/wp-json/nativa-delivery/v1/menu-data'),
    new StaleWhileRevalidate({
        cacheName: 'nativa-api-cache',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
        ],
    })
);

registerRoute(
    // A condição agora verifica se o destino é 'font' ou 'image' E se a origem é a mesma do site.
    ({ request, url }) =>
        (request.destination === 'font' || request.destination === 'image') &&
        url.origin === self.location.origin,
    new CacheFirst({
        cacheName: 'nativa-static-assets-cache',
        plugins: [
            new CacheableResponsePlugin({
                statuses: [0, 200],
            }),
        ],
    })
);

self.addEventListener('install', () => {
    console.log('[SW DEBUG] Service Worker instalando...');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('[SW DEBUG] Service Worker ativando...');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
    console.log('[SW DEBUG 1/4] Evento PUSH recebido pelo Service Worker!');

    if (!event.data) {
        console.error('[SW DEBUG FALHA] Evento push não continha dados.');
        return;
    }
    console.log('[SW DEBUG 2/4] Dados brutos recebidos:', event.data.text());

    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        console.warn(
            '[SW DEBUG] Dados do push não são JSON, tratando como texto.',
            e
        );
        data = {
            title: 'Nova Notificação',
            body: event.data.text(),
            // Adicione uma propriedade 'status' padrão ou vazia se não for JSON
            status: '',
        };
    }
    console.log('[SW DEBUG 3/4] Dados do push processados:', data);

    // --- INÍCIO DA MODIFICAÇÃO (Filtro 'Finalizado') ---
    // Verifica se a notificação é referente ao status 'finalizado'
    // A propriedade no payload que indica o status pode precisar ser ajustada (ex: data.newStatus, data.orderStatus)
    // Assumindo que a propriedade se chama 'status' por enquanto.
    if (data.status === 'finalizado') {
        console.log(
            '[SW DEBUG] Notificação para status "finalizado" ignorada.'
        );
        return; // Impede a exibição da notificação
    }
    // --- FIM DA MODIFICAÇÃO ---

    const title = data.title || 'Nativa Delivery';

    let options = {
        body: data.body || 'Você tem uma nova atualização.',
        icon:
            data.icon ||
            '/wp-content/plugins/nativa-delivery/assets/icons/main-app/icon-192x192.png',
        badge: '/wp-content/plugins/nativa-delivery/assets/icons/main-app/notification-badge.png',
        data: {
            url: data.url || '/minha-conta',
            postId: data.postId,
            userId: data.userId,
            // Incluir o status nos dados pode ser útil para a lógica de UI Sync
            status: data.status,
        },
        tag: 'nativa-delivery-pedido-update',
        renotify: true,
    };

    if (data.isUrgent) {
        console.log(
            '[SW DEBUG] Notificação URGENTE recebida. Aplicando vibração longa e interação obrigatória.'
        );
        options.vibrate = [500, 100, 500, 100, 500];
        options.requireInteraction = true;
    }

    // Notifica a aplicação em primeiro plano para que ela possa atualizar a UI.
    if (self.BroadcastChannel) {
        const channel = new BroadcastChannel('nativa-sw-channel');
        // Envia os dados completos recebidos, incluindo o status
        channel.postMessage({ type: 'STATUS_UPDATE', data: data });
        console.log(
            '[SW DEBUG] Mensagem de STATUS_UPDATE enviada para a aplicação via BroadcastChannel.'
        );
    }

    console.log(
        '[SW DEBUG 4/4] Exibindo notificação com as seguintes opções:',
        options
    );

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    console.log(
        '[SW DEBUG] Notificação clicada. Dados:',
        event.notification.data
    );

    const { postId, userId, url: targetUrl } = event.notification.data;

    if (postId && userId) {
        const ajaxUrl = self.location.origin + '/wp-admin/admin-ajax.php';
        const formData = new FormData();
        formData.append('action', 'nativa_delivery_track_push_click');
        formData.append('post_id', postId);
        formData.append('user_id', userId);

        fetch(ajaxUrl, {
            method: 'POST',
            body: formData,
            keepalive: true, // Tenta garantir o envio mesmo que a página feche
        }).catch((err) =>
            console.error('[SW DEBUG] Falha ao enviar rastreamento:', err)
        );
    }

    event.notification.close();

    event.waitUntil(
        clients
            .matchAll({
                type: 'window',
                includeUncontrolled: true,
            })
            .then((clientList) => {
                for (const client of clientList) {
                    // Verifica se a URL do cliente inclui a origem E se o cliente tem foco
                    if (
                        client.url.includes(self.location.origin) &&
                        'focus' in client
                    ) {
                        console.log(
                            '[SW DEBUG] Encontrado um cliente existente. Focando e navegando para:',
                            targetUrl
                        );
                        // Foca no cliente e depois navega
                        return client
                            .focus()
                            .then((c) => c.navigate(targetUrl));
                    }
                }
                // Se nenhum cliente foi encontrado ou focado, abre uma nova janela
                if (clients.openWindow) {
                    console.log(
                        '[SW DEBUG] Nenhum cliente existente. Abrindo nova janela para:',
                        targetUrl
                    );
                    return clients.openWindow(targetUrl);
                }
            })
    );
});
