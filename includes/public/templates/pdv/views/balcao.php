<?php
/**
 * View: Frente de Caixa (Balcão)
 * Local: templates/pdv/views/balcao.php
 */
?>
<div class="pdv-pos-layout">
    <aside class="nativa-pdv-cart-sidebar">
        <div class="pdv-client-header">
            <div class="client-info">
                <div class="avatar-circle"><span class="material-symbols-rounded">person</span></div>
                <div class="client-name-wrapper">
                    <span id="current-client-display" class="client-name">Visitante</span>
                    <span class="client-status">Venda Balcão</span>
                </div>
            </div>
            <button class="nativa-icon-button" onclick="window.pdvApp.openClientModal()" title="Trocar Cliente">
                <span class="material-symbols-rounded">sync_alt</span>
            </button>
        </div>

        <div class="pdv-cart-list-wrapper">
            <ul id="cart-items" class="pdv-cart-list">
                <li class="empty-cart-msg">Cesta vazia</li>
            </ul>
        </div>

        <div class="pdv-cart-footer">
            <div class="cart-totals">
                <div class="row"><span>Subtotal</span> <span>R$ 0,00</span></div>
                <div class="row total"><span>Total</span> <span id="cart-total">R$ 0,00</span></div>
            </div>
            <button class="nativa-button-primary full-width" onclick="window.pdvApp.openPaymentModal()">
                Pagamento (F5)
            </button>
        </div>
    </aside>

    <main class="nativa-pdv-product-area">
        <header class="pdv-top-bar">
            <div class="nativa-search-bar-container">
                <span class="material-symbols-rounded">search</span>
                <input type="text" id="product-search" class="nativa-input-search" placeholder="Buscar produto (Nome ou Código)..." autofocus>
            </div>
            <div class="pdv-actions">
                <button class="nativa-icon-button"><span class="material-symbols-rounded">fullscreen</span></button>
            </div>
        </header>

        <div id="products-grid" class="pdv-products-grid">
            </div>
    </main>
</div>