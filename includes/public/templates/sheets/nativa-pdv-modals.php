<?php
/**
 * Modais exclusivos do PDV (Desktop Centered Sheets).
 * Incluído via nativa-pdv-page.php.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }
?>

<div id="client-modal" class="nativa-center-modal-overlay">
    <div class="nativa-center-modal">
        <div class="nativa-modal-header">
            <h3>Identificar Cliente</h3>
            <button type="button" class="nativa-icon-button" onclick="window.pdvApp.closeClientModal()">
                <span class="material-symbols-rounded">close</span>
            </button>
        </div>
        
        <div class="nativa-modal-body">
            <div id="client-search-view">
                <div class="nativa-form-group" style="background: transparent; padding: 0;">
                    <div class="nativa-input-wrapper">
                        <input type="text" id="client-search-input" class="nativa-input" placeholder="CPF, Telefone ou Nome" autofocus>
                        <button class="nativa-button-primary" style="margin-top: 10px; width: 100%;" onclick="window.pdvApp.handleSearch()">Buscar</button>
                    </div>
                </div>
                
                <div id="client-results" class="nativa-list-results">
                    </div>

                <div id="client-not-found-action" style="display: none; margin-top: 20px; text-align: center;">
                    <p>Cliente não encontrado.</p>
                    <button class="nativa-button-secondary" onclick="window.pdvApp.searchGovApi()">
                        <span class="material-symbols-rounded">person_add</span> Cadastrar Novo
                    </button>
                </div>
            </div>

            <div id="client-register-view" style="display: none;">
                <div class="nativa-info-box" style="background: var(--md-sys-color-surface-container-low); padding: 16px; border-radius: 8px; margin-bottom: 16px;">
                    <h4 id="reg-name-display" style="margin: 0;">...</h4>
                    <p style="margin: 4px 0 0 0; font-size: 0.9em;">CPF: <span id="reg-cpf-display">...</span></p>
                </div>
                <div class="nativa-form-group">
                    <label>WhatsApp</label>
                    <input type="tel" id="reg-phone-input" class="nativa-input" placeholder="(00) 00000-0000">
                </div>
                <div class="nativa-modal-actions" style="display: flex; gap: 10px; margin-top: 20px;">
                    <button class="nativa-button-secondary" onclick="window.pdvApp.resetClientModal()">Voltar</button>
                    <button class="nativa-button-primary" onclick="window.pdvApp.finalizeRegistration()" style="flex: 1;">Confirmar</button>
                </div>
            </div>
        </div>
    </div>
</div>

<div id="options-modal" class="nativa-center-modal-overlay">
    <div class="nativa-center-modal">
        <div class="nativa-modal-header">
            <h3 id="opt-product-title">Produto</h3>
            <button type="button" class="nativa-icon-button" onclick="window.pdvApp.closeOptionsModal()">
                <span class="material-symbols-rounded">close</span>
            </button>
        </div>
        <div class="nativa-modal-body">
            <div id="opt-container">
                <p style="text-align: center; color: gray;">Carregando opções...</p>
            </div>
        </div>
        <div class="nativa-modal-footer" style="padding: var(--space-md) var(--space-lg); border-top: 1px solid var(--md-sys-color-outline-variant); display: flex; justify-content: space-between; align-items: center;">
            <div style="font-size: 1.5rem; font-weight: 800; color: var(--md-sys-color-primary);" id="opt-total">R$ 0,00</div>
            <div style="display: flex; gap: 10px;">
                <button class="nativa-button-secondary" onclick="window.pdvApp.closeOptionsModal()">Cancelar</button>
                <button class="nativa-button-primary" id="btn-add-opt" onclick="window.pdvApp.confirmOptions()">ADICIONAR</button>
            </div>
        </div>
    </div>
</div>

<div id="payment-modal" class="nativa-center-modal-overlay">
    <div class="nativa-center-modal is-large">
        <div class="nativa-modal-header">
            <h3>Pagamento</h3>
            <button type="button" class="nativa-icon-button" onclick="window.pdvApp.closePaymentModal()">
                <span class="material-symbols-rounded">close</span>
            </button>
        </div>
        <div class="nativa-modal-body payment-grid-layout">
            <div class="payment-methods-col">
                <div class="nativa-total-display">
                    <small style="display: block; color: var(--md-sys-color-on-surface-variant);">Total a Pagar</small>
                    <span id="pay-total-display">R$ 0,00</span>
                </div>
                
                <div class="nativa-payment-methods-grid">
                    <button class="nativa-payment-button selected" onclick="window.pdvApp.selectMethod('dinheiro', this)">Dinheiro</button>
                    <button class="nativa-payment-button" onclick="window.pdvApp.selectMethod('cartao_credito', this)">Crédito</button>
                    <button class="nativa-payment-button" onclick="window.pdvApp.selectMethod('cartao_debito', this)">Débito</button>
                    <button class="nativa-payment-button" onclick="window.pdvApp.selectMethod('pix', this)">PIX</button>
                </div>

                <div class="nativa-form-group">
                    <label>Valor a lançar</label>
                    <input type="number" id="pay-input-val" class="nativa-input" placeholder="0,00" step="0.01">
                </div>
                <button class="nativa-button-secondary" style="width: 100%; margin-top: 10px;" onclick="window.pdvApp.addPayment()">Lançar (Enter)</button>
            </div>

            <div class="payment-summary-col" style="display: flex; flex-direction: column;">
                <h4>Lançamentos</h4>
                <div id="pay-list-container" class="nativa-payment-list" style="flex: 1; border: 1px solid var(--md-sys-color-outline-variant); border-radius: 8px; margin-bottom: 16px; padding: 8px; overflow-y: auto; max-height: 200px;">
                    </div>
                <div class="payment-actions-footer">
                    <button class="nativa-button-primary is-success" style="width: 100%;" onclick="window.pdvApp.finalizeOrder()">
                        <span class="material-symbols-rounded">check</span> FINALIZAR VENDA
                    </button>
                </div>
            </div>
        </div>
    </div>
</div>