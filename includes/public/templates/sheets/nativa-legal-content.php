<?php
/**
 * Template para o conteúdo provisório da Política de Privacidade e Termos e Condições de Serviço.
 * Este conteúdo será exibido na ficha de conteúdo legal.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/public/templates
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>

<div id="legal-content-privacy" class="legal-content-source" style="display: none;">
    <div class="legal-sheet-content">
    <h4>Política de Privacidade</h4>
        <p><strong>Última atualização:</strong> 05/11/2025</p>
        <p>Bem-vindo ao serviço de delivery da Pastelaria Nativa. Esta Política de Privacidade explica como coletamos, usamos, compartilhamos e protegemos suas informações pessoais quando você utiliza nosso aplicativo web.</p>
        <h5>1. Informações que Coletamos</h5>
        <p>Coletamos informações para operar nosso serviço de pedidos e entrega:</p>
        <p><strong>A. Informações Fornecidas Diretamente por Você:</strong></p>
        <ul>
            <li><strong>Dados de Cadastro e Pedido:</strong> Nome completo, CPF, número de telefone (WhatsApp) e Data de Nascimento.</li>
            <li><strong>Endereços de Entrega:</strong> Endereço completo (Rua, número, complemento, bairro) e um "apelido" para o endereço.</li>
            <li><strong>Dados de Pagamento:</strong> O método de pagamento selecionado (ex: Dinheiro, PIX). Não armazenamos dados sensíveis de cartão de crédito; pagamentos (se aplicável) são processados por gateways ou na entrega.</li>
        </ul>
        <p><strong>B. Informações Coletadas de Serviços de Terceiros (Google):</strong></p>
        <p>Para facilitar seu login, usamos o serviço de Autenticação do Google (OAuth). Ao optar por esta modalidade, recebemos do Google as seguintes informações do seu perfil:</p>
        <ul>
            <li>Nome Completo</li>
            <li>Endereço de E-mail</li>
            <li>URL da Foto do Perfil</li>
        </ul>
        <p><strong>C. Informações Coletadas Automaticamente:</strong></p>
        <ul>
            <li><strong>Geolocalização:</strong> Caso você nos dê permissão, coletamos sua latitude e longitude (<code>navigator.geolocation</code>) para auxiliar no preenchimento e na precisão do seu endereço de entrega.</li>
            <li><strong>Inscrição para Notificações Push:</strong> Caso você nos dê permissão, armazenamos seu token de inscrição (<code>PushSubscription</code>) para enviar atualizações sobre o status dos seus pedidos.</li>
            <li><strong>Cookies e Armazenamento Local:</strong> Usamos <code>localStorage</code> e <code>sessionStorage</code> para armazenar preferências locais (ex: se você já viu o banner de boas-vindas, sua modalidade de entrega preferida).</li>
        </ul>
        <h5>2. Como Usamos Suas Informações</h5>
        <p>Usamos suas informações para:</p>
        <ul>
            <li>Processar e entregar seus pedidos.</li>
            <li>Criar e gerenciar sua conta de usuário.</li>
            <li>Confirmar sua identidade (inclusive para fins fiscais, usando o CPF).</li>
            <li>Enviar atualizações sobre o status do seu pedido (via WhatsApp e/ou Notificações Push).</li>
            <li>Personalizar sua experiência (ex: salvar seus "Favoritos").</li>
            <li>Facilitar o preenchimento de endereços (usando a geolocalização).</li>
            <li>Comunicar sobre promoções ou alterações no serviço (se consentido).</li>
        </ul>
        <h5>3. Conformidade com a Política de Dados do Usuário dos Serviços de API do Google</h5>
        <p>Esta seção aborda especificamente os dados recebidos do Google OAuth, conforme exigido para a verificação do Google Cloud (Projeto ID: <code>optimal-sylph-389520</code>).</p>
        <p>O uso e a transferência de informações recebidas das APIs do Google para qualquer outro aplicativo aderirão à <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer">Política de Dados do Usuário dos Serviços de API do Google</a>, incluindo os requisitos de <strong>Uso Limitado</strong>.</p>
        <p><strong>Uso Limitado:</strong> Os dados do seu perfil Google (Nome, E-mail, Foto) são usados <strong>exclusivamente</strong> para:</p>
        <ol>
            <li>Autenticar sua identidade e permitir o login no aplicativo.</li>
            <li>Criar e pré-preencher seu perfil de usuário dentro do nosso aplicativo.</li>
        </ol>
        <p><strong>Não usamos os dados do Google</strong> para veiculação de publicidade, remarketing ou qualquer finalidade não relacionada à funcionalidade principal do aplicativo.</p>
        <p><strong>Não transferimos</strong> os dados do seu perfil Google a terceiros, exceto quando necessário para cumprir as leis aplicáveis ou como parte de uma fusão, aquisição ou venda de ativos, com o devido aviso prévio.</p>
        <h5>4. Compartilhamento de Informações</h5>
        <p>Não vendemos suas informações pessoais. Podemos compartilhar informações com:</p>
        <ul>
            <li><strong>Entregadores:</strong> Seu nome, endereço e telefone para que possam realizar a entrega.</li>
            <li><strong>Gateways de Pagamento:</strong> Informações necessárias para processar pagamentos (ex: status de PIX).</li>
            <li><strong>Obrigação Legal:</strong> Se exigido por lei ou para proteger nossos direitos.</li>
        </ul>
        <h5>5. Seus Direitos</h5>
        <p>Você pode acessar, revisar e atualizar suas informações de perfil (como endereços e telefone) a qualquer momento através da seção "/minha-conta" do aplicativo.</p>
        <h5>6. Contato</h5>
        <p>Se você tiver dúvidas sobre esta Política de Privacidade, entre em contato conosco em: <a href="mailto:pastelarianativa.bbs@gmail.com">pastelarianativa.bbs@gmail.com.</a></p>
    </div>
    </div>

<div id="legal-content-terms" class="legal-content-source" style="display: none;">
    <div class="legal-sheet-content">
    <h4>Termos e Condições de Uso</h4>
        <p><strong>Última atualização:</strong> 05/11/2025</p>
        <p>Ao acessar e usar o serviço de delivery da Pastelaria Nativa (o "Serviço"), você concorda em cumprir estes Termos e Condições ("Termos").</p>
        <h5>1. Contas de Usuário</h5>
        <ul>
            <li>Você pode criar uma conta usando o serviço de autenticação do Google. Você é responsável por manter a segurança de sua conta Google.</li>
            <li>Você concorda em fornecer informações verdadeiras, precisas e completas durante o cadastro (Onboarding) e checkout, incluindo seu nome completo, CPF válido, telefone e endereço.</li>
        </ul>
        <h5>2. Pedidos e Pagamentos</h5>
        <ul>
            <li>Ao finalizar um pedido, você concorda em pagar o valor total indicado.</li>
            <li>Os métodos de pagamento estão listados no checkout.</li>
            <li><strong>Pagamentos PIX:</strong> Pedidos com pagamento via PIX (automático ou manual) podem ter um tempo limite para pagamento, conforme indicado. O não pagamento dentro do prazo pode resultar no cancelamento automático do pedido.</li>
        </ul>
        <h5>3. Funcionamento do Serviço</h5>
        <ul>
            <li>Nosso serviço opera em horários específicos, exibidos no aplicativo. Reservamo-nos o direito de recusar o serviço ou cancelar pedidos a nosso critério (ex: fora da área de entrega, suspeita de fraude).</li>
            <li>Todos os itens do cardápio estão sujeitos à disponibilidade.</li>
        </ul>
        <h5>4. Comunicações (Notificações Push e WhatsApp)</h5>
        <ul>
            <li>Ao fornecer seu número de WhatsApp, você consente em receber mensagens transacionais sobre o status do seu pedido.</li>
            <li>Ao habilitar as Notificações Push, você consente em receber alertas transacionais sobre o status do seu pedido em seu dispositivo.</li>
        </ul>
        <h5>5. Uso da Geolocalização</h5>
        <p>O Serviço pode solicitar acesso à sua localização (<code>geolocation</code>) para sugerir ou validar endereços de entrega. Esta funcionalidade é opcional, mas sua recusa pode afetar a precisão da entrega.</p>
        <h5>6. Limitação de Responsabilidade</h5>
        <p>A Pastelaria Nativa não se responsabiliza por falhas na entrega ou no serviço causadas por informações incorretas fornecidas pelo usuário (endereço errado, telefone incorreto) ou por eventos de força maior.</p>
        <h5>7. Modificações nos Termos</h5>
        <p>Podemos revisar estes Termos a qualquer momento. A versão mais recente estará sempre disponível no aplicativo.</p>
        <h5>8. Lei Aplicável</h5>
        <p>Estes Termos serão regidos pelas leis da República Federativa do Brasil.</p>
    </div>
    </div>