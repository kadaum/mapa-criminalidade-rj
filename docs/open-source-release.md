# Release público

Este documento descreve a preparação de um candidato para o repositório público [kadaum/mapa-criminalidade-rj](https://github.com/kadaum/mapa-criminalidade-rj). O candidato está associado ao rascunho [PR #9](https://github.com/kadaum/mapa-criminalidade-rj/pull/9); não houve merge.

## Verificações históricas da base pública

Use Node.js `>=22.13.0` e uma instalação limpa. A sequência de inicialização é:

```bash
npm ci
npm run prepare:public-data
npm run validate:data
npm run dev
```

O release deve registrar o SHA revisado, o período do snapshot e as validações realmente executadas. A rodada abaixo pertence à preparação histórica da base v58 do PR #9, anterior à reconciliação local com a versão 66:

- `npm ci` limpo;
- `npm run prepare:public-data`, com seis artefatos de runtime e 18 cartões derivados do IBGE;
- `npm run validate:data` aprovado;
- 13 avaliações unitárias e 59 testes Node aprovados, incluindo 5 casos novos de URL e 2 testes de consulta de bairro;
- 20 avaliações de integração aprovadas;
- typecheck, lint restrito ao escopo e build aprovados;
- a auditoria de dependências retornou 0 críticas, 0 moderadas e 9 altas (um advisory de `braces` e oito ocorrências propagadas);

A rodada histórica de runtime confirmou persistência do bairro em troca assíncrona, recarga e abertura/fechamento permanente, além da remoção de consultas inválidas ou privadas, CISP 44 válida e ausência de erros. Essa correção histórica foi publicada no commit [`0c5994c`](https://github.com/kadaum/mapa-criminalidade-rj/commit/0c5994cc4943e24bcbcc0e35f58e4c7b7c1b4d38). O [CI daquela revisão do PR #9](https://github.com/kadaum/mapa-criminalidade-rj/actions/runs/37618602555) passou todas as etapas funcionais e falhou somente em `npm audit --audit-level=high`, com o gate inalterado.

A auditoria permanece registrada e o gate de segurança não foi alterado. Portanto, este registro documenta as verificações executadas e não declara que todos os gates passaram. Para a camada de câmeras, consulte [`docs/camera-p0-evaluation.md`](camera-p0-evaluation.md), incluindo os testes controlados e `node scripts/validate-cameras.mjs`. Para a navegação, consulte [`docs/interface-navigation.md`](interface-navigation.md).

## Higienização antes de publicar

Revise o conteúdo do commit e remova artefatos que não pertencem ao release:

- `.env*`, segredos, tokens, cookies e arquivos de credenciais;
- `.wrangler/`, `.git/` e `node_modules/`;
- segredos, IDs de identidade ou dados de usuário extraídos de `.openai/`; preserve o manifesto de hospedagem necessário ao Sites no contexto privado do projeto;
- caches de pesquisa, dumps locais, logs e bancos locais;
- screenshots ou respostas de terceiros que contenham dados pessoais;
- arquivos gerados que não estejam explicitamente documentados como artefato público.

Não publique endereços exatos de pessoas, protocolos de contribuição, IDs de usuário ou identificadores efêmeros da resolução atual de uma transmissão. IDs públicos permanentes de câmera só devem aparecer quando já fazem parte do catálogo e da fonte pública correspondente. O manifesto revisado de identidade das duas câmeras Homes contém apenas páginas HTTPS estáveis do operador e dois IDs públicos imutáveis de vídeos anteriores, marcados como encerrado ou indisponível para preservar o histórico; ele não contém token, cookie, credencial nem o ID transitório resolvido em tempo de execução.

## Dados e fontes

O escopo confirmado para o repositório público contém os três snapshots estatísticos do ISP-RJ e somente um derivado de terceiro: `public/data/neighborhood-transport.json`, recorte SPPO sob CC BY 4.0 confirmada pela fonte oficial. Os seis conjuntos de terceiros usados pelo bootstrap local, o contexto derivado do IBGE e os cinco cartões PNG de bairro permanecem dados locais ignorados, com licença específica ainda não confirmada; a presença desses arquivos no diretório de trabalho não os torna parte do conteúdo publicável.

Cada atualização deve conservar a atribuição ao ISP-RJ, IBGE, Prefeitura ou operador correspondente. Para uma correção de fonte, registre o recorte temporal, o método de transformação, o hash quando aplicável e a limitação conhecida. A licença MIT cobre o código e não se estende automaticamente às estatísticas, ao catálogo de câmeras, às transmissões, às bases cartográficas ou às derivações de terceiros; confirme a licença específica antes de redistribuir um arquivo novo.

O fluxo de `/contribuir` é moderado dentro do aplicativo. O código de contribuição, o banco e a revisão editorial não devem ser tratados como um canal automático de publicação no GitHub.

## Checklist de publicação

- [ ] O commit contém apenas arquivos revisados e necessários.
- [ ] A validação de dados passou e o período está identificado.
- [ ] Os testes da área alterada passaram sem depender de terceiro autenticado.
- [ ] README, fontes, limitações e atribuições estão coerentes.
- [ ] Artefatos privados e diretórios de desenvolvimento foram excluídos.
- [ ] O release aponta para o mesmo SHA que foi validado localmente.
- [ ] O diff, as fontes e as licenças foram revisados antes da publicação.

## Histórico da preparação e estado local atual

Na preparação histórica de 2026-10-07, a comparação somente leitura foi feita contra `github/main` em `19d51b9886571ccd8e1983aec7e09b5463f894de`. Na conferência inicial de 2026-10-07, o rascunho PR #9 apontava para `689fdf77ba0bf2dc38db2fa901474fdf832f81f6`. A conferência inicial registrou o candidato local antes do envio ao GitHub; os commits e o estado público posterior são acompanhados no PR #9.

O inventário de mudanças deve ser obtido do diff atual; contagens anteriores de arquivos adicionados, modificados ou removidos foram descartadas por estarem desatualizadas. Também foram removidas deste registro referências a diretórios temporários e caminhos absolutos internos.

Os três snapshots estatísticos do ISP-RJ e o recorte derivado SPPO são os únicos dados confirmados para o repositório público. Os seis artefatos de terceiros, o contexto IBGE e os cinco cartões de bairro podem continuar no diretório de trabalho para validação local, mas permanecem ignorados e fora do escopo publicável até que suas licenças sejam confirmadas. O snapshot bruto de 7.600 pontos, qualquer geometria, ZIP, SHP, XLSX, dicionário ou outro arquivo bruto do IBGE não faz parte do escopo público confirmado.

O rascunho PR #9 acompanha a preparação, sem merge. A auditoria de dependências continua bloqueando o gate conforme o resultado atual v81 descrito abaixo; as contagens anteriores são registros históricos. A evidência detalhada da rodada local v66 está no relatório persistente da auditoria local.

## Paridade local com a versão 66

Em 2026-10-07, o candidato local foi reconciliado com a aplicação nativa no commit `69aafa0a273677c010cda6fb6224490d20c223b4`, preservando as diferenças necessárias do espelho público. Foram incorporadas as correções de carregamento assíncrono do mapa, legenda de variação, navegação e retorno de câmeras, foco acessível, compartilhamento, metadados de páginas de bairro, cabeçalho móvel e identidade estável das duas câmeras Homes.

O manifesto `research/cameras/stream-identities.json` é a única exceção ao bloqueio do diretório de pesquisa. O arquivo é validado com esquema fechado e contém somente as duas páginas públicas fixas do operador, seus resolvers allowlisted e os dois IDs públicos históricos descritos acima. Todos os demais arquivos de pesquisa continuam ignorados.

Os dois cards sociais de câmera incluídos são arte original gerada pelo próprio projeto com formas e texto. Eles não incluem frame de transmissão, foto, logomarca, geometria, valor do IBGE ou outro conteúdo de terceiro; os nomes públicos de câmera, operador e bairro servem apenas como identificação e atribuição. A inclusão desses PNGs não altera nem amplia a licença do catálogo, das transmissões, das bases geográficas ou dos dados do IBGE.

O registro de dependências da rodada local v66 é histórico: naquela rodada, o candidato mantinha `vinext` `1.0.0-beta.9` e o lockfile da base pública; `npm audit --audit-level=high` apontou nove ocorrências do advisory de `braces`, e a correção forçada sugerida envolvia uma troca incompatível de `shadcn`. Esse texto descreve a evidência v66, não o manifesto nem a auditoria atuais.

No estado corrente v81, o pacote de CLI `shadcn@4.18.0` foi removido porque era usado somente para importar o CSS. O payload CSS continua no repositório como `app/vendor/shadcn-tailwind-4.18.0.css`, acompanhado da atribuição e licença MIT em `LICENSES/shadcn-4.18.0.txt`; o pacote distinto `@shadcn/react@0.3.0` permanece no manifesto. A árvore do lockfile passou de 731 para 469 nós: 262 nós removidos, nenhum adicionado e nenhuma alteração de versão nos pacotes retidos. O CSS compilado permaneceu byte a byte idêntico entre v80 e v81.

O CI do v81, no commit `eebe9d23cb59d7685aec2b8084449f484f845b69` ([execução 37697070017](https://github.com/kadaum/mapa-criminalidade-rj/actions/runs/37697070017)), passou todas as etapas funcionais e falhou somente em `npm audit --audit-level=high`. A auditoria atual encontrou seis ocorrências altas na cadeia `vinext` → `commonjs` → `dynamic-import` → `fast-glob` → `micromatch` → `braces` (`GHSA-vfj7-8cjw-p6xm`). A sugestão de correção forçada propõe `vinext@0.0.15`, uma alteração incompatível que não foi aplicada. O gate continua sem waiver, override ou atualização forçada; portanto, o CI não está totalmente aprovado.

O workflow público agora executa explicitamente a validação do catálogo de câmeras, os testes isolados de reconstrução da identidade e as avaliações de integração. As permissões mínimas, ações fixadas por SHA e o gate `npm audit --audit-level=high` permanecem inalterados.
