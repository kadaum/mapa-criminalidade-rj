# Descoberta orgânica: plano de 90 dias

Data de referência: 24 de setembro de 2026. Site: https://mapa-criminalidade-rj.ricardoguia.com. Escopo: município do Rio de Janeiro, 41 CISPs e 17 indicadores. O período mais recente publicado é agosto de 2026; os números são registros policiais do ISP-RJ, sujeitos a revisão.

## Situação inicial

Antes desta entrega, a página inicial e as ferramentas interativas retornavam HTML quase sem números, aguardando JavaScript. `/robots.txt` e `/sitemap.xml` respondiam 404, e a imagem Open Graph tinha base `localhost`. Não havia páginas canônicas individuais para as CISPs, os indicadores ou o conjunto de dados. A série antiga permanecia até julho de 2026. Não tivemos acesso ao Search Console nem ao painel de Analytics; não há base para afirmar posições, impressões, cliques ou tráfego orgânico. Um acesso com user agent de robô em logs indica uma requisição, sem autenticar o agente nem medir indexação.

## O que foi publicado

- Diretório e ficha factual de cada uma das 41 CISPs, com período, taxa por 100 mil residentes, população de referência, mapa, série mensal, bairros associados e links para as ferramentas existentes.
- Diretório e ficha de cada um dos 17 indicadores, com definição e unidade, série do município e tabela das CISPs.
- Página de dados com proveniência, integridade SHA-256, dicionário, cobertura, limites e downloads JSON/CSV; metodologia e boletim factual de agosto de 2026.
- Sitemap com 64 URLs canônicas, robots.txt, títulos e descrições próprios, breadcrumbs e JSON-LD de páginas, dataset e downloads. As ferramentas preservam filtros e exibem um resumo factual já no HTML inicial.
- Mesma fonte estática validada para HTML inicial, API e interface após hidratação. Durante indisponibilidade do ISP, a versão publicada continua disponível e sua data explícita evita sugerir atualização em tempo real.

## Hipóteses de busca

Consultas plausíveis: “criminalidade CISP 16 Rio”, “roubo de celular CISP Rio de Janeiro”, “dados ISP RJ por CISP”, “registros policiais agosto 2026 Rio de Janeiro” e variações por circunscrição/indicador. São hipóteses de intenção e linguagem, não estimativas de volume. Não há estratégia para multiplicar páginas por bairro: uma CISP pode conter partes de bairros e essa relação não fornece contagens no nível de bairro.

## Medição e decisões

Eventos Analytics são agregados por família de página, origem de acesso e ações de navegação/download, sem parâmetros sensíveis. O proprietário deve conectar a propriedade ao Search Console, enviar `/sitemap.xml` e confirmar acesso ao GA antes de avaliar aquisição. Não foram criadas contas, propriedades ou permissões sem o proprietário.

| Quando | Verificar | Decisão |
| --- | --- | --- |
| Dia 0–14 | Respostas 200, robots, sitemap, canônicas, schema, erros do Worker, números iguais antes/depois da hidratação | Corrigir falhas técnicas; não inferir indexação por mera visita de bot |
| Dia 28 | Cobertura/indexação e consultas no Search Console, se conectado; referências e downloads no GA | Ajustar títulos, links internos e explicações em páginas úteis; registrar ausência de acesso se persistir |
| Dia 60 | Impressões, cliques, CTR e páginas com conteúdo realmente procurado; atualização do ISP | Melhorar clareza factual de páginas com demanda observada; evitar páginas finas ou duplicadas |
| Dia 90 | Tendência de descoberta, erros, frescor e uso das páginas de dados | Manter, ampliar apenas assuntos com fonte territorial apropriada, ou retirar conteúdo que confunda |

Revisão semanal até 23 de dezembro de 2026: conferir cabeçalhos e hash do CSV oficial, validar cobertura e integridade, publicar somente snapshot coerente e verificar a produção. Se a fonte não responder ou os dados falharem validação, manter a versão anterior e registrar o motivo. Comparações anuais usam janelas iguais de 12 meses. Agregados e componentes se sobrepõem, e vítimas e casos têm unidades distintas.

## Fontes de referência

- ISP-RJ: https://www.ispdados.rj.gov.br/ e https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv
- Google Search Central, JavaScript e SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- Google Search Central, conjuntos de dados: https://developers.google.com/search/docs/appearance/structured-data/dataset
- OpenAI, rastreadores: https://platform.openai.com/docs/bots
