import { state } from '@core/state/global-state.js';
import { showToast } from '@utils/ui-helpers.js';
import { init as initMenu } from '@shared/features/menu/menu-main.js';
import { MenuUI } from '@shared/features/menu/menu-ui.js';
import { init as initCart } from '@shared/features/cart/cart-main.js';

export async function searchCustomer() {
    const input = document.getElementById('new-order-client-term');
    const resultsDiv = document.getElementById('new-order-client-results');
    const loader = document.getElementById('new-order-loading');

    if (!input || !resultsDiv) return;

    const term = input.value.trim();
    if (term.length < 8) {
        showToast('Digite pelo menos 8 números (Telefone ou CPF)', 'warning');
        return;
    }

    loader.style.display = 'block';
    resultsDiv.style.display = 'none';
    resultsDiv.innerHTML = '';

    try {
        const apiData = window.nativaData || {};
        const apiRoot = apiData.root || '/wp-json/';
        const nonce = apiData.nonce || '';

        const url = `${apiRoot}nativa-delivery/v1/customers/search?term=${encodeURIComponent(term)}&local_only=true`;

        const response = await fetch(url, { headers: { 'X-WP-Nonce': nonce } });

        if (response.status === 403) throw new Error('Sessão expirou.');

        const data = await response.json();

        loader.style.display = 'none';
        resultsDiv.style.display = 'block';

        if (data.success && data.customers && data.customers.length > 0) {
            resultsDiv.innerHTML = data.customers
                .map(
                    (customer) => `
                <div class="client-result-item" onclick="window.pdvApp.selectCustomerForOrder({
                    id: '${customer.id}', 
                    name: '${customer.name.replace(/'/g, "\\'")}',
                    phone: '${customer.phone || ''}',
                    cpf: '${customer.cpf || ''}'
                })">
                    <strong>${customer.name}</strong>
                    <span>${customer.phone ? 'Tel: ' + customer.phone : ''} ${customer.cpf ? '| CPF: ' + customer.cpf : ''}</span>
                </div>
            `
                )
                .join('');
        } else {
            resultsDiv.innerHTML = `<div style="padding:15px; text-align:center; color:#666;">Nenhum cliente encontrado.<br><small>Verifique os dados.</small></div>`;
        }
    } catch (error) {
        console.error('Erro na busca:', error);
        loader.style.display = 'none';
        showToast('Erro ao buscar cliente.', 'error');
    }
}

export function selectCustomerForOrder(customer) {
    const nameDisplay = document.getElementById('selected-client-name');
    if (nameDisplay) nameDisplay.textContent = customer.name;

    const step1 = document.getElementById('step-client-search');
    const step2 = document.getElementById('step-order-builder');

    if (step1) {
        step1.classList.remove('active');
        step1.style.display = 'none';
    }
    if (step2) {
        step2.classList.add('active');
        step2.style.display = 'flex';
    }

    // Inicializa Shared State com dados injetados
    if (window.nativaData) {
        state.menu.products = window.nativaData.products || [];
        state.menu.categories = window.nativaData.categories || [];
        state.adicionalGroups = window.nativaData.adicionalGroups || {};
        state.serverData = window.nativaData;

        state.user = {
            isLoggedIn: true,
            id: customer.id,
            name: customer.name,
            phone: customer.phone,
            addresses: [], // Handlers do carrinho carregarão endereços reais
        };
    }

    // Inicializa Módulos Compartilhados
    try {
        initMenu();
        initCart();
        if (state.menu.products.length > 0) {
            MenuUI.renderMenuList(state.menu.products);
        }
        showToast(`Pedido de ${customer.name}`, 'success');
    } catch (e) {
        console.error('[PDV Customer] Erro ao iniciar:', e);
        showToast('Erro ao carregar sistema.', 'error');
    }
}
