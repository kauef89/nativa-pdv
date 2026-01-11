// apps/consumer/pages/account/my-account-rewards-ui.js

import { openProductDetails } from '@shared/features/menu/product-sheet.js';
import { formatNumberWithThousandSeparator } from '@utils/formatters.js';
import { provideFeedbackForDisabledElement } from '@utils/ui-helpers.js';

/**
 * Manipula o clique em um card de recompensa, abrindo a ficha do produto.
 * @param {Event} event - O evento de clique.
 */
function handleRedeemClick(event) {
    // --- INÍCIO DA MODIFICAÇÃO ---
    if (
        provideFeedbackForDisabledElement(
            event,
            '.nativa-redeem-product-btn',
            'Você ainda não tem pontos suficientes para resgatar esta recompensa.'
        )
    ) {
        return;
    }
    // --- FIM DA MODIFICAÇÃO ---

    const redeemButton = event.target.closest('.nativa-redeem-product-btn');
    if (!redeemButton || redeemButton.disabled) {
        return;
    }

    const productId = parseInt(redeemButton.dataset.productId, 10);
    const pointsCost = parseInt(redeemButton.dataset.pointsCost, 10);

    if (!productId || !pointsCost) {
        console.error(
            'ID do produto ou custo em pontos ausente no card de recompensa.'
        );
        return;
    }

    // Busca os dados completos do produto no objeto global.
    const productData = window.nativaDeliveryData.products.find(
        (p) => p.id === productId
    );

    if (!productData) {
        console.error(
            `Produto de resgate com ID ${productId} não encontrado nos dados globais.`
        );
        // Idealmente, mostrar um toast para o usuário aqui.
        return;
    }

    const rewardContext = {
        points_cost: pointsCost,
    };

    // Abre a ficha do produto em modo de resgate.
    openProductDetails(productData, null, null, null, rewardContext);
}

export function renderRewardsSheet(userPoints, rewards) {
    const sheet = document.getElementById('nativa-rewards-sheet');
    if (!sheet) return;

    const contentWrapper = sheet.querySelector('.nativa-bottom-sheet-content');
    if (
        contentWrapper &&
        !contentWrapper.querySelector('.nativa-bottom-sheet-handle')
    ) {
        const handle = document.createElement('div');
        handle.className = 'nativa-bottom-sheet-handle';
        contentWrapper.prepend(handle);
    }

    const userPointsEl = sheet.querySelector('#rewards-sheet-user-points');
    const listContainer = sheet.querySelector('#nativa-rewards-list-container');

    if (userPointsEl) {
        // CORRIGIDO: Usa a função importada diretamente.
        userPointsEl.textContent =
            formatNumberWithThousandSeparator(userPoints);
    }

    if (!listContainer) return;

    listContainer.innerHTML = '';

    // --- INÍCIO DA MODIFICAÇÃO ---
    // Filtra as recompensas para exibir apenas aquelas cujo produto associado está disponível.
    const allProducts = window.nativaDeliveryData.products || [];
    const availableRewards = (rewards || []).filter((reward) => {
        const product = allProducts.find((p) => p.id == reward.product_id);
        return (
            product &&
            product.availability !== 'indisponivel' &&
            product.availability !== 'oculto'
        );
    });
    // --- FIM DA MODIFICAÇÃO ---

    if (availableRewards.length === 0) {
        listContainer.innerHTML =
            '<p class="nativa-rewards-empty-message">Ainda não há produtos para resgate. Acumule mais pontos!</p>';
        return;
    }

    const rewardsHtml = availableRewards
        .map((reward) => {
            const isAffordable = userPoints >= reward.points_cost;
            const cardClass = isAffordable ? '' : 'is-unavailable';
            const imgHtml = reward.category_image_url
                ? `<img src="${reward.category_image_url}" alt="Imagem da categoria" class="nativa-reward-card-image" width="60" height="60">`
                : '<div class="nativa-reward-card-image-placeholder"><span class="material-symbols-rounded">shopping_bag</span></div>';

            // MODIFICAÇÃO: O botão agora tem uma classe específica para o evento de clique
            // e um data-attribute com o custo em pontos.
            return `
            <button class="nativa-reward-card nativa-redeem-product-btn ${cardClass}"
                    data-product-id="${reward.product_id}"
                    data-points-cost="${reward.points_cost}"
                    ${!isAffordable ? 'disabled' : ''}>
                <div class="nativa-reward-card-image-wrapper">${imgHtml}</div>
                <div class="nativa-reward-card-name">${reward.product_name}</div>
                <div class="nativa-reward-card-cost">
                    <span class="material-symbols-rounded">diamond</span>
                    ${formatNumberWithThousandSeparator(reward.points_cost)}
                </div>
            </button>
        `;
        })
        .join('');

    listContainer.innerHTML = `<div class="nativa-rewards-list-scroller">${rewardsHtml}</div>`;

    // ADICIONADO: Adiciona um único event listener para todos os botões de resgate.
    const scroller = listContainer.querySelector(
        '.nativa-rewards-list-scroller'
    );
    if (scroller) {
        // Garante que não haja múltiplos listeners se a função for chamada várias vezes.
        scroller.removeEventListener('click', handleRedeemClick);
        scroller.addEventListener('click', handleRedeemClick);
    }
}
