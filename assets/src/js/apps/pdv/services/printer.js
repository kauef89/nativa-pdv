// apps/pdv/services/printer.js

import { formatPrice } from '@utils/formatters.js';
import { state } from '../features/orders-manager/dashboard-state.js';

// --- FONTES ---
const FONT_ASSETS = `
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet">
`;

// --- ESTILOS DE IMPRESSÃO (80mm) ---
const PRINT_STYLES = `
    @media print {
        @page { margin: 0; size: 80mm auto; }
        body { margin: 0; padding: 2px; }
    }
    body {
        font-family: 'IBM Plex Mono', 'Courier New', monospace;
        font-weight: 700;
        font-size: 14px; /* Reduzido de 15 para 14 */
        color: #000 !important;
        background: #fff;
        width: 74mm;
        margin: 0 auto;
        -webkit-font-smoothing: antialiased;
        text-rendering: optimizeLegibility;
    }
    
    /* Utilitários */
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .text-right { text-align: right; }
    .text-bold { font-weight: 700; }
    
    .text-lg { font-size: 17px; } /* Reduzido de 18 para 17 */
    .text-xl { font-size: 21px; } /* Reduzido de 22 para 21 */
    
    /* Ícones */
    .material-symbols-rounded {
        font-family: 'Material Symbols Rounded'; 
        font-size: 1.2em;
        line-height: 1;
        vertical-align: text-bottom;
        display: inline-block;
        color: #000 !important;
        font-weight: 700;
    }
    
    /* Logo Padrão */
    .print-logo-container {
        width: 100%;
        text-align: center;
        margin-bottom: 10px;
    }
    .print-logo-container img { 
        width: 80%; 
        height: auto; 
        display: inline-block;
        filter: grayscale(100%) contrast(200%); 
    }

    /* --- LAYOUT DO CABEÇALHO DA COZINHA --- */
    .kitchen-header-row {
        display: flex;
        align-items: center;
        margin-bottom: 5px;
        gap: 8px;
        width: 100%;
    }
    
    .kh-logo {
        width: 50px;
        height: 50px;
        flex-shrink: 0;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    
    .kh-logo img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        filter: grayscale(100%) contrast(200%);
    }
    
    .kh-info {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        overflow: hidden;
    }

    .kh-meta-line {
        font-size: 12px; /* Reduzido de 13 para 12 */
        margin-top: 4px;
        white-space: nowrap;
    }

    /* --- LINHAS E SEPARADORES --- */
    .separator { border-bottom: 2px solid #000; margin: 8px 0; width: 100%; }
    .double-separator { border-bottom: 2px solid #000; margin: 8px 0; width: 100%; }
    .item-separator { border-bottom: 1px dashed #000; margin: 6px 0; width: 100%; }
    
    /* --- COZINHA --- */
    .kitchen-ticket {
        page-break-after: always;
        padding-bottom: 20px;
        border-bottom: 2px solid #000;
        margin-bottom: 20px;
    }
    .kitchen-ticket:last-child { page-break-after: auto; }
    
    .kitchen-item-name {
        font-size: 25px; /* Reduzido de 26 para 25 */
        font-weight: 700;
        margin-top: 10px;
        margin-bottom: 6px;
        line-height: 1.1;
        text-transform: uppercase;
    }
    
    .kitchen-item-addons {
        font-size: 21px; /* Reduzido de 22 para 21 */
        font-weight: 700;
        margin-top: 2px;
        line-height: 1.2;
    }
    
    .addon-line {
        display: flex;
        align-items: flex-start;
        gap: 6px;
        margin-bottom: 2px;
    }
    .addon-line .material-symbols-rounded { font-size: 21px; padding-top: 2px; } /* Ajustado para acompanhar */
    
    /* --- COURIER (MOTOBOY) --- */
    .item-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 4px;
        align-items: flex-start;
    }
    
    /* Checkbox Arredondado */
    .item-checkbox {
        display: inline-block;
        width: 18px; 
        height: 18px;
        border: 2px solid #000;
        border-radius: 4px;
        margin-right: 8px;
        vertical-align: text-bottom;
        flex-shrink: 0;
    }

    .item-name-col { 
        flex-grow: 1; 
        padding-right: 5px; 
        line-height: 1.3; 
        font-weight: 700; 
        text-transform: uppercase;
        display: flex;
        align-items: flex-start;
    }
    
    .item-price-col { white-space: nowrap; font-weight: 700; }
    
    .item-addons-courier {
        font-size: 12px; /* Reduzido de 13 para 12 */
        margin-top: -2px;
        margin-bottom: 6px;
        font-weight: 700;
        line-height: 1.2;
        text-transform: uppercase;
        padding-left: 30px; 
    }
    
    .totals-row { display: flex; justify-content: space-between; margin: 4px 0; font-weight: 700; }
    
    .footer { 
        margin-top: 10px; 
        font-size: 11px; /* Reduzido de 12 para 11 */
        text-align: center; 
        font-weight: 700; 
    }
    
    .customer-name-centered {
        text-align: center;
        font-weight: 700;
        font-size: 19px; /* Reduzido de 20 para 19 */
        margin: 5px 0 10px 0;
        text-transform: uppercase;
    }
`;

