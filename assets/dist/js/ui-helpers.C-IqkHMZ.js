const A=window.nativaDeliveryData||{},ce=A.ajax_url,Q=A.ajax_nonce;A.google_client_id;A.payment_options;class _ extends Error{constructor(t,a=null,n={}){super(t),this.name="APIError",this.status=a,this.data=n}}const c=(e,t={},a=!1)=>{const n=new FormData;if(n.append("action","nativa_delivery_"+e),a){if(!Q)return console.error(`NativaApiService: Nonce ausente para a ação privada '${e}'. O usuário provavelmente não está logado.`),Promise.reject(new _("Sessão de segurança inválida. Por favor, recarregue a página e faça login novamente.",403));n.append("nonce",Q)}for(const o in t)Object.prototype.hasOwnProperty.call(t,o)&&(typeof t[o]=="object"&&t[o]!==null?n.append(o,JSON.stringify(t[o])):n.append(o,t[o]));return fetch(ce,{method:"POST",body:n}).then(async o=>{var i;if(!o.ok){const s=await o.text();try{const r=JSON.parse(s),d=((i=r.data)==null?void 0:i.message)||r.data||`Erro no servidor (HTTP ${o.status})`;throw new _(d,o.status,r.data)}catch{const d=s.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();throw new _(d||`Erro no servidor (HTTP ${o.status})`,o.status)}}return o.json()}).then(o=>{var i;if(o.success)return o.data;throw new _(((i=o.data)==null?void 0:i.message)||o.data||"Ocorreu um erro desconhecido na requisição.",null,o.data)}).catch(o=>{throw console.error(`[API Service] Erro na ação '${e}':`,o.message),o instanceof _?o:new _(o.message||"Erro de comunicação com o servidor.")})},$e=()=>{const e=`${window.location.origin}/wp-json/nativa-delivery/v1/menu-data`;return fetch(e,{method:"GET",headers:{"Content-Type":"application/json"}}).then(t=>{if(!t.ok)throw new Error(`Erro HTTP: ${t.status}`);return t.json()}).catch(t=>{throw console.error("REST API Error:",t),t})},Me=()=>c("get_cart_contents",{},!1),Oe=e=>{const t=e.is_reward||!1;return c("add_to_cart",e,t)},ze=e=>c("add_combo_to_cart",e,!1),He=(e,t)=>c("update_cart_item_quantity",{cart_item_key:e,quantity:t},!1),Fe=()=>c("clear_cart",{},!1),qe=(e,t,a)=>c("validate_coupon",{coupon_code:e,cart_subtotal:t,customer_cpf:a},!0),Re=e=>c("submit_order",e,!0),Ve=()=>c("get_my_account_data",{},!0),je=e=>c("update_my_phone",{phone:e},!0),Ge=()=>c("get_my_addresses",{},!0),ue=e=>c("add_or_update_address",{form_data:e},!0),me=e=>c("delete_address",{address_id:e},!0),pe=()=>c("get_ruas",{},!1),ve=()=>c("get_bairros",{},!1),Ue=e=>c("get_pix_data",{order_id:e},!0),We=e=>c("check_pix_status",{order_id:e},!0),Je=()=>c("get_live_status",{},!1),Ke=()=>c("get_my_favorites",{},!0),Xe=()=>c("delete_my_account",{},!0),ge=e=>c("complete_onboarding_data",{form_data:e},!0),Ye=e=>c("cancel_my_order",{order_id:e},!0),Ze=e=>c("add_selected_items_to_cart",{items:e},!0),Qe=()=>c("get_my_orders",{},!0),et=()=>c("get_available_rewards",{},!0),tt=e=>c("save_custom_favorite",e,!0),at=e=>c("delete_custom_favorite",{favorite_id:e},!0),nt=e=>c("redeem_reward",{product_id:e},!0),fe=e=>c("handle_google_login",{credential:e},!1),ot=e=>c("send_pix_expiration_warning",{order_id:e},!0),be=e=>c("fetch_cpf_data",{cpf:e},!0),f={isInitialized:!1,allBairros:[],allRuas:[],serverData:{serviceStatus:{},operatingHours:{},paymentMethods:[],googleClientId:null,whatsappNumber:null,logoutUrl:null,checkoutUrl:null,app_version:null},cart:{contents:{},subtotal:0,count:0,offer:null},selectedModality:null,selectedBairro:null,deliveryFee:0,appliedCoupon:{code:null,amount:0},menu:{currentComboData:null,currentStepIndex:0,flatSteps:[],userSelections:[],editingCartItemKey:null,favoriteProducts:{},isFavoriteFilterActive:!1,afterModalityAction:null,currentProduct:null,lastClickedCardElement:null,pendingFavorite:null},user:{isLoggedIn:!1,profile:null,orders:[],currentOrder:null,pendingPaymentOrder:null,addresses:[],rewards:null,paymentRestriction:null}};let z=!1;async function ye(e){const t=document.getElementById("nativa-social-login-container");t&&(t.innerHTML='<div class="login-loader-spinner" style="display: flex; justify-content: center; align-items: center; height: 40px;"><span class="nativa-spinner"></span></div>');try{const a=await fe(e.credential,window.location.href);if(a&&a.redirect_url)(a.user_status==="new"||!a.is_profile_complete)&&sessionStorage.setItem("nativaShowWelcomeToast","true"),document.dispatchEvent(new CustomEvent("nativa:userLoggedIn")),localStorage.getItem("nativaGuestFavorites")&&(localStorage.removeItem("nativaGuestFavorites"),console.log("[Login Handler] Favoritos de convidado limpos após o login.")),sessionStorage.setItem("nativaLoginRedirect",a.final_redirect_url),window.location.href=a.redirect_url;else throw new Error(a.message||"Resposta inválida do servidor durante o login.")}catch(a){console.error("[Nativa Login] Erro na chamada da API ou no processamento da resposta:",a),m(a.message,"error"),t&&oe()}}function oe(){var a;const e=document.getElementById("nativa-social-login-container");if(!e)return;const t=(a=window.nativaDeliveryData)==null?void 0:a.google_client_id;if(!t){console.error("CRÍTICO: Google Client ID não encontrado em window.nativaDeliveryData."),e.innerHTML='<p style="text-align: center; color: var(--md_sys_color_error-container);">Erro de configuração de login.</p>';return}try{google.accounts.id.initialize({client_id:t,callback:ye,use_fedcm_for_prompt:!0}),e.innerHTML="",google.accounts.id.renderButton(e,{theme:"outline",size:"large",width:"300",text:"signin_with",locale:"pt-BR"})}catch(n){console.error("Erro CRÍTICO ao inicializar o Login com Google:",n),e&&(e.innerHTML='<p style="text-align: center; color: var(--md_sys_color_error-container);">Falha ao iniciar o serviço de login.</p>')}}function he(){const e=document.getElementById("nativa-social-login-container");if(!e)return;e.innerHTML='<div class="login-loader-spinner" style="display: flex; justify-content: center; align-items: center; height: 40px;"><span class="nativa-spinner"></span></div>';let t=0;const a=50,n=setInterval(()=>{typeof window.google<"u"&&typeof window.google.accounts<"u"?(clearInterval(n),oe()):(t++,t>a&&(clearInterval(n),console.error("A biblioteca Google Identity Services não carregou a tempo."),e&&(e.innerHTML='<p style="text-align: center; color: var(--md_sys_color_error-container);">Não foi possível carregar as opções de login. Tente recarregar a página.</p>')))},100)}const ee=()=>{z||(z=!0,he(),setTimeout(()=>{z=!1},1e3))},k=e=>String(e??"").replace(/[&<>"']/g,function(a){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;"}[a]}),st=e=>{const t=parseFloat(e);return isNaN(t)?"R$ 0,00":t.toLocaleString("pt-BR",{style:"currency",currency:"BRL"})},it=e=>{if(!e||typeof e!="string")return"";const t=e.replace(/\D/g,"");return t.length===11?`(${t.substring(0,2)}) ${t.substring(2,7)}-${t.substring(7)}`:t.length===10?`(${t.substring(0,2)}) ${t.substring(2,6)}-${t.substring(6)}`:e},rt=(e,t,a)=>{if(t!=="delivery"||!a)return 0;const n=parseFloat(a.taxa_entrega)||0,o=parseFloat(a.valor_minimo_frete_gratis)||0;return o>0&&e>=o?0:n},lt=e=>(typeof e!="number"&&(e=parseInt(e,10)||0),e.toLocaleString("pt-BR")),dt=e=>{if(!e)return!1;const t=e.scheduling_window_minutes??0;if(t<=0)return!1;const a=new Date,n=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][a.getDay()],o=e[n];if(o&&o.is_active==="on"){const i=a.toISOString().split("T")[0],s=new Date(`${i}T${o.store_hours.open}:00`),r=new Date(s.getTime()-t*6e4);return a>=r&&a<s}return!1},ct=e=>{if(!e||typeof e!="string")return"";try{return decodeURIComponent(e.replace(/\+/g," "))}catch{return e.replace(/\+/g," ")}};function H(e,t,a,n,o){const i=e.querySelector(".nativa-bottom-sheet-header");if(!i)return;const s=t/a*100;i.innerHTML=`
        <div class="nativa-wizard-header-content">
            <span class="material-symbols-rounded nativa-sheet-header-icon">${o}</span>
            <h3 id="address-form-title" class="nativa-sheet-title">${n}</h3>
            <div class="nativa-combo-progress-container address-progress">
                <span class="step-text">Passo ${t} de ${a}</span>
                <progress class="nativa-wizard-progress" max="100" value="${s}"></progress>
            </div>
        </div>
    `}function Ee(e){if(!e.querySelector(".nativa-bottom-sheet-handle")){const t=document.createElement("div");t.className="nativa-bottom-sheet-handle",e.prepend(t)}}function Ie(e,t={},a=[]){const n=document.getElementById("nativa-address-form-sheet"),o=document.getElementById("nativa-address-form-container"),i=n==null?void 0:n.querySelector(".nativa-bottom-sheet-content");if(!(!o||!n))if(i&&Ee(i),o.innerHTML="",e===1)H(n,1,3,"Onde você quer receber?","search"),o.innerHTML=`
            <div class="nativa-wizard-step fade-in">
                <p class="nativa-step-description">Comece digitando o nome da sua rua.</p>
                <div class="nativa-form-group search-group">
                    <div class="nativa-input-wrapper">
                        <span class="material-symbols-rounded prefix-icon">search</span>
                        <input type="text" id="address-search-input" class="nativa-input" placeholder="Ex: Avenida Brasil..." autocomplete="off">
                        <button id="clear-search-btn" class="icon-button" style="display: none;"><span class="material-symbols-rounded">close</span></button>
                    </div>
                </div>
                <div id="address-search-results" class="nativa-search-results-list">
                    <div class="empty-search-placeholder">
                        <span class="material-symbols-rounded">location_city</span>
                        <p>Digite para buscar seu endereço</p>
                    </div>
                </div>
            </div>
        `,setTimeout(()=>{var s;return(s=document.getElementById("address-search-input"))==null?void 0:s.focus()},100);else if(e===2){H(n,2,3,"Detalhes do endereço","home_pin");let s=t.bairroName;if(!s&&t.bairroId&&a){const r=a.find(d=>d.id==t.bairroId);s=r?r.nome:null}s=s||"Bairro não identificado",o.innerHTML=`
            <div class="nativa-wizard-step fade-in">
                <div class="selected-street-summary">
                    <div class="summary-content">
                        <span class="material-symbols-rounded summary-icon">location_on</span>
                        <div class="street-info">
                            <strong class="street-name">${k(t.streetName||"")}</strong>
                            <span class="street-bairro">${k(s)}</span>
                        </div>
                    </div>
                    <button id="change-street-btn" class="nativa-button-text-small">Alterar</button>
                </div>

                <div class="nativa-form-group-split nativa-phone-group mt-md">
                    <div class="nativa-form-group number-group">
                        <label for="address-number">Número</label>
                        <input type="tel" id="address-number" class="nativa-input" placeholder="123" inputmode="numeric">
                    </div>
                    <div class="nativa-no-number-group">
                        <div class="nativa-toggle-switch">
                            <div class="nativa-toggle-control">
                                <input type="checkbox" id="address-no-number" class="nativa-address-no-number-checkbox">
                                <label for="address-no-number" class="nativa-toggle-ui"></label>
                            </div>
                            <label for="address-no-number" class="nativa-toggle-label">Sem número</label>
                        </div>
                    </div>
                </div>

                <div class="nativa-form-group">
                    <label for="address-complement">Complemento (Opcional)</label>
                    <input type="text" id="address-complement" class="nativa-input" placeholder="Ex: Apto 101, Casa Verde">
                </div>

                <div class="wizard-actions">
                    <button id="address-step2-next-btn" class="nativa-button-primary full-width">Continuar</button>
                </div>
            </div>
        `}else e===3&&(H(n,3,3,"Para finalizar","check_circle"),o.innerHTML=`
            <div class="nativa-wizard-step fade-in">
                
                <div class="nativa-wizard-section">
                    <h4 class="wizard-section-title">Ajude o entregador <span class="optional-text">(Opcional)</span></h4>
                    <button id="get-geolocation-btn" class="nativa-button-secondary full-width location-btn needs-attention">
                        <span class="material-symbols-rounded">my_location</span>
                        <span>Compartilhar Localização Atual</span>
                    </button>
                    <p id="geo-status-msg" class="nativa-field-hint">Isso grava suas coordenadas GPS para uma entrega mais precisa.</p>
                </div>

                <div class="nativa-separator"></div>

                <div class="nativa-wizard-section">
                    <h4 class="wizard-section-title">Salvar endereço como:</h4>
                    <div class="apelido-chips">
                        <button type="button" class="nativa-chip" data-value="Casa">Casa</button>
                        <button type="button" class="nativa-chip" data-value="Trabalho">Trabalho</button>
                        <button type="button" class="nativa-chip" data-value="Namorada(o)">Namorada(o)</button>
                    </div>
                    <input type="text" id="address-apelido" class="nativa-input" placeholder="Ex: Casa de Praia, Escritório..." value="Casa">
                </div>

                <div class="nativa-wizard-toggle-container">
                    <div class="nativa-toggle-switch">
                        <div class="nativa-toggle-control">
                            <input type="checkbox" id="address-is-primary" checked>
                            <label for="address-is-primary" class="nativa-toggle-ui"></label>
                        </div>
                        <label for="address-is-primary" class="nativa-toggle-label">Definir como endereço principal</label>
                    </div>
                </div>

                <div class="wizard-actions dual-actions">
                    <button id="address-step3-back-btn" class="nativa-button-secondary btn-back">Voltar</button>
                    <button id="address-finish-btn" class="nativa-button-primary btn-finish">Salvar Endereço</button>
                </div>
            </div>
        `,setTimeout(()=>{var s;return(s=document.getElementById("address-apelido"))==null?void 0:s.focus()},100))}function F(e,t){const a=document.getElementById("address-search-results");if(a){if(a.innerHTML="",e.length===0){a.innerHTML=`
            <div class="empty-search-placeholder">
                <span class="material-symbols-rounded">search_off</span>
                <p>Nenhuma rua encontrada.</p>
            </div>
        `;return}e.forEach(n=>{const o=document.createElement("div");o.className="nativa-search-item",o.innerHTML=`
            <div class="item-main-wrapper">
                <span class="material-symbols-rounded item-icon">signpost</span>
                <div class="item-content">
                    <span class="item-title">${k(n.nome)}</span>
                    <span class="item-subtitle">${k(n.bairro_nome)}</span>
                </div>
            </div>
            <span class="material-symbols-rounded item-arrow">chevron_right</span>
        `,o.addEventListener("click",()=>t(n)),a.appendChild(o)})}}const q=e=>new Promise(t=>{const{title:a="Atenção",message:n="",iconName:o=null,confirmText:i="OK",cancelText:s=null,isCritical:r=!1}=e;if(!document.getElementById("nativa-modal-styles")){const E=document.createElement("style");E.id="nativa-modal-styles",E.innerHTML=`
                .nativa-modal-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background-color: rgba(0, 0, 0, 0.6); z-index: 10000;
                    display: flex; justify-content: center; align-items: center;
                    padding: 16px; box-sizing: border-box;
                    opacity: 0; transition: opacity 0.2s ease-in-out;
                }
                .nativa-modal-overlay.is-visible { opacity: 1; }
                .nativa-modal-dialog {
                    background-color: var(--md-sys-color-surface);
                    color: var(--md-sys-color-on-surface);
                    padding: 24px; border-radius: 28px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    width: 100%; max-width: 400px;
                    text-align: center;
                    transform: scale(0.95); opacity: 0;
                    transition: transform 0.2s ease-in-out, opacity 0.2s ease-in-out;
                    display: flex; flex-direction: column; gap: 16px;
                }
                .nativa-modal-overlay.is-visible .nativa-modal-dialog {
                    transform: scale(1); opacity: 1;
                }
                .nativa-modal-icon {
                    font-size: var(--icon-size-2xl);
                    color: var(--md-sys-color-outline);
                    margin-bottom: -8px;
                    line-height: 1;
                }
                .nativa-modal-icon.icon-big {
                    font-size: 48px;
                }
                .nativa-modal-icon.is-critical-icon {
                    color: var(--md-sys-color-error);
                }
                .nativa-modal-title {
                    font-size: var(--font-size-2xl);
                    line-height: 2rem;
                    font-weight: var(--font-weight-extrabold);
                    margin: 0;
                    color: var(--md-sys-color-on-surface);
                }
                .nativa-modal-message {
                    margin: 0; font-size: 1rem; line-height: 1.5rem;
                    color: var(--md-sys-color-on-surface-variant);
                    white-space: pre-line; /* Mantém para quebras de linha com 
 */
                }
                 /* Garante que o conteúdo HTML dentro da mensagem não tenha margens estranhas */
                .nativa-modal-message > *:first-child { margin-top: 0; }
                .nativa-modal-message > *:last-child { margin-bottom: 0; }
                .nativa-modal-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                    justify-content: space-between;
                }
                .nativa-modal-actions.single-action {
                    justify-content: center;
                }
                .nativa-modal-actions .nativa-button-primary.is-critical,
                .nativa-modal-actions .nativa-button-secondary.is-critical {
                    --md-sys-color-primary: var(--md-sys-color-error);
                    --md-sys-color-on-primary: var(--md-sys-color-on-error);
                    background-color: var(--md-sys-color-error);
                    color: var(--md-sys-color-on-error);
                }
                 .nativa-modal-actions .nativa-button-secondary.is-critical {
                    border-color: var(--md-sys-color-error);
                    color: var(--md-sys-color-error);
                 }
                 .nativa-modal-actions .nativa-button-secondary.is-critical:hover {
                    background-color: rgba(var(--md-sys-color-error-rgb), 0.08);
                 }
            `,document.head.appendChild(E)}const d=document.createElement("div");d.className="nativa-modal-overlay";const u=document.createElement("div");u.className="nativa-modal-dialog";const b=o?`<span class="material-symbols-rounded nativa-modal-icon icon-big ${r?"is-critical-icon":""}">${T(o)}</span>`:"",$=`<h2 class="nativa-modal-title">${T(a)}</h2>`,M=`<div class="nativa-modal-message">${n.replace(/\\n/g,`
`)}</div>`;let K="nativa-button-primary",X=r?"nativa-button-secondary is-critical":"nativa-button-secondary";r&&(K+=" is-critical",X="nativa-button-secondary");const Y=s!==null,re=Y?"nativa-modal-actions":"nativa-modal-actions single-action",le=`<button id="modal-confirm-btn" class="${K}">${T(i)}</button>`,de=Y?`<button id="modal-cancel-btn" class="${X}">${T(s)}</button>`:"";u.innerHTML=`
            ${b}
            ${$}
            ${M}
            <div class="${re}">
                ${de}
                ${le}
            </div>
        `,document.body.appendChild(d),d.appendChild(u),setTimeout(()=>{d.classList.add("is-visible")},10);const O=E=>{d.classList.remove("is-visible"),setTimeout(()=>{d.remove(),t(E)},200)};document.getElementById("modal-confirm-btn").addEventListener("click",()=>O(!0));const Z=document.getElementById("modal-cancel-btn");Z&&Z.addEventListener("click",()=>O(!1)),d.addEventListener("click",E=>{E.target===d&&O(!1)})});let g=1,l={origin:"my-account",addressId:null,streetId:null,streetName:"",bairroId:null,bairroName:"",number:"",noNumber:!1,complement:"",coords:null,apelido:"Casa",isPrimary:!1},C=[],w=[];const j="nativa_address_wizard_state",te=e=>e?e.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase():"";function y(){const e={currentStep:g,wizardData:l};sessionStorage.setItem(j,JSON.stringify(e))}function we(){try{const e=sessionStorage.getItem(j);return e?JSON.parse(e):null}catch{return null}}function se(){sessionStorage.removeItem(j),g=1,l={origin:"my-account",addressId:null,streetId:null,streetName:"",bairroId:null,bairroName:"",number:"",noNumber:!1,complement:"",coords:null,apelido:"Casa",isPrimary:!1}}async function ut(){if(C.length===0||w.length===0)try{const[e,t]=await Promise.all([pe(),ve()]);C=e.ruas||e,w=t.bairros||t,f.allBairros=w}catch(e){console.error("Erro ao carregar dados de endereço:",e)}window.nativaAddressListenersAttached||(document.addEventListener("click",function(e){const t=e.target.closest("#add-new-address-btn")||e.target.closest("#nativa-cart-add-address-btn")||e.target.closest("#cart-add-new-address-btn-pill"),a=e.target.closest(".edit-btn"),n=e.target.closest(".delete-btn"),o=e.target.closest("#nativa-checkout-address-action-btn");let i="my-account";(e.target.closest("#nativa-checkout-section")||e.target.closest("#nativa-cart-side-sheet"))&&(i="checkout"),t||o?(e.preventDefault(),R(i)):a?(e.preventDefault(),R(i,a.dataset.addressId)):n&&(e.preventDefault(),xe(n.dataset.addressId,i))}),window.nativaAddressListenersAttached=!0)}function R(e="my-account",t=null,a=!1){const n=document.getElementById("nativa-address-form-sheet");if(!n)return;e==="checkout"&&(!f.user.addresses||f.user.addresses.length===0)?(n.classList.add("is-unclosable"),n.querySelectorAll(".nativa-bottom-sheet-close, .sheet-close-btn").forEach(d=>d.style.display="none")):(n.classList.remove("is-unclosable"),n.querySelectorAll(".nativa-bottom-sheet-close, .sheet-close-btn").forEach(d=>d.style.display=""));const i=we();let s=!1;if(i&&(t?i.wizardData.addressId==t&&(s=!0):i.wizardData.addressId||(s=!0)),s)g=i.currentStep,l=i.wizardData,l.origin=e;else{if(se(),t){const r=f.user.addresses.find(d=>d.id==t);if(r){const d=w.find(u=>u.id==r.bairro_id);l={origin:e,addressId:r.id,streetId:r.street,streetName:r.street_name||r.street,bairroId:r.bairro_id,bairroName:d?d.nome:"Bairro",number:r.number,noNumber:r.number==="S/N",complement:r.complement,coords:{lat:r.latitude,lng:r.longitude},apelido:r.apelido,isPrimary:!!r.is_primary},g=2}}else l.origin=e,l.isPrimary=a||f.user.addresses.length===0;y()}S(),W(n)}function S(){Ie(g,l,w),_e()}function _e(){if(g===1){const e=document.getElementById("address-search-input"),t=document.getElementById("clear-search-btn");e&&(e.focus(),e.addEventListener("input",a=>{const n=te(a.target.value.trim());if(n.length>0){const o=C.filter(i=>te(i.nome).includes(n));F(o.slice(0,10),i=>{try{l.streetId=i.id,l.streetName=i.nome,l.bairroId=i.bairro_id||(i.segmentos&&i.segmentos[0]?i.segmentos[0].bairro_associado:null);let s=i.bairro_nome;if(!s&&l.bairroId&&w.length>0){const r=w.find(d=>d.id==l.bairroId);r&&(s=r.nome)}l.bairroName=s||"Bairro não identificado",g=2,y(),S()}catch(s){console.error("Erro ao selecionar rua:",s),m("Erro ao processar rua. Tente novamente.","error")}}),t&&(t.style.display="block")}else F([],null),t&&(t.style.display="none")})),t&&t.addEventListener("click",()=>{e&&(e.value="",e.focus(),F([],null),t.style.display="none")})}else if(g===2){const e=document.getElementById("address-step2-next-btn"),t=document.getElementById("change-street-btn"),a=document.getElementById("address-number"),n=document.getElementById("address-no-number"),o=document.getElementById("address-complement");a&&(a.value=l.number==="S/N"?"":l.number,l.noNumber&&(a.disabled=!0,a.placeholder="S/N",n&&(n.checked=!0))),o&&(o.value=l.complement||""),t&&t.addEventListener("click",()=>{g=1,l.streetId=null,l.streetName="",l.bairroId=null,l.bairroName="",y(),S()}),n&&a&&n.addEventListener("change",s=>{l.noNumber=s.target.checked,s.target.checked?(a.value="",a.disabled=!0,a.placeholder="S/N",l.number="S/N"):(a.disabled=!1,a.placeholder="123",a.focus(),l.number=""),y()});const i=()=>{l.noNumber||(l.number=a.value.trim()),l.complement=o.value.trim(),y()};a&&a.addEventListener("input",i),o&&o.addEventListener("input",i),e&&e.addEventListener("click",()=>{const s=a.value.trim();if(!n.checked&&s.length===0){m('Informe o número ou marque "Sem número".',"error"),a.focus();return}g=3,y(),S()})}else if(g===3){const e=document.getElementById("address-step3-back-btn"),t=document.getElementById("address-finish-btn"),a=document.getElementById("get-geolocation-btn"),n=document.getElementById("address-apelido"),o=document.getElementById("address-is-primary"),i=document.querySelectorAll(".nativa-chip");n&&(n.value=l.apelido||"Casa"),o&&(o.checked=l.isPrimary),l.coords&&a&&(a.classList.add("is-success"),a.classList.remove("needs-attention"),a.innerHTML='<span class="material-symbols-rounded">check_circle</span> Localização Salva!'),e&&e.addEventListener("click",()=>{g=2,y(),S()}),i.forEach(s=>{s.addEventListener("click",()=>{l.apelido=s.dataset.value,n&&(n.value=s.dataset.value),y()})}),a&&a.addEventListener("click",async()=>{a.classList.add("is-loading");const s=a.innerHTML;if(a.innerHTML='<span class="nativa-spinner-small"></span> Localizando...',!navigator.geolocation){m("Geolocalização indisponível.","error"),a.classList.remove("is-loading"),a.innerHTML=s;return}navigator.geolocation.getCurrentPosition(r=>{l.coords={lat:r.coords.latitude,lng:r.coords.longitude},y(),a.innerHTML='<span class="material-symbols-rounded">check_circle</span> Localização Salva!',a.classList.remove("is-loading"),a.classList.remove("needs-attention"),a.classList.add("is-success"),m("Localização capturada!","success")},r=>{console.error("Erro Geo:",r),m("Erro ao obter localização.","error"),a.classList.remove("is-loading"),a.innerHTML=s},{enableHighAccuracy:!0,timeout:1e4})}),t&&t.addEventListener("click",Ce),n&&n.addEventListener("input",s=>{l.apelido=s.target.value,y()}),o&&o.addEventListener("change",s=>{l.isPrimary=s.target.checked,y()})}}async function Ce(){const e=document.getElementById("address-finish-btn"),t=document.getElementById("address-apelido");if(!t.value.trim()){m("Dê um nome para este endereço.","error"),t.focus();return}V(e);try{const a={"nativa-delivery-address-street-name":l.streetName,"nativa-delivery-address-street":l.streetId,bairro_id:l.bairroId,number:l.number,complement:l.complement,apelido:l.apelido,is_primary:l.isPrimary?"on":void 0,no_number:l.noNumber?"on":void 0,address_id:l.addressId||""};l.coords&&(a.latitude=l.coords.lat,a.longitude=l.coords.lng);const n=new URLSearchParams;for(const s in a)a[s]!==void 0&&n.append(s,a[s]);const o=await ue(n.toString());m(o.message||"Endereço salvo com sucesso!","success"),se();const i=o.addresses;if(f.user.addresses=i,document.dispatchEvent(new CustomEvent("nativa:addressUpdated",{detail:{source:l.origin,addresses:i}})),l.origin==="checkout"){const s=i[i.length-1];s&&sessionStorage.setItem("nativaCartSelectedAddressId",s.id)}J(document.getElementById("nativa-address-form-sheet"))}catch(a){console.error(a),m(a.message||"Erro ao salvar endereço.","error")}finally{N(e)}}async function xe(e,t){if(await q({title:"Excluir Endereço",iconName:"delete_forever",message:"Tem certeza que deseja excluir este endereço?",confirmText:"Excluir",cancelText:"Cancelar",isCritical:!0}))try{const n=await me(e);f.user.addresses=n.addresses||[],document.dispatchEvent(new CustomEvent("nativa:addressUpdated",{detail:{source:t,addresses:f.user.addresses}})),m("Endereço excluído.","success")}catch(n){m(n.message,"error")}}function mt(e){return e?!C||!C.length?e:e.map(t=>{const a=C.find(n=>n.id==t.street);return{...t,streetName:a?a.nome:t.street_name||t.street}}):[]}const I=(e,t)=>{if(!e)return;t?(e.classList.remove("is-error"),e.classList.add("is-valid")):(e.classList.remove("is-valid"),e.classList.add("is-error"));const a=e.closest(".has-validation-icon, .nativa-form-group");a&&(a.classList.toggle("is-valid",t),a.classList.toggle("is-error",!t))},Le=e=>{let t=e.value.replace(/\D/g,"");t=t.substring(0,11),t=t.replace(/(\d{3})(\d)/,"$1.$2"),t=t.replace(/(\d{3})(\d)/,"$1.$2"),t=t.replace(/(\d{3})(\d{1,2})$/,"$1-$2"),e.value=t},Be=e=>{let t=e.value.replace(/\D/g,"");t=t.substring(0,9),t.length>5&&(t=t.replace(/(\d{5})(\d)/,"$1-$2")),e.value=t},Se=(e,t)=>{const a=e?e.replace(/\D/g,""):"",n=t?t.replace(/\D/g,""):"";return a?a.length<2?{isValid:!1,message:"O DDD precisa de 2 dígitos.",target:"ddd"}:n?n.length<8?{isValid:!1,message:"Número de telefone inválido (curto demais).",target:"number"}:{isValid:!0,message:"",target:null}:{isValid:!1,message:"O campo de número é obrigatório.",target:"number"}:{isValid:!1,message:"O campo DDD é obrigatório.",target:"ddd"}},Te=e=>{if(!e.required)return!0;const a=/^[a-zA-Z\u00C0-\u017F']{2,}(?:\s[a-zA-Z\u00C0-\u017F']{2,})+$/.test(e.value.trim());return I(e,a),a},ie=e=>{if(!e.required&&e.value.trim()===""){const o=e.closest(".has-validation-icon, .nativa-form-group");return o&&o.classList.remove("is-valid","is-error"),!0}let t=e.value.replace(/[^\d]+/g,"");if(t.length!==11||/^(\d)\1{10}$/.test(t))return I(e,!1),!1;let a=0,n;for(let o=1;o<=9;o++)a=a+parseInt(t.substring(o-1,o))*(11-o);if(n=a*10%11,(n===10||n===11)&&(n=0),n!==parseInt(t.substring(9,10)))return I(e,!1),!1;a=0;for(let o=1;o<=10;o++)a=a+parseInt(t.substring(o-1,o))*(12-o);return n=a*10%11,(n===10||n===11)&&(n=0),n!==parseInt(t.substring(10,11))?(I(e,!1),!1):(I(e,!0),!0)},pt=(e,t)=>{let a=!0,n="",o=null;const i=[{selector:'input[name="nativa-customer-name"]:required',validator:Te,message:"Por favor, insira seu nome completo."},{selector:'input[name="nativa-customer-cpf"]:required',validator:ie,message:"Por favor, insira um CPF válido."}];t==="delivery"&&i.push({selector:'input[name="selected_address"]:required',validator:()=>e.querySelector('input[name="selected_address"]:checked'),message:"Por favor, selecione um endereço para a entrega."}),i.forEach(d=>{const u=e.querySelector(d.selector);u&&!d.validator(u)&&(a=!1,n||(n=d.message,o=u))});const s=e.querySelector('input[name="nativa-payment-method"]'),r=document.getElementById("nativa-payment-method-options");if(s&&s.required){const d=s.value.trim()!=="";d||(a=!1,n||(n="Por favor, selecione um método de pagamento.",o=r)),r&&(r.classList.toggle("is-valid",d),r.classList.toggle("is-error",!d))}return!a&&n&&(m(n,"error"),o&&(o.focus(),o.scrollIntoView({behavior:"smooth",block:"center"}))),a};function G(e){const t=document.getElementById("nativa-onboarding-step-content"),a=document.getElementById("nativa-onboarding-title"),n=document.getElementById("nativa-onboarding-step-text"),o=document.getElementById("nativa-onboarding-progress"),i=document.getElementById("nativa-onboarding-back-btn"),s=document.getElementById("nativa-onboarding-next-btn");if(t.innerHTML="",i.style.display="block",e===1?i.classList.add("is-visually-disabled"):i.classList.remove("is-visually-disabled"),s.textContent="Continuar",s.classList.remove("is-loading"),e===1){a.textContent="Vamos começar pelo seu CPF",n.textContent="Passo 1 de 2",o.value=50,t.innerHTML=`
            <div class="nativa-onboarding-step">
                <p class="nativa-step-description">Digite seu CPF para localizarmos seu cadastro.</p>
                
                <div class="nativa-form-group">
                    <label for="onboarding-cpf">CPF</label>
                    <input type="tel" id="onboarding-cpf" name="onboarding-cpf" class="nativa-input" placeholder="000.000.000-00" maxlength="14" inputmode="numeric">
                </div>

                <div id="onboarding-cpf-result-container" style="display: none;">
                    
                    <div class="nativa-success-badge">
                        <span class="material-symbols-rounded">check_circle</span>
                        <span>Identidade Confirmada</span>
                    </div>

                    <div class="nativa-form-group">
                        <label for="onboarding-full-name">Nome Completo</label>
                        <input type="text" id="onboarding-full-name" name="onboarding-full-name" class="nativa-input is-locked" readonly>
                    </div>

                    <div class="nativa-form-group">
                        <label for="onboarding-dob-display">Data de Nascimento</label>
                        <input type="text" id="onboarding-dob-display" class="nativa-input is-locked" readonly>
                        <input type="hidden" id="onboarding-dob-day" name="onboarding-dob-day">
                        <input type="hidden" id="onboarding-dob-month" name="onboarding-dob-month">
                        <input type="hidden" id="onboarding-dob-year" name="onboarding-dob-year">
                    </div>
                </div>
            </div>
        `;const r=document.getElementById("onboarding-cpf");r&&r.addEventListener("input",d=>{Le(d.target)})}else if(e===2){a.textContent="Seu contato",n.textContent="Passo 2 de 2",o.value=100,s.textContent="Finalizar",t.innerHTML=`
            <div class="nativa-onboarding-step">
                <p class="nativa-step-description">Informe seu WhatsApp para receber atualizações do pedido.</p>
                
                <div class="nativa-form-group-split nativa-phone-group">
                    <div class="nativa-form-group ddd-group">
                        <label for="onboarding-phone-ddd">DDD</label>
                        <input type="tel" id="onboarding-phone-ddd" name="onboarding-phone-ddd" class="nativa-input" placeholder="XX" maxlength="2" inputmode="numeric">
                    </div>
                    <div class="nativa-form-group number-group">
                        <label for="onboarding-phone-number">WhatsApp</label>
                        <input type="tel" id="onboarding-phone-number" name="onboarding-phone-number" class="nativa-input" placeholder="90000-0000" maxlength="10" inputmode="numeric">
                    </div>
                </div>
            </div>
        `;const r=document.getElementById("onboarding-phone-ddd"),d=document.getElementById("onboarding-phone-number");r&&r.addEventListener("input",u=>{u.target.value=u.target.value.replace(/\D/g,""),u.target.value.length===2&&d.focus()}),d&&d.addEventListener("input",u=>{Be(u.target)})}}let v=1,h=!1,p=null;const P="nativa_onboarding_state";function x(){let e={};try{const i=sessionStorage.getItem(P);i&&(e=JSON.parse(i))}catch{}const t=document.getElementById("onboarding-cpf"),a=document.getElementById("onboarding-phone-ddd"),n=document.getElementById("onboarding-phone-number"),o={currentStep:v,isCpfConfirmed:h,cachedCpfData:p,tempCpf:t?t.value:e.tempCpf||"",tempDdd:a?a.value:e.tempDdd||"",tempPhone:n?n.value:e.tempPhone||""};sessionStorage.setItem(P,JSON.stringify(o))}function U(){const e=sessionStorage.getItem(P);if(e)try{return JSON.parse(e)}catch{return null}return null}function Ne(){sessionStorage.removeItem(P),v=1,h=!1,p=null}function ae(){const e=document.getElementById("nativa-onboarding-sheet");if(!e)return;const t=U();t?(v=t.currentStep||1,h=t.isCpfConfirmed||!1,p=t.cachedCpfData||null):(v=1,h=!1,p=null),G(v);const a=document.getElementById("nativa-onboarding-next-btn"),n=document.getElementById("nativa-onboarding-back-btn"),o=a.cloneNode(!0),i=n.cloneNode(!0);a.parentNode.replaceChild(o,a),n.parentNode.replaceChild(i,n),o.addEventListener("click",ke),i.addEventListener("click",Pe),v===1&&h&&p&&setTimeout(()=>{const s=document.getElementById("onboarding-cpf");s&&t.tempCpf&&(s.value=t.tempCpf,s.disabled=!0),D(p);const r=document.getElementById("nativa-onboarding-next-btn");r&&(r.textContent="Confirmar dados")},50),v===2&&t&&setTimeout(()=>{const s=document.getElementById("onboarding-phone-ddd"),r=document.getElementById("onboarding-phone-number");s&&(s.value=t.tempDdd||""),r&&(r.value=t.tempPhone||"")},50),e.addEventListener("input",()=>{x()}),W(e)}async function ke(){const e=document.getElementById("nativa-onboarding-next-btn");if(v===1){const t=document.getElementById("onboarding-cpf"),a=t.value.replace(/\D/g,"");if(h){v++,G(v),x();return}else{if(!ie(t)){m("Por favor, insira um CPF válido.","error"),t.focus();return}if(p&&p.ni===a){D(p),h=!0,e.textContent="Confirmar dados",x();return}V(e),t.disabled=!0;try{const n=await be(a);n.ni=a,p=n,D(n),h=!0,e.textContent="Confirmar dados",x()}catch(n){console.error(n),m(n.message||"CPF não encontrado ou inválido.","error"),t.disabled=!1,t.focus()}finally{N(e)}return}}if(v===2){console.group("🔍 [ONBOARDING] Validação de Telefone");const t=document.getElementById("onboarding-phone-ddd"),a=document.getElementById("onboarding-phone-number");if(!t||!a){console.error("❌ Inputs de telefone não encontrados no DOM."),console.groupEnd();return}const n=t.value,o=a.value;console.log("1. Valores:",{ddd:n,number:o});const i=Se(n,o);if(console.log("2. Resultado da Validação:",i),!i.isValid){console.warn("⚠️ Validação falhou:",i.message),m(i.message,"error");const b=i.target==="ddd"?t:a;console.log("3. Aplicando erro visual em:",b),I(b,!1),b.focus(),b.addEventListener("input",function(){console.log("4. Usuário corrigindo..."),I(this,!0)},{once:!0}),console.groupEnd();return}console.log("✅ Validação OK. Prosseguindo..."),console.groupEnd(),V(e);const s=new URLSearchParams;s.append("onboarding-phone-ddd",n),s.append("onboarding-phone-number",o.replace(/\D/g,""));const r=U(),d=p&&p.ni?p.ni:(r==null?void 0:r.tempCpf)||"",u=(p==null?void 0:p.dob)||"",B=(p==null?void 0:p.name)||"";if(s.append("onboarding-cpf",d),s.append("onboarding-full-name",B),u){const[b,$,M]=u.split("-");s.append("onboarding-dob-day",M),s.append("onboarding-dob-month",$),s.append("onboarding-dob-year",b)}if(!d){m("Erro: CPF perdido. Por favor, volte e confirme o CPF.","error"),N(e);return}try{await ge(s.toString()),f.user.profile||(f.user.profile={}),f.user.profile.phone=n+o.replace(/\D/g,""),Ne(),J(document.getElementById("nativa-onboarding-sheet")),m("Cadastro concluído com sucesso!","success"),document.dispatchEvent(new CustomEvent("nativa:onboardingCompleted")),f.selectedModality==="delivery"&&setTimeout(()=>{R("checkout")},500)}catch(b){console.error("❌ Erro no envio API:",b),m(b.message||"Erro ao salvar dados.","error")}finally{N(e)}}}function Pe(){const e=document.getElementById("nativa-onboarding-next-btn"),t=document.getElementById("nativa-onboarding-back-btn");if(v===1&&h){h=!1;const a=document.getElementById("onboarding-cpf-result-container"),n=document.getElementById("onboarding-cpf");a&&(a.style.display="none"),n&&(n.disabled=!1,n.focus()),e.textContent="Continuar",t.classList.add("is-visually-disabled"),x()}else v>1&&(v--,G(v),v===1&&h&&p&&setTimeout(()=>{const a=document.getElementById("onboarding-cpf"),n=U();a&&(n!=null&&n.tempCpf)&&(a.value=n.tempCpf,a.disabled=!0),D(p);const o=document.getElementById("nativa-onboarding-next-btn");o&&(o.textContent="Confirmar dados")},50),x())}function D(e){const t=document.getElementById("onboarding-cpf-result-container"),a=document.getElementById("onboarding-full-name"),n=document.getElementById("onboarding-dob-display"),o=document.getElementById("onboarding-dob-day"),i=document.getElementById("onboarding-dob-month"),s=document.getElementById("onboarding-dob-year");if(a&&(a.value=e.name),e.dob&&n){const[d,u,B]=e.dob.split("-");n.value=`${B}/${u}/${d}`,o&&(o.value=B),i&&(i.value=u),s&&(s.value=d)}t&&(t.style.display="flex");const r=document.getElementById("nativa-onboarding-back-btn");r&&r.classList.remove("is-visually-disabled")}const T=e=>String(e??"").replace(/[&<>"']/g,function(a){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;"}[a]});let L=Promise.resolve();const vt=e=>{L=L.then(()=>new Promise(t=>{e(),setTimeout(t,300)}))},m=(e,t="info")=>{L=L.then(()=>new Promise(a=>{if(!document.getElementById("nativa-toast-animation-styles")){const r=document.createElement("style");r.id="nativa-toast-animation-styles",r.innerHTML=`
                    @keyframes toast-focus-pulse {
                      0% { outline-color: transparent; }
                      25% { outline-color: var(--md-sys-color-on-surface); }
                      75% { outline-color: var(--md-sys-color-on-surface); }
                      100% { outline-color: transparent; }
                    }
                    .nativa-toast.is-pulsing-outline {
                        outline: 2px solid transparent;
                        animation: toast-focus-pulse 1.2s ease-in-out;
                    }
                `,document.head.appendChild(r)}const n=document.createElement("div");n.className="nativa-toast-scrim";const o=document.createElement("div");o.className=`nativa-toast is-${t}`;const i={success:"check_circle",error:"error",info:"info"};o.innerHTML=`<div class="nativa-toast-icon-container"><span class="material-symbols-rounded">${i[t]}</span></div><div class="nativa-toast-separator"></div><div class="nativa-toast-message">${T(e)}</div>`,n.appendChild(o),document.body.appendChild(n),setTimeout(()=>{n.classList.add("is-visible"),o.classList.add("is-visible"),o.classList.add("is-pulsing-outline"),o.addEventListener("animationend",()=>{o.classList.remove("is-pulsing-outline")},{once:!0})},10);const s=()=>{o.classList.remove("is-visible"),n.classList.remove("is-visible"),setTimeout(()=>{n.remove(),a()},300)};n.addEventListener("click",s),setTimeout(s,2500)}))},gt=(e,t,a)=>{const n=e.target.closest(t);return n&&n.disabled?(m(a,"info"),!0):!1},V=e=>{if(!e)return;const t=window.getComputedStyle(e);e.style.width=t.width,e.style.height=t.height,e.dataset.originalContent=e.innerHTML,e.disabled=!0,e.innerHTML='<span class="nativa-spinner"></span>'},N=e=>{e&&(e.disabled=!1,e.dataset.originalContent&&(e.innerHTML=e.dataset.originalContent),e.style.width="",e.style.height="")},ft=e=>{const t=document.getElementById("nativa-cart-button");if(!e||!t)return;const a=e.getBoundingClientRect(),n=t.getBoundingClientRect(),o=document.createElement("div");o.className="nativa-fly-to-cart-dummy",Object.assign(o.style,{width:`${a.width}px`,height:`${a.height}px`,top:`${a.top}px`,left:`${a.left}px`,borderRadius:window.getComputedStyle(e).borderRadius}),document.body.appendChild(o),requestAnimationFrame(()=>{Object.assign(o.style,{top:`${n.top+n.height/2}px`,left:`${n.left+n.width/2}px`,width:"20px",height:"20px",opacity:"0"})}),o.addEventListener("transitionend",()=>{o.remove(),t.classList.add("is-pulsing"),setTimeout(()=>t.classList.remove("is-pulsing"),500)})};function ne(){setTimeout(()=>{document.querySelector(".nativa-bottom-sheet.is-visible, .nativa-side-sheet.is-visible")||document.body.classList.remove("nativa-sheet-is-open","nativa-no-scroll")},0)}const W=e=>{if(!e){console.warn("openSheet: O elemento da ficha fornecida é nulo ou não existe no DOM.");return}e.id==="nativa-login-prompt-sheet"&&typeof ee=="function"&&ee(),De(),e.classList.add("is-visible"),document.body.classList.add("nativa-sheet-is-open","nativa-no-scroll")},J=e=>{if(!e)return;const t=e.querySelector(".nativa-bottom-sheet-content, .nativa-side-sheet-content");if(t&&t.classList.contains("is-content-driven-height")){const a=t.getBoundingClientRect().height;t.style.height=`${a}px`,requestAnimationFrame(()=>{t.classList.remove("is-content-driven-height"),e.classList.remove("is-visible")}),e.addEventListener("transitionend",()=>{e.classList.contains("is-visible")||(t.style.height="",ne())},{once:!0})}else e.classList.remove("is-visible"),ne()},De=()=>{document.querySelectorAll(".nativa-bottom-sheet.is-visible, .nativa-side-sheet.is-visible").forEach(e=>{J(e)})},bt=(e,t,a=80)=>{const n=document.querySelector(e);if(!n)return;n.querySelectorAll(t).forEach((i,s)=>{i.style.animationDelay=`${s*a}ms`})},yt=e=>{const t=document.getElementById("nativa-onboarding-sheet");t?(W(t),typeof ae=="function"?ae():console.error("initOnboarding não foi encontrado. O script foi carregado?")):console.error("Elemento da ficha de onboarding NÃO foi encontrado no DOM.")},ht=e=>{const t=document.querySelectorAll(".nativa-bottom-nav-container .nativa-nav-item"),a=document.getElementById("nativa-contact-trigger-btn");e==="/home"&&(e="/"),t.forEach(n=>{const o=n.dataset.route;n.id!=="nativa-contact-trigger-btn"&&(o===e?n.classList.add("active"):n.classList.remove("active"))}),a&&a.classList.remove("active")},Et=e=>{navigator.clipboard.writeText(e).then(()=>{m("Copiado para a área de transferência!","success")}).catch(t=>{console.error("Falha ao copiar texto: ",t),m("Não foi possível copiar.","error")})},It=()=>{const e=document.getElementById("nativa-app-loader");e&&(e.classList.remove("is-visible"),document.dispatchEvent(new CustomEvent("nativa:loaderHidden")))},wt=(e,t={})=>{const a=document.createElement(e);return t.className&&(a.className=t.className),t.dataset&&Object.assign(a.dataset,t.dataset),t.textContent&&(a.textContent=t.textContent),t.children&&Array.isArray(t.children)&&t.children.forEach(n=>{n&&a.appendChild(n)}),a},_t=e=>{L=L.then(()=>new Promise(t=>{const a=document.createElement("div");a.className="nativa-toast-scrim is-persistent";const n=document.createElement("div");n.className="nativa-toast is-info has-action",n.innerHTML=`
                <div class="nativa-toast-icon-container"><span class="material-symbols-rounded">update</span></div>
                <div class="nativa-toast-separator"></div>
                <div class="nativa-toast-message">Uma nova versão está disponível.</div>
                <button id="sw-update-button" class="nativa-button-secondary is-small">Recarregar</button>
            `,a.appendChild(n),document.body.appendChild(a),setTimeout(()=>{a.classList.add("is-visible"),n.classList.add("is-visible")},10);const o=document.getElementById("sw-update-button");o&&o.addEventListener("click",async()=>{n.classList.remove("is-visible"),a.classList.remove("is-visible"),await e(!0),t()})}))},Ct=async()=>{var r,d;if(((r=window.nativaDeliveryData)==null?void 0:r.requirePwaInstall)===!1||window.matchMedia("(display-mode: standalone)").matches||window.navigator.standalone)return!0;const a=/iPad|iPhone|iPod/.test(navigator.platform)||navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1&&!window.MSStream,n=/^((?!chrome|android|crios|fxios).)*safari/i.test(navigator.userAgent);if(a&&n)return await q({title:"Instale nosso app",iconName:"install_mobile",message:`Para continuar com seu pedido, adicione nosso app à sua Tela de Início:

1. Toque no botão Compartilhar <span class="material-symbols-rounded" style="font-size: 1.1em; vertical-align: bottom;">ios_share</span>
2. Role para baixo e toque em "Adicionar à Tela de Início"
3. Toque em "Adicionar"`,confirmText:"Entendi",cancelText:null}),!1;const i=(d=window.nativaDelivery)==null?void 0:d.deferredInstallPrompt;if(await q({title:"Continue no app",iconName:"install_mobile",message:"Para adicionar itens ao carrinho e fazer pedidos, por favor, instale nosso aplicativo em seu telefone.",confirmText:"Instalar",cancelText:"Voltar",isCritical:!1}))if(i)try{return i.prompt(),await i.userChoice,window.nativaDelivery&&(window.nativaDelivery.deferredInstallPrompt=null),!1}catch(u){return console.error("Erro ao tentar exibir o prompt PWA:",u),m("Não foi possível iniciar a instalação. Você pode tentar adicionar manualmente à tela inicial.","error"),!1}else return m("A instalação não está disponível no momento. Tente adicionar o site à sua tela inicial manualmente.","info"),!1;else return!1};export{Me as $,ct as A,Ve as B,Ge as C,et as D,mt as E,yt as F,Qe as G,Ze as H,gt as I,Be as J,Se as K,I as L,je as M,Xe as N,bt as O,ee as P,ut as Q,Re as R,qe as S,rt as T,ae as U,pt as V,R as W,Le as X,ie as Y,ht as Z,ve as _,m as a,Fe as a0,dt as a1,nt as a2,He as a3,$e as a4,It as a5,We as a6,_t as a7,vt as b,V as c,tt as d,T as e,st as f,Je as g,J as h,N as i,Ct as j,q as k,ze as l,Oe as m,ft as n,W as o,Ke as p,at as q,wt as r,f as s,De as t,Ue as u,Et as v,Ye as w,ot as x,lt as y,it as z};
//# sourceMappingURL=ui-helpers.C-IqkHMZ.js.map
