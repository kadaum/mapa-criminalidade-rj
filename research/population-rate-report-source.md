# População por CISP e granularidade temporal — relatório-fonte

Data da verificação: 04/09/2026.

## Decisão

O mapa deve manter a quantidade bruta como visualização principal e oferecer a taxa por 100 mil residentes como leitura auxiliar. A taxa corrige diferenças de população residente entre CISPs, mas não corrige fluxo diário de trabalhadores, turistas, passageiros ou visitantes.

## Fonte populacional adotada

- IBGE, Censo Demográfico 2022, resultados do universo por setor censitário.
- Arquivo básico atualizado em 20/05/2026: `Agregados_por_setores_basico_BR_20260520.zip`.
- Variável: `V0001`, total de pessoas.
- Geometria: malha oficial dos setores censitários de 2022 para o Rio de Janeiro.
- Método: dissolver geometrias multipartes por `CD_SETOR`, atribuir cada setor à CISP de 2026 com a maior área de interseção e somar a população uma única vez.

## Auditoria do cruzamento

- 13.782 setores únicos do município.
- 41 CISPs cobertas.
- 6.211.223 residentes na origem.
- 6.211.223 residentes atribuídos.
- Três setores sem interseção, todos com população zero.

O script reprodutível está em `scripts/derive-census-population.py`; o resultado publicado está em `public/data/cisp-population.json` e é verificado por `scripts/validate-data.mjs`.

## Alternativa rejeitada

O ISP publica `PopulacaoEvolucaoMensalCisp.csv`, mas a série termina em julho de 2022 e deriva estimativas municipais do IBGE proporcionalmente à área territorial. Para o município, a soma recente dessa série é 6.772.682, incompatível com o resultado definitivo do Censo 2022 (6.211.223). Por isso ela não é usada como denominador.

## Série criminal

- Fonte: `BaseDPEvolucaoMensalCisp.csv`, ISP-RJ.
- Cobertura confirmada: janeiro de 2003 a julho de 2026.
- Granularidade: mensal; não há semana nessa base.
- Interface: janelas de 1, 3, 6 ou 12 meses e escolha do mês final dentro dos 36 meses carregados.
- Atualização do produto: consulta automática com cache de seis horas; a competência oficial continua sendo publicada mensalmente.

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
- https://www.ibge.gov.br/estatisticas/sociais/trabalho/22827-censo-demografico-2022.html?edicao=41852&t=resultados
- https://www.ibge.gov.br/cidades-e-estados/rj/rio-de-janeiro.html
