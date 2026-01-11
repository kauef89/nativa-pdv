// core/state/global-state.js

/**
 * ÚNICA FONTE DE VERDADE para o estado do frontend.
 * Centraliza os estados de carrinho, checkout, menu e conta do usuário para evitar
 * duplicação e inconsistência de dados.
 * ATUALIZAÇÃO (CPT Pagamentos): Substitui 'paymentOptions' por 'paymentMethods'.
 * ATUALIZAÇÃO (Restrição Pagamento): Adiciona 'paymentRestriction' ao estado do usuário.
 */
export const state = {
    // Flag para garantir que o estado seja inicializado apenas uma vez,
    // protegendo contra a execução duplicada do script main.js.
    isInitialized: false,

    // --- Dados Globais da Aplicação ---
    allBairros: [],
    allRuas: [],

    // --- Dados Iniciais Carregados do Servidor ---
    serverData: {
        serviceStatus: {},
        operatingHours: {},
        // --- INÍCIO DA MODIFICAÇÃO (CPT Pagamentos) ---
        paymentMethods: [], // Substitui 'paymentOptions'
        // --- FIM DA MODIFICAÇÃO ---
        googleClientId: null,
        whatsappNumber: null,
        logoutUrl: null,
        checkoutUrl: null,
        app_version: null,
    },

    // --- Carrinho e Checkout ---
    cart: {
        contents: {},
        subtotal: 0,
        count: 0,
        offer: null,
    },
    selectedModality: null,
    selectedBairro: null,
    deliveryFee: 0,
    appliedCoupon: {
        code: null,
        amount: 0,
    },

    // --- Menu e Montagem de Combos ---
    menu: {
        currentComboData: null,
        currentStepIndex: 0,
        flatSteps: [],
        userSelections: [],
        editingCartItemKey: null,
        favoriteProducts: {},
        isFavoriteFilterActive: false,
        afterModalityAction: null,
        currentProduct: null,
        lastClickedCardElement: null,
        // --- INÍCIO DA MODIFICAÇÃO ---
        // Adiciona um local no estado global para guardar os dados do favorito
        // que está a aguardar para ser guardado.
        pendingFavorite: null,
        // --- FIM DA MODIFICAÇÃO ---
    },

    // --- Conta do Usuário ---
    user: {
        isLoggedIn: false,
        profile: null,
        orders: [],
        currentOrder: null,
        pendingPaymentOrder: null,
        addresses: [],
        rewards: null,
        // --- INÍCIO DA MODIFICAÇÃO (Restrição Pagamento) ---
        paymentRestriction: null, // Armazena a flag (ex: 'pix_only')
        // --- FIM DA MODIFICAÇÃO ---
    },
};
