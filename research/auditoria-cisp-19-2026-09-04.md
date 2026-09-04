# Auditoria independente da CISP 19

Data da reprodução: 04/09/2026.

## Resultado

- Região oficial: Alto da Boa Vista e Tijuca (parte), CISP 19.
- Período: agosto de 2025 a julho de 2026.
- Registros de ocorrência válidos: 13.075.
- População usada: estimativa de 126.703 residentes derivada dos setores do Censo 2022 cruzados com o limite oficial da CISP.
- Taxa reproduzida: `13.075 / 126.703 × 100.000 = 10.319,4` registros por 100 mil residentes.

O valor exibido está matematicamente correto. Ele não significa que 10,3% dos moradores sofreram crime: o numerador conta registros, não pessoas únicas, e o denominador não inclui trabalhadores, estudantes, turistas, passageiros ou outros frequentadores.

## Reprodução mensal

| Competência | Registros |
|---|---:|
| 2025-08 | 1.112 |
| 2025-09 | 1.140 |
| 2025-10 | 1.145 |
| 2025-11 | 1.069 |
| 2025-12 | 1.168 |
| 2026-01 | 1.060 |
| 2026-02 | 939 |
| 2026-03 | 1.134 |
| 2026-04 | 1.060 |
| 2026-05 | 1.082 |
| 2026-06 | 998 |
| 2026-07 | 1.168 |
| **Total** | **13.075** |

## Auditoria espacial da população

Os arquivos oficiais foram baixados novamente e o cruzamento foi reexecutado do zero. Os 299 setores atribuídos à CISP 19 somam 126.703 residentes. O recálculo das 41 CISPs coincidiu integralmente com o arquivo publicado: nenhuma diferença de população ou de quantidade de setores.

O IBGE não publica diretamente uma população para a CISP 19. O valor de 126.703 é uma estimativa produzida pelo projeto a partir de dois insumos oficiais: população por setor censitário do IBGE e polígonos de CISP do ISP-RJ.

Como CISP e setor censitário não têm limites perfeitamente coincidentes, o método atribui cada setor à CISP em que está sua maior área. Na CISP 19, 44 dos 299 setores tocam mais de uma CISP; em 16 setores, que somam 7.205 residentes, a maior sobreposição é menor que 90% do setor. Um teste alternativo distribuindo a população proporcionalmente à área estimou 125.910 residentes, diferença de 0,6%. Isso indica que o arredondamento territorial não explica a taxa elevada.

Todos os 13.782 setores do município foram processados. A soma publicada nas 41 CISPs é 6.211.223, exatamente igual ao total municipal da base; o único setor sem interseção tinha população zero.

## Fontes oficiais

- [IBGE — Agregados por Setores Censitários, resultados do universo](https://www.ibge.gov.br/estatisticas/sociais/trabalho/22827-censo-demografico-2022.html?edicao=41852&t=resultados)
- [IBGE — arquivo CSV usado](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/Agregados_por_Setor_csv/Agregados_por_setores_basico_BR_20260520.zip)
- [IBGE — malha oficial dos setores do RJ](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/malha_com_atributos/setores/gpkg/UF/RJ/RJ_setores_CD2022.gpkg)
- [ISP-RJ — limite completo das CISPs](https://www.ispdados.rj.gov.br/Arquivos/CISPshp.rar)
- [ISP-RJ — série mensal por CISP](https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv)
- [ISP-RJ — metodologia de contabilização](https://www.ispdados.rj.gov.br/metodDivulDados.html)
