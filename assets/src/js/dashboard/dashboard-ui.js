// js/dashboard/dashboard-ui.js
/**
 * NOVO ARQUIVO: Módulo responsável por todas as manipulações do DOM no dashboard.
 * ... (histórico de versões anterior) ...
 * ATUALIZAÇÃO (UI v6): Adiciona coluna de Modalidade na tabela principal e reorganiza colunas do tooltip, fixando largura da coluna de ações.
 * ATUALIZAÇÃO (UI v7): Move o ícone de modalidade da tabela principal para a coluna "Pedido" e corrige layout do tooltip.
 * ATUALIZAÇÃO (UI v8): Transforma coluna de localização em botão, ajusta larguras das colunas do tooltip.
 * REFINAMENTO (Status Pagamento): Reverte a exibição do status de pagamento para usar emojis (🟡/🟢) apenas para Pix Sicredi na coluna "Pagamento". Remove a coluna/indicador "Status Pag.".
 * REFINAMENTO (Sabores Tooltip): Altera a exibição de adicionais do tipo 'sabor' no tooltip para serem listados na mesma linha, separados por vírgula.
 * REATORAÇÃO (Fase 3 Pagamentos): Remove o 'paymentMethodMap' estático.
 * As funções 'createTooltipContent' e 'renderOrdersTable' agora leem 'state.allPaymentMethods'
 * para exibir dinamicamente o nome do método de pagamento (CPT ou legado).
 * CORREÇÃO (Endereço): Usa formatAddress para corrigir '+' no lugar de espaços nos endereços.
 * ATUALIZAÇÃO (Impressão): Adiciona botões de impressão (Cozinha/Geral) ao tooltip de ações.
 */

import { state } from './dashboard-state.js';
import { showToast, escapeHTML } from '../utils/nativa-ui-helpers.js';
import { formatPrice, formatAddress } from '../utils/nativa-utils.js'; // <-- Import atualizado
// Importa showModal para o popup do mapa
import { showModal } from '../utils/modal.js';

let timeAgoInterval = null;
const BATCH_SIZE = 20; // Mantido para consistência com load-more, embora não usado diretamente aqui

// Mapeamento das modalidades
const modalityMap = {
    delivery: { name: 'Entrega', icon: 'local_shipping' },
    pickup: { name: 'Retirada', icon: 'storefront' },
    table: { name: 'Na Mesa', icon: 'restaurant_menu' },
};

// Função para formatar telefone (sem alterações)
function _formatPhone(phoneString) {
    if (typeof phoneString !== 'string' || !phoneString) {
        return '';
    }
    const cleaned = phoneString.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    }
    if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    }
    return phoneString;
}

// Função para formatar tempo (sem alterações)
function _formatTimeAgo(timestamp) {
    const now = new Date();
    const orderDate = new Date(timestamp * 1000);
    const seconds = Math.floor((now - orderDate) / 1000);
    const days = Math.floor(seconds / 86400);

    const timeFormat = { hour: '2-digit', minute: '2-digit' };
    const timeString = orderDate
        .toLocaleTimeString('pt-BR', timeFormat)
        .replace(':', 'h');

    if (days === 0 && now.getDate() === orderDate.getDate()) {
        const minutes = Math.floor(seconds / 60);
        if (minutes < 1) return 'Agora';
        if (minutes < 60) return `Há ${minutes} min`;
        const hours = Math.floor(minutes / 60);
        return `Há ${hours}h ${minutes % 60}min`;
    }

    if (days < 7) {
        const dayOfWeek = orderDate.toLocaleDateString('pt-BR', {
            weekday: 'long',
        });
        const capitalizedDay =
            dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
        return `${capitalizedDay}, ${timeString}`;
    }

    const dateFormat = { day: '2-digit', month: '2-digit', year: '2-digit' };
    const dateString = orderDate.toLocaleDateString('pt-BR', dateFormat);
    return `${dateString} ${timeString}`;
}

// Função para atualizar o tempo (sem alterações)
function _startTimeAgoUpdater() {
    if (timeAgoInterval) clearInterval(timeAgoInterval);
    timeAgoInterval = setInterval(() => {
        document.querySelectorAll('.order-time-ago').forEach((span) => {
            const timestamp = parseInt(span.dataset.timestamp, 10);
            if (timestamp) span.textContent = _formatTimeAgo(timestamp);
        });
    }, 60000);
}

