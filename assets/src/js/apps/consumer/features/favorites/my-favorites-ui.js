// apps/consumer/features/favorites/my-favorites-ui.js

import { formatPrice } from '@utils/formatters.js';
import { escapeHTML } from '@utils/ui-helpers.js';

// --- INÍCIO DA MODIFICAÇÃO (VERIFICAÇÃO DE DISPONIBILIDADE) ---
/**
 * Verifica se um favorito (incluindo adicionais) está disponível atualmente.
 * @param {object} favorite - O objeto do favorito.
 * @returns {boolean} - True se disponível, False caso contrário.
 */
function isFavoriteAvailable(favorite) {
    const allProducts = window.nativaDeliveryData.products || [];
    const productId = favorite.base_product_id;
    const productData = allProducts.find((p) => p.id == productId);

    // Verifica disponibilidade do item base
    if (
        !productData ||
        productData.availability === 'indisponivel' ||
        productData.availability === 'oculto'
    ) {
        return false;
    }

    // Verifica disponibilidade dos adicionais
    let addonsGroupsToProcess = [];
    if (favorite.is_combo_favorite && favorite.configuration?.selections) {
        addonsGroupsToProcess = favorite.configuration.selections.map(
            (sel) => sel.selectedAddons
        );
    } else if (favorite.configuration?.addons) {
        addonsGroupsToProcess = [favorite.configuration.addons];
    }

    for (const addons of addonsGroupsToProcess) {
        if (addons) {
            for (const groupId in addons) {
                const group = addons[groupId];
                if (group && group.items) {
                    for (const itemIndex in group.items) {
                        const addonGroupData =
                            window.nativaDeliveryData.adicionalGroups?.[
                                groupId
                            ];
                        const addonItemData =
                            addonGroupData?.itens?.[itemIndex];

                        if (
                            !addonItemData ||
                            addonItemData.item_disponibilidade ===
                                'indisponivel' ||
                            addonItemData.item_disponibilidade === 'oculto'
                        ) {
                            return false; // Adicional indisponível
                        }
                    }
                }
            }
        }
    }

    return true; // Item base e todos os adicionais estão disponíveis
}
// --- FIM DA MODIFICAÇÃO ---

export function createGuestFavoritesPlaceholder() {
    const categorySectionDiv = document.createElement('div');
    categorySectionDiv.className = 'nativa-menu-category-section';
    categorySectionDiv.dataset.categorySlug = 'meus-favoritos';

    const categoryData = window.nativaDeliveryData.categories.find(
        (c) => c.slug === 'meus-favoritos'
    ) || {
        name: 'Meus Favoritos',
        description: '',
    };

    const staticImageUrl =
        'https://pastelarianativa.com.br/wp-content/uploads/2025/08/avatar-favoritos.webp';

    const categoryHeader = document.createElement('div');
    categoryHeader.className = 'nativa-menu-category-header';
    // ATUALIZAÇÃO DE SEGURANÇA: Escapa o nome e a descrição da categoria.
    categoryHeader.innerHTML = `
        <img src="${staticImageUrl}" alt="${escapeHTML(categoryData.name)}" class="nativa-category-image" width="80" height="80" loading="lazy">
        <div class="nativa-category-text-content">
            <h2 class="nativa-menu-category-title">${escapeHTML(categoryData.name)}</h2>
            <p class="nativa-menu-category-description">${escapeHTML(categoryData.description)}</p>
        </div>
    `;
    categorySectionDiv.appendChild(categoryHeader);

    const categoryProductList = document.createElement('div');
    categoryProductList.className = 'nativa-product-list-group';

    const card = document.createElement('div');
    card.className =
        'nativa-product-card is-placeholder-card nativa-fade-in-up';
    card.innerHTML = `
        <div class="nativa-product-placeholder-content" style="gap: 16px;">
            <p style="text-align: center; max-width: 300px;">Entre para salvar seus lanches favoritos aqui e pedir mais rápido na próxima compra</p>
            <button id="nativa-trigger-login-prompt" class="nativa-button-primary trigger-login-prompt-btn">
                <span class="material-symbols-rounded">login</span>
                Entrar agora
            </button>
        </div>
    `;

    categoryProductList.appendChild(card);
    categorySectionDiv.appendChild(categoryProductList);

    return categorySectionDiv;
}

function _getAddonsHtml(addons) {
    if (
        !addons ||
        typeof addons !== 'object' ||
        Object.keys(addons).length === 0
    ) {
        return '';
    }

    const addonsList = [];
    for (const groupId in addons) {
        const group = addons[groupId];
        if (group && group.items) {
            for (const itemIndex in group.items) {
                const item = group.items[itemIndex];
                const qty =
                    item.itemQuantity > 1 ? `${item.itemQuantity} × ` : '';
                addonsList.push(
                    `${escapeHTML(qty)}${escapeHTML(item.itemName)}`
                );
            }
        }
    }

    return addonsList.length > 0 ? ` (${addonsList.join(', ')})` : '';
}

