# Câmeras P0 — contrato, avaliação e operação

## O que mudou

A identidade permanente da câmera agora é o `id` do catálogo e sua página pública do operador. O ID de vídeo do YouTube é resolvido quando o detalhe abre, tem validade de 15 minutos e entra no player como **candidato**. Ele só vira “imagem recebida” depois que a API do player informa reprodução e o tempo do vídeo avança. Carregar o iframe, encontrar um ID no HTML ou receber o estado `playing` isoladamente não confirma primeiro quadro nem disponibilidade contínua.

O piloto dinâmico cobre somente `homes-posto-3` e `homes-posto-6`. Em 6/10/2026, as páginas públicas do operador apontavam respectivamente para `7ecGJrsCv60` e `IhGNK_hImLs`. Esses IDs não foram gravados no catálogo e esta descoberta HTTP não certifica que estejam ao vivo. `k2QzfrPLQSg` terminou/ficou indisponível e `Hr7c0XuEgm0` falhou na amostra de produção; ambos ficam apenas no histórico. CamerasRJ mantém a URL derivada do ID permanente do próprio diretório e depende de evento autenticado por origem, janela, câmera e schema para confirmar quadro.

## Segurança e limites

O endpoint aceita somente dois IDs de câmera cadastrados. Cada um resolve uma URL HTTPS fixa em `homesinrio.com`; não aceita URL do visitante, credenciais, host alternativo nem redirecionamento. A consulta tem timeout de 8 segundos, leitura máxima de 512 KB, cache HTTP de 15 minutos e cache curto no isolate. Requisições concorrentes para a mesma câmera compartilham a mesma consulta em andamento; falhas ficam por no máximo 1 minuto. A resposta contém metadados e ID do player, sem imagem ou vídeo. Falhas não reativam o vídeo histórico.

O selo editorial expira após 72 horas. Ele descreve um teste anterior e permanece separado do estado observado nesta sessão. Gravações continuam explicitamente rotuladas como gravação. O fechamento ou troca desmonta o componente e o iframe, removendo os listeners e timers.

## Avaliação reproduzível

Executar:

```sh
node --test scripts/camera-streams.test.mjs scripts/camera-source-priority.test.mjs
node scripts/validate-cameras.mjs
```

Os testes usam respostas controladas e não dependem da disponibilidade de terceiros. Cobrem vídeo encerrado, erro de incorporação, timeout/falha do operador, selo expirado, progresso confirmado, schema inválido, deduplicação do ID encontrado, mismatch câmera/resolvedor, redirect bloqueado e limite de bytes. A rota pode ser conferida manualmente em `/api/cameras/homes-posto-6/stream`; a resposta deve dizer `status: "candidate"` e `X-Camera-Playback: unconfirmed`.

## Próxima rodada de health

Rodar o piloto em três horários e registrar navegador, início da tentativa, primeiro progresso, duração observada, término/erro e link do operador. Promover uma câmera como disponível somente com quadro e progresso observados; expirar o resultado em 72 horas. Ampliar a allowlist operador por operador, depois de confirmar página permanente, formato de descoberta, permissão de incorporação e comportamento de término. Não varrer as 6.685 referências nem armazenar mídia.
