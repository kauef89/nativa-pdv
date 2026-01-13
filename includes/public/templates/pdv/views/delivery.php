<?php
/**
 * View: Delivery (PDV)
 * Local: includes/public/templates/pdv/views/delivery.php
 * * Este arquivo é incluído dentro do container #view-delivery no shell.php.
 * Não deve conter <html>, <body> ou Sidebar.
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }
?>

<div id="pedidos-app">
    <header class="pedidos-header">
        <div class="header-content">
            <div class="header-logo">
                <img src="<?php echo esc_url( NATIVADELIVERY_PLUGIN_URL . 'assets/images/logo.svg' ); ?>" alt="Nativa Delivery" height="40">
            </div>

            <div class="header-filters">
                <div class="filter-group" id="date-filter-group">
                    <div class="nativa-toggle-button-group">
                        <button class="nativa-toggle-button is-active" data-filter="today">Hoje</button>
                        <button class="nativa-toggle-button" data-filter="all">Todos</button>
                    </div>
                </div>

                <div class="filter-group" id="status-filter-container"></div>

                <div class="filter-group search-filter-group">
                    <input type="text" id="search-term" placeholder="Buscar pedido...">
                </div>
            </div>

            <div class="header-actions">
                <button id="auto-refresh-toggle" class="header-button icon-only active" title="Atualização automática ativa">
                    <span class="material-symbols-rounded">sync</span>
                </button>
                
                <button id="dashboard-push-toggle" class="header-button icon-only" title="Notificações">
                    <span class="material-symbols-rounded">notifications</span>
                </button>

                <button id="btn-new-order" class="header-button primary-action" onclick="window.pdvApp.openNewOrderSheet()">
                    <span class="material-symbols-rounded">add</span>
                    <span>Novo Pedido</span>
                </button>
            </div>
        </div>
    </header>

    <main class="pedidos-main-content">
        <div id="pedidos-table-container">
            <div class="dashboard-loader">
                <span class="material-symbols-rounded is-loading">hourglass_top</span>
                <span>Carregando pedidos...</span>
            </div>
        </div>
        <div id="load-more-container"></div>
    </main>
</div>

<div id="new-order-sheet-overlay" class="pdv-side-sheet-overlay" onclick="window.pdvApp.closeNewOrderSheet()"></div>

<div id="new-order-sheet" class="pdv-side-sheet">
    
    <div class="sheet-header">
        <h2 id="new-order-title">Novo Pedido</h2>
        <button class="sheet-close-btn" onclick="window.pdvApp.closeNewOrderSheet()">
            <span class="material-symbols-rounded">close</span>
        </button>
    </div>

    <div class="sheet-body" id="new-order-content">
        
        <div id="step-client-search" class="pdv-step active">
            <div class="client-search-container">
                <p style="color:var(--md-sys-color-on-surface-variant);">Identifique o cliente para iniciar.</p>
                
                <div class="search-input-group">
                    <input type="tel" id="new-order-client-term" placeholder="Telefone (apenas números) ou CPF" onkeypress="if(event.key==='Enter') window.pdvApp.searchCustomer()">
                    <button class="nativa-button-primary" onclick="window.pdvApp.searchCustomer()">
                        <span class="material-symbols-rounded">search</span>
                    </button>
                </div>
                
                <div id="new-order-client-results" class="client-results-list"></div>
                <div id="new-order-loading" style="display: none; text-align: center; padding: 20px; color: var(--md-sys-color-on-surface-variant);">
                    <span class="material-symbols-rounded is-loading">hourglass_top</span> Buscando...
                </div>
            </div>
        </div>

        <div id="step-order-builder" class="pdv-step">
            
            <div class="mini-app-header">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <small>Cliente:</small><br>
                        <span style="font-weight:bold; font-size:1.1em;" id="selected-client-name">...</span>
                    </div>
                    <button onclick="window.pdvApp.resetNewOrderSteps()" style="font-size:0.8em; color:var(--md-sys-color-error); background:none; border:none; cursor:pointer; text-decoration: underline;">Trocar</button>
                </div>
            </div>

            <div class="pdv-mini-tabs">
                <button class="pdv-tab-btn active" data-target="tab-menu" onclick="window.pdvApp.switchTab('tab-menu')">Cardápio</button>
                <button class="pdv-tab-btn" data-target="tab-cart" onclick="window.pdvApp.switchTab('tab-cart')">Sacola</button>
                <button class="pdv-tab-btn" data-target="tab-address" onclick="window.pdvApp.switchTab('tab-address')">Endereço</button>
            </div>

            <div id="pdv-tab-content">
                
                <div id="tab-menu" class="pdv-tab-pane active">
                    <div id="nativa-cardapio-page">
                        <div id="nativa-category-index">
                            <div class="nativa-category-pills-container">
                                </div>
                        </div>
                        
                        <div style="margin: 10px 0;">
                            <input type="text" id="nativa-product-search" placeholder="Buscar produto...">
                        </div>
                        
                        <div id="nativa-product-list" class="pdv-product-grid">
                            </div>
                    </div>
                </div>

                <div id="tab-cart" class="pdv-tab-pane">
                    
                    <div id="nativa-cart-view-wrapper" class="cart-view-state">
                        </div>

                    <div id="nativa-checkout-view-wrapper" class="checkout-view-state" style="display: none;">
                        
                        <div class="checkout-header-actions" style="padding: 12px 16px; border-bottom: 1px solid var(--md-sys-color-outline-variant); background: var(--md-sys-color-surface); flex-shrink: 0;">
                            <button class="nativa-button-secondary is-small" style="display: flex; align-items: center; gap: 5px; padding: 6px 12px; font-size: 0.9em;" onclick="window.pdvApp.toggleCartView('cart')">
                                <span class="material-symbols-rounded" style="font-size: 18px;">arrow_back</span> Voltar para Itens
                            </button>
                        </div>
                        
                        <div id="nativa-checkout-page" class="nativa-page-content" style="padding: 16px; padding-bottom: 100px; flex: 1; overflow-y: auto;">
                            <div id="nativa-checkout-steps-container">
                                <div class="checkout-loader" style="text-align: center; margin-top: 40px;">
                                    <span class="nativa-spinner"></span>
                                    <p>Carregando resumo...</p>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                <div id="tab-address" class="pdv-tab-pane">
                    <div style="padding: 20px; text-align: center; color: var(--md-sys-color-on-surface-variant);">
                        <span class="material-symbols-rounded" style="font-size: 48px; opacity: 0.5;">location_on</span>
                        <p>Gestão de endereços em breve.</p>
                    </div>
                </div>

            </div> </div> </div> </div>

<audio id="nativa-notification-sound" preload="auto">
    <source src="<?php echo esc_url( NATIVADELIVERY_PLUGIN_URL . 'assets/sounds/notification.mp3' ); ?>" type="audio/mpeg">
</audio>