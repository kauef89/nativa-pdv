import { state } from './main-state.js';
import { getLiveStatus } from './nativa-api-service.js';
// import { showToast } from '../utils/nativa-ui-helpers.js'; // showToast não está sendo usado aqui

let storeStatusInterval = null;
let isFirstCheck = true; // Mantém a flag para garantir a sincronização inicial

function startLiveStoreCheck() {
    if (storeStatusInterval) clearInterval(storeStatusInterval);

    const performCheck = async () => {
        try {
            // --- INÍCIO DA SONDAGEM DE DEPURAÇÃO (FRONTEND) ---
            console.log(
                '%c[SONDA FRONTEND 1/4] performCheck: Buscando liveStatus...',
                'color: #0073aa;'
            );
            // --- FIM DA SONDAGEM ---

            const liveStatus = await getLiveStatus();
            // Acesso seguro ao status atual no estado global
            const currentStatus = state.serverData?.serviceStatus;

            // --- INÍCIO DA SONDAGEM DE DEPURAÇÃO (FRONTEND) ---
            console.log(
                '%c[SONDA FRONTEND 2/4] liveStatus recebido do Backend:',
                'color: #0073aa;',
                JSON.parse(JSON.stringify(liveStatus))
            );
            console.log(
                '%c[SONDA FRONTEND 3/4] currentStatus (estado atual do frontend):',
                'color: #0073aa;',
                currentStatus
                    ? JSON.parse(JSON.stringify(currentStatus))
                    : 'undefined'
            );
            // --- FIM DA SONDAGEM ---

            // --- INÍCIO DA MODIFICAÇÃO ---
            // Verifica se o status realmente mudou OU se é a primeira verificação
            const statusHasChanged = currentStatus
                ? liveStatus.is_store_open !== currentStatus.is_store_open
                : true; // Considera mudança se currentStatus não existir

            // Atualiza o estado global SEMPRE para ter os dados mais recentes (ex: next_opening)
            Object.assign(state.serverData.serviceStatus, liveStatus);

            // Dispara o evento APENAS se for a primeira verificação OU se o status de abertura mudou
            if (isFirstCheck || statusHasChanged) {
                console.log(
                    `[BackgroundTasks] Status check: isFirstCheck=${isFirstCheck}, statusHasChanged=${statusHasChanged}. Disparando evento.`
                );
                // --- INÍCIO DA SONDAGEM DE DEPURAÇÃO (FRONTEND) ---
                console.log(
                    '%c[SONDA FRONTEND 4/4] Disparando evento nativa:storeStatusChanged (isFirstCheck: ' +
                        isFirstCheck +
                        ', statusHasChanged: ' +
                        statusHasChanged +
                        ')',
                    'color: #0073aa; font-weight: bold;'
                );
                // --- FIM DA SONDAGEM ---
                document.dispatchEvent(
                    new CustomEvent('nativa:storeStatusChanged', {
                        // --- ADIÇÃO AQUI ---
                        detail: { ...liveStatus, isFirstCheck: isFirstCheck },
                        // --- FIM DA ADIÇÃO ---
                    })
                );
                isFirstCheck = false;
            } else {
                // console.log(`[BackgroundTasks] Status check: isFirstCheck=${isFirstCheck}, statusHasChanged=${statusHasChanged}. Sem mudanças visuais.`);
                // --- INÍCIO DA SONDAGEM DE DEPURAÇÃO (FRONTEND) ---
                console.log(
                    '%c[SONDA FRONTEND 4/4] Status não mudou e não é a primeira verificação. Nenhum evento disparado.',
                    'color: #0073aa;'
                );
                // --- FIM DA SONDAGEM ---
            }
            // --- FIM DA MODIFICAÇÃO ---
        } catch (error) {
            console.warn(
                '[BackgroundTasks] Não foi possível verificar o status da loja:',
                error.message
            );
            // Considerar se deve tentar novamente ou parar o intervalo em caso de erro persistente
        }
    };

    // Executa a primeira verificação um pouco depois para dar tempo da UI inicial carregar
    setTimeout(performCheck, 3000); // 3 segundos

    // Continua verificando em intervalos regulares (ex: 20 segundos)
    storeStatusInterval = setInterval(performCheck, 20000);
}

export function initBackgroundTasks() {
    startLiveStoreCheck();
}
