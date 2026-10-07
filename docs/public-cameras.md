# Câmeras no produto

A camada é parte do mapa existente. Ativar **Câmeras** mostra ruas e referências geográficas, agrupadas conforme o zoom. A consulta de estatísticas mantém seus filtros e pode ser retomada por **Voltar aos registros**.

No computador, a lista fica ao lado do mapa; no celular, abaixo, com atalhos que saem do mapa ampliado. Selecionar uma câmera abre um diálogo nativo acima do mapa, inclusive ampliado. A lista, sua rolagem, os filtros e o zoom permanecem no lugar ao fechar. Localizar no mapa é uma ação separada. A busca aceita câmera, rua e bairro; os filtros distinguem fonte, área visível, acesso sem cadastro e imagens conferidas. Pontos próximos se agrupam; no zoom máximo, selecionar um grupo lista seus IDs individuais. A lista é paginada, e nenhum player carrega antes da seleção.

O detalhe mostra fonte, operador quando conhecido, precisão da referência e a observação histórica separada do estado atual. YouTube e o player público CamerasRJ são incorporados. O CamerasRJ exige origem HTTPS, caminho e ID permitidos; seus eventos são aceitos somente do iframe atual, com origem e ID correspondentes. Há estados de conexão, imagem recebida, falha e interrupção; após 25 segundos sem resposta, oferecemos nova tentativa. O carregamento do iframe YouTube não é tratado como confirmação de vídeo. Ele inicia sem som e permite reprodução inline no celular. Fechar ou desativar a camada desmonta o player.

Outras fontes continuam externas, com essa limitação indicada antes do clique. As páginas SurfConnect do Leme redirecionam para HTTP, incompatível com incorporação no site HTTPS. Cadastro e assinatura continuam sob controle dos operadores. Não há captura, armazenamento ou análise de vídeo.

## Cobertura e precisão

### Cones automáticos

Os cones aparecem automaticamente nas câmeras visíveis e nos grupos pequenos ao aproximar. O visitante apenas navega e seleciona vídeo pelo cone, marcador ou número. Não há editor, sliders ou botão de ajuste na interface pública; valores antigos de localStorage não influenciam o desenho.

Direção, abertura e alcance são responsabilidade editorial do catálogo. Quando falta direção fundamentada, o marcador permanece sem cone direcional; não há fallback para norte. O campo opcional coverage permite incorporar parâmetros pesquisados pela equipe, sem controles para o visitante.

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

### Câmeras sobrepostas

Tocar num cone isolado abre o vídeo correspondente. Cones sobrepostos abrem um seletor ancorado no toque. Marcadores e números têm prioridade sobre os cones abaixo deles. Grupos de até 12 referências abrem a escolha diretamente, sem exigir chegar ao zoom máximo; grupos maiores continuam aproximando até a escala de rua. Referências com coordenadas coincidentes também exibem seus cones na escala de rua, preservando o número para selecionar as alternativas. Não inventamos direções para separar os desenhos.

## Auditoria integral de reprodução — 26/09/2026

A rodada anterior cobria amostras, não todas as referências. O produto agora distingue resultados de reprodução e disponibilidade, mostra data e motivo, e preserva a diferença entre referência cadastrada e vídeo funcionando. A fila integral inclui 6.658 IDs CamerasRJ e 27 referências de outros operadores. Fontes restritas são identificadas sem contornar acesso; isso não confirma sua reprodução.

O auditor CamerasRJ (`scripts/cameras/audit-camerasrj.mjs`) usa quatro processos Chrome independentes e até 40 segundos por ID. Exige track de vídeo, dimensões mínimas, avanço de tempo e de quadros; o MP4 placeholder 16×16 do fornecedor não conta. Falha explícita da fonte, quadros pretos, bloqueio de incorporação, timeout inconclusivo e erro do próprio teste são separados. HTTP 429 impõe espera e recoloca o ID na fila. Arquivo JSONL e resumo são checkpoints locais mutáveis; publique somente snapshots revisados. As referências com coordenadas têm prioridade na fila completa.

`normalize-playback-audit.mjs` converte o checkpoint em resultados revisáveis; `apply-playback-audit.mjs ARRAY_JSON` aplica resultados com timestamp e conserva os mais recentes. `playback-audit-updates.json` preserva as verificações ao regenerar o catálogo. O total exibido no site é o snapshot publicado, não um contador em tempo real do processo local.

Os IDs874,7278 e7279 do cruzamento Lúcio Costa/Érico Veríssimo foram testados no produto e diretamente na fonte. Todos retornaram falha de transmissão/timeout na origem. São referências da mesma fonte CamerasRJ; o endereço compartilhado não comprova equipamentos ou transmissões idênticos. Evidências sanitizadas: `example-three-2026-09-26.json`.

O seletor ordena fontes com reprodução confirmada primeiro. Substituição automática só usa identidade de sinal exata (mesmo vídeo YouTube ou mesma URL de reprodução); mesma coordenada ou nome não autoriza trocar imagens. Testes cobrem preferência pela fonte confirmada, preservação de sinal diferente no mesmo endereço e exclusão de acesso restrito.

### Revisão editorial dos cones — 26/09/2026

Inventário integral: 1.435 CamerasRJ mapeadas, sincronizadas pelo script inventory-calibration.mjs com a auditoria de vídeo, mais 23 de outros operadores inspecionadas em calibration-public-2026-09-26.json. A revisão principal rejeitou sete eixos genéricos sugeridos pelo modelo menor. Só Homes/Copacabana Palace recebeu orientação fundamentada nesta rodada: o operador identifica Edifício Chopin, endereço1782 em seu mapa e direção nordeste. A referência do prédio foi reconciliada com o Plus Code público2RJC+W5 (contexto Rio, código completo589R2RJC+W5), cujo centro foi decodificado em[-43.1795625,-22.9676875]. Isso não confirma a posição da lente. A revisão visual rejeitou converter nordeste em setor nominal45°: o desenho atravessava edifícios e não correspondia bem ao quadro. Nenhum cone foi promovido a calibrado nesta rodada; a posição do prédio foi corrigida. A geometria da lente, obstáculos e altura continuam desconhecidos. Fontes: https://homesinrio.com/rio-de-janeiro-luxury-apartment-webcam e mapa do próprio operador https://homesinrio.com/wp-content/uploads/2021/09/map2.png.
