// assets/src/js/shared/features/cart/cart-ui.js

/**
 * Responsável pela renderização HTML e atualizações visuais do Carrinho.
 * LOCALIZAÇÃO: Shared (Compartilhado entre Consumer e PDV).
 */

import { state } from '@core/state/global-state.js';
import { formatPrice } from '@utils/formatters.js';
import { escapeHTML } from '@utils/ui-helpers.js';

// Funções privadas para renderização de componentes internos do carrinho
const _renderCartItemPrice = (item) => {
    if (item.is_offer_item && item.original_price > 0) {
        return `
            <div class="nativa-cart-item-price is-offer">
                <span class="original-price">${formatPrice(item.original_price)}</span>
                <span class="promo-price">${formatPrice(item.total_item_price)}</span>
            </div>`;
    }
    return `<div class="nativa-cart-item-price">${formatPrice(item.total_item_price)}</div>`;
};

const _renderAddonListItems = (addons) => {
    const addonsList = [];
    if (!addons || typeof addons !== 'object') {
        return addonsList;
    }

    for (const groupId in addons) {
        if (
            addons[groupId]?.items &&
            typeof addons[groupId].items === 'object'
        ) {
            for (const addonItemIndex in addons[groupId].items) {
                const addon = addons[groupId].items[addonItemIndex];

                if (addon && typeof addon === 'object' && addon.itemName) {
                    const quantityPrefix =
                        addon.itemQuantity > 1
                            ? `${addon.itemQuantity} × `
                            : '';
                    const addonPrice = addon.final_cost ?? addon.itemPrice;
                    const addonPriceText =
                        addonPrice > 0
                            ? ` <span class="addon-price-in-cart">(+${formatPrice(addonPrice)})</span>`
                            : '';
                    addonsList.push(
                        `<li>${escapeHTML(quantityPrefix)}${escapeHTML(addon.itemName)}${addonPriceText}</li>`
                    );
                } else {
                    console.warn(
                        `[Cart UI _renderAddonListItems] Item de addon inválido encontrado no grupo ${groupId}, índice ${addonItemIndex}:`,
                        addon
                    );
                }
            }
        } else {
            console.warn(
                `[Cart UI _renderAddonListItems] Estrutura inválida para o grupo de adicionais ${groupId}:`,
                addons[groupId]
            );
        }
    }
    return addonsList;
};

const _renderCartItemDetails = (item) => {
    if (item.is_combo && Array.isArray(item.selections)) {
        const selectionsHtml = item.selections
            .map((selection) => {
                const addonItems = _renderAddonListItems(
                    selection.selectedAddons || {}
                );
                const addonsHtml =
                    addonItems.length > 0
                        ? `<ul class="nativa-cart-combo-selection-addons">${addonItems.join('')}</ul>`
                        : '';
                return `<li class="combo-selection-item"><strong>${escapeHTML(selection.productName)}</strong>${addonsHtml}</li>`;
            })
            .join('');
        return `<ul class="nativa-cart-combo-selections">${selectionsHtml}</ul>`;
    }

    if (item.selected_addons && Object.keys(item.selected_addons).length > 0) {
        const addonItems = _renderAddonListItems(item.selected_addons);
        return addonItems.length > 0
            ? `<ul class="nativa-cart-details-list">${addonItems.join('')}</ul>`
            : '';
    }

    return '';
};

const _renderCartItemActions = (key, item, isCheckout) => {
    if (isCheckout) return '';

    const editButton =
        !item.is_offer_item && !item.is_reward
            ? `<button class="nativa-cart-item-edit-button" data-cart-item-key="${key}" title="Editar item"><span class="material-symbols-rounded">edit</span></button>`
            : '';

    return `
        <div class="nativa-cart-item-actions">
            ${editButton}
            <button class="nativa-cart-item-remove-button" data-key="${key}" title="Remover item"><span class="material-symbols-rounded">delete</span></button>
        </div>
    `;
};

const _renderCartItems = (cartContents) => {
    const container = document.getElementById('nativa-cart-items');
    if (!container) return;

    container.innerHTML = '';

    const checkoutButton = document.getElementById('nativa-checkout-button');
    const cartKeys = Object.keys(cartContents);

    if (cartKeys.length === 0) {
        container.innerHTML = `
            <div class="nativa-empty-cart-container">
                <span class="material-symbols-rounded">shopping_cart_off</span>
                <h3>Seu carrinho está vazio</h3>
                <p>Adicione produtos do nosso cardápio para começar.</p>
                <button id="go-to-menu-from-cart" class="nativa-button-primary">
                    <span class="material-symbols-rounded">restaurant_menu</span>
                    <span class="cta-text">Ver cardápio</span>
                </button>
            </div>`;
        if (checkoutButton) {
            checkoutButton.disabled = true;
            checkoutButton.classList.add('is-unavailable');
        }
        return;
    }

    if (checkoutButton) {
        checkoutButton.disabled = false;
        checkoutButton.classList.remove('is-unavailable');
    }

    for (const key of cartKeys) {
        const itemData = cartContents[key];
        if (itemData && typeof itemData === 'object') {
            const newItemHTML = renderCartItemHTML(itemData, key, false);
            container.innerHTML += newItemHTML;
        } else {
            console.warn(
                `[Cart UI _renderCartItems] Dados inválidos para o item com chave ${key}:`,
                itemData
            );
        }
    }
};

