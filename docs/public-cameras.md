# Câmeras no produto

A camada é parte do mapa existente. Ativar **Câmeras** mostra ruas e referências geográficas, agrupadas conforme o zoom. A consulta de estatísticas mantém seus filtros e pode ser retomada por **Voltar aos registros**.

No computador, a lista fica ao lado do mapa; no celular, abaixo, com atalhos que saem do mapa ampliado. Selecionar uma câmera abre um diálogo nativo acima do mapa, inclusive ampliado. A lista, sua rolagem, os filtros e o zoom permanecem no lugar ao fechar. Localizar no mapa é uma ação separada. A busca aceita câmera, rua e bairro; os filtros distinguem fonte, área visível, acesso sem cadastro e imagens conferidas. Pontos próximos se agrupam; no zoom máximo, selecionar um grupo lista seus IDs individuais. A lista é paginada, e nenhum player carrega antes da seleção.

O detalhe mostra fonte, operador quando conhecido, precisão da referência e a observação histórica separada do estado atual. YouTube e o player público CamerasRJ são incorporados. O CamerasRJ exige origem HTTPS, caminho e ID permitidos; seus eventos são aceitos somente do iframe atual, com origem e ID correspondentes. Há estados de conexão, imagem recebida, falha e interrupção; após 25 segundos sem resposta, oferecemos nova tentativa. O carregamento do iframe YouTube não é tratado como confirmação de vídeo. Ele inicia sem som e permite reprodução inline no celular. Fechar ou desativar a camada desmonta o player.

Outras fontes continuam externas, com essa limitação indicada antes do clique. As páginas SurfConnect do Leme redirecionam para HTTP, incompatível com incorporação no site HTTPS. Cadastro e assinatura continuam sob controle dos operadores. Não há captura, armazenamento ou análise de vídeo.

## Cobertura e precisão

### Simulação manual de campo de visão

Uma referência com coordenadas permite abrir **Simular campo de visão no mapa**, tanto pelo detalhe do vídeo quanto pela identificação de uma câmera individual no mapa. O setor tem direção, abertura horizontal e raio editáveis; a direção também pode ser apontada no mapa. É sempre rotulado como simulação manual não calibrada. Os parâmetros iniciais são exemplos, não dados da instalação, e não há análise de obstáculos ou altura. Salvar grava apenas os parâmetros locais no navegador. Câmeras sem coordenadas não oferecem esse comando. Fechar remove o setor e retoma os cliques normais nos agrupamentos.

No modo câmeras, **Ruas/Satélite** e **2D/Perspectiva** ficam na barra acima do mapa. O satélite é opcional e não é imagem ao vivo. A perspectiva inclina a base, sem criar prédios3D. A vista geral e a saída do modo câmeras retornam à vista superior. O cone fica abaixo dos marcadores, com contorno tracejado; seu painel substitui a legenda para evitar sobreposição.

Os números no mapa aproximam os agrupamentos até separar as referências. Quando a expansão ultrapassaria o zoom permitido (incluindo coordenadas compartilhadas), um seletor ancorado ao ponto mostra nomes e IDs. Não deslocamos marcadores para simular locais distintos. Câmeras individuais mostram nome e ação de vídeo no próprio mapa. O fluxo não exige abrir a lista lateral. Verificado por cliques no canvas em desktop e celular emulado, incluindo expansão além do zoom 14, grupo de três referências no mesmo ponto e abertura/fechamento do vídeo.

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

### Busca ampliada de 25/09/2026

Dois novos sinais Aviation TV (Santos Dumont e Galeão) foram encontrados no canal oficial, sem duplicatas no catálogo. Ambos tinham metadados de transmissão em andamento e reproduziram pelo player oficial incorporado; o produto também confirmou avanço de tempo e quadros em telas de 390 e 1440 px. As instalações não têm coordenadas verificadas, portanto os vídeos são acessíveis pelo bloco de reprodução conferida, sem marcador fictício no aeroporto. IDs do canal mudam periodicamente: a data da conferência e o link permanente do operador são exibidos; não há promessa de atualização automática desses IDs.

A amostra independente de nove referências confirmou vídeo em Homes Postos 3/6 e CamerasRJ 7237/1967. Paineiras reproduz uma gravação encerrada em 08/09, agora identificada como tal. Três CamerasRJ da amostra não entregaram quadros no navegador testado; não há evidência para rotular todas como offline ou falha de codec. Mar Urbano não reproduziu nas duas páginas públicas verificadas. Nenhuma fonte além do YouTube adicional foi aprovada nesta rodada. As evidências, candidatas rejeitadas e restrições estão nos arquivos `research/cameras/*2026-09-25.json`; não extrapolar a amostra para todo o catálogo.

