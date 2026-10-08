# Transporte nos bairros piloto

As páginas de Centro, Copacabana, Tijuca, Barra da Tijuca e Campo Grande mostram um recorte cadastral dos pontos da camada municipal **Paradas** do SPPO. A fonte é a Prefeitura da Cidade do Rio de Janeiro (item ArcGIS `fd07613c9a1c45299389c0f7cff8e2a0`), publicada sob CC BY 4.0.

## Fonte fechada e reprodução

O arquivo público foi gerado a partir do snapshot auditado `v85`, recuperado em 7 de outubro de 2026. O gerador exige o diretório externo desse snapshot e verifica os hashes SHA-256 do candidato, dos metadados do item e da camada e do relatório de qualidade antes de processar qualquer ponto. Também verifica o hash do GeoJSON oficial versionado em `public/data/neighborhoods-rio.geojson`. Uma entrada diferente é rejeitada para impedir que metadados antigos sejam associados a dados novos. Uma atualização da fonte exige um novo snapshot versionado, revisão dos metadados e da licença, auditoria de qualidade e atualização deliberada dos hashes aprovados no gerador.

```sh
node scripts/build-neighborhood-transport.mjs --source-dir=/caminho/para/sppo-source-v85 --preview=true
node scripts/build-neighborhood-transport.mjs --source-dir=/caminho/para/sppo-source-v85
```

## Regra espacial

Cada ponto válido é comparado aos cinco limites municipais selecionados. Um ponto no interior de exatamente um bairro é atribuído a ele. Um ponto a uma distância de até `1e-9` grau de qualquer segmento de borda é classificado como borda e excluído da contagem. Pontos no interior de mais de um bairro também são excluídos e registrados como sobreposição. A regra considera furos e todas as partes de geometrias Polygon e MultiPolygon.

A validação implementada verifica a estrutura GeoJSON usada pelo algoritmo, posições finitas e anéis fechados. Ela não é uma validação topológica GEOS. O limite municipal é simplificado e limitado em precisão, portanto a classificação serve como orientação espacial e não como verificação de campo.

## Testes e auditoria opcional

A suíte padrão usa geometrias sintéticas e o artefato público, sem depender do snapshot bruto de 7.600 pontos:

```sh
node --test scripts/neighborhood-transport.test.mjs
```

Para reconciliar novamente o snapshot auditado externo, informe o diretório explicitamente:

```sh
SPPO_AUDIT_DIR=/caminho/para/sppo-source-v85 node --test scripts/neighborhood-transport.test.mjs
```

O cadastro não comprova operação atual, horários, frequência, fluxo de passageiros, acessibilidade ou segurança. As contagens de transporte não devem ser correlacionadas causalmente com dados do ISP-RJ ou do IBGE.
