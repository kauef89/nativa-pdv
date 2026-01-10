<?php
/**
* Gerenciador e Carregador dos Handlers AJAX.
*
* VERSÃO INICIAL (REFATORAÇÃO):
* - Renomeado de ND_Ajax_Handler para ND_Ajax_Manager para melhor refletir sua
* responsabilidade de carregar e instanciar todos os handlers AJAX especializados.
* - Adiciona o carregamento do novo ND_Payment_Ajax_Handler.
* VERSÃO ATUALIZADA: Registra o novo ND_Favorites_Ajax_Handler.
 * VERSÃO CORRIGIDA (FINAL): Corrige o método de inicialização dos handlers, usando
 * a chamada estática 'register_hooks' ou a instanciação via 'new' conforme a necessidade de cada classe.
*/

if ( ! defined( 'ABSPATH' ) ) {
  exit;
}

class ND_Ajax_Manager {

  public function __construct() {
    $handler_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/public/ajax-handlers/';
    $admin_handler_path = NATIVADELIVERY_PLUGIN_DIR . 'includes/admin/ajax-handlers/';

    // Carrega todos os handlers AJAX públicos
    require_once $handler_path . 'class-nd-data-ajax-handler.php';
    require_once $handler_path . 'class-nd-cart-ajax-handler.php';
    require_once $handler_path . 'class-nd-coupon-ajax-handler.php';
    require_once $handler_path . 'class-nd-order-ajax-handler.php';
    require_once $handler_path . 'class-nd-profile-ajax-handler.php';
    require_once $handler_path . 'class-nd-address-ajax-handler.php';
    require_once $handler_path . 'class-nd-loyalty-ajax-handler.php';
    require_once $handler_path . 'class-nd-payment-ajax-handler.php';
    require_once $handler_path . 'class-nd-favorites-ajax-handler.php';
   
    // Carrega handlers da área administrativa
    require_once $admin_handler_path . 'class-nd-csv-importer-ajax-handler.php';
    // --- INÍCIO DA MODIFICAÇÃO ---
    require_once $admin_handler_path . 'class-nd-push-admin-ajax-handler.php';
    // --- FIM DA MODIFICAÇÃO ---
   
    // --- INÍCIO DA CORREÇÃO (REGISTRO DE HOOKS) ---
    // Instancia as classes que registram hooks em seus construtores.
    new ND_Data_Ajax_Handler();
    new ND_Cart_Ajax_Handler();
    new ND_Coupon_Ajax_Handler();
    new ND_Order_Ajax_Handler();
        new ND_Loyalty_Ajax_Handler();
        new ND_Payment_Ajax_Handler();
        new ND_Favorites_Ajax_Handler();
    new ND_CSV_Importer_Ajax_Handler();

    // Chama o método estático para as classes que usam este padrão.
    ND_Profile_Ajax_Handler::register_hooks();
    ND_Address_Ajax_Handler::register_hooks();
    // --- INÍCIO DA MODIFICAÇÃO ---
    ND_Push_Admin_Ajax_Handler::register_hooks();
    // --- FIM DA MODIFICAÇÃO ---
    // --- FIM DA CORREÇÃO ---
  }
}