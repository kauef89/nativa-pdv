// core/api/config.js

/**
 * Módulo de Configuração Centralizado.
 *
 * ÚNICA FONTE DE VERDADE para configurações sensíveis e URLs de API.
 * Este módulo busca os dados do objeto global `window.nativaDeliveryData`
 * e os exporta de forma segura para serem utilizados por outros módulos,
 * evitando o uso de variáveis globais que podem ser sobrescritas.
 */

// Garante que o objeto base exista para evitar erros.
const nativaData = window.nativaDeliveryData || {};
// --- INÍCIO DA MODIFICAÇÃO ---
// A referência a nativaEntregasData foi removida para isolar a configuração.
// --- FIM DA MODIFICAÇÃO ---

/**
 * URL do AJAX para chamadas de API do WordPress.
 * @type {string}
 */
// --- INÍCIO DA MODIFICAÇÃO ---
export const ajaxUrl = nativaData.ajax_url;
// --- FIM DA MODIFICAÇÃO ---

/**
 * Nonce de segurança para ações autenticadas.
 * @type {string}
 */
// --- INÍCIO DA MODIFICAÇÃO ---
export const ajaxNonce = nativaData.ajax_nonce;
// --- FIM DA MODIFICAÇÃO ---

/**
 * Client ID do Google para o serviço de login.
 * Carregado a partir das configurações do servidor.
 * @type {string}
 */
export const googleClientId =
    nativaData.google_client_id || 'ID_NAO_CONFIGURADO';

/**
 * Objeto com as opções de pagamento configuradas no backend.
 * @type {object}
 */
export const paymentOptions = nativaData.payment_options || {};

// --- INÍCIO DA MODIFICAÇÃO ---
// A exportação de cepCidade foi removida pois pertence ao contexto de Entregas.
// --- FIM DA MODIFICAÇÃO ---
