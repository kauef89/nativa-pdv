<?php
/**
 * Template para a Ficha (Wizard) de Onboarding de novos usuários.
 * ESTRUTURA PADRONIZADA
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="nativa-onboarding-sheet" class="nativa-bottom-sheet is-unclosable">
    <div class="nativa-bottom-sheet-content">

        <div class="nativa-bottom-sheet-header">
            <div class="nativa-onboarding-header">
                <span class="material-symbols-rounded nativa-sheet-header-icon">person_add</span>
                <h2 id="nativa-onboarding-title">Finalize seu cadastro</h2>
                <div class="nativa-onboarding-progress-container">
                    <span id="nativa-onboarding-step-text">Passo 1 de 3</span>
                    <progress id="nativa-onboarding-progress" max="100" value="33"></progress>
                </div>
            </div>
        </div>

        <form id="nativa-onboarding-form" novalidate>
            <div id="nativa-onboarding-step-content" class="nativa-bottom-sheet-body">
                </div>
        </form>
                    <div class="nativa-separator"></div>

        <div class="nativa-bottom-sheet-actions nativa-onboarding-footer">
            <button type="button" id="nativa-onboarding-back-btn" class="nativa-button-secondary">Voltar</button>
            <button type="button" id="nativa-onboarding-next-btn" class="nativa-button-primary">Continuar</button>
        </div>

    </div>
</div>