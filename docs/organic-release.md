# Registro de release orgânico

## 24 de setembro de 2026

Escopo: 41 fichas de CISP, 17 fichas de indicador, páginas de dados e boletim, infraestrutura de rastreamento e atualização do snapshot oficial para agosto de 2026. Fonte ISP-RJ com `Last-Modified` em 17 de setembro de 2026 e SHA-256 `142dc5bee67065f566b4b5efb9bca20bc6c14aec3c184ac894d44913b14b4d7d`.

Verificações locais: `validate-data` passou com 1.476 linhas e 41 CISPs; 9 testes de unidade passaram; TypeScript e oxlint passaram; build de produção concluiu; avaliação HTTP local passou em 120 verificações. O teste de indisponibilidade simulada da fonte confirmou preservação do snapshot. Navegador móvel e desktop verificados, incluindo filtro mantido na navegação e foco por teclado. Há avisos não bloqueantes do build para importação JSON de configuração no futuro Vite nativo e tamanho de alguns chunks; acompanhar em futura manutenção.

O identificador da versão publicada, o SHA do commit e a verificação da produção são registrados no relatório de entrega fora do repositório após publicação. Search Console e painel Analytics não estavam disponíveis nesta execução; nenhuma afirmação de indexação, posições ou crescimento foi feita.

Auditoria complementar: rastreamento interno de 64 páginas e 247 links não encontrou links quebrados; os pedidos a `/favicon.ico` e `/apple-touch-icon.png` respondiam 404. Foram acrescentados ícones raster derivados do SVG existente e links explícitos no cabeçalho. A auditoria também encontrou os metadados gerados no corpo do documento para navegadores comuns. A configuração `htmlLimitedBots` faz a resolução de metadata antes de fechar `<head>` para todos os user agents presentes. A avaliação local agora valida a posição de descrição e canonical nas 64 páginas, além dos arquivos de ícone. Depois da alteração, Lighthouse local registrou 100 para SEO, acessibilidade e boas práticas; a publicação ainda precisa ser conferida.
