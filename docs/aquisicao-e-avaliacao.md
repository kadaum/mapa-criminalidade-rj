# Aquisição e avaliação — piloto de quatro semanas

Plano preparado em 6 de outubro de 2026. Nenhuma mensagem, newsletter, propriedade do Search Console ou publicação externa foi criada durante esta preparação.

## Baseline verificável

Uma consulta HTTP ao site publicado em 6 de outubro retornou `200` para `/`, `/robots.txt` e `/sitemap.xml`. O `robots.txt` permite `/`, bloqueia `/api/` e referencia o sitemap. O HTML inicial da entrada contém título e canonical absoluto autorreferente. O sitemap publicado lista as páginas existentes, mas ainda não contém as novas rotas de bairros e o hub cronológico; elas entram após publicação desta versão.

Isso comprova acessibilidade técnica no momento da consulta, não indexação. O Google explica que sitemap ajuda descoberta, mas não garante rastreamento ou indexação. A documentação também trata `rel="canonical"` como sinal forte, sitemap como sinal mais fraco e recomenda canonical autorreferente no HTML. Fontes primárias: [visão geral de sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/overview), [canonicalização](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls) e [uso do Search Console](https://developers.google.com/search/docs/monitor-debug/search-console-start).

Os campos de data têm papéis distintos: `schema.org/dateModified` descreve a revisão do documento e só deve ser emitido quando essa revisão for verificável; o cabeçalho `Last-Modified` é a data observada da fonte upstream; `generatedAt` é o timestamp de coleta do snapshot derivado. O sitemap mantém apenas URLs canônicas quando não há revisão por documento verificável. Referências: [schema.org/dateModified](https://schema.org/dateModified) e [como criar sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

Não há acesso confirmado ao Search Console neste trabalho. Impressões, consultas, posição, cobertura e cliques começam como “não medido”; não devem receber estimativas. Quando houver acesso autorizado, registrar exportação datada antes do piloto e comparar páginas equivalentes, sem atribuir causalidade a uma única ação.

## Contrato de medição

A ação útil principal é a proporção de sessões consentidas que concluem ao menos uma destas ações: selecionar bairro/CISP, abrir e obter primeiro quadro/progresso de câmera, comparar, compartilhar uma URL estável ou concluir uma contribuição. A base de cálculo precisa declarar que cobre somente pessoas que aceitaram analytics.

Os eventos são allowlisted em `lib/product-analytics.ts`. Não aceitam texto livre, endereço, parâmetros de busca, URL completa, protocolo de contribuição ou identificador pessoal. Câmeras usam apenas provedor enumerado e ID público permanente com caracteres limitados. Tentativa, resolução, primeiro quadro, progresso, erro e timeout são eventos distintos; timeout indica que o limite de dez segundos foi atingido e não prova que a fonte está offline.

A cobertura de observação varia por provedor. O CamerasRJ permite confirmar o primeiro quadro decodificado sob o contrato do player; seu progresso contínuo só pode ser contado quando o próprio provedor o reporta ao bridge, e não deve ser inferido pelo timer ou pela abertura do player. No YouTube, o avanço pode ser observado pelos eventos `infoDelivery` de tempo crescente. A ausência de um evento de progresso do CamerasRJ permanece “não observado”, não uma falha nem uma prova de disponibilidade contínua.

Funil recomendado:

1. visita à família de página;
2. seleção ou abertura de conteúdo;
3. resultado observável (`camera_first_frame`, `camera_progress`, compartilhamento ou contribuição recebida);
4. retorno em 7 e 30 dias somente quando a configuração de analytics produzir essa coorte de forma válida.

Relatar contagens, taxas e cobertura do consentimento lado a lado. Separar falha de player, resolução, rede e origem. Não comparar bairros como ranking de segurança. UTMs ficam limitadas a `bairro-piloto`, `boletim-mensal`, `imprensa-local` e `associacoes-locais`; termos e consultas livres são descartados.

## Calendário de quatro semanas

### Semana 1 — base e descoberta

- Publicar e verificar manualmente status, canonical, conteúdo inicial, robots e sitemap das cinco páginas de bairro e do hub de boletins.
- Registrar baseline real disponível. Se houver Search Console autorizado, exportar páginas e consultas com data e filtros; caso contrário, manter como não medido.
- Pauta 1: “Como ler registros policiais por CISP sem confundir com total do bairro”, ligada a `/metodologia` e `/bairros`.
- Pauta 2: “Centro é atendido por quatro CISPs: o que cada recorte significa”, ligada a `/bairros/centro` e às quatro fichas CISP.

### Semana 2 — utilidade local

- Pauta 3: “Copacabana e Tijuca são bairros divididos entre CISPs”, com links para as páginas permanentes e tabelas da fonte.
- Pauta 4: “Iluminação e calçadas no Censo 2022: o que o percentual mede e o que não mede”, usando os cinco recortes do IBGE sem inferência causal.
- Revisar eventos de seleção e compartilhamento por modo `fixed` versus `latest`.

### Semana 3 — atualização editorial

- Pauta 5: boletim da competência mais recente, com três achados calculados apenas de janelas completas e equivalentes, link para a edição fixa e para os downloads.
- Preparar um quadro curto com fonte, unidade, período, revisão e limitações para jornalistas e associações locais.
- Comparar abertura → ação útil por família de página, indicando tamanho da amostra e consentimento.

### Semana 4 — câmeras e decisão

- Pauta 6: diretório das câmeras públicas verificadas, explicando diferença entre referência, resolução da transmissão, primeiro quadro e progresso.
- Revisar erros e timeouts por provedor sem transformar timeout em “offline”.
- Decidir manter, ajustar ou encerrar cada pauta com base em ações úteis, qualidade das fontes e consultas reais disponíveis. Não ampliar páginas bairro × crime × período sem conteúdo próprio.

## Rascunhos para uso manual

WhatsApp — boletim:

> Atualização do Mapa da Criminalidade RJ: o boletim de [competência] compara duas janelas equivalentes de 12 meses e explica fonte e limites. Link permanente: [URL da edição]

WhatsApp — bairro:

> Nova página de [bairro]: contexto do Censo 2022 e as CISPs relacionadas, com a distinção entre dados do bairro e registros da área policial. [URL permanente]

Imprensa ou associação local:

> Assunto: Dados públicos e recorte territorial de [bairro]
>
> Olá, preparei uma página pública que reúne contexto do IBGE para [bairro] e identifica as CISPs relacionadas sem atribuir ao bairro as contagens da área policial. A página informa período, unidade, fonte, denominador e limitações, além de oferecer os dados reproduzíveis: [URL]. Se for útil para sua apuração, posso indicar as tabelas e o método usados.

Antes de qualquer envio, substituir os campos, conferir a competência e abrir a URL. O envio depende de autorização e revisão humana; este documento não autoriza contato com terceiros.
