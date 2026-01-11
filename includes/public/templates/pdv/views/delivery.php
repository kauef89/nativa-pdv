<?php
/**
 * Template Name: Nativa Pedidos Dashboard
 *
 * Este é o template customizado para a página de gerenciamento de pedidos.
 * Ele será selecionável no painel de administração do WordPress.
 */

// Lógica de Segurança: Restringe o acesso a administradores.
if ( ! current_user_can( 'manage_options' ) ) {
    wp_redirect( wp_login_url( get_permalink() ) );
    exit;
}
?>
<!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel de Pedidos - Nativa Delivery</title>
    <?php
    // A classe ND_Public agora gerencia o carregamento de todos os scripts e estilos.
    wp_head();
    ?>
</head>
<body class="nativa-pedidos-dashboard">

    <div id="pedidos-app">
        <header class="pedidos-header">
            <div class="header-content">
                <div class="header-logo">
                    <svg width="85" height="29" viewBox="0 0 85 29" fill="none" xmlns="http://www.w3.org/2000/svg">
                        {/* */}
                        <path d="M37.2311 25.8921C37.7783 25.8922 38.102 26.2554 38.1058 26.8003L37.8173 26.7963C37.8135 26.4192 37.6203 26.168 37.2301 26.168C36.8912 26.168 36.6797 26.3747 36.6797 26.6694C36.6797 27.021 36.9245 27.1339 37.2739 27.2325C37.7364 27.3708 38.2217 27.5121 38.2217 28.1291C38.2217 28.6408 37.8095 29 37.2337 29C36.6179 29 36.2277 28.5752 36.2239 27.9905L36.2249 27.9898H36.516C36.5199 28.4067 36.7788 28.7231 37.2337 28.7231C37.642 28.7231 37.9266 28.4731 37.9266 28.1244C37.9266 27.7141 37.588 27.6049 37.1797 27.493C36.7419 27.366 36.3923 27.1737 36.3922 26.6657C36.3922 26.2269 36.7351 25.8921 37.2311 25.8921Z" fill="white"/>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M47.0674 25.9101C47.7232 25.9101 48.1647 26.4002 48.1724 27.0096C48.1762 27.2854 48.1183 27.4855 47.8223 27.9138L47.1046 28.9487H46.7723L47.432 28.0048C47.3083 28.0484 47.1807 28.0741 47.0674 28.0741C46.404 28.0741 45.9634 27.6057 45.9634 27.0029C45.9635 26.4002 46.4116 25.9101 47.0674 25.9101ZM47.0674 26.2003C46.6049 26.2003 46.2546 26.5452 46.2546 27.0096C46.2546 27.474 46.6048 27.8152 47.0674 27.8152C47.531 27.8152 47.8803 27.4702 47.8803 27.0096C47.8802 26.549 47.53 26.2003 47.0674 26.2003Z" fill="white"/>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M49.7506 25.9101C50.4074 25.9101 50.8482 26.4002 50.855 27.0096H50.8559C50.8597 27.2854 50.8015 27.4854 50.5055 27.9138L49.7879 28.9487H49.4555L50.1152 28.0048C49.9915 28.0484 49.8639 28.0741 49.7506 28.0741C49.0872 28.0741 48.6457 27.6057 48.6457 27.0029C48.6457 26.4002 49.0939 25.9101 49.7506 25.9101ZM49.7516 26.2003C49.2891 26.2003 48.9388 26.5452 48.9388 27.0096C48.9388 27.474 49.289 27.8152 49.7516 27.8152C50.2142 27.8152 50.5645 27.4702 50.5645 27.0096C50.5644 26.549 50.2142 26.2003 49.7516 26.2003Z" fill="white"/>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M52.4348 25.9101C53.0906 25.9101 53.5325 26.4002 53.5401 27.0096H53.5392C53.543 27.2854 53.4848 27.4854 53.1887 27.9138L52.4711 28.9487H52.1397L52.7994 28.0048C52.6757 28.0484 52.5481 28.0741 52.4348 28.0741C51.7715 28.074 51.3309 27.6057 51.3309 27.0029C51.3309 26.4002 51.7791 25.9101 52.4348 25.9101ZM52.4348 26.2003C51.9723 26.2003 51.6221 26.5453 51.622 27.0096C51.622 27.474 51.9723 27.8152 52.4348 27.8152C52.8984 27.8152 53.2477 27.4702 53.2477 27.0096C53.2476 26.549 52.8974 26.2003 52.4348 26.2003Z" fill="white"/>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M32.0606 25.9531C33.1874 25.9531 33.6977 26.6353 33.6978 27.4484C33.6978 28.2615 33.1875 28.948 32.0606 28.948H31.612V25.9531H32.0606ZM31.9071 28.6542H32.0823C32.9609 28.6542 33.4027 28.1422 33.4027 27.4494C33.4027 26.7566 32.9618 26.2476 32.0823 26.2476H31.9071V28.6542Z" fill="white"/>
                        <path d="M35.8633 26.2439H34.5801V27.2675H35.7612V27.5357H34.5801V28.6645H35.8633V28.948H34.285V25.9604H35.8633V26.2439Z" fill="white"/>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M39.2213 25.9531C40.3473 25.9531 40.8585 26.6353 40.8585 27.4484C40.8585 28.2616 40.3483 28.948 39.2213 28.948H38.7731V25.9531H39.2213ZM39.0682 28.6542H39.2431C40.1216 28.6542 40.5634 28.1422 40.5634 27.4494C40.5634 26.7566 40.1225 26.2476 39.2431 26.2476H39.0682V28.6542Z" fill="white"/>
                        <path d="M43.024 26.2439H41.7408V27.2675H42.9222V27.5357H41.7408V28.6645H43.024V28.948H41.4457V25.9604H43.024V26.2439Z" fill="white"/>
                        <path d="M45.3769 25.9604V28.948H45.0857V26.2466L45.0847 26.2476L44.6184 26.2439L44.7096 25.9567L45.3769 25.9604Z" fill="white"/>
                        <path d="M80.9154 0C83.2548 0 84.9999 2.05686 85 4.36533V24.1902C84.9999 26.4989 83.2545 28.5555 80.9144 28.5555H80.9134L55.7768 28.5279L55.7791 26.4428L80.9144 26.4705H80.9154C81.9178 26.4699 82.9056 25.5356 82.9057 24.1902V4.36533C82.9056 3.01929 81.917 2.08504 80.9154 2.08504H4.08427C3.08274 2.08513 2.09407 3.01934 2.09401 4.36533V24.1626C2.09401 25.5083 3.08231 26.4423 4.08361 26.4428H4.08427L29.2209 26.4155L29.2232 28.5006L4.08559 28.5279H4.08427C1.74494 28.5278 6.99269e-07 26.471 0 24.1626V4.36533C6.12462e-05 2.05692 1.74498 8.19994e-05 4.08427 0H80.9154Z" fill="white"/>
                        <path d="M14.9433 15.2043V6.4447H18.8457V22.2728H15.0688L10.3742 13.4365V22.2728H6.47173V6.4447H10.3067L14.9433 15.2043Z" fill="white"/>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M35.3778 22.2728H31.4533L30.787 20.2823H24.555L23.8888 22.2728H19.868L25.662 6.4447H29.6797L35.3778 22.2728ZM25.608 17.2494H29.735L27.6713 11.0093L25.608 17.2494Z" fill="white"/>
                        <path d="M49.5909 22.2728H45.6881V6.4447H49.5909V22.2728Z" fill="white"/>
                        <path d="M57.8102 16.5037L60.8616 6.4447H64.9758L59.8765 22.2728H55.7046L50.5473 6.4447H54.6813L57.8102 16.5037Z" fill="white"/>
                        <path fill-rule="evenodd" clip-rule="evenodd" d="M78.5339 22.2728H74.6093L73.9431 20.2823H67.7114L67.0451 22.2728H63.0244L68.8184 6.4447H72.8361L78.5339 22.2728ZM68.763 17.2494H72.8905L70.8267 11.0093L68.763 17.2494Z" fill="white"/>
                        <path d="M44.2604 10.0464H41.0242V22.1778H37.1214V10.0464H33.9804V6.35008H44.2604V10.0464Z" fill="white"/>
                    </svg>
                </div>
                <div class="header-filters">
                    <div class="filter-group" id="date-filter-group">
                        <div class="nativa-toggle-button-group">
                            <button class="nativa-toggle-button is-active" data-filter="today">Hoje</button>
                            <button class="nativa-toggle-button" data-filter="all">Todos</button>
                        </div>
                    </div>
                    <div class="filter-group" id="status-filter-container"></div>
                    <div class="filter-group search-filter-group">
                        <input type="text" id="search-term" placeholder="Buscar...">
                    </div>
                </div>
                <div class="header-actions">
                    <button id="auto-refresh-toggle" class="header-button icon-only" title="Ativar Auto-Refresh">
                        <span class="material-symbols-rounded">sync</span>
                    </button>
                    </div>
            </div>
        </header>
        <main class="pedidos-main-content">
            <div id="pedidos-table-container">
                <div class="dashboard-loader">
                    <span class="material-symbols-rounded is-loading">hourglass_top</span>
                    <span>Carregando pedidos de hoje...</span>
                </div>
            </div>
        </main>
    </div>
    <audio id="nativa-notification-sound" preload="auto">
        <source src="<?php echo esc_url( NATIVADELIVERY_PLUGIN_URL . 'assets/sounds/notification.mp3' ); ?>" type="audio/mpeg">
    </audio>
    <?php wp_footer(); ?>
</body>
</html>