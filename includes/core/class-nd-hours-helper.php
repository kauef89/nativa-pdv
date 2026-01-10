<?php
/**
 * Helper para gerenciar e verificar horários de funcionamento.
 * VERSÃO CORRIGIDA: Lógica de is_service_time_open refatorada para suportar corretamente horários que cruzam a meia-noite.
 * ATUALIZAÇÃO (DELIVERY OFF): Implementa a lógica para respeitar a flag 'disable_delivery_temp'.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class ND_Hours_Helper {

    /**
     * Agrupa o status de todos os serviços em um único array.
     * Respeita as flags de desenvolvimento "Aberta o tempo todo" e "Fechada o tempo todo".
     *
     * @return array Status de todos os serviços.
     */
    public static function get_all_service_status() {
        $options = get_option( 'nativa_delivery_hours_options' );

        // --- INÍCIO DA SONDAGEM DE DEPURAÇÃO ---
        error_log('[SONDA HORÁRIOS 1/4] Iniciando get_all_service_status()');
        
        $open_24_7_flag = ! empty( $options['open_24_7'] ) && $options['open_24_7'] === 'on';
        $closed_24_7_flag = ! empty( $options['closed_24_7'] ) && $options['closed_24_7'] === 'on';
        
        error_log('[SONDA HORÁRIOS 2/4] Status das Flags: open_24_7 = ' . ($open_24_7_flag ? 'ON' : 'OFF') . ', closed_24_7 = ' . ($closed_24_7_flag ? 'ON' : 'OFF'));
        // --- FIM DA SONDAGEM ---

        // --- INÍCIO DA MODIFICAÇÃO (ADMIN ALWAYS OPEN v2) ---
        // Verifica se o usuário está LOGADO E é um admin
        $is_admin = is_user_logged_in() && function_exists('current_user_can') && current_user_can('manage_options');
        
        error_log('[SONDA HORÁRIOS 3/4] Status do Usuário: is_user_logged_in() = ' . (is_user_logged_in() ? 'true' : 'false') . ', $is_admin = ' . ($is_admin ? 'true' : 'false')); // SONDA

        // Se a flag "Aberta 24/7" está ativa E o usuário é admin, retorna "aberto"
        if ( $open_24_7_flag && $is_admin ) {
            error_log('[SONDA HORÁRIOS 4/4] Lógica executada: Modo ADMIN 24/7 ATIVADO.'); // SONDA
            return [
                'is_store_open' => true,
                'delivery'      => true,
                'pickup'        => true,
                'table'         => true,
                'closing_time'  => 'Admin (24h)', // Informa que é o modo admin
                'next_opening'  => '',
            ];
        }
        // --- FIM DA MODIFICAÇÃO ---

        // A flag "Fechada 24/7" continua a aplicar-se a todos
        if ( $closed_24_7_flag ) {
            error_log('[SONDA HORÁRIOS 4/4] Lógica executada: Modo FECHADO 24/7 ATIVADO.'); // SONDA
            return [
                'is_store_open' => false,
                'delivery'      => false,
                'pickup'        => false,
                'table'         => false,
                'closing_time'  => '',
                'next_opening'  => 'Manutenção programada',
            ];
        }

        // --- INÍCIO DA CORREÇÃO (COMENTÁRIO) ---
        // Se nenhuma flag de forçar (aberto/fechado) se aplica, calcula o horário real.
        error_log('[SONDA HORÁRIOS 4/4] Lógica executada: Calculando horário REAL (nenhuma flag 24/7 aplicada).'); // SONDA
        $is_store_open = self::is_store_open();
        // --- FIM DA CORREÇÃO (COMENTÁRIO) ---

        return [
            'is_store_open' => $is_store_open,
            'delivery'      => self::is_service_time_open('delivery'),
            'pickup'        => self::is_service_time_open('pickup'),
            'table'         => self::is_service_time_open('table'),
            'closing_time'  => $is_store_open ? self::get_todays_closing_time_string() : '',
            'next_opening'  => !$is_store_open ? self::get_next_opening_time_string() : '',
        ];
    }

    /**
     * Verifica se a loja está aberta em geral (qualquer serviço).
     *
     * @return bool True se a loja estiver aberta, false caso contrário.
     */
    public static function is_store_open() {
        return self::is_service_time_open('store_hours');
    }

    /**
     * Verifica se um serviço específico está dentro do seu horário de funcionamento.
     *
     * @param string $service_key A chave do serviço (ex: 'delivery', 'pickup').
     * @return bool True se estiver no horário, false caso contrário.
     */
    public static function is_service_time_open( $service_key ) {
        // --- INÍCIO DA MODIFICAÇÃO (LÓGICA DE HORÁRIO REESCRITA) ---
        $options = get_option( 'nativa_delivery_hours_options' );

        // --- NOVA TRAVA DE DELIVERY (SEM MOTOBOY) ---
        // Se a opção "Desativar Apenas Delivery" estiver marcada, retorna false imediatamente para 'delivery'.
        if ( $service_key === 'delivery' && ! empty( $options['disable_delivery_temp'] ) && $options['disable_delivery_temp'] === 'on' ) {
            return false;
        }
        // --------------------------------------------

        $current_time_ts = current_time( 'timestamp' );

        // Função interna para criar timestamps na data correta
        $get_ts = function($day_modifier, $time_str) use ($current_time_ts) {
            return strtotime(date('Y-m-d', strtotime($day_modifier, $current_time_ts)) . ' ' . $time_str);
        };

        $today_key = strtolower( date( 'l', $current_time_ts ) );
        $yesterday_key = strtolower( date( 'l', strtotime( '-1 day', $current_time_ts ) ) );

        // 1. Verificar o horário de hoje
        if ( isset( $options[$today_key]['is_active'] ) && $options[$today_key]['is_active'] === 'on' ) {
            $open_str = $options[$today_key][$service_key]['open'] ?? '00:00';
            $close_str = $options[$today_key][$service_key]['close'] ?? '00:00';

            $open_ts = $get_ts('today', $open_str);
            
            // Verifica se o horário cruza a meia-noite
            if (strtotime($close_str) < strtotime($open_str)) {
                $close_ts = $get_ts('tomorrow', $close_str);
            } else {
                $close_ts = $get_ts('today', $close_str);
            }

            if ($current_time_ts >= $open_ts && $current_time_ts < $close_ts) {
                return true;
            }
        }

        // 2. Se não estiver no horário de hoje, verificar se estamos na janela "pós-meia-noite" do dia anterior
        if ( isset( $options[$yesterday_key]['is_active'] ) && $options[$yesterday_key]['is_active'] === 'on' ) {
            $yesterday_open_str = $options[$yesterday_key][$service_key]['open'] ?? '00:00';
            $yesterday_close_str = $options[$yesterday_key][$service_key]['close'] ?? '00:00';
            
            // Apenas procede se o horário de ontem cruzou a meia-noite
            if (strtotime($yesterday_close_str) < strtotime($yesterday_open_str)) {
                $start_of_today_ts = $get_ts('today', '00:00:00');
                $closing_from_yesterday_ts = $get_ts('today', $yesterday_close_str);

                if ($current_time_ts >= $start_of_today_ts && $current_time_ts < $closing_from_yesterday_ts) {
                    return true;
                }
            }
        }

        return false;
        // --- FIM DA MODIFICAÇÃO ---
    }

    /**
     * Retorna a string do horário de fechamento do dia atual.
     *
     * @return string Horário de fechamento formatado.
     */
    public static function get_todays_closing_time_string() {
        $options = get_option('nativa_delivery_hours_options');
        $current_time = current_time('timestamp');
        $day_of_week_key = strtolower(date('l', $current_time));

        if (isset($options[$day_of_week_key]['is_active']) && $options[$day_of_week_key]['is_active'] === 'on') {
            return $options[$day_of_week_key]['store_hours']['close'] ?? '00:00';
        }
        return '';
    }

    /**
     * Retorna a string do próximo horário de abertura da loja.
     *
     * @return string Descrição do próximo horário de abertura.
     */
    public static function get_next_opening_time_string() {
        $options = get_option('nativa_delivery_hours_options');
        if (empty($options)) return 'Fechada';

        $day_map = [ 1 => 'monday', 2 => 'tuesday', 3 => 'wednesday', 4 => 'thursday', 5 => 'friday', 6 => 'saturday', 7 => 'sunday' ];
        $day_name_map = [ 'monday' => 'na Segunda', 'tuesday' => 'na Terça', 'wednesday' => 'na Quarta', 'thursday' => 'na Quinta', 'friday' => 'na Sexta', 'saturday' => 'no Sábado', 'sunday' => 'no Domingo' ];
        
        $current_time = current_time('timestamp');
        $current_day_index = (int) date('N', $current_time);

        $today_key = $day_map[$current_day_index];
        if (isset($options[$today_key]['is_active']) && $options[$today_key]['is_active'] === 'on') {
            $open_time_str = $options[$today_key]['store_hours']['open'] ?? '00:00';
            $today_opening_timestamp = strtotime(date('Y-m-d', $current_time) . ' ' . $open_time_str);
            if ($today_opening_timestamp > $current_time) {
                return 'hoje às ' . date('H:i', $today_opening_timestamp);
            }
        }

        for ($i = 1; $i <= 7; $i++) {
            $check_timestamp = strtotime("+$i day", $current_time);
            $next_day_index = (int) date('N', $check_timestamp);
            $next_day_key = $day_map[$next_day_index];
            
            if (isset($options[$next_day_key]['is_active']) && $options[$next_day_key]['is_active'] === 'on') {
                $open_time_str = $options[$next_day_key]['store_hours']['open'] ?? '00:00';
                $day_prefix = ($i === 1) ? 'amanhã' : $day_name_map[$next_day_key];
                return $day_prefix . ' às ' . $open_time_str;
            }
        }

        return 'Fechada';
    }
}