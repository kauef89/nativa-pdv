// js/features/menu/menu-ui.js

/**
 * Módulo de UI para a página de menu.
 * Refatorado para a sintaxe ES6 e uso de módulos.
 * ATUALIZADO: A lógica de filtragem foi refinada para gerenciar a visibilidade
 * das seções de categoria, melhorando a performance e a clareza da UI.
 */

import { state } from '../../core/main-state.js';
import { formatPrice } from '../../utils/nativa-utils.js';
import * as FavoritesUI from '../my-favorites/my-favorites-ui.js';
import { openProductDetails } from '../product-sheet/product-sheet-logic.js';
// --- INÍCIO DA MODIFICAÇÃO (ADIÇÃO DE IMPORTAÇÃO) ---
import { escapeHTML, createElement } from '../../utils/nativa-ui-helpers.js';
// --- FIM DA MODIFICAÇÃO ---

const selectors = {};

export function init() {
    selectors.productListContainer = document.getElementById(
        'nativa-product-list'
    );
    selectors.searchInput = document.getElementById('nativa-product-search');
    selectors.categoryIndexWrapper = document.getElementById(
        'nativa-category-index'
    );
    selectors.categoryPillsContainer =
        selectors.categoryIndexWrapper?.querySelector(
            '.nativa-category-pills-container'
        );

    console.log('Nativa Delivery Menu UI: Inicializado.');
}

