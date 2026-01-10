// js/features/product-sheet/product-sheet-logic.js

/**
 * Lógica da ficha de detalhes do produto.
 * ... (histórico anterior) ...
 * CORREÇÃO (Estado Adicionais): Garante que `productState.selectedAddons` seja
 * completamente resetado ao abrir um novo produto e corretamente populado ao editar,
 * prevenindo a contaminação do estado entre diferentes produtos/interações.
 * SONDA (Preço Adicionais): Adiciona log em updateProductTotalPrice para verificar estado.
 * SONDA (Loop Preço v2): Adiciona logs e verificações mais robustas dentro do loop de cálculo de preço.
 * CORREÇÃO (Loop Preço v3): Reforça a iteração e acesso ao estado dentro de updateProductTotalPrice.
 * CORREÇÃO (Listeners v6): Remove explicitamente listeners antigos do container de addons antes de renderizar novos.
 * CORREÇÃO (Oferta Preço v2): Garante que updateProductTotalPrice seja chamado ANTES de criar newlyAddedItemData para o evento.
 * CORREÇÃO (Oferta Repetida): Remove a escrita no sessionStorage ao aceitar/recusar oferta.
 */

import { addToCart } from '../../core/nativa-api-service.js';
import {
    showToast,
    showSpinner,
    hideSpinner,
    openSheet,
    closeAllSheets,
    flyToCart,
    escapeHTML,
    closeSheet,
    checkPWAInstallAndProceed,
} from '../../utils/nativa-ui-helpers.js';
// --- INÍCIO DA MODIFICAÇÃO (REQ 2) ---
import {
    formatPrice,
    formatNumberWithThousandSeparator,
} from '../../utils/nativa-utils.js';
// --- FIM DA MODIFICAÇÃO ---
// Ajuste na importação: importa diretamente as funções necessárias dos módulos refatorados
import {
    renderProductAddons,
    attachAddonListeners,
    removeAddonListeners, // Importa a função para remover listeners
} from '../addons/addons-logic.js';
import { validateAddonSelections } from '../addons/addons-validation.js';
import { state } from '../../core/main-state.js';
import { handleModalitySheetDisplay } from '../cart/cart-handlers.js';

// Variáveis de elementos do DOM (mantidas no escopo do módulo)
let productDetailsSheet;
let addToCartButton;
let productDetailsHeader;
let productDetailsTitle;
let productDetailsDescription;
let productAddonsContainer;
let productDetailsPriceSpan;
let productQuantityInput;
let quantityMinusButton;
let quantityPlusButton;
let separatorAfterDescription;
let isInitialized = false;
let quantitySelector;
let cancelOfferButton;
let productDetailsOfferTitle;
let productDetailsOfferContent;
let productDetailsOfferText;
let productDetailsOfferProductName;
let productDetailsOfferPriceContainer;
let productDetailsOfferOriginalPrice;
let productDetailsOfferPromoPrice;
let productDetailsFooter;

// Estado local da ficha de produto
const productState = {
    currentProduct: null,
    currentProductBasePrice: 0, // Este será o preço da OFERTA se for item de oferta
    currentProductQuantity: 1,
    selectedAddons: {}, // ESTADO CENTRALIZADO para os adicionais DESTE produto na ficha
    editingCartItemKey: null,
    isOfferItem: false,
    originalPriceForOffer: 0, // Preço original ANTES da oferta
    isRewardItem: false,
    rewardPointsCost: 0,
    currentOfferId: null,
};