export function createCustomFavoriteCard(favorite) {
    // --- INÍCIO DA MODIFICAÇÃO (VERIFICAÇÃO DE DISPONIBILIDADE) ---
    const available = isFavoriteAvailable(favorite);
    const unavailableClass = !available ? 'is-unavailable-favorite' : '';
    const unavailableIcon = !available
        ? '<span class="material-symbols-rounded unavailable-icon" title="Um ou mais itens deste favorito estão indisponíveis no momento">warning</span>'
        : '';
    // --- FIM DA MODIFICAÇÃO ---

    const card = document.createElement('div');
    // --- INÍCIO DA MODIFICAÇÃO (VERIFICAÇÃO DE DISPONIBILIDADE) ---
    card.className = `nativa-product-card is-custom-favorite nativa-fade-in-up ${unavailableClass}`;
    // --- FIM DA MODIFICAÇÃO ---
    card.dataset.favoriteId = favorite.id;

    const nickname = escapeHTML(favorite.nickname || favorite.name);
    const quantity = favorite.configuration.quantity || 1;
    const addonsHtml = _getAddonsHtml(favorite.configuration.addons);
    const fullProductName = `${quantity} × ${escapeHTML(favorite.name)}${addonsHtml}`;
    const priceHtml = `<span class="nativa-product-price">${formatPrice(favorite.total_item_price)}</span>`;

    // O elemento <p> foi trocado por <div> para evitar a truncagem de texto
    // aplicada por CSS a parágrafos dentro de cards de produto.
    card.innerHTML = `
        <div class="nativa-product-info">
            <div class="nativa-product-card-header">
                <h3 class="nativa-product-name">${nickname} ${unavailableIcon}</h3>
                <button class="nativa-product-favorite-btn delete-custom-favorite-btn" data-favorite-id="${favorite.id}" title="Remover favorito">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </div>
            <div class="card-separator"></div>
            <div class="nativa-product-description">${fullProductName}</div>
        </div>
        <div class="nativa-product-card-footer">
            <div class="nativa-product-tags-and-price">
                <div class="nativa-product-price-wrapper">${priceHtml}</div>
            </div>
        </div>
    `;

    return card;
}

export function createCustomComboFavoriteCard(favorite) {
    // --- INÍCIO DA MODIFICAÇÃO (VERIFICAÇÃO DE DISPONIBILIDADE) ---
    const available = isFavoriteAvailable(favorite);
    const unavailableClass = !available ? 'is-unavailable-favorite' : '';
    const unavailableIcon = !available
        ? '<span class="material-symbols-rounded unavailable-icon" title="Um ou mais itens deste combo favorito estão indisponíveis no momento">warning</span>'
        : '';
    // --- FIM DA MODIFICAÇÃO ---

    const card = document.createElement('div');
    // --- INÍCIO DA MODIFICAÇÃO (VERIFICAÇÃO DE DISPONIBILIDADE) ---
    card.className = `nativa-product-card is-custom-favorite nativa-fade-in-up ${unavailableClass}`;
    // --- FIM DA MODIFICAÇÃO ---
    card.dataset.favoriteId = favorite.id;

    const nickname = escapeHTML(favorite.nickname || favorite.name);

    const selectionsDetails = (favorite.configuration?.selections || [])
        .map((selection) => {
            const addonsHtml = _getAddonsHtml(selection.selectedAddons);
            return `<li>${escapeHTML(selection.productName)}${addonsHtml}</li>`;
        })
        .join('');

    const priceHtml = `<span class="nativa-product-price">${formatPrice(favorite.total_item_price)}</span>`;

    card.innerHTML = `
        <div class="nativa-product-info">
            <div class="nativa-product-card-header">
                <h3 class="nativa-product-name">${nickname} ${unavailableIcon}</h3>
                <button class="nativa-product-favorite-btn delete-custom-favorite-btn" data-favorite-id="${favorite.id}" title="Remover favorito">
                    <span class="material-symbols-rounded">delete</span>
                </button>
            </div>
            <div class="card-separator"></div>
            <div class="nativa-product-description">
                <strong>${escapeHTML(favorite.name)}</strong>
                <ul class="nativa-combo-favorite-details">${selectionsDetails}</ul>
            </div>
        </div>
        <div class="nativa-product-card-footer">
            <div class="nativa-product-tags-and-price">
                <div class="nativa-product-price-wrapper">${priceHtml}</div>
            </div>
        </div>
    `;

    return card;
}
