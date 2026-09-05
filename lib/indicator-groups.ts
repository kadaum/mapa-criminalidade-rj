export const indicatorGroups = [
  { label: 'Visão geral', ids: ['registro_ocorrencias'] },
  { label: 'Patrimônio', ids: ['total_roubos', 'total_furtos', 'estelionato'] },
  {
    label: 'Tipos de roubo',
    ids: ['roubo_rua', 'roubo_celular', 'roubo_em_coletivo', 'roubo_veiculo'],
  },
  { label: 'Tipos de furto', ids: ['furto_veiculos', 'furto_celular'] },
  {
    label: 'Vida e integridade',
    ids: [
      'letalidade_violenta',
      'hom_doloso',
      'tentat_hom',
      'hom_por_interv_policial',
      'estupro',
      'ameaca',
    ],
  },
  { label: 'Outros registros', ids: ['pessoas_desaparecidas'] },
] as const;
