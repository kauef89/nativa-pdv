// apps/consumer/pages/account/my-account-payment-ui.js

import {
    cancelMyOrder,
    getPixData,
    sendPixExpirationWarning,
} from '@core/api/api-service.js';
import { state } from '@core/state/global-state.js';
import { copyToClipboard, showToast } from '@utils/ui-helpers.js';
import { initializeMyAccount } from './my-account-data-manager.js';

let progressInterval = null;
const EXPIRATION_TIME_SECONDS = 600; // 10 minutos

function stopAllTimers() {
    if (progressInterval) {
        clearInterval(progressInterval);
        progressInterval = null;
    }
}

function _startProgressBar(order) {
    // --- INÍCIO DA MODIFICAÇÃO (FLUXO PIX v3) ---
    // Busca os elementos do timer (os IDs são padronizados agora)
    const timerElement = document.getElementById('pix-expiration-timer');
    const progressBarElement = document.getElementById('pix-progress-bar');
    // --- FIM DA MODIFICAÇÃO ---
    if (!timerElement || !progressBarElement) return;

    // Garante que não haja intervalos duplicados
    stopAllTimers();

    progressInterval = setInterval(async () => {
        // Usa o timestamp do pedido fornecido pelo backend
        const orderTimestamp = order.timestamp; // Assumindo que o timestamp está no formato Unix
        if (!orderTimestamp) {
            console.error(
                'Timestamp do pedido não encontrado para calcular expiração.'
            );
            stopAllTimers();
            timerElement.textContent = 'Erro';
            progressBarElement.style.width = '0%';
            return;
        }

        const elapsedSeconds = Math.floor(Date.now() / 1000 - orderTimestamp);
        const remainingSeconds = EXPIRATION_TIME_SECONDS - elapsedSeconds;

        if (remainingSeconds <= 0) {
            stopAllTimers();
            timerElement.textContent = 'Expirado';
            progressBarElement.style.width = '0%';

            try {
                // Tenta cancelar apenas uma vez
                if (!timerElement.dataset.expired) {
                    timerElement.dataset.expired = 'true'; // Marca como expirado para evitar múltiplas chamadas
                    await cancelMyOrder(order.id);
                    showToast(
                        'Seu pedido PIX expirou e foi cancelado.',
                        'info'
                    ); // Adiciona toast
                    if (initializeMyAccount) {
                        initializeMyAccount(true); // Recarrega a seção da conta
                    }
                }
            } catch (error) {
                console.error('Erro ao expirar pedido PIX:', error);
                showToast('Falha ao cancelar o pedido PIX expirado.', 'error'); // Toast de erro
                // Mesmo com erro no cancelamento, mantém a UI como expirada
                if (initializeMyAccount) {
                    initializeMyAccount(true);
                }
            }
            return;
        }

        // --- INÍCIO DA MODIFICAÇÃO (PUSH PIX) ---
        // Verifica se falta 1 minuto (60 segundos) e se o aviso ainda não foi enviado
        if (remainingSeconds <= 60 && !timerElement.dataset.warningSent) {
            timerElement.dataset.warningSent = 'true'; // Marca como enviado para não repetir
            console.log(
                `[PIX Timer] Pedido #${order.id}: Enviando aviso de expiração (1 min restante).`
            );
            try {
                // Chama a API (fire-and-forget, não precisamos de 'await' aqui)
                sendPixExpirationWarning(order.id);
            } catch (err) {
                // Loga o erro, mas não interrompe o timer
                console.warn(
                    'Falha ao tentar enviar o aviso de expiração do PIX:',
                    err
                );
            }
        }
        // --- FIM DA MODIFICAÇÃO ---

        // Limpa a marcação de expirado se o timer ainda estiver rodando (caso de recarregamento)
        delete timerElement.dataset.expired;

        const minutes = Math.floor(remainingSeconds / 60);
        const seconds = remainingSeconds % 60;
        timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

        const progressPercent =
            (remainingSeconds / EXPIRATION_TIME_SECONDS) * 100;
        progressBarElement.style.width = `${progressPercent}%`;
    }, 1000);
}

// --- INÍCIO DA MODIFICAÇÃO (FLUXO PIX v3) ---
/**
 * HTML Padrão para o Timer
 * Gera o bloco de HTML da contagem regressiva para ser reutilizado.
 */
function _getTimerHtml() {
    return `
        <div class="pix-expiration-wrapper">
            <span>Expira em:</span>
            <span id="pix-expiration-timer">10:00</span>
            <div class="pix-progress-bar-container">
                <div id="pix-progress-bar" class="pix-progress-bar" style="width: 100%;"></div>
            </div>
        </div>
    `;
}
// --- FIM DA MODIFICAÇÃO ---

