# Mapa da Criminalidade RJ — pesquisa de interface e experiência cartográfica

Data: 4 de setembro de 2026  
Público: produto, design, engenharia e colaboradores open source  
Escopo: arquitetura da informação, controles, mapa, visualização quantitativa, motion, marca e acessibilidade.

## Resposta executiva

A experiência deve funcionar como um atlas local, não como um painel administrativo. A principal tarefa é localizar uma região, compreender um número e compará-lo com as outras 41 CISPs. Por isso, o mapa e os filtros essenciais entram na primeira dobra; totais municipais, metodologia e contexto vêm depois.

O mapa usa três gramáticas distintas para não induzir leituras falsas:

- taxa por 100 mil: mapa coroplético sequencial por CISP;
- quantidade: círculos proporcionais sobre áreas neutras;
- variação: escala divergente centrada em zero, com “sem comparação” separado de “estável”.

Não foi adotado heatmap contínuo nem 3D. Os dados são agregados por CISP; interpolar uma superfície ou extrudar polígonos sugeriria uma precisão territorial inexistente e prejudicaria comparação, mobile e acessibilidade.

## O que os benchmarks sustentam

### Fluxo humano e mapa como entrada

O Atlas of American Gun Violence, do The Trace, combina promessa humana, busca de localização, filtros e metodologia sem abrir com uma grade de KPIs. O NYC Population FactFinder mostra uma boa ligação entre seleção geográfica, comparação e perfil local. O NYC Street Tree Map demonstra progressão de detalhe conforme o usuário se aproxima do território.

Decisão aplicada: pergunta humana, busca de bairro/região, filtros compactos, mapa dominante e painel da região integrado.

### Cartografia

Guias da Esri alertam que valores absolutos não devem ser usados diretamente em coropléticos quando o tamanho ou a população das áreas varia; quantidades são melhor representadas por símbolos proporcionais. O Datawrapper recomenda legenda próxima do mapa, unidade repetida junto do valor, intervalos explícitos e contexto geográfico preservado. O MapLibre fornece `feature-state` para hover e seleção sem remontar a geometria.

Decisão aplicada: taxa em faixas sequenciais; quantidade em círculos; hover via estado da feição; seleção dourada; legenda com método e período.

### Mobile e acessibilidade

Pesquisas sobre mapas temáticos responsivos indicam que mobile exige reposicionar controles e oferecer alternativa, não apenas encolher o desktop. WCAG 2.2 reforça alvos de interação adequados, foco visível, redução de movimento e alternativas que não dependam apenas de cor.

Decisão aplicada: filtros em painel inferior próprio, resumo da região visível sobre o mapa, controles de pelo menos 40–44 px, modo lista para as 41 áreas e respeito a `prefers-reduced-motion`.

### Linguagem e estigma

Mapas criminais podem reforçar estigma territorial quando reduzem comunidades a manchas de “perigo”. A interface usa “mais/menos registros”, nunca “seguro/perigoso”, e explica que registros policiais não medem risco individual nem todos os fatos ocorridos.

Decisão aplicada: azul-petróleo sequencial, variação sem semântica de segurança, bairros antes do código CISP e avisos para denominadores pequenos.

## Sistema visual aplicado

- tipografia: Geist, com corpo mínimo de 12–14 px e números tabulares;
- fundo: `#F4F7F8`;
- tinta: `#14323C`;
- primária: `#1B6473`;
- seleção: `#D9A441`;
- bordas: `#D8E2E5`;
- mapa e módulos: 20–22 px de raio;
- controles: 12 px de raio;
- motion: 180–320 ms para estados e 500 ms apenas para enquadramento solicitado pelo usuário.

A marca usa quatro células territoriais com uma região destacada. Ela comunica território, seleção e dado público, evitando escudo, sirene, mira ou símbolos de autoridade policial.

## Limites e decisões abertas

- O basemap continua raster do OpenStreetMap. Um basemap vetorial pode melhorar hierarquia de rótulos, mas só deve ser adotado após validar hospedagem, termos e disponibilidade.
- A busca é local por bairro, unidade territorial ou CISP; não depende de geocodificador externo.
- As faixas da taxa são quantis relativos às 41 áreas no período selecionado. A legenda explicita essa relatividade; uma versão futura pode adotar cortes fixos após estudo de comparabilidade histórica.
- Círculos usam o centro do envelope da geometria. Para refinamento futuro, vale armazenar pontos internos cartograficamente revisados para áreas costeiras ou muito recortadas.
- A população é do Censo 2022 e não representa população flutuante. Taxa, quantidade e denominador aparecem juntos.

## Fontes verificadas

1. The Trace. Atlas of American Gun Violence. https://projects.thetrace.org/gun-violence-map/
2. NYC Parks. NYC Street Tree Map. https://tree-map.nycgovparks.org/tree-map
3. NYC Department of City Planning. Population FactFinder. https://popfactfinder.planning.nyc.gov/
4. CDC. PLACES Interactive Map. https://www.cdc.gov/places/tools/explore-places-interactive-map.html
5. Fogo Cruzado. Perguntas frequentes e metodologia. https://fogocruzado.org.br/perguntas-frequentes/
6. Datawrapper. Customizing choropleth maps. https://www.datawrapper.de/academy/customizing-your-choropleth-map
7. Esri. Normalization for choropleth maps. https://www.esri.com/arcgis-blog/products/arcgis-online/mapping/normalization-for-choropleth-maps
8. MapLibre GL JS. Create a hover effect. https://maplibre.org/maplibre-gl-js/docs/examples/create-a-hover-effect/
9. MapLibre Style Specification. Transition. https://maplibre.org/maplibre-style-spec/transition/
10. Roth et al. Responsive Thematic Map Design. https://arxiv.org/abs/2407.20735
11. W3C. Web Content Accessibility Guidelines 2.2. https://www.w3.org/TR/WCAG22/
12. Critical Criminology. Crime mapping and territorial stigma. https://link.springer.com/article/10.1007/s10612-023-09720-w
13. GOV.UK Design System. Maps guidance. https://brand.design-system.service.gov.uk/data/maps/
14. Axis Maps. Map interaction guide. https://www.axismaps.com/guide/map-interaction

## Critério de validação

A revisão deve confirmar: mapa visível e útil na primeira dobra; filtros com rótulos humanos; seleção preservada ao trocar indicador ou período; taxa, quantidade e população coerentes; quantidade exibida por símbolos proporcionais; variação sem confundir ausência de comparação com estabilidade; busca funcional; alternativa em lista; ausência de overflow horizontal; console sem erros; build e validação de dados aprovados.
