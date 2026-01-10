<?php
/**
 * Template para a página de checkout [nativa_checkout].
 * ... (histórico de versões anterior) ...
 * ATUALIZAÇÃO (UX): Inclui a barra de navegação inferior (nativa-bottom-navbar.php)
 * para manter a consistência de navegação do PWA e evitar que o usuário se sinta "preso".
 * REATORAÇÃO (CPT Pagamentos): Remove a lista de botões de pagamento estática.
 * O container '#nativa-payment-method-options' agora será preenchido dinamicamente via JS.
 */
?>
<div id="nativa-checkout-page" class="nativa-checkout-wrapper">

    <div id="nativa-checkout-main-content">
    <div id="nativa-checkout-modality-section" class="nativa-checkout-section nativa-modality-selection-section nativa-fade-in-up">
            
            <div id="nativa-checkout-modality-options" class="nativa-modality-options-cart">
                <button class="nativa-order-button" data-modality="delivery">
                    <span class="material-symbols-rounded">moped</span>
                    Entrega
                </button>
                <button class="nativa-order-button" data-modality="pickup">
                    <span class="material-symbols-rounded">storefront</span>
                    Retirada
                </button>
                <button class="nativa-order-button" data-modality="table">
                    <span class="material-symbols-rounded">restaurant</span>
                    Na Mesa
                </button>
            </div>
            <div id="nativa-checkout-store-closed-message" style="display: none;" class="nativa-store-closed-message">
                <p><strong>Loja Fechada</strong></p>
                <p>Desculpe, estamos fechados no momento para o serviço selecionado. Por favor, verifique nossos horários ou escolha outra modalidade.</p>
            </div>
        </div>

        <div class="nativa-checkout-section nativa-fade-in-up">
            <h3>Revise seu pedido</h3>
            <div id="nativa-checkout-order-summary" class="nativa-order-summary-container">
                <p>Carregando seu pedido...</p>
            </div>
        </div>

        <div class="nativa-customer-details nativa-fade-in-up">
            <form id="nativa-checkout-form" novalidate>
                
                <div class="nativa-personal-data-section">
                    <h2>Endereço de entrega</h2>
                    
                    <div id="nativa-delivery-address-block" style="display: none;">
                        <div id="nativa-checkout-address-cards-container">
                            </div>
                        <button type="button" id="nativa-checkout-address-action-btn" class="nativa-button-secondary">
                            <span class="material-symbols-rounded">add_location_alt</span>
                            <span id="nativa-checkout-address-action-btn-text">Adicionar endereço</span>
                        </button>
                    </div>
                </div>
                <div class="nativa-coupon-section">
                    <h2>Cupom de desconto</h2>
                    <div class="nativa-form-group nativa-coupon-input-group has-validation-icon">
                        <input type="text" id="nativa-coupon-code" name="nativa-coupon-code" placeholder="Insira seu cupom">
                        <button type="button" id="nativa-apply-coupon-button" class="nativa-apply-coupon-button">Aplicar</button>
                        <span class="material-symbols-rounded validation-icon"></span>
                    </div>
                    <div id="nativa-coupon-message" class="nativa-coupon-message"></div>
                </div>

                <div class="nativa-checkout-cart-summary">
                    <h2>Resumo financeiro</h2>
                    <div class="nativa-checkout-subtotal-summary">
                        <span>Subtotal</span>
                        <span id="nativa-checkout-subtotal">R$ 0,00</span>
                    </div>
                    <div id="nativa-checkout-delivery-fee-row" class="nativa-checkout-fee-row" style="display:flex;"> <span>Taxa de Entrega</span>
                        <span id="nativa-checkout-delivery-fee">R$ 0,00</span>
                    </div>
                    <div id="nativa-checkout-discount-row" class="nativa-checkout-discount-row" style="display:flex;"> <span>Desconto</span>
                        <span id="nativa-checkout-discount">- R$ 0,00</span>
                    </div>
                    <div class="nativa-checkout-total-final">
                        <span>Total Final</span>
                        <span id="nativa-checkout-total">R$ 0,00</span>
                    </div>
                </div>
                
                <div class="nativa-payment-method-section">
                    <h2>Método de pagamento</h2>
                    <div class="nativa-form-group has-validation-icon">
                        
                        <div id="nativa-payment-method-options" class="nativa-payment-options-grid">
                            </div>
                        <input type="hidden" id="nativa-payment-method" name="nativa-payment-method" value="" required>
                        <span class="material-symbols-rounded validation-icon"></span>
                    </div>

                    <div id="nativa-payment-info-card" class="nativa-info-card" style="display: none;">
                        <?php // Conteúdo dinâmico via JS ?>
                    </div>
                    
                    <div id="nativa-troco-field" class="nativa-form-group" style="display:none;">
                        <div class="nativa-troco-control-wrapper">
                             <div class="nativa-toggle-switch">
                                <div class="nativa-toggle-control">
                                    <input type="checkbox" id="nativa-needs-troco-toggle" name="nativa-needs-troco" checked>
                                    <label for="nativa-needs-troco-toggle" class="nativa-toggle-ui"></label>
                                </div>
                                <label for="nativa-needs-troco-toggle" class="nativa-toggle-label">Preciso de troco</label>
                            </div>
                            <div class="nativa-troco-input-wrapper">
                                <input type="number" id="nativa-troco-para" name="nativa-troco-para" placeholder="R$ 0,00" min="0" step="0.01">
                            </div>
                        </div>
                    </div>
                    </div>

                <button type="submit" id="nativa-confirm-order-button" class="nativa-confirm-order-button">Confirmar pedido</button>
            </form>
        </div>
    </div>
</div>

<?php
$bottom_sheets_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-bottom-sheets.php';
if ( file_exists( $bottom_sheets_path ) ) {
    include_once $bottom_sheets_path;
}

// --- INÍCIO DA MODIFICAÇÃO ---
$bottom_navbar_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-bottom-navbar.php';
if ( file_exists( $bottom_navbar_path ) ) {
    include_once $bottom_navbar_path;
}
// --- FIM DA MODIFICAÇÃO ---
?>