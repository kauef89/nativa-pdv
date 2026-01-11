// shared/services/push.js

// A URL do AJAX e o nonce devem ser fornecidos por `wp_localize_script`
const {
    ajax_url: ajaxUrl,
    nonce,
    vapidPublicKey,
} = window.nativaDeliveryData || {};

/**
 * Converte uma string VAPID public key de base64 para um Uint8Array.
 * @param {string} base64String A chave pública VAPID em formato base64.
 * @returns {Uint8Array}
 */
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

/**
 * Envia o objeto de inscrição para o servidor WordPress para ser salvo.
 * @param {PushSubscription} subscription O objeto de inscrição gerado pelo navegador.
 */
async function sendSubscriptionToServer(subscription) {
    console.log('[PUSH SONDA 6] Função sendSubscriptionToServer foi chamada.');

    if (!subscription) {
        console.error(
            '[PUSH SONDA ERRO] Inscrição nula, não foi enviada ao servidor.'
        );
        return;
    }
    console.log(
        '[PUSH SONDA 6.1] Enviando inscrição para o servidor:',
        subscription
    );

    const formData = new FormData();
    formData.append('action', 'nativa_delivery_save_push_subscription');
    formData.append('nonce', nonce);
    formData.append('subscription', JSON.stringify(subscription));

    try {
        const response = await fetch(ajaxUrl, {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();
        if (result.success) {
            console.log(
                '[PUSH SONDA 6.2] SUCESSO: Inscrição salva/sincronizada com o servidor.'
            );
        } else {
            console.error(
                '[PUSH SONDA ERRO] Falha ao salvar inscrição no servidor:',
                result.data.message
            );
        }
    } catch (error) {
        console.error(
            '[PUSH SONDA ERRO] Erro de rede ao enviar inscrição:',
            error
        );
    }
}

/**
 * Inscreve o usuário para receber notificações push.
 * @param {ServiceWorkerRegistration} registration O registro do Service Worker.
 */
async function subscribeUser(registration) {
    console.log('[PUSH SONDA 4] Função subscribeUser foi chamada.');

    if (!vapidPublicKey) {
        console.error(
            '[PUSH SONDA ERRO] Chave VAPID pública não definida. Não é possível inscrever.'
        );
        return;
    }
    console.log('[PUSH SONDA 4.1] Chave VAPID recebida:', vapidPublicKey);

    const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
    try {
        console.log(
            '[PUSH SONDA 4.2] Tentando inscrever com registration.pushManager.subscribe...'
        );
        const subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey,
        });
        console.log(
            '[PUSH SONDA 5] Inscrição criada pelo navegador:',
            subscription
        );
        await sendSubscriptionToServer(subscription);
    } catch (err) {
        console.error(
            '[PUSH SONDA ERRO] Falha ao executar pushManager.subscribe: ',
            err
        );
    }
}

/**
 * Inicializa o processo de verificação e inscrição de notificações push.
 */
export async function initPushSubscription() {
    console.log('[PUSH SONDA 1] Iniciando initPushSubscription...');

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn(
            '[PUSH SONDA AVISO] Notificações push não são suportadas neste navegador.'
        );
        return;
    }

    try {
        // --- INÍCIO DA MODIFICAÇÃO: Revertido para navigator.serviceWorker.ready ---
        console.log(
            '[PUSH SONDA 1.1] Aguardando o Service Worker ficar pronto com .ready...'
        );
        const registration = await navigator.serviceWorker.ready;

        if (!registration) {
            console.error(
                '[PUSH SONDA ERRO] O Service Worker não ficou pronto. A inscrição de push não pode continuar.'
            );
            return;
        }
        // --- FIM DA MODIFICAÇÃO ---

        const subscription = await registration.pushManager.getSubscription();
        const permission = Notification.permission;

        console.log(
            `[PUSH SONDA 2] Status detectado - Permissão: '${permission}' | Inscrição local:`,
            subscription
        );

        if (subscription === null) {
            console.log('[PUSH SONDA 2.1] Nenhuma inscrição local encontrada.');
            if (permission === 'granted') {
                console.log(
                    '[PUSH SONDA 2.2] Permissão já concedida, mas sem inscrição. Tentando criar uma nova inscrição.'
                );
                await subscribeUser(registration);
            }
        } else {
            console.log(
                '[PUSH SONDA 2.1] Inscrição local encontrada. Sincronizando com o servidor...'
            );
            await sendSubscriptionToServer(subscription);
        }
    } catch (error) {
        console.error(
            '[PUSH SONDA ERRO] Erro durante a inicialização do push:',
            error
        );
    }
}

/**
 * Função para ser chamada por um botão na interface do usuário para pedir permissão.
 * @returns {Promise<string>} O resultado da permissão ('granted', 'denied', 'default').
 */
export async function askForPushPermission() {
    console.log(
        '[PUSH SONDA 3] Função askForPushPermission foi chamada (botão clicado).'
    );
    try {
        const permissionResult = await Notification.requestPermission();
        if (permissionResult === 'granted') {
            console.log(
                '[PUSH SONDA 3.1] Permissão concedida pelo usuário no modal.'
            );
            // Usamos .ready aqui também para garantir consistência
            const registration = await navigator.serviceWorker.ready;
            if (registration) {
                await subscribeUser(registration);
            } else {
                console.error(
                    '[PUSH SONDA ERRO] Service Worker não registrado, impossível criar inscrição.'
                );
            }
        } else {
            console.warn(
                `[PUSH SONDA AVISO] Permissão não concedida no modal. Status: ${permissionResult}`
            );
        }
        return permissionResult;
    } catch (error) {
        console.error(
            '[PUSH SONDA ERRO] Erro ao solicitar permissão de push:',
            error
        );
    }
}
