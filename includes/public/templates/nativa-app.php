<?php
/**
* Template principal da Single-Page Application (SPA).
* ... (histórico de versões anterior) ...
* ATUALIZAÇÃO (ENG): Migra o conteúdo de nativa-checkout-page.php para dentro
* da SPA e move a inclusão de nativa-bottom-navbar.php para o escopo global,
* garantindo consistência em toda a aplicação.
* REATORAÇÃO (CPT Pagamentos): Remove a lista de botões de pagamento estática
* da section#checkout-section. O container '#nativa-payment-method-options'
* agora será preenchido dinamicamente via JS.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>

<div id="nativa-not-mobile-overlay">
    <div class="nativa-not-mobile-content">
        <div class="sticker-up">
            <?php
                // Define o caminho para o arquivo SVG relativo à raiz do plugin
                $logo_svg_path = NATIVADELIVERY_PLUGIN_DIR . 'assets/images/logo.svg';

                // Verifica se o arquivo existe e o inclui, senão exibe um placeholder ou erro
                if ( file_exists( $logo_svg_path ) ) {
                    echo file_get_contents( $logo_svg_path );
                } else {
                    // Opcional: Exibir um texto ou imagem de fallback se o SVG não for encontrado
                    echo '';
                    // Ou: echo '<img src="' . esc_url( NATIVADELIVERY_PLUGIN_URL . 'assets/images/placeholder-logo.png' ) . '" alt="Logo">';
                }
            ?>
        </div>
        
        <div class="sticker-down">
            <h1>Feita para o seu celular</h1>
            <p>Para uma melhor experiência, faça seu pedido pelo seu telefone. Aponte a câmera para o QR Code abaixo:</p>
            <div id="nativa-qrcode-container" style="padding: 16px; background-color: white; border-radius: 16px;"></div>
            
            <div class="nativa-desktop-legal-links">
                <a href="/privacidade" class="nativa-desktop-legal-link" data-content-id="privacy">Política de Privacidade</a>
                <span>&</span>
                <a href="/termos" class="nativa-desktop-legal-link" data-content-id="terms">Termos de Serviço</a>
            </div>
            </div>
    </div>
</div>

<div id="nativa-desktop-legal-modal" class="nativa-desktop-modal-overlay" style="display: none;">
    <div class="nativa-desktop-modal-dialog">
        <div class="nativa-desktop-modal-header">
            <h3 id="nativa-desktop-legal-title"></h3>
            <button id="nativa-desktop-legal-close" class="nativa-desktop-modal-close">&times;</button>
        </div>
        <div id="nativa-desktop-legal-content" class="nativa-desktop-modal-body">
            </div>
    </div>
</div>
<script src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
<script>
    document.addEventListener('DOMContentLoaded', function() {
        // A lógica de mostrar/esconder agora é controlada puramente por CSS.
        // O script agora só precisa gerar o QR Code se estiver em um dispositivo não-móvel.
        const isMobile = window.matchMedia("(max-width: 768px)").matches;

        // --- INÍCIO DA MODIFICAÇÃO (REQUISITOS 2 e 3: LÓGICA DO MODAL) ---

        /**
         * Exibe o modal legal no desktop.
         * @param {string} contentId 'privacy' ou 'terms'.
         */
        function showDesktopLegalModal(contentId) {
            const modal = document.getElementById('nativa-desktop-legal-modal');
            const titleEl = document.getElementById('nativa-desktop-legal-title');
            const contentEl = document.getElementById('nativa-desktop-legal-content');
            
            // Busca o conteúdo fonte (que está na #legal-section)
            // IMPORTANTE: Este conteúdo é carregado mais abaixo no app-container.
            const sourceContentEl = document.getElementById(`legal-content-${contentId}`);
            
            if (!modal || !titleEl || !contentEl || !sourceContentEl) {
                console.error('[Nativa Desktop] Elementos do modal legal ou conteúdo de origem não encontrados.', { modal, titleEl, contentEl, sourceContentEl });
                // Se não encontrar (ex: app não carregou), tenta carregar um fallback
                if(contentEl) contentEl.innerHTML = '<p>Não foi possível carregar o conteúdo. Por favor, tente novamente em um dispositivo móvel.</p>';
                if(titleEl) titleEl.textContent = 'Erro';
                if(modal) modal.style.display = 'flex';
                return;
            }

            // Popula o modal
            titleEl.textContent = contentId === 'privacy' ? 'Política de Privacidade' : 'Termos de Serviço';
            contentEl.innerHTML = sourceContentEl.innerHTML; // Copia o HTML do conteúdo fonte
            
            // Exibe o modal
            modal.style.display = 'flex';
        }

        /**
         * Fecha o modal legal no desktop.
         */
        function closeDesktopLegalModal() {
            const modal = document.getElementById('nativa-desktop-legal-modal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        // Adiciona listeners para os links no rodapé do QR Code
        document.querySelectorAll('.nativa-desktop-legal-link').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault(); // Impede a navegação
                const contentId = e.target.dataset.contentId;
                if (contentId) {
                    showDesktopLegalModal(contentId);
                }
            });
        });

        // Adiciona listeners para fechar o modal
        const modalCloseBtn = document.getElementById('nativa-desktop-legal-close');
        const modalOverlay = document.getElementById('nativa-desktop-legal-modal');
        if (modalCloseBtn) {
            modalCloseBtn.addEventListener('click', closeDesktopLegalModal);
        }
        if (modalOverlay) {
            modalOverlay.addEventListener('click', function(e) {
                if (e.target === modalOverlay) { // Só fecha se clicar no fundo
                    closeDesktopLegalModal();
                }
            });
        }

        // --- FIM DA MODIFICAÇÃO ---

        if (!isMobile) {
            // Atraso para garantir que a biblioteca QRCode.js seja carregada.
            setTimeout(function() {
                if (typeof QRCode !== 'undefined') {
                    new QRCode(document.getElementById("nativa-qrcode-container"), {
                        text: window.location.origin,
                        width: 150,
                        height: 150,
                        colorDark : "#000000",
                        colorLight : "#ffffff",
                        correctLevel : QRCode.CorrectLevel.H
                    });
                } else {
                    console.error('Biblioteca QRCode.js não carregou a tempo.');
                }
            }, 100);

            // --- INÍCIO DA MODIFICAÇÃO (REQUISITO 3: VERIFICA URL) ---
            // Se não for mobile, verifica se a URL é de privacidade ou termos
            const currentPath = window.location.pathname.replace(/\/$/, '');
            if (currentPath === '/privacidade') {
                // Atraso para garantir que o DOM (incluindo o conteúdo legal) esteja pronto
                setTimeout(() => showDesktopLegalModal('privacy'), 500);
            } else if (currentPath === '/termos') {
                setTimeout(() => showDesktopLegalModal('terms'), 500);
            }
            // --- FIM DA MODIFICAÇÃO ---
        }
    });
