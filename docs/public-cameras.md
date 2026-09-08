# Câmeras no produto

A camada é parte do mapa existente. Ativar **Câmeras** mostra ruas e referências geográficas, agrupadas conforme o zoom. A consulta de estatísticas mantém seus filtros e pode ser retomada por **Voltar aos registros**.

No computador, lista e detalhe ficam ao lado do mapa. No celular, aparecem abaixo, com atalhos entre mapa e detalhe. A busca aceita câmera, rua e bairro; os filtros distinguem fonte, área visível, acesso sem cadastro e imagens conferidas. Pontos próximos se agrupam; no zoom máximo, selecionar um grupo lista seus IDs individuais. A lista é paginada, e nenhum player carrega até o visitante pedir.

O detalhe mostra fonte, operador quando conhecido, precisão da referência e status de reprodução. Players YouTube usam incorporação oficial; outras fontes abrem em sua página pública. Voltar ou desativar a camada remove o iframe. Não há captura, armazenamento ou análise de vídeo.

## Cobertura e precisão

O catálogo em `public/data/public-cameras.json` contém as referências encontradas nas fontes consultadas. Não representa todas as câmeras instaladas na cidade nem todas as transmissões funcionando. A contagem é por ID de catálogo, não por suporte físico. As coordenadas não representam campo de visão.

- **CamerasRJ:** catálogo público com 6.658 IDs e 146 grupos de bairros, incluindo um grupo indefinido. Não se atribui ao agregador a operação dos equipamentos. As referências podem falhar por origem, rede ou compatibilidade de codec.
- **CADLOG:** nomes de ruas e bairros oficiais permitem derivar cruzamentos conservadoramente. A evidência de cada referência fica em `public/data/camera-location-evidence.json`. Interseção é referência do cruzamento; endereço interpolado é estimativa na via, nunca posição medida do equipamento.
- **SurfConnect:** 21 páginas, com acesso livre, cadastro ou assinatura explícitos. A posição publicada é do pico de praia. Uma coordenada de Prainha foi rejeitada por reutilizar Macumba. As duas vistas do Leme e outras câmeras no mesmo pico permanecem IDs distintos, sem deduplicação arbitrária por coordenada.
- **Homes in Rio:** Postos 3 e 6 são transmissões distintas, com localização aproximada de diretório. Instituto Mar Urbano é outro operador no Posto 6.
- **Paineiras Corcovado:** a transmissão encontrada permanece sem marcador até localizar a instalação. Não se usou a coordenada do Cristo como substituta.

### Resultado da auditoria de instalação

Na revisão atual, nenhuma referência tem confirmação física do ponto de montagem. As 962 referências de cruzamento e 473 de endereço em `public/data/camera-location-evidence.json` são pontos derivados do CADLOG: o cruzamento identifica a referência da esquina e o endereço é interpolado na via. As coordenadas não devem ser lidas como posição do poste, prédio ou suporte da câmera.

IDs que compartilham a mesma coordenada, inclusive grupos de três ou mais, podem ser transmissões ou variações do catálogo que receberam a mesma referência derivada. Isso não comprova três equipamentos no mesmo ponto. O Posto 6 da Homes in Rio publica um endereço, mas o marcador continua vindo de diretório e não confirma o local de montagem.

Para classificar uma posição como precisa, será necessária uma confirmação do operador que vincule o ID a um registro de instalação com coordenada levantada, ou uma evidência datada, identificável e georreferenciada que mostre o equipamento. Até lá, a interface e as referências copiáveis devem manter a ressalva de que a posição exata do equipamento não foi confirmada.

Como próxima etapa, pode ser feita uma amostra de 10 a 20 referências, distribuída entre cruzamentos CADLOG, endereços interpolados e endereços publicados por operadores, para tentar obter esse tipo de confirmação diretamente com as fontes. Essa amostra serve para medir a verificabilidade e ajustar os rótulos; não promete cobertura exata do catálogo inteiro.

Diretórios que repetem as mesmas transmissões não entram como novas câmeras. Links removidos, transmissões encerradas, passeios móveis, mapas genéricos e páginas que só prometem câmera futura ficam no inventário de pesquisa. Nenhum endpoint interno ou autenticado compõe a base.

## Disponibilidade

Imagem conferida significa reprodução observada na data indicada, não disponibilidade contínua. As observações ficam em `research/cameras/playback-observations.json`. Homes Postos 3 e 6 reproduziram no produto. Leme reproduziu com data embutida 14/01/2000; a ressalva de horário inconsistente permanece visível. Os demais sinais não receberam selo de imagem conferida só por existirem em catálogo.

## Referência à polícia

A pessoa pode copiar identificação, local e fontes e completar data, horário/fuso e endereço do ocorrido fora do site. Não são coletados BO, documentos ou dados pessoais. A autoridade avalia eventual solicitação ao responsável; não há garantia de filmagem, armazenamento ou entrega.

A [CIVITAS](https://civitas.rio/) informa acesso por autoridades de segurança e Justiça mediante ofício. A [reserva do 1746](https://www.1746.rio/hc/pt-br/articles/10872730317339-Informa%C3%A7%C3%B5es-sobre-imagens-das-c%C3%A2meras-de-monitoramento) atende fatos cíveis/administrativos e exclui roubos, furtos e imagens da CIVITAS. Não aplicar seus prazos às investigações criminais ou a operadores privados.

## Atualização e atribuição

Os arquivos em `scripts/cameras/` recebem caches de pesquisa explicitamente. `normalize-catalog.py` normaliza somente a lista pública bairro/ID/caption; `fetch-streets.py` baixa a base oficial em lotes; `geocode-intersections.py` cruza nomes e vértices com tolerância máxima de 15 m, recusando interseções ambíguas; `geocode-addresses.mjs` interpola endereços em um único segmento com faixa oficial compatível, respeitando paridade, nome, bairro e limites municipais; `assemble-catalog.py` produz os arquivos públicos a partir de resultados revisados. Não rodar downloads completos em testes ou no navegador do visitante.

A fonte CADLOG é [IPP/Prefeitura do Rio, CC BY 4.0](https://www.arcgis.com/home/item.html?id=899168c8feab4230a9f795ed07cdde7b). As transformações e IDs oficiais estão preservados. A licença MIT do código e PDDL das estatísticas criminais não se estendem ao catálogo CamerasRJ, às transmissões ou aos demais diretórios.

## Verificação

`node scripts/validate-cameras.mjs` verifica unicidade, links sem autenticação, estrutura, IDs de vídeo distintos, precisão declarada, paridade e faixa dos endereços e pertencimento dos pontos derivados ao município. TypeScript, lint e build verificam a implementação. QA no navegador cobre desktop e celular, reprodução, cópia idêntica ao texto visível, referência sem coordenada, retorno às estatísticas e remoção do player. O levantamento não faz varredura de reprodução dos milhares de sinais.
