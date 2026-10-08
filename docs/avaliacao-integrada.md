# Avaliação integrada

## Checks automatizados

- Os testes iniciais executaram 48 casos: 34 casos em suítes `.mjs` e 14 em suítes `.test.ts` com `--experimental-strip-types`, todos aprovados. Após as alterações finais, os checks adicionais aprovados foram 7 de região, 5 de URL, 6 de analytics e os testes de contribuições; não somar esses grupos novamente ao total inicial.
- `npm run validate:data` passou com 1.476 linhas, 41 CISPs, 41 geometrias, 163 bairros e população reconciliada de 6.211.223. O snapshot mais recente é 2026-08, em fase 2.
- `node scripts/validate-cameras.mjs` passou: 6.685 referências, 1.458 mapeadas, 5.227 pendentes, 1.697 observadas e 2 resolvíveis.
- `npx tsc --noEmit` passou.
- O build Sites final passou e gerou `dist/server/wrangler.json`. O aviso de chunks grandes do Vite não bloqueou o build.

## Fixtures HTTP locais

O preview construído foi exercitado somente em `http://localhost:3001`, com D1 local persistido em `.wrangler/state`, uma aplicação da migração `drizzle/0000_handy_wrecker.sql` e valores locais não sensíveis para `CONTRIBUTION_IP_HASH_SECRET` e `MODERATOR_USER_IDS`. As contribuições foram marcadas como sintéticas; nenhuma câmera real foi alegada.

- Criação de contribuição sintética: 201, com protocolo e estado `pending`.
- Origem diferente: 403. Corpo acima do limite: 413. Honeypot preenchido: 400. Content-Type incorreto: 415. JSON inválido: 400.
- Administração sem identidade: 401. Identidade arbitrária: 403. O header local `oai-authenticated-user-id: local_eval` com allowlist local permitiu listagem 200 e revisão 200; uma tentativa não autorizada retornou 403 e deixou o estado `pending` sem alteração.
- Rate limit: cinco criações aceitas e a sexta no mesmo IP sintético retornou 429.
- Após reiniciar o preview, o protocolo sintético continuou consultável como `pending`, confirmando a persistência no D1 local.

Os headers de identidade usados nos fixtures são exclusivos do preview local. Eles não simulam ou substituem a identidade injetada pelo Sites em produção, e nenhum ID de conta administrativa foi tratado como `MODERATOR_USER_IDS`.

## QA visual e limites

- A contribuição pela interface retornou 201, limpou o formulário e exibiu o protocolo; a página de status manteve o estado `pending`.
- Em viewport móvel emulado de 390 px, o mapa começou a 383 px do topo e a página não apresentou overflow; a primeira tentativa de layout mediu aproximadamente 628,8 px e a baseline observada ficou perto de 600 px antes dos ajustes.
- A contagem contextual de Copa/IBGE exibiu CISP 12 e CISP 13 conforme a fonte usada.
- A câmera CamerasRJ 1698, no Alto da Boa Vista, exibiu imagem de rua. Separadamente, Homes in Rio/Posto 6 resolveu um candidato de transmissão atual, mas o embed do YouTube ficou bloqueado; o player informou a falha e ofereceu os links da fonte e do canal. Estes testes não comprovam live nem disponibilidade contínua.

O preview final permaneceu vivo para a QA visual do root, que verificou a interface pelo navegador integrado. Os fixtures HTTP do executor foram locais; a publicação e a avaliação de produção são registradas separadamente.
