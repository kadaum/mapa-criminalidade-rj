# Expansão do produto — workflow e critérios

Escopo: Meu bairro, Comparar, Rankings e Insights, derivados automaticamente da mesma série mensal por CISP. O orquestrador implementa e integra; revisores independentes pesquisam, avaliam e devolvem problemas antes da publicação.

1. Arquitetura da informação: pesquisa do bairro, escolha explícita de região quando dividido, navegação e links que preservam filtros.
2. UX e movimento: controles legíveis, foco/teclado, celular, estados de erro e movimento reduzido.
3. Dados: janelas completas, empates, denominador municipal ponderado, ausência diferente de zero, base pequena e revisão histórica.
4. Implementação: motor único de cálculos; resultados e textos determinísticos, sem chamadas de IA ou agendamento editorial.
5. Síntese: orquestrador reconcilia revisões e registra decisões. Revisores reavaliam a implementação.
6. Evals: casos sintéticos de empate, ausência, zero, mês novo, revisão e bairros compartilhados; checagem do snapshot real.
7. QA: busca, navegação, comparação, filtros, mapa/lista, celular e links diretos. Falhas materiais voltam à implementação.
8. Publicação: build, validação da fonte e prova das páginas públicas.

Regras: bairro é entrada para região policial; nunca redistribuir ocorrências proporcionalmente. Ranking usa CISPs únicas e empate 1,1,3. Cidade inclui a área selecionada. Padrão acompanha último mês; links históricos mantêm data explícita. Snapshot de segurança é o arquivo empacotado, não uma cópia persistente da última consulta. Insights exigem cobertura completa e são descrições, não causalidade ou previsão.
