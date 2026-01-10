<?php
/**
 * Template para a Ficha de Formulário de Endereço.
 * ESTRUTURA PADRONIZADA (Correção de classes para o wizard de onboarding)
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="nativa-address-form-sheet" class="nativa-bottom-sheet">
    <div class="nativa-bottom-sheet-content">

        <div class="nativa-bottom-sheet-header">
            <h3 id="address-form-title" class="nativa-sheet-title">Adicionar novo endereço</h3>
        </div>

        <div id="nativa-address-form-container">
            </div>

        <template id="nativa-address-form-template">
            <form class="address-form" novalidate>
                <div class="nativa-bottom-sheet-body">
                    <input type="hidden" name="address_id" value="">
                    <div class="nativa-form-group has-validation-icon">
                        <label for="nativa-address-street-select">Logradouro</label>
                        <select name="nativa-delivery-address-street" class="nativa-address-street-select" required><option value="">Digite para buscar ou selecione a rua</option></select>
                        <input type="hidden" name="nativa-delivery-address-street-name" class="nativa-address-street-name-hidden">
                        <span class="material-symbols-rounded validation-icon"></span>
                    </div>
                    
                    <div class="nativa-form-group-split nativa-phone-group">
                        <div class="nativa-form-group nativa-street-number-group has-validation-icon">
                            <label for="nativa-address-number">Número</label>
                            <input type="text" inputmode="numeric" name="number" class="nativa-address-number-input" required>
                            <span class="material-symbols-rounded validation-icon"></span>
                        </div>
                        <div class="nativa-no-number-group">
                            <div class="nativa-toggle-switch">
                                <div class="nativa-toggle-control">
                                    <input type="checkbox" id="no_number_checkbox_template" name="no_number" class="nativa-address-no-number-checkbox">
                                    <label for="no_number_checkbox_template" class="nativa-toggle-ui"></label>
                                </div>
                                <label for="no_number_checkbox_template" class="nativa-toggle-label">Sem número</label>
                            </div>
                        </div>
                    </div>

                    <div class="nativa-form-group">
                        <label for="nativa-address-complement">Complemento / Ponto de referência</label>
                        <input type="text" name="complement" class="nativa-address-complement-input" placeholder="Ex: Apt 101, Bloco B">
                    </div>
                    <div class="nativa-form-group has-validation-icon">
                        <label for="nativa-address-bairro-select">Bairro</label>
                        <input type="text" class="nativa-address-bairro-display" readonly disabled placeholder="(automático)">
                        <input type="hidden" name="bairro_id" class="nativa-address-bairro-id-hidden">
                        <span class="material-symbols-rounded validation-icon"></span>
                    </div>
                    <div class="nativa-form-group has-validation-icon">
                        <label for="nativa-address-apelido">Apelido do endereço</label>
                        <input type="text" name="apelido" class="nativa-address-apelido-input" placeholder="Exemplo: Casa, Trabalho" required>
                        <span class="material-symbols-rounded validation-icon"></span>
                    </div>
                    <div class="nativa-form-group">
                        <div class="nativa-toggle-switch">
                            <div class="nativa-toggle-control">
                                <input type="checkbox" id="is_primary_checkbox_template" name="is_primary" class="nativa-address-is-primary-checkbox">
                                <label for="is_primary_checkbox_template" class="nativa-toggle-ui"></label>
                            </div>
                            <label for="is_primary_checkbox_template" class="nativa-toggle-label">Tornar este o meu endereço principal</label>
                        </div>
                    </div>
                </div>
                <div class="address-form-actions">
                    <button type="submit" class="nativa-button-primary save-address-btn">Salvar Endereço</button>
                </div>
            </form>
        </template>
        
    </div>
</div>