const _renderUserAddress = (addresses) => {
    const container = document.getElementById(
        'nativa-cart-user-address-container'
    );
    if (!container) return;

    let addressToDisplay = null;
    const cartSelectedAddressId = sessionStorage.getItem(
        'nativaCartSelectedAddressId'
    );

    if (cartSelectedAddressId && addresses.length > 0) {
        addressToDisplay = addresses.find(
            (addr) => addr.id === cartSelectedAddressId
        );
    }

    if (!addressToDisplay && addresses.length > 0) {
        addressToDisplay =
            addresses.find((addr) => addr.is_primary) || addresses[0];
        if (addressToDisplay) {
            sessionStorage.setItem(
                'nativaCartSelectedAddressId',
                addressToDisplay.id
            );
        }
    }

    if (addressToDisplay) {
        state.selectedBairro = state.allBairros.find(
            (b) => b.id == addressToDisplay.bairro_id
        );
    } else {
        state.selectedBairro = null;
    }

    if (addressToDisplay) {
        container.innerHTML = `
            <div class="address-pills-container">
                ${addresses
                    .map((address) => {
                        const isActive = address.id === addressToDisplay.id;
                        const isBairroAvailable = state.allBairros.some(
                            (b) => b.id == address.bairro_id
                        );
                        const isDisabledClass = !isBairroAvailable
                            ? 'is-disabled'
                            : '';
                        const title = !isBairroAvailable
                            ? 'Endereço em bairro não atendido no momento'
                            : '';
                        return `<button type="button" class="address-pill ${isActive ? 'is-active' : ''} ${isDisabledClass}" data-address-id="${address.id}" ${!isBairroAvailable ? 'disabled' : ''} title="${title}">${escapeHTML(address.apelido)}</button>`;
                    })
                    .join('')}
                <button type="button" class="address-pill add-new" id="cart-add-new-address-btn-pill">
                    <span class="material-symbols-rounded">add</span>
                </button>
            </div>
            <div id="nativa-frete-gratis-message"></div>
        `;
    } else {
        container.innerHTML = `
            <div id="nativa-cart-primary-address-card">
                <p>Nenhum endereço cadastrado.</p>
                <button id="nativa-cart-add-address-btn" class="nativa-button-primary">Cadastrar Endereço</button>
            </div>
            <div id="nativa-frete-gratis-message"></div>
        `;
    }
};

export const renderAddressSelectionSheet = (
    addresses,
    bairros,
    selectedAddressId
) => {
    const sheet = document.getElementById('nativa-address-selection-sheet');
    const container = document.getElementById('nativa-address-selection-list');
    if (!sheet || !container) return;

    if (!addresses || addresses.length === 0) {
        container.innerHTML = '<p>Nenhum endereço cadastrado.</p>';
    } else {
        container.innerHTML = addresses
            .map((address) => {
                const bairro = bairros.find((b) => b.id == address.bairro_id);
                const isChecked =
                    address.id == selectedAddressId ? 'checked' : '';
                const isSelectedClass =
                    address.id == selectedAddressId ? 'is-selected' : '';
                const isPrimary = address.is_primary;

                const bairroName = bairro
                    ? escapeHTML(bairro.nome)
                    : 'Bairro não encontrado';

                const streetName = escapeHTML(address.street || '');
                const addressApelido = escapeHTML(address.apelido);
                const addressNumber = escapeHTML(address.number);
                const complementHtml = address.complement
                    ? `<p class="checkout-address-card-complement">${escapeHTML(address.complement)}</p>`
                    : '';

                return `
                <label class="checkout-address-card ${isSelectedClass}" for="cart-address-${address.id}">
                    <input type="radio" name="cart-selected-address" id="cart-address-${address.id}" value="${address.id}" ${isChecked}>
                    <div class="checkout-address-card-header">
                        <strong class="checkout-address-card-title">${addressApelido}</strong>
                        ${isPrimary ? '<span class="checkout-address-card-primary-tag">Principal</span>' : ''}
                    </div>
                    <p class="checkout-address-card-info">${streetName}, ${addressNumber} - ${bairroName}</p>
                    ${complementHtml}
                </label>
            `;
            })
            .join('');
    }
};

