<?php
/**
 * Template Name: Nativa Login Processor
 *
 * VERSÃO ATUALIZADA 3: Corrige o redirecionamento para garantir que a SPA seja carregada corretamente.
 * VERSÃO FINAL: Usa meta refresh para o redirecionamento, garantindo a sincronização da sessão of login.
 * VERSÃO ATUALIZADA 4 (ATUAL): Implementa a leitura de transient para um redirecionamento pós-login mais robusto.
 * VERSÃO CORRIGIDA: Lógica de redirecionamento agora utiliza sessionStorage lido por JavaScript para máxima confiabilidade.
 */
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    
    <title>Processando seu login...</title>
    
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" id="nativa-delivery-style-css" href="<?php echo esc_url(NATIVADELIVERY_PLUGIN_URL . 'assets/src/css/frontend-style.css'); ?>" type="text/css" media="all">
    
    <style> 
        body { display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: var(--md-sys-color-surface-container-lowest, #121A1D); color: var(--md-sys-color-on-surface, #E0E2E7); }
        .container { text-align: center; font-family: var(--font-family-primary, sans-serif); }
        .spinner-wrapper { height: 60px; display: flex; align-items: center; justify-content: center; margin-bottom: 16px; }
        .container p { font-size: 1.1em; color: var(--md-sys-color-on-surface-variant, #B0B3B9); }
        .nativa-spinner { color: var(--md-sys-color-primary, #5BC0BE); font-size: 3rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner-wrapper">
            <span class="nativa-spinner"></span>
        </div>
        <p>Autenticando, aguarde...</p>
    </div>
    
    <script type="text/javascript">
        window.onload = function() {
            setTimeout(function() {
                // --- INÍCIO DA MODIFICAÇÃO (SONDA 2) ---
                const redirectUrl = sessionStorage.getItem('nativaLoginRedirect');
                console.log('[SONDA 2 | processor-page] URL de redirecionamento final encontrada na sessionStorage:', redirectUrl);
                // --- FIM DA MODIFICAÇÃO (SONDA 2) ---

                if (redirectUrl) {
                    sessionStorage.removeItem('nativaLoginRedirect');
                    sessionStorage.setItem('nativaShowWelcomeToast', 'true');
                    window.location.href = redirectUrl;
                } else {
                    console.error('[SONDA 2 | processor-page] ERRO: Nenhuma URL de redirecionamento encontrada. Redirecionando para /minha-conta como fallback.');
                    sessionStorage.setItem('nativaShowWelcomeToast', 'true');
                    window.location.href = "<?php echo esc_url_raw(home_url('/minha-conta')); ?>";
                }
            }, 500); 
        };
    </script>
</body>
</html>
