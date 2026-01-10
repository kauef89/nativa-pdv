// js/utils/modal.js

/**
 * Módulo para exibir modais de alerta e confirmação.
 * Substitui o uso de `alert()` e `confirm()`.
 * ATUALIZAÇÃO: Garante que clicar fora do modal sempre resolva a promessa como 'false' (ação segura).
 * ATUALIZAÇÃO (UI): Centraliza o botão de ação quando há apenas um, e justifica quando há dois.
 * NOVO (UI): Adiciona suporte para exibição de ícones (Material Icons).
 * CORREÇÃO (HTML): Permite a renderização de HTML na mensagem do modal removendo o escape explícito.
 */

import { escapeHTML } from './nativa-ui-helpers.js';

/**
 * Exibe um modal de confirmação ou alerta a partir de um objeto de opções.
 * @param {object} options As opções para o modal.
 * @param {string} options.title O título do modal.
 * @param {string} options.message A mensagem a ser exibida. Suporta '\\n' para quebras de linha em texto puro, ou pode ser HTML.
 * @param {string} [options.iconName=null] O nome do ícone do Material Icons a ser exibido.
 * @param {string} [options.confirmText='OK'] O texto do botão de confirmação.
 * @param {string|null} [options.cancelText=null] O texto do botão de cancelamento. Se nulo, o botão não é exibido.
 * @param {boolean} [options.isCritical=false] Se verdadeiro, aplica um estilo de perigo ao botão de confirmação.
 * @returns {Promise<boolean>} Retorna uma Promise que resolve para `true` se o usuário confirmar, ou `false` se cancelar.
 */
