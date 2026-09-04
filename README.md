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
npm run sync:data
npm run validate:data
npm run dev
```

## Validação

`npm run validate:data` bloqueia a publicação se houver duplicidade de CISP/mês, valor negativo ou não inteiro, quebra no conjunto de colunas, CISP sem geometria, geometria sem CISP atual, menos de 41 áreas da capital, população sem reconciliação ou falta do hash da fonte.

O workflow em `.github/workflows/update-data.yml` consulta a fonte diariamente, valida, recompila e versiona o snapshot apenas quando o arquivo muda.

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
