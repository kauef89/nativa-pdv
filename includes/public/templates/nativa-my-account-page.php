<?php
/**
 * Template para a página "Minha Conta" da SPA.
 * VERSÃO CORRIGIDA: Restaura a estrutura original dos cards e classes de estilo para compatibilidade
 * com o CSS existente e a lógica de reestruturação de abas do JavaScript.
 */

if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="nativa-page-container" id="my-account-logged-in-view">

    <div class="nativa-profile-card nativa-fade-in-up">
        <div class="nativa-avatar-placeholder" id="my-account-avatar-placeholder"></div>
            <div class="nativa-profile-header">
                <div class="nativa-profile-info">
                    <h3 class="profile-greeting">Olá, <span id="my-account-first-name">...</span>!</h3>
                    <div class="nativa-loyalty-summary">
                        <span class="material-symbols-rounded">diamond</span>
                        <span id="my-account-points-value">0</span>
                    </div>
                </div>
    </div>

    <div id="nativa-pending-payment-container" style="display: none;">
        <?php // O conteúdo do PIX pendente será injetado aqui pelo JavaScript. ?>
    </div>

    <div id="nativa-current-order-card-wrapper" class="nativa-account-card">
        </div>

    <div id="my-account-order-history-container" class="nativa-account-card">
        <h4 id="my-account-order-history-title">Histórico de Pedidos</h4>
        <p class="loading-message">Carregando seu histórico de pedidos...</p>
    </div>

    <div class="nativa-account-card nativa-fade-in-up">    
        <div id="address-list-container">
            <p class="loading-message">Carregando endereços...</p>
        </div>
        <button id="add-new-address-btn" class="nativa-button-secondary"><span class="material-symbols-rounded">add_location_alt</span>Adicionar endereço</button>
    </div>

    <div class="nativa-account-card nativa-fade-in-up">
        <div class="profile-data-section">
            <div class="data-item">
                <span class="data-label">Nome Completo</span>
                <strong class="data-value" id="manage-account-name">Carregando...</strong>
            </div>
            <div class="data-item">
                <span class="data-label">E-mail</span>
                <strong class="data-value" id="manage-account-email">Carregando...</strong>
            </div>
            <div class="data-item">
                <span class="data-label">CPF</span>
                <strong class="data-value" id="manage-account-cpf">Carregando...</strong>
            </div>
            <div class="data-item">
                <span class="data-label">Nascimento</span>
                <strong class="data-value" id="manage-account-dob">Não informado</strong>
            </div>
            <div class="data-item">
                <span class="data-label">WhatsApp</span>
                <div class="change-whatsapp">
                    <strong class="data-value" id="manage-account-phone">Carregando...</strong>
                    <button id="edit-phone-btn" class="action-btn" title="Editar Telefone">
                        <span class="material-symbols-rounded">edit</span>
                    </button>
                </div>
            </div>
        </div>
        <div class="card-footer" style="padding-top: 20px; text-align: center;">
            <button id="my-account-logout-button" class="nativa-button-secondary">
                <span class="material-symbols-rounded">logout</span>
                Sair da Conta
            </button>
            <a href="#" class="nativa-delete-account-link">Excluir minha conta</a>
            
            <div class="nativa-legal-links-footer">
                <a href="#" class="nativa-legal-link" data-content-id="privacy">Política de Privacidade</a>
                <span>&</span>
                <a href="#" class="nativa-legal-link" data-content-id="terms">Termos de Serviço</a>
            </div>
            </div>
    </div>
</div>