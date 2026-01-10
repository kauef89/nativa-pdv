<?php
/**
 * Template para a Ficha do Wizard de Combo.
 * ESTRUTURA PADRONIZADA
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="nativa-combo-wizard-sheet" class="nativa-bottom-sheet is-draggable">
    <div class="nativa-bottom-sheet-content">

        <div class="nativa-bottom-sheet-handle"></div>

        <div class="nativa-bottom-sheet-header">
            <div class="nativa-combo-wizard-header">
                <h2 id="nativa-combo-wizard-title">Montando seu Combo</h2>
                <div class="nativa-combo-progress-container">
                    <span id="nativa-combo-wizard-step-text">Passo 1 de 3</span>
                    <progress id="nativa-combo-wizard-progress" max="100" value="33"></progress>
                </div>
            </div>
        </div>
        
        <div class="nativa-separator"></div>

        <div id="nativa-combo-wizard-step-content" class="nativa-bottom-sheet-body">
            <p>Carregando opções...</p>
        </div>

        <div class="nativa-separator"></div>

        <div class="nativa-bottom-sheet-actions">
            <button id="nativa-combo-wizard-back-btn" class="nativa-button-secondary">Voltar</button>
            <div class="nativa-combo-price-display">
                <strong id="nativa-combo-wizard-price">R$ 0,00</strong>
            </div>
            <button id="nativa-combo-wizard-next-btn" class="nativa-button-primary">Continuar</button>
        </div>

    </div>
</div>