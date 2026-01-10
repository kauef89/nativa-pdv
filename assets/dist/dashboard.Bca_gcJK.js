import{e as g,f as I,A as Y,H as Q,a as $,w as be}from"./nativa-ui-helpers.DctCh3HV.js";const n={allOrders:[],allStatuses:[],allEntregadores:[],allPaymentMethods:{},allPaymentMethodsData:[],lastCheckTimestamp:null,activeTooltip:null,refreshInterval:null,isAutoRefreshActive:!1,currentFilteredOrders:[],currentlyDisplayedOrders:[]};let le=null;const xe={delivery:{name:"Entrega",icon:"local_shipping"},pickup:{name:"Retirada",icon:"storefront"},table:{name:"Na Mesa",icon:"restaurant_menu"}};function Pe(e){if(typeof e!="string"||!e)return"";const t=e.replace(/\D/g,"");return t.length===11?`(${t.substring(0,2)}) ${t.substring(2,7)}-${t.substring(7)}`:t.length===10?`(${t.substring(0,2)}) ${t.substring(2,6)}-${t.substring(6)}`:e}function _e(e){const t=new Date,s=new Date(e*1e3),i=Math.floor((t-s)/1e3),o=Math.floor(i/86400),a={hour:"2-digit",minute:"2-digit"},l=s.toLocaleTimeString("pt-BR",a).replace(":","h");if(o===0&&t.getDate()===s.getDate()){const u=Math.floor(i/60);return u<1?"Agora":u<60?`Há ${u} min`:`Há ${Math.floor(u/60)}h ${u%60}min`}if(o<7){const u=s.toLocaleDateString("pt-BR",{weekday:"long"});return`${u.charAt(0).toUpperCase()+u.slice(1)}, ${l}`}const c={day:"2-digit",month:"2-digit",year:"2-digit"};return`${s.toLocaleDateString("pt-BR",c)} ${l}`}function Fe(){le&&clearInterval(le),le=setInterval(()=>{document.querySelectorAll(".order-time-ago").forEach(e=>{const t=parseInt(e.dataset.timestamp,10);t&&(e.textContent=_e(t))})},6e4)}function Me(e){var d;const t=e.target.closest(".show-map-button");if(!t)return;const s=t.dataset.lat,i=t.dataset.lng,o=t.dataset.address,a=((d=window.nativaDeliveryData)==null?void 0:d.google_maps_api_key)||"",l=s&&i,c=o&&o!=="null";let p="";const u=!!a;if(l&&u)try{const r=`${s},${i}`,f=encodeURIComponent(r);p=`
                <div class="map-container" style="height: 300px; margin-bottom: 16px;">
                    <iframe width="100%" height="100%" style="border:0" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="${`https://www.google.com/maps/embed/v1/place?key=${a}&q=${f}`}"></iframe>
                </div>
                ${c?`<p style="text-align: center; font-size: 0.9em; color: var(--md-sys-color-outline);">${g(o)}</p>`:""}
            `}catch(r){console.error("Erro ao construir URL do mapa com coordenadas:",r);const f=c?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o)}`:"#";p=`
                <div class="map-placeholder" style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 0;">
                    <span class="material-symbols-rounded" style="font-size: 32px; color: var(--md-sys-color-error);">wrong_location</span>
                    <span>Erro ao carregar mapa.</span>
                     ${c?`<p style="text-align: center; font-size: 0.9em; margin-bottom: 8px;">${g(o)}</p><a href="${f}" target="_blank" class="nativa-button-secondary is-small"><span class="material-symbols-rounded">search</span> Pesquisar no Google Maps</a>`:""}
                </div>
            `}else{const r=c?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o)}`:"#";p=`
            <div class="map-placeholder" style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 0;">
                <span class="material-symbols-rounded" style="font-size: 32px; color: var(--md-sys-color-outline);">location_off</span>
                <span>${u?"Localização não compartilhada.":"API Key do mapa não configurada."}</span>
                ${c?`<p style="text-align: center; font-size: 0.9em; margin-bottom: 8px;">${g(o)}</p><a href="${r}" target="_blank" class="nativa-button-secondary is-small"><span class="material-symbols-rounded">search</span> Pesquisar no Google Maps</a>`:'<p style="text-align: center; font-size: 0.9em;">Endereço não disponível.</p>'}
            </div>
        `,a||console.warn("API Key do Google Maps não configurada.")}Q({title:"Localização da Entrega",message:p,confirmText:"Fechar",cancelText:null})}const we=e=>{const t=window.nativaDeliveryData||{},s=(e==null?void 0:e.details)||{},i=(e==null?void 0:e.customer_name)||"Cliente",o=e==null?void 0:e.customer_dob,a=s.pedido_nome_cliente||i,l=s.pedido_cpf_cliente||"Não informado",c=(s.pedido_whatsapp_cliente||"").replace(/\D/g,""),p=Pe(c)||"Não informado",u=`
        <div class="tooltip-data-item"><span class="label">Nome</span><span class="value copyable-value" data-copy-text="${g(a)}" title="Clique para copiar">${g(a)}</span></div>
        <div class="tooltip-data-item"><span class="label">CPF</span><span class="value copyable-value" data-copy-text="${g(l)}" title="Clique para copiar">${g(l)}</span></div>
        <div class="tooltip-data-item"><span class="label">WhatsApp</span><span class="value copyable-value" data-copy-text="${c}" title="Clique para copiar">${g(p)}</span></div>
        <div class="tooltip-data-item"><span class="label">Nascimento</span><span class="value">${g(o||"Não informado")}</span></div>
    `;let d=s.pedido_metodo_pagamento||"N/A";d==="pix-sicredi"&&e.payment_status==="failed_generation"&&(d="pix-fallback");let r=n.allPaymentMethods[d]||d;const f=n.allPaymentMethodsData.find(v=>v.slug===d),m=f?f.categoria:null;(s.pedido_metodo_pagamento==="pix-sicredi"||m==="pix_automatico")&&(e.payment_status==="paid"?r+=" 🟢":e.payment_status==="expired"?r+=" 🔴":(e.payment_status==="awaiting_api"||e.payment_status==="manual_pending"||e.payment_status==="pending"||e.payment_status==="failed_generation")&&(r+=" 🟡"));const A=`
        <div class="order-id-header">
            <h4>Pedido #${e.id}</h4>
        </div>
    `,x=xe[s.pedido_tipo_servico]||{name:s.pedido_tipo_servico,icon:"help"},O=n.allPaymentMethodsData.find(v=>v.slug===d),_=d==="dinheiro"||O&&O.exige_troco;let h="";if(_){const v=parseFloat(s.pedido_troco_para||0),C=(e.total||"R$ 0,00").replace("R$ ","").replace(".","").replace(",","."),b=parseFloat(C);if(v>0&&v>=b){const P=I(v),E=v-b,H=I(E);h=`
                <div class="tooltip-data-item">
                    <span class="label">Troco para</span>
                    <span class="value">${P}</span>
                </div>
                <div class="tooltip-data-item">
                    <span class="label">Levar</span>
                    <span class="value is-highlight">${H}</span>
                </div>
            `}else h=`
                <div class="tooltip-data-item">
                    <span class="label">Troco</span>
                    <span class="value">Sem troco</span>
                </div>
            `}let w=`
        <div class="tooltip-data-item"><span class="label">Modalidade</span><span class="value"><span class="material-symbols-rounded modality-icon-tooltip">${x.icon}</span>${g(x.name)}</span></div>
        <div class="tooltip-data-item">
            <span class="label">Método Pag.</span>
            <span class="value">${g(r)}</span>
        </div>
        ${h}
    `,D="";const q=s.pedido_tipo_servico==="delivery";if(q){const v=s.pedido_endereco||{},C=Y(v.pedido_rua||""),b=Y(v.pedido_numero||""),P=Y(v.pedido_complemento||""),E=Y(v.pedido_bairro||""),H=t.cep_cidade||"",ie=v.pedido_latitude,ne=v.pedido_longitude,re=C&&b&&E?`${C}, ${b} - ${E}, Balneário Barra do Sul - SC`:null;w+=`
            <div class="tooltip-data-item"><span class="label">Logradouro</span><span class="value copyable-value" data-copy-text="${g(C)}" title="Clique para copiar">${g(C)}</span></div>
            <div class="tooltip-data-item"><span class="label">Número</span><span class="value copyable-value" data-copy-text="${g(b)}" title="Clique para copiar">${g(b)}</span></div>
            <div class="tooltip-data-item"><span class="label">Bairro</span><span class="value copyable-value" data-copy-text="${g(E)}" title="Clique para copiar">${g(E)}</span></div>
        `,P&&(w+=`<div class="tooltip-data-item"><span class="label">Complemento</span><span class="value copyable-value" data-copy-text="${g(P)}" title="Clique para copiar">${g(P)}</span></div>`),w+=`<div class="tooltip-data-item"><span class="label">CEP</span><span class="value copyable-value" data-copy-text="${g(H)}" title="Clique para copiar">${g(H)}</span></div>`,D=`
            <button class="order-actions-button show-map-button"
                    data-lat="${ie||""}"
                    data-lng="${ne||""}"
                    data-address="${g(re||"")}">
                <span class="material-symbols-rounded">map</span>
            </button>
        `}const B=`<div class="order-data-grid">${w}</div>`;let N='<tr><td colspan="2">Erro ao processar itens do pedido.</td></tr>',L=0;try{const v=s&&typeof s.pedido_itens_json=="string"?s.pedido_itens_json:"{}",C=JSON.parse(v);C&&typeof C=="object"&&Object.keys(C).length>0?N=Object.values(C).map(b=>{if(!b||typeof b!="object")return"";L+=parseInt(b.quantity,10)||0;let P="";b.is_reward?P='<span class="item-tag is-reward" title="Resgate de Fidelidade">Fidelidade</span>':b.is_offer_item&&(P='<span class="item-tag is-offer" title="Item de Oferta">Oferta</span>');const E=b.quantity||1,H=b.total_item_price||0,ie=E>0?H/E:0,ne=E>1?`<br><small class="tooltip-unit-price">(${I(ie)} cada)</small>`:"";let T="";b.is_combo&&Array.isArray(b.selections)?(T+='<ul class="tooltip-sublist">',b.selections.forEach(M=>{!M||!M.productName||(T+=`<li>↳ <strong>${g(M.productName)}</strong>`,M.selectedAddons&&typeof M.selectedAddons=="object"&&Object.keys(M.selectedAddons).length>0&&(T+='<div class="tooltip-addon-groups-wrapper is-nested">',Object.entries(M.selectedAddons).forEach(([J,R])=>{if(R&&R.items&&typeof R.items=="object"&&Object.keys(R.items).length>0){const z=Object.values(R.items).map(G=>!G||!G.itemName?"":`${G.itemQuantity>1?`${G.itemQuantity} × `:""}${g(G.itemName)}`).filter(Boolean);z.length>0&&(T+=`
                                                    <div class="tooltip-addon-group-row">
                                                        <span class="addon-group-items">↳ ${z.join(", ")}</span>
                                                    </div>
                                                `)}}),T+="</div>"),T+="</li>")}),T+="</ul>"):b.selected_addons&&typeof b.selected_addons=="object"&&Object.keys(b.selected_addons).length>0&&(T+='<div class="tooltip-addon-groups-wrapper">',Object.entries(b.selected_addons).forEach(([M,J])=>{if(J&&J.items&&typeof J.items=="object"&&Object.keys(J.items).length>0){const R=Object.values(J.items).map(z=>!z||!z.itemName?"":`${z.itemQuantity>1?`${z.itemQuantity} × `:""}${g(z.itemName)}`).filter(Boolean);R.length>0&&(T+=`
                                            <div class="tooltip-addon-group-row">
                                                <span class="addon-group-items">↳ ${R.join(", ")}</span>
                                            </div>
                                        `)}}),T+="</div>");const re=g(b.product_name||b.name||"Item desconhecido"),De=T?`<div class="tooltip-item-details-wrapper">${T}</div>`:"",Ie=`
                        <td class="order-item-name-cell">
                            <strong>${E} × ${re}</strong>
                            ${P}
                            ${ne}
                            ${De}
                        </td>`,Le=`<td class="order-item-price-cell">${I(H)}</td>`;return`<tr class="order-item-row">${Ie}${Le}</tr>`}).join(""):N='<tr><td colspan="2">Nenhum item encontrado.</td></tr>'}catch(v){console.error(`Erro ao processar JSON de itens para o pedido #${e==null?void 0:e.id}:`,v,"JSON String:",s==null?void 0:s.pedido_itens_json),N='<tr><td colspan="2">Erro ao exibir itens.</td></tr>'}const j={pendente:{slug:"recebido",label:"Receber"},recebido:{slug:"aceito",label:"Aceitar"},aceito:{slug:"pronto",label:"Pronto"},pronto:{slug:s.pedido_tipo_servico==="delivery"?"enviado":"finalizado",label:s.pedido_tipo_servico==="delivery"?"Enviar":"Finalizar"},enviado:{slug:"finalizado",label:"Finalizar"}};let S='<div class="actions-wrapper">';if(S+=`
        <button class="order-actions-button" data-action="print-kitchen" data-order-id="${e.id}" title="Imprimir para Cozinha">
            <span class="material-symbols-rounded">print</span> Cozinha
        </button>
        <button class="order-actions-button" data-action="print-courier" data-order-id="${e.id}" title="Imprimir Geral">
            <span class="material-symbols-rounded">receipt_long</span> Geral
        </button>
    `,c.length>=10){const v=encodeURIComponent(`Olá! Sobre o seu pedido #${e.id}:`),C=`https://wa.me/55${c}?text=${v}`;S+=`<a href="${C}" target="_blank" class="order-actions-button contact-customer-btn"><span class="material-symbols-rounded">chat</span></a>`}else S+='<button disabled class="order-actions-button contact-customer-btn" title="Cliente não possui número de telefone cadastrado."><span class="material-symbols-rounded">chat_error</span>Contato</button>';if((e.payment_status==="manual_pending"||e.payment_status==="failed_generation"||e.status_slug==="aguardando-pagamento")&&(S+=`<button class="order-actions-button payment-status-btn" data-action="recognize-payment" data-order-id="${e.id}"><span class="material-symbols-rounded">check</span></button>`),["paid","refunded"].includes(e.payment_status)&&e.status_slug==="cancelado"){const v=e.payment_status==="refunded"?"Desfazer Est.":"Estornar",C=e.payment_status==="refunded"?"active cancel-action":"cancel-action";S+=`<button class="order-actions-button ${C}" data-action="refund-status" data-order-id="${e.id}"><span class="material-symbols-rounded">undo</span>${v}</button>`}const V=j[e.status_slug];if(V){const v=e.status_slug==="pendente"?" is-shaking":"";S+=`<button class="order-actions-button primary-action${v}" data-action="status-change" data-order-id="${e.id}" data-next-status="${V.slug}"><span class="material-symbols-rounded">arrow_forward</span>${V.label}</button>`}const ue=e.notification_urls?e.notification_urls[e.status_slug]:null;if(ue){const v=sessionStorage.getItem(`notified_${e.id}_${e.status_slug}`)==="true",C=v?"check":"notifications",b=v?"Notificado":"Notificar";S+=`<button class="order-actions-button notify-customer-btn ${v?"active":""}" data-action="notify-customer" data-url="${ue}" data-order-id="${e.id}" data-status="${e.status_slug}"><span class="material-symbols-rounded">${C}</span>${b}</button>`}if(q){const v=e.delivery_notification_data||"",C=v?"Copiar mensagem p/ entregador":"Dados de entrega não disponíveis para cópia";S+=`<button class="order-actions-button notify-delivery-btn" data-action="notify-delivery" data-order-id="${e.id}" data-copy-text="${encodeURI(v)}" title="${C}"><span class="material-symbols-rounded">send</span></button>`}return D&&(S+=D),["finalizado","cancelado"].includes(e.status_slug)||(S+=`<button class="order-actions-button cancel-action" data-action="status-change" data-order-id="${e.id}" data-next-status="cancelado"><span class="material-symbols-rounded">cancel</span></button>`),S+="</div>",`<div class="details-tooltip-content" style="display: flex; gap: 16px;">
                <div class="tooltip-column" style="flex-basis: 20%;">
                    <h4>Dados do Cliente</h4>
                    ${u}
                </div>
                <div class="tooltip-column" style="flex-basis: 20%;">
                    ${A}
                    ${B}
                </div>
                <div class="tooltip-column" style="flex-basis: 40%;">
                    <h4>Itens do Pedido (${L})</h4>
                    <table class="tooltip-items-table"><tbody>${N}</tbody></table>
                </div>
                <div class="tooltip-column tooltip-actions-column" style="flex-basis: 20%; min-width: 150px;">
                    <h4>Ações do Pedido</h4>
                    ${S}
                </div>
            </div>`},de=e=>{const t=e.dataset.orderId,s=n.allOrders.find(l=>l.id==t);if(!s){console.warn(`Pedido com ID ${t} não encontrado no estado.`);return}if(n.activeTooltip&&(n.activeTooltip.tooltipRow&&n.activeTooltip.tooltipRow.parentNode&&n.activeTooltip.tooltipRow.remove(),n.activeTooltip.row&&n.activeTooltip.row.parentNode&&n.activeTooltip.row.classList.remove("is-expanded"),n.activeTooltip.row===e)){n.activeTooltip=null;return}const i=document.createElement("tr");i.className="details-tooltip-row";const o=document.createElement("td");o.colSpan=7,o.innerHTML=we(s),i.appendChild(o);const a=o.querySelector(".show-map-button");a&&a.addEventListener("click",Me),e.parentNode.insertBefore(i,e.nextSibling),e.classList.add("is-expanded"),n.activeTooltip={row:e,tooltipRow:i}},Z=(e,t=!0)=>{const s=document.getElementById("pedidos-table-container");if(!s){console.error("Container da tabela '#pedidos-table-container' não encontrado.");return}if(t&&(s.innerHTML="",n.activeTooltip&&n.activeTooltip.tooltipRow&&n.activeTooltip.tooltipRow.parentNode&&(n.activeTooltip.tooltipRow.remove(),n.activeTooltip.row&&n.activeTooltip.row.classList.remove("is-expanded"),n.activeTooltip=null)),!e||e.length===0){t&&(s.innerHTML='<div class="no-orders-message"><span class="material-symbols-rounded">shopping_cart_off</span><p>Nenhum pedido encontrado para o filtro selecionado.</p></div>');return}let i=s.querySelector(".pedidos-table");i||(i=document.createElement("table"),i.className="pedidos-table",i.innerHTML="<thead><tr><th>Pedido</th><th>Tempo</th><th>Cliente</th><th>Status</th><th>Pagamento</th><th>Entregador</th><th>Total</th></tr></thead><tbody></tbody>",s.appendChild(i));const o=i.querySelector("tbody");if(!o){console.error("Elemento tbody não encontrado na tabela.");return}t&&(o.innerHTML=""),e.forEach(a=>{var B,N,L,j;if(!t&&o.querySelector(`tr[data-order-id="${a.id}"]`))return;const l=document.createElement("tr");l.dataset.orderId=a.id,(a.status_slug==="pendente"||a.status_slug==="aguardando-pagamento")&&l.classList.add("is-pending");let c="";a.status_slug==="aguardando-pagamento"?c='<div class="status-badge status-aguardando-pagamento">Aguardando Pagamento</div>':c=`<div class="status-badge status-${a.status_slug}">${g(a.status)}</div>`;const p=`<div class="order-status-cell">${c}</div>`,u=((N=(B=a.details)==null?void 0:B.pedido_entregador_designado)==null?void 0:N.ID)||"0",d=(n.allEntregadores||[]).map(S=>`<option value="${S.id}" ${S.id==u?"selected":""}>${g(S.name)}</option>`).join(""),r=`<select class="entregador-select" data-order-id="${a.id}" data-original-value="${u}"> <option value="0">Nenhum</option>${d}</select>`,f=`<span class="order-time-ago" data-timestamp="${a.timestamp}">${_e(a.timestamp)}</span>`;let m=((L=a.details)==null?void 0:L.pedido_metodo_pagamento)||"N/A";const A=n.allPaymentMethodsData.find(S=>S.slug===m),x=A?A.categoria:null;m==="pix-sicredi"&&a.payment_status==="failed_generation"&&(m="pix-fallback");let O=g(n.allPaymentMethods[m]||m),_="";(m==="pix-sicredi"||x==="pix_automatico")&&(a.payment_status==="paid"?_=" 🟢":a.payment_status==="expired"?_=" 🔴":(a.payment_status==="awaiting_api"||a.payment_status==="manual_pending"||a.payment_status==="pending"||a.payment_status==="failed_generation")&&(_=" 🟡"));const h=O+_,w=((j=a.details)==null?void 0:j.pedido_tipo_servico)||"N/A",D=xe[w]||{name:w,icon:"help"},q=`
            <span class="modality-icon-wrapper" title="${g(D.name)}">
                 <span class="material-symbols-rounded">${D.icon}</span>
            </span>
        `;l.innerHTML=`
            <td data-label="Pedido">#${a.id} ${q}</td>
            <td data-label="Tempo">${f}</td>
            <td data-label="Cliente">${g(a.customer_name||"")}</td>
            <td data-label="Status">${p}</td>
            <td data-label="Pagamento">${h}</td>
            <td data-label="Entregador">${r}</td>
            <td data-label="Total"><strong>${g(a.total||"R$ 0,00")}</strong></td>
        `,o.appendChild(l)}),Fe()},$e=()=>{const e=document.getElementById("status-filter-container");if(!e){console.warn("Container do filtro de status não encontrado.");return}if(!n.allStatuses||n.allStatuses.length===0){e.innerHTML="";return}const t=n.allStatuses.map(a=>`<div class="status-filter-item">
                    <label for="status-${a.slug}" class="status-filter-item-label">${g(a.name)}</label>
                    <div class="nativa-toggle-switch is-small">
                        <div class="nativa-toggle-control">
                            <input type="checkbox" id="status-${a.slug}" class="filter-checkbox" data-filter-type="status" value="${a.slug}">
                            <label for="status-${a.slug}" class="nativa-toggle-ui"></label>
                        </div>
                    </div>
                </div>`).join(""),i=[{slug:"all",name:"Todas"},{slug:"delivery",name:"Entrega"},{slug:"pickup",name:"Retirada"},{slug:"table",name:"Na Mesa"}].map(a=>`<div class="status-filter-item">
                    <label for="modality-${a.slug}" class="status-filter-item-label">${g(a.name)}</label>
                    <div class="nativa-toggle-switch is-small">
                        <div class="nativa-toggle-control">
                            <input type="checkbox" id="modality-${a.slug}" class="filter-checkbox" data-filter-type="modality" value="${a.slug}">
                            <label for="modality-${a.slug}" class="nativa-toggle-ui"></label>
                        </div>
                    </div>
                </div>`).join(""),o=n.allStatuses.length;e.innerHTML=`
        <button class="status-filter-dropdown-button icon-only-button" aria-haspopup="true" aria-expanded="false">
            <span class="material-symbols-rounded">filter_list</span>
            <span class="button-text">Filtrar (${o})</span>
        </button>
        <div class="status-filter-dropdown-panel">
            <div class="status-filter-columns">
                <div class="status-filter-column statuses">
                    <h5>Status</h5>
                    ${t}
                </div>
                <div class="status-filter-column modalities">
                    <h5>Modalidade</h5>
                    ${i}
                </div>
            </div>
        </div>`},Re=Object.freeze(Object.defineProperty({__proto__:null,createTooltipContent:we,renderOrdersTable:Z,renderStatusFilter:$e,toggleTooltip:de},Symbol.toStringTag,{value:"Module"})),pe=window.nativaDeliveryData||{},me=pe.ajax_url,ze=pe.ajax_nonce;async function U(e,t={}){var i;if(!me){const o="Erro crítico: A URL do servidor não foi encontrada. O dashboard não pode funcionar.";throw console.error(o,"Objeto de configuração recebido:",pe),$(o,"error"),new Error(o)}const s=new FormData;s.append("action",`nativa_delivery_${e}`),s.append("nativa_delivery_nonce",ze);for(const o in t)Object.prototype.hasOwnProperty.call(t,o)&&(typeof t[o]=="object"&&t[o]!==null?s.append(o,JSON.stringify(t[o])):s.append(o,t[o]));try{const o=await fetch(me,{method:"POST",body:s});if(!o.ok){let l=`Erro ${o.status}: ${o.statusText}`;try{const p=(await o.text()).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();p&&(l=p),o.status===403&&(l+=" (Possível problema de permissão ou sessão expirada. Tente recarregar a página.)")}catch(c){console.warn("Não foi possível ler o corpo da resposta de erro.",c)}throw new Error(l)}const a=await o.json();if(!a.success)throw new Error(((i=a.data)==null?void 0:i.message)||a.data||"O servidor retornou um erro inesperado.");return a.data}catch(o){throw console.error(`Erro na chamada AJAX para '${e}':`,o),$(o.message||"Erro de comunicação com o servidor.","error"),o}}const qe=async e=>await U("save_dashboard_push_subscription",{subscription:e}),je=async(e="today")=>await U("get_orders",{date_filter:e}),He=async e=>await U("get_updated_orders",{last_check_timestamp:e}),Ue=async(e,t)=>await U("update_order_status",{order_id:e,new_status:t}),Be=async(e,t)=>await U("assign_entregador",{order_id:e,entregador_id:t}),Je=async(e,t)=>await U("update_payment_refund_status",{order_id:e,new_state:t}),Ge=async e=>await U("recognize_payment",{order_id:e}),ee=10;function fe(e){if(n.currentlyDisplayedOrders.length>=n.currentFilteredOrders.length){te(e);return}const t=n.currentFilteredOrders.slice(n.currentlyDisplayedOrders.length,n.currentlyDisplayedOrders.length+ee);n.currentlyDisplayedOrders.push(...t),e.tableContainer&&Z(t,!1),te(e)}function te(e){if(!e.tableContainer)return;let t=document.getElementById("load-more-container");if(t||(t=document.createElement("div"),t.id="load-more-container",e.tableContainer.parentNode.insertBefore(t,e.tableContainer.nextSibling)),n.currentlyDisplayedOrders.length<n.currentFilteredOrders.length){const s=n.currentFilteredOrders.length-n.currentlyDisplayedOrders.length,i=Math.min(s,ee);t.innerHTML=`<button id="load-more-btn" class="nativa-button-primary">Carregar Mais ${i} Pedido${i>1?"s":""}</button>`;const o=document.getElementById("load-more-btn");o&&(o.removeEventListener("click",()=>fe(e)),o.addEventListener("click",()=>fe(e)))}else t.innerHTML=""}const ge="nativa-dashboard-updates";let W=null,K=null;const Qe=document.title;let he=new Set;function Ke(e){const t="=".repeat((4-e.length%4)%4),s=(e+t).replace(/-/g,"+").replace(/_/g,"/"),i=window.atob(s),o=new Uint8Array(i.length);for(let a=0;a<i.length;++a)o[a]=i.charCodeAt(a);return o}async function Ve(){var t;const e=(t=window.nativaDeliveryData)==null?void 0:t.vapidPublicKey;if(!e){$("Chave de notificação não configurada no servidor.","error");return}try{const s=await Notification.requestPermission();if(s!=="granted"){$("Permissão para notificações não concedida.","info"),X(s);return}const i=await navigator.serviceWorker.getRegistration("/pedidos/");if(!i){$("Service Worker do dashboard não encontrado.","error");return}let o=await i.pushManager.getSubscription();if(o)console.log("Inscrição Push existente encontrada:",o);else{const a=Ke(e);o=await i.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:a}),console.log("Nova inscrição Push criada:",o)}await qe(o),$("Notificações ativadas para este dispositivo!","success"),X("granted")}catch(s){console.error("Erro ao inscrever para push do dashboard:",s),$("Não foi possível ativar as notificações. Verifique o console.","error"),X("default")}}function X(e){const t=document.getElementById("dashboard-push-toggle");t&&(t.querySelector(".button-text"),e==="granted"?(t.innerHTML='<span class="material-symbols-rounded">notifications_active</span><span class="button-text">Notificações Ativas</span>',t.classList.add("active"),t.classList.remove("is-denied"),t.disabled=!0,t.title="As notificações estão ativas para este dispositivo."):e==="denied"?(t.innerHTML='<span class="material-symbols-rounded">notifications_off</span><span class="button-text">Notificações Bloqueadas</span>',t.classList.add("is-denied"),t.classList.remove("active"),t.disabled=!1,t.title="As notificações foram bloqueadas. Clique para saber mais."):(t.innerHTML='<span class="material-symbols-rounded">add_alert</span><span class="button-text">Ativar Notificações</span>',t.classList.remove("active","is-denied"),t.disabled=!1,t.title="Clique para ativar notificações de novos pedidos."))}function We(){const e=document.querySelector(".header-actions");if(!e)return;if(!("serviceWorker"in navigator)||!("PushManager"in window)){console.warn("Push Notifications não são suportadas neste navegador.");return}let t=document.getElementById("dashboard-push-toggle");t||(t=document.createElement("button"),t.id="dashboard-push-toggle",t.className="header-button icon-only",e.appendChild(t)),X(Notification.permission),t.addEventListener("click",()=>{Notification.permission==="prompt"||Notification.permission==="default"?Ve():Notification.permission==="denied"&&Q({title:"Notificações Bloqueadas",iconName:"notifications_off",message:`Você bloqueou as notificações para este site.