// Função para mostrar modal do mapa (CORRIGIDA)
function _showMapModal(event) {
    const button = event.target.closest('.show-map-button');
    if (!button) return;

    const lat = button.dataset.lat;
    const lng = button.dataset.lng;
    const addressString = button.dataset.address;
    const apiKey = window.nativaDeliveryData?.google_maps_api_key || '';
    const hasCoords = lat && lng;
    const hasAddress = addressString && addressString !== 'null';
    let modalContent = '';

    const hasApiKey = !!apiKey;

    if (hasCoords && hasApiKey) {
        try {
            const mapQuery = `${lat},${lng}`;
            const encodedQuery = encodeURIComponent(mapQuery);
            // URL HTTPS padrão
            const mapUrl = `https://www.google.com/maps/embed/v1/place?key=${apiKey}&q=${encodedQuery}`;
            modalContent = `
                <div class="map-container" style="height: 300px; margin-bottom: 16px;">
                    <iframe width="100%" height="100%" style="border:0" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="${mapUrl}"></iframe>
                </div>
                ${hasAddress ? `<p style="text-align: center; font-size: 0.9em; color: var(--md-sys-color-outline);">${escapeHTML(addressString)}</p>` : ''}
            `;
        } catch (e) {
            console.error('Erro ao construir URL do mapa com coordenadas:', e);
            const searchLink = hasAddress
                ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}`
                : '#';
            modalContent = `
                <div class="map-placeholder" style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 0;">
                    <span class="material-symbols-rounded" style="font-size: 32px; color: var(--md-sys-color-error);">wrong_location</span>
                    <span>Erro ao carregar mapa.</span>
                     ${hasAddress ? `<p style="text-align: center; font-size: 0.9em; margin-bottom: 8px;">${escapeHTML(addressString)}</p><a href="${searchLink}" target="_blank" class="nativa-button-secondary is-small"><span class="material-symbols-rounded">search</span> Pesquisar no Google Maps</a>` : ''}
                </div>
            `;
        }
    } else {
        const searchLink = hasAddress
            ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressString)}`
            : '#';
        modalContent = `
            <div class="map-placeholder" style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 0;">
                <span class="material-symbols-rounded" style="font-size: 32px; color: var(--md-sys-color-outline);">location_off</span>
                <span>${hasApiKey ? 'Localização não compartilhada.' : 'API Key do mapa não configurada.'}</span>
                ${hasAddress ? `<p style="text-align: center; font-size: 0.9em; margin-bottom: 8px;">${escapeHTML(addressString)}</p><a href="${searchLink}" target="_blank" class="nativa-button-secondary is-small"><span class="material-symbols-rounded">search</span> Pesquisar no Google Maps</a>` : '<p style="text-align: center; font-size: 0.9em;">Endereço não disponível.</p>'}
            </div>
        `;
        if (!apiKey) {
            console.warn('API Key do Google Maps não configurada.');
        }
    }

    showModal({
        title: 'Localização da Entrega',
        message: modalContent,
        confirmText: 'Fechar',
        cancelText: null,
    });
}

