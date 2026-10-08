# Mapa da Criminalidade RJ

Monitor territorial open source de registros policiais por CISP no município do Rio de Janeiro.

O produto responde uma pergunta estreita: **o que mudou nos registros comunicados à Polícia Civil nesta área, comparando dois períodos equivalentes?** Ele não calcula risco individual, não recomenda rotas e não classifica ruas como seguras ou perigosas.

## Dados

- Série mensal por CISP: [ISP-RJ](https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv).
- Dicionário: [ISP-RJ](https://www.ispdados.rj.gov.br/Arquivos/BaseDpDicionarioDeVariaveis.xlsx).
- Limites territoriais: [ISP-RJ](https://www.ispdados.rj.gov.br/Conteudo.html).
- Relação oficial entre CISP e bairros: [ISP-RJ](https://www.ispdados.rj.gov.br/Arquivos/Relacao_RISPxAISPxCISP.csv).
- Limites municipais de bairros: [Prefeitura do Rio](https://services1.arcgis.com/OlP4dGNtIcnD3RYf/ArcGIS/rest/services/db_MI_Bairros/FeatureServer/0).
- População residente por setor censitário: [IBGE, Censo 2022](https://www.ibge.gov.br/estatisticas/sociais/trabalho/22827-censo-demografico-2022.html?edicao=41852&t=resultados).
- A população por CISP é derivada com o [SHP oficial completo das CISPs de 2026](https://www.ispdados.rj.gov.br/Arquivos/CISPshp.rar), atribuindo cada setor à CISP com maior área de interseção. Os 13.782 setores somam 6.211.223 residentes, exatamente o total municipal do Censo 2022. A geometria simplificada do mapa nunca entra nesse cálculo.
- O site consulta o CSV oficial e mantém cache por seis horas. Se a fonte falhar, usa o último snapshot validado.
- O snapshot registra ETag, Last-Modified, SHA-256, bytes e horário de coleta.

## Rodar

```bash
npm ci
npm run prepare:public-data
npm run sync:data
npm run validate:data
npm run dev
```

`npm run prepare:public-data` baixa seis artefatos de runtime do snapshot público existente, baixa temporariamente os ZIPs compactos oficiais do IBGE, deriva o contexto local e gera os cards de bairro. O comando não usa credenciais, não baixa mídia e não mantém os ZIPs de origem. As licenças específicas desses conjuntos continuam não confirmadas; os arquivos gerados são saídas locais, não uma alegação de licença MIT.

## Dados públicos do candidato

O espelho público contém o código, a proveniência, os snapshots estatísticos do ISP-RJ com licença PDDL e o recorte derivado de transporte do SPPO com licença CC BY 4.0 confirmada pela fonte oficial. Para executar localmente as telas que dependem de catálogo ou geometria, faça bootstrap somente dos caminhos allowlisted abaixo a partir do snapshot público existente do Site; não trate esse espelho como a fonte primária nem redistribua esses arquivos sem confirmar a licença do publicador:

```text
https://mapa-criminalidade-rj.ricardoguia.com/data/camera-location-evidence.json
https://mapa-criminalidade-rj.ricardoguia.com/data/cisp-neighborhoods.json
https://mapa-criminalidade-rj.ricardoguia.com/data/cisp-population.json
https://mapa-criminalidade-rj.ricardoguia.com/data/cisp-rio.geojson
https://mapa-criminalidade-rj.ricardoguia.com/data/neighborhoods-rio.geojson
https://mapa-criminalidade-rj.ricardoguia.com/data/public-cameras.json
```

Esses seis artefatos ficam fora do candidato por terem licença específica não confirmada (incluindo geometrias, catálogo CamerasRJ, evidências e população derivada). O bootstrap é local, sem credenciais e sem download de vídeo ou mídia; preserve a atribuição e as limitações documentadas no Site. As estatísticas ISP-RJ continuam reproduzíveis por `npm run sync:data` e `npm run validate:data`.

Além dos três snapshots do ISP-RJ, o candidato publica somente `public/data/neighborhood-transport.json`, um recorte derivado de cinco bairros da camada municipal Paradas do SPPO. A fonte é a Prefeitura do Rio, item ArcGIS `fd07613c9a1c45299389c0f7cff8e2a0`, sob CC BY 4.0; o snapshot bruto de 7.600 pontos, geometrias, arquivos do IBGE, catálogo de câmeras, `.env`, `.openai`, dados de usuário e trilhas de auditoria permanecem fora do escopo público.

## Validação

`npm run validate:data` bloqueia a publicação se houver duplicidade de CISP/mês, valor negativo ou não inteiro, quebra no conjunto de colunas, CISP sem geometria, geometria sem CISP atual, menos de 41 áreas da capital, população sem reconciliação ou falta do hash da fonte.

O workflow em `.github/workflows/update-data.yml` consulta a fonte diariamente, valida, recompila e versiona o snapshot apenas quando o arquivo muda.

Ao atualizar estatísticas manualmente depois do primeiro bootstrap, rode `npm run sync:data` e em seguida `npm run build:share-cards`; assim os cards de boletim usam a mesma competência do snapshot. Os cinco cards de bairro e os dados de licença não confirmada continuam locais. O workflow gera os cards para validar o build, mas versiona somente os três snapshots estatísticos do ISP-RJ.

O clone público usa um binding D1 local com ID fictício para desenvolvimento e build. Em produção, a área moderadora exige a identidade injetada de forma confiável pelo OpenAI Sites ou por um gateway autenticado equivalente; veja [SECURITY.md](SECURITY.md). O servidor local não é uma configuração de autenticação para produção.

A mesma rotina verifica `Last-Modified` e `ETag` do SHP oficial das CISPs. Se o limite territorial mudar, ela falha de forma explícita e exige o recálculo populacional com a geometria completa antes de aceitar uma nova publicação. A população não é interpolada mensalmente.

## Princípios editoriais

- Dizer “registros comunicados à polícia”, não “crimes que aconteceram”.
- Mostrar competência e fase de revisão.
- Abrir o mapa em taxa por 100 mil, mantendo quantidade bruta, população usada e ressalva de população flutuante sempre visíveis.
- Usar `registro_ocorrencias` como visão geral oficial, com o rótulo “Registros de ocorrência”; nunca chamar esse campo de “total de crimes”.
- Organizar os demais indicadores em grupos de navegação, sem somá-los: agregados e componentes se sobrepõem.
- Explicar que a taxa não corrige população flutuante em áreas centrais, turísticas ou de transporte.
- Nunca misturar casos e vítimas.
- Suprimir variação percentual quando as duas janelas somam menos de 20 registros.
- Não oferecer score, previsão, GPS ou rota segura.
- Preservar o indicador agregado que o ISP publicou, mesmo quando a documentação antiga não permite reconstruí-lo.

## Licença

O código é MIT. A base de estatísticas é publicada no catálogo estadual sob Open Data Commons PDDL. Os limites territoriais devem sempre manter atribuição ao ISP-RJ; a licença específica do conjunto cartográfico precisa ser confirmada antes de uma redistribuição pública ampla.

## Câmeras públicas

O mapa inclui uma camada opcional de referências públicas, com agrupamento por proximidade, busca, precisão da localização e fonte. A lista separa coordenadas mapeadas de localização pendente e não confunde catálogo com transmissão funcionando. [Fluxo, fontes e limites](docs/public-cameras.md). Atribuição e licença do catálogo e de cada transmissão são próprias; não herdam MIT/PDDL.
