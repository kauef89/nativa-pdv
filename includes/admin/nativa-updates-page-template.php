<?php
/**
 * Template para a página de Atualizações em Massa (Importação/Exportação CSV).
 *
 * @package Nativa_Delivery
 * @subpackage Nativa_Delivery/includes/admin/templates
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Define os CPTs que podem ser importados/exportados
$cpts_info = [
    'nativa_produto' => [
        'label' => 'Produtos',
        'description' => 'Importe ou atualize produtos, preços, descrições e associações.',
        'importer' => true,
        'exporter' => true,
    ],
    'nativa_bairro' => [
        'label' => 'Bairros',
        'description' => 'Gerencie bairros e suas taxas de entrega.',
        'importer' => true,
        'exporter' => true,
    ],
    'nativa_rua' => [
        'label' => 'Ruas',
        'description' => 'Gerencie as ruas e sua associação com bairros.',
        'importer' => true,
        'exporter' => true,
    ],
    'nativa_adic_grupo' => [
        'label' => 'Grupos de Adicionais',
        'description' => 'Importe ou atualize grupos de adicionais e seus itens.',
        'importer' => true,
        'exporter' => true,
    ],
    'nativa_combo' => [
        'label' => 'Combos',
        'description' => 'Gerencie combos e seus passos de montagem.',
        'importer' => true,
        'exporter' => true, // ATUALIZADO: Habilitado
    ],
    'nativa_cupom' => [
        'label' => 'Cupons',
        'description' => 'Importe cupons de desconto em massa.',
        'importer' => true,
        'exporter' => true, // ATUALIZADO: Habilitado
    ],
     'nativa_oferta' => [
        'label' => 'Ofertas de Carrinho',
        'description' => 'Gerencie as ofertas de upsell exibidas no carrinho.',
        'importer' => true,
        'exporter' => true, // ATUALIZADO: Habilitado
    ],
    'nativa_loyalty' => [
        'label' => 'Tabela de Fidelidade',
        'description' => 'Importe a tabela de produtos e seus custos em pontos. Esta ação ADICIONA itens à tabela existente.',
        'importer' => true,
        'exporter' => true, // ATUALIZADO: Habilitado
    ],
];

?>
<div class="wrap nativa-updates-page">
    <h1><span class="dashicons dashicons-upload" style="font-size: 1.2em; margin-right: 8px;"></span>Atualizações em Massa (CSV)</h1>
    <p>Use esta página para importar ou exportar dados em massa. Escolha um tipo de conteúdo, prepare seu arquivo CSV seguindo o modelo e faça o upload.</p>

    <div class="nativa-importer-grid">
        <?php foreach ( $cpts_info as $slug => $info ) : ?>
            <div class="nativa-importer-card">
                <div class="importer-card-header">
                    <h2><?php echo esc_html( $info['label'] ); ?></h2>
                    <p><?php echo esc_html( $info['description'] ); ?></p>
                </div>
                <div class="importer-card-body">
                    <?php if ( $info['importer'] ) : ?>
                        <form class="nativa-csv-importer-form" method="post" enctype="multipart/form-data">
                            <input type="hidden" name="cpt_type" value="<?php echo esc_attr( $slug ); ?>">
                            <?php wp_nonce_field( 'nativa_delivery_csv_upload', 'nativa_csv_upload_nonce' ); ?>
                            
                            <div class="importer-form-field">
                                <label for="csv_file_<?php echo esc_attr( $slug ); ?>">Selecione o arquivo CSV para importar:</label>
                                <input type="file" name="csv_file" id="csv_file_<?php echo esc_attr( $slug ); ?>" accept=".csv, text/csv">
                            </div>

                            <button type="submit" class="button button-primary nativa-import-button">
                                <span class="dashicons dashicons-upload"></span> Importar <?php echo esc_html( $info['label'] ); ?>
                            </button>
                        </form>
                    <?php endif; ?>
                </div>
                <div class="importer-card-footer">
                     <?php if ( $info['exporter'] ) : ?>
                        <a href="<?php echo esc_url( add_query_arg( ['action' => 'nativa_export_csv', 'cpt' => $slug, 'type' => 'data', '_wpnonce' => wp_create_nonce('nativa_export_nonce_' . $slug)], admin_url('admin.php') ) ); ?>" class="button button-primary">
                           <span class="dashicons dashicons-database-export"></span> Exportar Dados Atuais
                        </a>
                        <a href="<?php echo esc_url( add_query_arg( ['action' => 'nativa_export_csv', 'cpt' => $slug, 'type' => 'template', '_wpnonce' => wp_create_nonce('nativa_export_nonce_' . $slug)], admin_url('admin.php') ) ); ?>" class="button button-secondary">
                           <span class="dashicons dashicons-download"></span> Exportar Modelo
                        </a>
                    <?php endif; ?>
                </div>
                <div class="import-status"></div> </div>
        <?php endforeach; ?>
    </div>
</div>