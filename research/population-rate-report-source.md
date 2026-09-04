# População por CISP e granularidade temporal — relatório-fonte

Data da verificação: 04/09/2026.

## Decisão

O mapa deve abrir na taxa por 100 mil residentes, mantendo quantidade bruta e população usada sempre visíveis. A taxa corrige diferenças de população residente entre CISPs, mas não corrige fluxo diário de trabalhadores, turistas, passageiros ou visitantes.

## Fonte populacional adotada

- IBGE, Censo Demográfico 2022, resultados do universo por setor censitário.
- Arquivo básico atualizado em 20/05/2026: `Agregados_por_setores_basico_BR_20260520.zip`.
- Variável: `V0001`, total de pessoas.
- Geometria: malha oficial dos setores censitários de 2022 para o Rio de Janeiro.
- Limite policial: SHP oficial completo das CISPs de 2026, publicado pelo ISP-RJ em `CISPshp.rar`.
- Método: dissolver geometrias multipartes por `CD_SETOR`, atribuir cada setor à geometria oficial completa da CISP com a maior área de interseção em EPSG:31983 e somar a população uma única vez. A geometria simplificada de exibição não entra no cálculo.

## Auditoria do cruzamento

- 13.782 setores únicos do município.
- 41 CISPs cobertas.
- 6.211.223 residentes na origem.
- 6.211.223 residentes atribuídos.
- Um setor sem interseção, com população zero.

Uma auditoria em 04/09/2026 identificou que a primeira versão havia usado a geometria simplificada do mapa. O recálculo com o SHP oficial completo alterou 22 das 41 distribuições sem mudar o total municipal. Exemplos: CISP 1, 1.652 → 1.381; CISP 5, 26.151 → 27.300; CISP 7, 43.421 → 39.890; CISP 43 permaneceu em 230.698.

O script reprodutível está em `scripts/derive-census-population.py`; o resultado publicado está em `public/data/cisp-population.json` e é verificado por `scripts/validate-data.mjs`.

## Alternativa rejeitada

O ISP publica `PopulacaoEvolucaoMensalCisp.csv`, mas a série termina em julho de 2022 e deriva estimativas municipais do IBGE proporcionalmente à área territorial. Para o município, a soma recente dessa série é 6.772.682, incompatível com o resultado definitivo do Censo 2022 (6.211.223). Por isso ela não é usada como denominador.

## Série criminal

- Fonte: `BaseDPEvolucaoMensalCisp.csv`, ISP-RJ.
- Cobertura confirmada: janeiro de 2003 a julho de 2026.
- Granularidade: mensal; não há semana nessa base.
- Interface: janelas de 1, 3, 6 ou 12 meses e escolha do mês final dentro dos 36 meses carregados.
- Atualização do produto: consulta automática com cache de seis horas; a competência oficial continua sendo publicada mensalmente.

## Visão geral e agrupamento

- `registro_ocorrencias` é a visão geral oficial dos registros de ocorrência válidos para as estatísticas do ISP.
- O campo não é “total de crimes”: um registro pode conter mais de um título e também existem fatos não criminais.
- Total de roubos, total de furtos, roubo de rua e letalidade violenta são agregados que se sobrepõem a seus componentes; nunca devem ser somados.
- Casos e vítimas também não devem ser combinados.

## Cadência da população

A população é uma base fixa do Censo 2022, não um feed mensal. O workflow monitora automaticamente `Last-Modified` e `ETag` do SHP oficial das CISPs e bloqueia a rotina quando o limite muda. O recálculo só deve ocorrer com a geometria completa quando um insumo oficial mudar; atualizar apenas a estimativa municipal não melhoraria a distribuição entre CISPs.

## Definições

- Roubo de rua: roubo a transeunte + roubo de celular + roubo em coletivo.
- Letalidade violenta: homicídio doloso + morte por intervenção de agente do Estado + latrocínio + lesão corporal seguida de morte.
- Crimes contra o patrimônio são contabilizados em casos; indicadores contra a pessoa, em vítimas, conforme a metodologia do ISP.

## Fontes primárias

- https://www.ispdados.rj.gov.br/EstSeguranca.html
- https://www.ispdados.rj.gov.br/MetodologiaAgregacao.html
- https://www.ispdados.rj.gov.br/metodDivulDados.html
- https://www.ispdados.rj.gov.br/Populacao.html
- https://www.ispdados.rj.gov.br/metodologiaCalPopulacao.html
- https://www.ispdados.rj.gov.br/Arquivos/CISPshp.rar
- https://www.ibge.gov.br/estatisticas/sociais/trabalho/22827-censo-demografico-2022.html?edicao=41852&t=resultados
- https://www.ibge.gov.br/cidades-e-estados/rj/rio-de-janeiro.html
