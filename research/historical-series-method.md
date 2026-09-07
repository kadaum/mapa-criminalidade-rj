# Série histórica municipal — implementação em 7 de setembro de 2026

## Escopo

A aba `/historico` permite selecionar 2003–2026, indicador e quantidade/taxa anual por 100 mil moradores; abre também a tabela mensal e downloads. O mapa territorial recente permanece com seus 36 meses e denominador Censo 2022. Isso evita atribuir fronteiras atuais a décadas passadas ou alterar silenciosamente os resultados já usados no carrossel.

## Fontes e decisões

- ISP `BaseDPEvolucaoMensalCisp.csv`: 11.443 linhas municipais, janeiro/2003 a julho/2026, 283 meses. Para 2003–2013, soma todas as CISPs identificadas como Rio de Janeiro em cada mês, nunca apenas o conjunto atual. A quantidade de áreas históricas varia: 39, 40, 42 e 41. Não se reconstruiu malha histórica.
- ISP `BaseMunicipioMensal.csv`: desde janeiro/2014, fonte municipal oficial prevalece. Duplicatas, meses ausentes e divergência na última competência entre fontes interrompem a atualização.
- IBGE SIDRA 6579/9324: estimativa populacional do ano, incluindo 2026 (6.731.133). Censo 2010: tabela 200/93 (6.320.446); Censo 2022: tabela 4714/93 (6.211.223).
- A tabela 6579 não contém 2007 nem 2023. Esses anos mantêm quantidade, mas a taxa é nula e a interface explica a lacuna. Não há interpolação ou reaproveitamento de 2022.
- Taxa anual = quantidade / população do próprio ano × 100.000, somente quando os 12 meses e o indicador estão completos. Janeiro–julho/2026 aparece como parcial, fora do gráfico anual e sem taxa anual. Mensal é quantidade, sem anualização.
- Censos e revisões de estimativa podem mudar o denominador. A série não é uma projeção homogênea revisada retrospectivamente. Variações de taxa próximas dessas quebras precisam dessa ressalva.
- Os arquivos baixados têm SHA-256 no JSON. Ausências são `null`/célula vazia, não zero. O CSV contém os 17 indicadores atualmente oferecidos pelo produto, em toda a série temporal disponível.

## Atualização e verificação

`npm run sync:history` refaz o histórico; `npm run sync:data` passa a atualizar as duas janelas. A rotina diária registra os novos arquivos históricos junto aos atuais e executa `npm run test:history` antes do build. Não houve publicação nesta implementação.

Os 12 meses agosto/2025–julho/2026 na base municipal reconciliam com o snapshot por CISP: 58.944 roubos, 1.589 vítimas de letalidade e 489.284 registros. Os testes cobrem CSV/ausência, população do ano exato, ano parcial, continuidade e origem municipal após 2014.

## Limites

A origem da série muda em 2014: a soma anterior usa identificação municipal da base histórica de delegacias, não uma validação cartográfica retrospectiva. Mudanças de classificação ao longo de décadas e subnotificação continuam relevantes. O histórico não pretende medir risco individual. A janela territorial pode ser ampliada depois de um trabalho específico de correspondência de fronteiras e população por CISP histórica.