// Cria o conteúdo do Tooltip
export const createTooltipContent = (order) => {
    const globalData = window.nativaDeliveryData || {};
    const details = order?.details || {};
    const customer_name = order?.customer_name || 'Cliente';
    const customer_dob = order?.customer_dob;

    const customerFullName = details.pedido_nome_cliente || customer_name;
    const customerCpf = details.pedido_cpf_cliente || 'Não informado';

    const rawPhone = (details.pedido_whatsapp_cliente || '').replace(/\D/g, '');
    const formattedPhone = _formatPhone(rawPhone) || 'Não informado';

    // Dados do Cliente
    const customerDataHtml = `
        <div class="tooltip-data-item"><span class="label">Nome</span><span class="value copyable-value" data-copy-text="${escapeHTML(customerFullName)}" title="Clique para copiar">${escapeHTML(customerFullName)}</span></div>
        <div class="tooltip-data-item"><span class="label">CPF</span><span class="value copyable-value" data-copy-text="${escapeHTML(customerCpf)}" title="Clique para copiar">${escapeHTML(customerCpf)}</span></div>
        <div class="tooltip-data-item"><span class="label">WhatsApp</span><span class="value copyable-value" data-copy-text="${rawPhone}" title="Clique para copiar">${escapeHTML(formattedPhone)}</span></div>
        <div class="tooltip-data-item"><span class="label">Nascimento</span><span class="value">${escapeHTML(customer_dob || 'Não informado')}</span></div>
    `;

    // 1. Pega o slug salvo no pedido
    let paymentMethodSlug = details.pedido_metodo_pagamento || 'N/A';

    // 2. Lógica de fallback para PIX falhado
    if (
        paymentMethodSlug === 'pix-sicredi' &&
        order.payment_status === 'failed_generation'
    ) {
        paymentMethodSlug = 'pix-fallback';
    }

    // 3. Busca o nome no mapa de pagamentos do ESTADO (state)
    let paymentMethodLabel =
        state.allPaymentMethods[paymentMethodSlug] || paymentMethodSlug;

    // 4. Lógica de emoji (MODIFICADA para incluir 🔴)
    // 1.1. Tenta encontrar a categoria do CPT
    const paymentMethodObject = state.allPaymentMethodsData.find(
        (m) => m.slug === paymentMethodSlug
    );
    const paymentCategory = paymentMethodObject
        ? paymentMethodObject.categoria
        : null;

    // A lógica de emoji agora verifica o payment_status
    if (
        details.pedido_metodo_pagamento === 'pix-sicredi' || // Slug legado
        paymentCategory === 'pix_automatico' // Ou Categoria CPT
    ) {
        if (order.payment_status === 'paid') {
            paymentMethodLabel += ' 🟢';
        } else if (order.payment_status === 'expired') {
            paymentMethodLabel += ' 🔴';
        } else if (
            order.payment_status === 'awaiting_api' ||
            order.payment_status === 'manual_pending' ||
            order.payment_status === 'pending' ||
            order.payment_status === 'failed_generation'
        ) {
            paymentMethodLabel += ' 🟡';
        }
    }

    // ID do Pedido
    const orderIdHtml = `
        <div class="order-id-header">
            <h4>Pedido #${order.id}</h4>
        </div>
    `;

    // Modalidade
    const modalityInfo = modalityMap[details.pedido_tipo_servico] || {
        name: details.pedido_tipo_servico,
        icon: 'help',
    };

    // Lógica de Troco
    const paymentMethodObject_TrocoCheck = state.allPaymentMethodsData.find(
        (m) => m.slug === paymentMethodSlug
    );
    const requiresChange =
        paymentMethodSlug === 'dinheiro' ||
        (paymentMethodObject_TrocoCheck &&
            paymentMethodObject_TrocoCheck.exige_troco);

    let trocoHtml = '';

    if (requiresChange) {
        const trocoPara = parseFloat(details.pedido_troco_para || 0);
        // Precisamos do total numérico, não formatado
        const totalFinalStr = (order.total || 'R$ 0,00')
            .replace('R$ ', '')
            .replace('.', '')
            .replace(',', '.');
        const totalFinal = parseFloat(totalFinalStr);

        if (trocoPara > 0 && trocoPara >= totalFinal) {
            const trocoParaFormatado = formatPrice(trocoPara);
            const valorALevar = trocoPara - totalFinal;
            const levarFormatado = formatPrice(valorALevar);

            trocoHtml = `
                <div class="tooltip-data-item">
                    <span class="label">Troco para</span>
                    <span class="value">${trocoParaFormatado}</span>
                </div>
                <div class="tooltip-data-item">
                    <span class="label">Levar</span>
                    <span class="value is-highlight">${levarFormatado}</span>
                </div>
            `;
        } else {
            trocoHtml = `
                <div class="tooltip-data-item">
                    <span class="label">Troco</span>
                    <span class="value">Sem troco</span>
                </div>
            `;
        }
    }

    // Dados do Pedido (Modalidade e Pagamento)
    let orderDataItems = `
        <div class="tooltip-data-item"><span class="label">Modalidade</span><span class="value"><span class="material-symbols-rounded modality-icon-tooltip">${modalityInfo.icon}</span>${escapeHTML(modalityInfo.name)}</span></div>
        <div class="tooltip-data-item">
            <span class="label">Método Pag.</span>
            <span class="value">${escapeHTML(paymentMethodLabel)}</span>
        </div>
        ${trocoHtml}
    `;

    // Lógica do Endereço (COM CORREÇÃO DE FORMATO)
    let mapButtonHtml = '';
    const isDelivery = details.pedido_tipo_servico === 'delivery';

    if (isDelivery) {
        const addressGroup = details.pedido_endereco || {};
        // Aplica formatAddress para limpar '+' e decodificar URI
        const rua = formatAddress(addressGroup.pedido_rua || '');
        const numero = formatAddress(addressGroup.pedido_numero || '');
        const complemento = formatAddress(
            addressGroup.pedido_complemento || ''
        );
        const bairro = formatAddress(addressGroup.pedido_bairro || '');
        const cep = globalData.cep_cidade || '';
        const lat = addressGroup.pedido_latitude;
        const lng = addressGroup.pedido_longitude;
        const hasAddress = rua && numero && bairro;
        const fullAddressString = hasAddress
            ? `${rua}, ${numero} - ${bairro}, Balneário Barra do Sul - SC`
            : null;

        orderDataItems += `
            <div class="tooltip-data-item"><span class="label">Logradouro</span><span class="value copyable-value" data-copy-text="${escapeHTML(rua)}" title="Clique para copiar">${escapeHTML(rua)}</span></div>
            <div class="tooltip-data-item"><span class="label">Número</span><span class="value copyable-value" data-copy-text="${escapeHTML(numero)}" title="Clique para copiar">${escapeHTML(numero)}</span></div>
            <div class="tooltip-data-item"><span class="label">Bairro</span><span class="value copyable-value" data-copy-text="${escapeHTML(bairro)}" title="Clique para copiar">${escapeHTML(bairro)}</span></div>
        `;
        if (complemento) {
            orderDataItems += `<div class="tooltip-data-item"><span class="label">Complemento</span><span class="value copyable-value" data-copy-text="${escapeHTML(complemento)}" title="Clique para copiar">${escapeHTML(complemento)}</span></div>`;
        }
        orderDataItems += `<div class="tooltip-data-item"><span class="label">CEP</span><span class="value copyable-value" data-copy-text="${escapeHTML(cep)}" title="Clique para copiar">${escapeHTML(cep)}</span></div>`;

        // O botão é criado aqui
        mapButtonHtml = `
            <button class="order-actions-button show-map-button"
                    data-lat="${lat || ''}"
                    data-lng="${lng || ''}"
                    data-address="${escapeHTML(fullAddressString || '')}">
                <span class="material-symbols-rounded">map</span>
            </button>
        `;
    }

    const orderDataHtml = `<div class="order-data-grid">${orderDataItems}</div>`;

    // Itens do Pedido (com formatação de sabores ajustada)
    let itemsHtml =
        '<tr><td colspan="2">Erro ao processar itens do pedido.</td></tr>';
    let totalItems = 0;
    try {
        const itemsJson =
            details && typeof details.pedido_itens_json === 'string'
                ? details.pedido_itens_json
                : '{}';
        const items = JSON.parse(itemsJson);

        if (
            items &&
            typeof items === 'object' &&
            Object.keys(items).length > 0
        ) {
            itemsHtml = Object.values(items)
                .map((item) => {
                    if (!item || typeof item !== 'object') return '';

                    totalItems += parseInt(item.quantity, 10) || 0;
                    let itemTag = '';
                    if (item.is_reward) {
                        itemTag = `<span class="item-tag is-reward" title="Resgate de Fidelidade">Fidelidade</span>`;
                    } else if (item.is_offer_item) {
                        itemTag = `<span class="item-tag is-offer" title="Item de Oferta">Oferta</span>`;
                    }

                    const quantity = item.quantity || 1;
                    const totalItemPrice = item.total_item_price || 0;
                    const unitPrice =
                        quantity > 0 ? totalItemPrice / quantity : 0;
                    const unitPriceHtml =
                        quantity > 1
                            ? `<br><small class="tooltip-unit-price">(${formatPrice(unitPrice)} cada)</small>`
                            : '';

                    let detailsHtml = '';

                    if (item.is_combo && Array.isArray(item.selections)) {
                        detailsHtml += '<ul class="tooltip-sublist">'; // Lista principal para seleções do combo
                        item.selections.forEach((sel) => {
                            if (!sel || !sel.productName) return;
                            detailsHtml += `<li>↳ <strong>${escapeHTML(sel.productName)}</strong>`; // Abre o LI da seleção

                            if (
                                sel.selectedAddons &&
                                typeof sel.selectedAddons === 'object' &&
                                Object.keys(sel.selectedAddons).length > 0
                            ) {
                                detailsHtml +=
                                    '<div class="tooltip-addon-groups-wrapper is-nested">';

                                Object.entries(sel.selectedAddons).forEach(
                                    ([groupId, group]) => {
                                        if (
                                            group &&
                                            group.items &&
                                            typeof group.items === 'object' &&
                                            Object.keys(group.items).length > 0
                                        ) {
                                            const itemNames = Object.values(
                                                group.items
                                            )
                                                .map((addon) => {
                                                    if (
                                                        !addon ||
                                                        !addon.itemName
                                                    )
                                                        return '';
                                                    const addonText = `${addon.itemQuantity > 1 ? `${addon.itemQuantity} × ` : ''}${escapeHTML(addon.itemName)}`;
                                                    return addonText;
                                                })
                                                .filter(Boolean);

                                            if (itemNames.length > 0) {
                                                detailsHtml += `
                                                    <div class="tooltip-addon-group-row">
                                                        <span class="addon-group-items">↳ ${itemNames.join(', ')}</span>
                                                    </div>
                                                `;
                                            }
                                        }
                                    }
                                );
                                detailsHtml += '</div>'; // Fecha o wrapper aninhado
                            }
                            detailsHtml += `</li>`; // Fecha o LI da seleção
                        });
                        detailsHtml += '</ul>'; // Fecha a lista principal de seleções
                    } else if (
                        // Item Normal (não combo)
                        item.selected_addons &&
                        typeof item.selected_addons === 'object' &&
                        Object.keys(item.selected_addons).length > 0
                    ) {
                        detailsHtml +=
                            '<div class="tooltip-addon-groups-wrapper">';

                        Object.entries(item.selected_addons).forEach(
                            ([groupId, group]) => {
                                if (
                                    group &&
                                    group.items &&
                                    typeof group.items === 'object' &&
                                    Object.keys(group.items).length > 0
                                ) {
                                    const itemNames = Object.values(group.items)
                                        .map((addon) => {
                                            if (!addon || !addon.itemName)
                                                return '';
                                            const addonText = `${addon.itemQuantity > 1 ? `${addon.itemQuantity} × ` : ''}${escapeHTML(addon.itemName)}`;
                                            return addonText;
                                        })
                                        .filter(Boolean);

                                    if (itemNames.length > 0) {
                                        detailsHtml += `
                                            <div class="tooltip-addon-group-row">
                                                <span class="addon-group-items">↳ ${itemNames.join(', ')}</span>
                                            </div>
                                        `;
                                    }
                                }
                            }
                        );
                        detailsHtml += '</div>'; // Fecha o wrapper
                    }

                    const itemName = escapeHTML(
                        item.product_name || item.name || 'Item desconhecido'
                    );
                    // Adiciona wrapper div para os detalhes se houver
                    const detailsWrapper = detailsHtml
                        ? `<div class="tooltip-item-details-wrapper">${detailsHtml}</div>`
                        : '';
                    const itemNameCell = `
                        <td class="order-item-name-cell">
                            <strong>${quantity} × ${itemName}</strong>
                            ${itemTag}
                            ${unitPriceHtml}
                            ${detailsWrapper}
                        </td>`;
                    const itemPriceCell = `<td class="order-item-price-cell">${formatPrice(totalItemPrice)}</td>`;

                    return `<tr class="order-item-row">${itemNameCell}${itemPriceCell}</tr>`;
                })
                .join('');
        } else {
            itemsHtml = '<tr><td colspan="2">Nenhum item encontrado.</td></tr>';
        }
    } catch (e) {
        console.error(
            `Erro ao processar JSON de itens para o pedido #${order?.id}:`,
            e,
            'JSON String:',
            details?.pedido_itens_json
        );
        itemsHtml = '<tr><td colspan="2">Erro ao exibir itens.</td></tr>';
    }

    // Ações do Pedido
    const nextStatusMap = {
        pendente: { slug: 'recebido', label: 'Receber' },
        recebido: { slug: 'aceito', label: 'Aceitar' },
        aceito: { slug: 'pronto', label: 'Pronto' },
        pronto: {
            slug:
                details.pedido_tipo_servico === 'delivery'
                    ? 'enviado'
                    : 'finalizado',
            label:
                details.pedido_tipo_servico === 'delivery'
                    ? 'Enviar'
                    : 'Finalizar',
        },
        enviado: { slug: 'finalizado', label: 'Finalizar' },
    };
    let actionsHtml = '<div class="actions-wrapper">';

    // --- INÍCIO DA MODIFICAÇÃO (Impressão) ---
    // Botões de Impressão (Cozinha e Geral)
    actionsHtml += `
        <button class="order-actions-button" data-action="print-kitchen" data-order-id="${order.id}" title="Imprimir para Cozinha">
            <span class="material-symbols-rounded">print</span> Cozinha
        </button>
        <button class="order-actions-button" data-action="print-courier" data-order-id="${order.id}" title="Imprimir Geral">
            <span class="material-symbols-rounded">receipt_long</span> Geral
        </button>
    `;
    // --- FIM DA MODIFICAÇÃO ---

    // Botão Contato
    if (rawPhone.length >= 10) {
        const message = encodeURIComponent(
            `Olá! Sobre o seu pedido #${order.id}:`
        );
        const whatsappUrl = `https://wa.me/55${rawPhone}?text=${message}`;
        actionsHtml += `<a href="${whatsappUrl}" target="_blank" class="order-actions-button contact-customer-btn"><span class="material-symbols-rounded">chat</span></a>`;
    } else {
        actionsHtml += `<button disabled class="order-actions-button contact-customer-btn" title="Cliente não possui número de telefone cadastrado."><span class="material-symbols-rounded">chat_error</span>Contato</button>`;
    }

    // Botão Reconhecer Pag. (usa payment_status)
    if (
        order.payment_status === 'manual_pending' ||
        order.payment_status === 'failed_generation' ||
        order.status_slug === 'aguardando-pagamento'
    ) {
        actionsHtml += `<button class="order-actions-button payment-status-btn" data-action="recognize-payment" data-order-id="${order.id}"><span class="material-symbols-rounded">check</span></button>`;
    }

    // Botão Estornar/Desfazer Est.
    if (
        ['paid', 'refunded'].includes(order.payment_status) &&
        order.status_slug === 'cancelado'
    ) {
        const refundButtonText =
            order.payment_status === 'refunded' ? 'Desfazer Est.' : 'Estornar';
        const refundButtonClass =
            order.payment_status === 'refunded'
                ? 'active cancel-action'
                : 'cancel-action';
        actionsHtml += `<button class="order-actions-button ${refundButtonClass}" data-action="refund-status" data-order-id="${order.id}"><span class="material-symbols-rounded">undo</span>${refundButtonText}</button>`;
    }

    // Botão Próximo Status
    const nextStatus = nextStatusMap[order.status_slug];
    if (nextStatus) {
        const shakingClass =
            order.status_slug === 'pendente' ? ' is-shaking' : '';
        actionsHtml += `<button class="order-actions-button primary-action${shakingClass}" data-action="status-change" data-order-id="${order.id}" data-next-status="${nextStatus.slug}"><span class="material-symbols-rounded">arrow_forward</span>${nextStatus.label}</button>`;
    }
    // Botão Notificar Cliente
    const notificationUrl = order.notification_urls
        ? order.notification_urls[order.status_slug]
        : null;
    if (notificationUrl) {
        const hasBeenNotified =
            sessionStorage.getItem(
                `notified_${order.id}_${order.status_slug}`
            ) === 'true';
        const notifyIcon = hasBeenNotified ? 'check' : 'notifications';
        const notifyText = hasBeenNotified ? 'Notificado' : 'Notificar';
        actionsHtml += `<button class="order-actions-button notify-customer-btn ${hasBeenNotified ? 'active' : ''}" data-action="notify-customer" data-url="${notificationUrl}" data-order-id="${order.id}" data-status="${order.status_slug}"><span class="material-symbols-rounded">${notifyIcon}</span>${notifyText}</button>`;
    }

    // Botão Acionar Entrega
    if (isDelivery) {
        const notificationData = order.delivery_notification_data || '';
        const title = notificationData
            ? 'Copiar mensagem p/ entregador'
            : 'Dados de entrega não disponíveis para cópia';
        actionsHtml += `<button class="order-actions-button notify-delivery-btn" data-action="notify-delivery" data-order-id="${order.id}" data-copy-text="${encodeURI(notificationData)}" title="${title}"><span class="material-symbols-rounded">send</span></button>`;
    }

    // Adiciona o botão de mapa
    if (mapButtonHtml) {
        actionsHtml += mapButtonHtml;
    }

    // Botão Cancelar
    if (!['finalizado', 'cancelado'].includes(order.status_slug)) {
        actionsHtml += `<button class="order-actions-button cancel-action" data-action="status-change" data-order-id="${order.id}" data-next-status="cancelado"><span class="material-symbols-rounded">cancel</span></button>`;
    }
    actionsHtml += '</div>'; // Fecha actions-wrapper

    // Montagem final do Tooltip
    return `<div class="details-tooltip-content" style="display: flex; gap: 16px;">
                <div class="tooltip-column" style="flex-basis: 20%;">
                    <h4>Dados do Cliente</h4>
                    ${customerDataHtml}
                </div>
                <div class="tooltip-column" style="flex-basis: 20%;">
                    ${orderIdHtml}
                    ${orderDataHtml}
                </div>
                <div class="tooltip-column" style="flex-basis: 40%;">
                    <h4>Itens do Pedido (${totalItems})</h4>
                    <table class="tooltip-items-table"><tbody>${itemsHtml}</tbody></table>
                </div>
                <div class="tooltip-column tooltip-actions-column" style="flex-basis: 20%; min-width: 150px;">
                    <h4>Ações do Pedido</h4>
                    ${actionsHtml}
                </div>
            </div>`;
};

