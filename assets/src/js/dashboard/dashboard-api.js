// js/dashboard/dashboard-api.js

/**
 * Módulo para centralizar as chamadas de API para o dashboard de pedidos.
 * ATUALIZADO: A configuração agora é lida diretamente do objeto global padronizado
 * 'nativaDeliveryData' para garantir consistência e corrigir erros de URL.
 * ATUALIZAÇÃO (PUSH): Adiciona a função 'saveDashboardPushSubscription'.
 * CORREÇÃO (ERRO): Melhora o tratamento de erros para lidar com respostas não-JSON ou status HTTP inesperados (ex: 403 Forbidden).
 */

import { showToast } from '../utils/nativa-ui-helpers.js';

const config = window.nativaDeliveryData || {};
const ajaxUrl = config.ajax_url;
const ajaxNonce = config.ajax_nonce;

async function makeAjaxCall(action, data = {}) {
    if (!ajaxUrl) {
        const errorMsg =
            'Erro crítico: A URL do servidor não foi encontrada. O dashboard não pode funcionar.';
        console.error(errorMsg, 'Objeto de configuração recebido:', config);
        showToast(errorMsg, 'error');
        throw new Error(errorMsg);
    }

    const formData = new FormData();
    formData.append('action', `nativa_delivery_${action}`);
    formData.append('nativa_delivery_nonce', ajaxNonce);

    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            if (typeof data[key] === 'object' && data[key] !== null) {
                formData.append(key, JSON.stringify(data[key]));
            } else {
                formData.append(key, data[key]);
            }
        }
    }

    try {
        const response = await fetch(ajaxUrl, {
            method: 'POST',
            body: formData,
        });

        // --- INÍCIO DA MODIFICAÇÃO (Tratamento de Erro Robusto) ---
        if (!response.ok) {
            // Se a resposta não foi OK (ex: 403, 404, 500)
            let errorMessage = `Erro ${response.status}: ${response.statusText}`;
            try {
                // Tenta ler o corpo da resposta como texto para obter mais detalhes
                const errorBody = await response.text();
                // Limpa possível HTML ou formatação estranha
                const cleanText = errorBody
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (cleanText) {
                    errorMessage = cleanText;
                }
                // Se for 403, sugere problema de nonce/sessão
                if (response.status === 403) {
                    errorMessage +=
                        ' (Possível problema de permissão ou sessão expirada. Tente recarregar a página.)';
                }
            } catch (e) {
                // Falha ao ler o corpo do erro, mantém a mensagem original
                console.warn(
                    'Não foi possível ler o corpo da resposta de erro.',
                    e
                );
            }
            throw new Error(errorMessage);
        }

        // Se a resposta foi OK, processa como JSON
        const result = await response.json();

        if (!result.success) {
            // A resposta JSON indica falha na ação do backend
            throw new Error(
                result.data?.message || // Tenta pegar a mensagem específica
                    result.data || // Tenta pegar qualquer dado retornado
                    'O servidor retornou um erro inesperado.' // Fallback
            );
        }
        // --- FIM DA MODIFICAÇÃO ---

        return result.data; // Retorna os dados em caso de sucesso
    } catch (error) {
        console.error(`Erro na chamada AJAX para '${action}':`, error);
        // Exibe a mensagem de erro (seja do throw new Error ou de falha na rede)
        showToast(
            error.message || 'Erro de comunicação com o servidor.',
            'error'
        );
        throw error; // Re-lança o erro para que a chamada original possa tratar, se necessário
    }
}

// --- INÍCIO DA MODIFICAÇÃO (PUSH) ---
/**
 * Salva a inscrição de push notification do dashboard no backend.
 * @param {PushSubscription} subscription - O objeto de inscrição.
 * @returns {Promise<object>}
 */
export const saveDashboardPushSubscription = async (subscription) => {
    return await makeAjaxCall('save_dashboard_push_subscription', {
        subscription,
    });
};
// --- FIM DA MODIFICAÇÃO (PUSH) ---

export const fetchInitialData = async (dateFilter = 'today') => {
    return await makeAjaxCall('get_orders', { date_filter: dateFilter });
};

export const fetchUpdatedData = async (lastTimestamp) => {
    return await makeAjaxCall('get_updated_orders', {
        last_check_timestamp: lastTimestamp,
    });
};

export const updateOrderStatus = async (orderId, newStatus) => {
    return await makeAjaxCall('update_order_status', {
        order_id: orderId,
        new_status: newStatus,
    });
};

export const updatePaymentStatus = async (orderId, newState) => {
    return await makeAjaxCall('update_payment_status', {
        order_id: orderId,
        new_state: newState,
    });
};

export const assignEntregador = async (orderId, entregadorId) => {
    return await makeAjaxCall('assign_entregador', {
        order_id: orderId,
        entregador_id: entregadorId,
    });
};

export const updatePaymentRefundStatus = async (orderId, newState) => {
    return await makeAjaxCall('update_payment_refund_status', {
        order_id: orderId,
        new_state: newState,
    });
};

export const recognizePayment = async (orderId) => {
    return await makeAjaxCall('recognize_payment', { order_id: orderId });
};
