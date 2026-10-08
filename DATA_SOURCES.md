# Fontes, unidades e direitos de uso

A licença MIT cobre o código, **não** os conjuntos de terceiros. Antes de redistribuir dados ou hospedar uma cópia, verifique os termos atuais de cada fonte. Este candidato versiona os snapshots estatísticos do ISP-RJ cuja publicação no catálogo estadual indica PDDL e o recorte derivado de transporte do SPPO cuja fonte oficial confirma CC BY 4.0. As licenças específicas das geometrias, relações territoriais, população derivada e catálogo de câmeras ainda precisam ser confirmadas; esses arquivos ficam ignorados pelo Git.

| Conjunto | Fonte oficial | Uso e frequência |
| --- | --- | --- |
| Estatísticas | [CSV ISP](https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv), [dicionário](https://www.ispdados.rj.gov.br/Arquivos/BaseDpDicionarioDeVariaveis.xlsx) | Série mensal por CISP; casos ou vítimas conforme indicador; sujeita a revisão; catálogo estadual indica PDDL |
| CISP e bairros | [Relação ISP](https://www.ispdados.rj.gov.br/Arquivos/Relacao_RISPxAISPxCISP.csv) | Associação territorial; não distribui ocorrências entre bairros |
| Geometrias CISP | [SHP ISP](https://www.ispdados.rj.gov.br/Arquivos/CISPshp.rar) | Limites administrativos; sem frequência fixa garantida |
| Bairros | [Prefeitura do Rio](https://services1.arcgis.com/OlP4dGNtIcnD3RYf/ArcGIS/rest/services/db_MI_Bairros/FeatureServer/0) | Camada de contexto, não unidade de contagem policial |
| População | [IBGE Censo 2022](https://www.ibge.gov.br/estatisticas/sociais/trabalho/22827-censo-demografico-2022.html?edicao=41852&t=resultados) | Derivação por setores censitários; denominador residente fixo, não população flutuante |
| Câmeras | Catálogos e páginas públicas descritos em [docs/public-cameras.md](docs/public-cameras.md) | Referências e evidências de disponibilidade; não contém vídeo; disponibilidade muda |
| Transporte | [Camada municipal Paradas do SPPO](https://www.arcgis.com/home/item.html?id=fd07613c9a1c45299389c0f7cff8e2a0) | Recorte derivado de pontos cadastrados nos cinco bairros piloto; fonte oficial confirma CC BY 4.0; não confirma operação |
| Mapa-base | [OpenStreetMap](https://www.openstreetmap.org/copyright), [política de tiles](https://operations.osmfoundation.org/policies/tiles/) | Exige atribuição; serviço sem SLA para uso irrestrito, sem download em massa |

## Bootstrap local

`npm run prepare:public-data` obtém somente os seis nomes allowlisted abaixo do snapshot público existente em `mapa-criminalidade-rj.ricardoguia.com`, valida cada JSON com timeout, limite de tamanho e redirects restritos ao mesmo host, e depois produz o contexto e os cards locais:

- `camera-location-evidence.json`
- `cisp-neighborhoods.json`
- `cisp-population.json`
- `cisp-rio.geojson`
- `neighborhoods-rio.geojson`
- `public-cameras.json`

O bootstrap não usa credenciais, não baixa mídia e não concede licença de redistribuição. Os metadados internos e a documentação de cada fonte preservam a proveniência. Esses seis artefatos, `neighborhood-context.json` e os cinco cards `bairro-*.png` são saídas locais ignoradas pelo Git. O único derivado de terceiro versionado além dos três snapshots do ISP-RJ é `public/data/neighborhood-transport.json`; ele contém somente o recorte SPPO documentado em [docs/neighborhood-transport.md](docs/neighborhood-transport.md), não o snapshot bruto de 7.600 pontos nem arquivos de geometria, IBGE, câmeras, credenciais ou dados de usuário.

## Reprodução territorial

`cisp-population.json` associa cada setor censitário à CISP de maior interseção usando a geometria completa, não a simplificada exibida. Veja `scripts/derive-census-population.py` para os argumentos de entrada. Não é uma população oficial publicada diretamente por CISP nem uma divisão proporcional exata de moradores em setores cortados pelo limite.

Não apresente a taxa como probabilidade de vitimização. Visitantes e trabalhadores não residentes alteram a exposição territorial. Não há microdados de vítimas, boletins individuais ou endereços pessoais no modelo utilizado.
