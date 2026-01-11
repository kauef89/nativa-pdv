// shared/features/address/address-handler.js

import { state } from '@core/state/global-state.js';
import * as api from '@core/api/api-service.js';
import {
    openSheet,
    closeSheet,
    showToast,
    showSpinner,
    hideSpinner,
} from '@utils/ui-helpers.js';
import { renderAddressWizardStep, renderSearchResults } from './address-ui.js';
import { showModal } from '@ui/modals/modal.js';

// Estado Local (Memória)
let currentStep = 1;
let wizardData = {
    origin: 'my-account',
    addressId: null,
    streetId: null,
    streetName: '',
    bairroId: null,
    bairroName: '',
    number: '',
    noNumber: false,
    complement: '',
    coords: null,
    apelido: 'Casa',
    isPrimary: false,
};

// Cache de dados
let allRuas = [];
let allBairros = [];

// Chave para salvar no navegador
const STORAGE_KEY = 'nativa_address_wizard_state';

// --- UTILITÁRIO DE BUSCA (Sem Acentos) ---
const normalizeString = (str) => {
    if (!str) return '';
    return str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase();
};

// --- PERSISTÊNCIA ---

function saveState() {
    const stateToSave = {
        currentStep,
        wizardData,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
}

function loadState() {
    try {
        const saved = sessionStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch {
        // CORREÇÃO: Removido (e) não utilizado
        return null;
    }
}

function clearState() {
    sessionStorage.removeItem(STORAGE_KEY);
    currentStep = 1;
    wizardData = {
        origin: 'my-account',
        addressId: null,
        streetId: null,
        streetName: '',
        bairroId: null,
        bairroName: '',
        number: '',
        noNumber: false,
        complement: '',
        coords: null,
        apelido: 'Casa',
        isPrimary: false,
    };
}

/**
 * Inicializa o manipulador e pré-carrega listas.
 */
// CORREÇÃO: Removido parâmetro 'context' não utilizado
export async function init() {
    // Pré-carrega dados
    if (allRuas.length === 0 || allBairros.length === 0) {
        try {
            const [ruasData, bairrosData] = await Promise.all([
                api.getRuas(),
                api.getBairros(),
            ]);
            // Ajuste para lidar com a estrutura de retorno da API
            allRuas = ruasData.ruas || ruasData;
            allBairros = bairrosData.bairros || bairrosData;
            state.allBairros = allBairros;
        } catch (error) {
            console.error('Erro ao carregar dados de endereço:', error);
        }
    }

    // Configura listeners globais
    if (!window.nativaAddressListenersAttached) {
        document.addEventListener('click', function (event) {
            const addBtn =
                event.target.closest('#add-new-address-btn') ||
                event.target.closest('#nativa-cart-add-address-btn') ||
                event.target.closest('#cart-add-new-address-btn-pill');
            const editBtn = event.target.closest('.edit-btn');
            const deleteBtn = event.target.closest('.delete-btn');
            const addressActionBtn = event.target.closest(
                '#nativa-checkout-address-action-btn'
            );

            let contextSource = 'my-account';
            if (
                event.target.closest('#nativa-checkout-section') ||
                event.target.closest('#nativa-cart-side-sheet')
            ) {
                contextSource = 'checkout';
            }

            if (addBtn || addressActionBtn) {
                event.preventDefault();
                handleOpenAddressForm(contextSource);
            } else if (editBtn) {
                event.preventDefault();
                handleOpenAddressForm(contextSource, editBtn.dataset.addressId);
            } else if (deleteBtn) {
                event.preventDefault();
                handleAddressDelete(deleteBtn.dataset.addressId, contextSource);
            }
        });
        window.nativaAddressListenersAttached = true;
    }
}

/**
 * Abre o formulário (Novo ou Edição) com suporte a Rascunho.
 */
export function handleOpenAddressForm(
    origin = 'my-account',
    addressId = null,
    forcePrimary = false
) {
    const sheet = document.getElementById('nativa-address-form-sheet');
    if (!sheet) return;

    // Lógica "Inescapável"
    const isMandatory =
        origin === 'checkout' &&
        (!state.user.addresses || state.user.addresses.length === 0);

    if (isMandatory) {
        sheet.classList.add('is-unclosable');
        const closeBtns = sheet.querySelectorAll(
            '.nativa-bottom-sheet-close, .sheet-close-btn'
        );
        closeBtns.forEach((btn) => (btn.style.display = 'none'));
    } else {
        sheet.classList.remove('is-unclosable');
        const closeBtns = sheet.querySelectorAll(
            '.nativa-bottom-sheet-close, .sheet-close-btn'
        );
        closeBtns.forEach((btn) => (btn.style.display = ''));
    }

    // Tenta recuperar rascunho
    const savedState = loadState();
    let useDraft = false;

    if (savedState) {
        if (addressId) {
            if (savedState.wizardData.addressId == addressId) useDraft = true;
        } else {
            if (!savedState.wizardData.addressId) useDraft = true;
        }
    }

    if (useDraft) {
        currentStep = savedState.currentStep;
        wizardData = savedState.wizardData;
        wizardData.origin = origin;
    } else {
        clearState();

        if (addressId) {
            const existingAddr = state.user.addresses.find(
                (a) => a.id == addressId
            );
            if (existingAddr) {
                // Tenta encontrar nome do bairro para edição
                const bairroObj = allBairros.find(
                    (b) => b.id == existingAddr.bairro_id
                );

                wizardData = {
                    origin,
                    addressId: existingAddr.id,
                    streetId: existingAddr.street,
                    streetName: existingAddr.street_name || existingAddr.street,
                    bairroId: existingAddr.bairro_id,
                    bairroName: bairroObj ? bairroObj.nome : 'Bairro',
                    number: existingAddr.number,
                    noNumber: existingAddr.number === 'S/N',
                    complement: existingAddr.complement,
                    coords: {
                        lat: existingAddr.latitude,
                        lng: existingAddr.longitude,
                    },
                    apelido: existingAddr.apelido,
                    isPrimary: !!existingAddr.is_primary,
                };
                currentStep = 2;
            }
        } else {
            wizardData.origin = origin;
            wizardData.isPrimary =
                forcePrimary || state.user.addresses.length === 0;
        }
        saveState();
    }

    renderStep();
    openSheet(sheet);
}

function renderStep() {
    renderAddressWizardStep(currentStep, wizardData, allBairros);
    attachStepEvents();
}

function attachStepEvents() {
    // --- ETAPA 1: BUSCA ---
    if (currentStep === 1) {
        const searchInput = document.getElementById('address-search-input');
        const clearBtn = document.getElementById('clear-search-btn');

        if (searchInput) {
            searchInput.focus();
            searchInput.addEventListener('input', (e) => {
                // --- CORREÇÃO: Adiciona .trim() para ignorar espaços no início/fim (ex: predição de texto) ---
                const term = normalizeString(e.target.value.trim());

                if (term.length > 0) {
                    const filtered = allRuas.filter((r) =>
                        normalizeString(r.nome).includes(term)
                    );

                    renderSearchResults(
                        filtered.slice(0, 10),
                        (selectedRua) => {
                            try {
                                wizardData.streetId = selectedRua.id;
                                wizardData.streetName = selectedRua.nome;

                                // 1. Tenta obter ID do bairro (Suporta API v1 e v2)
                                wizardData.bairroId =
                                    selectedRua.bairro_id ||
                                    (selectedRua.segmentos &&
                                    selectedRua.segmentos[0]
                                        ? selectedRua.segmentos[0]
                                              .bairro_associado
                                        : null);

                                // 2. Tenta obter Nome do bairro direto da rua
                                let bName = selectedRua.bairro_nome;

                                // 3. SE NÃO TIVER NOME, FAZ O LOOKUP NA LISTA DE BAIRROS (Correção do BUG)
                                if (
                                    !bName &&
                                    wizardData.bairroId &&
                                    allBairros.length > 0
                                ) {
                                    const bairroObj = allBairros.find(
                                        (b) => b.id == wizardData.bairroId
                                    );
                                    if (bairroObj) {
                                        bName = bairroObj.nome;
                                    }
                                }

                                wizardData.bairroName =
                                    bName || 'Bairro não identificado';

                                currentStep = 2;
                                saveState();
                                renderStep();
                            } catch (err) {
                                console.error('Erro ao selecionar rua:', err);
                                showToast(
                                    'Erro ao processar rua. Tente novamente.',
                                    'error'
                                );
                            }
                        }
                    );
                    if (clearBtn) clearBtn.style.display = 'block';
                } else {
                    renderSearchResults([], null);
                    if (clearBtn) clearBtn.style.display = 'none';
                }
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (searchInput) {
                    searchInput.value = '';
                    searchInput.focus();
                    renderSearchResults([], null);
                    clearBtn.style.display = 'none';
                }
            });
        }
    }

    // --- ETAPA 2: DETALHES ---
    else if (currentStep === 2) {
        const nextBtn = document.getElementById('address-step2-next-btn');
        const changeStreetBtn = document.getElementById('change-street-btn');
        const numberInput = document.getElementById('address-number');
        const noNumberCheck = document.getElementById('address-no-number');
        const complementInput = document.getElementById('address-complement');

        // Preenche valores
        if (numberInput) {
            numberInput.value =
                wizardData.number === 'S/N' ? '' : wizardData.number;
            if (wizardData.noNumber) {
                numberInput.disabled = true;
                numberInput.placeholder = 'S/N';
                if (noNumberCheck) noNumberCheck.checked = true;
            }
        }
        if (complementInput)
            complementInput.value = wizardData.complement || '';

        if (changeStreetBtn) {
            changeStreetBtn.addEventListener('click', () => {
                currentStep = 1;
                wizardData.streetId = null;
                wizardData.streetName = '';
                // Limpa também o bairro para forçar nova seleção
                wizardData.bairroId = null;
                wizardData.bairroName = '';
                saveState();
                renderStep();
            });
        }

        if (noNumberCheck && numberInput) {
            noNumberCheck.addEventListener('change', (e) => {
                wizardData.noNumber = e.target.checked;
                if (e.target.checked) {
                    numberInput.value = '';
                    numberInput.disabled = true;
                    numberInput.placeholder = 'S/N';
                    wizardData.number = 'S/N';
                } else {
                    numberInput.disabled = false;
                    numberInput.placeholder = '123';
                    numberInput.focus();
                    wizardData.number = '';
                }
                saveState();
            });
        }

        const saveInputs = () => {
            if (!wizardData.noNumber)
                wizardData.number = numberInput.value.trim();
            wizardData.complement = complementInput.value.trim();
            saveState();
        };
        if (numberInput) numberInput.addEventListener('input', saveInputs);
        if (complementInput)
            complementInput.addEventListener('input', saveInputs);

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const numberVal = numberInput.value.trim();
                const isNoNumber = noNumberCheck.checked;

                if (!isNoNumber && numberVal.length === 0) {
                    showToast(
                        'Informe o número ou marque "Sem número".',
                        'error'
                    );
                    numberInput.focus();
                    return;
                }

                currentStep = 3;
                saveState();
                renderStep();
            });
        }
    }

    // --- ETAPA 3: CONFIRMAÇÃO ---
    else if (currentStep === 3) {
        const backBtn = document.getElementById('address-step3-back-btn');
        const finishBtn = document.getElementById('address-finish-btn');
        const geoBtn = document.getElementById('get-geolocation-btn');
        const apelidoInput = document.getElementById('address-apelido');
        const isPrimaryCheck = document.getElementById('address-is-primary');
        const chips = document.querySelectorAll('.nativa-chip');

        if (apelidoInput) apelidoInput.value = wizardData.apelido || 'Casa';
        if (isPrimaryCheck) isPrimaryCheck.checked = wizardData.isPrimary;

        if (wizardData.coords && geoBtn) {
            geoBtn.classList.add('is-success');
            geoBtn.classList.remove('needs-attention');
            geoBtn.innerHTML =
                '<span class="material-symbols-rounded">check_circle</span> Localização Salva!';
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                currentStep = 2;
                saveState();
                renderStep();
            });
        }

        chips.forEach((chip) => {
            chip.addEventListener('click', () => {
                wizardData.apelido = chip.dataset.value;
                if (apelidoInput) apelidoInput.value = chip.dataset.value;
                saveState();
            });
        });

        if (geoBtn) {
            geoBtn.addEventListener('click', async () => {
                geoBtn.classList.add('is-loading');
                const originalText = geoBtn.innerHTML;
                geoBtn.innerHTML =
                    '<span class="nativa-spinner-small"></span> Localizando...';

                if (!navigator.geolocation) {
                    showToast('Geolocalização indisponível.', 'error');
                    geoBtn.classList.remove('is-loading');
                    geoBtn.innerHTML = originalText;
                    return;
                }

                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        wizardData.coords = {
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                        };
                        saveState();

                        geoBtn.innerHTML =
                            '<span class="material-symbols-rounded">check_circle</span> Localização Salva!';
                        geoBtn.classList.remove('is-loading');
                        geoBtn.classList.remove('needs-attention');
                        geoBtn.classList.add('is-success');
                        showToast('Localização capturada!', 'success');
                    },
                    (error) => {
                        console.error('Erro Geo:', error);
                        showToast('Erro ao obter localização.', 'error');
                        geoBtn.classList.remove('is-loading');
                        geoBtn.innerHTML = originalText;
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            });
        }

        if (finishBtn) {
            finishBtn.addEventListener('click', handleFinishWizard);
        }

        if (apelidoInput)
            apelidoInput.addEventListener('input', (e) => {
                wizardData.apelido = e.target.value;
                saveState();
            });
        if (isPrimaryCheck)
            isPrimaryCheck.addEventListener('change', (e) => {
                wizardData.isPrimary = e.target.checked;
                saveState();
            });
    }
}