</script>
<div id="nativa-app-container">

    <div id="nativa-app-loader" class="nativa-app-loader is-visible">
        <span class="nativa-loader-logo">
            <?php
                // Define o caminho para o arquivo SVG relativo à raiz do plugin
                $logo_svg_path = NATIVADELIVERY_PLUGIN_DIR . 'assets/images/logo.svg';

                // Verifica se o arquivo existe e o inclui, senão exibe um placeholder ou erro
                if ( file_exists( $logo_svg_path ) ) {
                    echo file_get_contents( $logo_svg_path );
                } else {
                    // Opcional: Exibir um texto ou imagem de fallback se o SVG não for encontrado
                    echo '';
                    // Ou: echo '<img src="' . esc_url( NATIVADELIVERY_PLUGIN_URL . 'assets/images/placeholder-logo.png' ) . '" alt="Logo">';
                }
            ?>
        </span>
    </div>

    <section id="cardapio-section" class="nativa-page-section" style="display: none;">
        <?php
            $cardapio_page_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-cardapio-page.php';
            if ( file_exists( $cardapio_page_path ) ) {
                include_once $cardapio_page_path;
            }
        ?>
    </section>

    <section id="checkout-section" class="nativa-page-section" style="display: none;">
        <div id="nativa-checkout-page" class="nativa-checkout-wrapper">
            <div id="nativa-checkout-main-content">
                <div id="nativa-checkout-modality-section" class="nativa-checkout-section nativa-modality-selection-section nativa-fade-in-up">
                    <div id="nativa-checkout-modality-options" class="nativa-modality-options-cart">
                        <button class="nativa-order-button" data-modality="delivery">
                            <span class="material-symbols-rounded">moped</span>
                            Entrega
                        </button>
                        <button class="nativa-order-button" data-modality="pickup">
                            <span class="material-symbols-rounded">storefront</span>
                            Retirada
                        </button>
                        <button class="nativa-order-button" data-modality="table">
                            <span class="material-symbols-rounded">restaurant</span>
                            Na Mesa
                        </button>
                    </div>
                    <div id="nativa-checkout-store-closed-message" style="display: none;" class="nativa-store-closed-message">
                        <p><strong>Loja Fechada</strong></p>
                        <p>Desculpe, estamos fechados no momento para o serviço selecionado. Por favor, verifique nossos horários ou escolha outra modalidade.</p>
                    </div>
                </div>

                <div class="nativa-checkout-section nativa-fade-in-up">
                    <h3>Revise seu pedido</h3>
                    <div id="nativa-checkout-order-summary" class="nativa-order-summary-container">
                        <p>Carregando seu pedido...</p>
                    </div>
                </div>

                <div class="nativa-customer-details nativa-fade-in-up">
                    <form id="nativa-checkout-form" novalidate>
                        
                        <div class="nativa-personal-data-section">
                            <h2>Endereço de entrega</h2>
                            
                            <div id="nativa-delivery-address-block" style="display: none;">
                                <div id="nativa-checkout-address-cards-container">
                                    </div>
                                <button type="button" id="nativa-checkout-address-action-btn" class="nativa-button-secondary">
                                    <span class="material-symbols-rounded">add_location_alt</span>
                                    <span id="nativa-checkout-address-action-btn-text">Adicionar endereço</span>
                                </button>
                            </div>
                        </div>
                        <div class="nativa-coupon-section">
                            <h2>Cupom de desconto</h2>
                            <div class="nativa-form-group nativa-coupon-input-group has-validation-icon">
                                <input type="text" id="nativa-coupon-code" name="nativa-coupon-code" placeholder="Insira seu cupom">
                                <button type="button" id="nativa-apply-coupon-button" class="nativa-apply-coupon-button">Aplicar</button>
                                <span class="material-symbols-rounded validation-icon"></span>
                            </div>
                            <div id="nativa-coupon-message" class="nativa-coupon-message"></div>
                        </div>

                        <div class="nativa-checkout-cart-summary">
                            <h2>Resumo financeiro</h2>
                            <div class="nativa-checkout-subtotal-summary">
                                <span>Subtotal</span>
                                <span id="nativa-checkout-subtotal">R$ 0,00</span>
                            </div>
                            <div id="nativa-checkout-delivery-fee-row" class="nativa-checkout-fee-row" style="display:flex;"> <span>Taxa de Entrega</span>
                                <span id="nativa-checkout-delivery-fee">R$ 0,00</span>
                            </div>
                            <div id="nativa-checkout-discount-row" class="nativa-checkout-discount-row" style="display:flex;"> <span>Desconto</span>
                                <span id="nativa-checkout-discount">- R$ 0,00</span>
                            </div>
                            <div class="nativa-checkout-total-final">
                                <span>Total Final</span>
                                <span id="nativa-checkout-total">R$ 0,00</span>
                            </div>
                        </div>
                        
                        <div class="nativa-payment-method-section">
                            <h2>Método de pagamento</h2>
                            <div class="nativa-form-group has-validation-icon">
                                
                                <div id="nativa-payment-method-options" class="nativa-payment-options-grid">
                                    </div>
                                <input type="hidden" id="nativa-payment-method" name="nativa-payment-method" value="" required>
                                <span class="material-symbols-rounded validation-icon"></span>
                            </div>

                            <div id="nativa-payment-info-card" class="nativa-info-card" style="display: none;">
                                <?php // Conteúdo dinâmico via JS ?>
                            </div>
                            
                            <div id="nativa-troco-field" class="nativa-form-group" style="display:none;">
                                <div class="nativa-troco-control-wrapper">
                                     <div class="nativa-toggle-switch">
                                        <div class="nativa-toggle-control">
                                            <input type="checkbox" id="nativa-needs-troco-toggle" name="nativa-needs-troco" checked>
                                            <label for="nativa-needs-troco-toggle" class="nativa-toggle-ui"></label>
                                        </div>
                                        <label for="nativa-needs-troco-toggle" class="nativa-toggle-label">Preciso de troco para:</label>
                                    </div>
                                    <div class="nativa-troco-input-wrapper">
                                        <input type="number" id="nativa-troco-para" name="nativa-troco-para" placeholder="R$ 0,00" min="0" step="0.01">
                                    </div>
                                </div>
                            </div>
                            </div>

                        <button type="submit" id="nativa-confirm-order-button" class="nativa-confirm-order-button">Confirmar pedido</button>
                    </form>
                </div>
            </div>
        </div>
    </section>

    <section id="home-section" class="nativa-page-section" style="display: none;">
        <?php
            $home_page_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-home-page.php';
            if ( file_exists( $home_page_path ) ) {
                include_once $home_page_path;
            }
        ?>
    </section>

    <section id="my-account-section" class="nativa-page-section" style="display: none;">
        
        <?php if ( is_user_logged_in() ) : ?>
            
            <div id="my-account-logged-in-view">
                <?php
                include_once NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-my-account-page.php';
                ?>
            </div>

        <?php else : ?>

            <div id="my-account-logged-out-view">
                <?php
                $must_login_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-must-login-page.php';
                if ( file_exists( $must_login_path ) ) {
                    include_once $must_login_path;
                }
                ?>
            </div>

        <?php endif; ?>

    </section>
    
    <section id="my-addresses-section" class="nativa-page-section" style="display: none;">
        <?php
            if ( class_exists('ND_Main') && ND_Main::is_customer_logged_in() ) {
                include_once NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-my-addresses-page.php';
            }
        ?>
    </section>
    
    <section id="fidelidade-section" class="nativa-page-section" style="display: none;">
        <?php
            // --- INÍCIO DA MODIFICAÇÃO ---
            echo '<div class="nativa-page-container">'; // Abre um container para estilização

            $fidelidade_page_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-loyalty-rules-sheet.php';
            if ( file_exists( $fidelidade_page_path ) ) {
                include $fidelidade_page_path;
            } else {
                echo '<h1>Programa de Fidelidade</h1><p>Conteúdo em breve.</p>';
            }

            // Adiciona os botões condicionalmente
            echo '<div class="nativa-loyalty-actions" style="margin-top: 24px; display: flex; justify-content: center;">';
            if ( is_user_logged_in() ) {
                // Botão "Ver cardápio" para usuários logados
                echo '<a href="/cardapio" class="nativa-button-primary" data-route="/cardapio" style="text-decoration: none; gap: 8px;">';
                echo '<span class="material-symbols-rounded">restaurant_menu</span>';
                echo '<span>Ver cardápio</span>';
                echo '</a>';
            } else {
                // Botão "Entrar" para usuários deslogados
                echo '<button class="nativa-button-primary trigger-login-prompt-btn" style="gap: 8px;">';
                echo '<span class="material-symbols-rounded">login</span>';
                echo '<span>Entrar</span>';
                echo '</button>';
            }
            echo '</div>'; // Fecha a div de ações

            echo '</div>'; // Fecha o container da página
            // --- FIM DA MODIFICAÇÃO ---
        ?>
    </section>

    <section id="legal-section" class="nativa-page-section nativa-page-container" style="display: none;">
        <?php
            // Carrega o conteúdo que será exibido em /privacidade e /termos
            // Oculto por padrão e gerenciado pelo router.js
            // Também serve como fonte para a ficha (sheet) aberta em /minha-conta
            $legal_content_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/sheets/nativa-legal-content.php';
            if ( file_exists( $legal_content_path ) ) {
                include_once $legal_content_path;
            }
        ?>
    </section>
    <?php
        $bottom_sheets_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-bottom-sheets.php';
        if ( file_exists( $bottom_sheets_path ) ) {
            include_once $bottom_sheets_path;
        }

        $bottom_navbar_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/templates/nativa-bottom-navbar.php';
        if ( file_exists( $bottom_navbar_path ) ) {
            include_once $bottom_navbar_path;
        }
    ?>
</div>