// --- INÍCIO DA MODIFICAÇÃO (REATORAÇÃO QR Code) ---
async function _renderAutomaticPixUI(order, container) {
    // --- FIM DA MODIFICAÇÃO ---
    container.innerHTML = '';
    container.style.display = 'block';

    // --- INÍCIO DA MODIFICAÇÃO (REATORAÇÃO QR Code) ---
    try {
        // Chama a API de pagamento para gerar o QR code sob demanda
        const pixData = await getPixData(order.id);

        // Se houve erro na geração do QR Code no backend OU se os dados essenciais estão faltando
        if (
            pixData.qr_code_error ||
            !pixData.qr_code_base64 ||
            !pixData.copia_e_cola
        ) {
            console.error(
                'Falha ao obter dados Base64 do QR Code ou Copia e Cola via API:',
                pixData.qr_code_error || 'Dados ausentes.',
                order
            );
            _renderPixFallbackUI(order, container); // Chama o fallback
            return;
        }

        // O endpoint 'get_pix_data_ajax' já retorna uma dataUri completa (data:image/png;base64,...)
        const imageSrc = pixData.qr_code_base64;
        // --- FIM DA MODIFICAÇÃO ---

        // --- INÍCIO DA MODIFICAÇÃO (FLUXO PIX v3) ---
        const pixPaymentHtml = `
            <div class="nativa-pix-payment-wrapper-my-account">
                <div class="pix-payment-header">
                    <h3 class="nativa-pix-title">Aguardando seu pagamento</h3>
                    ${_getTimerHtml()}
                </div>
                <p class="nativa-pix-instructions">Realize o pagamento para que a loja possa receber seu pedido.</p>
    
                <div class="pix-payment-body">
                    <div class="pix-payment-body-left">
                        <div class="nativa-pix-qr-code">
                            <img src="${imageSrc}" alt="PIX QR Code">
                        </div>
                    </div>
                    <div class="pix-payment-body-right">
                        <div class="nativa-pix-payment-value">
                            <strong>${order.total}</strong>
                        </div>
                        <p class="nativa-pix-instructions-secondary">Use o QR Code ou copie o código para pagar:</p>
                        <div class="nativa-pix-copia-e-cola-wrapper">
                            <textarea id="nativa-pix-copia-e-cola-text" readonly style="display: none;">${pixData.copia_e_cola}</textarea>
                            <button id="nativa-copy-pix-code-btn" class="nativa-button-secondary">
                                <span class="material-symbols-rounded">content_copy</span>
                                Copiar
                            </button>
                        </div>
                        </div>
                </div>
            </div>`;
        // --- FIM DA MODIFICAÇÃO ---
        container.innerHTML = pixPaymentHtml;

        document
            .getElementById('nativa-copy-pix-code-btn')
            ?.addEventListener('click', () => {
                copyToClipboard(pixData.copia_e_cola);
            });

        _startProgressBar(order);

        // --- INÍCIO DA MODIFICAÇÃO (REATORAÇÃO QR Code) ---
    } catch (error) {
        // Se a chamada API falhar (ex: 403, 500)
        console.error(
            `Erro ao chamar getPixData para o pedido #${order.id}:`,
            error.message
        );
        _renderPixFallbackUI(order, container); // Chama o fallback
    }
    // --- FIM DA MODIFICAÇÃO ---
}

