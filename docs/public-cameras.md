# Catálogo público de câmeras — piloto

Decisão de 08/09/2026: camada opcional de transmissões públicas e referências que o cidadão pode levar à polícia. Sem captura, armazenamento, reconhecimento de pessoas, detecção de crimes ou envio de ocorrências.

## Cobertura

Um ponto inicial: Homes in Rio, Copacabana/Posto 6. Endereço publicado pelo operador: Avenida Atlântica, 3950. Coordenadas do diretório Worldcam, contribuídas por usuário, identificadas como aproximadas em toda a interface. Não representam posição medida do equipamento ou campo de visão. A câmera é panorâmica e muda de direção.

- Operador/endereço/player: https://homesinrio.com/apartment-rio-de-janeiro-copacabana-beach-webcam
- Marcador: https://worldcam.eu/webcams/south-america/brazil/40611-rio-de-janeiro-copacabana-posto-6
- Player original: https://www.youtube.com/watch?v=IhGNK_hImLs

A imagem foi observada funcionando em 08/09/2026, inclusive no player incorporado do piloto. Isso não é monitoramento de disponibilidade. O player só carrega após ação do visitante e é removido ao fechar o detalhe.

CamerasRJ, SkylineWebcams e app COR.Rio são referências externas. Não foram importadas contagens anunciadas como câmeras verificadas. Os players CamerasRJ 1197 e 49 falharam no teste; isso não comprova indisponibilidade de todo o catálogo. O aplicativo nativo COR.Rio não foi testado. Skyline pode repetir o mesmo equipamento de outras fontes.

## Inclusão de novos pontos

Atualizar `lib/public-cameras.ts` apenas com transmissões publicadas intencionalmente para acesso público, fonte do operador, evidência de endereço, fonte da coordenada e data de observação. O contrato atual aceita apenas localização aproximada explicitamente identificada. Não inferir a localização de uma câmera a partir da sede da empresa, centro do bairro ou uma cena reconhecida sem evidência. Não importar endpoints internos ou autenticados. Conferir duplicatas e pertencimento ao município. Para operadores diferentes do YouTube, implementar primeiro a política adequada de player ou link externo.

## Orientação ao cidadão

A referência copiável contém identificação, endereço e fontes; a pessoa completa data, horário/fuso e local do ocorrido fora do site. Não coleta documentos, BO ou dados pessoais. A existência de câmera próxima não comprova filmagem nem arquivo disponível.

Para câmeras da Prefeitura, a CIVITAS informa acesso por autoridades de segurança e Justiça mediante ofício. A reserva do 1746 tem escopo cível/administrativo e exclui roubos, furtos e imagens da CIVITAS. Não aplicar os prazos desse serviço a investigações criminais ou ao operador privado.

- https://civitas.rio/
- https://www.1746.rio/hc/pt-br/articles/10872730317339-Informa%C3%A7%C3%B5es-sobre-imagens-das-c%C3%A2meras-de-monitoramento

## Validação do piloto

Build, TypeScript e lint dos arquivos alterados. Teste no navegador em 390 × 844: abrir catálogo/detalhe, reprodução real do player, referência copiada idêntica ao texto visível e remoção do iframe ao fechar. Sem promessa de disponibilidade contínua, cobertura integral da cidade ou recuperação de vídeo.