function _getPrintPayload(bodyContent) {
    return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Imprimir</title>${FONT_ASSETS}<style>${PRINT_STYLES}</style></head><body class="nativa-print-body">${bodyContent}</body></html>`;
}

// ... (Funções de envio e fallback mantidas)
async function _sendToLocalServer(fullHtml) {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch('http://localhost:4000/imprimir', {
            method: 'POST',
            headers: { 'Content-Type': 'text/html' },
            body: fullHtml,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (response.ok) console.log('✅ Enviado servidor local');
        else throw new Error('Erro servidor');
    } catch (error) {
        console.warn('⚠️ Fallback', error);
        _openPrintWindowFallback(fullHtml);
    }
}
function _openPrintWindowFallback(content) {
    const w = window.open('', '_blank', 'width=450,height=600');
    if (w) {
        w.document.write(content);
        w.document.close();
        w.focus();
        setTimeout(() => w.print(), 1000);
    } else alert('Pop-up bloqueado.');
}

// --- HELPERS (Com fontes ajustadas) ---

function _formatDateShort(timestamp) {
    if (!timestamp) return 'Data n/a';
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function _getModalityName(slug) {
    const map = { delivery: 'DELIVERY', pickup: 'RETIRADA', table: 'MESA' };
    return (map[slug] || slug).toUpperCase();
}

function _formatAddressForPrint(order) {
    const addr = order.details.pedido_endereco || {};
    if (!addr.pedido_rua) return '';
    const decode = (s) => {
        try {
            return decodeURIComponent(s.replace(/\+/g, ' '));
        } catch {
            // CORREÇÃO: Removido 'e' não utilizado
            return s;
        }
    };

    const rua = decode(addr.pedido_rua).toUpperCase();
    const num = decode(addr.pedido_numero).toUpperCase() || 'S/N';
    const bairro = decode(addr.pedido_bairro).toUpperCase();
    const comp = decode(addr.pedido_complemento).toUpperCase();

    const line1 = `${rua}, ${num} - ${bairro}`;
    // Complemento reduzido para 13px
    const line2 = comp
        ? `<div style="font-weight: 700; font-size: 13px; margin-top: 2px;">${comp}</div>`
        : '';

    // Linha principal reduzida para 15px
    return `<div style="text-align: center; margin-top:5px; font-size: 15px; line-height: 1.4; color: #000; font-weight: 700;">${line1}${line2}</div>`;
}

function _generateStandardHeader(order, logoSrc, extraInfo = '') {
    const orderIdDisplay = `#${order.id}`;
    const modalityDisplay = _getModalityName(order.details.pedido_tipo_servico);
    const infoLine = `${orderIdDisplay} | ${modalityDisplay}`;
    const customerName = (
        order.details.pedido_nome_cliente ||
        order.customer_name ||
        'Cliente'
    ).toUpperCase();

    return `
        <div class="print-logo-container"><img src="${logoSrc}" alt="Logo" onerror="this.style.display='none'"></div>
        <div class="text-center text-xl text-bold">${infoLine}</div>
        <div class="text-center" style="font-size: 14px; margin-top: 4px; color: #000; font-weight: 700;">${_formatDateShort(order.timestamp)}${extraInfo}</div>
        <div class="separator"></div>
        <div class="customer-name-centered">${customerName}</div>
    `;
}

