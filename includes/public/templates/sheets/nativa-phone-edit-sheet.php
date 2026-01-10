<?php
/**
 * Template para a Ficha de Edição de Telefone (Meus Dados).
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="nativa-phone-edit-sheet" class="nativa-bottom-sheet">
    <div class="nativa-bottom-sheet-content">
        <div class="nativa-bottom-sheet-handle"></div>
        
        <div class="nativa-bottom-sheet-header">
            <span class="material-symbols-rounded nativa-sheet-header-icon">smartphone</span>
            <h3 class="nativa-sheet-title">Alterar WhatsApp</h3>
        </div>

        <div class="nativa-separator"></div>

        <div class="nativa-bottom-sheet-body">
            <form id="phone-edit-form" novalidate>
                <p class="nativa-sheet-description">
                    Atualize seu número para garantir que você receba as notificações dos seus pedidos.
                </p>

                <div class="nativa-form-row">
                    <div class="nativa-form-group" style="flex: 0 0 80px;">
                        <label for="phone-edit-input-ddd" class="nativa-form-label">DDD</label>
                        <input type="tel" 
                               id="phone-edit-input-ddd" 
                               name="phone-ddd" 
                               class="nativa-input" 
                               placeholder="47" 
                               maxlength="2" 
                               inputmode="numeric" 
                               required>
                    </div>

                    <div class="nativa-form-group" style="flex: 1;">
                        <label for="phone-edit-input-number" class="nativa-form-label">Número</label>
                        <div class="has-validation-icon">
                            <input type="tel" 
                                   id="phone-edit-input-number" 
                                   name="phone-number" 
                                   class="nativa-input" 
                                   placeholder="99999-9999" 
                                   maxlength="10" 
                                   inputmode="numeric" 
                                   required>
                            <span class="validation-icon material-symbols-rounded">check_circle</span>
                        </div>
                    </div>
                </div>

                <div class="nativa-bottom-sheet-actions">
                    <button type="button" id="nativa-phone-edit-cancel-btn" class="nativa-button-secondary">
                        Cancelar
                    </button>
                    <button type="submit" class="nativa-button-primary">
                        Salvar Alterações
                    </button>
                </div>
            </form>
        </div>
    </div>
</div>