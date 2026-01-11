// shared/features/payment/pix/pix-logic.js

import * as api from '@core/api/api-service.js';
import { handleOrderAgain as handleReorder } from '@apps/consumer/pages/account/my-account-order-handler.js';
import { showToast } from '@utils/ui-helpers.js';

// CORRIGIDO: Mover todas as variáveis de elementos para serem inicializadas depois, dentro da função init.
let wrapper;
let orderId;
let loader;
let pixDetails;
let qrCodeImg;
let copyPasteInput;
let copyButton;
let statusDiv;
let statusIcon;
let statusText;
let countdownSpan;
let finalActionDiv;
let whatsAppButton;
let pixExpiredDiv;
let reorderButton;

let statusInterval;
let countdownInterval;
let mainExpiryTimer;

function _showError(message) {
    if (loader) loader.classList.add('is-hidden');
    if (statusIcon) statusIcon.textContent = 'error';
    if (statusText) statusText.textContent = message;
    if (statusDiv) statusDiv.classList.add('is-error');
}

function _displayPixData(data) {
    if (loader) loader.classList.add('is-hidden');
    if (qrCodeImg)
        qrCodeImg.src = `data:image/png;base64,${data.qr_code_base64}`;
    if (copyPasteInput) copyPasteInput.value = data.copia_e_cola;
    if (pixDetails) pixDetails.classList.remove('is-hidden');
}

async function _handlePixExpired() {
    clearInterval(statusInterval);
    clearInterval(countdownInterval);
    clearInterval(mainExpiryTimer);

    try {
        await api.cancelMyOrder(orderId);
        if (pixDetails) pixDetails.style.display = 'none';
        if (pixExpiredDiv) pixExpiredDiv.classList.remove('is-hidden');
        if (document.querySelector('.pix-footer'))
            document.querySelector('.pix-footer').style.display = 'none';
        if (document.querySelector('.pix-copy-paste-label'))
            document.querySelector('.pix-copy-paste-label').style.display =
                'none';
    } catch (error) {
        _showError('Falha ao cancelar o pedido expirado. ' + error.message);
    }
}

function _startMainExpiryTimer() {
    const pixExpiryTime = 10 * 60;
    let remainingTime = pixExpiryTime;

    mainExpiryTimer = setInterval(() => {
        remainingTime--;
        if (remainingTime <= 0) {
            _handlePixExpired();
        }
    }, 1000);
}

async function _fetchPixData() {
    if (!orderId) {
        _showError('ID do pedido não encontrado.');
        return;
    }

    try {
        const pixData = await api.getPixData(orderId);
        _displayPixData(pixData);
        _startStatusPolling();
        _startMainExpiryTimer();
    } catch (error) {
        _showError(error.message);
    }
}

function _startStatusPolling() {
    let countdown = 60;
    if (countdownSpan) countdownSpan.textContent = countdown;

    countdownInterval = setInterval(() => {
        countdown--;
        if (countdownSpan) countdownSpan.textContent = countdown;
        if (countdown <= 0) {
            countdown = 60;
        }
    }, 1000);

    statusInterval = setInterval(async () => {
        try {
            const statusResult = await api.checkPixStatus(orderId);

            if (statusResult.paid) {
                clearInterval(statusInterval);
                clearInterval(countdownInterval);
                clearInterval(mainExpiryTimer);
                localStorage.removeItem('nativa_pending_pix_order');

                if (statusIcon) statusIcon.textContent = 'check_circle';
                if (statusText) statusText.textContent = 'Pagamento Aprovado!';
                if (statusDiv) statusDiv.classList.add('is-success');

                if (pixDetails) pixDetails.style.display = 'none';
                if (document.querySelector('.pix-footer'))
                    document.querySelector('.pix-footer').style.display =
                        'none';
                if (document.querySelector('.pix-copy-paste-label'))
                    document.querySelector(
                        '.pix-copy-paste-label'
                    ).style.display = 'none';

                if (finalActionDiv)
                    finalActionDiv.classList.remove('is-hidden');
                if (whatsAppButton) {
                    whatsAppButton.disabled = false;
                    whatsAppButton.addEventListener('click', function () {
                        if (statusResult.whatsapp_url) {
                            window.location.href = statusResult.whatsapp_url;
                        }
                    });
                }
            }
        } catch {
            // CORREÇÃO: Removido 'error' não utilizado
            console.log(
                'Falha ao verificar status do PIX. Tentando novamente em 5 segundos...'
            );
        }
    }, 5000);
}

export function init() {
    // CORRIGIDO: A busca pelo elemento wrapper e o erro são movidos para dentro da função init.
    wrapper = document.getElementById('nativa-pix-payment-wrapper');
    if (!wrapper) {
        // Não lança mais um erro, pois é normal que este elemento não esteja em todas as páginas.
        // O `init` é chamado a partir de `main.js`, que já verifica se o wrapper existe.
        return;
    }

    // Inicializa as outras variáveis de elementos aqui dentro
    orderId = wrapper.dataset.orderId;
    loader = document.getElementById('pix-loader');
    pixDetails = document.getElementById('pix-details');
    qrCodeImg = document.getElementById('pix-qr-code-image');
    copyPasteInput = document.getElementById('pix-copy-paste-code');
    copyButton = document.getElementById('pix-copy-button');
    statusDiv = document.getElementById('pix-payment-status');
    statusIcon = statusDiv?.querySelector('.status-icon');
    statusText = statusDiv?.querySelector('.status-text');
    countdownSpan = document.getElementById('pix-countdown');
    finalActionDiv = document.getElementById('pix-final-action');
    whatsAppButton = document.getElementById('nativa-pix-whatsapp-button');
    pixExpiredDiv = document.getElementById('pix-expired-section');
    reorderButton = document.getElementById('pix-reorder-button');

    if (copyButton && copyPasteInput) {
        copyButton.addEventListener('click', () => {
            navigator.clipboard.writeText(copyPasteInput.value).then(() => {
                showToast('Código PIX copiado!', 'success');
            });
        });
    }

    if (reorderButton) {
        // CORREÇÃO: Removido 'event' não utilizado
        reorderButton.addEventListener('click', () => {
            handleReorder(orderId);
        });
    }

    _fetchPixData();
}
