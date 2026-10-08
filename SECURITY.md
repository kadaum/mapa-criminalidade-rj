# Segurança

Para relatar uma vulnerabilidade, use **Security → Report a vulnerability** neste repositório. Não divulgue tokens, exploração ou dados pessoais em issues públicas. Inclua passos mínimos de reprodução e impacto, sem acessar dados de terceiros ou interromper o serviço.

Somente a versão atual de `main` é acompanhada. Este é um projeto comunitário; não há SLA de resposta ou promessa de manutenção contínua.

## Modelo e limites

- A leitura usa dados públicos agregados. Contribuições enviadas pelo formulário são moderadas, armazenadas no D1 da instância e não alteram o catálogo automaticamente.
- A API consulta URLs fixas, com timeout e limite de bytes; mensagens de falha não devem expor detalhes internos.
- Código público não inclui contas, segredos, IDs reais de projeto nem configurações de produção. Não coloque credenciais no frontend.
- CI de PR tem permissões de leitura e não implanta produção. Um PR externo não deve receber segredos.
- No OpenAI Sites, a identidade moderadora depende da injeção confiável de `oai-authenticated-user-id`. Uma implantação independente deve usar um gateway autenticado que remova qualquer cabeçalho enviado pelo cliente e injete a identidade validada. Não exponha a moderação diretamente confiando em cabeçalhos públicos.
- `MODERATOR_USER_IDS` ausente ou vazio mantém o acesso administrativo negado por padrão.
- Cache não é proteção completa contra abuso. Quem hospedar deve configurar limites de requisição, monitoramento e atualizações de dependências.
- Tiles, fontes e players externos podem receber o IP do visitante. Não acrescente rastreamento sem comunicar claramente.

Auditorias de dependências e revisão de código reduzem risco, mas não certificam segurança nem cobrem vulnerabilidades ainda desconhecidas.