// _initializeElements (MODIFICADO - Listener do cancelOfferButton)
function _initializeElements() {
    if (isInitialized) return;

    productDetailsSheet = document.getElementById(
        'nativa-product-details-sheet'
    );
    if (!productDetailsSheet) {
        console.warn(
            'Elemento da ficha de detalhes do produto não encontrado.'
        );
        return; // Não inicializa se a sheet não existe
    }

    addToCartButton = document.getElementById('add-to-cart-final-button');
    productDetailsHeader = productDetailsSheet.querySelector(
        '.product-details-header'
    );
    productDetailsTitle = document.getElementById('product-details-title');
    productDetailsDescription = document.getElementById(
        'product-details-description'
    );
    productAddonsContainer = document.getElementById('product-details-addons');
    productDetailsPriceSpan = document.getElementById('product-details-price');
    productQuantityInput = document.getElementById('product-quantity');
    quantityMinusButton = document.getElementById('quantity-minus');
    quantityPlusButton = document.getElementById('quantity-plus');
    separatorAfterDescription = productDetailsSheet.querySelector(
        '#product-details-description + .nativa-separator'
    );
    productDetailsFooter = productDetailsSheet.querySelector(
        '.product-details-footer'
    );
    quantitySelector = productDetailsSheet.querySelector(
        '.nativa-product-quantity-selector'
    );
    cancelOfferButton = document.getElementById(
        'product-details-cancel-offer-btn'
    );
    productDetailsOfferTitle = document.getElementById(
        'product-details-offer-title'
    );
    productDetailsOfferContent = document.getElementById(
        'product-details-offer-content'
    );
    productDetailsOfferText = document.getElementById(
        'product-details-offer-text'
    );
    productDetailsOfferProductName = document.getElementById(
        'product-details-offer-product-name'
    );
    productDetailsOfferPriceContainer = document.getElementById(
        'product-details-offer-price-container'
    );
    productDetailsOfferOriginalPrice =
        productDetailsOfferPriceContainer?.querySelector('.original-price');
    productDetailsOfferPromoPrice =
        productDetailsOfferPriceContainer?.querySelector('.promo-price');

    // Listeners
    if (cancelOfferButton) {
        cancelOfferButton.addEventListener('click', () => {
            // --- INÍCIO DA MODIFICAÇÃO (Oferta Repetida) ---
            // Remove a escrita no sessionStorage
            // if (productState.currentOfferId) {
            //     sessionStorage.setItem(
            //         'nativaOfferActioned',
            //         `seen_${productState.currentOfferId}`
            //     );
            //     console.log(
            //         `[Product Sheet] Oferta ${productState.currentOfferId} marcada como vista via botão.`
            //     );
            // }
            console.log('[Product Sheet] Botão Cancelar Oferta clicado.'); // Log adicionado
            // --- FIM DA MODIFICAÇÃO ---
            closeSheet(productDetailsSheet);
        });
    }
    quantityMinusButton?.addEventListener('click', () => {
        if (productState.currentProductQuantity > 1) {
            productState.currentProductQuantity--;
            if (productQuantityInput)
                productQuantityInput.value =
                    productState.currentProductQuantity;
            updateProductTotalPrice();
        }
    });
    quantityPlusButton?.addEventListener('click', () => {
        productState.currentProductQuantity++;
        if (productQuantityInput)
            productQuantityInput.value = productState.currentProductQuantity;
        updateProductTotalPrice();
    });
    addToCartButton?.addEventListener('click', handleAddToCart);

    isInitialized = true;
}