// Abre/Fecha o Tooltip (sem alterações)
export const toggleTooltip = (row) => {
    const orderId = row.dataset.orderId;
    const order = state.allOrders.find((o) => o.id == orderId);
    if (!order) {
        console.warn(`Pedido com ID ${orderId} não encontrado no estado.`);
        return;
    }

    if (state.activeTooltip) {
        if (
            state.activeTooltip.tooltipRow &&
            state.activeTooltip.tooltipRow.parentNode
        ) {
            state.activeTooltip.tooltipRow.remove();
        }
        if (state.activeTooltip.row && state.activeTooltip.row.parentNode) {
            state.activeTooltip.row.classList.remove('is-expanded');
        }

        if (state.activeTooltip.row === row) {
            state.activeTooltip = null;
            return;
        }
    }

    const tooltipRow = document.createElement('tr');
    tooltipRow.className = 'details-tooltip-row';
    const tooltipCell = document.createElement('td');
    tooltipCell.colSpan = 7;
    tooltipCell.innerHTML = createTooltipContent(order);
    tooltipRow.appendChild(tooltipCell);

    const mapButton = tooltipCell.querySelector('.show-map-button');
    if (mapButton) {
        mapButton.addEventListener('click', _showMapModal);
    }

    row.parentNode.insertBefore(tooltipRow, row.nextSibling);
    row.classList.add('is-expanded');

    state.activeTooltip = { row: row, tooltipRow: tooltipRow };
};

