# Revisão do mapa em comparação com God's Eye View

Revisão de 25/09/2026, consultando o código público da branch main. O objetivo é melhorar a exploração e a confiabilidade do Mapa RJ.

## O que aprender

| Aspecto | God's Eye View | Aplicação no Mapa RJ |
| --- | --- | --- |
| Localização e orientação | Mantém confiança da direção, calibração e origem; identifica orientações sintéticas como estimadas. | Mostrar cruzamento, endereço estimado ou referência de diretório antes de abrir o vídeo. Não desenhar campo de visão sem evidência da direção, lente e instalação. |
| Disponibilidade | Estado de saúde por câmera, mensagem e data; separado do catálogo. | Manter a observação histórica separada do resultado de reprodução no navegador atual. Primeiro quadro, timeout e erro já fazem parte do player. |
| Navegação | Seleção, foco, próxima/anterior e retorno de contexto são operações explícitas. | Preservar busca/zoom e oferecer seleção no ponto; não forçar a lista lateral. Uma próxima etapa útil é alternar entre câmeras próximas com localização confirmada. |
| Reprodução | Um decodificador por câmera ativa, encerramento completo e tentativas limitadas; HLS quando a fonte o fornece. | Continuar carregando só o player selecionado. Adicionar novos formatos apenas para fontes públicas que ofereçam um sinal incorporável e permitido. |
| Desempenho | Limites por distância/escala e trabalho em pequenos lotes. | Agrupar referências e montar somente marcadores visíveis; evitar centenas de vídeos ou miniaturas carregando simultaneamente no celular. |

## Precisão atual

O catálogo possui 6.683 referências, mas somente 1.458 têm coordenadas. Destas, 962 são cruzamentos derivados de nomes e 473 são endereços interpolados na base CADLOG. Não há confirmação física de instalação para esses pontos. As referências restantes provêm de operadores ou diretórios, também com ressalvas de precisão. IDs distintos podem compartilhar coordenadas; não devem ganhar posições artificiais para parecerem equipamentos separados.

O próprio README do God's Eye declara que poses CCTV e áreas de cobertura são estimativas. O código de headingConfidence documenta que algumas direções são derivadas de um hash do ID; não são medições. Portanto, uma apresentação mais detalhada visualmente não demonstra uma posição mais correta. A prioridade do Mapa RJ deve ser evidência de localização e reprodução, seguida da apresentação.

## Como o cone é construído

Nos módulos de geometria examinados, a forma é um frustum (pirâmide de visão), usando latitude/longitude, altura da instalação, direção horizontal, inclinação, campo de visão horizontal e alcance. A meia largura da face distante é `R × tan(FOV_horizontal / 2)`. O campo vertical é derivado da proporção 16:9: `2 × atan(tan(FOV_horizontal / 2) / (16/9))`. A posição e os cantos são projetados sobre a Terra com a direção e inclinação informadas. A textura do vídeo é colocada nessa geometria; projetar a imagem não prova que a orientação foi inferida dela.

O módulo de calibração permite ajustar manualmente sete parâmetros: deslocamento norte/leste, direção, inclinação, abertura, escala de alcance e altura. Esses ajustes são salvos com proveniência manual. Na ativação, um único raio no eixo central consulta o cenário 3D para limitar o plano diante de um obstáculo. Isso não é uma análise de visibilidade densa que verifica cada pixel ou garante ausência de pontos cegos.

As fontes podem trazer direção explícita; outras direções são inferidas de texto, e o fallback usa um hash do ID. O modelo também possui valores padrão para inclinação, abertura e alcance. Não encontrei nesses módulos uma reconstrução automática geral da pose pelas imagens. O README chama as poses CCTV de estimativas grosseiras.

Para um piloto no RJ, primeiro confirmar instalação e usar marcos visíveis georreferenciados para estimar direção/abertura, registrando fonte, responsável e data da calibração. Câmeras móveis/PTZ exigem orientação atual e não admitem um cone fixo confiável. O alcance geométrico tampouco comprova capacidade de identificar detalhes: resolução, zoom, luz e oclusões importam. Só então desenhar um setor aproximado, identificado como estimativa e sem preencher áreas ocultas como se fossem filmadas.

Referências: [geometria](https://github.com/bilawalsidhu/gods-eye-view/blob/main/src/layers/cctv/geometry.js), [dimensões do plano](https://github.com/bilawalsidhu/gods-eye-view/blob/main/src/data/cctvFootprint.js), [calibração](https://github.com/bilawalsidhu/gods-eye-view/blob/main/src/layers/cctv/calibration.js), [valores de pose](https://github.com/bilawalsidhu/gods-eye-view/blob/main/src/layers/cctv/model.js).

## Aplicação nesta rodada

Manter MapLibre e o mapa 2D responsivo nesta rodada. Adotar clareza de origem/precisão, acesso rápido a vídeos conferidos, estado de reprodução e preservação do contexto. Investigar uma visualização 3D somente depois de obter posições e orientações verificáveis e medir seu custo em celulares. Não copiar o estilo de vigilância ou efeitos visuais como se fossem dados reais.

O código do projeto é MIT, com atribuição exigida se houver reutilização de código. Dados e imagens de terceiros têm condições próprias. Esta revisão aproveita conceitos; não incorpora código nem dados do projeto.

## Fontes examinadas

- [README e limitações das poses](https://github.com/bilawalsidhu/gods-eye-view/blob/main/README.md)
- [Confiança da direção](https://github.com/bilawalsidhu/gods-eye-view/blob/main/src/layers/cctv/headingConfidence.js)
- [Disponibilidade por câmera](https://github.com/bilawalsidhu/gods-eye-view/blob/main/src/layers/cctv/health.js)
- [Ciclo de reprodução e limpeza](https://github.com/bilawalsidhu/gods-eye-view/blob/main/src/layers/cctv/videoPlayback.js)
- [Navegação entre câmeras](https://github.com/bilawalsidhu/gods-eye-view/blob/main/src/layers/cctv/navigation.js)
- [Licença](https://github.com/bilawalsidhu/gods-eye-view/blob/main/LICENSE)
- [Atribuição e condições dos dados](https://github.com/bilawalsidhu/gods-eye-view/blob/main/DATA_SOURCES.md)
