<?php
/**
* Template para a página de cardápio.
* ... (histórico de versões anterior) ...
 * ATUALIZADO (UI): Reorganiza o cabeçalho para ter a busca na primeira linha e as categorias na segunda.
*/
?>
<div id="nativa-cardapio-page" class="nativa-cardapio-wrapper">
 
  <div class="nativa-menu-sticky-header">
            <div class="nativa-menu-top-bar">
      <div class="nativa-menu-logo-container">
        <img src="https://pastelarianativa.com.br/wp-content/uploads/2025/08/icon.webp" alt="Ícone da Loja" width="40" height="40">
      </div>
      <div class="nativa-search-bar-container">
        <span class="material-symbols-rounded">search</span>
        <input type="search" id="nativa-product-search" placeholder="Buscar no cardápio..." autocomplete="off">
      </div>
    </div>

    <div class="nativa-menu-index-bar">
      <div id="nativa-category-index" class="nativa-category-index-wrapper">
        <div class="nativa-category-pills-container">
          <?php /* As pílulas de categoria serão renderizadas aqui pelo JavaScript */ ?>
        </div>
      </div>
    </div>
          </div>

  <div id="nativa-how-to-order-tooltip" class="nativa-popup-scrim">
    <div class="nativa-popup-content">
      <div class="nativa-how-to-order-header">
        <div class="nativa-how-to-order-icon">
          <span class="material-symbols-rounded">fastfood</span>
        </div>
        <h4 class="nativa-how-to-order-title">É muito fácil fazer seu pedido aqui!</h4>
      </div>
      <div class="nativa-how-to-order-content">
        <p>1. Escolha seus produtos no cardápio.</p>
        <p>2. Clique no carrinho para revisar e finalizar sua compra.</p>
        <p>3. Preencha seus dados e envie seu pedido!</p>
      </div>
      <button id="nativa-how-to-order-got-it-btn" class="nativa-button-primary">Entendi!</button>
    </div>
  </div>

  <div id="nativa-menu-categories" class="nativa-menu-categories">
    <?php /* As seções de categoria e produtos serão renderizadas aqui */ ?>
  </div>
  <div id="nativa-product-list" class="nativa-product-list">
    <p>Carregando produtos...</p>
  </div>
</div>