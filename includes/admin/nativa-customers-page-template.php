<?php
/**
 * Template para a página de visualização de Clientes no painel de administração.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/templates
 * ATUALIZADO: Move as informações de contato e endereço para o cabeçalho do card.
 * ATUALIZADO: Adiciona indicador visual para endereços com geolocalização salva.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}
?>
<style>
.address-tag.has-location {
    background-color: rgba(91, 192, 190, 0.2); /* Cor --md-sys-color-primary com transparência */
    border-color: rgba(91, 192, 190, 0.5);
}
.address-tag.has-location .material-symbols-outlined {
    /* Opcional: Mudar cor do ícone interno se necessário */
     /* color: var(--md-sys-color-primary); */
}
</style>
<div class="wrap nativa-customers-page">
    <h1><span class="material-symbols-outlined">group</span> Clientes Cadastrados</h1>
    <p>Visualize os dados dos seus clientes e o histórico de pedidos de cada um.</p>

    <?php
    $args = array(
        'role'    => 'subscriber',
        'orderby' => 'user_nicename',
        'order'   => 'ASC'
    );
    $customers = get_users( $args );

    if ( ! empty( $customers ) ) :
    ?>
        <div class="nativa-customers-list">
            <?php foreach ( $customers as $customer ) : ?>
                <?php
                    $phone = get_user_meta( $customer->ID, 'nativa_user_phone', true );
                    $addresses = get_user_meta( $customer->ID, 'nativa_user_addresses', true );
                    $whatsapp_number = preg_replace( '/\D/', '', $phone );
                ?>
                <div class="nativa-customer-card">
                    <div class="customer-card-header">
                        <div class="customer-avatar">
                            <?php echo get_avatar( $customer->ID, 80 ); ?>
                        </div>
                        <div class="customer-header-info">
                            <div class="customer-info">
                                <h2 class="customer-name"><?php echo esc_html( $customer->display_name ); ?></h2>
                                <p class="customer-email">
                                    <a href="mailto:<?php echo esc_attr( $customer->user_email ); ?>"><?php echo esc_html( $customer->user_email ); ?></a>
                                </p>
                                <p class="customer-since">
                                    Cliente desde: <?php echo esc_html( date_i18n( 'd/m/Y', strtotime( $customer->user_registered ) ) ); ?>
                                </p>
                            </div>
                            <div class="customer-additional-data">
                                <div class="data-grid">
                                    <?php if ( ! empty( $phone ) ) : ?>
                                        <div class="data-item">
                                            <span class="data-label"><span class="material-symbols-outlined">call</span> WhatsApp</span>
                                            <span class="data-value">
                                                <a href="https://wa.me/55<?php echo esc_attr( $whatsapp_number ); ?>" target="_blank" rel="noopener noreferrer" class="action-link">
                                                    <?php echo esc_html( $phone ); ?>
                                                </a>
                                            </span>
                                        </div>
                                    <?php endif; ?>

                                    <?php if ( ! empty( $addresses ) && is_array( $addresses ) ) : ?>
                                        <div class="data-item">
                                            <span class="data-label"><span class="material-symbols-outlined">home</span> Endereços</span>
                                            <div class="address-list">
                                                <?php foreach ( $addresses as $address ) : ?>
                                                    <?php
                                                        // --- INÍCIO DA MODIFICAÇÃO: Verifica coordenadas e adiciona classe ---
                                                        $has_location = ! empty( $address['latitude'] ) && ! empty( $address['longitude'] );
                                                        $location_class = $has_location ? 'has-location' : '';
                                                        // --- FIM DA MODIFICAÇÃO ---

                                                        $gmaps_url = 'https://www.google.com/maps/search/?api=1&query=';
                                                        if ( $has_location ) { // Prioriza coordenadas
                                                            $gmaps_url .= esc_attr( $address['latitude'] . ',' . $address['longitude'] );
                                                        } else {
                                                            $full_address = implode( ', ', array_filter( [ urldecode($address['street'] ?? ''), $address['number'] ?? '', $address['bairro'] ?? '' ] ) );
                                                            $gmaps_url .= urlencode( $full_address . ', Balneário Barra do Sul, SC' );
                                                        }
                                                    ?>
                                                    <a href="<?php echo esc_url( $gmaps_url ); ?>" class="address-tag <?php echo $location_class; // Adiciona a classe aqui ?>" target="_blank" rel="noopener noreferrer">
                                                        <?php echo esc_html( $address['apelido'] ?? 'Endereço' ); ?>
                                                        <span class="material-symbols-outlined">open_in_new</span>
                                                    </a>
                                                <?php endforeach; ?>
                                            </div>
                                        </div>
                                    <?php endif; ?>
                                </div>
                            </div>
                            </div>
                    </div>

                    <div class="customer-card-body">
                        <h3>Histórico de Pedidos</h3>
                        <?php
                        $order_args = array(
                            'post_type'      => 'nativa_pedido',
                            'posts_per_page' => 5,
                            'post_status'    => 'publish',
                            'orderby'        => 'date',
                            'order'          => 'DESC',
                            'meta_query'     => array(
                                array(
                                    'key'     => '_customer_user',
                                    'value'   => $customer->ID,
                                    'compare' => '=',
                                ),
                            ),
                        );
                        $customer_orders = new WP_Query( $order_args );

                        if ( $customer_orders->have_posts() ) :
                        ?>
                            <table class="wp-list-table widefat striped">
                                <thead>
                                    <tr>
                                        <th scope="col">ID</th>
                                        <th scope="col">Data</th>
                                        <th scope="col">Valor</th>
                                        <th scope="col">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <?php while ( $customer_orders->have_posts() ) : $customer_orders->the_post(); ?>
                                        <?php
                                            $order_id = get_the_ID();
                                            $total = get_field( 'pedido_total_final', $order_id );
                                            $status_terms = get_the_terms( $order_id, 'nativa_order_status' );
                                            $status_name = ( ! empty( $status_terms ) && ! is_wp_error( $status_terms ) ) ? $status_terms[0]->name : 'N/A';
                                        ?>
                                        <tr>
                                            <td><strong><a href="<?php echo esc_url( get_edit_post_link( $order_id ) ); ?>">#<?php echo esc_html( $order_id ); ?></a></strong></td>
                                            <td><?php echo get_the_date( 'd/m/y H:i', $order_id ); ?></td>
                                            <td>R$ <?php echo esc_html( number_format( (float) $total, 2, ',', '.' ) ); ?></td>
                                            <td><?php echo esc_html( $status_name ); ?></td>
                                        </tr>
                                    <?php endwhile; ?>
                                </tbody>
                            </table>
                        <?php
                        else :
                            echo '<p>Nenhum pedido encontrado para este cliente.</p>';
                        endif;
                        wp_reset_postdata();
                        ?>
                    </div>
                </div>
            <?php endforeach; ?>
        </div>
    <?php
    else :
        echo '<p>Nenhum cliente cadastrado encontrado.</p>';
    endif;
    ?>
</div>