export const renderCartItemHTML = (item, key, isCheckout = false) => {
    const priceHtml = _renderCartItemPrice(item);
    const detailsHtml = _renderCartItemDetails(item);
    const actionsHtml = _renderCartItemActions(key, item, isCheckout);

    let itemTag = '';
    if (item.is_reward) {
        itemTag = `<span class="nativa-reward-item-tag" title="Item de resgate"><span class="material-symbols-rounded">diamond</span></span>`;
    } else if (item.is_offer_item) {
        itemTag = `<span class="nativa-offer-item-tag" title="Item de oferta"><span class="material-symbols-rounded">featured_seasonal_and_gifts</span></span>`;
    }

    const itemClass = `nativa-cart-item ${item.is_reward ? 'is-reward-item' : ''}`;
    const hasDetails = detailsHtml.trim() !== '';

    return `
        <div class="${itemClass}" data-key="${key}">
            <div class="nativa-cart-item-text">
                <div class="nativa-cart-item-main-row">
                    <div class="nativa-cart-item-name">${item.quantity} × ${escapeHTML(item.product_name || item.name)} ${itemTag}</div>
                    ${priceHtml}
                </div>
                ${hasDetails ? `<div class="nativa-cart-item-details-row">${detailsHtml}</div>` : ''}
            </div>
            ${actionsHtml}
        </div>
    `;
};

export const renderCartUI = (cartData) => {
    _renderCartItems(cartData.cart_contents);
};

export const updateFinancialSummary = ({
    subtotal,
    deliveryFee,
    finalTotal,
    modality,
}) => {
    const subtotalEl = document.getElementById('nativa-cart-subtotal');
    const deliveryFeeEl = document.getElementById('nativa-cart-delivery-fee');
    const deliveryFeeLineEl = document.getElementById('cart-delivery-fee-line');
    const finalTotalEl = document.getElementById('nativa-cart-final-total');

    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (deliveryFeeEl) deliveryFeeEl.textContent = formatPrice(deliveryFee);
    if (deliveryFeeLineEl)
        deliveryFeeLineEl.style.display =
            modality === 'delivery' ? 'flex' : 'none';
    if (finalTotalEl) finalTotalEl.textContent = formatPrice(finalTotal);
};

export const updateFreteGratisMessage = (
    subtotal,
    selectedBairro,
    modality
) => {
    const messageEl = document.getElementById('nativa-frete-gratis-message');
    if (!messageEl) return;

    const parentContainer = messageEl.closest(
        '#nativa-cart-user-address-container, #nativa-cart-guest-bairro-container'
    );

    messageEl.style.display = 'none';
    messageEl.innerHTML = '';
    if (parentContainer) {
        parentContainer.classList.remove('has-frete-gratis-message');
    }

    if (
        modality === 'delivery' &&
        subtotal > 0 &&
        selectedBairro &&
        selectedBairro.valor_minimo_frete_gratis > 0
    ) {
        const minValue = selectedBairro.valor_minimo_frete_gratis;
        const remaining = minValue - subtotal;
        const progressPercentage = Math.min((subtotal / minValue) * 100, 100);

        let messageText = '';
        let isAchieved = false;

        if (remaining > 0) {
            messageText = `Faltam <strong>${formatPrice(remaining)}</strong> para seu frete sair grátis`;
        } else {
            messageText = 'Parabéns! Você ganhou <strong>frete grátis</strong>';
            isAchieved = true;
        }

        messageEl.innerHTML = `
            <div class="nativa-frete-gratis-container ${isAchieved ? 'is-achieved' : ''}">
                <div class="frete-gratis-progress-bar">
                    <div class="progress" style="width: ${progressPercentage}%;"></div>
                </div>
                <div class="frete-gratis-content">
                    <span class="material-symbols-rounded frete-icon">local_shipping</span>
                    <div class="frete-gratis-text">
                        ${messageText}
                    </div>
                </div>
            </div>
        `;
        messageEl.style.display = 'block';
        if (parentContainer) {
            parentContainer.classList.add('has-frete-gratis-message');
        }
    }
};