function _renderPixFallbackUI(order, container) {
    const paymentOptions = window.nativaDeliveryData.payment_options;

    // --- INÍCIO DA MODIFICAÇÃO (FLUXO PIX v3) ---
    const fallbackHtml = `
        <div class="nativa-pending-manual-payment is-fallback">
    
    <div class="manual-pix-info">

        <div class="manual-pix-header">
            <div class="nativa-info-icon"><span class="material-symbols-rounded">warning</span></div>
            <h3>Ocorreu um erro ao gerar o QR Code :(</h3>
        </div>
        
        <p>Por favor, realize o pagamento manualmente para a chave abaixo, no valor de <strong>${order.total}</strong>, e nos envie o comprovante pelo WhatsApp.</p>
    </div>

    <div class="manual-pix-actions">
        <div class="manual-pix-details">
            <strong>Chave PIX (${paymentOptions.pix_manual_key_type || 'N/A'}):</strong>
            <div class="manual-pix-key-wrapper">
                <input type="text" id="manual-pix-key" value="${paymentOptions.pix_manual_key || 'Chave não configurada'}" readonly>
                
                <button id="copy-manual-pix-key-btn" class="nativa-button-secondary">
                    <span class="material-symbols-rounded">content_copy</span> Copiar
                </button>
            </div>
            <small>${paymentOptions.pix_manual_receiver || ''}</small>
        </div>
        
        ${_getTimerHtml()}
    </div>

</div>`;
    // --- FIM DA MODIFICAÇÃO ---
    container.innerHTML = fallbackHtml;
    container.style.display = 'block';

    // Adiciona listener ao botão de cópia
    const copyBtn = document.getElementById('copy-manual-pix-key-btn');
    const keyInput = document.getElementById('manual-pix-key');
    if (copyBtn && keyInput && paymentOptions.pix_manual_key) {
        copyBtn.addEventListener('click', () => {
            copyToClipboard(keyInput.value);
        });
    } else if (copyBtn) {
        copyBtn.disabled = true;
    }

    // --- INÍCIO DA MODIFICAÇÃO (FLUXO PIX v3) ---
    // INICIA O TIMER
    _startProgressBar(order);
    // --- FIM DA MODIFICAÇÃO ---
}

function _renderManualPixUI(order, container) {
    const paymentOptions = window.nativaDeliveryData.payment_options;
    const {
        pix_manual_key: pixKey,
        pix_manual_key_type: pixKeyType,
        pix_manual_receiver: pixReceiver,
    } = paymentOptions;
    let pixManualInfoHtml = '';

    if (pixKey) {
        // --- INÍCIO DA MODIFICAÇÃO (FLUXO PIX v3) ---
        pixManualInfoHtml = `
            <div class="nativa-pix-manual-info">
                <div class="nativa-info-icon"><span class="material-symbols-rounded">paid</span></div>
                <div class="nativa-info-content">
                    <h3>Aguardando seu pagamento</h3>
                    <p>Realize o pagamento para que a loja possa receber seu pedido. Envie o comprovante pelo WhatsApp e aguarde a aprovação.</p>
                    
                    <div class="pix-details">
                        <p><strong>Valor:</strong> ${order.total}</p>
                        <p><strong>Tipo:</strong> ${pixKeyType || 'N/A'}</p>
                        <p><strong>Chave:</strong> <span id="current-order-pix-key">${pixKey}</span></p>
                        <p><strong>Beneficiário:</strong> ${pixReceiver || ''}</p>
                    </div>
                    <button id="copy-current-order-pix-key-btn" class="nativa-button-secondary">
                        <span class="material-symbols-rounded">content_copy</span> Copiar Chave PIX
                    </button>
                    
                    ${_getTimerHtml()}
                </div>
            </div>`;
        // --- FIM DA MODIFICAÇÃO ---
    } else {
        pixManualInfoHtml = `
             <div class="nativa-pix-manual-info is-error">
                 <div class="nativa-info-icon"><span class="material-symbols-rounded">error</span></div>
                 <div class="nativa-info-content">
                    <h4>Chave PIX Manual Não Configurada</h4>
                    <p>A chave PIX para pagamento manual não foi configurada no painel. Entre em contato com a loja.</p>
                 </div>
            </div>`;
    }

    container.innerHTML = pixManualInfoHtml;
    container.style.display = 'block';

    const copyBtn = document.getElementById('copy-current-order-pix-key-btn');
    if (copyBtn && pixKey) {
        copyBtn.addEventListener('click', () => {
            copyToClipboard(pixKey);
        });
    }

    // --- INÍCIO DA MODIFICAÇÃO (FLUXO PIX v3) ---
    // INICIA O TIMER (apenas se a chave existir)
    if (pixKey) {
        _startProgressBar(order);
    }
    // --- FIM DA MODIFICAÇÃO ---
}

