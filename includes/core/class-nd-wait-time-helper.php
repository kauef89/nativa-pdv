<?php
/**
 * NOVO ARQUIVO
 * Helper para calcular os tempos de espera estimados para os serviços.
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/core
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Wait_Time_Helper {

    /**
     * Calcula e retorna os tempos de espera estimados para cada modalidade de serviço.
     *
     * @return array Um array associativo com os tempos de espera formatados.
     */
    public static function calculate_wait_times() {
        $options = get_option('nativa_delivery_wait_times_options');

        // Pega as premissas do painel, com valores padrão de segurança
        $base_prep_time = isset($options['base_prep_time']) ? absint($options['base_prep_time']) : 15;
        $load_factor_per_order = isset($options['load_factor_per_order']) ? absint($options['load_factor_per_order']) : 5;
        $avg_driver_pickup_time = isset($options['avg_driver_pickup_time']) ? absint($options['avg_driver_pickup_time']) : 10;
        $avg_travel_time = isset($options['avg_travel_time']) ? absint($options['avg_travel_time']) : 15;

        // Conta quantos pedidos estão na fila de preparação (status 'recebido' ou 'aceito')
        $active_orders_query = new WP_Query([
            'post_type' => 'nativa_pedido',
            'post_status' => 'publish',
            'posts_per_page' => -1,
            'tax_query' => [
                [
                    'taxonomy' => 'nativa_order_status',
                    'field'    => 'slug',
                    'terms'    => ['recebido', 'aceito'],
                ],
            ],
            'fields' => 'ids', // Otimização: só precisamos da contagem
        ]);
        $active_orders_count = $active_orders_query->post_count;

        // 1. Calcula o tempo de cozinha
        $kitchen_wait_time = $base_prep_time + ($active_orders_count * $load_factor_per_order);

        // 2. Calcula o tempo para cada modalidade
        $pickup_time = $kitchen_wait_time;
        $table_time = $kitchen_wait_time; // Por padrão, igual ao de retirada
        $delivery_time = $kitchen_wait_time + $avg_driver_pickup_time + $avg_travel_time;

        // 3. Formata os tempos em intervalos para uma melhor experiência (ex: 25-35 min)
        $pickup_range = self::format_time_range($pickup_time);
        $table_range = self::format_time_range($table_time);
        $delivery_range = self::format_time_range($delivery_time);

        return [
            'pickup'   => $pickup_range,
            'table'    => $table_range,
            'delivery' => $delivery_range,
        ];
    }

    /**
     * Formata um tempo em minutos para um intervalo de 10 minutos.
     * Ex: 25 se torna "25-35 min".
     *
     * @param int $time_in_minutes O tempo base em minutos.
     * @return string O tempo formatado como um intervalo.
     */
    private static function format_time_range( $time_in_minutes ) {
        $lower_bound = 5 * floor($time_in_minutes / 5); // Arredonda para o múltiplo de 5 inferior
        $upper_bound = $lower_bound + 10;
        return "{$lower_bound}-{$upper_bound} min";
    }
}