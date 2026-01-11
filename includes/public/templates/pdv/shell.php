<?php
/**
 * Template da Página do PDV (Shell).
 * Versão 6.3 - Caminhos Corrigidos (includes/public/templates)
 */
if ( ! defined( 'ABSPATH' ) ) { exit; }
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nativa PDV</title>
    <?php wp_head(); ?>
</head>
<body class="nativa-pdv-body">

    <?php 
    // CORREÇÃO: Caminho apontando para includes/public/templates/sheets/
    $modals_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/sheets/nativa-pdv-modals.php';
    if ( file_exists( $modals_path ) ) {
        include $modals_path;
    } else {
        echo "";
    }
    ?>

    <div class="nativa-pdv-shell">
        
        <nav class="nativa-pdv-nav">
            <div class="nav-logo-area">
                <span class="material-symbols-rounded logo-icon">point_of_sale</span>
                <span class="nav-label logo-text">Nativa PDV</span>
            </div>

            <div class="nav-group">
                <button class="nav-item" onclick="window.pdvApp.switchView('balcao')">
                    <span class="material-symbols-rounded">storefront</span><span class="nav-label">Balcão</span>
                </button>
                <button class="nav-item" onclick="window.pdvApp.switchView('mesas')">
                    <span class="material-symbols-rounded">table_restaurant</span><span class="nav-label">Mesas</span>
                </button>
                <button class="nav-item active" onclick="window.pdvApp.switchView('delivery')">
                    <span class="material-symbols-rounded">moped</span><span class="nav-label">Delivery</span>
                </button>
            </div>
            
            <div class="nav-separator"></div>
            
             <div class="nav-group">
                <button class="nav-item" onclick="window.pdvApp.switchView('lancamentos')">
                    <span class="material-symbols-rounded">receipt_long</span><span class="nav-label">Lançamentos</span>
                </button>
                <button class="nav-item" onclick="window.pdvApp.switchView('pagamentos')">
                    <span class="material-symbols-rounded">payments</span><span class="nav-label">Pagamentos</span>
                </button>
                <button class="nav-item" onclick="window.pdvApp.switchView('config')">
                    <span class="material-symbols-rounded">settings</span><span class="nav-label">Configurações</span>
                </button>
            </div>
        </nav>

        <div class="nativa-pdv-content-area">
            
            <div id="view-delivery" class="pdv-view active">
                <?php 
                $view_delivery = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/pdv/views/delivery.php';
                if (file_exists($view_delivery)) include $view_delivery;
                else echo "<h3>View Delivery não encontrada em: $view_delivery</h3>";
                ?>
            </div> 

            <div id="view-balcao" class="pdv-view">
                <?php 
                $view_balcao = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/pdv/views/balcao.php';
                if (file_exists($view_balcao)) include $view_balcao;
                else echo "<h3>View Balcão não encontrada em: $view_balcao</h3>";
                ?>
            </div>
            
            <div id="view-mesas" class="pdv-view">
                <div class="view-placeholder"><h2>Gestão de Mesas (Em breve)</h2></div>
            </div>
            
            <div id="view-lancamentos" class="pdv-view"><div class="view-placeholder"><h2>Lançamentos</h2></div></div>
            <div id="view-pagamentos" class="pdv-view"><div class="view-placeholder"><h2>Pagamentos</h2></div></div>
            <div id="view-config" class="pdv-view"><div class="view-placeholder"><h2>Configurações</h2></div></div>

        </div>
    </div>

    <?php wp_footer(); ?>
</body>
</html>