// js/features/address/address-ui.js

import { escapeHTML } from '../../utils/nativa-utils.js';

function _updateWizardHeader(
    sheet,
    stepNumber,
    totalSteps,
    titleText,
    iconName
) {
    const headerEl = sheet.querySelector('.nativa-bottom-sheet-header');
    if (!headerEl) return;
    const progressPercentage = (stepNumber / totalSteps) * 100;
    headerEl.innerHTML = `
        <div class="nativa-wizard-header-content">
            <span class="material-symbols-rounded nativa-sheet-header-icon">${iconName}</span>
            <h3 id="address-form-title" class="nativa-sheet-title">${titleText}</h3>
            <div class="nativa-combo-progress-container address-progress">
                <span class="step-text">Passo ${stepNumber} de ${totalSteps}</span>
                <progress class="nativa-wizard-progress" max="100" value="${progressPercentage}"></progress>
            </div>
        </div>
    `;
}

function _ensureHandle(sheetContent) {
    if (!sheetContent.querySelector('.nativa-bottom-sheet-handle')) {
        const handle = document.createElement('div');
        handle.className = 'nativa-bottom-sheet-handle';
        sheetContent.prepend(handle);
    }
}

export function renderAddressWizardStep(
    stepNumber,
    data = {},
    allBairros = []
) {
    const sheet = document.getElementById('nativa-address-form-sheet');
    const container = document.getElementById('nativa-address-form-container');
    const sheetContent = sheet?.querySelector('.nativa-bottom-sheet-content');

    if (!container || !sheet) return;
    if (sheetContent) _ensureHandle(sheetContent);

    container.innerHTML = '';

    // --- ETAPA 1 ---
    if (stepNumber === 1) {
        _updateWizardHeader(sheet, 1, 3, 'Onde você quer receber?', 'search');
        container.innerHTML = `
            <div class="nativa-wizard-step fade-in">
                <p class="nativa-step-description">Comece digitando o nome da sua rua.</p>
                <div class="nativa-form-group search-group">
                    <div class="nativa-input-wrapper">
                        <span class="material-symbols-rounded prefix-icon">search</span>
                        <input type="text" id="address-search-input" class="nativa-input" placeholder="Ex: Avenida Brasil..." autocomplete="off">
                        <button id="clear-search-btn" class="icon-button" style="display: none;"><span class="material-symbols-rounded">close</span></button>
                    </div>
                </div>
                <div id="address-search-results" class="nativa-search-results-list">
                    <div class="empty-search-placeholder">
                        <span class="material-symbols-rounded">location_city</span>
                        <p>Digite para buscar seu endereço</p>
                    </div>
                </div>
            </div>
        `;
        setTimeout(
            () => document.getElementById('address-search-input')?.focus(),
            100
        );
    }

    // --- ETAPA 2 ---
    else if (stepNumber === 2) {
        _updateWizardHeader(sheet, 2, 3, 'Detalhes do endereço', 'home_pin');

        let bairroName = data.bairroName;
        if (!bairroName && data.bairroId && allBairros) {
            const bairroObj = allBairros.find((b) => b.id == data.bairroId);
            bairroName = bairroObj ? bairroObj.nome : null;
        }
        bairroName = bairroName || 'Bairro não identificado';

        container.innerHTML = `
            <div class="nativa-wizard-step fade-in">
                <div class="selected-street-summary">
                    <div class="summary-content">
                        <span class="material-symbols-rounded summary-icon">location_on</span>
                        <div class="street-info">
                            <strong class="street-name">${escapeHTML(data.streetName || '')}</strong>
                            <span class="street-bairro">${escapeHTML(bairroName)}</span>
                        </div>
                    </div>
                    <button id="change-street-btn" class="nativa-button-text-small">Alterar</button>
                </div>

                <div class="nativa-form-group-split nativa-phone-group mt-md">
                    <div class="nativa-form-group number-group">
                        <label for="address-number">Número</label>
                        <input type="tel" id="address-number" class="nativa-input" placeholder="123" inputmode="numeric">
                    </div>
                    <div class="nativa-no-number-group">
                        <div class="nativa-toggle-switch">
                            <div class="nativa-toggle-control">
                                <input type="checkbox" id="address-no-number" class="nativa-address-no-number-checkbox">
                                <label for="address-no-number" class="nativa-toggle-ui"></label>
                            </div>
                            <label for="address-no-number" class="nativa-toggle-label">Sem número</label>
                        </div>
                    </div>
                </div>

                <div class="nativa-form-group">
                    <label for="address-complement">Complemento (Opcional)</label>
                    <input type="text" id="address-complement" class="nativa-input" placeholder="Ex: Apto 101, Casa Verde">
                </div>

                <div class="wizard-actions">
                    <button id="address-step2-next-btn" class="nativa-button-primary full-width">Continuar</button>
                </div>
            </div>
        `;
    }

    // --- ETAPA 3 ---
    else if (stepNumber === 3) {
        _updateWizardHeader(sheet, 3, 3, 'Para finalizar', 'check_circle');

        container.innerHTML = `
            <div class="nativa-wizard-step fade-in">
                
                <div class="nativa-wizard-section">
                    <h4 class="wizard-section-title">Ajude o entregador <span class="optional-text">(Opcional)</span></h4>
                    <button id="get-geolocation-btn" class="nativa-button-secondary full-width location-btn needs-attention">
                        <span class="material-symbols-rounded">my_location</span>
                        <span>Compartilhar Localização Atual</span>
                    </button>
                    <p id="geo-status-msg" class="nativa-field-hint">Isso grava suas coordenadas GPS para uma entrega mais precisa.</p>
                </div>

                <div class="nativa-separator"></div>

                <div class="nativa-wizard-section">
                    <h4 class="wizard-section-title">Salvar endereço como:</h4>
                    <div class="apelido-chips">
                        <button type="button" class="nativa-chip" data-value="Casa">Casa</button>
                        <button type="button" class="nativa-chip" data-value="Trabalho">Trabalho</button>
                        <button type="button" class="nativa-chip" data-value="Namorada(o)">Namorada(o)</button>
                    </div>
                    <input type="text" id="address-apelido" class="nativa-input" placeholder="Ex: Casa de Praia, Escritório..." value="Casa">
                </div>

                <div class="nativa-wizard-toggle-container">
                    <div class="nativa-toggle-switch">
                        <div class="nativa-toggle-control">
                            <input type="checkbox" id="address-is-primary" checked>
                            <label for="address-is-primary" class="nativa-toggle-ui"></label>
                        </div>
                        <label for="address-is-primary" class="nativa-toggle-label">Definir como endereço principal</label>
                    </div>
                </div>

                <div class="wizard-actions dual-actions">
                    <button id="address-step3-back-btn" class="nativa-button-secondary btn-back">Voltar</button>
                    <button id="address-finish-btn" class="nativa-button-primary btn-finish">Salvar Endereço</button>
                </div>
            </div>
        `;

        setTimeout(
            () => document.getElementById('address-apelido')?.focus(),
            100
        );
    }
}

export function renderSearchResults(results, onSelectCallback) {
    const listContainer = document.getElementById('address-search-results');
    if (!listContainer) return;

    listContainer.innerHTML = '';

    if (results.length === 0) {
        listContainer.innerHTML = `
            <div class="empty-search-placeholder">
                <span class="material-symbols-rounded">search_off</span>
                <p>Nenhuma rua encontrada.</p>
            </div>
        `;
        return;
    }

    results.forEach((rua) => {
        const item = document.createElement('div');
        item.className = 'nativa-search-item';

        item.innerHTML = `
            <div class="item-main-wrapper">
                <span class="material-symbols-rounded item-icon">signpost</span>
                <div class="item-content">
                    <span class="item-title">${escapeHTML(rua.nome)}</span>
                    <span class="item-subtitle">${escapeHTML(rua.bairro_nome)}</span>
                </div>
            </div>
            <span class="material-symbols-rounded item-arrow">chevron_right</span>
        `;

        item.addEventListener('click', () => onSelectCallback(rua));
        listContainer.appendChild(item);
    });
}