export const showModal = (options) => {
    return new Promise((resolve) => {
        const {
            title = 'Atenção',
            message = '',
            iconName = null,
            confirmText = 'OK',
            cancelText = null,
            isCritical = false,
        } = options;

        if (!document.getElementById('nativa-modal-styles')) {
            const style = document.createElement('style');
            style.id = 'nativa-modal-styles';
            // Estilos CSS (inalterados)
            style.innerHTML = `
                .nativa-modal-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background-color: rgba(0, 0, 0, 0.6); z-index: 10000;
                    display: flex; justify-content: center; align-items: center;
                    padding: 16px; box-sizing: border-box;
                    opacity: 0; transition: opacity 0.2s ease-in-out;
                }
                .nativa-modal-overlay.is-visible { opacity: 1; }
                .nativa-modal-dialog {
                    background-color: var(--md-sys-color-surface);
                    color: var(--md-sys-color-on-surface);
                    padding: 24px; border-radius: 28px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
                    width: 100%; max-width: 400px;
                    text-align: center;
                    transform: scale(0.95); opacity: 0;
                    transition: transform 0.2s ease-in-out, opacity 0.2s ease-in-out;
                    display: flex; flex-direction: column; gap: 16px;
                }
                .nativa-modal-overlay.is-visible .nativa-modal-dialog {
                    transform: scale(1); opacity: 1;
                }
                .nativa-modal-icon {
                    font-size: var(--icon-size-2xl);
                    color: var(--md-sys-color-outline);
                    margin-bottom: -8px;
                    line-height: 1;
                }
                .nativa-modal-icon.icon-big {
                    font-size: 48px;
                }
                .nativa-modal-icon.is-critical-icon {
                    color: var(--md-sys-color-error);
                }
                .nativa-modal-title {
                    font-size: var(--font-size-2xl);
                    line-height: 2rem;
                    font-weight: var(--font-weight-extrabold);
                    margin: 0;
                    color: var(--md-sys-color-on-surface);
                }
                .nativa-modal-message {
                    margin: 0; font-size: 1rem; line-height: 1.5rem;
                    color: var(--md-sys-color-on-surface-variant);
                    white-space: pre-line; /* Mantém para quebras de linha com \n */
                }
                 /* Garante que o conteúdo HTML dentro da mensagem não tenha margens estranhas */
                .nativa-modal-message > *:first-child { margin-top: 0; }
                .nativa-modal-message > *:last-child { margin-bottom: 0; }
                .nativa-modal-actions {
                    display: flex;
                    gap: 8px;
                    margin-top: 8px;
                    justify-content: space-between;
                }
                .nativa-modal-actions.single-action {
                    justify-content: center;
                }
                .nativa-modal-actions .nativa-button-primary.is-critical,
                .nativa-modal-actions .nativa-button-secondary.is-critical {
                    --md-sys-color-primary: var(--md-sys-color-error);
                    --md-sys-color-on-primary: var(--md-sys-color-on-error);
                    background-color: var(--md-sys-color-error);
                    color: var(--md-sys-color-on-error);
                }
                 .nativa-modal-actions .nativa-button-secondary.is-critical {
                    border-color: var(--md-sys-color-error);
                    color: var(--md-sys-color-error);
                 }
                 .nativa-modal-actions .nativa-button-secondary.is-critical:hover {
                    background-color: rgba(var(--md-sys-color-error-rgb), 0.08);
                 }
            `;
            document.head.appendChild(style);
        }

        const overlay = document.createElement('div');
        overlay.className = 'nativa-modal-overlay';

        const modal = document.createElement('div');
        modal.className = 'nativa-modal-dialog';

        const iconColorClass = isCritical ? 'is-critical-icon' : '';
        const iconHtml = iconName
            ? `<span class="material-symbols-rounded nativa-modal-icon icon-big ${iconColorClass}">${escapeHTML(iconName)}</span>`
            : '';

        const titleHtml = `<h2 class="nativa-modal-title">${escapeHTML(title)}</h2>`;

        // --- INÍCIO DA MODIFICAÇÃO (CORREÇÃO HTML) ---
        // Remove a chamada `escapeHTML()` daqui e usa innerHTML para renderizar o HTML passado
        // A função replace ainda funciona para texto puro com \n
        const messageHtml = `<div class="nativa-modal-message">${message.replace(/\\n/g, '\n')}</div>`;
        // --- FIM DA MODIFICAÇÃO ---

        let confirmBtnClass = 'nativa-button-primary';
        let cancelBtnClass = isCritical
            ? 'nativa-button-secondary is-critical'
            : 'nativa-button-secondary';

        if (isCritical) {
            confirmBtnClass += ' is-critical';
            // Ajuste: Se o botão principal (confirm) é crítico, o secundário (cancel) NÃO deve ser crítico geralmente.
            // A exceção é se o cancelText for algo como "Descartar", onde isCritical=true faria sentido para ele.
            // Para simplificar, vamos assumir que apenas um botão por vez é 'crítico' visualmente.
            // Se confirm é crítico (ex: Excluir), cancel (ex: Cancelar) não é.
            cancelBtnClass = 'nativa-button-secondary'; // Remove is-critical do botão cancelar se confirm for crítico
        }

        const hasCancelButton = cancelText !== null;
        const actionsContainerClass = hasCancelButton
            ? 'nativa-modal-actions'
            : 'nativa-modal-actions single-action';

        const confirmBtnHtml = `<button id="modal-confirm-btn" class="${confirmBtnClass}">${escapeHTML(confirmText)}</button>`;
        const cancelBtnHtml = hasCancelButton
            ? `<button id="modal-cancel-btn" class="${cancelBtnClass}">${escapeHTML(cancelText)}</button>`
            : '';

        modal.innerHTML = `
            ${iconHtml}
            ${titleHtml}
            ${messageHtml}
            <div class="${actionsContainerClass}">
                ${cancelBtnHtml}
                ${confirmBtnHtml}
            </div>
        `;

        document.body.appendChild(overlay);
        overlay.appendChild(modal);

        setTimeout(() => {
            overlay.classList.add('is-visible');
        }, 10);

        const close = (result) => {
            overlay.classList.remove('is-visible');
            setTimeout(() => {
                overlay.remove();
                resolve(result);
            }, 200);
        };

        const confirmBtn = document.getElementById('modal-confirm-btn');
        confirmBtn.addEventListener('click', () => close(true));

        const cancelBtn = document.getElementById('modal-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => close(false));
        }

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                close(false);
            }
        });
    });
};