export const MenuUI = {
    renderCategoryPills: function (
        categories,
        activeCategorySlug,
        showFavoritesActive,
        hasFavorites
    ) {
        if (!selectors.categoryPillsContainer) {
            init();
        }
        if (!selectors.categoryPillsContainer) return;

        selectors.categoryPillsContainer.innerHTML = '';

        const favoritesCategory = categories.find(
            (c) => c.slug === 'meus-favoritos'
        );
        if (favoritesCategory && state.user.isLoggedIn && hasFavorites) {
            const favPill = document.createElement('button');
            favPill.className = `nativa-category-pill ${showFavoritesActive ? 'is-active' : ''}`;
            favPill.dataset.categorySlug = favoritesCategory.slug;
            favPill.textContent = favoritesCategory.name;
            selectors.categoryPillsContainer.appendChild(favPill);
        }

        categories.forEach((category) => {
            if (category.slug === 'meus-favoritos') return;
            const pill = document.createElement('button');
            pill.className = `nativa-category-pill ${activeCategorySlug === category.slug && !showFavoritesActive ? 'is-active' : ''}`;
            pill.dataset.categorySlug = category.slug;
            pill.textContent = category.name;
            selectors.categoryPillsContainer.appendChild(pill);
        });
    },

    // --- INÍCIO DA MODIFICAÇÃO (REATORAÇÃO COM createElement) ---
    createProductCard: function (product) {
        const isUnavailable = product.availability === 'indisponivel';

        // Constrói o HTML do preço separadamente, pois tem lógica condicional
        let priceNodes;
        if (product.promo_price > 0 && product.promo_price < product.price) {
            priceNodes = [
                createElement('span', {
                    className: 'nativa-product-promo-price',
                    textContent: formatPrice(product.promo_price),
                }),
                document.createTextNode(' '), // Adiciona um espaço
                createElement('span', {
                    className: 'nativa-product-original-price',
                    textContent: formatPrice(product.price),
                }),
            ];
        } else {
            priceNodes = [
                createElement('span', {
                    className: 'nativa-product-price',
                    textContent: formatPrice(product.price),
                }),
            ];
        }

        const descriptionContent = product.description
            ? escapeHTML(product.description.trim())
            : '';

        const card = createElement('div', {
            className: `nativa-product-card nativa-fade-in-up ${isUnavailable ? 'is-unavailable' : ''}`,
            dataset: { productId: product.id },
            children: [
                createElement('div', {
                    className: 'nativa-product-info',
                    children: [
                        createElement('div', {
                            className: 'nativa-product-card-header',
                            children: [
                                createElement('h3', {
                                    className: 'nativa-product-name',
                                    textContent: product.name,
                                }),
                            ],
                        }),
                        createElement('div', { className: 'card-separator' }),
                        descriptionContent
                            ? createElement('p', {
                                  className: 'nativa-product-description',
                                  textContent: descriptionContent,
                              })
                            : null,
                    ],
                }),
                createElement('div', {
                    className: 'nativa-product-card-footer',
                    children: [
                        createElement('div', {
                            className: 'nativa-product-tags-and-price',
                            children: [
                                product.tags && product.tags.length > 0
                                    ? createElement('div', {
                                          className: 'nativa-product-tags',
                                          children: product.tags.map((tag) =>
                                              createElement('span', {
                                                  className:
                                                      'nativa-product-tag',
                                                  textContent: tag,
                                              })
                                          ),
                                      })
                                    : null,
                                createElement('div', {
                                    className: 'nativa-product-price-wrapper',
                                    children: priceNodes,
                                }),
                            ],
                        }),
                    ],
                }),
            ],
        });

        return card;
    },
    // --- FIM DA MODIFICAÇÃO ---

    createComboCard: function (combo) {
        const card = document.createElement('div');
        card.className =
            'nativa-product-card nativa-combo-card nativa-fade-in-up';
        card.dataset.comboId = combo.id;
        card.dataset.productId = combo.id;

        const pricePerPerson = parseFloat(combo.preco_por_pessoa || 0);

        let tagsHtml = '';
        const tags = [];

        if (combo.percentual_desconto) {
            tags.push(
                `<span class="nativa-product-tag">${escapeHTML(combo.percentual_desconto)}% OFF</span>`
            );
        }

        if (pricePerPerson > 0) {
            tags.push(
                `<span class="nativa-product-tag">${formatPrice(pricePerPerson)} / Pessoa</span>`
            );
        }

        if (tags.length > 0) {
            tagsHtml = `<div class="nativa-product-tags">${tags.join('')}</div>`;
        }

        const finalPriceHTML = `<span class="nativa-product-promo-price">${formatPrice(combo.price)}</span>`;

        const descriptionContent = combo.description
            ? escapeHTML(combo.description.trim()).replace(/\n/g, '<br>')
            : '';

        const comboDetailsHTML = descriptionContent
            ? `
                <div class="nativa-combo-details-grid">
                    <div class="combo-description-column"><p class="nativa-product-description">${descriptionContent}</p></div>
                </div>
            `
            : '';

        card.innerHTML = `
            <div class="nativa-product-info">
                <div class="nativa-product-card-header">
                    <h3 class="nativa-product-name">${escapeHTML(combo.name)}</h3>
                </div>
                <div class="card-separator"></div>
                ${comboDetailsHTML}
            </div>
            <div class="nativa-product-card-footer">
                <div class="nativa-product-tags-and-price">
                    ${tagsHtml}
                    <div class="nativa-product-price-wrapper">${finalPriceHTML}</div>
                </div>
            </div>`;

        return card;
    },

    renderMenuList: function (products, favorites = {}) {
        if (!selectors.productListContainer) {
            init();
        }
        selectors.productListContainer.innerHTML = '';

        const orderedCategories = window.nativaDeliveryData.categories || [];
        const groupedProducts = {};
        products.forEach((product) => {
            const categorySlug = product.category_slug || 'outros';
            if (!groupedProducts[categorySlug]) {
                groupedProducts[categorySlug] = [];
            }
            groupedProducts[categorySlug].push(product);
        });

        const isLoggedIn = state.user.isLoggedIn;
        const hasCustomFavorites =
            favorites && Object.keys(favorites).length > 0;

        this.renderCategoryPills(
            orderedCategories,
            'all',
            false,
            hasCustomFavorites
        );

        let globalCardIndex = 0;

        if (!isLoggedIn) {
            selectors.productListContainer.appendChild(
                FavoritesUI.createGuestFavoritesPlaceholder()
            );
        }

        orderedCategories.forEach((categoryInfo) => {
            const categorySlug = categoryInfo.slug;

            if (categorySlug === 'meus-favoritos') {
                if (isLoggedIn && hasCustomFavorites) {
                    const favSectionDiv = document.createElement('div');
                    favSectionDiv.className = 'nativa-menu-category-section';
                    favSectionDiv.dataset.categorySlug = 'meus-favoritos';

                    const header = document.createElement('div');
                    header.className = 'nativa-menu-category-header';
                    header.innerHTML = `
                        <img src="https://pastelarianativa.com.br/wp-content/uploads/2025/08/avatar-favoritos.webp" alt="Meus Favoritos" class="nativa-category-image" width="80" height="80" loading="lazy">
                        <div class="nativa-category-text-content">
                            <h2 class="nativa-menu-category-title">${escapeHTML(categoryInfo.name)}</h2>
                            ${categoryInfo.description ? `<p class="nativa-menu-category-description">${escapeHTML(categoryInfo.description)}</p>` : ''}
                        </div>`;
                    favSectionDiv.appendChild(header);

                    const favList = document.createElement('div');
                    favList.className = 'nativa-product-list-group';

                    for (const favoriteId in favorites) {
                        const favoriteData = favorites[favoriteId];
                        favoriteData.id = favoriteId;

                        let card;
                        if (favoriteData.is_combo_favorite) {
                            card =
                                FavoritesUI.createCustomComboFavoriteCard(
                                    favoriteData
                                );
                        } else {
                            card =
                                FavoritesUI.createCustomFavoriteCard(
                                    favoriteData
                                );
                        }

                        if (card) {
                            card.style.animationDelay = `${globalCardIndex * 80}ms`;
                            globalCardIndex++;
                            favList.appendChild(card);
                        }
                    }
                    favSectionDiv.appendChild(favList);
                    selectors.productListContainer.appendChild(favSectionDiv);
                }
                return;
            }

            const categoryProducts = groupedProducts[categorySlug];
            if (!categoryProducts || categoryProducts.length === 0) {
                return;
            }

            const categorySectionDiv = document.createElement('div');
            categorySectionDiv.className = 'nativa-menu-category-section';
            categorySectionDiv.dataset.categorySlug = categorySlug;

            const categoryHeader = document.createElement('div');
            categoryHeader.className = 'nativa-menu-category-header';
            let categoryImageHtml = '';
            if (categoryInfo.image_url) {
                categoryImageHtml = `<img src="${categoryInfo.image_url}" alt="${escapeHTML(categoryInfo.name)}" class="nativa-category-image" width="80" height="80" loading="lazy">`;
            }
            categoryHeader.innerHTML = `
                ${categoryImageHtml}
                <div class="nativa-category-text-content">
                    <h2 class="nativa-menu-category-title">${escapeHTML(categoryInfo.name)}</h2>
                    ${categoryInfo.description ? `<p class="nativa-menu-category-description">${escapeHTML(categoryInfo.description)}</p>` : ''}
                </div>
            `;
            categorySectionDiv.appendChild(categoryHeader);

            const categoryProductList = document.createElement('div');
            categoryProductList.className = 'nativa-product-list-group';

            categoryProducts.sort(
                (a, b) => parseFloat(a.price) - parseFloat(b.price)
            );

            categoryProducts.forEach((product) => {
                if (product.availability === 'oculto') return;
                const card = product.is_combo
                    ? this.createComboCard(product)
                    : this.createProductCard(product);
                if (card) {
                    card.style.animationDelay = `${globalCardIndex * 80}ms`;
                    globalCardIndex++;
                    categoryProductList.appendChild(card);
                }
            });

            categorySectionDiv.appendChild(categoryProductList);
            selectors.productListContainer.appendChild(categorySectionDiv);
        });
    },

    // --- INÍCIO DA MODIFICAÇÃO (LÓGICA DE FILTRO APRIMORADA) ---
    filterMenuItems: function (
        searchTerm,
        categorySlug,
        isFavoriteFilterActive
    ) {
        if (!selectors.productListContainer) return;
        const term = searchTerm.toLowerCase().trim();

        selectors.productListContainer
            .querySelectorAll('.nativa-menu-category-section')
            .forEach((section) => {
                const isFavoriteSection =
                    section.dataset.categorySlug === 'meus-favoritos';
                const isGuestPlaceholder = section.querySelector(
                    '.is-placeholder-card'
                );

                if (isGuestPlaceholder) {
                    section.style.display =
                        isFavoriteFilterActive || term ? 'none' : 'block';
                    return;
                }

                let visibleItemsInGroup = 0;
                section
                    .querySelectorAll('.nativa-product-card')
                    .forEach((item) => {
                        const itemName =
                            item
                                .querySelector('.nativa-product-name')
                                ?.textContent.toLowerCase() || '';
                        const itemDesc =
                            item
                                .querySelector('.nativa-product-description')
                                ?.textContent.toLowerCase() || '';

                        let matchesSearch =
                            !term ||
                            itemName.includes(term) ||
                            itemDesc.includes(term);

                        if (!matchesSearch && term) {
                            const productId = item.dataset.productId;
                            const productData =
                                window.nativaDeliveryData.products.find(
                                    (p) => p.id == productId
                                );

                            if (productData && productData.adicional_groups) {
                                const hasMatchingAddon =
                                    productData.adicional_groups.some(
                                        (groupId) => {
                                            const group =
                                                window.nativaDeliveryData
                                                    .adicionalGroups[groupId];
                                            if (group && group.itens) {
                                                return group.itens.some(
                                                    (addon) =>
                                                        addon.item_nome
                                                            .toLowerCase()
                                                            .includes(term)
                                                );
                                            }
                                            return false;
                                        }
                                    );
                                if (hasMatchingAddon) {
                                    matchesSearch = true;
                                }
                            }
                        }

                        if (matchesSearch) {
                            item.style.display = 'flex';
                            visibleItemsInGroup++;
                        } else {
                            item.style.display = 'none';
                        }
                    });

                if (isFavoriteFilterActive) {
                    section.style.display =
                        isFavoriteSection && visibleItemsInGroup > 0
                            ? 'block'
                            : 'none';
                } else {
                    section.style.display =
                        !isFavoriteSection && visibleItemsInGroup > 0
                            ? 'block'
                            : 'none';
                }
            });
    },
    // --- FIM DA MODIFICAÇÃO ---
};