// updateProductTotalPrice (MODIFICADO para Requisitos 1, 2, 3)
function updateProductTotalPrice() {
    console.log(
        '[SONDA ProductSheet updateProductTotalPrice] Iniciando cálculo. Estado ATUAL productState.selectedAddons:',
        JSON.parse(JSON.stringify(productState.selectedAddons)) // Log the state *before* calculation
    );
    if (!productState.currentProduct) {
        console.warn(
            '[updateProductTotalPrice] currentProduct is null, returning 0.'
        );
        return 0;
    }
    let totalAddonsPrice = 0;

    const addonsState = productState.selectedAddons;

    if (typeof addonsState !== 'object' || addonsState === null) {
        console.warn(
            '[updateProductTotalPrice] addonsState is not a valid object:',
            addonsState
        );
    } else {
        const groupIds = Object.keys(addonsState);
        console.log(
            `[updateProductTotalPrice] Found group IDs: [${groupIds.join(', ')}]`
        );

        for (const groupId of groupIds) {
            console.log(
                `[updateProductTotalPrice] Processing group ${groupId}`
            );
            const currentGroupState = productState.selectedAddons[groupId];

            if (
                currentGroupState &&
                typeof currentGroupState === 'object' &&
                currentGroupState.items &&
                typeof currentGroupState.items === 'object'
            ) {
                const currentGroupItems = currentGroupState.items;
                const itemEntries = Object.entries(currentGroupItems);
                console.log(
                    `  -> Group ${groupId} has item entries: ${itemEntries.length}`
                ); // Log item count

                for (const [itemIndex, item] of itemEntries) {
                    if (item && typeof item === 'object') {
                        const priceToAdd =
                            item.final_cost ?? item.itemPrice ?? 0;
                        const quantity = item.itemQuantity || 1;
                        if (
                            typeof priceToAdd === 'number' &&
                            typeof quantity === 'number'
                        ) {
                            console.log(
                                `  --> Item ${itemIndex} (from entries): final_cost=${item.final_cost}, itemPrice=${item.itemPrice}, priceToAdd=${priceToAdd}, qty=${quantity}. Adding ${priceToAdd * quantity} to total.`
                            );
                            totalAddonsPrice += priceToAdd * quantity;
                        } else {
                            console.warn(
                                `  --> Item ${itemIndex} (from entries) has non-numeric price/qty: priceToAdd=${priceToAdd} (type: ${typeof priceToAdd}), quantity=${quantity} (type: ${typeof quantity})`
                            );
                        }
                    } else {
                        console.warn(
                            `  --> Item ${itemIndex} (from entries) in group ${groupId} is invalid or not an object:`,
                            item
                        );
                    }
                }
                if (itemEntries.length === 0) {
                    console.log(
                        `  -> Group ${groupId} has no valid item entries to process.`
                    );
                }
            } else {
                console.log(
                    `  -> Group ${groupId} state is invalid, missing 'items', or 'items' is not an object. State:`,
                    currentGroupState
                );
            }
        }
        if (groupIds.length === 0) {
            console.log(
                '[updateProductTotalPrice] No group IDs found in addonsState to iterate over.'
            );
        }
    }
    console.log(
        `[updateProductTotalPrice] Final calculated totalAddonsPrice after loops: ${totalAddonsPrice}`
    );

    // Se isRewardItem, currentProductBasePrice é 0.
    // finalPrice aqui = totalAddonsPrice * quantity.
    const finalPrice =
        (productState.currentProductBasePrice + totalAddonsPrice) *
        productState.currentProductQuantity;
    console.log(
        `[SONDA ProductSheet updateProductTotalPrice] Preço base (pode ser oferta): ${productState.currentProductBasePrice}, Total adicionais calculados: ${totalAddonsPrice}, Quantidade: ${productState.currentProductQuantity}`
    );

    console.log(
        `[SONDA ProductSheet updateProductTotalPrice] Preço final calculado: ${finalPrice}`
    );

    // --- INÍCIO DA MODIFICAÇÃO (Req 1, 2, 3) ---
    if (productDetailsPriceSpan) {
        if (productState.isRewardItem) {
            // Req 2: Mostrar Custo em Pontos
            const pointsCost = formatNumberWithThousandSeparator(
                productState.rewardPointsCost || 0
            );
            let badgeHtml = '';

            // Req 3: Mostrar Badge de Custo Adicional (se houver)
            // finalPrice aqui = (0 + totalAddonsPrice) * quantity
            const additionalCost = finalPrice;

            if (additionalCost > 0) {
                // Crio o HTML para o badge. A classe 'product-price-badge' precisará de CSS.
                badgeHtml = `<span class="product-price-badge">+${formatPrice(additionalCost)}</span>`;
            }

            // Define o innerHTML com a nova estrutura
            productDetailsPriceSpan.innerHTML = `
                <span class="product-points-cost">
                    <span class="material-symbols-rounded">diamond</span>
                    ${pointsCost}
                </span>
                ${badgeHtml}
            `;
            // Adiciona uma classe ao span principal para estilização
            productDetailsPriceSpan.classList.add('is-reward-price');
            productDetailsPriceSpan.classList.remove('is-monetary-price');
        } else {
            // Lógica original (preço monetário)
            productDetailsPriceSpan.innerHTML = formatPrice(finalPrice); // Garante que o HTML seja limpo (remove badge)
            productDetailsPriceSpan.classList.remove('is-reward-price');
            productDetailsPriceSpan.classList.add('is-monetary-price');
        }
    }

    // Update button text logic
    if (addToCartButton) {
        if (productState.editingCartItemKey) {
            addToCartButton.textContent = 'Atualizar';
        } else {
            // Req 1: Botão sempre "Quero"
            addToCartButton.textContent = 'Quero';
        }
    }
    // --- FIM DA MODIFICAÇÃO ---

    return finalPrice;
}

