// core/api-service.js

/**
 * Módulo para lidar com todas as chamadas de API do aplicativo Nativa Delivery.
 * ATUALIZADO: Correção de Linter (variável 'e' não utilizada) e inclusão de getAddressesByUserId.
 */

import { ajaxUrl, ajaxNonce } from './config.js';

/**
 * Classe de erro customizada para erros da API.
 */
class APIError extends Error {
    constructor(message, status = null, data = {}) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.data = data;
    }
}

/**
 * Função unificada para realizar todas as chamadas AJAX ao backend.
 */
const _makeAjaxCall = (action, data = {}, isPrivate = false) => {
    const formData = new FormData();
    formData.append('action', 'nativa_delivery_' + action);

    if (isPrivate) {
        if (!ajaxNonce) {
            console.error(
                `NativaApiService: Nonce ausente para a ação privada '${action}'. O usuário provavelmente não está logado.`
            );
            return Promise.reject(
                new APIError(
                    'Sessão de segurança inválida. Por favor, recarregue a página e faça login novamente.',
                    403
                )
            );
        }
        formData.append('nonce', ajaxNonce);
    }

    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            if (typeof data[key] === 'object' && data[key] !== null) {
                formData.append(key, JSON.stringify(data[key]));
            } else {
                formData.append(key, data[key]);
            }
        }
    }

    return fetch(ajaxUrl, {
        method: 'POST',
        body: formData,
    })
        .then(async (response) => {
            if (!response.ok) {
                const errorText = await response.text();
                try {
                    const errorJson = JSON.parse(errorText);
                    const message =
                        errorJson.data?.message ||
                        errorJson.data ||
                        `Erro no servidor (HTTP ${response.status})`;
                    throw new APIError(
                        message,
                        response.status,
                        errorJson.data
                    );
                } catch {
                    // CORREÇÃO: Removido '(e)' pois não é utilizado (Optional Catch Binding)
                    const cleanText = errorText
                        .replace(/<[^>]*>/g, ' ')
                        .replace(/\s+/g, ' ')
                        .trim();
                    throw new APIError(
                        cleanText ||
                            `Erro no servidor (HTTP ${response.status})`,
                        response.status
                    );
                }
            }
            return response.json();
        })
        .then((response) => {
            if (response.success) {
                return response.data;
            } else {
                throw new APIError(
                    response.data?.message ||
                        response.data ||
                        'Ocorreu um erro desconhecido na requisição.',
                    null,
                    response.data
                );
            }
        })
        .catch((error) => {
            console.error(
                `[API Service] Erro na ação '${action}':`,
                error.message
            );
            if (error instanceof APIError) {
                throw error;
            }
            throw new APIError(
                error.message || 'Erro de comunicação com o servidor.'
            );
        });
};

// Endpoints REST API (Não usam _makeAjaxCall)
export const getMenuData = () => {
    const restApiUrl = `${window.location.origin}/wp-json/nativa-delivery/v1/menu-data`;
    return fetch(restApiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            return response.json();
        })
        .catch((error) => {
            console.error('REST API Error:', error);
            throw error;
        });
};

export const getSocialLoginButtonsHTML = (redirectTo = '') => {
    const restApiUrl = `${window.location.origin}/wp-json/nativa-delivery/v1/social-login?redirect_to=${encodeURIComponent(
        redirectTo
    )}`;
    return fetch(restApiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    })
        .then((response) => {
            if (!response.ok) {
                throw new Error(`Erro HTTP: ${response.status}`);
            }
            return response.json();
        })
        .catch((error) => {
            console.error('REST API Error (Social Login):', error);
            throw error;
        });
};

export const getCartContents = () =>
    _makeAjaxCall('get_cart_contents', {}, false);

export const addToCart = (productData) => {
    const isReward = productData.is_reward || false;
    return _makeAjaxCall('add_to_cart', productData, isReward);
};

export const addComboToCart = (comboData) =>
    _makeAjaxCall('add_combo_to_cart', comboData, false);
export const addOfferToCart = (offerData) =>
    _makeAjaxCall('add_offer_to_cart', offerData, false);