function _generateKitchenHeader(order, monoLogoSrc, ticketInfo) {
    const orderIdDisplay = `#${order.id}`;
    const modalityDisplay = _getModalityName(order.details.pedido_tipo_servico);
    const customerName = (
        order.details.pedido_nome_cliente ||
        order.customer_name ||
        'Cliente'
    ).toUpperCase();
    const dateStr = _formatDateShort(order.timestamp);
    const metaLine = `${dateStr} | ${ticketInfo}`;

    return `
        <div class="kitchen-header-row">
            <div class="kh-logo">
                <img src="${monoLogoSrc}" alt="Logo" onerror="this.style.display='none'">
            </div>
            <div class="kh-info">
                <div class="text-xl text-bold" style="line-height: 1.1;">${orderIdDisplay} | ${modalityDisplay}</div>
                <div class="kh-meta-line">${metaLine}</div>
            </div>
        </div>
        <div class="separator"></div>
        <div class="customer-name-centered">${customerName}</div>
    `;
}

function _getArrowIcon() {
    return `<span class="material-symbols-rounded" style="color: #000 !important; font-weight: 700;">subdirectory_arrow_right</span>`;
}

// --- EXPORTS ---

export function printKitchenReport(order, targetItemKeys = null) {
    if (!order || !order.details) return;
    let rawItems = {};
    try {
        rawItems = JSON.parse(order.details.pedido_itens_json || '{}');
    } catch (e) {
        console.error(e);
        return;
    }

    const allEntries = Object.entries(rawItems);
    let globalTotalTickets = 0;
    // CORREÇÃO: Removido '_' não utilizado, usando destructuring com vírgula
    allEntries.forEach(([, item]) => {
        globalTotalTickets += parseInt(item.quantity, 10) || 1;
    });
    if (globalTotalTickets === 0) return;

    let pluginUrl = window.nativaDeliveryData?.pluginUrl || '';
    if (pluginUrl && !pluginUrl.endsWith('/')) pluginUrl += '/';
    const monoLogoSrc = `${pluginUrl}assets/svg/nativa_mono.svg`;

    let htmlBuffer = '';
    let globalTicketCounter = 0;

    allEntries.forEach(([key, item]) => {
        const qty = parseInt(item.quantity, 10) || 1;
        const productName = item.product_name || item.name;
        const shouldPrintThisItem = targetItemKeys
            ? targetItemKeys.includes(key)
            : true;

        let addonsHtml = '';
        const renderAddonLine = (name, qty) => {
            const prefix = qty > 1 ? `<strong>${qty}&times;</strong> ` : '';
            return `<div class="addon-line">${_getArrowIcon()}<span>${prefix}${name}</span></div>`;
        };

        if (item.is_combo && Array.isArray(item.selections)) {
            item.selections.forEach((sel) => {
                addonsHtml += `<div style="margin-top:4px;">• ${sel.productName}</div>`;
                if (sel.selectedAddons) {
                    Object.values(sel.selectedAddons).forEach((group) => {
                        Object.values(group.items || {}).forEach((addon) => {
                            addonsHtml += renderAddonLine(
                                addon.itemName,
                                parseInt(addon.itemQuantity, 10)
                            );
                        });
                    });
                }
            });
        } else if (item.selected_addons) {
            Object.values(item.selected_addons).forEach((group) => {
                Object.values(group.items || {}).forEach((addon) => {
                    addonsHtml += renderAddonLine(
                        addon.itemName,
                        parseInt(addon.itemQuantity, 10)
                    );
                });
            });
        }
        if (item.observacoes) {
            addonsHtml += `<div style="margin-top:5px; font-style:italic; font-size: 0.8em; color: #000; font-weight: 700;">OBS: ${item.observacoes}</div>`;
        }

        for (let i = 0; i < qty; i++) {
            globalTicketCounter++;
            if (shouldPrintThisItem) {
                const ticketInfo = `ITEM ${globalTicketCounter}/${globalTotalTickets}`;
                const headerCompact = _generateKitchenHeader(
                    order,
                    monoLogoSrc,
                    ticketInfo
                );

                htmlBuffer += `
                <div class="kitchen-ticket">
                    ${headerCompact}
                    <div class="double-separator"></div>
                    <div>
                        <div class="kitchen-item-name">${productName}</div>
                        <div class="kitchen-item-addons">${addonsHtml}</div>
                    </div>
                </div>`;
            }
        }
    });

    if (!htmlBuffer) return;
    _sendToLocalServer(_getPrintPayload(htmlBuffer));
}