// Renderiza a Tabela de Pedidos
export const renderOrdersTable = (orders, isFullRender = true) => {
    const container = document.getElementById('pedidos-table-container');
    if (!container) {
        console.error(
            "Container da tabela '#pedidos-table-container' não encontrado."
        );
        return;
    }

    if (isFullRender) {
        container.innerHTML = '';
        if (
            state.activeTooltip &&
            state.activeTooltip.tooltipRow &&
            state.activeTooltip.tooltipRow.parentNode
        ) {
            state.activeTooltip.tooltipRow.remove();
            if (state.activeTooltip.row)
                state.activeTooltip.row.classList.remove('is-expanded');
            state.activeTooltip = null;
        }
    }

    if (!orders || orders.length === 0) {
        if (isFullRender) {
            container.innerHTML =
                '<div class="no-orders-message"><span class="material-symbols-rounded">shopping_cart_off</span><p>Nenhum pedido encontrado para o filtro selecionado.</p></div>';
        }
        return;
    }

    let table = container.querySelector('.pedidos-table');
    if (!table) {
        table = document.createElement('table');
        table.className = 'pedidos-table';
        // Cabeçalho com 7 colunas
        table.innerHTML = `<thead><tr><th>Pedido</th><th>Tempo</th><th>Cliente</th><th>Status</th><th>Pagamento</th><th>Entregador</th><th>Total</th></tr></thead><tbody></tbody>`;
        container.appendChild(table);
    }
    const tbody = table.querySelector('tbody');
    if (!tbody) {
        console.error('Elemento tbody não encontrado na tabela.');
        return;
    }

    if (isFullRender) {
        tbody.innerHTML = '';
    }

    orders.forEach((order) => {
        if (
            !isFullRender &&
            tbody.querySelector(`tr[data-order-id="${order.id}"]`)
        ) {
            return;
        }

        const tr = document.createElement('tr');
        tr.dataset.orderId = order.id;

        if (
            order.status_slug === 'pendente' ||
            order.status_slug === 'aguardando-pagamento'
        ) {
            tr.classList.add('is-pending');
        }

        // Status do Pedido (select ou texto)
        let statusSelectHtml = '';
        if (order.status_slug === 'aguardando-pagamento') {
            statusSelectHtml = `<div class="status-badge status-aguardando-pagamento">Aguardando Pagamento</div>`;
        } else {
            statusSelectHtml = `<div class="status-badge status-${order.status_slug}">${escapeHTML(order.status)}</div>`;
        }
        const statusHtml = `<div class="order-status-cell">${statusSelectHtml}</div>`;

        // Entregador (select)
        const entregadorId =
            order.details?.pedido_entregador_designado?.ID || '0';
        const entregadorOptions = (state.allEntregadores || [])
            .map(
                (e) =>
                    `<option value="${e.id}" ${e.id == entregadorId ? 'selected' : ''}>${escapeHTML(e.name)}</option>`
            )
            .join('');
        const entregadorSelectHtml = `<select class="entregador-select" data-order-id="${order.id}" data-original-value="${entregadorId}"> <option value="0">Nenhum</option>${entregadorOptions}</select>`;

        // Tempo
        const timeAgoHtml = `<span class="order-time-ago" data-timestamp="${order.timestamp}">${_formatTimeAgo(order.timestamp)}</span>`;

        // Pagamento
        let paymentMethodSlug = order.details?.pedido_metodo_pagamento || 'N/A';
        const paymentMethodObject = state.allPaymentMethodsData.find(
            (m) => m.slug === paymentMethodSlug
        );
        const paymentCategory = paymentMethodObject
            ? paymentMethodObject.categoria
            : null;

        if (
            paymentMethodSlug === 'pix-sicredi' &&
            order.payment_status === 'failed_generation'
        ) {
            paymentMethodSlug = 'pix-fallback';
        }

        let paymentMethodText = escapeHTML(
            state.allPaymentMethods[paymentMethodSlug] || paymentMethodSlug
        );

        let paymentStatusEmoji = '';
        if (
            paymentMethodSlug === 'pix-sicredi' ||
            paymentCategory === 'pix_automatico'
        ) {
            if (order.payment_status === 'paid') {
                paymentStatusEmoji = ' 🟢';
            } else if (order.payment_status === 'expired') {
                paymentStatusEmoji = ' 🔴';
            } else if (
                order.payment_status === 'awaiting_api' ||
                order.payment_status === 'manual_pending' ||
                order.payment_status === 'pending' ||
                order.payment_status === 'failed_generation'
            ) {
                paymentStatusEmoji = ' 🟡';
            }
        }
        const finalPaymentText = paymentMethodText + paymentStatusEmoji;

        // Ícone de Modalidade
        const modalitySlug = order.details?.pedido_tipo_servico || 'N/A';
        const modalityInfo = modalityMap[modalitySlug] || {
            name: modalitySlug,
            icon: 'help',
        };
        const modalityIconHtml = `
            <span class="modality-icon-wrapper" title="${escapeHTML(modalityInfo.name)}">
                 <span class="material-symbols-rounded">${modalityInfo.icon}</span>
            </span>
        `;

        // Montagem da Linha da Tabela
        tr.innerHTML = `
            <td data-label="Pedido">#${order.id} ${modalityIconHtml}</td>
            <td data-label="Tempo">${timeAgoHtml}</td>
            <td data-label="Cliente">${escapeHTML(order.customer_name || '')}</td>
            <td data-label="Status">${statusHtml}</td>
            <td data-label="Pagamento">${finalPaymentText}</td>
            <td data-label="Entregador">${entregadorSelectHtml}</td>
            <td data-label="Total"><strong>${escapeHTML(order.total || 'R$ 0,00')}</strong></td>
        `;
        tbody.appendChild(tr);
    });

    _startTimeAgoUpdater();
};

