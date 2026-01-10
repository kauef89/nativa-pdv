<?php
/**
 * Template para a Ficha de Recompensas de Fidelidade.
 * ESTRUTURA PADRONIZADA
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="nativa-rewards-sheet" class="nativa-bottom-sheet is-draggable">
    <div class="nativa-bottom-sheet-content">

        <div class="nativa-bottom-sheet-handle"></div>

        <div class="nativa-bottom-sheet-header">
            <h3 class="nativa-sheet-title">Recompensas "Na Faixa"</h3>
        </div>

        <div class="nativa-rewards-user-points-summary">
            <span>Seu Saldo:</span>
            <strong id="rewards-sheet-user-points">0</strong>
            <span>pontos</span>
        </div>

        <div class="nativa-separator"></div>

        <div id="nativa-rewards-list-container" class="nativa-bottom-sheet-body">
            <p class="loading-message">Carregando recompensas disponíveis...</p>
        </div>

    </div>
</div>