export const populateBairrosSelect = (bairros, selectedId = null) => {
    const container = document.getElementById(
        'nativa-cart-guest-bairro-container'
    );
    if (!container) return;

    container.innerHTML = '';

    if (bairros && bairros.length > 0) {
        const pillsContainer = document.createElement('div');
        pillsContainer.className = 'bairro-pills-container';

        const pillsHtml = bairros
            .map((bairro) => {
                const isActive = bairro.id == selectedId;
                const isAvailable = true;
                const isDisabledClass = !isAvailable ? 'is-disabled' : '';
                const title = !isAvailable
                    ? 'Entrega indisponível para este bairro no momento'
                    : '';
                return `<button type="button" class="bairro-pill ${isActive ? 'is-active' : ''} ${isDisabledClass}" data-bairro-id="${bairro.id}" ${!isAvailable ? 'disabled' : ''} title="${title}">${escapeHTML(bairro.nome)}</button>`;
            })
            .join('');

        pillsContainer.innerHTML = pillsHtml;
        container.appendChild(pillsContainer);

        const freteMessageDiv = document.createElement('div');
        freteMessageDiv.id = 'nativa-frete-gratis-message';
        container.appendChild(freteMessageDiv);
    } else {
        container.innerHTML = '<p>Nenhum bairro de entrega disponível.</p>';
    }
};

export const updateModalityDisplay = (
    selectedModality,
    canCheckout,
    addresses = [],
    bairros = []
) => {
    const serviceStatus = window.nativaDeliveryData.serviceStatus || {};
    const waitTimes = window.nativaDeliveryData.waitTimes || {};
    let isDeliveryAvailable = false;

    document
        .querySelectorAll('.nativa-modality-options-cart .nativa-order-button')
        .forEach((btn) => {
            const modality = btn.dataset.modality;
            const isServiceAvailable = serviceStatus[modality] === true;

            btn.classList.toggle(
                'active',
                btn.dataset.modality === selectedModality
            );

            btn.disabled = !isServiceAvailable || !canCheckout;
            btn.classList.toggle('is-unavailable', !isServiceAvailable);

            if (modality === 'delivery') {
                isDeliveryAvailable = isServiceAvailable;
            }

            let waitTimeEl = btn.querySelector('.modality-wait-time');
            if (!waitTimeEl) {
                waitTimeEl = document.createElement('span');
                waitTimeEl.className = 'modality-wait-time';
                btn.appendChild(waitTimeEl);
            }
            waitTimeEl.textContent = waitTimes[modality] || '-- min';
        });

    const isLoggedIn = state.user.isLoggedIn;
    const guestContainer = document.getElementById(
        'nativa-cart-guest-bairro-container'
    );
    const userAddressContainer = document.getElementById(
        'nativa-cart-user-address-container'
    );
    const addressPillsContainer = userAddressContainer?.querySelector(
        '.address-pills-container'
    );
    const guestPillsContainer = guestContainer?.querySelector(
        '.bairro-pills-container'
    );

    if (selectedModality === 'delivery') {
        if (isLoggedIn) {
            if (guestContainer) guestContainer.style.display = 'none';
            if (userAddressContainer) {
                userAddressContainer.style.display = 'block';
                _renderUserAddress(addresses);
                updateFreteGratisMessage(
                    state.cart.subtotal,
                    state.selectedBairro,
                    selectedModality
                );
                if (addressPillsContainer) {
                    addressPillsContainer.classList.toggle(
                        'is-disabled',
                        !isDeliveryAvailable || !canCheckout
                    );
                }
            }
        } else {
            if (userAddressContainer)
                userAddressContainer.style.display = 'none';
            if (guestContainer) {
                guestContainer.style.display = 'block';
                const persistedBairroId = sessionStorage.getItem(
                    'nativaDeliverySelectedBairroId'
                );
                populateBairrosSelect(
                    bairros,
                    state.selectedBairro?.id || persistedBairroId
                );
                updateFreteGratisMessage(
                    state.cart.subtotal,
                    state.selectedBairro,
                    selectedModality
                );
                if (guestPillsContainer) {
                    guestPillsContainer.classList.toggle(
                        'is-disabled',
                        !isDeliveryAvailable || !canCheckout
                    );
                }
            }
        }
    } else {
        if (guestContainer) guestContainer.style.display = 'none';
        if (userAddressContainer) userAddressContainer.style.display = 'none';
    }

    const checkoutButton = document.getElementById('nativa-checkout-button');
    if (checkoutButton) checkoutButton.disabled = !canCheckout;
};

export const updateCartDisplay = (count, total) => {
    const cartCountBadge = document.getElementById('nativa-cart-count');
    const cartTotalLabel = document.getElementById('nativa-cart-total');

    if (cartCountBadge) {
        cartCountBadge.textContent = count;
        cartCountBadge.classList.toggle('is-hidden', !(count > 0));
    }
    if (cartTotalLabel) {
        cartTotalLabel.textContent = formatPrice(total);
    }
};