export const updateCartItemQuantity = (cartItemKey, quantity) =>
    _makeAjaxCall(
        'update_cart_item_quantity',
        { cart_item_key: cartItemKey, quantity: quantity },
        false
    );
export const clearCart = () => _makeAjaxCall('clear_cart', {}, false);
export const validateCoupon = (couponCode, cartSubtotal, customerCpf) =>
    _makeAjaxCall(
        'validate_coupon',
        {
            coupon_code: couponCode,
            cart_subtotal: cartSubtotal,
            customer_cpf: customerCpf,
        },
        true
    );
export const submitOrder = (submitData) =>
    _makeAjaxCall('submit_order', submitData, true);
export const getMyAccountData = () =>
    _makeAjaxCall('get_my_account_data', {}, true);
export const updateMyPhone = (phone) =>
    _makeAjaxCall('update_my_phone', { phone: phone }, true);
export const getMyAddresses = () => _makeAjaxCall('get_my_addresses', {}, true);
export const addOrUpdateAddress = (formData) =>
    _makeAjaxCall('add_or_update_address', { form_data: formData }, true);
export const deleteAddress = (addressId) =>
    _makeAjaxCall('delete_address', { address_id: addressId }, true);
export const getRuas = () => _makeAjaxCall('get_ruas', {}, false);
export const getBairros = () => _makeAjaxCall('get_bairros', {}, false);
export const getPixData = (orderId) =>
    _makeAjaxCall('get_pix_data', { order_id: orderId }, true);
export const checkPixStatus = (orderId) =>
    _makeAjaxCall('check_pix_status', { order_id: orderId }, true);
export const getLiveStatus = () => _makeAjaxCall('get_live_status', {}, false);
export const getMyFavorites = () => _makeAjaxCall('get_my_favorites', {}, true);
export const updateMyFavorites = (favorites) =>
    _makeAjaxCall('update_my_favorites', { favorites: favorites }, true);
export const deleteMyAccount = () =>
    _makeAjaxCall('delete_my_account', {}, true);
export const completeOnboardingData = (formData) =>
    _makeAjaxCall('complete_onboarding_data', { form_data: formData }, true);
export const cancelMyOrder = (orderId) =>
    _makeAjaxCall('cancel_my_order', { order_id: orderId }, true);
export const getOrderStatus = (orderId) =>
    _makeAjaxCall('get_order_status', { order_id: orderId }, true);
export const reorder = (orderId) =>
    _makeAjaxCall('reorder', { order_id: orderId }, true);
export const addSelectedItemsToCart = (items) =>
    _makeAjaxCall('add_selected_items_to_cart', { items: items }, true);
export const getMyOrderHistory = () => _makeAjaxCall('get_my_orders', {}, true);
export const getAvailableRewards = () =>
    _makeAjaxCall('get_available_rewards', {}, true);
export const saveCustomFavorite = (itemData) =>
    _makeAjaxCall('save_custom_favorite', itemData, true);
export const deleteCustomFavorite = (favoriteId) =>
    _makeAjaxCall('delete_custom_favorite', { favorite_id: favoriteId }, true);
export const redeemReward = (productId) =>
    _makeAjaxCall('redeem_reward', { product_id: productId }, true);
export const handleGoogleLogin = (credential) =>
    _makeAjaxCall('handle_google_login', { credential: credential }, false);
export const savePushSubscription = (subscription) =>
    _makeAjaxCall(
        'save_push_subscription',
        { subscription: subscription },
        true
    );
export const sendPixExpirationWarning = (orderId) =>
    _makeAjaxCall('send_pix_expiration_warning', { order_id: orderId }, true);

// --- Consultas Específicas ---
export const fetchCpfData = (cpf) =>
    _makeAjaxCall('fetch_cpf_data', { cpf: cpf }, true);

// NOVO: Busca endereços de um cliente específico (para uso no PDV)
export const getAddressesByUserId = (userId) =>
    _makeAjaxCall('get_customer_addresses', { user_id: userId }, true);
