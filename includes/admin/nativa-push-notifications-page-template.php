<?php
/**
 * Template para a página de administração de Notificações Push.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$total_subscriptions = 0;
$users_with_subscriptions = get_users( array(
    'meta_key'     => 'nativa_push_subscriptions',
    'meta_compare' => 'EXISTS',
    'fields'       => 'ID',
) );

foreach ( $users_with_subscriptions as $user_id ) {
    $subscriptions = get_user_meta( $user_id, 'nativa_push_subscriptions', true );
    if ( is_array( $subscriptions ) ) {
        $total_subscriptions += count( $subscriptions );
    }
}
?>

<div class="wrap">
    <h1><?php echo esc_html__( 'Notificações Push', 'nativa-delivery' ); ?></h1>
    <p><?php echo esc_html__( 'Gerencie o envio de notificações para seus clientes.', 'nativa-delivery' ); ?></p>

    <div id="poststuff">
        <div id="post-body" class="metabox-holder columns-2">

            <div id="post-body-content">
                <div class="meta-box-sortables ui-sortable">
                    <div class="postbox">
                        <h2 class="hndle"><span><?php echo esc_html__( 'Enviar Nova Notificação', 'nativa-delivery' ); ?></span></h2>
                        <div class="inside">
                            <form id="nativa-send-push-form" method="post">
                                <?php wp_nonce_field( 'nativa_send_push_notification', 'nativa_push_nonce' ); ?>
                                
                                <table class="form-table">
                                    <tr valign="top">
                                        <th scope="row"><label for="push-title">Título</label></th>
                                        <td>
                                            <input type="text" id="push-title" name="push_title" class="large-text" required maxlength="50">
                                        </td>
                                    </tr>
                                    <tr valign="top">
                                        <th scope="row"><label for="push-message">Mensagem</label></th>
                                        <td>
                                            <textarea id="push-message" name="push_message" rows="4" class="large-text" required maxlength="150"></textarea>
                                        </td>
                                    </tr>
                                    <tr valign="top">
                                        <th scope="row"><label for="push-url">URL de Destino</label></th>
                                        <td>
                                            <input type="url" id="push-url" name="push_url" class="large-text" placeholder="<?php echo esc_url( home_url( '/' ) ); ?>">
                                        </td>
                                    </tr>
                                </table>
                                
                                <div class="push-actions-row" style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-top: 15px;">
                                    <button type="submit" id="send-push-button" class="button button-primary">
                                        Enviar para TODOS
                                    </button>

                                    <button type="button" id="send-segment-push-button" class="button" style="border-color: #d63638; color: #d63638;">
                                        Enviar p/ quem NÃO comprou hoje
                                    </button>
                                    
                                    <button type="button" id="send-test-push-button" class="button button-secondary">
                                        Enviar Teste (Admin)
                                    </button>

                                    <span class="spinner" style="float: none; margin: 0;"></span>
                                </div>
                            </form>
                            <div id="push-status-feedback" style="display:none; margin-top: 10px;"></div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="postbox-container-1" class="postbox-container">
                <div class="meta-box-sortables">
                    <div class="postbox">
                        <h2 class="hndle"><span>Informações</span></h2>
                        <div class="inside">
                            <p><strong>Total de Inscrições Ativas:</strong> <?php echo esc_html( number_format_i18n( $total_subscriptions ) ); ?></p>
                            <hr>
                            <p>Use o botão <strong>"Enviar p/ quem NÃO comprou hoje"</strong> para enviar cupons e promoções sem incomodar quem já fez pedido.</p>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
        <br class="clear">
    </div>

    <h2>Histórico de Envios</h2>
    <?php
        $args = array(
            'post_type' => 'nativa_push_message',
            'posts_per_page' => 20,
            'orderby' => 'date',
            'order' => 'DESC',
        );
        $push_history_query = new WP_Query( $args );
    ?>
    <table class="wp-list-table widefat fixed striped posts">
        <thead>
            <tr>
                <th class="manage-column column-title">Título</th>
                <th class="manage-column">Tipo/Filtro</th>
                <th class="manage-column">Sucessos</th>
                <th class="manage-column">Cliques</th>
                <th class="manage-column column-date">Data</th>
            </tr>
        </thead>
        <tbody>
            <?php if ( $push_history_query->have_posts() ) : ?>
                <?php while ( $push_history_query->have_posts() ) : $push_history_query->the_post(); ?>
                    <tr>
                        <td class="title column-title">
                            <strong><?php the_title(); ?></strong><br>
                            <span><?php echo esc_html( get_the_content() ); ?></span>
                        </td>
                        <td>
                            <?php 
                                $filter = get_post_meta( get_the_ID(), '_push_filter_type', true );
                                if ( $filter === 'not_ordered_today' ) echo '<span style="color: #d63638;">Não compraram hoje</span>';
                                else echo 'Todos';
                            ?>
                        </td>
                        <td>
                            <?php 
                                $sent_count = get_post_meta( get_the_ID(), '_push_sent_count', true );
                                echo esc_html( $sent_count ? intval( $sent_count ) : '0' );
                                $errors = get_post_meta( get_the_ID(), '_push_error_log', true );
                                if ( ! empty( $errors ) && is_array( $errors ) ) {
                                    echo '<br><span style="color: #d63638; font-size: 11px;"><strong>Erros:</strong><br>';
                                    foreach ( $errors as $error_msg ) { echo esc_html( substr( $error_msg, 0, 50 ) ) . '...<br>'; }
                                    echo '</span>';
                                }
                            ?>
                        </td>
                        <td><?php echo esc_html( get_post_meta( get_the_ID(), '_push_open_count', true ) ?: '0' ); ?></td>
                        <td class="date column-date"><?php echo get_the_date(); ?></td>
                    </tr>
                <?php endwhile; ?>
                <?php wp_reset_postdata(); ?>
            <?php else : ?>
                <tr class="no-items"><td colspan="5">Nenhuma notificação enviada.</td></tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>