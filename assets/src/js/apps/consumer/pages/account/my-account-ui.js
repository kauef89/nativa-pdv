// apps/consumer/pages/account/my-account-ui.js

import {
    formatAddress,
    formatNumberWithThousandSeparator,
} from '@utils/formatters.js';
import { escapeHTML } from '@utils/ui-helpers.js';
import {
    renderCurrentOrder,
    renderPendingPaymentInfo,
} from './my-account-order-ui.js';
import {
    renderManagementCard,
    renderProfileCard,
} from './my-account-profile-ui.js';

const selectors = {
    profile: {
        points: document.getElementById('my-account-points-value'),
    },
    addressListContainer: document.getElementById('address-list-container'),
};

const _animateElements = (selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el, index) => {
        el.style.opacity = '0';
        el.style.animationDelay = `${index * 100}ms`;
        el.classList.add('nativa-fade-in-up');
    });
};

const _renderAddressList = (addresses, bairros) => {
    if (!selectors.addressListContainer) return;

    selectors.addressListContainer.innerHTML = '';
    addresses.forEach((address) => {
        const bairro = bairros.find((b) => b.id == address.bairro_id);
        const card = document.createElement('div');
        card.className = 'address-card';
        card.dataset.addressId = address.id;

        // --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO DECODIFICAÇÃO) ---
        // Decodifica a rua e o complemento para remover '+' e caracteres de URL
        const rawStreet = address.streetName || address.street || '';
        const streetName = escapeHTML(formatAddress(rawStreet));

        const rawComplement = address.complement || '';
        const complementDecoded = formatAddress(rawComplement);

        const addressNumber = escapeHTML(address.number);
        const bairroName = bairro ? escapeHTML(bairro.nome) : 'Bairro Inválido';

        const complementHtml = complementDecoded
            ? `<span class="address-card-complement">(${escapeHTML(complementDecoded)})</span>`
            : '';
        // --- FIM DA MODIFICAÇÃO ---

        const primaryTagHtml = address.is_primary
            ? '<span class="address-card-primary-tag">Principal</span>'
            : '';
        const addressApelido = escapeHTML(address.apelido || 'Endereço');

        card.innerHTML = `
            <div class="address-card-header">
                <strong class="address-card-title">${addressApelido}</strong>
                <div class="address-card-actions">
                    ${primaryTagHtml}
                    <button class="action-btn edit-btn" title="Editar" data-address-id="${address.id}">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                    <button class="action-btn delete-btn" title="Excluir" data-address-id="${address.id}">
                        <span class="material-symbols-rounded">delete</span>
                    </button>
                </div>
            </div>
            <p class="address-card-info">
                ${streetName}, ${addressNumber} - ${bairroName}
                ${complementHtml}
            </p>
        `;
        selectors.addressListContainer.appendChild(card);
    });
};

/**
 * Renderiza o conteúdo da aba "Fidelidade" (antigo Na Faixa).
 * @param {object} data - Os dados da conta do usuário, incluindo 'rewards'.
 */
