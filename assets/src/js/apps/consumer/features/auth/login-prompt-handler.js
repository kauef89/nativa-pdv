// apps/consumer/features/auth/login-prompt-handler.js

import { handleGoogleLogin } from '@core/api/api-service.js';
import { showToast } from '@utils/ui-helpers.js';

let isInitializationStarted = false;

/**
 * Manipula a resposta de credencial recebida do Google.
 * Envia a credencial para o backend para verificação e login.
 * @param {object} response O objeto de resposta da credencial do Google.
 */
async function handleCredentialResponse(response) {
    const container = document.getElementById('nativa-social-login-container');
    if (container) {
        container.innerHTML =
            '<div class="login-loader-spinner" style="display: flex; justify-content: center; align-items: center; height: 40px;"><span class="nativa-spinner"></span></div>';
    }

    try {
        // --- INÍCIO DA MODIFICAÇÃO ---
        const result = await handleGoogleLogin(
            response.credential,
            window.location.href
        );

        if (result && result.redirect_url) {
            if (result.user_status === 'new' || !result.is_profile_complete) {
                sessionStorage.setItem('nativaShowWelcomeToast', 'true');
            }
            document.dispatchEvent(new CustomEvent('nativa:userLoggedIn'));

            const guestFavorites = localStorage.getItem('nativaGuestFavorites');
            if (guestFavorites) {
                localStorage.removeItem('nativaGuestFavorites');
                console.log(
                    '[Login Handler] Favoritos de convidado limpos após o login.'
                );
            }

            // Armazena a URL de redirecionamento final para ser usada pela página de processamento.
            sessionStorage.setItem(
                'nativaLoginRedirect',
                result.final_redirect_url
            );
            window.location.href = result.redirect_url;
            // --- FIM DA MODIFICAÇÃO ---
        } else {
            throw new Error(
                result.message ||
                    'Resposta inválida do servidor durante o login.'
            );
        }
    } catch (error) {
        console.error(
            '[Nativa Login] Erro na chamada da API ou no processamento da resposta:',
            error
        );
        showToast(error.message, 'error');
        if (container) {
            initializeGoogleLogin();
        }
    }
}

/**
 * Inicializa a biblioteca do Google e renderiza o botão de login.
 */
function initializeGoogleLogin() {
    const container = document.getElementById('nativa-social-login-container');
    if (!container) {
        return;
    }

    const googleClientId = window.nativaDeliveryData?.google_client_id;

    if (!googleClientId) {
        console.error(
            'CRÍTICO: Google Client ID não encontrado em window.nativaDeliveryData.'
        );
        container.innerHTML =
            '<p style="text-align: center; color: var(--md_sys_color_error-container);">Erro de configuração de login.</p>';
        return;
    }

    try {
        google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleCredentialResponse,
            use_fedcm_for_prompt: true,
        });

        container.innerHTML = '';
        google.accounts.id.renderButton(container, {
            theme: 'outline',
            size: 'large',
            width: '300',
            text: 'signin_with',
            locale: 'pt-BR',
        });
    } catch (error) {
        console.error('Erro CRÍTICO ao inicializar o Login com Google:', error);
        if (container) {
            container.innerHTML =
                '<p style="text-align: center; color: var(--md_sys_color_error-container);">Falha ao iniciar o serviço de login.</p>';
        }
    }
}

/**
 * Aguarda ativamente a biblioteca do Google ser carregada e então a inicializa.
 */
function waitForGoogleLibrary() {
    const container = document.getElementById('nativa-social-login-container');
    if (!container) return;

    container.innerHTML =
        '<div class="login-loader-spinner" style="display: flex; justify-content: center; align-items: center; height: 40px;"><span class="nativa-spinner"></span></div>';

    let attempts = 0;
    const maxAttempts = 50;

    const interval = setInterval(() => {
        if (
            typeof window.google !== 'undefined' &&
            typeof window.google.accounts !== 'undefined'
        ) {
            clearInterval(interval);
            initializeGoogleLogin();
        } else {
            attempts++;
            if (attempts > maxAttempts) {
                clearInterval(interval);
                console.error(
                    'A biblioteca Google Identity Services não carregou a tempo.'
                );
                if (container) {
                    container.innerHTML =
                        '<p style="text-align: center; color: var(--md_sys_color_error-container);">Não foi possível carregar as opções de login. Tente recarregar a página.</p>';
                }
            }
        }
    }, 100);
}

/**
 * Função exposta para iniciar o fluxo de login.
 */
export const init = () => {
    if (isInitializationStarted) {
        return;
    }
    isInitializationStarted = true;

    waitForGoogleLibrary();

    setTimeout(() => {
        isInitializationStarted = false;
    }, 1000);
};
