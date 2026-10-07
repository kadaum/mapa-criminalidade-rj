# Atualização da fonte e publicação

## Fonte e responsabilidade

O conjunto mensal por CISP vem do CSV oficial do ISP-RJ. O arquivo publicado guarda URL, `Last-Modified`, SHA-256, data de coleta e competência. A geometria de bairros vem da Prefeitura do Rio; a geometria completa das CISPs, do ISP; população residente, do Censo 2022/IBGE. A metodologia do site explica a alocação da população aos limites de CISP e seus limites interpretativos.

## Rotina semanal

1. No checkout da Site, rodar `node scripts/sync-data.mjs`, `node scripts/sync-history.mjs`, `node scripts/check-population-source.mjs` e `node scripts/validate-data.mjs`.
2. Conferir `latestPeriod`, hash e datas em `public/data/crime-rio-snapshot.json`; comparar com o período anterior. A validação exige 41 CISPs por mês, chave CISP/mês única, meses contíguos e contagens inteiras não negativas. Examinar mudanças de fase ou definição diretamente no ISP antes de publicar.
3. Rodar `node --test scripts/*.test.mjs`, TypeScript, lint, build e `node scripts/eval-organic.mjs` contra a versão local. Confirmar ao menos uma CISP, um indicador, sitemap e download em navegador móvel e desktop.
4. Commitar apenas fonte e artefatos validados, enviar o commit à branch de origem da Site, criar a versão a partir do **mesmo SHA** e do build daquele SHA, publicar preservando acesso público e conferir status final. Depois, testar URLs e contagens na produção.
5. Registrar versão, SHA, período, hash da fonte, resultados e limitações no diário de release. Se o ISP não responder ou a validação falhar, deixar a versão pública anterior intacta. Investigar a fonte; nunca trocar ausências por zero.

O site usa snapshot local validado em HTML, `/api/crime` e cliente; não depende de uma chamada ao ISP em cada visita. Não chamar essa série de tempo real. O CSV histórico tem colunas planas por indicador; no JSON recente as contagens ficam no objeto `values`.

## Verificações após publicação

`/`, `/regioes`, `/regioes/cisp-16`, `/indicadores/total_roubos`, `/dados`, `/boletins/2026-08`, `/robots.txt`, `/sitemap.xml`, `/data/crime-rio-snapshot.json` e `/api/crime` devem responder 200. As fichas devem exibir a mesma competência e os mesmos números no HTML inicial e após hidratação. Filtros devem sobreviver à navegação entre mapa, ranking, comparação e ficha. Uma CISP inexistente deve responder 404. Inspecionar logs de erros do Worker apenas para diagnosticar falhas, com atenção a horário, rota e ID de requisição.
