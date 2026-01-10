// assets/src/js/pedidos-sw.js
// ATUALIZAÇÃO (Ícones): Atualiza o caminho dos ícones de notificação para a nova estrutura de pastas.
// CORREÇÃO (Fetch Error): Modifica o listener 'fetch' para ignorar requisições de outras origens (ex: Google Fonts) e evitar erros de CORS.

const CACHE_NAME = 'pedidos-dashboard-cache-v1';
const URLS_TO_CACHE = [
    '/pedidos/',
    // Adicione aqui outros assets essenciais para o funcionamento offline do dashboard
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Pedidos SW] Cache aberto');
            return cache.addAll(URLS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
    // --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO DE FETCH) ---
    // Ignora requisições que não são para a mesma origem (ex: Facebook Pixel, Google Fonts).
    // Isso evita erros de CORS/rede ao interceptar scripts de terceiros.
    if (!event.request.url.startsWith(self.location.origin)) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((response) => {
            // Retorna do cache ou busca na rede se não encontrar
            return response || fetch(event.request);
        })
    );
    // --- FIM DA MODIFICAÇÃO ---
});

self.addEventListener('activate', (event) => {
    console.log('[Pedidos SW] Ativado com sucesso.');
    event.waitUntil(self.clients.claim());
});

// --- INÍCIO DA MODIFICAÇÃO: LÓGICA DE PUSH NOTIFICATION ---

self.addEventListener('push', (event) => {
    console.log('[Pedidos SW] Evento PUSH recebido!');

    if (!event.data) {
        console.error('[Pedidos SW] Evento push não continha dados.');
        return;
    }

    let data = {};
    try {
        data = event.data.json();
    } catch (e) {
        data = {
            title: 'Dashboard de Pedidos',
            body: event.data.text(),
        };
    }

    const title = data.title || 'Novo Pedido!';

    // --- INÍCIO DA MODIFICAÇÃO ---
    const options = {
        body: data.body || 'Um novo pedido foi recebido.',
        icon:
            data.icon ||
            '/wp-content/plugins/nativa-delivery/assets/icons/dashboard/icon-192x192.png',
        badge: '/wp-content/plugins/nativa-delivery/assets/icons/dashboard/notification-badge.png',
        data: {
            url: data.url || '/pedidos/', // URL padrão ao clicar é o dashboard
        },
        tag: 'nativa-delivery-novo-pedido',
        renotify: true,
        vibrate: [500, 100, 500, 100, 500], // Padrão de vibração para chamar a atenção
        requireInteraction: true, // Notificação não fecha sozinha em desktops
    };
    // --- FIM DA MODIFICAÇÃO ---

    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
    const targetUrl = event.notification.data.url;
    event.notification.close();

    event.waitUntil(
        clients
            .matchAll({
                type: 'window',
                includeUncontrolled: true,
            })
            .then((clientList) => {
                for (const client of clientList) {
                    if (
                        client.url.includes(self.location.origin) &&
                        'focus' in client
                    ) {
                        return client
                            .focus()
                            .then((c) => c.navigate(targetUrl));
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(targetUrl);
                }
            })
    );
});
// --- FIM DA MODIFICAÇÃO ---