// Renderiza o Filtro de Status (sem alterações)
export const renderStatusFilter = () => {
    const container = document.getElementById('status-filter-container');
    if (!container) {
        console.warn('Container do filtro de status não encontrado.');
        return;
    }

    if (!state.allStatuses || state.allStatuses.length === 0) {
        container.innerHTML = '';
        return;
    }

    const statusesHtml = state.allStatuses
        .map(
            (s) =>
                `<div class="status-filter-item">
                    <label for="status-${s.slug}" class="status-filter-item-label">${escapeHTML(s.name)}</label>
                    <div class="nativa-toggle-switch is-small">
                        <div class="nativa-toggle-control">
                            <input type="checkbox" id="status-${s.slug}" class="filter-checkbox" data-filter-type="status" value="${s.slug}">
                            <label for="status-${s.slug}" class="nativa-toggle-ui"></label>
                        </div>
                    </div>
                </div>`
        )
        .join('');

    const modalities = [
        { slug: 'all', name: 'Todas' },
        { slug: 'delivery', name: 'Entrega' },
        { slug: 'pickup', name: 'Retirada' },
        { slug: 'table', name: 'Na Mesa' },
    ];

    const modalitiesHtml = modalities
        .map(
            (m) =>
                `<div class="status-filter-item">
                    <label for="modality-${m.slug}" class="status-filter-item-label">${escapeHTML(m.name)}</label>
                    <div class="nativa-toggle-switch is-small">
                        <div class="nativa-toggle-control">
                            <input type="checkbox" id="modality-${m.slug}" class="filter-checkbox" data-filter-type="modality" value="${m.slug}">
                            <label for="modality-${m.slug}" class="nativa-toggle-ui"></label>
                        </div>
                    </div>
                </div>`
        )
        .join('');

    const statusCount = state.allStatuses.length;
    container.innerHTML = `
        <button class="status-filter-dropdown-button icon-only-button" aria-haspopup="true" aria-expanded="false">
            <span class="material-symbols-rounded">filter_list</span>
            <span class="button-text">Filtrar (${statusCount})</span>
        </button>
        <div class="status-filter-dropdown-panel">
            <div class="status-filter-columns">
                <div class="status-filter-column statuses">
                    <h5>Status</h5>
                    ${statusesHtml}
                </div>
                <div class="status-filter-column modalities">
                    <h5>Modalidade</h5>
                    ${modalitiesHtml}
                </div>
            </div>
        </div>`;
};
