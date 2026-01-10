<?php
/**
 * Template da Página do PDV.
 * Versão 5.0 (Arquitetura Modular): Carrega o index.js como módulo.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }
if ( ! is_user_logged_in() ) { auth_redirect(); }

// URLs dos Assets (Ajustados para a nova estrutura)
$pdv_css_url = NATIVADELIVERY_PLUGIN_URL . 'assets/src/css/pdv-style.css';
// Aponta para o novo INDEX do App PDV
$pdv_js_url  = NATIVADELIVERY_PLUGIN_URL . 'assets/src/js/apps/pdv/index.js'; 
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nativa PDV</title>
    
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0" />
    
    <link rel="stylesheet" href="<?php echo esc_url($pdv_css_url); ?>?v=<?php echo time(); ?>">
    
    <script>
        window.nativaDeliveryData = {
            nonce: "<?php echo wp_create_nonce('wp_rest'); ?>",
            rest_url: "<?php echo esc_url_raw(rest_url()); ?>",
            plugin_url: "<?php echo NATIVADELIVERY_PLUGIN_URL; ?>"
        };
        // Fallback legado para scripts antigos
        window.nativaPDVNonce = window.nativaDeliveryData.nonce; 
    </script>
</head>
<body>

    <div id="client-modal" class="modal-backdrop hidden">
        <div class="modal-card" id="client-modal-card">
            <span class="modal-close-btn" onclick="window.pdvApp.closeClientModal()">×</span>
            
            <div class="opt-header">
                <h2>Identificar Cliente</h2>
                <p style="font-size: 0.9em; color: var(--text-muted);">Busque por CPF, Telefone ou Nome</p>
            </div>
            
            <div id="client-search-view">
                <div style="padding: 1rem; border-bottom: 1px solid var(--border); display:flex; gap:10px;">
                    <input type="text" id="client-search-input" class="btn-outline" style="flex:1; padding:10px; font-size: 1.1rem;" placeholder="000.000.000-00" maxlength="14" inputmode="numeric" autofocus>
                    <button class="btn-primary btn-sm" onclick="window.pdvApp.handleSearch()">Buscar</button>
                </div>
                
                <div id="client-results" class="client-results">
                    </div>
                
                <div id="client-not-found-action" class="hidden" style="padding: 1rem; text-align: center; border-top: 1px solid var(--border);">
                    <button class="btn-primary" onclick="window.pdvApp.searchGovApi()">
                        <span class="material-symbols-rounded">person_add</span> Cadastrar Novo
                    </button>
                </div>
            </div>

            <div id="client-register-view" class="hidden" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1rem;">
                <h3 style="margin: 0; color: var(--primary);">Confirme os dados</h3>
                
                <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1rem; border-radius: 8px;">
                    <div style="font-size: 0.85em; color: #166534;">NOME COMPLETO</div>
                    <div style="font-weight: bold; font-size: 1.1rem;" id="reg-name-display">...</div>
                    <div style="display: flex; gap: 20px; margin-top: 10px;">
                        <div><small>CPF</small><br><b id="reg-cpf-display">...</b></div>
                        <div><small>NASCIMENTO</small><br><b id="reg-dob-display">...</b></div>
                    </div>
                </div>

                <div class="nativa-form-group">
                    <label>WhatsApp do Cliente</label>
                    <input type="tel" id="reg-phone-input" class="btn-outline" style="width: 100%; padding: 12px; font-size: 1.2rem;" placeholder="(99) 99999-9999">
                </div>

                <div style="margin-top: auto; display: flex; gap: 10px;">
                    <button class="btn-outline" onclick="window.pdvApp.resetClientModal()">Voltar</button>
                    <button class="btn-primary" style="flex: 2;" onclick="window.pdvApp.finalizeRegistration()">Confirmar Cadastro</button>
                </div>
            </div>
        </div>
    </div>

    <div id="options-modal" class="modal-backdrop hidden">
        <div class="modal-card">
            <div class="opt-header"><h2 id="opt-product-title">Produto</h2></div>
            <div class="opt-body" id="opt-container"></div>
            <div class="opt-footer">
                <div style="font-size: 1.5rem; font-weight: 800; color: var(--primary);" id="opt-total">R$ 0,00</div>
                <div style="display: flex; gap: 10px;">
                    <button class="btn-outline" onclick="window.pdvApp.closeOptionsModal()">Cancelar</button>
                    <button class="btn-primary" id="btn-add-opt" onclick="window.pdvApp.confirmOptions()">ADICIONAR</button>
                </div>
            </div>
        </div>
    </div>

    <div id="payment-modal" class="modal-backdrop hidden">
        <div class="modal-card" id="payment-modal-card">
            <span class="modal-close-btn" onclick="document.getElementById('payment-modal').classList.add('hidden')">×</span>
            <div class="pay-body">
                <div class="pay-left">
                    <h3>Pagamento</h3>
                    <div style="font-size: 2.5rem; font-weight: 800;" id="pay-total-display">R$ 0,00</div>
                    
                    <div class="method-grid">
                        <div class="method-btn selected" onclick="window.pdvApp.selectMethod('dinheiro', this)">Dinheiro</div>
                        <div class="method-btn" onclick="window.pdvApp.selectMethod('cartao_credito', this)">Crédito</div>
                        <div class="method-btn" onclick="window.pdvApp.selectMethod('cartao_debito', this)">Débito</div>
                        <div class="method-btn" onclick="window.pdvApp.selectMethod('pix', this)">PIX</div>
                    </div>
                    
                    <input type="number" id="pay-input-val" class="input-lg" style="width:100%; padding:10px; font-size:1.5rem; margin-top:15px;" step="0.01" placeholder="0,00">
                    <button class="btn-primary" style="margin-top:10px; width:100%;" onclick="window.pdvApp.addPayment()">Lançar Valor (Enter)</button>
                </div>
                
                <div class="pay-right">
                    <h3>Lançamentos</h3>
                    <div id="pay-list-container" style="flex:1; overflow-y:auto; border:1px solid #eee; margin-bottom:10px; padding:10px;"></div>
                    <button id="btn-finalize" class="btn-primary" style="background-color: var(--success);" onclick="window.pdvApp.finalizeOrder()">FINALIZAR VENDA (F5)</button>
                </div>
            </div>
        </div>
    </div>

    <div id="app-container">
        <aside id="cart-panel">
            <div class="client-bar">
                <div id="current-client-display" class="client-guest">
                    <span class="material-symbols-rounded">person</span> Visitante
                </div>
                <button class="btn-outline btn-sm" onclick="window.pdvApp.openClientModal()">Mudar</button>
            </div>
            
            <div class="cart-header">
                <h2>Cesta</h2> 
                <span id="session-id" style="font-family:monospace; color:var(--text-muted);">...</span>
            </div>
            
            <ul id="cart-items">
                </ul>
            
            <div class="cart-footer">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <span>Total:</span>
                    <span class="total-value" id="cart-total">R$ 0,00</span>
                </div>
                <button class="btn-primary" style="width:100%; height:50px; font-size:1.2rem;" onclick="window.pdvApp.openPaymentModal()">PAGAMENTO (F5)</button>
            </div>
        </aside>

        <main id="main-panel">
            <header class="search-bar">
                <span class="material-symbols-rounded" style="color:var(--text-muted);">search</span>
                <input type="text" id="product-search" placeholder="Buscar produto por nome ou código..." autofocus>
            </header>
            <div id="products-grid">
                </div>
        </main>
    </div>

    <script type="module" src="<?php echo esc_url($pdv_js_url); ?>?v=<?php echo time(); ?>"></script>

</body>
</html>