const _renderNaFaixaTab = (data) => {
    // --- ATUALIZAÇÃO: Busca o novo ID da aba ---
    const container = document.getElementById('tab-fidelidade');
    if (!container) return;

    const loyaltyData = data.rewards || {
        user_points: 0,
        rewards: [],
        usage_history: [],
    };
    const allProducts = window.nativaDeliveryData.products || [];

    const availableRewards = (loyaltyData.rewards || []).filter((reward) => {
        const product = allProducts.find((p) => p.id == reward.product_id);
        return (
            product &&
            product.availability !== 'indisponivel' &&
            product.availability !== 'oculto'
        );
    });

    const historyHtml =
        (loyaltyData.usage_history || []).length > 0
            ? `
        <div class="loyalty-history-table">
            <h4>Histórico de Uso</h4>
            <table>
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Produto Resgatado</th>
                        <th>Custo</th>
                    </tr>
                </thead>
                <tbody>
                    ${loyaltyData.usage_history
                        .map(
                            (entry) => `
                        <tr>
                            <td>${escapeHTML(entry.date)}</td>
                            <td>${escapeHTML(entry.product_name)}</td>
                            <td class="points-cell"><span class="material-symbols-rounded">diamond</span> ${formatNumberWithThousandSeparator(entry.points_cost)}</td>
                        </tr>
                    `
                        )
                        .join('')}
                </tbody>
            </table>
        </div>
    `
            : '<p>Você ainda não resgatou nenhuma recompensa.</p>';

    const rewardsListHtml =
        availableRewards.length > 0
            ? availableRewards
                  .map((reward) => {
                      const isAffordable =
                          loyaltyData.user_points >= reward.points_cost;
                      const cardClass = isAffordable ? '' : 'is-unavailable';
                      const imgHtml = reward.category_image_url
                          ? `<img src="${reward.category_image_url}" alt="Imagem da categoria" class="nativa-reward-card-image" width="60" height="60">`
                          : '<div class="nativa-reward-card-image-placeholder"><span class="material-symbols-rounded">shopping_bag</span></div>';

                      return `
            <button class="nativa-reward-card nativa-redeem-product-btn ${cardClass}"
                    data-product-id="${reward.product_id}"
                    data-points-cost="${reward.points_cost}"
                    ${!isAffordable ? 'disabled' : ''}>
                <div class="nativa-reward-card-image-wrapper">${imgHtml}</div>
                <div class="nativa-reward-card-name">${escapeHTML(reward.product_name)}</div>
                <div class="nativa-reward-card-cost">
                    <span class="material-symbols-rounded">diamond</span>
                    ${formatNumberWithThousandSeparator(reward.points_cost)}
                </div>
            </button>
        `;
                  })
                  .join('')
            : '<p class="nativa-rewards-empty-message">Não há recompensas disponíveis no momento.</p>';

    container.innerHTML = `
        <div class="nativa-account-card">
            <div class="nativa-loyalty-balance-card">
                 <h4>Meu Saldo</h4>
                 <div class="loyalty-balance-value">
                     <span class="material-symbols-rounded">diamond</span>
                     <span>${formatNumberWithThousandSeparator(loyaltyData.user_points)}</span>
                 </div>
            </div>
            ${historyHtml}
        </div>
        <div class="nativa-account-card">
             <div class="order-details-content" id="loyalty-rules-details">
                <div class="loyalty-rules-content" style="display: none;">
                    ${window.nativaDeliveryData?.loyaltyRules || '<p>Regras não disponíveis.</p>'}
                </div>
             </div>
             <button class="nativa-button-secondary toggle-details-btn" data-order-id="loyalty-rules">
                Ver Regras <span class="material-symbols-rounded">expand_more</span>
            </button>
        </div>
        <div class="nativa-account-card">
            <h4>Produtos para Resgate</h4>
            <div id="nativa-rewards-list-container" class="nativa-rewards-list-scroller">
                ${rewardsListHtml}
            </div>
        </div>
    `;
};

export const MyAccountUI = {
    renderAddressSection: (addresses, bairros) => {
        if (!selectors.addressListContainer) return;

        selectors.addressListContainer.innerHTML = '';
        if (addresses && addresses.length > 0) {
            _renderAddressList(addresses, bairros);
        } else {
            selectors.addressListContainer.innerHTML =
                '<p>Nenhum endereço cadastrado ainda. Clique em "Adicionar Novo Endereço" para começar!</p>';
        }
    },

    animatePoints: (element, start, end, duration) => {
        if (!element) return;
        if (start === end) {
            element.textContent = formatNumberWithThousandSeparator(end);
            return;
        }

        const range = end - start;
        let current = start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.abs(Math.floor(duration / range));

        const timer = setInterval(() => {
            current += increment;
            element.textContent = formatNumberWithThousandSeparator(current);
            if (current == end) {
                clearInterval(timer);
            }
        }, stepTime);
    },

    renderMyAccountPage: (data) => {
        if (!data) return;

        renderProfileCard(data);
        renderManagementCard(data);
        _renderNaFaixaTab(data);

        MyAccountUI.renderAddressSection(data.addresses, data.bairros);

        renderPendingPaymentInfo(data.pendingPaymentOrder);
        renderCurrentOrder(data.currentOrder);

        setTimeout(() => {
            _animateElements('.nativa-profile-card, .nativa-account-card');
        }, 0);
    },

    selectors: selectors,
};
