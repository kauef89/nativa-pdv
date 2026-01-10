// js/features/menu/menu-handlers.js

/**
 * Módulo para lidar com todos os manipuladores de eventos da página de Cardápio.
 * Refatorado para a sintaxe ES6 e uso de módulos.
 * ATUALIZADO: Corrige a verificação de modalidade, garantindo que o estado seja
 * lido do sessionStorage antes de abrir um card de produto, evitando que a
 * ficha de seleção de modalidade apareça desnecessariamente.
 * CORREÇÃO: Garante que o favoriteId seja extraído corretamente ao clicar em um card de favorito.
 */

import { state } from '../../core/main-state.js';
import { MenuUI } from './menu-ui.js';
import * as ComboWizardHandler from './combo-wizard-handlers.js';
import { showToast, openSheet } from '../../utils/nativa-ui-helpers.js';
import { handleModalitySheetDisplay } from '../cart/cart-handlers.js';
import { openProductDetails } from '../product-sheet/product-sheet-logic.js';
import {
    handleDeleteCustomFavorite,
    handleAddCustomFavoriteToCart,
    loadFavoriteProducts,
} from '../my-favorites/my-favorites-handler.js';

const throttle = (func, limit) => {
    let inThrottle;
    return function () {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
};

function handleMenuScroll() {
    const stickyHeader = document.querySelector('.nativa-menu-sticky-header');
    if (!stickyHeader) return;

    if (window.scrollY > 10) {
        stickyHeader.classList.add('is-scrolled');
    } else {
        stickyHeader.classList.remove('is-scrolled');
    }

    const headerHeight = stickyHeader.offsetHeight;
    const scrollPosition = window.scrollY + headerHeight + 24;

    const sections = document.querySelectorAll('.nativa-menu-category-section');
    let activeSectionSlug = 'all';

    sections.forEach((section) => {
        if (section.offsetTop <= scrollPosition) {
            activeSectionSlug = section.dataset.categorySlug;
        }
    });

    const pillsContainer = document.querySelector(
        '.nativa-category-pills-container'
    );
    if (pillsContainer) {
        pillsContainer
            .querySelectorAll('.nativa-category-pill')
            .forEach((pill) => {
                pill.classList.remove('is-active');
            });
        const activePill = pillsContainer.querySelector(
            `.nativa-category-pill[data-category-slug="${activeSectionSlug}"]`
        );
        if (activePill) {
            activePill.classList.add('is-active');
            activePill.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center',
            });
        }
    }
}

export async function handlePageLoad() {
    const productListContainer = document.getElementById('nativa-product-list');
    try {
        await loadFavoriteProducts();

        MenuUI.renderMenuList(
            window.nativaDeliveryData.products,
            state.menu.favoriteProducts
        );
        state.menu.activeCategorySlug = 'all';
        state.menu.isFavoriteFilterActive = false;

        window.addEventListener('scroll', throttle(handleMenuScroll, 150));
    } catch (error) {
        console.error('Erro em handlePageLoad do Menu:', error);
        if (productListContainer) {
            productListContainer.innerHTML =
                '<p>Não foi possível carregar o cardápio. Tente recarregar a página.</p>';
        }
    }
}

export function handleProductCardClick(cardElement) {
    state.lastClickedCardElement = cardElement; // Salva o elemento clicado
    const productId = cardElement.dataset.productId;
    const product = window.nativaDeliveryData.products.find(
        (p) => p.id == productId
    );
    if (!product) return;

    if (product.availability === 'indisponivel') {
        showToast('Este item não está disponível no momento.', 'error');
        return;
    }

    state.menu.currentProduct = product;
    openProductDetails(product);
}

export function scrollToCategory(categorySlug) {
    const pillsContainer = document.querySelector(
        '.nativa-category-pills-container'
    );

    if (pillsContainer) {
        pillsContainer
            .querySelectorAll('.nativa-category-pill')
            .forEach((pill) => {
                pill.classList.toggle(
                    'is-active',
                    pill.dataset.categorySlug === categorySlug
                );
            });
    }

    const stickyHeader = document.querySelector('.nativa-menu-sticky-header');
    if (!stickyHeader) return;
    const headerHeight = stickyHeader.offsetHeight;
    const scrollPadding = 16;

    let targetElement;
    if (categorySlug === 'all') {
        targetElement = document.getElementById('nativa-cardapio-page');
    } else {
        const productListContainer = document.getElementById(
            'nativa-product-list'
        );
        targetElement = productListContainer.querySelector(
            `.nativa-menu-category-section[data-category-slug="${categorySlug}"]`
        );
    }

    if (targetElement) {
        const elementPosition = targetElement.getBoundingClientRect().top;
        const offsetPosition =
            elementPosition + window.pageYOffset - headerHeight - scrollPadding;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
        });
    }
}

export function setupProductListListener() {
    const productListContainer = document.getElementById('nativa-product-list');
    if (!productListContainer) return;

    productListContainer.addEventListener('click', (event) => {
        const target = event.target;

        const deleteCustomFavoriteBtn = target.closest(
            '.delete-custom-favorite-btn'
        );
        if (deleteCustomFavoriteBtn) {
            event.stopPropagation();
            const favoriteId = deleteCustomFavoriteBtn.dataset.favoriteId;
            handleDeleteCustomFavorite(favoriteId);
            return;
        }

        const customFavoriteCard = target.closest('.is-custom-favorite');
        if (customFavoriteCard) {
            // --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO DE REFERÊNCIA) ---
            // A variável 'favoriteId' estava a ser usada sem ser definida.
            // A linha abaixo extrai o ID do dataset do card antes de o usar.
            const favoriteId = customFavoriteCard.dataset.favoriteId;
            handleAddCustomFavoriteToCart(favoriteId, customFavoriteCard);
            // --- FIM DA MODIFICAÇÃO ---
            return;
        }

        const productCard = target.closest(
            '.nativa-product-card:not(.nativa-combo-card):not(.is-custom-favorite)'
        );
        if (productCard) {
            handleProductCardClick(productCard);
            return;
        }

        const comboCard = target.closest(
            '.nativa-combo-card:not(.is-unavailable)'
        );
        if (comboCard) {
            if (ComboWizardHandler) {
                ComboWizardHandler.initFromMenu(comboCard);
            }
        }
    });
}
