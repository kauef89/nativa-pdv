<?php
/**
 * Template para o banner de consentimento de cookies.
 * Este template será incluído no rodapé do site.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Busca a URL da página de Política de Privacidade definida no menu do WordPress em Configurações > Privacidade
$privacy_policy_url = get_privacy_policy_url();
?>
<div id="nativa-cookie-banner" class="nativa-cookie-banner is-hidden">
    <div class="nativa-cookie-content">
        <p class="nativa-cookie-text">
            Nós usamos cookies para garantir que oferecemos a melhor experiência em nosso site. Ao continuar, você concorda com o nosso uso de cookies.
            <?php if ( $privacy_policy_url ) : ?>
                <a href="<?php echo esc_url( $privacy_policy_url ); ?>" target="_blank" class="nativa-cookie-privacy-link">Saiba mais</a>.
            <?php endif; ?>
        </p>
        <button id="nativa-cookie-accept-btn" class="nativa-cookie-accept-button">Aceitar</button>
    </div>
</div>