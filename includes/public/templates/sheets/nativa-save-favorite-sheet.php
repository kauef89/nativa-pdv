<?php
/**
 * Template para a Ficha de Salvar Favorito Customizado.
 * ESTRUTURA PADRONIZADA
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="nativa-save-favorite-sheet" class="nativa-bottom-sheet">
    <div class="nativa-bottom-sheet-content">

        <div class="nativa-bottom-sheet-header">
            <span class="material-symbols-rounded nativa-sheet-header-icon">heart_plus</span>
            <h3 class="nativa-sheet-title">Salvar nos Favoritos</h3>
        </div>
        
        <div class="nativa-separator"></div>

        <div id="nativa-save-favorite-container" class="nativa-bottom-sheet-body">
            <p>Gostaria de salvar a configuração deste item para pedi-lo novamente de forma rápida no futuro?</p>
            <div class="nativa-form-group">
                <label for="favorite-nickname-input">Dê um apelido (opcional):</label>
                <input type="text" id="favorite-nickname-input" placeholder="Ex: Pastel do João ou Lanche da Maria">
            </div>
        </div>

        <div class="nativa-separator"></div>

        <div class="nativa-bottom-sheet-actions">
            <button id="cancel-save-favorite-btn" class="nativa-button-secondary nativa-bottom-sheet-close">Agora não</button>
            <button id="confirm-save-favorite-btn" class="nativa-button-primary">
                Salvar Favorito
            </button>
        </div>

    </div>
</div>