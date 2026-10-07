# Avaliação bounded de fontes públicas e limites

Rodada executada em 2026-10-07T01:47:20Z–2026-10-07T01:47:26Z (2026-10-06 21:47:20–21:47:26, America/New_York), com modelo efetivo reportado pelo executor: `gpt-5.6-luna`. O catálogo local tinha 6.685 referências; a amostra abaixo contém dez referências distintas selecionadas dele. Foi feita uma consulta HTTP por referência, com `fetch`, timeout de 8 s e concorrência 2. O tamanho registrado é o corpo completo retornado nesta tentativa (não houve limite de leitura aplicado ao `arrayBuffer()`); por isso as duas respostas YouTube excedem 512 KiB. Não houve navegador, scraping das 6.685 entradas, download de vídeo ou gravação de mídia.

HTTP 200 e `Content-Type` apenas demonstram que a página respondeu e qual formato foi entregue. Não demonstram primeiro quadro, transmissão ao vivo, continuidade, avanço de tempo, compatibilidade do embed ou estado da câmera.

| referência do catálogo | operador | URL consultada / formato adequado | HTTP | formato | bytes lidos | resultado observável |
| --- | --- | --- | ---: | --- | ---: | --- |
| `homes-posto-3` | Homes in Rio | [página do operador](https://homesinrio.com/rio-de-janeiro-luxury-apartment-webcam) · página HTML | 200 | `text/html; charset=UTF-8` | 387256 | página respondeu; reprodução não avaliada |
| `homes-posto-6` | Homes in Rio | [página do operador](https://homesinrio.com/apartment-rio-de-janeiro-copacabana-beach-webcam) · página HTML | 200 | `text/html; charset=UTF-8` | 364084 | página respondeu; reprodução não avaliada |
| `camerasrj-1698` | CamerasRJ | [página da câmera](https://www.camerasrj.com.br/?bairro=Alto+da+Boa+Vista&camera=1698) · página HTML | 200 | `text/html` | 68384 | página respondeu; não prova imagem ou live |
| `camerasrj-7237` | CamerasRJ | [página da câmera](https://www.camerasrj.com.br/?bairro=Cidade+Nova&camera=7237) · página HTML | 200 | `text/html` | 68385 | página respondeu; não prova imagem ou live |
| `camerasrj-1967` | CamerasRJ | [página da câmera](https://www.camerasrj.com.br/?bairro=Gl%C3%B3ria&camera=1967) · página HTML | 200 | `text/html` | 68385 | página respondeu; não prova imagem ou live |
| `surfconnect-leme` | SurfConnect | [página do operador](https://v1.surfconnect.com.br/leme/) · página HTML | 200 | `text/html; charset=UTF-8` | 33329 | redirecionou para `http://v1.surfconnect.com.br/leme/`; página respondeu |
| `surfconnect-leme-fixa` | SurfConnect | [página do operador](https://v1.surfconnect.com.br/leme-fixa/) · página HTML | 200 | `text/html; charset=UTF-8` | 31244 | redirecionou para `http://v1.surfconnect.com.br/leme-fixa/`; página respondeu |
| `mar-urbano-posto-6` | Instituto Mar Urbano | [página do operador](https://institutomarurbano.com.br/live-cam/) · página HTML | 200 | `text/html; charset=UTF-8` | 180563 | página respondeu; reprodução não avaliada |
| `paineiras-corcovado` | Paineiras Corcovado | [vídeo YouTube catalogado](https://www.youtube.com/watch?v=aRDuS1iqioU) · página YouTube | 200 | `text/html; charset=utf-8` | 1361911 | página respondeu; HTTP não prova live, quadro ou progresso |
| `aviation-tv-galeao` | Aviation TV | [canal de transmissões](https://www.youtube.com/@avtv/streams) · página YouTube | 200 | `text/html; charset=utf-8` | 1255519 | página respondeu; link atual e live não foram certificados |

Os redirecionamentos observados foram preservados como limite de formato/origem; a amostra não tentou converter páginas em URLs de mídia nem consultar o player. A linha de catálogo continua sendo identidade de referência, não garantia de instalação física ou transmissão.

## IBGE, 1746 e Fogo Cruzado

- O piloto IBGE deve reutilizar resultados publicados com atribuição, mas a licença específica do arquivo de entorno/população ainda está `unverified`. A referência primária do [Censo Demográfico 2022](https://www.ibge.gov.br/estatisticas/sociais/trabalho/22827-censo-demografico-2022.html?edicao=35938) descreve o recorte territorial e a unidade de coleta. O documento jurídico do IBGE consultado explicita licença compatível com [CC BY 4.0 para a Malha Municipal Digital e Áreas Territoriais](https://www.ibge.gov.br/biblioteca/visualizacao/livros/liv102152.pdf); isso não foi generalizado para todos os produtos do Censo. Antes de publicar derivação, conferir o metadado/licença do arquivo específico. Atribuição proposta: “Fonte: IBGE, Censo Demográfico 2022, produto/edição e tabela consultados; acesso em 2026-10-07”.
- A tentativa anterior de consulta anônima à interface de dados/serviço 1746 retornou `401 Unauthorized`; não foi criada conta, enviado chamado ou fabricada credencial. O portal confirma que há fluxos anônimos para alguns serviços e que o acompanhamento usa protocolo, mas isso não concede acesso anônimo à tabela histórica. [Informações do DATA.RIO no Portal 1746](https://www.1746.rio/hc/pt-br/articles/10859810205339-Informa%C3%A7%C3%B5es-sobre-o-DATA-RIO) e [login/solicitações](https://www.1746.rio/hc/pt-br/p/solicitacoes) ficam como caminhos pendentes de acesso e auditoria.
- O [Fogo Cruzado](https://api.fogocruzado.org.br/) informa que os dados são livres para consulta, mas a API requer autorização prévia; a [documentação](https://api.fogocruzado.org.br/docs) mantém autenticação e termos como pré-requisito. A integração fica pendente: sem token inventado, sem chamada autenticada e sem inferir cobertura a partir da página pública.

## Integridade e limites de reutilização

O hash SHA-256 do catálogo consultado no checkout foi `dfd54673490c71706ddcbb0c809d59a6d46f43cb9159a1619e6739cbfc3fbee2` (`public/data/public-cameras.json`). Este documento é o registro de verificação de fonte e método; não arquiva HTML, vídeo, screenshot ou resposta de terceiro. A amostra é pontual e não mede percentual de funcionamento. Para afirmar “imagem recebida”, “ao vivo” ou “progresso”, ainda é necessário teste de player com evento de primeiro quadro e avanço observável, em rodada separada e explicitamente datada.