export function printCourierReport(order) {
    if (!order || !order.details) return;
    let pluginUrl = window.nativaDeliveryData?.pluginUrl || '';
    if (pluginUrl && !pluginUrl.endsWith('/')) pluginUrl += '/';
    const logoSrc = `${pluginUrl}assets/svg/nativa_logo.svg`;

    let headerHtml = _generateStandardHeader(order, logoSrc);
    if (order.details.pedido_tipo_servico === 'delivery')
        headerHtml += _formatAddressForPrint(order);

    let items = [];
    try {
        items = Object.values(
            JSON.parse(order.details.pedido_itens_json || '{}')
        );
    } catch {
        // CORREÇÃO: Removido 'e' não utilizado
        items = [];
    }

    let itemsHtml = '<div class="double-separator"></div>';
    let totalItemsCount = 0;

    items.forEach((item, index) => {
        const totalItemPrice = parseFloat(item.total_item_price || 0);
        const qtyVal = parseInt(item.quantity, 10) || 1;
        totalItemsCount += qtyVal;
        const itemQty = `<strong>${qtyVal}&times;</strong>`;

        itemsHtml += `
            <div class="item-row">
                <div class="item-name-col">
                    <span class="item-checkbox"></span>
                    <span>${itemQty} ${item.product_name || item.name}</span>
                </div>
                <div class="item-price-col">${formatPrice(totalItemPrice)}</div>
            </div>
        `;

        let addonsBuffer = [];
        if (item.is_combo && item.selections)
            item.selections.forEach((s) => addonsBuffer.push(s.productName));
        else if (item.selected_addons)
            Object.values(item.selected_addons).forEach((g) => {
                Object.values(g.items || {}).forEach((a) => {
                    const q = parseInt(a.itemQuantity, 10);
                    const p = q > 1 ? `${q}&times; ` : '';
                    addonsBuffer.push(`${p}${a.itemName}`);
                });
            });

        if (addonsBuffer.length > 0)
            itemsHtml += `<div class="item-addons-courier">(${addonsBuffer.join(', ')})</div>`;
        if (index < items.length - 1)
            itemsHtml += '<div class="item-separator"></div>';
    });

    const subtotal = parseFloat(order.details.pedido_subtotal || 0);
    const taxa = parseFloat(order.details.pedido_taxa_entrega || 0);
    const desconto = parseFloat(order.details.pedido_desconto || 0);

    let totalsHtml = `<div class="separator"></div>`;
    totalsHtml += `<div class="totals-row"><span>Qtd. Itens:</span><span>${totalItemsCount}</span></div>`;
    totalsHtml += `<div class="totals-row"><span>Subtotal:</span><span>${formatPrice(subtotal)}</span></div>`;

    if (taxa > 0)
        totalsHtml += `<div class="totals-row"><span>Entrega:</span><span>${formatPrice(taxa)}</span></div>`;
    if (desconto > 0)
        totalsHtml += `<div class="totals-row"><span>Desconto:</span><span>-${formatPrice(desconto)}</span></div>`;
    totalsHtml += `<div class="totals-row text-lg text-bold" style="margin-top:2px;"><span>TOTAL:</span><span>${order.total}</span></div>`;

    const paymentMethodSlug = order.details.pedido_metodo_pagamento;
    const paymentMethodName =
        state.allPaymentMethods?.[paymentMethodSlug] || paymentMethodSlug;
    let paymentStatusText = '';

    if (paymentMethodSlug === 'pix-sicredi' && order.payment_status === 'paid')
        paymentStatusText = 'PAGO (PIX)';
    else {
        paymentStatusText = `A PAGAR: ${paymentMethodName.toUpperCase()}`;
        if (paymentMethodSlug === 'dinheiro') {
            const trocoPara = parseFloat(order.details.pedido_troco_para || 0);
            const valorTotal = parseFloat(
                order.total.replace(/[^\d,]/g, '').replace(',', '.')
            );
            if (trocoPara > valorTotal)
                paymentStatusText += `<br/>Troco p/: ${formatPrice(trocoPara)}<br/>Devolver: ${formatPrice(trocoPara - valorTotal)}`;
            else paymentStatusText += `<br/>(SEM TROCO / VALOR EXATO)`;
        }
    }

    const paymentHtml = `<div class="separator"></div><div class="text-center text-bold text-lg" style="color: #000;">${paymentStatusText}</div>`;
    const footerHtml = `<div class="footer"><div class="separator"></div><p>(47) 3448-1082 | pastelarianativa.com.br</p></div>`;

    _sendToLocalServer(
        _getPrintPayload(
            `${headerHtml}${itemsHtml}${totalsHtml}${paymentHtml}${footerHtml}`
        )
    );
}