async function handleFinishWizard() {
    const finishBtn = document.getElementById('address-finish-btn');
    const apelidoInput = document.getElementById('address-apelido');

    if (!apelidoInput.value.trim()) {
        showToast('Dê um nome para este endereço.', 'error');
        apelidoInput.focus();
        return;
    }

    showSpinner(finishBtn);

    try {
        const payload = {
            // --- CORREÇÃO: Adiciona o nome da rua, campo obrigatório no backend ---
            'nativa-delivery-address-street-name': wizardData.streetName,
            'nativa-delivery-address-street': wizardData.streetId,
            bairro_id: wizardData.bairroId,
            number: wizardData.number,
            complement: wizardData.complement,
            apelido: wizardData.apelido,
            is_primary: wizardData.isPrimary ? 'on' : undefined,
            no_number: wizardData.noNumber ? 'on' : undefined,
            address_id: wizardData.addressId || '',
        };

        if (wizardData.coords) {
            payload['latitude'] = wizardData.coords.lat;
            payload['longitude'] = wizardData.coords.lng;
        }

        const params = new URLSearchParams();
        for (const key in payload) {
            if (payload[key] !== undefined) params.append(key, payload[key]);
        }

        const result = await api.addOrUpdateAddress(params.toString());

        showToast(result.message || 'Endereço salvo com sucesso!', 'success');
        clearState();

        const newAddresses = result.addresses;
        state.user.addresses = newAddresses;

        document.dispatchEvent(
            new CustomEvent('nativa:addressUpdated', {
                detail: {
                    source: wizardData.origin,
                    addresses: newAddresses,
                },
            })
        );

        if (wizardData.origin === 'checkout') {
            const newAddress = newAddresses[newAddresses.length - 1]; // Assume o último
            if (newAddress) {
                sessionStorage.setItem(
                    'nativaCartSelectedAddressId',
                    newAddress.id
                );
            }
        }

        closeSheet(document.getElementById('nativa-address-form-sheet'));
    } catch (error) {
        console.error(error);
        showToast(error.message || 'Erro ao salvar endereço.', 'error');
    } finally {
        hideSpinner(finishBtn);
    }
}

async function handleAddressDelete(addressId, source) {
    const confirmResult = await showModal({
        title: 'Excluir Endereço',
        iconName: 'delete_forever',
        message: 'Tem certeza que deseja excluir este endereço?',
        confirmText: 'Excluir',
        cancelText: 'Cancelar',
        isCritical: true,
    });

    if (confirmResult) {
        try {
            const result = await api.deleteAddress(addressId);
            state.user.addresses = result.addresses || [];

            document.dispatchEvent(
                new CustomEvent('nativa:addressUpdated', {
                    detail: { source, addresses: state.user.addresses },
                })
            );
            showToast('Endereço excluído.', 'success');
        } catch (error) {
            showToast(error.message, 'error');
        }
    }
}

// Utilitário exportado para compatibilidade de build
export function decodeStreetNames(addresses) {
    if (!addresses) return [];
    if (!allRuas || !allRuas.length) return addresses;
    return addresses.map((addr) => {
        const rua = allRuas.find((r) => r.id == addr.street);
        return {
            ...addr,
            streetName: rua ? rua.nome : addr.street_name || addr.street,
        };
    });
}
