# Fontes, unidades e direitos de uso

A licença MIT cobre o código, **não** os conjuntos de terceiros. Antes de redistribuir dados ou hospedar uma cópia, verifique os termos atuais de cada fonte. A licença de redistribuição da geometria CISP ainda precisa ser confirmada; por isso os arquivos não são versionados aqui.

| Conjunto | Fonte oficial | Uso e frequência |
| --- | --- | --- |
| Estatísticas | [CSV ISP](https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv), [dicionário](https://www.ispdados.rj.gov.br/Arquivos/BaseDpDicionarioDeVariaveis.xlsx) | Série mensal por CISP; casos ou vítimas conforme indicador; sujeita a revisão |
| CISP e bairros | [Relação ISP](https://www.ispdados.rj.gov.br/Arquivos/Relacao_RISPxAISPxCISP.csv) | Associação territorial; não distribui ocorrências entre bairros |
| Geometrias CISP | [SHP ISP](https://www.ispdados.rj.gov.br/Arquivos/CISPshp.rar) | Limites administrativos; sem frequência fixa garantida |
| Bairros | [Prefeitura do Rio](https://services1.arcgis.com/OlP4dGNtIcnD3RYf/ArcGIS/rest/services/db_MI_Bairros/FeatureServer/0) | Camada de contexto, não unidade de contagem policial |
| População | [IBGE Censo 2022](https://www.ibge.gov.br/estatisticas/sociais/trabalho/22827-censo-demografico-2022.html?edicao=41852&t=resultados) | Setores censitários; denominador residente fixo, não população flutuante |
| Mapa-base | [OpenStreetMap](https://www.openstreetmap.org/copyright), [política de tiles](https://operations.osmfoundation.org/policies/tiles/) | Exige atribuição; serviço sem SLA para uso irrestrito, sem download em massa |

## Reprodução territorial

O arquivo derivado `cisp-population.json` documenta as fontes e a auditoria. O cálculo associa cada setor à CISP de maior interseção usando a geometria completa, não a simplificada exibida. Veja `scripts/derive-census-population.py` para argumentos de entrada; são necessários limites oficiais, setores e agregados populacionais compatíveis. Não é uma população oficial publicada diretamente por CISP, nem uma divisão proporcional exata de moradores em setores cortados pelo limite.

Não apresente a taxa como probabilidade de vitimização. Visitantes e trabalhadores não residentes alteram a exposição territorial. Não há microdados de vítimas, boletins individuais ou endereços pessoais no modelo utilizado.

## Arquivos locais

`data:setup` obtém cópias dos cinco artefatos publicados no site de referência, não diretamente todos os arquivos brutos do governo. Os metadados indicam a proveniência; confira-os. O download é opt-in e não resolve a licença de redistribuição. `public/data/` fica fora do Git. Os testes de integração dependem dessas cópias; os unitários não.
