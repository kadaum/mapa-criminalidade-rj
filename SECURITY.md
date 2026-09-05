# Segurança

Para relatar uma vulnerabilidade, use **Security → Report a vulnerability** neste repositório. Não divulgue tokens, exploração ou dados pessoais em issues públicas. Inclua passos mínimos de reprodução e impacto, sem acessar dados de terceiros ou interromper o serviço.

Somente a versão atual de `main` é acompanhada. Este é um projeto comunitário; não há SLA de resposta ou promessa de manutenção contínua.

## Modelo e limites

- Aplicação de leitura sobre dados públicos agregados; sem cadastro ou upload.
- API consulta URL fixa, com timeout e limite de bytes; mensagens de falha não expõem detalhes internos.
- Código público não inclui contas, segredos nem configurações de produção. Não coloque credenciais no frontend.
- CI de PR tem permissões de leitura e não implanta produção. Um PR externo não deve receber segredos.
- Cache não é proteção completa contra abuso. Quem hospedar deve configurar limites de requisição, monitoramento e atualizações de dependências.
- Tiles e fontes externas podem receber o IP do visitante. Não acrescente rastreamento sem comunicar claramente.

Auditorias de dependências e revisão de código reduzem risco, mas não certificam segurança nem cobrem vulnerabilidades ainda desconhecidas.
