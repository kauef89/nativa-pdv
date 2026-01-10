<?php
/**
 * Template para a Ficha de Seleção de Modalidade.
 * ESTRUTURA PADRONIZADA
 */
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div id="nativa-modality-sheet" class="nativa-bottom-sheet">
    <div class="nativa-bottom-sheet-content">

        <div class="nativa-bottom-sheet-header">
            <h3 class="nativa-sheet-title">Como você quer seu pedido?</h3>
        </div>

        <div class="nativa-bottom-sheet-body">
            <div id="nativa-modality-options-wrapper">
                <div class="nativa-modality-options">
                    <button class="nativa-order-button" data-modality="delivery">
                        <div class="modality-button-illustration"><span class="material-symbols-rounded">moped</span></div>
                        <div class="modality-button-text">
                            <span class="modality-button-title">Entrega</span>
                            <span class="modality-button-time" id="wait-time-delivery">-- min</span>
                        </div>
                    </button>
                    <button class="nativa-order-button" data-modality="pickup">
                        <div class="modality-button-illustration"><span class="material-symbols-rounded">storefront</span></div>
                        <div class="modality-button-text">
                            <span class="modality-button-title">Retirada</span>
                            <span class="modality-button-time" id="wait-time-pickup">-- min</span>
                        </div>
                    </button>
                    <button class="nativa-order-button" data-modality="table">
                        <div class="modality-button-illustration"><span class="material-symbols-rounded">restaurant</span></div>
                        <div class="modality-button-text">
                            <span class="modality-button-title">Na Mesa</span>
                            <span class="modality-button-time" id="wait-time-table">-- min</span>
                        </div>
                    </button>
                </div>
                <div class="nativa-separator"></div>
                <p id="nativa-modality-disclosure">Esta estimativa leva em conta outros pedidos de delivery que estamos preparando. Outros fatores, como pedidos para consumo na lanchonete, disponibilidade de entregadores, e até mesmo a quantidade de itens do seu pedido, podem afetar a estimativa.</p>
            </div>

            <div id="nativa-modality-closed-wrapper" style="display: none;">
                </div>
        </div>

    </div>
</div>