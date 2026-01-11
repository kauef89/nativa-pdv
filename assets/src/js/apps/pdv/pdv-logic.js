/**
 * assets/src/js/apps/pdv/pdv-logic.js
 * Lógica de negócios do PDV: Navegação, Modais, Carrinho, Clientes e Pagamento.
 * Compatível com Template v6.0 (Sidebar Layout).
 */

import { showToast } from '@utils/ui-helpers.js';

// --- Estado Local ---
const pdvState = {
    currentView: 'delivery', // View inicial
    cart: [],
    client: { id: 0, name: 'Visitante' },
    total: 0,
    payments: [],
    tempProduct: null,
};

// --- Inicialização ---
export function initPdv() {
    console.log('[PDV Logic] Inicializado.');

    // Inicia na view padrão ou na última salva (opcional)
    switchView('delivery');
    updateCartUI();

    // Listeners globais (ex: atalhos de teclado)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F5') {
            e.preventDefault();
            openPaymentModal();
        }
    });
}

// ================= NAVEGAÇÃO (SIDEBAR) =================

export function switchView(viewId) {
    console.log(`[PDV] Navegando para: ${viewId}`);

    // 1. Atualiza estado visual do Menu
    // Remove active de todos
    document
        .querySelectorAll('.nav-item')
        .forEach((btn) => btn.classList.remove('active'));

    // Tenta encontrar o botão que foi clicado ou corresponde ao ID
    // Como o click vem do HTML, podemos não ter o 'this' direto, então buscamos pelo atributo
    const targetBtn = document.querySelector(
        `.nav-item[onclick*="'${viewId}'"]`
    );
    if (targetBtn) {
        targetBtn.classList.add('active');
    }

    // 2. Troca a View (Conteúdo)
    document.querySelectorAll('.pdv-view').forEach((view) => {
        view.classList.remove('active');
        view.style.display = 'none'; // Garante que saia do fluxo
    });

    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
        targetView.style.display = 'block';
        // Pequeno delay para permitir transição de opacidade se houver CSS para isso
        setTimeout(() => targetView.classList.add('active'), 10);
        pdvState.currentView = viewId;
    } else {
        // Se a view não existe (ex: Configurações), mostra um toast ou console
        console.warn(`View #view-${viewId} ainda não implementada.`);
        showToast(`Módulo ${viewId} em desenvolvimento`, 'warning');
    }
}

// ================= MODAIS (Center Sheets) =================

// Helper genérico para abrir/fechar modais centrais
function toggleModal(modalId, show) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    if (show) {
        modal.classList.add('is-visible'); // Classe CSS que controla opacidade/visibilidade

        // Foca no primeiro input disponível para agilidade
        const input = modal.querySelector('input:not([type="hidden"])');
        if (input) setTimeout(() => input.focus(), 100);
    } else {
        modal.classList.remove('is-visible');
    }
}

// ================= GESTÃO DE CLIENTES =================

export function openClientModal() {
    toggleModal('client-modal', true);
}

export function closeClientModal() {
    toggleModal('client-modal', false);
}

export function handleSearch() {
    const input = document.getElementById('client-search-input');
    const resultsDiv = document.getElementById('client-results');

    if (!input || !resultsDiv) return;

    const term = input.value;
    if (term.length < 3) {
        showToast('Digite pelo menos 3 caracteres', 'warning');
        return;
    }

    resultsDiv.innerHTML =
        '<div class="nativa-loader-spinner" style="text-align:center; padding:20px;">Buscando...</div>';

    // Simulação de chamada API
    setTimeout(() => {
        resultsDiv.innerHTML = `
            <div class="nativa-search-item" onclick="window.pdvApp.selectClient({id:1, name:'Cliente Exemplo', cpf:'000.000.000-00'})" style="padding: 12px; border-bottom: 1px solid #eee; cursor: pointer;">
                <div style="font-weight:bold;">Cliente Exemplo</div>
                <div style="font-size:0.85em; color:#666;">CPF: 000.000.000-00</div>
            </div>
        `;
        // Mostra botão de "Não encontrado"
        const notFoundDiv = document.getElementById('client-not-found-action');
        if (notFoundDiv) notFoundDiv.style.display = 'block';
    }, 600);
}

export function selectClient(client) {
    pdvState.client = client;

    // Atualiza UI em todos os lugares que mostram o nome do cliente
    const displays = document.querySelectorAll('#current-client-display');
    displays.forEach((el) => (el.textContent = client.name));

    closeClientModal();
    showToast(`Cliente ${client.name} identificado!`, 'success');
}