export function renderPendingPayment(order, container) {
    // --- INÍCIO SONDA ---
    // [SONDA 1/3] Verifica o que está chegando na UI
    console.log(
        '[SONDA 1/3] renderPendingPayment: Função de renderização chamada. Objeto `order` recebido:',
        order ? JSON.parse(JSON.stringify(order)) : 'NULL ou UNDEFINED'
    );
    // --- FIM SONDA ---

    if (!container) return;

    container.innerHTML = '';
    container.style.display = 'none';
    stopAllTimers(); // Garante que timers antigos sejam limpos

    if (!order) {
        // --- INÍCIO SONDA ---
        // [SONDA 1.1/3] Log se o pedido for nulo (causa provável do bug)
        console.log(
            '[SONDA 1.1/3] renderPendingPayment: Pedido (order) é nulo. Nenhum bloco de pagamento será renderizado.'
        );
        // --- FIM SONDA ---
        return;
    }

    // --- INÍCIO DA MODIFICAÇÃO (CPT Pagamentos - V2 Híbrida) ---
    const paymentMethodSlug = order.details.pedido_metodo_pagamento;

    // 1. Tenta encontrar o objeto de pagamento CPT no estado global
    const paymentMethodObject = state.serverData.paymentMethods.find(
        (m) => m.slug === paymentMethodSlug
    );

    const paymentCategory = paymentMethodObject
        ? paymentMethodObject.categoria
        : null; // Null se não for um CPT

    // --- INÍCIO SONDA ---
    // [SONDA 2/3] Verifica os dados extraídos
    console.log(
        `[SONDA 2/3] renderPendingPayment: Dados extraídos para decisão: Slug='${paymentMethodSlug}', Categoria='${
            paymentCategory || 'N/A (Legado)'
        }', StatusPagamento='${order.payment_status}'`
    );
    // --- FIM SONDA ---

    // Lógica de decisão (Prioriza CPTs, depois checa slugs legados)

    // Caso 1: CPT de PIX Automático (API) e aguardando
    if (
        paymentCategory === 'pix_automatico' &&
        order.payment_status === 'awaiting_api'
    ) {
        // --- INÍCIO SONDA ---
        console.log(
            '[SONDA 3/3] renderPendingPayment: Decisão -> Renderizar PIX Automático (CPT).'
        );
        // --- FIM SONDA ---
        _renderAutomaticPixUI(order, container);
    }
    // Caso 2: CPT de PIX Manual
    else if (paymentCategory === 'pix_manual') {
        // --- INÍCIO SONDA ---
        console.log(
            '[SONDA 3/3] renderPendingPayment: Decisão -> Renderizar PIX Manual (CPT).'
        );
        // --- FIM SONDA ---
        _renderManualPixUI(order, container);
    }
    // Caso 3: CPT de PIX Automático (API) que FALHOU na geração
    else if (
        paymentCategory === 'pix_automatico' &&
        order.payment_status === 'failed_generation'
    ) {
        // --- INÍCIO SONDA ---
        console.log(
            '[SONDA 3/3] renderPendingPayment: Decisão -> Renderizar PIX Fallback (CPT / Falha API).'
        );
        // --- FIM SONDA ---
        _renderPixFallbackUI(order, container);
    }

    // --- Fallbacks para SLUGS LEGADOS (pedidos antigos) ---

    // Caso 4: Slug legado 'pix-sicredi' (API) e aguardando
    else if (
        paymentMethodSlug === 'pix-sicredi' &&
        order.payment_status === 'awaiting_api'
    ) {
        // --- INÍCIO SONDA ---
        console.log(
            '[SONDA 3/3] renderPendingPayment: Decisão -> Renderizar PIX Automático (Slug Legado).'
        );
        // --- FIM SONDA ---
        _renderAutomaticPixUI(order, container);
    }
    // Caso 5: Slugs legados 'pix-manual' ou 'pix-manual-fallback'
    else if (
        paymentMethodSlug === 'pix-manual' ||
        paymentMethodSlug === 'pix-manual-fallback'
    ) {
        // --- INÍCIO SONDA ---
        console.log(
            '[SONDA 3/3] renderPendingPayment: Decisão -> Renderizar PIX Manual (Slug Legado).'
        );
        // --- FIM SONDA ---
        _renderManualPixUI(order, container);
    }
    // Caso 6: Slugs legados 'pix-fallback' ou 'pix-sicredi' que falhou
    else if (
        paymentMethodSlug === 'pix-fallback' ||
        (paymentMethodSlug === 'pix-sicredi' &&
            order.payment_status === 'failed_generation')
    ) {
        // --- INÍCIO SONDA ---
        console.log(
            '[SONDA 3/3] renderPendingPayment: Decisão -> Renderizar PIX Fallback (Slug Legado / Falha API).'
        );
        // --- FIM SONDA ---
        _renderPixFallbackUI(order, container);
    }
    // --- INÍCIO SONDA ---
    else {
        // [SONDA 3/3] Nenhum bloco correspondente
        console.log(
            '[SONDA 3/3] renderPendingPayment: Decisão -> NENHUM bloco de pagamento corresponde aos critérios. O bloco ficará oculto.'
        );
    }
    // --- FIM SONDA ---
    // --- FIM DA MODIFICAÇÃO ---
}

export function stopPolling() {
    stopAllTimers();
}
