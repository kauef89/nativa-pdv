<?php
/**
 * Template para a tela exibida quando um usuário deslogado tenta acessar a "Minha Conta".
 * VERSÃO 2.1 (Banho de Loja): Reestrutura os cards de benefício em cabeçalho e conteúdo.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<div class="nativa-page-container">
    <div class="nativa-login-prompt-header">
        <h1>Crie sua conta ou entre</h1>
        <p class="login-prompt-subtitle">Tenha acesso a um mundo de vantagens e agilidade na hora de fazer seu pedido!</p>
    </div>

    <div class="nativa-login-benefits-grid">
        
        <div class="nativa-benefit-card">
            <div class="benefit-card-icon">
                <span class="material-symbols-rounded">receipt_long</span>
            </div>
            <div class="benefit-card-text">
                <h3>Histórico de Pedidos</h3>
                <p>Acesse todos os seus pedidos anteriores com um clique e repita seus favoritos facilmente.</p>
            </div>
        </div>

        <div class="nativa-benefit-card">
            <div class="benefit-card-icon">
                <span class="material-symbols-rounded">home_pin</span>
            </div>
            <div class="benefit-card-text">
                <h3>Endereços Salvos</h3>
                <p>Salve quantos endereços quiser e finalize suas compras de forma muito mais rápida.</p>
            </div>
        </div>

        <div class="nativa-benefit-card">
            <div class="benefit-card-icon">
                <span class="material-symbols-rounded">workspace_premium</span>
            </div>
            <div class="benefit-card-text">
                <h3>Programa de Fidelidade</h3>
                <p>Acumule pontos a cada compra e troque por lanches grátis com o nosso programa de recompensas.</p>
            </div>
        </div>

    </div>

    <div class="nativa-login-prompt-actions">
        <button id="nativa-trigger-login-prompt" class="nativa-button-primary"><span class="material-symbols-rounded">login</span>Entrar agora</button>
    </div>

    <div class="nativa-legal-links-footer">
        <a href="#" class="nativa-legal-link" data-content-id="privacy">Política de Privacidade</a>
        <span>&</span>
        <a href="#" class="nativa-legal-link" data-content-id="terms">Termos de Serviço</a>
    </div>
    </div>