Para reativá-las, procure pelas configurações de notificação do seu navegador e permita as notificações para este endereço.`,confirmText:"Entendi"})})}function Ye(e){if(!window.BroadcastChannel){console.warn("BroadcastChannel não é suportado neste navegador. As atualizações em tempo real entre abas podem não funcionar.");return}W&&W.close(),W=new BroadcastChannel(ge),console.log("[Dashboard Notifications] Ouvindo mensagens no BroadcastChannel:",ge),W.onmessage=t=>{console.log("[Dashboard Notifications] Mensagem recebida via BroadcastChannel:",t.data),t.data&&t.data.type==="order_update"&&(console.log("[Dashboard Notifications] Mensagem de order_update recebida. Acionando callback..."),e())},W.onmessageerror=t=>{console.error("[Dashboard Notifications] Erro ao receber mensagem via BroadcastChannel:",t)}}function Xe(e){var a;if(!("Notification"in window)||Notification.permission!=="granted"||!Array.isArray(e)||e.length===0)return;const t=e[0];if(!t||!t.id||!t.customer_name){console.warn("Dados incompletos para notificação nativa.");return}const s=`Novo Pedido Recebido (#${t.id})!`,i=e.length>1?`Você recebeu ${e.length} novos pedidos.`:`Novo pedido de ${t.customer_name}.`,o=(a=window.nativaDeliveryData)!=null&&a.pluginUrl?window.nativaDeliveryData.pluginUrl+"assets/icons/dashboard/icon-192x192.png":"/wp-content/plugins/nativa-delivery/assets/icons/dashboard/icon-192x192.png";new Notification(s,{body:i,icon:o,tag:"nativa-delivery-novo-pedido",renotify:!0})}function ae(e){const t=n.currentFilteredOrders;if(!Array.isArray(t))return;const s=t.filter(a=>a.status==="pendente"||a.status==="aguardando-pagamento"),i=new Set(s.map(a=>a.id)),o=s.filter(a=>!he.has(a.id));o.length>0&&K&&n.isAutoRefreshActive&&(console.log("[Dashboard Notifications] Novo(s) pedido(s) pendente(s) detectado(s). Tocando som..."),K.play().catch(a=>console.warn("Não foi possível tocar o áudio de notificação:",a))),!e&&o.length>0&&Xe(o),document.title=s.length>0?`(${s.length}) Novo(s) Pedido(s)!`:Qe,he=i}function Ze(){const e=document.getElementById("nativa-notification-sound");if(e){K=e;const t=()=>{K&&K.play().then(()=>{K.pause(),document.removeEventListener("click",t,!0),document.removeEventListener("touchstart",t,!0),console.log("[Dashboard Notifications] Áudio desbloqueado para autoplay.")}).catch(()=>{console.warn("[Dashboard Notifications] Autoplay do áudio possivelmente bloqueado. Aguardando interação.")})};t(),document.addEventListener("click",t,{once:!0,capture:!0}),document.addEventListener("touchstart",t,{once:!0,capture:!0})}else console.error("[Dashboard Notifications] Elemento de áudio para notificação não encontrado.")}const ce="nativaPedidosFilters";function et(e){var d,r,f;const t=(d=e.statusFilterContainer)==null?void 0:d.querySelectorAll('input[data-filter-type="status"]:checked'),s=(r=e.statusFilterContainer)==null?void 0:r.querySelectorAll('input[data-filter-type="modality"]:checked'),i=(f=e.dateFilterGroup)==null?void 0:f.querySelector(".is-active"),o=e.searchTermInput,a=t?[...t].map(m=>m.value):[];let l=s?[...s].map(m=>m.value):[];l.includes("all")||l.length===0?l=["all"]:l.length>1&&l.includes("all")&&(l=l.filter(m=>m!=="all"));const c=(i==null?void 0:i.dataset.filter)||"today",p=(o==null?void 0:o.value)||"",u={statuses:a,modalities:l,date:c,search:p};try{sessionStorage.setItem(ce,JSON.stringify(u))}catch(m){console.error("Erro ao salvar filtros na sessionStorage:",m)}}function Se(e){const t=sessionStorage.getItem(ce);if(!t)return null;try{const s=JSON.parse(t);if(console.log("[SONDA _loadFiltersFromSession] Filtros carregados:",JSON.parse(JSON.stringify(s))),s.date&&e.dateFilterGroup?e.dateFilterGroup.querySelectorAll(".nativa-toggle-button").forEach(i=>{i.classList.toggle("is-active",i.dataset.filter===s.date)}):e.dateFilterGroup&&e.dateFilterGroup.querySelectorAll(".nativa-toggle-button").forEach(i=>{i.classList.toggle("is-active",i.dataset.filter==="today")}),e.statusFilterContainer){e.statusFilterContainer.querySelectorAll('input[data-filter-type="status"]').forEach(a=>{var l;a.checked=((l=s.statuses)==null?void 0:l.includes(a.value))??!1});const i=s.modalities??["all"],o=i.includes("all");e.statusFilterContainer.querySelectorAll('input[data-filter-type="modality"]').forEach(a=>{a.value==="all"?a.checked=o:a.checked=!o&&i.includes(a.value)}),Ce(null,e)}return e.searchTermInput&&(e.searchTermInput.value=s.search||""),s}catch(s){return console.error("Erro ao carregar filtros da sessão:",s),sessionStorage.removeItem(ce),null}}function oe(e,t=!0){var p,u;if(console.log("[SONDA applyFiltersAndRender] Iniciando..."),!e.statusFilterContainer||!e.dateFilterGroup||!e.searchTermInput){console.warn("Elementos de filtro não encontrados, pulando aplicação de filtros."),n.currentFilteredOrders=[...n.allOrders].sort((d,r)=>r.id-d.id),console.log("[SONDA applyFiltersAndRender] Sem controles de filtro, usando state.allOrders:",JSON.parse(JSON.stringify(n.currentFilteredOrders))),n.currentlyDisplayedOrders=n.currentFilteredOrders.slice(0,ee),e.tableContainer&&Z(n.currentlyDisplayedOrders,!0),te(e),ae(n.currentFilteredOrders);return}const s=e.statusFilterContainer.querySelectorAll('input[data-filter-type="status"]:checked'),i=e.statusFilterContainer.querySelectorAll('input[data-filter-type="modality"]:checked'),o=e.searchTermInput.value.toLowerCase().trim(),a=((u=(p=e.dateFilterGroup)==null?void 0:p.querySelector(".is-active"))==null?void 0:u.dataset.filter)||"default";console.log("[SONDA applyFiltersAndRender] Filtro de data da UI:",a);const l=[...s].map(d=>d.value);let c=[...i].map(d=>d.value);(c.includes("all")||c.length===0)&&(c=["all"]),console.log("[SONDA applyFiltersAndRender] Filtros aplicados:",{selectedStatuses:l,selectedModalities:c,searchTerm:o}),console.log("[SONDA applyFiltersAndRender] state.allOrders ANTES de filtrar:",JSON.parse(JSON.stringify(n.allOrders))),n.currentFilteredOrders=n.allOrders.filter(d=>{if(!d||!d.details)return!1;const r=l.length===0||l.includes(d.status),f=c.includes("all")||c.includes(d.details.pedido_tipo_servico),m=(d.customer_name||"").split(" ")[0].toLowerCase(),A=(d.details.pedido_whatsapp_cliente||"").replace(/\D/g,""),x=!o||m.includes(o)||String(d.id).includes(o)||A.includes(o);return r&&f&&x}).sort((d,r)=>r.id-d.id),console.log("[SONDA applyFiltersAndRender] state.currentFilteredOrders DEPOIS de filtrar:",JSON.parse(JSON.stringify(n.currentFilteredOrders))),n.currentlyDisplayedOrders=n.currentFilteredOrders.slice(0,ee),console.log("[SONDA applyFiltersAndRender] state.currentlyDisplayedOrders (batch inicial):",JSON.parse(JSON.stringify(n.currentlyDisplayedOrders))),e.tableContainer?Z(n.currentlyDisplayedOrders,t):console.error("[SONDA applyFiltersAndRender] Erro: selectors.tableContainer não encontrado para renderizar a tabela."),te(e),et(e),ae(n.currentFilteredOrders)}function Ce(e=null,t){var l;const s=(l=t.statusFilterContainer)==null?void 0:l.querySelector(".status-filter-dropdown-panel");if(!s)return;const i=s.querySelector("#modality-all"),o=s.querySelectorAll('input[data-filter-type="modality"]:not(#modality-all)');if(!i)return;let a=!1;if(e===i?i.checked?o.forEach(c=>{c.checked&&(c.checked=!1,a=!0)}):i.checked=!0:e&&e.dataset.filterType==="modality"?e.checked?i.checked&&(i.checked=!1,a=!0):a=!0:e||(a=!0),a){const c=[...o].some(p=>p.checked);!c&&!i.checked?i.checked=!0:c&&i.checked&&(i.checked=!1)}}function tt(e){var s;const t=(s=e.statusFilterContainer)==null?void 0:s.querySelector(".status-filter-dropdown-panel");t&&(t.removeEventListener("change",ye),t.addEventListener("change",ye))}function ye(e){const t={statusFilterContainer:document.getElementById("status-filter-container"),dateFilterGroup:document.getElementById("date-filter-group"),searchTermInput:document.getElementById("search-term"),tableContainer:document.getElementById("pedidos-table-container")},s=e.target.closest("input.filter-checkbox");s&&(s.dataset.filterType==="modality"&&Ce(s,t),oe(t,!0))}let k={};async function F(e=!1,t="today",s=!1,i){var o;k=i,console.log("[SONDA fetchData] Iniciando...",{isFullReload:e,dateFilter:t}),s&&e&&k.tableContainer&&(k.tableContainer.innerHTML='<div class="dashboard-loader"><span class="material-symbols-rounded is-loading">hourglass_top</span><span>Carregando pedidos...</span></div>');try{let a,l=!1;if(e)a=await je(t),console.log(`[SONDA fetchData] Dados recebidos (full reload, filter=${t}):`,JSON.parse(JSON.stringify(a))),n.allOrders=Array.isArray(a.orders)?a.orders:[],Array.isArray(a.orders)||console.warn("[SONDA fetchData] Atenção: API não retornou um array para data.orders em full reload."),n.allStatuses=a.statuses||[],n.allEntregadores=a.entregadores||[],n.allPaymentMethods=a.payment_methods_map||{},n.allPaymentMethodsData=a.payment_methods_data||[],n.lastCheckTimestamp=a.server_timestamp,l=!0,s&&k.statusFilterContainer&&($e(),Se(k),tt(k));else{a=await He(n.lastCheckTimestamp),console.log("[SONDA fetchData] Atualizações recebidas:",JSON.parse(JSON.stringify(a)));const c=a.updated_orders||[],p=a.deleted_order_ids||[];if(p.length>0){const u=n.allOrders.length;n.allOrders=n.allOrders.filter(d=>!p.includes(String(d.id))),n.allOrders.length!==u&&(l=!0)}if(c.length>0&&(l=!0,c.forEach(d=>{const r=String(d.id),f=n.allOrders.findIndex(m=>String(m.id)==r);f>-1?JSON.stringify(n.allOrders[f])!==JSON.stringify(d)&&(n.allOrders[f]=d):n.allOrders.push(d)}),c.some(d=>!n.allOrders.find(r=>String(r.id)===String(d.id)))?(console.log("[SONDA fetchData] Novos pedidos adicionados, reordenando state.allOrders..."),n.allOrders.sort((d,r)=>r.id-d.id)):console.log("[SONDA fetchData] Apenas atualizações, sem reordenar state.allOrders.")),n.lastCheckTimestamp=a.server_timestamp,!l){oe(k,!1),console.log("[SONDA fetchData] Nenhuma alteração detectada nas atualizações.");return}}console.log("[SONDA fetchData] state.allOrders atualizado:",JSON.parse(JSON.stringify(n.allOrders))),oe(k,!0)}catch(a){if(console.error("Erro ao buscar dados do dashboard:",a),a&&a.status===403){console.warn("Erro 403 detectado. Tentando redirecionar para login...");const l=(o=window.nativaDeliveryData)==null?void 0:o.login_url;if(l){window.location.href=l;return}else console.error("URL de login não encontrada em window.nativaDeliveryData. Exibindo erro padrão."),s&&e&&k.tableContainer&&(k.tableContainer.innerHTML='<p style="color: red; text-align: center; padding: 20px;">Falha ao carregar pedidos: Sessão inválida ou expirada. Por favor, <a href="javascript:location.reload();">recarregue a página</a> para fazer login.</p>')}else s&&e&&k.tableContainer&&(k.tableContainer.innerHTML=`<p style="color: red; text-align: center; padding: 20px;">Falha ao carregar pedidos: ${a.message}</p>`);throw a}}const at=`
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet">
`,ot=`
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
`;function Ae(e){return`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Imprimir</title>${at}<style>${ot}</style></head><body class="nativa-print-body">${e}</body></html>`}async function Oe(e){try{const t=new AbortController,s=setTimeout(()=>t.abort(),1e4),i=await fetch("http://localhost:4000/imprimir",{method:"POST",headers:{"Content-Type":"text/html"},body:e,signal:t.signal});if(clearTimeout(s),i.ok)console.log("✅ Enviado servidor local");else throw new Error("Erro servidor")}catch(t){console.warn("⚠️ Fallback",t),st(e)}}function st(e){const t=window.open("","_blank","width=450,height=600");t?(t.document.write(e),t.document.close(),t.focus(),setTimeout(()=>t.print(),1e3)):alert("Pop-up bloqueado.")}function Te(e){return e?new Date(e*1e3).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}):"Data n/a"}function Ne(e){return({delivery:"DELIVERY",pickup:"RETIRADA",table:"MESA"}[e]||e).toUpperCase()}function it(e){const t=e.details.pedido_endereco||{};if(!t.pedido_rua)return"";const s=u=>{try{return decodeURIComponent(u.replace(/\+/g," "))}catch{return u}},i=s(t.pedido_rua).toUpperCase(),o=s(t.pedido_numero).toUpperCase()||"S/N",a=s(t.pedido_bairro).toUpperCase(),l=s(t.pedido_complemento).toUpperCase(),c=`${i}, ${o} - ${a}`,p=l?`<div style="font-weight: 700; font-size: 13px; margin-top: 2px;">${l}</div>`:"";return`<div style="text-align: center; margin-top:5px; font-size: 15px; line-height: 1.4; color: #000; font-weight: 700;">${c}${p}</div>`}function nt(e,t,s=""){const i=`#${e.id}`,o=Ne(e.details.pedido_tipo_servico),a=`${i} | ${o}`,l=(e.details.pedido_nome_cliente||e.customer_name||"Cliente").toUpperCase();return`
        <div class="print-logo-container"><img src="${t}" alt="Logo" onerror="this.style.display='none'"></div>
        <div class="text-center text-xl text-bold">${a}</div>
        <div class="text-center" style="font-size: 14px; margin-top: 4px; color: #000; font-weight: 700;">${Te(e.timestamp)}${s}</div>
        <div class="separator"></div>
        <div class="customer-name-centered">${l}</div>
    `}function rt(e,t,s){const i=`#${e.id}`,o=Ne(e.details.pedido_tipo_servico),a=(e.details.pedido_nome_cliente||e.customer_name||"Cliente").toUpperCase(),c=`${Te(e.timestamp)} | ${s}`;return`
        <div class="kitchen-header-row">
            <div class="kh-logo">
                <img src="${t}" alt="Logo" onerror="this.style.display='none'">
            </div>
            <div class="kh-info">
                <div class="text-xl text-bold" style="line-height: 1.1;">${i} | ${o}</div>
                <div class="kh-meta-line">${c}</div>
            </div>
        </div>
        <div class="separator"></div>
        <div class="customer-name-centered">${a}</div>
    `}function lt(){return'<span class="material-symbols-rounded" style="color: #000 !important; font-weight: 700;">subdirectory_arrow_right</span>'}function ve(e,t=null){var u;if(!e||!e.details)return;let s={};try{s=JSON.parse(e.details.pedido_itens_json||"{}")}catch(d){console.error(d);return}const i=Object.entries(s);let o=0;if(i.forEach(([d,r])=>{o+=parseInt(r.quantity,10)||1}),o===0)return;let a=((u=window.nativaDeliveryData)==null?void 0:u.pluginUrl)||"";a&&!a.endsWith("/")&&(a+="/");const l=`${a}assets/svg/nativa_mono.svg`;let c="",p=0;i.forEach(([d,r])=>{const f=parseInt(r.quantity,10)||1,m=r.product_name||r.name,A=t?t.includes(d):!0;let x="";const O=(_,h)=>{const w=h>1?`<strong>${h}&times;</strong> `:"";return`<div class="addon-line">${lt()}<span>${w}${_}</span></div>`};r.is_combo&&Array.isArray(r.selections)?r.selections.forEach(_=>{x+=`<div style="margin-top:4px;">• ${_.productName}</div>`,_.selectedAddons&&Object.values(_.selectedAddons).forEach(h=>{Object.values(h.items||{}).forEach(w=>{x+=O(w.itemName,parseInt(w.itemQuantity,10))})})}):r.selected_addons&&Object.values(r.selected_addons).forEach(_=>{Object.values(_.items||{}).forEach(h=>{x+=O(h.itemName,parseInt(h.itemQuantity,10))})}),r.observacoes&&(x+=`<div style="margin-top:5px; font-style:italic; font-size: 0.8em; color: #000; font-weight: 700;">OBS: ${r.observacoes}</div>`);for(let _=0;_<f;_++)if(p++,A){const h=`ITEM ${p}/${o}`,w=rt(e,l,h);c+=`
                <div class="kitchen-ticket">
                    ${w}
                    <div class="double-separator"></div>
                    <div>
                        <div class="kitchen-item-name">${m}</div>
                        <div class="kitchen-item-addons">${x}</div>
                    </div>
                </div>`}}),c&&Oe(Ae(c))}function dt(e){var O,_;if(!e||!e.details)return;let t=((O=window.nativaDeliveryData)==null?void 0:O.pluginUrl)||"";t&&!t.endsWith("/")&&(t+="/");const s=`${t}assets/svg/nativa_logo.svg`;let i=nt(e,s);e.details.pedido_tipo_servico==="delivery"&&(i+=it(e));let o=[];try{o=Object.values(JSON.parse(e.details.pedido_itens_json||"{}"))}catch{o=[]}let a='<div class="double-separator"></div>',l=0;o.forEach((h,w)=>{const D=parseFloat(h.total_item_price||0),q=parseInt(h.quantity,10)||1;l+=q;const B=`<strong>${q}&times;</strong>`;a+=`
            <div class="item-row">
                <div class="item-name-col">
                    <span class="item-checkbox"></span>
                    <span>${B} ${h.product_name||h.name}</span>
                </div>
                <div class="item-price-col">${I(D)}</div>
            </div>
        `;let N=[];h.is_combo&&h.selections?h.selections.forEach(L=>N.push(L.productName)):h.selected_addons&&Object.values(h.selected_addons).forEach(L=>{Object.values(L.items||{}).forEach(j=>{const S=parseInt(j.itemQuantity,10),V=S>1?`${S}&times; `:"";N.push(`${V}${j.itemName}`)})}),N.length>0&&(a+=`<div class="item-addons-courier">(${N.join(", ")})</div>`),w<o.length-1&&(a+='<div class="item-separator"></div>')});const c=parseFloat(e.details.pedido_subtotal||0),p=parseFloat(e.details.pedido_taxa_entrega||0),u=parseFloat(e.details.pedido_desconto||0);let d='<div class="separator"></div>';d+=`<div class="totals-row"><span>Qtd. Itens:</span><span>${l}</span></div>`,d+=`<div class="totals-row"><span>Subtotal:</span><span>${I(c)}</span></div>`,p>0&&(d+=`<div class="totals-row"><span>Entrega:</span><span>${I(p)}</span></div>`),u>0&&(d+=`<div class="totals-row"><span>Desconto:</span><span>-${I(u)}</span></div>`),d+=`<div class="totals-row text-lg text-bold" style="margin-top:2px;"><span>TOTAL:</span><span>${e.total}</span></div>`;const r=e.details.pedido_metodo_pagamento,f=((_=n.allPaymentMethods)==null?void 0:_[r])||r;let m="";if(r==="pix-sicredi"&&e.payment_status==="paid")m="PAGO (PIX)";else if(m=`A PAGAR: ${f.toUpperCase()}`,r==="dinheiro"){const h=parseFloat(e.details.pedido_troco_para||0),w=parseFloat(e.total.replace(/[^\d,]/g,"").replace(",","."));h>w?m+=`<br/>Troco p/: ${I(h)}<br/>Devolver: ${I(h-w)}`:m+="<br/>(SEM TROCO / VALOR EXATO)"}const A=`<div class="separator"></div><div class="text-center text-bold text-lg" style="color: #000;">${m}</div>`;Oe(Ae(`${i}${a}${d}${A}<div class="footer"><div class="separator"></div><p>(47) 3448-1082 | pastelarianativa.com.br</p></div>`))}const ke=()=>{if(!document.getElementById("nativa-dashboard-print-modal-styles")){const e=document.createElement("style");e.id="nativa-dashboard-print-modal-styles",e.innerHTML=`
            .nativa-modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background-color: rgba(0, 0, 0, 0.6); z-index: 10000;
                display: flex; justify-content: center; align-items: center;
                padding: 16px; box-sizing: border-box;
                opacity: 0; transition: opacity 0.2s ease-in-out;
                pointer-events: none;
            }
            .nativa-modal-overlay.is-visible { opacity: 1; pointer-events: auto; }
            .nativa-modal-dialog {
                background-color: #fff;
                background-color: var(--md-sys-color-surface, #fff);
                color: #000;
                color: var(--md-sys-color-on-surface, #000);
                padding: 24px; border-radius: 28px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                width: 100%; max-width: 500px;
                max-height: 90vh; overflow-y: auto;
                text-align: center;
                transform: scale(0.95); opacity: 0;
                transition: transform 0.2s ease-in-out, opacity 0.2s ease-in-out;
                display: flex; flex-direction: column; gap: 16px;
            }
            .nativa-modal-overlay.is-visible .nativa-modal-dialog {
                transform: scale(1); opacity: 1;
            }
            /* Botões dentro do modal */
            .nativa-modal-actions button {
                cursor: pointer;
            }
        `,document.head.appendChild(e),console.log("[SONDA ACTIONS] Estilos de modal injetados manualmente.")}};function ct(e){if(console.log("[SONDA ACTIONS] _openKitchenPrintModal iniciado. Pedido:",e),ke(),!e||!e.details){console.error("[SONDA ACTIONS] Erro: Objeto pedido inválido ou sem detalhes.",e),$("Dados do pedido incompletos.","error");return}let t={};try{console.log("[SONDA ACTIONS] Tentando parsear JSON de itens:",e.details.pedido_itens_json),t=JSON.parse(e.details.pedido_itens_json||"{}")}catch(d){console.error("[SONDA ACTIONS] Erro ao parsear JSON:",d),$("Erro ao ler itens do pedido.","error");return}const s=Object.keys(t);if(s.length===0){console.warn("[SONDA ACTIONS] Pedido sem itens (keys.length = 0)."),$("Pedido sem itens.","error");return}const i=document.createElement("div");i.className="nativa-modal-overlay",i.style.zIndex="10001";const o=document.createElement("div");o.className="nativa-modal-dialog",o.style.maxWidth="500px",o.style.textAlign="left";let a=`
        <div style="padding: 10px 10px 5px 10px; display: flex; align-items: center; gap: 10px; border-bottom: 2px solid var(--md-sys-color-outline-variant);">
            <input type="checkbox" id="kp-toggle-all" checked style="width: 20px; height: 20px; accent-color: var(--md-sys-color-primary); cursor: pointer;">
            <label for="kp-toggle-all" style="font-weight: bold; cursor: pointer; color: var(--md-sys-color-on-surface);">Selecionar/Desmarcar Todos</label>
        </div>
    `,l='<div class="kitchen-print-checklist" style="max-height: 400px; overflow-y: auto; margin: 0 0 10px 0; border: 1px solid var(--md-sys-color-outline-variant); border-top: none; border-radius: 0 0 8px 8px; padding: 10px;">';s.forEach(d=>{const r=t[d],f=r.product_name||r.name,m=parseInt(r.quantity,10)||1,A=m>1?`<strong>${m}x</strong> `:"";let x="";r.is_combo&&Array.isArray(r.selections)?r.selections.forEach(O=>{x+=`<div style="font-size: 0.85em; color: var(--md-sys-color-on-surface-variant); margin-left: 10px;">• ${g(O.productName)}</div>`,O.selectedAddons&&Object.values(O.selectedAddons).forEach(_=>{Object.values(_.items||{}).forEach(h=>{const w=parseInt(h.itemQuantity,10),D=w>1?`<strong>${w}x</strong> `:"";x+=`<div style="font-size: 0.85em; color: var(--md-sys-color-outline); margin-left: 20px;">+ ${D}${g(h.itemName)}</div>`})})}):r.selected_addons&&Object.values(r.selected_addons).forEach(O=>{Object.values(O.items||{}).forEach(_=>{const h=parseInt(_.itemQuantity,10),w=h>1?`<strong>${h}x</strong> `:"";x+=`<div style="font-size: 0.85em; color: var(--md-sys-color-on-surface-variant); margin-left: 10px;">+ ${w}${g(_.itemName)}</div>`})}),r.observacoes&&(x+=`<div style="font-size: 0.85em; color: var(--md-sys-color-on-surface-variant); margin-left: 10px; font-style: italic;">Obs: ${g(r.observacoes)}</div>`),l+=`
            <label style="display: flex; align-items: flex-start; gap: 10px; padding: 12px 0; border-bottom: 1px dashed var(--md-sys-color-outline-variant); cursor: pointer;">
                <input type="checkbox" class="kp-item-checkbox" value="${d}" checked style="width: 20px; height: 20px; accent-color: var(--md-sys-color-primary); margin-top: 4px; flex-shrink: 0;">
                <div style="display: flex; flex-direction: column; width: 100%;">
                    <span style="font-size: 1rem; color: var(--md-sys-color-on-surface); line-height: 1.4;">${A}${g(f)}</span>
                    ${x}
                </div>
            </label>
        `}),l+="</div>",o.innerHTML=`
        <h2 class="nativa-modal-title" style="text-align: center;">Imprimir Cozinha</h2>
        <p class="nativa-modal-message" style="text-align: center; margin-bottom: 5px;">Selecione os itens para impressão:</p>
        ${a}
        ${l}
        <div class="nativa-modal-actions" style="display: flex; justify-content: space-between; gap: 10px; margin-top: 15px;">
            <button id="kp-cancel" class="nativa-button-secondary" style="flex: 1;">Cancelar</button>
            <button id="kp-selected" class="nativa-button-primary" style="flex: 2;">Imprimir Selecionados</button>
            <button id="kp-all" class="nativa-button-secondary" style="flex: 1;" title="Imprimir todos independente da seleção">Tudo</button>
        </div>
    `,console.log("[SONDA ACTIONS] Appending kitchen modal to document.body"),i.appendChild(o),document.body.appendChild(i),requestAnimationFrame(()=>{i.classList.add("is-visible")});const c=o.querySelector("#kp-toggle-all"),p=o.querySelectorAll(".kp-item-checkbox");c.addEventListener("change",d=>{const r=d.target.checked;p.forEach(f=>{f.checked=r})}),p.forEach(d=>{d.addEventListener("change",()=>{const r=Array.from(p).every(m=>m.checked),f=Array.from(p).some(m=>m.checked);c.checked=r,c.indeterminate=f&&!r})});const u=()=>{i.classList.remove("is-visible"),setTimeout(()=>i.remove(),250)};o.querySelector("#kp-cancel").addEventListener("click",u),o.querySelector("#kp-all").addEventListener("click",()=>{ve(e,null),u()}),o.querySelector("#kp-selected").addEventListener("click",()=>{const d=o.querySelectorAll(".kp-item-checkbox:checked"),r=Array.from(d).map(f=>f.value);if(r.length===0){$("Nenhum item selecionado.","warning");return}ve(e,r),u()}),i.addEventListener("click",d=>{d.target===i&&u()})}function pt(e){console.log("[SONDA ACTIONS] _openCourierPrintModal iniciado. Pedido:",e),ke();const t=document.createElement("div");t.className="nativa-modal-overlay",t.style.zIndex="10001";const s=document.createElement("div");s.className="nativa-modal-dialog",s.innerHTML=`
        <span class="material-symbols-rounded nativa-modal-icon icon-big" style="font-size: 48px; color: var(--md-sys-color-outline); margin-bottom: 8px;">receipt_long</span>
        <h2 class="nativa-modal-title" style="margin: 0 0 8px 0; font-size: 1.5rem;">Imprimir Relatório Geral</h2>
        <div class="nativa-modal-message" style="margin-bottom: 16px;">Deseja imprimir o cupom geral (Motoboy/Cliente) para o pedido #${e.id}?</div>
        <div class="nativa-modal-actions" style="display: flex; gap: 8px; justify-content: center;">
            <button id="cp-cancel" class="nativa-button-secondary">Cancelar</button>
            <button id="cp-confirm" class="nativa-button-primary">Imprimir</button>
        </div>
    `,console.log("[SONDA ACTIONS] Appending courier modal to document.body"),t.appendChild(s),document.body.appendChild(t),requestAnimationFrame(()=>{t.classList.add("is-visible")});const i=()=>{t.classList.remove("is-visible"),setTimeout(()=>t.remove(),250)};s.querySelector("#cp-cancel").addEventListener("click",i),s.querySelector("#cp-confirm").addEventListener("click",()=>{dt(e),i()}),t.addEventListener("click",o=>{o.target===t&&i()})}async function ut(e,t,s){var p,u,d;const i=e.dataset.action,o=e.dataset.orderId,a=n.allOrders.find(r=>r.id==o),l=((u=(p=t.dateFilterGroup)==null?void 0:p.querySelector(".is-active"))==null?void 0:u.dataset.filter)||"today",c=e.innerHTML;switch(console.log("[SONDA ACTIONS] handleTooltipAction chamado. Ação:",i,"OrderId:",o),i){case"print-courier":{if(!a){console.error("[SONDA ACTIONS] Erro: Pedido não encontrado no state.allOrders para ID:",o),$("Erro: Pedido não encontrado.","error");return}console.log("[SONDA ACTIONS] Chamando _openCourierPrintModal..."),pt(a);break}case"print-kitchen":{if(!a){console.error("[SONDA ACTIONS] Erro: Pedido não encontrado no state.allOrders para ID:",o),$("Erro: Pedido não encontrado.","error");return}console.log("[SONDA ACTIONS] Chamando _openKitchenPrintModal..."),ct(a);break}case"status-change":{const r=e.dataset.nextStatus,f=n.allStatuses.find(x=>x.slug===r),m=(f==null?void 0:f.name)||r;if(await Q({title:"Confirmar Alteração",iconName:"published_with_changes",message:`Mudar status do pedido #${o} para "${m}"?`,confirmText:"Confirmar",cancelText:"Cancelar"})){e.disabled=!0,e.classList.add("is-loading");try{await Ue(o,r),await F(!0,l,!1,t),n.activeTooltip&&n.activeTooltip.row&&s.toggleTooltip(n.activeTooltip.row)}catch(x){$(`Erro: ${x.message}`,"error"),e.disabled=!1,e.classList.remove("is-loading"),e.innerHTML=c}}break}case"recognize-payment":{if(await Q({title:"Confirmar Pagamento",iconName:"price_check",message:`Confirmar recebimento PIX p/ pedido #${o}? (Irreversível)`,confirmText:"Confirmar",cancelText:"Cancelar",isCritical:!1})){e.disabled=!0,e.classList.add("is-loading");try{await Ge(o),await F(!0,l,!1,t),n.activeTooltip&&n.activeTooltip.row&&s.toggleTooltip(n.activeTooltip.row)}catch(f){$(`Erro: ${f.message}`,"error"),e.disabled=!1,e.classList.remove("is-loading"),e.innerHTML=c}}break}case"refund-status":{if(!a){$("Pedido não encontrado.","error");break}const r=a.payment_refunded;if(await Q({title:`Confirmar ${r?"Desfazer Estorno":"Estorno"}`,iconName:r?"undo":"credit_card_off",message:`Deseja ${r?"DESFAZER ESTORNO":"MARCAR COMO ESTORNADO"} o pagamento do pedido #${o}?`,confirmText:"Confirmar",cancelText:"Cancelar",isCritical:!r})){e.disabled=!0,e.classList.add("is-loading");try{await Je(o,!r),await F(!0,l,!1,t),n.activeTooltip&&n.activeTooltip.row&&s.toggleTooltip(n.activeTooltip.row)}catch(A){$(`Erro: ${A.message}`,"error"),e.disabled=!1,e.classList.remove("is-loading"),e.innerHTML=c}}break}case"notify-customer":{const r=e.dataset.url;if(!r){$("Link de notificação indisponível.","warning");break}const f=e.dataset.status,m=((d=n.allStatuses.find(x=>x.slug===f))==null?void 0:d.name)||f;await Q({title:"Notificar Cliente",iconName:"send",message:`Notificar cliente sobre status "${m}" do pedido #${o}?`,confirmText:"Notificar",cancelText:"Cancelar"})&&(window.open(r,"_blank"),sessionStorage.setItem(`notified_${o}_${f}`,"true"),e.classList.add("active"),e.innerHTML='<span class="material-symbols-rounded">check</span>Notificado');break}case"notify-delivery":{const r=decodeURI(e.dataset.copyText||"");r?be(r):$("Dados de entrega não encontrados para cópia.","error");break}}}async function mt(e,t){var l,c;const s=e.dataset.orderId,i=e.dataset.originalValue,o=e.value,a=((c=(l=t.dateFilterGroup)==null?void 0:l.querySelector(".is-active"))==null?void 0:c.dataset.filter)||"today";if(e.matches(".entregador-select")){e.disabled=!0;try{await Be(s,o),$("Entregador designado!","success"),await F(!0,a,!1,t)}catch(p){$(`Erro: ${p.message}`,"error"),e.value=i,e.disabled=!1}}else e.matches(".status-select")&&(e.value=i)}function ft(e){const t=decodeURI(e.dataset.copyText||""),s=t.toLowerCase().includes("erro");be(t),s?$(t,"error"):$("Copiado!","success")}let se=!0,gt=new Set;const y={tableContainer:null,statusFilterContainer:null,searchTermInput:null,autoRefreshToggle:null,dateFilterGroup:null};function Ee(){var t,s;if(!y.autoRefreshToggle)return;const e=y.autoRefreshToggle.querySelector(".button-text");if(n.refreshInterval)clearInterval(n.refreshInterval),n.refreshInterval=null,n.isAutoRefreshActive=!1,y.autoRefreshToggle.classList.remove("active"),y.autoRefreshToggle.title="Ativar atualização automática",e&&(e.textContent="Auto-Refresh"),console.log("Auto-Refresh Desativado"),ae(se);else{const i=((s=(t=y.dateFilterGroup)==null?void 0:t.querySelector(".is-active"))==null?void 0:s.dataset.filter)||"today";F(!1,i,!1,y),n.refreshInterval=setInterval(()=>F(!1,i,!1,y),15e3),n.isAutoRefreshActive=!0,y.autoRefreshToggle.classList.add("active"),y.autoRefreshToggle.title="Desativar atualização automática",e&&(e.textContent="Auto Ativo"),console.log("Auto-Refresh Ativado"),ae(se)}}const ht=()=>{y.tableContainer=document.getElementById("pedidos-table-container"),y.statusFilterContainer=document.getElementById("status-filter-container"),y.searchTermInput=document.getElementById("search-term"),y.autoRefreshToggle=document.getElementById("auto-refresh-toggle"),y.dateFilterGroup=document.getElementById("date-filter-group"),Ze();const e=Se(y),t=(e==null?void 0:e.date)||"today";F(!0,t,!0,y).then(()=>{se&&(se=!1)}).catch(s=>{console.error("Falha na busca inicial de dados do dashboard:",s)}),yt(),Ee(),We(),Ye(()=>{var i,o;const s=((o=(i=y.dateFilterGroup)==null?void 0:i.querySelector(".is-active"))==null?void 0:o.dataset.filter)||"today";F(!1,s,!1,y)}),console.log("Dashboard Handlers Inicializado.")},yt=()=>{var t,s,i;const e=document.querySelector(".header-filters");e?e.addEventListener("click",o=>{const a=o.target.closest(".status-filter-dropdown-button");if(a){const l=a.nextElementSibling;l&&l.classList.contains("status-filter-dropdown-panel")&&(l.classList.toggle("is-open"),a.setAttribute("aria-expanded",l.classList.contains("is-open")))}}):console.warn("Container de filtros '.header-filters' não encontrado."),document.addEventListener("click",o=>{if(y.statusFilterContainer&&!y.statusFilterContainer.contains(o.target)){const a=y.statusFilterContainer.querySelector(".status-filter-dropdown-panel.is-open");if(a){a.classList.remove("is-open");const l=y.statusFilterContainer.querySelector(".status-filter-dropdown-button");l&&l.setAttribute("aria-expanded","false")}}}),(t=y.searchTermInput)==null||t.addEventListener("input",()=>oe(y,!0)),(s=y.autoRefreshToggle)==null||s.addEventListener("click",Ee),(i=y.dateFilterGroup)==null||i.addEventListener("click",o=>{const a=o.target.closest(".nativa-toggle-button");if(!a||a.classList.contains("is-active"))return;n.activeTooltip&&n.activeTooltip.row&&de(n.activeTooltip.row),y.dateFilterGroup.querySelectorAll(".nativa-toggle-button").forEach(c=>c.classList.remove("is-active")),a.classList.add("is-active");const l=a.dataset.filter;y.tableContainer&&(y.tableContainer.innerHTML='<div class="dashboard-loader"><span class="material-symbols-rounded is-loading">hourglass_top</span><span>Carregando pedidos...</span></div>'),gt.clear(),F(!0,l,!1,y)}),y.tableContainer?(y.tableContainer.addEventListener("click",async o=>{const a=o.target,l=a.closest("[data-copy-text]");if(l&&(ft(l),l.classList.contains("order-actions-button"))){o.stopPropagation();return}const c=a.closest(".order-actions-button");if(c){o.stopPropagation(),await ut(c,y,Re);return}const p=a.closest("tr[data-order-id]");p&&!a.closest("select, a, button, input")&&de(p)}),y.tableContainer.addEventListener("change",async o=>{const a=o.target;a.matches(".entregador-select, .status-select")&&await mt(a,y)})):console.error("Container da tabela '#pedidos-table-container' não encontrado para adicionar listeners.")};function vt(){$("Dashboard de Pedidos v3.1 Carregado","success"),ht(),console.log("Dashboard de Pedidos inicializado com sucesso.")}document.addEventListener("DOMContentLoaded",()=>{document.getElementById("pedidos-app")&&vt()});
//# sourceMappingURL=dashboard.Bca_gcJK.js.map