export function searchGovApi() {
    // Alterna visualização dentro do modal
    document.getElementById('client-search-view').style.display = 'none';
    document.getElementById('client-register-view').style.display = 'block';

    // Preenche dados simulados
    document.getElementById('reg-name-display').textContent =
        'NOVO CLIENTE (VIA GOV)';
    document.getElementById('reg-cpf-display').textContent =
        document.getElementById('client-search-input').value || '---';
}

export function resetClientModal() {
    document.getElementById('client-search-view').style.display = 'block';
    document.getElementById('client-register-view').style.display = 'none';
}

export function finalizeRegistration() {
    // Lógica de cadastro real viria aqui
    selectClient({ id: 999, name: 'Novo Cliente Cadastrado' });
    resetClientModal();
}

// ================= GESTÃO DE PRODUTOS/OPÇÕES =================

export function closeOptionsModal() {
    toggleModal('options-modal', false);
    pdvState.tempProduct = null;
}

export function confirmOptions() {
    console.log('Opções confirmadas');
    // Lógica para adicionar ao carrinho
    closeOptionsModal();
    // Exemplo: adicionar item dummy
    pdvState.cart.push({
        id: Date.now(),
        name: 'Produto Teste',
        price: 10.0,
        quantity: 1,
    });
    updateCartUI();
}

// ================= GESTÃO DE PAGAMENTOS =================

export function openPaymentModal() {
    if (pdvState.cart.length === 0) {
        showToast('A cesta está vazia!', 'warning');
        return;
    }
    toggleModal('payment-modal', true);
    document.getElementById('pay-total-display').textContent = formatCurrency(
        pdvState.total
    );
}

export function closePaymentModal() {
    toggleModal('payment-modal', false);
}

export function selectMethod(method, btnElement) {
    // Remove classe 'selected' de todos os botões de pagamento
    document
        .querySelectorAll('.nativa-payment-button')
        .forEach((b) => b.classList.remove('selected'));
    // Adiciona ao clicado
    btnElement.classList.add('selected');
    console.log('Método selecionado:', method);
}

export function addPayment() {
    const input = document.getElementById('pay-input-val');
    const value = parseFloat(input?.value);

    if (!value || value <= 0) return;

    const list = document.getElementById('pay-list-container');
    const itemDiv = document.createElement('div');
    itemDiv.style.cssText =
        'display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;';
    itemDiv.innerHTML = `<span>Pagamento</span> <strong>${formatCurrency(value)}</strong>`;

    list.appendChild(itemDiv);

    // Limpa e foca
    input.value = '';
    input.focus();
}

export function finalizeOrder() {
    showToast('Venda Finalizada com Sucesso!', 'success');

    // Limpeza
    pdvState.cart = [];
    pdvState.client = { id: 0, name: 'Visitante' };
    pdvState.payments = [];

    updateCartUI();
    document.getElementById('current-client-display').textContent = 'Visitante';
    document.getElementById('pay-list-container').innerHTML = '';

    closePaymentModal();
}

// ================= HELPERS UI =================

function updateCartUI() {
    const cartList = document.getElementById('cart-items');
    const totalEl = document.getElementById('cart-total');

    if (!cartList || !totalEl) return;

    cartList.innerHTML = '';
    let total = 0;

    if (pdvState.cart.length === 0) {
        cartList.innerHTML = '<li class="empty-cart-msg">Cesta vazia</li>';
    } else {
        pdvState.cart.forEach((item) => {
            const li = document.createElement('li');
            li.className = 'cart-item'; // Certifique-se de que esta classe existe no CSS
            li.innerHTML = `
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <span>${item.quantity}x ${item.name}</span>
                    <span>${formatCurrency(item.price * item.quantity)}</span>
                </div>
            `;
            cartList.appendChild(li);
            total += item.price * item.quantity;
        });
    }

    pdvState.total = total;
    totalEl.textContent = formatCurrency(total);
}

function formatCurrency(value) {
    return value.toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    });
}

// ================= EXPORTAÇÃO GLOBAL =================
// Disponibiliza as funções para o HTML (onclick="window.pdvApp...")
window.pdvApp = {
    initPdv,
    switchView,

    // Cliente
    openClientModal,
    closeClientModal,
    handleSearch,
    selectClient,
    searchGovApi,
    resetClientModal,
    finalizeRegistration,

    // Produtos/Opções
    closeOptionsModal,
    confirmOptions,

    // Pagamento
    openPaymentModal,
    closePaymentModal,
    selectMethod,
    addPayment,
    finalizeOrder,
};