// resetProductDetailsSheet (MODIFICADO para Requisitos 1, 2, 3)
function resetProductDetailsSheet() {
    // UI Cleanup
    if (productDetailsHeader) {
        const existingImg = productDetailsHeader.querySelector(
            '.nativa-category-image'
        );
        if (existingImg) existingImg.remove();
    }
    if (productDetailsTitle) productDetailsTitle.textContent = '';
    if (productDetailsDescription) {
        productDetailsDescription.innerHTML = '';
        productDetailsDescription.style.display = 'block';
    }
    if (separatorAfterDescription)
        separatorAfterDescription.style.display = 'block';

    if (productAddonsContainer && typeof removeAddonListeners === 'function') {
        removeAddonListeners(productAddonsContainer);
        console.log(
            '[SONDA ProductSheet reset] Listeners de addons removidos.'
        );
    }

    if (productAddonsContainer) productAddonsContainer.innerHTML = '';

    // --- INÍCIO DA MODIFICAÇÃO (Req 1, 2, 3) ---
    if (productDetailsPriceSpan) {
        productDetailsPriceSpan.innerHTML = formatPrice(0); // Limpa badge
        productDetailsPriceSpan.classList.remove('is-reward-price');
        productDetailsPriceSpan.classList.add('is-monetary-price');
    }
    // --- FIM DA MODIFICAÇÃO ---

    if (productDetailsOfferTitle)
        productDetailsOfferTitle.style.display = 'none';
    if (productDetailsOfferContent)
        productDetailsOfferContent.style.display = 'none';
    if (productDetailsOfferText) productDetailsOfferText.textContent = '';
    if (productDetailsOfferProductName)
        productDetailsOfferProductName.textContent = '';
    if (productDetailsOfferOriginalPrice)
        productDetailsOfferOriginalPrice.textContent = '';
    if (productDetailsOfferPromoPrice)
        productDetailsOfferPromoPrice.textContent = '';
    if (cancelOfferButton) cancelOfferButton.style.display = 'none';
    if (quantitySelector) quantitySelector.style.display = 'flex';
    if (productQuantityInput) productQuantityInput.value = 1;

    // State Cleanup
    productState.currentProduct = null;
    productState.currentProductBasePrice = 0;
    productState.currentProductQuantity = 1;
    productState.selectedAddons = {}; // **RESET**
    productState.editingCartItemKey = null;
    productState.isOfferItem = false;
    productState.originalPriceForOffer = 0;
    productState.isRewardItem = false;
    productState.rewardPointsCost = 0;
    productState.currentOfferId = null;
    console.log(
        '[SONDA ProductSheet resetProductDetailsSheet] Estado productState resetado, selectedAddons:',
        JSON.parse(JSON.stringify(productState.selectedAddons))
    );
}

