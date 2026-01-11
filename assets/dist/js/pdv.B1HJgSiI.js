import{a as b,f as P,e as g,A as X,k as V,v as Ne}from"./ui-helpers.C-IqkHMZ.js";const D={currentView:"delivery",cart:[],client:{},total:0,payments:[],tempProduct:null};function me(){console.log("[PDV Logic] Inicializado."),fe("delivery"),we(),document.addEventListener("keydown",e=>{e.key==="F5"&&(e.preventDefault(),be())})}function fe(e){console.log(`[PDV] Navegando para: ${e}`),document.querySelectorAll(".nav-item").forEach(n=>n.classList.remove("active"));const t=document.querySelector(`.nav-item[onclick*="'${e}'"]`);t&&t.classList.add("active"),document.querySelectorAll(".pdv-view").forEach(n=>{n.classList.remove("active"),n.style.display="none"});const o=document.getElementById(`view-${e}`);o?(o.style.display="block",setTimeout(()=>o.classList.add("active"),10),D.currentView=e):(console.warn(`View #view-${e} ainda não implementada.`),b(`Módulo ${e} em desenvolvimento`,"warning"))}function Y(e,t){const o=document.getElementById(e);if(o)if(t){o.classList.add("is-visible");const n=o.querySelector('input:not([type="hidden"])');n&&setTimeout(()=>n.focus(),100)}else o.classList.remove("is-visible")}function ke(){Y("client-modal",!0)}function ge(){Y("client-modal",!1)}function De(){const e=document.getElementById("client-search-input"),t=document.getElementById("client-results");if(!e||!t)return;if(e.value.length<3){b("Digite pelo menos 3 caracteres","warning");return}t.innerHTML='<div class="nativa-loader-spinner" style="text-align:center; padding:20px;">Buscando...</div>',setTimeout(()=>{t.innerHTML=`
            <div class="nativa-search-item" onclick="window.pdvApp.selectClient({id:1, name:'Cliente Exemplo', cpf:'000.000.000-00'})" style="padding: 12px; border-bottom: 1px solid #eee; cursor: pointer;">
                <div style="font-weight:bold;">Cliente Exemplo</div>
                <div style="font-size:0.85em; color:#666;">CPF: 000.000.000-00</div>
            </div>
        `;const n=document.getElementById("client-not-found-action");n&&(n.style.display="block")},600)}function ye(e){D.client=e,document.querySelectorAll("#current-client-display").forEach(o=>o.textContent=e.name),ge(),b(`Cliente ${e.name} identificado!`,"success")}function Ie(){document.getElementById("client-search-view").style.display="none",document.getElementById("client-register-view").style.display="block",document.getElementById("reg-name-display").textContent="NOVO CLIENTE (VIA GOV)",document.getElementById("reg-cpf-display").textContent=document.getElementById("client-search-input").value||"---"}function ve(){document.getElementById("client-search-view").style.display="block",document.getElementById("client-register-view").style.display="none"}function Le(){ye({id:999,name:"Novo Cliente Cadastrado"}),ve()}function he(){Y("options-modal",!1),D.tempProduct=null}function Pe(){console.log("Opções confirmadas"),he(),D.cart.push({id:Date.now(),name:"Produto Teste",price:10,quantity:1}),we()}function be(){if(D.cart.length===0){b("A cesta está vazia!","warning");return}Y("payment-modal",!0),document.getElementById("pay-total-display").textContent=ee(D.total)}function xe(){Y("payment-modal",!1)}function Me(e,t){document.querySelectorAll(".nativa-payment-button").forEach(o=>o.classList.remove("selected")),t.classList.add("selected"),console.log("Método selecionado:",e)}function Fe(){const e=document.getElementById("pay-input-val"),t=parseFloat(e==null?void 0:e.value);if(!t||t<=0)return;const o=document.getElementById("pay-list-container"),n=document.createElement("div");n.style.cssText="display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #eee;",n.innerHTML=`<span>Pagamento</span> <strong>${ee(t)}</strong>`,o.appendChild(n),e.value="",e.focus()}function Re(){b("Venda Finalizada com Sucesso!","success"),D.cart=[],D.client={id:0,name:"Visitante"},D.payments=[],we(),document.getElementById("current-client-display").textContent="Visitante",document.getElementById("pay-list-container").innerHTML="",xe()}function we(){const e=document.getElementById("cart-items"),t=document.getElementById("cart-total");if(!e||!t)return;e.innerHTML="";let o=0;D.cart.length===0?e.innerHTML='<li class="empty-cart-msg">Cesta vazia</li>':D.cart.forEach(n=>{const s=document.createElement("li");s.className="cart-item",s.innerHTML=`
                <div style="display:flex; justify-content:space-between; width:100%;">
                    <span>${n.quantity}x ${n.name}</span>
                    <span>${ee(n.price*n.quantity)}</span>
                </div>
            `,e.appendChild(s),o+=n.price*n.quantity}),D.total=o,t.textContent=ee(o)}function ee(e){return e.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}window.pdvApp={initPdv:me,switchView:fe,openClientModal:ke,closeClientModal:ge,handleSearch:De,selectClient:ye,searchGovApi:Ie,resetClientModal:ve,finalizeRegistration:Le,closeOptionsModal:he,confirmOptions:Pe,openPaymentModal:be,closePaymentModal:xe,selectMethod:Me,addPayment:Fe,finalizeOrder:Re};const i={allOrders:[],allStatuses:[],allEntregadores:[],allPaymentMethods:{},allPaymentMethodsData:[],lastCheckTimestamp:null,activeTooltip:null,refreshInterval:null,isAutoRefreshActive:!1,currentFilteredOrders:[],currentlyDisplayedOrders:[]},et=`
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;700&family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet">
`,tt=`
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
`;function qe(e){return`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Imprimir</title>${et}<style>${tt}</style></head><body class="nativa-print-body">${e}</body></html>`}async function ze(e){try{const t=new AbortController,o=setTimeout(()=>t.abort(),1e4),n=await fetch("http://localhost:4000/imprimir",{method:"POST",headers:{"Content-Type":"text/html"},body:e,signal:t.signal});if(clearTimeout(o),n.ok)console.log("✅ Enviado servidor local");else throw new Error("Erro servidor")}catch(t){console.warn("⚠️ Fallback",t),at(e)}}function at(e){const t=window.open("","_blank","width=450,height=600");t?(t.document.write(e),t.document.close(),t.focus(),setTimeout(()=>t.print(),1e3)):alert("Pop-up bloqueado.")}function je(e){return e?new Date(e*1e3).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"2-digit",hour:"2-digit",minute:"2-digit"}):"Data n/a"}function He(e){return({delivery:"DELIVERY",pickup:"RETIRADA",table:"MESA"}[e]||e).toUpperCase()}function ot(e){const t=e.details.pedido_endereco||{};if(!t.pedido_rua)return"";const o=u=>{try{return decodeURIComponent(u.replace(/\+/g," "))}catch{return u}},n=o(t.pedido_rua).toUpperCase(),s=o(t.pedido_numero).toUpperCase()||"S/N",a=o(t.pedido_bairro).toUpperCase(),l=o(t.pedido_complemento).toUpperCase(),c=`${n}, ${s} - ${a}`,p=l?`<div style="font-weight: 700; font-size: 13px; margin-top: 2px;">${l}</div>`:"";return`<div style="text-align: center; margin-top:5px; font-size: 15px; line-height: 1.4; color: #000; font-weight: 700;">${c}${p}</div>`}function st(e,t,o=""){const n=`#${e.id}`,s=He(e.details.pedido_tipo_servico),a=`${n} | ${s}`,l=(e.details.pedido_nome_cliente||e.customer_name||"Cliente").toUpperCase();return`
        <div class="print-logo-container"><img src="${t}" alt="Logo" onerror="this.style.display='none'"></div>
        <div class="text-center text-xl text-bold">${a}</div>
        <div class="text-center" style="font-size: 14px; margin-top: 4px; color: #000; font-weight: 700;">${je(e.timestamp)}${o}</div>
        <div class="separator"></div>
        <div class="customer-name-centered">${l}</div>
    `}function nt(e,t,o){const n=`#${e.id}`,s=He(e.details.pedido_tipo_servico),a=(e.details.pedido_nome_cliente||e.customer_name||"Cliente").toUpperCase(),c=`${je(e.timestamp)} | ${o}`;return`
        <div class="kitchen-header-row">
            <div class="kh-logo">
                <img src="${t}" alt="Logo" onerror="this.style.display='none'">
            </div>
            <div class="kh-info">
                <div class="text-xl text-bold" style="line-height: 1.1;">${n} | ${s}</div>
                <div class="kh-meta-line">${c}</div>
            </div>
        </div>
        <div class="separator"></div>
        <div class="customer-name-centered">${a}</div>
    `}function it(){return'<span class="material-symbols-rounded" style="color: #000 !important; font-weight: 700;">subdirectory_arrow_right</span>'}function Ce(e,t=null){var u;if(!e||!e.details)return;let o={};try{o=JSON.parse(e.details.pedido_itens_json||"{}")}catch(d){console.error(d);return}const n=Object.entries(o);let s=0;if(n.forEach(([,d])=>{s+=parseInt(d.quantity,10)||1}),s===0)return;let a=((u=window.nativaDeliveryData)==null?void 0:u.pluginUrl)||"";a&&!a.endsWith("/")&&(a+="/");const l=`${a}assets/svg/nativa_mono.svg`;let c="",p=0;n.forEach(([d,r])=>{const m=parseInt(r.quantity,10)||1,f=r.product_name||r.name,A=t?t.includes(d):!0;let w="";const O=(_,y)=>{const $=y>1?`<strong>${y}&times;</strong> `:"";return`<div class="addon-line">${it()}<span>${$}${_}</span></div>`};r.is_combo&&Array.isArray(r.selections)?r.selections.forEach(_=>{w+=`<div style="margin-top:4px;">• ${_.productName}</div>`,_.selectedAddons&&Object.values(_.selectedAddons).forEach(y=>{Object.values(y.items||{}).forEach($=>{w+=O($.itemName,parseInt($.itemQuantity,10))})})}):r.selected_addons&&Object.values(r.selected_addons).forEach(_=>{Object.values(_.items||{}).forEach(y=>{w+=O(y.itemName,parseInt(y.itemQuantity,10))})}),r.observacoes&&(w+=`<div style="margin-top:5px; font-style:italic; font-size: 0.8em; color: #000; font-weight: 700;">OBS: ${r.observacoes}</div>`);for(let _=0;_<m;_++)if(p++,A){const y=`ITEM ${p}/${s}`,$=nt(e,l,y);c+=`
                <div class="kitchen-ticket">
                    ${$}
                    <div class="double-separator"></div>
                    <div>
                        <div class="kitchen-item-name">${f}</div>
                        <div class="kitchen-item-addons">${w}</div>
                    </div>
                </div>`}}),c&&ze(qe(c))}function rt(e){var O,_;if(!e||!e.details)return;let t=((O=window.nativaDeliveryData)==null?void 0:O.pluginUrl)||"";t&&!t.endsWith("/")&&(t+="/");const o=`${t}assets/svg/nativa_logo.svg`;let n=st(e,o);e.details.pedido_tipo_servico==="delivery"&&(n+=ot(e));let s=[];try{s=Object.values(JSON.parse(e.details.pedido_itens_json||"{}"))}catch{s=[]}let a='<div class="double-separator"></div>',l=0;s.forEach((y,$)=>{const L=parseFloat(y.total_item_price||0),j=parseInt(y.quantity,10)||1;l+=j;const J=`<strong>${j}&times;</strong>`;a+=`
            <div class="item-row">
                <div class="item-name-col">
                    <span class="item-checkbox"></span>
                    <span>${J} ${y.product_name||y.name}</span>
                </div>
                <div class="item-price-col">${P(L)}</div>
            </div>
        `;let N=[];y.is_combo&&y.selections?y.selections.forEach(M=>N.push(M.productName)):y.selected_addons&&Object.values(y.selected_addons).forEach(M=>{Object.values(M.items||{}).forEach(H=>{const C=parseInt(H.itemQuantity,10),K=C>1?`${C}&times; `:"";N.push(`${K}${H.itemName}`)})}),N.length>0&&(a+=`<div class="item-addons-courier">(${N.join(", ")})</div>`),$<s.length-1&&(a+='<div class="item-separator"></div>')});const c=parseFloat(e.details.pedido_subtotal||0),p=parseFloat(e.details.pedido_taxa_entrega||0),u=parseFloat(e.details.pedido_desconto||0);let d='<div class="separator"></div>';d+=`<div class="totals-row"><span>Qtd. Itens:</span><span>${l}</span></div>`,d+=`<div class="totals-row"><span>Subtotal:</span><span>${P(c)}</span></div>`,p>0&&(d+=`<div class="totals-row"><span>Entrega:</span><span>${P(p)}</span></div>`),u>0&&(d+=`<div class="totals-row"><span>Desconto:</span><span>-${P(u)}</span></div>`),d+=`<div class="totals-row text-lg text-bold" style="margin-top:2px;"><span>TOTAL:</span><span>${e.total}</span></div>`;const r=e.details.pedido_metodo_pagamento,m=((_=i.allPaymentMethods)==null?void 0:_[r])||r;let f="";if(r==="pix-sicredi"&&e.payment_status==="paid")f="PAGO (PIX)";else if(f=`A PAGAR: ${m.toUpperCase()}`,r==="dinheiro"){const y=parseFloat(e.details.pedido_troco_para||0),$=parseFloat(e.total.replace(/[^\d,]/g,"").replace(",","."));y>$?f+=`<br/>Troco p/: ${P(y)}<br/>Devolver: ${P(y-$)}`:f+="<br/>(SEM TROCO / VALOR EXATO)"}const A=`<div class="separator"></div><div class="text-center text-bold text-lg" style="color: #000;">${f}</div>`;ze(qe(`${n}${a}${d}${A}<div class="footer"><div class="separator"></div><p>(47) 3448-1082 | pastelarianativa.com.br</p></div>`))}const _e=window.nativaDeliveryData||{},Se=_e.ajax_url,lt=_e.ajax_nonce;async function U(e,t={}){var n;if(!Se){const s="Erro crítico: A URL do servidor não foi encontrada. O dashboard não pode funcionar.";throw console.error(s,"Objeto de configuração recebido:",_e),b(s,"error"),new Error(s)}const o=new FormData;o.append("action",`nativa_delivery_${e}`),o.append("nativa_delivery_nonce",lt);for(const s in t)Object.prototype.hasOwnProperty.call(t,s)&&(typeof t[s]=="object"&&t[s]!==null?o.append(s,JSON.stringify(t[s])):o.append(s,t[s]));try{const s=await fetch(Se,{method:"POST",body:o});if(!s.ok){let l=`Erro ${s.status}: ${s.statusText}`;try{const p=(await s.text()).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();p&&(l=p),s.status===403&&(l+=" (Possível problema de permissão ou sessão expirada. Tente recarregar a página.)")}catch(c){console.warn("Não foi possível ler o corpo da resposta de erro.",c)}throw new Error(l)}const a=await s.json();if(!a.success)throw new Error(((n=a.data)==null?void 0:n.message)||a.data||"O servidor retornou um erro inesperado.");return a.data}catch(s){throw console.error(`Erro na chamada AJAX para '${e}':`,s),b(s.message||"Erro de comunicação com o servidor.","error"),s}}const dt=async e=>await U("save_dashboard_push_subscription",{subscription:e}),ct=async(e="today")=>await U("get_orders",{date_filter:e}),pt=async e=>await U("get_updated_orders",{last_check_timestamp:e}),ut=async(e,t)=>await U("update_order_status",{order_id:e,new_status:t}),mt=async(e,t)=>await U("assign_entregador",{order_id:e,entregador_id:t}),ft=async(e,t)=>await U("update_payment_refund_status",{order_id:e,new_state:t}),gt=async e=>await U("recognize_payment",{order_id:e});let ce=null;const Be={delivery:{name:"Entrega",icon:"local_shipping"},pickup:{name:"Retirada",icon:"storefront"},table:{name:"Na Mesa",icon:"restaurant_menu"}};function yt(e){if(typeof e!="string"||!e)return"";const t=e.replace(/\D/g,"");return t.length===11?`(${t.substring(0,2)}) ${t.substring(2,7)}-${t.substring(7)}`:t.length===10?`(${t.substring(0,2)}) ${t.substring(2,6)}-${t.substring(6)}`:e}function Ue(e){const t=new Date,o=new Date(e*1e3),n=Math.floor((t-o)/1e3),s=Math.floor(n/86400),a={hour:"2-digit",minute:"2-digit"},l=o.toLocaleTimeString("pt-BR",a).replace(":","h");if(s===0&&t.getDate()===o.getDate()){const u=Math.floor(n/60);return u<1?"Agora":u<60?`Há ${u} min`:`Há ${Math.floor(u/60)}h ${u%60}min`}if(s<7){const u=o.toLocaleDateString("pt-BR",{weekday:"long"});return`${u.charAt(0).toUpperCase()+u.slice(1)}, ${l}`}const c={day:"2-digit",month:"2-digit",year:"2-digit"};return`${o.toLocaleDateString("pt-BR",c)} ${l}`}function vt(){ce&&clearInterval(ce),ce=setInterval(()=>{document.querySelectorAll(".order-time-ago").forEach(e=>{const t=parseInt(e.dataset.timestamp,10);t&&(e.textContent=Ue(t))})},6e4)}function ht(e){var d;const t=e.target.closest(".show-map-button");if(!t)return;const o=t.dataset.lat,n=t.dataset.lng,s=t.dataset.address,a=((d=window.nativaDeliveryData)==null?void 0:d.google_maps_api_key)||"",l=o&&n,c=s&&s!=="null";let p="";const u=!!a;if(l&&u)try{const r=`${o},${n}`,m=encodeURIComponent(r);p=`
                <div class="map-container" style="height: 300px; margin-bottom: 16px;">
                    <iframe width="100%" height="100%" style="border:0" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="${`https://www.google.com/maps/embed/v1/place?key=${a}&q=${m}`}"></iframe>
                </div>
                ${c?`<p style="text-align: center; font-size: 0.9em; color: var(--md-sys-color-outline);">${g(s)}</p>`:""}
            `}catch(r){console.error("Erro ao construir URL do mapa com coordenadas:",r);const m=c?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s)}`:"#";p=`
                <div class="map-placeholder" style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 0;">
                    <span class="material-symbols-rounded" style="font-size: 32px; color: var(--md-sys-color-error);">wrong_location</span>
                    <span>Erro ao carregar mapa.</span>
                     ${c?`<p style="text-align: center; font-size: 0.9em; margin-bottom: 8px;">${g(s)}</p><a href="${m}" target="_blank" class="nativa-button-secondary is-small"><span class="material-symbols-rounded">search</span> Pesquisar no Google Maps</a>`:""}
                </div>
            `}else{const r=c?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(s)}`:"#";p=`
            <div class="map-placeholder" style="display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 20px 0;">
                <span class="material-symbols-rounded" style="font-size: 32px; color: var(--md-sys-color-outline);">location_off</span>
                <span>${u?"Localização não compartilhada.":"API Key do mapa não configurada."}</span>
                ${c?`<p style="text-align: center; font-size: 0.9em; margin-bottom: 8px;">${g(s)}</p><a href="${r}" target="_blank" class="nativa-button-secondary is-small"><span class="material-symbols-rounded">search</span> Pesquisar no Google Maps</a>`:'<p style="text-align: center; font-size: 0.9em;">Endereço não disponível.</p>'}
            </div>
        `,a||console.warn("API Key do Google Maps não configurada.")}V({title:"Localização da Entrega",message:p,confirmText:"Fechar",cancelText:null})}const Je=e=>{const t=window.nativaDeliveryData||{},o=(e==null?void 0:e.details)||{},n=(e==null?void 0:e.customer_name)||"Cliente",s=e==null?void 0:e.customer_dob,a=o.pedido_nome_cliente||n,l=o.pedido_cpf_cliente||"Não informado",c=(o.pedido_whatsapp_cliente||"").replace(/\D/g,""),p=yt(c)||"Não informado",u=`
        <div class="tooltip-data-item"><span class="label">Nome</span><span class="value copyable-value" data-copy-text="${g(a)}" title="Clique para copiar">${g(a)}</span></div>
        <div class="tooltip-data-item"><span class="label">CPF</span><span class="value copyable-value" data-copy-text="${g(l)}" title="Clique para copiar">${g(l)}</span></div>
        <div class="tooltip-data-item"><span class="label">WhatsApp</span><span class="value copyable-value" data-copy-text="${c}" title="Clique para copiar">${g(p)}</span></div>
        <div class="tooltip-data-item"><span class="label">Nascimento</span><span class="value">${g(s||"Não informado")}</span></div>
    `;let d=o.pedido_metodo_pagamento||"N/A";d==="pix-sicredi"&&e.payment_status==="failed_generation"&&(d="pix-fallback");let r=i.allPaymentMethods[d]||d;const m=i.allPaymentMethodsData.find(h=>h.slug===d),f=m?m.categoria:null;(o.pedido_metodo_pagamento==="pix-sicredi"||f==="pix_automatico")&&(e.payment_status==="paid"?r+=" 🟢":e.payment_status==="expired"?r+=" 🔴":(e.payment_status==="awaiting_api"||e.payment_status==="manual_pending"||e.payment_status==="pending"||e.payment_status==="failed_generation")&&(r+=" 🟡"));const A=`
        <div class="order-id-header">
            <h4>Pedido #${e.id}</h4>
        </div>
    `,w=Be[o.pedido_tipo_servico]||{name:o.pedido_tipo_servico,icon:"help"},O=i.allPaymentMethodsData.find(h=>h.slug===d),_=d==="dinheiro"||O&&O.exige_troco;let y="";if(_){const h=parseFloat(o.pedido_troco_para||0),S=(e.total||"R$ 0,00").replace("R$ ","").replace(".","").replace(",","."),x=parseFloat(S);if(h>0&&h>=x){const F=P(h),I=h-x,B=P(I);y=`
                <div class="tooltip-data-item">
                    <span class="label">Troco para</span>
                    <span class="value">${F}</span>
                </div>
                <div class="tooltip-data-item">
                    <span class="label">Levar</span>
                    <span class="value is-highlight">${B}</span>
                </div>
            `}else y=`
                <div class="tooltip-data-item">
                    <span class="label">Troco</span>
                    <span class="value">Sem troco</span>
                </div>
            `}let $=`
        <div class="tooltip-data-item"><span class="label">Modalidade</span><span class="value"><span class="material-symbols-rounded modality-icon-tooltip">${w.icon}</span>${g(w.name)}</span></div>
        <div class="tooltip-data-item">
            <span class="label">Método Pag.</span>
            <span class="value">${g(r)}</span>
        </div>
        ${y}
    `,L="";const j=o.pedido_tipo_servico==="delivery";if(j){const h=o.pedido_endereco||{},S=X(h.pedido_rua||""),x=X(h.pedido_numero||""),F=X(h.pedido_complemento||""),I=X(h.pedido_bairro||""),B=t.cep_cidade||"",re=h.pedido_latitude,le=h.pedido_longitude,de=S&&x&&I?`${S}, ${x} - ${I}, Balneário Barra do Sul - SC`:null;$+=`
            <div class="tooltip-data-item"><span class="label">Logradouro</span><span class="value copyable-value" data-copy-text="${g(S)}" title="Clique para copiar">${g(S)}</span></div>
            <div class="tooltip-data-item"><span class="label">Número</span><span class="value copyable-value" data-copy-text="${g(x)}" title="Clique para copiar">${g(x)}</span></div>
            <div class="tooltip-data-item"><span class="label">Bairro</span><span class="value copyable-value" data-copy-text="${g(I)}" title="Clique para copiar">${g(I)}</span></div>
        `,F&&($+=`<div class="tooltip-data-item"><span class="label">Complemento</span><span class="value copyable-value" data-copy-text="${g(F)}" title="Clique para copiar">${g(F)}</span></div>`),$+=`<div class="tooltip-data-item"><span class="label">CEP</span><span class="value copyable-value" data-copy-text="${g(B)}" title="Clique para copiar">${g(B)}</span></div>`,L=`
            <button class="order-actions-button show-map-button"
                    data-lat="${re||""}"
                    data-lng="${le||""}"
                    data-address="${g(de||"")}">
                <span class="material-symbols-rounded">map</span>
            </button>
        `}const J=`<div class="order-data-grid">${$}</div>`;let N='<tr><td colspan="2">Erro ao processar itens do pedido.</td></tr>',M=0;try{const h=o&&typeof o.pedido_itens_json=="string"?o.pedido_itens_json:"{}",S=JSON.parse(h);S&&typeof S=="object"&&Object.keys(S).length>0?N=Object.values(S).map(x=>{if(!x||typeof x!="object")return"";M+=parseInt(x.quantity,10)||0;let F="";x.is_reward?F='<span class="item-tag is-reward" title="Resgate de Fidelidade">Fidelidade</span>':x.is_offer_item&&(F='<span class="item-tag is-offer" title="Item de Oferta">Oferta</span>');const I=x.quantity||1,B=x.total_item_price||0,re=I>0?B/I:0,le=I>1?`<br><small class="tooltip-unit-price">(${P(re)} cada)</small>`:"";let T="";x.is_combo&&Array.isArray(x.selections)?(T+='<ul class="tooltip-sublist">',x.selections.forEach(E=>{!E||!E.productName||(T+=`<li>↳ <strong>${g(E.productName)}</strong>`,E.selectedAddons&&typeof E.selectedAddons=="object"&&Object.keys(E.selectedAddons).length>0&&(T+='<div class="tooltip-addon-groups-wrapper is-nested">',Object.values(E.selectedAddons).forEach(q=>{if(q&&q.items&&typeof q.items=="object"&&Object.keys(q.items).length>0){const z=Object.values(q.items).map(G=>!G||!G.itemName?"":`${G.itemQuantity>1?`${G.itemQuantity} × `:""}${g(G.itemName)}`).filter(Boolean);z.length>0&&(T+=`
                                                    <div class="tooltip-addon-group-row">
                                                        <span class="addon-group-items">↳ ${z.join(", ")}</span>
                                                    </div>
                                                `)}}),T+="</div>"),T+="</li>")}),T+="</ul>"):x.selected_addons&&typeof x.selected_addons=="object"&&Object.keys(x.selected_addons).length>0&&(T+='<div class="tooltip-addon-groups-wrapper">',Object.values(x.selected_addons).forEach(E=>{if(E&&E.items&&typeof E.items=="object"&&Object.keys(E.items).length>0){const q=Object.values(E.items).map(z=>!z||!z.itemName?"":`${z.itemQuantity>1?`${z.itemQuantity} × `:""}${g(z.itemName)}`).filter(Boolean);q.length>0&&(T+=`
                                            <div class="tooltip-addon-group-row">
                                                <span class="addon-group-items">↳ ${q.join(", ")}</span>
                                            </div>
                                        `)}}),T+="</div>");const de=g(x.product_name||x.name||"Item desconhecido"),Ye=T?`<div class="tooltip-item-details-wrapper">${T}</div>`:"",Xe=`
                        <td class="order-item-name-cell">
                            <strong>${I} × ${de}</strong>
                            ${F}
                            ${le}
                            ${Ye}
                        </td>`,Ze=`<td class="order-item-price-cell">${P(B)}</td>`;return`<tr class="order-item-row">${Xe}${Ze}</tr>`}).join(""):N='<tr><td colspan="2">Nenhum item encontrado.</td></tr>'}catch(h){console.error(`Erro ao processar JSON de itens para o pedido #${e==null?void 0:e.id}:`,h,"JSON String:",o==null?void 0:o.pedido_itens_json),N='<tr><td colspan="2">Erro ao exibir itens.</td></tr>'}const H={pendente:{slug:"recebido",label:"Receber"},recebido:{slug:"aceito",label:"Aceitar"},aceito:{slug:"pronto",label:"Pronto"},pronto:{slug:o.pedido_tipo_servico==="delivery"?"enviado":"finalizado",label:o.pedido_tipo_servico==="delivery"?"Enviar":"Finalizar"},enviado:{slug:"finalizado",label:"Finalizar"}};let C='<div class="actions-wrapper">';if(C+=`
        <button class="order-actions-button" data-action="print-kitchen" data-order-id="${e.id}" title="Imprimir para Cozinha">
            <span class="material-symbols-rounded">print</span> Cozinha
        </button>
        <button class="order-actions-button" data-action="print-courier" data-order-id="${e.id}" title="Imprimir Geral">
            <span class="material-symbols-rounded">receipt_long</span> Geral
        </button>
    `,c.length>=10){const h=encodeURIComponent(`Olá! Sobre o seu pedido #${e.id}:`),S=`https://wa.me/55${c}?text=${h}`;C+=`<a href="${S}" target="_blank" class="order-actions-button contact-customer-btn"><span class="material-symbols-rounded">chat</span></a>`}else C+='<button disabled class="order-actions-button contact-customer-btn" title="Cliente não possui número de telefone cadastrado."><span class="material-symbols-rounded">chat_error</span>Contato</button>';if((e.payment_status==="manual_pending"||e.payment_status==="failed_generation"||e.status_slug==="aguardando-pagamento")&&(C+=`<button class="order-actions-button payment-status-btn" data-action="recognize-payment" data-order-id="${e.id}"><span class="material-symbols-rounded">check</span></button>`),["paid","refunded"].includes(e.payment_status)&&e.status_slug==="cancelado"){const h=e.payment_status==="refunded"?"Desfazer Est.":"Estornar",S=e.payment_status==="refunded"?"active cancel-action":"cancel-action";C+=`<button class="order-actions-button ${S}" data-action="refund-status" data-order-id="${e.id}"><span class="material-symbols-rounded">undo</span>${h}</button>`}const K=H[e.status_slug];if(K){const h=e.status_slug==="pendente"?" is-shaking":"";C+=`<button class="order-actions-button primary-action${h}" data-action="status-change" data-order-id="${e.id}" data-next-status="${K.slug}"><span class="material-symbols-rounded">arrow_forward</span>${K.label}</button>`}const $e=e.notification_urls?e.notification_urls[e.status_slug]:null;if($e){const h=sessionStorage.getItem(`notified_${e.id}_${e.status_slug}`)==="true",S=h?"check":"notifications",x=h?"Notificado":"Notificar";C+=`<button class="order-actions-button notify-customer-btn ${h?"active":""}" data-action="notify-customer" data-url="${$e}" data-order-id="${e.id}" data-status="${e.status_slug}"><span class="material-symbols-rounded">${S}</span>${x}</button>`}if(j){const h=e.delivery_notification_data||"",S=h?"Copiar mensagem p/ entregador":"Dados de entrega não disponíveis para cópia";C+=`<button class="order-actions-button notify-delivery-btn" data-action="notify-delivery" data-order-id="${e.id}" data-copy-text="${encodeURI(h)}" title="${S}"><span class="material-symbols-rounded">send</span></button>`}return L&&(C+=L),["finalizado","cancelado"].includes(e.status_slug)||(C+=`<button class="order-actions-button cancel-action" data-action="status-change" data-order-id="${e.id}" data-next-status="cancelado"><span class="material-symbols-rounded">cancel</span></button>`),C+="</div>",`<div class="details-tooltip-content" style="display: flex; gap: 16px;">
                <div class="tooltip-column" style="flex-basis: 20%;">
                    <h4>Dados do Cliente</h4>
                    ${u}
                </div>
                <div class="tooltip-column" style="flex-basis: 20%;">
                    ${A}
                    ${J}
                </div>
                <div class="tooltip-column" style="flex-basis: 40%;">
                    <h4>Itens do Pedido (${M})</h4>
                    <table class="tooltip-items-table"><tbody>${N}</tbody></table>
                </div>
                <div class="tooltip-column tooltip-actions-column" style="flex-basis: 20%; min-width: 150px;">
                    <h4>Ações do Pedido</h4>
                    ${C}
                </div>
            </div>`},pe=e=>{const t=e.dataset.orderId,o=i.allOrders.find(l=>l.id==t);if(!o){console.warn(`Pedido com ID ${t} não encontrado no estado.`);return}if(i.activeTooltip&&(i.activeTooltip.tooltipRow&&i.activeTooltip.tooltipRow.parentNode&&i.activeTooltip.tooltipRow.remove(),i.activeTooltip.row&&i.activeTooltip.row.parentNode&&i.activeTooltip.row.classList.remove("is-expanded"),i.activeTooltip.row===e)){i.activeTooltip=null;return}const n=document.createElement("tr");n.className="details-tooltip-row";const s=document.createElement("td");s.colSpan=7,s.innerHTML=Je(o),n.appendChild(s);const a=s.querySelector(".show-map-button");a&&a.addEventListener("click",ht),e.parentNode.insertBefore(n,e.nextSibling),e.classList.add("is-expanded"),i.activeTooltip={row:e,tooltipRow:n}},te=(e,t=!0)=>{const o=document.getElementById("pedidos-table-container");if(!o){console.error("Container da tabela '#pedidos-table-container' não encontrado.");return}if(t&&(o.innerHTML="",i.activeTooltip&&i.activeTooltip.tooltipRow&&i.activeTooltip.tooltipRow.parentNode&&(i.activeTooltip.tooltipRow.remove(),i.activeTooltip.row&&i.activeTooltip.row.classList.remove("is-expanded"),i.activeTooltip=null)),!e||e.length===0){t&&(o.innerHTML='<div class="no-orders-message"><span class="material-symbols-rounded">shopping_cart_off</span><p>Nenhum pedido encontrado para o filtro selecionado.</p></div>');return}let n=o.querySelector(".pedidos-table");n||(n=document.createElement("table"),n.className="pedidos-table",n.innerHTML="<thead><tr><th>Pedido</th><th>Tempo</th><th>Cliente</th><th>Status</th><th>Pagamento</th><th>Entregador</th><th>Total</th></tr></thead><tbody></tbody>",o.appendChild(n));const s=n.querySelector("tbody");if(!s){console.error("Elemento tbody não encontrado na tabela.");return}t&&(s.innerHTML=""),e.forEach(a=>{var J,N,M,H;if(!t&&s.querySelector(`tr[data-order-id="${a.id}"]`))return;const l=document.createElement("tr");l.dataset.orderId=a.id,(a.status_slug==="pendente"||a.status_slug==="aguardando-pagamento")&&l.classList.add("is-pending");let c="";a.status_slug==="aguardando-pagamento"?c='<div class="status-badge status-aguardando-pagamento">Aguardando Pagamento</div>':c=`<div class="status-badge status-${a.status_slug}">${g(a.status)}</div>`;const p=`<div class="order-status-cell">${c}</div>`,u=((N=(J=a.details)==null?void 0:J.pedido_entregador_designado)==null?void 0:N.ID)||"0",d=(i.allEntregadores||[]).map(C=>`<option value="${C.id}" ${C.id==u?"selected":""}>${g(C.name)}</option>`).join(""),r=`<select class="entregador-select" data-order-id="${a.id}" data-original-value="${u}"> <option value="0">Nenhum</option>${d}</select>`,m=`<span class="order-time-ago" data-timestamp="${a.timestamp}">${Ue(a.timestamp)}</span>`;let f=((M=a.details)==null?void 0:M.pedido_metodo_pagamento)||"N/A";const A=i.allPaymentMethodsData.find(C=>C.slug===f),w=A?A.categoria:null;f==="pix-sicredi"&&a.payment_status==="failed_generation"&&(f="pix-fallback");let O=g(i.allPaymentMethods[f]||f),_="";(f==="pix-sicredi"||w==="pix_automatico")&&(a.payment_status==="paid"?_=" 🟢":a.payment_status==="expired"?_=" 🔴":(a.payment_status==="awaiting_api"||a.payment_status==="manual_pending"||a.payment_status==="pending"||a.payment_status==="failed_generation")&&(_=" 🟡"));const y=O+_,$=((H=a.details)==null?void 0:H.pedido_tipo_servico)||"N/A",L=Be[$]||{name:$,icon:"help"},j=`
            <span class="modality-icon-wrapper" title="${g(L.name)}">
                 <span class="material-symbols-rounded">${L.icon}</span>
            </span>
        `;l.innerHTML=`
            <td data-label="Pedido">#${a.id} ${j}</td>
            <td data-label="Tempo">${m}</td>
            <td data-label="Cliente">${g(a.customer_name||"")}</td>
            <td data-label="Status">${p}</td>
            <td data-label="Pagamento">${y}</td>
            <td data-label="Entregador">${r}</td>
            <td data-label="Total"><strong>${g(a.total||"R$ 0,00")}</strong></td>
        `,s.appendChild(l)}),vt()},Ge=()=>{const e=document.getElementById("status-filter-container");if(!e){console.warn("Container do filtro de status não encontrado.");return}if(!i.allStatuses||i.allStatuses.length===0){e.innerHTML="";return}const t=i.allStatuses.map(a=>`<div class="status-filter-item">
                    <label for="status-${a.slug}" class="status-filter-item-label">${g(a.name)}</label>
                    <div class="nativa-toggle-switch is-small">
                        <div class="nativa-toggle-control">
                            <input type="checkbox" id="status-${a.slug}" class="filter-checkbox" data-filter-type="status" value="${a.slug}">
                            <label for="status-${a.slug}" class="nativa-toggle-ui"></label>
                        </div>
                    </div>
                </div>`).join(""),n=[{slug:"all",name:"Todas"},{slug:"delivery",name:"Entrega"},{slug:"pickup",name:"Retirada"},{slug:"table",name:"Na Mesa"}].map(a=>`<div class="status-filter-item">
                    <label for="modality-${a.slug}" class="status-filter-item-label">${g(a.name)}</label>
                    <div class="nativa-toggle-switch is-small">
                        <div class="nativa-toggle-control">
                            <input type="checkbox" id="modality-${a.slug}" class="filter-checkbox" data-filter-type="modality" value="${a.slug}">
                            <label for="modality-${a.slug}" class="nativa-toggle-ui"></label>
                        </div>
                    </div>
                </div>`).join(""),s=i.allStatuses.length;e.innerHTML=`
        <button class="status-filter-dropdown-button icon-only-button" aria-haspopup="true" aria-expanded="false">
            <span class="material-symbols-rounded">filter_list</span>
            <span class="button-text">Filtrar (${s})</span>
        </button>
        <div class="status-filter-dropdown-panel">
            <div class="status-filter-columns">
                <div class="status-filter-column statuses">
                    <h5>Status</h5>
                    ${t}
                </div>
                <div class="status-filter-column modalities">
                    <h5>Modalidade</h5>
                    ${n}
                </div>
            </div>
        </div>`},bt=Object.freeze(Object.defineProperty({__proto__:null,createTooltipContent:Je,renderOrdersTable:te,renderStatusFilter:Ge,toggleTooltip:pe},Symbol.toStringTag,{value:"Module"})),ae=10;function Ae(e){if(i.currentlyDisplayedOrders.length>=i.currentFilteredOrders.length){oe(e);return}const t=i.currentFilteredOrders.slice(i.currentlyDisplayedOrders.length,i.currentlyDisplayedOrders.length+ae);i.currentlyDisplayedOrders.push(...t),e.tableContainer&&te(t,!1),oe(e)}function oe(e){if(!e.tableContainer)return;let t=document.getElementById("load-more-container");if(t||(t=document.createElement("div"),t.id="load-more-container",e.tableContainer.parentNode.insertBefore(t,e.tableContainer.nextSibling)),i.currentlyDisplayedOrders.length<i.currentFilteredOrders.length){const o=i.currentFilteredOrders.length-i.currentlyDisplayedOrders.length,n=Math.min(o,ae);t.innerHTML=`<button id="load-more-btn" class="nativa-button-primary">Carregar Mais ${n} Pedido${n>1?"s":""}</button>`;const s=document.getElementById("load-more-btn");s&&(s.removeEventListener("click",()=>Ae(e)),s.addEventListener("click",()=>Ae(e)))}else t.innerHTML=""}const Oe="nativa-dashboard-updates";let W=null,Q=null;const xt=document.title;let Te=new Set;function wt(e){const t="=".repeat((4-e.length%4)%4),o=(e+t).replace(/-/g,"+").replace(/_/g,"/"),n=window.atob(o),s=new Uint8Array(n.length);for(let a=0;a<n.length;++a)s[a]=n.charCodeAt(a);return s}async function _t(){var t;const e=(t=window.nativaDeliveryData)==null?void 0:t.vapidPublicKey;if(!e){b("Chave de notificação não configurada no servidor.","error");return}try{const o=await Notification.requestPermission();if(o!=="granted"){b("Permissão para notificações não concedida.","info"),Z(o);return}const n=await navigator.serviceWorker.getRegistration("/pedidos/");if(!n){b("Service Worker do dashboard não encontrado.","error");return}let s=await n.pushManager.getSubscription();if(s)console.log("Inscrição Push existente encontrada:",s);else{const a=wt(e);s=await n.pushManager.subscribe({userVisibleOnly:!0,applicationServerKey:a}),console.log("Nova inscrição Push criada:",s)}await dt(s),b("Notificações ativadas para este dispositivo!","success"),Z("granted")}catch(o){console.error("Erro ao inscrever para push do dashboard:",o),b("Não foi possível ativar as notificações. Verifique o console.","error"),Z("default")}}function Z(e){const t=document.getElementById("dashboard-push-toggle");t&&(t.querySelector(".button-text"),e==="granted"?(t.innerHTML='<span class="material-symbols-rounded">notifications_active</span><span class="button-text">Notificações Ativas</span>',t.classList.add("active"),t.classList.remove("is-denied"),t.disabled=!0,t.title="As notificações estão ativas para este dispositivo."):e==="denied"?(t.innerHTML='<span class="material-symbols-rounded">notifications_off</span><span class="button-text">Notificações Bloqueadas</span>',t.classList.add("is-denied"),t.classList.remove("active"),t.disabled=!1,t.title="As notificações foram bloqueadas. Clique para saber mais."):(t.innerHTML='<span class="material-symbols-rounded">add_alert</span><span class="button-text">Ativar Notificações</span>',t.classList.remove("active","is-denied"),t.disabled=!1,t.title="Clique para ativar notificações de novos pedidos."))}function $t(){const e=document.querySelector(".header-actions");if(!e)return;if(!("serviceWorker"in navigator)||!("PushManager"in window)){console.warn("Push Notifications não são suportadas neste navegador.");return}let t=document.getElementById("dashboard-push-toggle");t||(t=document.createElement("button"),t.id="dashboard-push-toggle",t.className="header-button icon-only",e.appendChild(t)),Z(Notification.permission),t.addEventListener("click",()=>{Notification.permission==="prompt"||Notification.permission==="default"?_t():Notification.permission==="denied"&&V({title:"Notificações Bloqueadas",iconName:"notifications_off",message:`Você bloqueou as notificações para este site.

Para reativá-las, procure pelas configurações de notificação do seu navegador e permita as notificações para este endereço.`,confirmText:"Entendi"})})}function Ct(e){if(!window.BroadcastChannel){console.warn("BroadcastChannel não é suportado neste navegador. As atualizações em tempo real entre abas podem não funcionar.");return}W&&W.close(),W=new BroadcastChannel(Oe),console.log("[Dashboard Notifications] Ouvindo mensagens no BroadcastChannel:",Oe),W.onmessage=t=>{console.log("[Dashboard Notifications] Mensagem recebida via BroadcastChannel:",t.data),t.data&&t.data.type==="order_update"&&(console.log("[Dashboard Notifications] Mensagem de order_update recebida. Acionando callback..."),e())},W.onmessageerror=t=>{console.error("[Dashboard Notifications] Erro ao receber mensagem via BroadcastChannel:",t)}}function St(e){var a;if(!("Notification"in window)||Notification.permission!=="granted"||!Array.isArray(e)||e.length===0)return;const t=e[0];if(!t||!t.id||!t.customer_name){console.warn("Dados incompletos para notificação nativa.");return}const o=`Novo Pedido Recebido (#${t.id})!`,n=e.length>1?`Você recebeu ${e.length} novos pedidos.`:`Novo pedido de ${t.customer_name}.`,s=(a=window.nativaDeliveryData)!=null&&a.pluginUrl?window.nativaDeliveryData.pluginUrl+"assets/icons/dashboard/icon-192x192.png":"/wp-content/plugins/nativa-delivery/assets/icons/dashboard/icon-192x192.png";new Notification(o,{body:n,icon:s,tag:"nativa-delivery-novo-pedido",renotify:!0})}function se(e){const t=i.currentFilteredOrders;if(!Array.isArray(t))return;const o=t.filter(a=>a.status==="pendente"||a.status==="aguardando-pagamento"),n=new Set(o.map(a=>a.id)),s=o.filter(a=>!Te.has(a.id));s.length>0&&Q&&i.isAutoRefreshActive&&(console.log("[Dashboard Notifications] Novo(s) pedido(s) pendente(s) detectado(s). Tocando som..."),Q.play().catch(a=>console.warn("Não foi possível tocar o áudio de notificação:",a))),!e&&s.length>0&&St(s),document.title=o.length>0?`(${o.length}) Novo(s) Pedido(s)!`:xt,Te=n}function At(){const e=document.getElementById("nativa-notification-sound");if(e){Q=e;const t=()=>{Q&&Q.play().then(()=>{Q.pause(),document.removeEventListener("click",t,!0),document.removeEventListener("touchstart",t,!0),console.log("[Dashboard Notifications] Áudio desbloqueado para autoplay.")}).catch(()=>{console.warn("[Dashboard Notifications] Autoplay do áudio possivelmente bloqueado. Aguardando interação.")})};t(),document.addEventListener("click",t,{once:!0,capture:!0}),document.addEventListener("touchstart",t,{once:!0,capture:!0})}else console.error("[Dashboard Notifications] Elemento de áudio para notificação não encontrado.")}const ue="nativaPedidosFilters";function Ot(e){var d,r,m;const t=(d=e.statusFilterContainer)==null?void 0:d.querySelectorAll('input[data-filter-type="status"]:checked'),o=(r=e.statusFilterContainer)==null?void 0:r.querySelectorAll('input[data-filter-type="modality"]:checked'),n=(m=e.dateFilterGroup)==null?void 0:m.querySelector(".is-active"),s=e.searchTermInput,a=t?[...t].map(f=>f.value):[];let l=o?[...o].map(f=>f.value):[];(l.includes("all")||l.length===0)&&(l=["all"]);const c=(n==null?void 0:n.dataset.filter)||"today",p=(s==null?void 0:s.value)||"",u={statuses:a,modalities:l,date:c,search:p};try{sessionStorage.setItem(ue,JSON.stringify(u))}catch(f){console.error("Erro ao salvar filtros na sessionStorage:",f)}}function Ve(e){const t=sessionStorage.getItem(ue);if(!t)return null;try{const o=JSON.parse(t);if(console.log("[SONDA _loadFiltersFromSession] Filtros carregados:",JSON.parse(JSON.stringify(o))),o.date&&e.dateFilterGroup?e.dateFilterGroup.querySelectorAll(".nativa-toggle-button").forEach(n=>{n.classList.toggle("is-active",n.dataset.filter===o.date)}):e.dateFilterGroup&&e.dateFilterGroup.querySelectorAll(".nativa-toggle-button").forEach(n=>{n.classList.toggle("is-active",n.dataset.filter==="today")}),e.statusFilterContainer){e.statusFilterContainer.querySelectorAll('input[data-filter-type="status"]').forEach(a=>{var l;a.checked=((l=o.statuses)==null?void 0:l.includes(a.value))??!1});const n=o.modalities??["all"],s=n.includes("all");e.statusFilterContainer.querySelectorAll('input[data-filter-type="modality"]').forEach(a=>{a.value==="all"?a.checked=s:a.checked=!s&&n.includes(a.value)}),Qe(null,e)}return e.searchTermInput&&(e.searchTermInput.value=o.search||""),o}catch(o){return console.error("Erro ao carregar filtros da sessão:",o),sessionStorage.removeItem(ue),null}}function ne(e,t=!0){var p,u;if(console.log("[SONDA applyFiltersAndRender] Iniciando..."),!e.statusFilterContainer||!e.dateFilterGroup||!e.searchTermInput){console.warn("Elementos de filtro não encontrados, pulando aplicação de filtros."),i.currentFilteredOrders=[...i.allOrders].sort((d,r)=>r.id-d.id),console.log("[SONDA applyFiltersAndRender] Sem controles de filtro, usando state.allOrders:",JSON.parse(JSON.stringify(i.currentFilteredOrders))),i.currentlyDisplayedOrders=i.currentFilteredOrders.slice(0,ae),e.tableContainer&&te(i.currentlyDisplayedOrders,!0),oe(e),se(i.currentFilteredOrders);return}const o=e.statusFilterContainer.querySelectorAll('input[data-filter-type="status"]:checked'),n=e.statusFilterContainer.querySelectorAll('input[data-filter-type="modality"]:checked'),s=e.searchTermInput.value.toLowerCase().trim(),a=((u=(p=e.dateFilterGroup)==null?void 0:p.querySelector(".is-active"))==null?void 0:u.dataset.filter)||"default";console.log("[SONDA applyFiltersAndRender] Filtro de data da UI:",a);const l=[...o].map(d=>d.value);let c=[...n].map(d=>d.value);(c.includes("all")||c.length===0)&&(c=["all"]),console.log("[SONDA applyFiltersAndRender] Filtros aplicados:",{selectedStatuses:l,selectedModalities:c,searchTerm:s}),console.log("[SONDA applyFiltersAndRender] state.allOrders ANTES de filtrar:",JSON.parse(JSON.stringify(i.allOrders))),i.currentFilteredOrders=i.allOrders.filter(d=>{if(!d||!d.details)return!1;const r=l.length===0||l.includes(d.status),m=c.includes("all")||c.includes(d.details.pedido_tipo_servico),f=(d.customer_name||"").split(" ")[0].toLowerCase(),A=(d.details.pedido_whatsapp_cliente||"").replace(/\D/g,""),w=!s||f.includes(s)||String(d.id).includes(s)||A.includes(s);return r&&m&&w}).sort((d,r)=>r.id-d.id),console.log("[SONDA applyFiltersAndRender] state.currentFilteredOrders DEPOIS de filtrar:",JSON.parse(JSON.stringify(i.currentFilteredOrders))),i.currentlyDisplayedOrders=i.currentFilteredOrders.slice(0,ae),console.log("[SONDA applyFiltersAndRender] state.currentlyDisplayedOrders (batch inicial):",JSON.parse(JSON.stringify(i.currentlyDisplayedOrders))),e.tableContainer?te(i.currentlyDisplayedOrders,t):console.error("[SONDA applyFiltersAndRender] Erro: selectors.tableContainer não encontrado para renderizar a tabela."),oe(e),Ot(e),se(i.currentFilteredOrders)}function Qe(e=null,t){var l;const o=(l=t.statusFilterContainer)==null?void 0:l.querySelector(".status-filter-dropdown-panel");if(!o)return;const n=o.querySelector("#modality-all"),s=o.querySelectorAll('input[data-filter-type="modality"]:not(#modality-all)');if(!n)return;let a=!1;if(e===n?n.checked?s.forEach(c=>{c.checked&&(c.checked=!1,a=!0)}):n.checked=!0:e&&e.dataset.filterType==="modality"?e.checked?n.checked&&(n.checked=!1,a=!0):a=!0:e||(a=!0),a){const c=[...s].some(p=>p.checked);!c&&!n.checked?n.checked=!0:c&&n.checked&&(n.checked=!1)}}function Tt(e){var o;const t=(o=e.statusFilterContainer)==null?void 0:o.querySelector(".status-filter-dropdown-panel");t&&(t.removeEventListener("change",Ee),t.addEventListener("change",Ee))}function Ee(e){const t={statusFilterContainer:document.getElementById("status-filter-container"),dateFilterGroup:document.getElementById("date-filter-group"),searchTermInput:document.getElementById("search-term"),tableContainer:document.getElementById("pedidos-table-container")},o=e.target.closest("input.filter-checkbox");o&&(o.dataset.filterType==="modality"&&Qe(o,t),ne(t,!0))}let k={};async function R(e=!1,t="today",o=!1,n){var s;k=n,console.log("[SONDA fetchData] Iniciando...",{isFullReload:e,dateFilter:t}),o&&e&&k.tableContainer&&(k.tableContainer.innerHTML='<div class="dashboard-loader"><span class="material-symbols-rounded is-loading">hourglass_top</span><span>Carregando pedidos...</span></div>');try{let a,l=!1;if(e)a=await ct(t),console.log(`[SONDA fetchData] Dados recebidos (full reload, filter=${t}):`,JSON.parse(JSON.stringify(a))),i.allOrders=Array.isArray(a.orders)?a.orders:[],Array.isArray(a.orders)||console.warn("[SONDA fetchData] Atenção: API não retornou um array para data.orders em full reload."),i.allStatuses=a.statuses||[],i.allEntregadores=a.entregadores||[],i.allPaymentMethods=a.payment_methods_map||{},i.allPaymentMethodsData=a.payment_methods_data||[],i.lastCheckTimestamp=a.server_timestamp,l=!0,o&&k.statusFilterContainer&&(Ge(),Ve(k),Tt(k));else{a=await pt(i.lastCheckTimestamp),console.log("[SONDA fetchData] Atualizações recebidas:",JSON.parse(JSON.stringify(a)));const c=a.updated_orders||[],p=a.deleted_order_ids||[];if(p.length>0){const u=i.allOrders.length;i.allOrders=i.allOrders.filter(d=>!p.includes(String(d.id))),i.allOrders.length!==u&&(l=!0)}if(c.length>0&&(l=!0,c.forEach(d=>{const r=String(d.id),m=i.allOrders.findIndex(f=>String(f.id)==r);m>-1?JSON.stringify(i.allOrders[m])!==JSON.stringify(d)&&(i.allOrders[m]=d):i.allOrders.push(d)}),c.some(d=>!i.allOrders.find(r=>String(r.id)===String(d.id)))?(console.log("[SONDA fetchData] Novos pedidos adicionados, reordenando state.allOrders..."),i.allOrders.sort((d,r)=>r.id-d.id)):console.log("[SONDA fetchData] Apenas atualizações, sem reordenar state.allOrders.")),i.lastCheckTimestamp=a.server_timestamp,!l){ne(k,!1),console.log("[SONDA fetchData] Nenhuma alteração detectada nas atualizações.");return}}console.log("[SONDA fetchData] state.allOrders atualizado:",JSON.parse(JSON.stringify(i.allOrders))),ne(k,!0)}catch(a){if(console.error("Erro ao buscar dados do dashboard:",a),a&&a.status===403){console.warn("Erro 403 detectado. Tentando redirecionar para login...");const l=(s=window.nativaDeliveryData)==null?void 0:s.login_url;if(l){window.location.href=l;return}else console.error("URL de login não encontrada em window.nativaDeliveryData. Exibindo erro padrão."),o&&e&&k.tableContainer&&(k.tableContainer.innerHTML='<p style="color: red; text-align: center; padding: 20px;">Falha ao carregar pedidos: Sessão inválida ou expirada. Por favor, <a href="javascript:location.reload();">recarregue a página</a> para fazer login.</p>')}else o&&e&&k.tableContainer&&(k.tableContainer.innerHTML=`<p style="color: red; text-align: center; padding: 20px;">Falha ao carregar pedidos: ${a.message}</p>`);throw a}}const Ke=()=>{if(!document.getElementById("nativa-dashboard-print-modal-styles")){const e=document.createElement("style");e.id="nativa-dashboard-print-modal-styles",e.innerHTML=`
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
        `,document.head.appendChild(e),console.log("[SONDA ACTIONS] Estilos de modal injetados manualmente.")}};function Et(e){if(console.log("[SONDA ACTIONS] _openKitchenPrintModal iniciado. Pedido:",e),Ke(),!e||!e.details){console.error("[SONDA ACTIONS] Erro: Objeto pedido inválido ou sem detalhes.",e),b("Dados do pedido incompletos.","error");return}let t={};try{console.log("[SONDA ACTIONS] Tentando parsear JSON de itens:",e.details.pedido_itens_json),t=JSON.parse(e.details.pedido_itens_json||"{}")}catch(d){console.error("[SONDA ACTIONS] Erro ao parsear JSON:",d),b("Erro ao ler itens do pedido.","error");return}const o=Object.keys(t);if(o.length===0){console.warn("[SONDA ACTIONS] Pedido sem itens (keys.length = 0)."),b("Pedido sem itens.","error");return}const n=document.createElement("div");n.className="nativa-modal-overlay",n.style.zIndex="10001";const s=document.createElement("div");s.className="nativa-modal-dialog",s.style.maxWidth="500px",s.style.textAlign="left";let a=`
        <div style="padding: 10px 10px 5px 10px; display: flex; align-items: center; gap: 10px; border-bottom: 2px solid var(--md-sys-color-outline-variant);">
            <input type="checkbox" id="kp-toggle-all" checked style="width: 20px; height: 20px; accent-color: var(--md-sys-color-primary); cursor: pointer;">
            <label for="kp-toggle-all" style="font-weight: bold; cursor: pointer; color: var(--md-sys-color-on-surface);">Selecionar/Desmarcar Todos</label>
        </div>
    `,l='<div class="kitchen-print-checklist" style="max-height: 400px; overflow-y: auto; margin: 0 0 10px 0; border: 1px solid var(--md-sys-color-outline-variant); border-top: none; border-radius: 0 0 8px 8px; padding: 10px;">';o.forEach(d=>{const r=t[d],m=r.product_name||r.name,f=parseInt(r.quantity,10)||1,A=f>1?`<strong>${f}x</strong> `:"";let w="";r.is_combo&&Array.isArray(r.selections)?r.selections.forEach(O=>{w+=`<div style="font-size: 0.85em; color: var(--md-sys-color-on-surface-variant); margin-left: 10px;">• ${g(O.productName)}</div>`,O.selectedAddons&&Object.values(O.selectedAddons).forEach(_=>{Object.values(_.items||{}).forEach(y=>{const $=parseInt(y.itemQuantity,10),L=$>1?`<strong>${$}x</strong> `:"";w+=`<div style="font-size: 0.85em; color: var(--md-sys-color-outline); margin-left: 20px;">+ ${L}${g(y.itemName)}</div>`})})}):r.selected_addons&&Object.values(r.selected_addons).forEach(O=>{Object.values(O.items||{}).forEach(_=>{const y=parseInt(_.itemQuantity,10),$=y>1?`<strong>${y}x</strong> `:"";w+=`<div style="font-size: 0.85em; color: var(--md-sys-color-on-surface-variant); margin-left: 10px;">+ ${$}${g(_.itemName)}</div>`})}),r.observacoes&&(w+=`<div style="font-size: 0.85em; color: var(--md-sys-color-on-surface-variant); margin-left: 10px; font-style: italic;">Obs: ${g(r.observacoes)}</div>`),l+=`
            <label style="display: flex; align-items: flex-start; gap: 10px; padding: 12px 0; border-bottom: 1px dashed var(--md-sys-color-outline-variant); cursor: pointer;">
                <input type="checkbox" class="kp-item-checkbox" value="${d}" checked style="width: 20px; height: 20px; accent-color: var(--md-sys-color-primary); margin-top: 4px; flex-shrink: 0;">
                <div style="display: flex; flex-direction: column; width: 100%;">
                    <span style="font-size: 1rem; color: var(--md-sys-color-on-surface); line-height: 1.4;">${A}${g(m)}</span>
                    ${w}
                </div>
            </label>
        `}),l+="</div>",s.innerHTML=`
        <h2 class="nativa-modal-title" style="text-align: center;">Imprimir Cozinha</h2>
        <p class="nativa-modal-message" style="text-align: center; margin-bottom: 5px;">Selecione os itens para impressão:</p>
        ${a}
        ${l}
        <div class="nativa-modal-actions" style="display: flex; justify-content: space-between; gap: 10px; margin-top: 15px;">
            <button id="kp-cancel" class="nativa-button-secondary" style="flex: 1;">Cancelar</button>
            <button id="kp-selected" class="nativa-button-primary" style="flex: 2;">Imprimir Selecionados</button>
            <button id="kp-all" class="nativa-button-secondary" style="flex: 1;" title="Imprimir todos independente da seleção">Tudo</button>
        </div>
    `,console.log("[SONDA ACTIONS] Appending kitchen modal to document.body"),n.appendChild(s),document.body.appendChild(n),requestAnimationFrame(()=>{n.classList.add("is-visible")});const c=s.querySelector("#kp-toggle-all"),p=s.querySelectorAll(".kp-item-checkbox");c.addEventListener("change",d=>{const r=d.target.checked;p.forEach(m=>{m.checked=r})}),p.forEach(d=>{d.addEventListener("change",()=>{const r=Array.from(p).every(f=>f.checked),m=Array.from(p).some(f=>f.checked);c.checked=r,c.indeterminate=m&&!r})});const u=()=>{n.classList.remove("is-visible"),setTimeout(()=>n.remove(),250)};s.querySelector("#kp-cancel").addEventListener("click",u),s.querySelector("#kp-all").addEventListener("click",()=>{Ce(e,null),u()}),s.querySelector("#kp-selected").addEventListener("click",()=>{const d=s.querySelectorAll(".kp-item-checkbox:checked"),r=Array.from(d).map(m=>m.value);if(r.length===0){b("Nenhum item selecionado.","warning");return}Ce(e,r),u()}),n.addEventListener("click",d=>{d.target===n&&u()})}function Nt(e){console.log("[SONDA ACTIONS] _openCourierPrintModal iniciado. Pedido:",e),Ke();const t=document.createElement("div");t.className="nativa-modal-overlay",t.style.zIndex="10001";const o=document.createElement("div");o.className="nativa-modal-dialog",o.innerHTML=`
        <span class="material-symbols-rounded nativa-modal-icon icon-big" style="font-size: 48px; color: var(--md-sys-color-outline); margin-bottom: 8px;">receipt_long</span>
        <h2 class="nativa-modal-title" style="margin: 0 0 8px 0; font-size: 1.5rem;">Imprimir Relatório Geral</h2>
        <div class="nativa-modal-message" style="margin-bottom: 16px;">Deseja imprimir o cupom geral (Motoboy/Cliente) para o pedido #${e.id}?</div>
        <div class="nativa-modal-actions" style="display: flex; gap: 8px; justify-content: center;">
            <button id="cp-cancel" class="nativa-button-secondary">Cancelar</button>
            <button id="cp-confirm" class="nativa-button-primary">Imprimir</button>
        </div>
    `,console.log("[SONDA ACTIONS] Appending courier modal to document.body"),t.appendChild(o),document.body.appendChild(t),requestAnimationFrame(()=>{t.classList.add("is-visible")});const n=()=>{t.classList.remove("is-visible"),setTimeout(()=>t.remove(),250)};o.querySelector("#cp-cancel").addEventListener("click",n),o.querySelector("#cp-confirm").addEventListener("click",()=>{rt(e),n()}),t.addEventListener("click",s=>{s.target===t&&n()})}async function kt(e,t,o){var p,u,d;const n=e.dataset.action,s=e.dataset.orderId,a=i.allOrders.find(r=>r.id==s),l=((u=(p=t.dateFilterGroup)==null?void 0:p.querySelector(".is-active"))==null?void 0:u.dataset.filter)||"today",c=e.innerHTML;switch(console.log("[SONDA ACTIONS] handleTooltipAction chamado. Ação:",n,"OrderId:",s),n){case"print-courier":{if(!a){console.error("[SONDA ACTIONS] Erro: Pedido não encontrado no state.allOrders para ID:",s),b("Erro: Pedido não encontrado.","error");return}console.log("[SONDA ACTIONS] Chamando _openCourierPrintModal..."),Nt(a);break}case"print-kitchen":{if(!a){console.error("[SONDA ACTIONS] Erro: Pedido não encontrado no state.allOrders para ID:",s),b("Erro: Pedido não encontrado.","error");return}console.log("[SONDA ACTIONS] Chamando _openKitchenPrintModal..."),Et(a);break}case"status-change":{const r=e.dataset.nextStatus,m=i.allStatuses.find(w=>w.slug===r),f=(m==null?void 0:m.name)||r;if(await V({title:"Confirmar Alteração",iconName:"published_with_changes",message:`Mudar status do pedido #${s} para "${f}"?`,confirmText:"Confirmar",cancelText:"Cancelar"})){e.disabled=!0,e.classList.add("is-loading");try{await ut(s,r),await R(!0,l,!1,t),i.activeTooltip&&i.activeTooltip.row&&o.toggleTooltip(i.activeTooltip.row)}catch(w){b(`Erro: ${w.message}`,"error"),e.disabled=!1,e.classList.remove("is-loading"),e.innerHTML=c}}break}case"recognize-payment":{if(await V({title:"Confirmar Pagamento",iconName:"price_check",message:`Confirmar recebimento PIX p/ pedido #${s}? (Irreversível)`,confirmText:"Confirmar",cancelText:"Cancelar",isCritical:!1})){e.disabled=!0,e.classList.add("is-loading");try{await gt(s),await R(!0,l,!1,t),i.activeTooltip&&i.activeTooltip.row&&o.toggleTooltip(i.activeTooltip.row)}catch(m){b(`Erro: ${m.message}`,"error"),e.disabled=!1,e.classList.remove("is-loading"),e.innerHTML=c}}break}case"refund-status":{if(!a){b("Pedido não encontrado.","error");break}const r=a.payment_refunded;if(await V({title:`Confirmar ${r?"Desfazer Estorno":"Estorno"}`,iconName:r?"undo":"credit_card_off",message:`Deseja ${r?"DESFAZER ESTORNO":"MARCAR COMO ESTORNADO"} o pagamento do pedido #${s}?`,confirmText:"Confirmar",cancelText:"Cancelar",isCritical:!r})){e.disabled=!0,e.classList.add("is-loading");try{await ft(s,!r),await R(!0,l,!1,t),i.activeTooltip&&i.activeTooltip.row&&o.toggleTooltip(i.activeTooltip.row)}catch(A){b(`Erro: ${A.message}`,"error"),e.disabled=!1,e.classList.remove("is-loading"),e.innerHTML=c}}break}case"notify-customer":{const r=e.dataset.url;if(!r){b("Link de notificação indisponível.","warning");break}const m=e.dataset.status,f=((d=i.allStatuses.find(w=>w.slug===m))==null?void 0:d.name)||m;await V({title:"Notificar Cliente",iconName:"send",message:`Notificar cliente sobre status "${f}" do pedido #${s}?`,confirmText:"Notificar",cancelText:"Cancelar"})&&(window.open(r,"_blank"),sessionStorage.setItem(`notified_${s}_${m}`,"true"),e.classList.add("active"),e.innerHTML='<span class="material-symbols-rounded">check</span>Notificado');break}case"notify-delivery":{const r=decodeURI(e.dataset.copyText||"");r?Ne(r):b("Dados de entrega não encontrados para cópia.","error");break}}}async function Dt(e,t){var l,c;const o=e.dataset.orderId,n=e.dataset.originalValue,s=e.value,a=((c=(l=t.dateFilterGroup)==null?void 0:l.querySelector(".is-active"))==null?void 0:c.dataset.filter)||"today";if(e.matches(".entregador-select")){e.disabled=!0;try{await mt(o,s),b("Entregador designado!","success"),await R(!0,a,!1,t)}catch(p){b(`Erro: ${p.message}`,"error"),e.value=n,e.disabled=!1}}else e.matches(".status-select")&&(e.value=n)}function It(e){const t=decodeURI(e.dataset.copyText||""),o=t.toLowerCase().includes("erro");Ne(t),o?b(t,"error"):b("Copiado!","success")}let ie=!0,Lt=new Set;const v={tableContainer:null,statusFilterContainer:null,searchTermInput:null,autoRefreshToggle:null,dateFilterGroup:null};function We(){var t,o;if(!v.autoRefreshToggle)return;const e=v.autoRefreshToggle.querySelector(".button-text");if(i.refreshInterval)clearInterval(i.refreshInterval),i.refreshInterval=null,i.isAutoRefreshActive=!1,v.autoRefreshToggle.classList.remove("active"),v.autoRefreshToggle.title="Ativar atualização automática",e&&(e.textContent="Auto-Refresh"),console.log("Auto-Refresh Desativado"),se(ie);else{const n=((o=(t=v.dateFilterGroup)==null?void 0:t.querySelector(".is-active"))==null?void 0:o.dataset.filter)||"today";R(!1,n,!1,v),i.refreshInterval=setInterval(()=>R(!1,n,!1,v),15e3),i.isAutoRefreshActive=!0,v.autoRefreshToggle.classList.add("active"),v.autoRefreshToggle.title="Desativar atualização automática",e&&(e.textContent="Auto Ativo"),console.log("Auto-Refresh Ativado"),se(ie)}}const Pt=()=>{v.tableContainer=document.getElementById("pedidos-table-container"),v.statusFilterContainer=document.getElementById("status-filter-container"),v.searchTermInput=document.getElementById("search-term"),v.autoRefreshToggle=document.getElementById("auto-refresh-toggle"),v.dateFilterGroup=document.getElementById("date-filter-group"),At();const e=Ve(v),t=(e==null?void 0:e.date)||"today";R(!0,t,!0,v).then(()=>{ie&&(ie=!1)}).catch(o=>{console.error("Falha na busca inicial de dados do dashboard:",o)}),Mt(),We(),$t(),Ct(()=>{var n,s;const o=((s=(n=v.dateFilterGroup)==null?void 0:n.querySelector(".is-active"))==null?void 0:s.dataset.filter)||"today";R(!1,o,!1,v)}),console.log("Dashboard Handlers Inicializado.")},Mt=()=>{var t,o,n;const e=document.querySelector(".header-filters");e?e.addEventListener("click",s=>{const a=s.target.closest(".status-filter-dropdown-button");if(a){const l=a.nextElementSibling;l&&l.classList.contains("status-filter-dropdown-panel")&&(l.classList.toggle("is-open"),a.setAttribute("aria-expanded",l.classList.contains("is-open")))}}):console.warn("Container de filtros '.header-filters' não encontrado."),document.addEventListener("click",s=>{if(v.statusFilterContainer&&!v.statusFilterContainer.contains(s.target)){const a=v.statusFilterContainer.querySelector(".status-filter-dropdown-panel.is-open");if(a){a.classList.remove("is-open");const l=v.statusFilterContainer.querySelector(".status-filter-dropdown-button");l&&l.setAttribute("aria-expanded","false")}}}),(t=v.searchTermInput)==null||t.addEventListener("input",()=>ne(v,!0)),(o=v.autoRefreshToggle)==null||o.addEventListener("click",We),(n=v.dateFilterGroup)==null||n.addEventListener("click",s=>{const a=s.target.closest(".nativa-toggle-button");if(!a||a.classList.contains("is-active"))return;i.activeTooltip&&i.activeTooltip.row&&pe(i.activeTooltip.row),v.dateFilterGroup.querySelectorAll(".nativa-toggle-button").forEach(c=>c.classList.remove("is-active")),a.classList.add("is-active");const l=a.dataset.filter;v.tableContainer&&(v.tableContainer.innerHTML='<div class="dashboard-loader"><span class="material-symbols-rounded is-loading">hourglass_top</span><span>Carregando pedidos...</span></div>'),Lt.clear(),R(!0,l,!1,v)}),v.tableContainer?(v.tableContainer.addEventListener("click",async s=>{const a=s.target,l=a.closest("[data-copy-text]");if(l&&(It(l),l.classList.contains("order-actions-button"))){s.stopPropagation();return}const c=a.closest(".order-actions-button");if(c){s.stopPropagation(),await kt(c,v,bt);return}const p=a.closest("tr[data-order-id]");p&&!a.closest("select, a, button, input")&&pe(p)}),v.tableContainer.addEventListener("change",async s=>{const a=s.target;a.matches(".entregador-select, .status-select")&&await Dt(a,v)})):console.error("Container da tabela '#pedidos-table-container' não encontrado para adicionar listeners.")};function Ft(){b("Dashboard de Pedidos v3.1 Carregado","success"),Pt(),console.log("Dashboard de Pedidos inicializado com sucesso.")}document.addEventListener("DOMContentLoaded",()=>{console.log("[Nativa PDV] Boot iniciado."),me();try{Ft(),console.log("[Nativa PDV] Gerenciador de Pedidos conectado.")}catch(e){console.error("[Nativa PDV] Falha ao iniciar Order Manager:",e)}});window.pdvApp={initPdv:me,switchView:fe,closeClientModal:ge,handleSearch:De,searchGovApi:Ie,resetClientModal:ve,finalizeRegistration:Le,selectClient:ye,openClientModal:ke,closeOptionsModal:he,confirmOptions:Pe,selectMethod:Me,addPayment:Fe,finalizeOrder:Re,openPaymentModal:be,closePaymentModal:xe};console.log("[Nativa PDV] Funções globais exportadas para window.pdvApp");
//# sourceMappingURL=pdv.B1HJgSiI.js.map
