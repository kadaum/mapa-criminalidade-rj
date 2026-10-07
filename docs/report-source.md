# Mapa da Criminalidade RJ — relatório-fonte

**Audiência:** moradores engajados, associações, imprensa local e controle social.
**Data:** 03/09/2026.
**Geografia:** município do Rio de Janeiro, 41 CISPs nos limites oficiais de 2026.
**Decisão:** construir ou rejeitar um piloto público e automatizável de criminalidade territorial.

## Resposta executiva

Construir apenas um monitor mensal de mudança nos registros policiais por área de delegacia. Rejeitar mapa de risco, ranking de segurança, ponto de ocorrência, rota segura e promessa em tempo real. A fonte oficial sustenta contagens e tendências por CISP, mas não risco individual.

## Evidência operacional

- O CSV oficial respondeu em 03/09/2026 com 7.141.945 bytes, 38.136 linhas e 65 colunas. O mês mais recente é julho de 2026: https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv
- A granularidade oficial é CISP e a periodicidade é mensal: https://www.ispdados.rj.gov.br/EstSeguranca.html
- O ISP publica limites CISP 2026 em SHP/KML. As 137 geometrias estaduais reconciliaram com as 137 CISPs atuais; 41 pertencem à capital: https://www.ispdados.rj.gov.br/Conteudo.html
- O dicionário distingue crimes contra a pessoa, geralmente em vítimas, de crimes patrimoniais, em casos: https://www.ispdados.rj.gov.br/Arquivos/BaseDpDicionarioDeVariaveis.xlsx
- Registros podem mudar por erratas, duplicidade, classificação e local: https://www.ispdados.rj.gov.br/MetodRetifDados.html
- A população oficial por CISP termina em julho de 2022 e é estimada por distribuição territorial; não sustenta taxa CISP atual: https://www.ispdados.rj.gov.br/metodologiaCalPopulacao.html

## Concorrência e lacuna

ISP Conecta, Crime Brasil, Fogo Cruzado, OTT e outros produtos já resolvem dashboards, comparação agregada ou alertas urgentes. A lacuna é estreita: acompanhamento mensal auditável, diff entre períodos equivalentes, pipeline aberto, limitações permanentes e cartão compartilhável. Se usuários não perceberem essa diferença, o projeto deve ser encerrado.

## Contradições e gaps

- O dicionário XLSX informa atualização de janeiro de 2021, mas o CSV possui colunas posteriores.
- Feminicídio mudou de definição em outubro de 2024; o produto deve usar o agregado oficial publicado, não reconstruí-lo.
- Não há coleção completa de polígonos históricos.
- A licença da base estatística aparece como PDDL no catálogo estadual; o conjunto territorial não explicita licença específica.
- A base é mensal e não contém rua, horário ou BO individual.

## Critério de parada da pesquisa

As fontes mínimas para o piloto foram identificadas e testadas; as unidades de contagem e limitações materiais estão documentadas; três agentes independentes convergiram no mesmo posicionamento; novas buscas gerais não mudariam a decisão de escopo. Permanecem apenas confirmações formais de licença cartográfica e definição atual de CVLI antes de expansão.

## Ledger de fontes

| Claim | Fonte | Publicador | Atualização/acesso | URL |
|---|---|---|---|---|
| Série mensal por CISP | Estatísticas de segurança | ISP-RJ | arquivo observado 17/08/2026 | https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv |
| Definições e unidades | Dicionário da base DP | ISP-RJ | acesso 03/09/2026 | https://www.ispdados.rj.gov.br/Arquivos/BaseDpDicionarioDeVariaveis.xlsx |
| Limites territoriais | Divisão territorial | ISP-RJ | CISP/AISP 2026 | https://www.ispdados.rj.gov.br/Conteudo.html |
| Revisões | Metodologia de retificação | ISP-RJ | acesso 03/09/2026 | https://www.ispdados.rj.gov.br/MetodRetifDados.html |
| População CISP | Metodologia populacional | ISP-RJ | série até 07/2022 | https://www.ispdados.rj.gov.br/metodologiaCalPopulacao.html |