O catálogo passa a 6.685 referências, mantendo 1.458 pontos no mapa. `reviewed-additions.json` preserva as novas entradas na regeneração. A revisão comparativa e o cálculo dos cones do God's Eye estão em `docs/gods-eye-review.md`.

Na investigação de telas pretas em 25/09/2026, as amostras CamerasRJ 1192, 1193 e 1173 retornaram erro de formato incompatível em Chrome com emulação móvel. A fonte pode alternar erro e reconexão automaticamente. O produto agora mantém a falha até uma tentativa explícita, desmonta o iframe e mostra a explicação no lugar do vídeo. O evento simples `playing` não confirma imagem: a confirmação usa a métrica de primeiro quadro do player (ou seu fallback após dados decodificados). Enquanto aguarda, há uma mensagem visível; o limite de 25 segundos encerra tentativas sem confirmação. O teste controlado cobre erro seguido de reconexão, descarte do evento simples, primeiro quadro, retry e timeout. Uma câmera transmitir em uma amostra não comprova disponibilidade permanente ou compatibilidade em outro aparelho.

Imagem conferida significa reprodução observada na data indicada, não disponibilidade contínua. As observações ficam em `research/cameras/playback-observations.json`. Homes Postos 3 e 6 reproduziram no produto. Leme reproduziu com data embutida 14/01/2000; a ressalva de horário inconsistente permanece visível. Os demais sinais não receberam selo de imagem conferida só por existirem em catálogo.

Na revisão de 25/09/2026, o player CamerasRJ 49 recebeu vídeo no produto, com buffering durante a amostra. A transmissão antiga do Posto 6 estava indisponível; o novo ID foi localizado no canal oficial Homes in Rio e testado com avanço de vídeo. Atualizações individuais ficam em `research/cameras/reviewed-updates.json`, aplicadas também pelo montador do catálogo. A data geral do levantamento não implica revisão de todas as 6.683 referências. Eventos do YouTube indicam reprodução, término e falhas; respostas de oEmbed e carregamento do iframe sozinhos não confirmam transmissão.

Verificação da interface em Chrome com telas 320×667, 390×844 e 1440×900: diálogo acima do mapa ampliado, fechar/Escape, preservação de busca/rolagem/zoom, ausência de overflow e desmontagem do iframe. Teste controlado do protocolo: rejeição de origem e ID incorretos, reprodução, interrupção, timeout e nova tentativa. Emulação de celular não substitui teste em aparelho físico.

## Referência à polícia

A pessoa pode copiar identificação, local e fontes e completar data, horário/fuso e endereço do ocorrido fora do site. Não são coletados BO, documentos ou dados pessoais. A autoridade avalia eventual solicitação ao responsável; não há garantia de filmagem, armazenamento ou entrega.

A [CIVITAS](https://civitas.rio/) informa acesso por autoridades de segurança e Justiça mediante ofício. A [reserva do 1746](https://www.1746.rio/hc/pt-br/articles/10872730317339-Informa%C3%A7%C3%B5es-sobre-imagens-das-c%C3%A2meras-de-monitoramento) atende fatos cíveis/administrativos e exclui roubos, furtos e imagens da CIVITAS. Não aplicar seus prazos às investigações criminais ou a operadores privados.

## Atualização e atribuição

Os arquivos em `scripts/cameras/` recebem caches de pesquisa explicitamente. `normalize-catalog.py` normaliza somente a lista pública bairro/ID/caption; `fetch-streets.py` baixa a base oficial em lotes; `geocode-intersections.py` cruza nomes e vértices com tolerância máxima de 15 m, recusando interseções ambíguas; `geocode-addresses.mjs` interpola endereços em um único segmento com faixa oficial compatível, respeitando paridade, nome, bairro e limites municipais; `assemble-catalog.py` produz os arquivos públicos a partir de resultados revisados. Não rodar downloads completos em testes ou no navegador do visitante.

A fonte CADLOG é [IPP/Prefeitura do Rio, CC BY 4.0](https://www.arcgis.com/home/item.html?id=899168c8feab4230a9f795ed07cdde7b). As transformações e IDs oficiais estão preservados. A licença MIT do código e PDDL das estatísticas criminais não se estendem ao catálogo CamerasRJ, às transmissões ou aos demais diretórios.

## Verificação

`node scripts/validate-cameras.mjs` verifica unicidade, links sem autenticação, estrutura, IDs de vídeo distintos, precisão declarada, paridade e faixa dos endereços e pertencimento dos pontos derivados ao município. TypeScript, lint e build verificam a implementação. QA no navegador cobre desktop e celular, reprodução, cópia idêntica ao texto visível, referência sem coordenada, retorno às estatísticas e remoção do player. O levantamento não faz varredura de reprodução dos milhares de sinais.
