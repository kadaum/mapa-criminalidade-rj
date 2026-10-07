# Release público

Este documento descreve a preparação de um candidato para o repositório público [kadaum/mapa-criminalidade-rj](https://github.com/kadaum/mapa-criminalidade-rj). O candidato está associado ao rascunho [PR #9](https://github.com/kadaum/mapa-criminalidade-rj/pull/9); não houve merge.

## Verificações locais

Use Node.js `>=22.13.0` e uma instalação limpa. A sequência de inicialização é:

```bash
npm ci
npm run prepare:public-data
npm run validate:data
npm run dev
```

O release deve registrar o SHA revisado, o período do snapshot e as validações realmente executadas. A rodada registrada para este candidato foi:

- `npm ci` limpo;
- `npm run prepare:public-data`, com seis artefatos de runtime e 18 cartões derivados do IBGE;
- `npm run validate:data` aprovado;
- 13 avaliações unitárias e 59 testes Node aprovados, incluindo 5 casos novos de URL e 2 testes de consulta de bairro;
- 20 avaliações de integração aprovadas;
- typecheck, lint restrito ao escopo e build aprovados;
- a auditoria de dependências retornou 0 críticas, 0 moderadas e 9 altas (um advisory de `braces` e oito ocorrências propagadas);

A rodada final de runtime confirmou persistência do bairro em troca assíncrona, recarga e abertura/fechamento permanente, além da remoção de consultas inválidas ou privadas, CISP 44 válida e ausência de erros. A correção foi publicada no commit [`0c5994c`](https://github.com/kadaum/mapa-criminalidade-rj/commit/0c5994cc4943e24bcbcc0e35f58e4c7b7c1b4d38). O [CI do PR #9](https://github.com/kadaum/mapa-criminalidade-rj/actions/runs/37618602555) passou todas as etapas funcionais e falhou somente em `npm audit --audit-level=high`, com o gate inalterado.

A auditoria permanece registrada e o gate de segurança não foi alterado. Portanto, este registro documenta as verificações executadas e não declara que todos os gates passaram. Para a camada de câmeras, consulte [`docs/camera-p0-evaluation.md`](camera-p0-evaluation.md), incluindo os testes controlados e `node scripts/validate-cameras.mjs`. Para a navegação, consulte [`docs/interface-navigation.md`](interface-navigation.md).

## Higienização antes de publicar

Revise o conteúdo do commit e remova artefatos que não pertencem ao release:

- `.env*`, segredos, tokens, cookies e arquivos de credenciais;
- `.wrangler/`, `.git/` e `node_modules/`;
- segredos, IDs de identidade ou dados de usuário extraídos de `.openai/`; preserve o manifesto de hospedagem necessário ao Sites no contexto privado do projeto;
- caches de pesquisa, dumps locais, logs e bancos locais;
- screenshots ou respostas de terceiros que contenham dados pessoais;
- arquivos gerados que não estejam explicitamente documentados como artefato público.

Não publique endereços exatos de pessoas, protocolos de contribuição, IDs de usuário ou identificadores efêmeros de transmissão. IDs públicos permanentes de câmera só devem aparecer quando já fazem parte do catálogo e da fonte pública correspondente.

## Dados e fontes

O escopo confirmado para o repositório público contém somente os três snapshots estatísticos do ISP-RJ. Os seis conjuntos de terceiros usados pelo bootstrap local, o contexto derivado do IBGE e os cinco cartões PNG de bairro permanecem dados locais ignorados, com licença específica ainda não confirmada; a presença desses arquivos no diretório de trabalho não os torna parte do conteúdo publicável.

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

## Preparação atual do candidato

Em 2026-10-07, a comparação somente leitura foi feita contra `github/main` em `19d51b9886571ccd8e1983aec7e09b5463f894de`. O candidato revisável está na branch local `release/candidate-from-github-main-2026-10`, no diretório do candidato; ele não foi enviado ao GitHub. O histórico Git persistente usado pela worktree fica no diretório de apoio da release, e o índice parte desse SHA para preservar a comparação sem substituir os arquivos candidatos existentes.

O inventário de mudanças deve ser obtido do diff atual; contagens anteriores de arquivos adicionados, modificados ou removidos foram descartadas por estarem desatualizadas. Também foram removidas deste registro referências a diretórios temporários e caminhos absolutos internos.

Os três snapshots estatísticos do ISP-RJ são os únicos dados confirmados para o repositório público. Os seis artefatos de terceiros, o contexto IBGE e os cinco cartões de bairro podem continuar no diretório de trabalho para validação local, mas permanecem ignorados e fora do escopo publicável até que suas licenças sejam confirmadas. Nenhum ZIP, SHP, XLSX, dicionário ou outro arquivo bruto do IBGE faz parte do escopo público confirmado.

O rascunho PR #9 acompanha esta preparação; não houve merge. A auditoria de dependências permanece pendente conforme o resultado registrado acima; o gate de segurança permanece inalterado. A evidência detalhada da rodada final está no relatório persistente da auditoria local.