// openProductDetails (inalterado)
export function openProductDetails(
    product,
    cartItem = null,
    cartItemKey = null,
    offerContext = null,
    rewardContext = null
) {
    console.log('[SONDA Ofertas FE] openProductDetails INICIADA.');
    console.log(
        '[SONDA Ofertas FE] Parâmetro product:',
        product ? JSON.parse(JSON.stringify(product)) : null
    );
    console.log(
        '[SONDA Ofertas FE] Parâmetro offerContext:',
        offerContext ? JSON.parse(JSON.stringify(offerContext)) : null
    );

    _initializeElements();
    if (!isInitialized) return;

    resetProductDetailsSheet(); // Reset UI, State AND LISTENERS FIRST
    productState.currentProduct = product;
    productState.isOfferItem = !!offerContext;
    productState.isRewardItem = !!rewardContext;

    // Lógica para definir preço base, quantidade, UI de oferta/recompensa
    if (offerContext) {
        console.log(
            '[SONDA Ofertas FE] Contexto de OFERTA detectado. Configurando UI da oferta.'
        );
        productState.currentOfferId = offerContext.offer_id;
        productState.originalPriceForOffer = offerContext.original_price;
        // DEFINE O PREÇO BASE COMO O PREÇO DA OFERTA
        productState.currentProductBasePrice = parseFloat(
            offerContext.promo_price
        );
        productState.currentProductQuantity = 1;
        if (productQuantityInput) productQuantityInput.value = 1;
        if (quantitySelector) quantitySelector.style.display = 'none';
        if (productDetailsOfferTitle)
            productDetailsOfferTitle.style.display = 'block';
        if (productDetailsOfferContent)
            productDetailsOfferContent.style.display = 'block';
        if (productDetailsOfferText)
            productDetailsOfferText.textContent = offerContext.offer_text;
        if (productDetailsOfferProductName)
            productDetailsOfferProductName.textContent = escapeHTML(
                product.name
            );
        if (productDetailsOfferOriginalPrice)
            productDetailsOfferOriginalPrice.textContent = `De ${formatPrice(offerContext.original_price)}`;
        if (productDetailsOfferPromoPrice)
            productDetailsOfferPromoPrice.textContent = `Por ${formatPrice(offerContext.promo_price)}`;
        if (cancelOfferButton) cancelOfferButton.style.display = 'flex';
        if (productDetailsDescription)
            productDetailsDescription.style.display = 'none';
        if (separatorAfterDescription)
            separatorAfterDescription.style.display = 'none';
    } else if (rewardContext) {
        productState.rewardPointsCost = rewardContext.points_cost;
        productState.currentProductBasePrice = 0; // Recompensa tem preço base zero
        productState.currentProductQuantity = 1;
        if (productQuantityInput) productQuantityInput.value = 1;
        if (quantitySelector) quantitySelector.style.display = 'flex';
        // Remove listeners antigos antes de adicionar novos para evitar duplicação
        quantityPlusButton?.removeEventListener(
            'click',
            preventQuantityIncrease,
            { capture: true }
        );
        quantityMinusButton?.removeEventListener(
            'click',
            preventQuantityDecrease,
            { capture: true }
        );
        // Adiciona os listeners
        quantityPlusButton?.addEventListener('click', preventQuantityIncrease, {
            capture: true,
        });
        quantityMinusButton?.addEventListener(
            'click',
            preventQuantityDecrease,
            { capture: true }
        );
    } else {
        // Define o preço base normal do produto
        productState.currentProductBasePrice = parseFloat(
            product.promo_price > 0 && product.promo_price < product.price
                ? product.promo_price
                : product.price
        );
        if (quantitySelector) quantitySelector.style.display = 'flex';
        // Remove listeners de recompensa
        quantityPlusButton?.removeEventListener(
            'click',
            preventQuantityIncrease,
            { capture: true }
        );
        quantityMinusButton?.removeEventListener(
            'click',
            preventQuantityDecrease,
            { capture: true }
        );
    }

    // Popula o state SE editando
    if (cartItem && cartItemKey) {
        productState.editingCartItemKey = cartItemKey;
        productState.currentProductQuantity = cartItem.quantity;
        // Cria uma cópia profunda para evitar problemas de referência
        productState.selectedAddons = JSON.parse(
            JSON.stringify(cartItem.selected_addons || {})
        );
        if (productQuantityInput)
            productQuantityInput.value = productState.currentProductQuantity;
        console.log(
            '[SONDA ProductSheet openProductDetails] Editando item. Estado carregado:',
            JSON.parse(JSON.stringify(productState.selectedAddons))
        );
    } else {
        console.log(
            '[SONDA ProductSheet openProductDetails] Abrindo novo. Estado limpo:',
            JSON.parse(JSON.stringify(productState.selectedAddons))
        );
    }

    // Renderiza UI
    if (productDetailsTitle) productDetailsTitle.textContent = product.name;
    if (productDetailsHeader) {
        const categorySlug = product.category_slug;
        const categoryData = window.nativaDeliveryData.categories.find(
            (c) => c.slug === categorySlug
        );
        if (categoryData && categoryData.image_url) {
            const img = document.createElement('img');
            img.src = categoryData.image_url;
            img.alt = `Imagem da categoria ${escapeHTML(product.category_name)}`;
            img.className = 'nativa-category-image';
            img.width = 80;
            img.height = 80;
            productDetailsHeader.prepend(img);
        }
    }
    if (!offerContext) {
        const descriptionContent = product.description
            ? escapeHTML(product.description.trim())
            : '';
        if (productDetailsDescription) {
            productDetailsDescription.innerHTML = descriptionContent || '';
            productDetailsDescription.style.display = descriptionContent
                ? 'block'
                : 'none';
        }
        if (separatorAfterDescription) {
            separatorAfterDescription.style.display = descriptionContent
                ? 'block'
                : 'none';
        }
    }

    // Cria contexto para addons, passando a referência ao estado LOCAL da ficha
    const productSheetContext = {
        state: productState.selectedAddons, // PASSA A REFERÊNCIA AO ESTADO LOCAL DA FICHA
        onUpdate: updateProductTotalPrice, // Callback para recalcular o preço DESTA ficha
        containerElement: productAddonsContainer,
        isCombo: false,
    };
    const adicionalGroups = product.adicional_groups || [];

    // Renderiza addons (e anexa listeners DENTRO desta função)
    renderProductAddons(
        adicionalGroups,
        productAddonsContainer,
        productSheetContext // Passa o contexto com o estado local e callback corretos
    );

    // Aplica sticky header (lógica inalterada)
    adicionalGroups.forEach((groupId) => {
        const groupData = window.nativaDeliveryData.adicionalGroups[groupId];
        if (groupData && groupData.tipo_grupo === 'sabor') {
            const groupElement = productAddonsContainer.querySelector(
                `.nativa-addon-group[data-group-id="${groupId}"]`
            );
            const headerElement = groupElement?.querySelector(
                '.nativa-addon-group-header'
            );
            if (headerElement) headerElement.classList.add('is-sticky-header');
        }
    });

    updateProductTotalPrice(); // Calcula preço inicial
    openSheet(productDetailsSheet); // Abre a ficha
}

