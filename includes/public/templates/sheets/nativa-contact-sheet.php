<?php
/**
 * Template para a Ficha de Contato.
 * ESTRUTURA PADRONIZADA
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="nativa-contact-sheet" class="nativa-bottom-sheet is-draggable">
    <div class="nativa-bottom-sheet-content">
        
        <div class="nativa-bottom-sheet-handle"></div>

        <div class="nativa-bottom-sheet-header">
            <span class="material-symbols-rounded nativa-sheet-header-icon">contact_support</span>
            <h3 class="nativa-sheet-title">Precisa tirar alguma dúvida?</h3>
        </div>

        <div class="nativa-separator"></div>

        <div class="nativa-bottom-sheet-body">
            <div class="business-card">
            <div class="business-card-address">Av. Amândio Cabral, 55 - Centro<br/>Balneário Barra do Sul / SC<br/>CNPJ 26.908.287/0001-46</div>
                <a href="https://www.google.com/maps/search/?api=1&query=Pastelaria%20Nativa&query_place_id=ChIJd_Oc9xAx2ZQRBJTtclEVonY" target="_blank" rel="noopener nofollow" class="nativa-button-secondary">
                Ver no mapa
                </a>
            </div>
            <p>Lembre-se que temos atendimento presencial e podemos não responder imediatamente, mesmo que estejamos online.</p>
            <p>Para agilizar, envie sua dúvida de forma clara e objetiva em uma única mensagem de texto.</p>
            <p>Mensagens de áudio podem demorar mais para serem respondidas, evite quando puder.</p>
        </div> <!-- A tag de fechamento para .nativa-bottom-sheet-body foi movida para aqui, após os parágrafos. -->

        <div class="nativa-bottom-sheet-actions">
            <a href="#" id="nativa-contact-cta-btn" class="nativa-button-primary" target="_blank" rel="noopener noreferrer" role="button">
                Falar no WhatsApp
                <span class="material-symbols-rounded">arrow_outward</span>
            </a>
        </div>

    </div>
</div>