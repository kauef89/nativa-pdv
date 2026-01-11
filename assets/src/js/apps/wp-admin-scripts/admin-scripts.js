// apps/wp-admin-scripts/admin-scripts.js

const adminConfig = window.nativaAdminAjax || {};
const ajaxUrl = adminConfig.ajax_url;

export const initCopyHours = () => {
    /* ... Manter código existente ... */
};
export const initCouponGenerator = () => {
    /* ... Manter código existente ... */
};
export const initCsvImporter = () => {
    /* ... Manter código existente ... */
};

export const initPushNotifications = () => {
    const form = document.getElementById('nativa-send-push-form');
    if (!form) return;

    const buttonAll = form.querySelector('#send-push-button');
    const buttonSegment = form.querySelector('#send-segment-push-button'); // Novo botão
    const buttonTest = form.querySelector('#send-test-push-button');
    const spinner = form.querySelector('.spinner');
    const feedbackDiv = document.getElementById('push-status-feedback');

    const toggleControls = (disabled) => {
        if (buttonAll) buttonAll.disabled = disabled;
        if (buttonSegment) buttonSegment.disabled = disabled;
        if (buttonTest) buttonTest.disabled = disabled;
        if (disabled) spinner.classList.add('is-active');
        else spinner.classList.remove('is-active');
    };

    const validateFields = () => {
        const title = form.querySelector('#push-title').value.trim();
        const message = form.querySelector('#push-message').value.trim();
        if (!title || !message) {
            alert('Por favor, preencha o Título e a Mensagem.');
            return false;
        }
        return true;
    };

    const sendPushRequest = async (action, loadingMessage) => {
        if (!validateFields()) return;

        toggleControls(true);
        feedbackDiv.style.display = 'block';
        feedbackDiv.className = 'notice notice-info is-dismissible';
        feedbackDiv.innerHTML = `<p>${loadingMessage}</p>`;

        const formData = new FormData(form);
        formData.append('action', action);

        try {
            const response = await fetch(ajaxUrl, {
                method: 'POST',
                body: formData,
            });
            const result = await response.json();

            if (result.success) {
                feedbackDiv.className = 'notice notice-success is-dismissible';
                feedbackDiv.innerHTML = `<p>${result.data.message}</p>`;
                if (action !== 'nativa_delivery_send_test_push') {
                    // Recarrega em 2.5s para envios reais
                    setTimeout(() => location.reload(), 2500);
                } else {
                    // Recarrega também no teste para mostrar o log
                    setTimeout(() => location.reload(), 2000);
                }
            } else {
                feedbackDiv.className = 'notice notice-error is-dismissible';
                feedbackDiv.innerHTML = `<p><strong>Erro:</strong> ${result.data.message}</p>`;
            }
        } catch (error) {
            console.error('Erro push:', error);
            feedbackDiv.className = 'notice notice-error is-dismissible';
            feedbackDiv.innerHTML =
                '<p><strong>Erro:</strong> Falha de comunicação.</p>';
        } finally {
            toggleControls(false);
        }
    };

    // 1. Enviar para TODOS
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        sendPushRequest(
            'nativa_delivery_send_bulk_push',
            'Enviando para TODOS os usuários...'
        );
    });

    // 2. Enviar Segmentado (Não compraram hoje)
    if (buttonSegment) {
        buttonSegment.addEventListener('click', () => {
            sendPushRequest(
                'nativa_delivery_send_not_ordered_push',
                'Filtrando pedidos de hoje e enviando...'
            );
        });
    }

    // 3. Enviar Teste
    if (buttonTest) {
        buttonTest.addEventListener('click', () => {
            sendPushRequest(
                'nativa_delivery_send_test_push',
                'Enviando teste para você...'
            );
        });
    }
};

export const init = () => {
    // Garante que as funções existam antes de chamar
    if (typeof initCopyHours === 'function') initCopyHours();
    if (typeof initCouponGenerator === 'function') initCouponGenerator();
    if (typeof initCsvImporter === 'function') initCsvImporter();
    initPushNotifications();
};