// preventQuantityIncrease, preventQuantityDecrease (inalterado)
function preventQuantityIncrease(e) {
    if (productState.isRewardItem) {
        showToast('Você só pode resgatar uma unidade por vez.', 'info');
        e.stopImmediatePropagation();
    }
}
function preventQuantityDecrease(e) {
    if (productState.isRewardItem) {
        e.stopImmediatePropagation();
    }
}

// handleAddToCart (MODIFICADO - Garante cálculo de preço ANTES do evento e remove escrita no session Storage)
async function handleAddToCart() {
    const shouldProceedPWA = await checkPWAInstallAndProceed();
    if (!shouldProceedPWA) return;

    if (!state.selectedModality) {
        state.selectedModality =
            sessionStorage.getItem('nativaDeliverySelectedModality') || null;
        if (!state.selectedModality) {
            state.menu.afterModalityAction = 'add_to_cart_after_selection';
            state.menu.currentProduct = productState.currentProduct;
            handleModalitySheetDisplay();
            return;
        }
    }

    if (
        !validateAddonSelections(
            productState.currentProduct,
            productState.selectedAddons,
            productAddonsContainer
        )
    ) {
        return;
    }

    showSpinner(addToCartButton);
    console.log(
        '[SONDA ProductSheet handleAddToCart] Enviando para o backend. Estado de selectedAddons:',
        JSON.parse(JSON.stringify(productState.selectedAddons))
    );

    const addonsToSend = JSON.stringify(productState.selectedAddons);

    // --- INÍCIO DA MODIFICAÇÃO (Oferta Preço v2) ---
    // Calcula/Atualiza o preço final ANTES de construir os dados do evento
    const finalItemPrice = updateProductTotalPrice();
    // --- FIM DA MODIFICAÇÃO ---

    const cartItemData = {
        product_id: productState.currentProduct.id,
        quantity: productState.currentProductQuantity,
        selected_addons: addonsToSend,
        is_reward: productState.isRewardItem,
        is_offer_item: productState.isOfferItem,
        original_price: productState.isOfferItem
            ? productState.originalPriceForOffer
            : null,
        // Preço final não é mais enviado daqui para o backend
    };

    if (productState.editingCartItemKey) {
        cartItemData.cart_item_key = productState.editingCartItemKey;
    }

    try {
        const resultData = await addToCart(cartItemData);
        if (state.menu.lastClickedCardElement) {
            flyToCart(state.menu.lastClickedCardElement);
        }

        // Usa o preço final JÁ calculado
        const finalItemPriceForEvent = finalItemPrice;

        const selectedAddonsForEvent = {};
        for (const groupId in productState.selectedAddons) {
            if (
                Object.hasOwnProperty.call(
                    productState.selectedAddons,
                    groupId
                ) &&
                productState.selectedAddons[groupId]?.items &&
                Object.keys(productState.selectedAddons[groupId].items).length >
                    0
            ) {
                selectedAddonsForEvent[groupId] =
                    productState.selectedAddons[groupId];
            }
        }

        const newlyAddedItemData = {
            base_product_id: productState.currentProduct.id,
            name: productState.currentProduct.name,
            quantity: productState.currentProductQuantity,
            addons:
                Object.keys(selectedAddonsForEvent).length > 0
                    ? selectedAddonsForEvent
                    : null,
            is_reward: productState.isRewardItem,
            is_offer_item: productState.isOfferItem,
            total_item_price: finalItemPriceForEvent, // Preço correto aqui
            original_price: productState.isOfferItem
                ? productState.originalPriceForOffer
                : null,
        };

        const eventDetail = {
            ...resultData, // Contém o estado atualizado do carrinho vindo do backend
            showSuccessToast: true,
            toastMessage: productState.editingCartItemKey
                ? 'Item atualizado!'
                : productState.isRewardItem
                  ? 'Recompensa adicionada!'
                  : productState.isOfferItem
                    ? 'Oferta adicionada!'
                    : 'Item adicionado!',
            newly_added_item_data: newlyAddedItemData, // Inclui dados do item adicionado
        };
        document.dispatchEvent(
            new CustomEvent('nativa:cartUpdated', { detail: eventDetail })
        );

        // --- INÍCIO DA MODIFICAÇÃO (Oferta Repetida) ---
        // Remove a escrita no sessionStorage ao adicionar item de oferta
        // if (productState.isOfferItem && productState.currentOfferId) {
        //     sessionStorage.setItem(
        //         'nativaOfferActioned',
        //         `seen_${productState.currentOfferId}`
        //     );
        //     console.log(
        //         `[Product Sheet] Oferta ${productState.currentOfferId} marcada como vista via botão 'Quero'.`
        //     );
        // }
        if (productState.isOfferItem) {
            console.log(
                '[Product Sheet] Item de oferta adicionado ao carrinho.'
            ); // Log adicionado
        }
        // --- FIM DA MODIFICAÇÃO ---
        setTimeout(() => {
            closeAllSheets();
        }, 800);
    } catch (error) {
        console.error('Erro ao adicionar/atualizar item:', error);
        showToast(error.message, 'error');
    } finally {
        setTimeout(() => hideSpinner(addToCartButton), 200);
    }
}

// Listener modalityChanged (inalterado)
document.addEventListener('nativa:modalityChanged', () => {
    if (state.menu.afterModalityAction === 'add_to_cart_after_selection') {
        state.menu.afterModalityAction = null;
        if (productState.currentProduct) {
            handleAddToCart();
        } else {
            console.warn(
                'Modality changed, but no current product found in productState to add.'
            );
        }
    }
});
