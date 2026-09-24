# Avaliação de descoberta orgânica

Data: 24 de setembro de 2026. Critérios: dados oficiais e verificáveis; conteúdo público em HTML inicial; navegação útil com e sem hidratação; publicação íntegra.

| Verificação | Resultado | Evidência / limite |
| --- | --- | --- |
| Cobertura de dados | Aprovado | 36 meses × 41 CISPs = 1.476 linhas, 17 indicadores, 41 geometrias e populações. Período final 2026-08. |
| Fonte e integridade | Aprovado | CSV oficial ISP-RJ; hash do arquivo `142dc5bee67065f566b4b5efb9bca20bc6c14aec3c184ac894d44913b14b4d7d`. População total 6.211.223; 13.782 setores auditados. |
| Série, taxas e comparação | Aprovado | Chaves únicas, meses contíguos, valores completos e não negativos; janelas comparáveis de 12 meses e taxa CISP 16 conferidas por script. |
| Páginas e metadados | Aprovado localmente | Avaliação HTTP: 120 checagens passaram, nenhuma falhou; 64 canônicas no sitemap, JSON-LD parseável, recursos e 404 corretos. |
| HTML inicial e hidratação | Aprovado localmente | CISP 16 exibe 1.944 roubos, taxa 915,1, população 212.434 e agosto de 2026; ferramenta de comparação hidratada exibe os mesmos 1.944. Home e ranking mostram números e período antes da carga do cliente. |
| Navegação e responsividade | Aprovado localmente | Navegação ficha → comparação e mapa → ranking preservou CISP; inspeção visual em 360 e 390 px e desktop, sem overflow visível; logs do navegador sem erro ou aviso. |
| Indisponibilidade da fonte | Aprovado | Teste de falha simulada do `fetch` oficial confirma que `sync-data.mjs` falha sem alterar o snapshot publicado. O site lê esse snapshot, sem buscar o ISP por visita. |
| Acessibilidade | Parcial | No móvel, Tab percorre marca, Método, breadcrumb, mapa, cartões de indicadores, links de ferramentas e fonte na ficha; todos exibiram contorno de foco. Na comparação, foco chegou aos filtros; o seletor abriu por Enter, fechou por Escape, reteve foco com anel visível e Tab avançou ao próximo filtro, sem armadilha nesse fluxo. Componentes animados usam `useReducedMotion` e CSS usa `prefers-reduced-motion`. Auditoria completa de leitor de tela e emulação do sistema com movimento reduzido não executadas. |
| Search Console / Analytics | Não executado | Sem acesso às propriedades; não há evidência de indexação, ranking, CTR ou tráfego orgânico. |
| Produção | Aprovado na versão 34 | 120 avaliações HTTP no domínio público, snapshot idêntico ao local, CISP 16 → comparação após hidratação, logs sem 5xx; apenas 404 dos testes de URLs inválidas e pedido de favicon. A correção posterior de layout será verificada novamente após publicação. |
| Performance comparativa | Aprovado em laboratório | Três execuções móveis por versão com Lighthouse 13.5.0, Chrome 153 e Wrangler local sob a mesma configuração. Medianas: pontuação 38 → 81, LCP 7,30 s → 1,85 s, CLS 0,0046 → 0. Detalhes e limitações em `organic-performance-lab.md`. |

O resultado local não prevê posição em busca nem inclusão em respostas generativas. A publicação e a medição posterior são verificações separadas.
