# Contribuições e moderação

O formulário público em `/contribuir` recebe somente um tipo fechado, um link público opcional e um comentário de até 1.000 caracteres. Ele não pede conta ou contato. Todo registro nasce como `pending`; `accepted` significa apenas que a sugestão foi aceita para análise editorial. A revisão nunca modifica o catálogo de câmeras automaticamente.

## Configuração hospedada

- `.openai/hosting.json` declara o binding D1 `DB`; Sites provisiona e conecta o banco.
- Configure `CONTRIBUTION_IP_HASH_SECRET` como segredo longo e aleatório. Ele produz HMACs dos IPs para o limite de cinco envios por janela de 15 minutos; nenhum IP bruto é persistido.
- Entre com ChatGPT e abra `/admin/contribuicoes`: quando a moderação ainda não estiver configurada, a própria página mostra sua identidade neste Site em um bloco `<code>`. Como alternativa, `/api/contributions/identity` retorna `no-store` apenas com `signedIn` e o `userId` estável deste Site, nunca email.
- Depois de conferir a identidade, configure `MODERATOR_USER_IDS` como lista separada por vírgulas desses IDs. Não use o ID de conta retornado pelas APIs administrativas de Sites: ele pode ser diferente do ID injetado no Site. Não existe bootstrap pelo primeiro usuário nem fallback no código.
- Se qualquer segredo ou binding estiver ausente, a operação correspondente é negada. As APIs de administração repetem autenticação e allowlist em toda leitura e escrita.

## Dados e retenção

Comentários, links e status ficam no D1. O HMAC do IP fica apenas na tabela temporária do limitador, com janela de 15 minutos. O protocolo público é aleatório de 128 bits; somente seu SHA-256 é salvo. A consulta pública retorna somente o estado, sem comentário, nota, ID ou identidade. Contribuições deixam de ser acessíveis em 90 dias; ao revisar, a expiração passa para 90 dias depois da revisão. Cada nova contribuição remove um lote limitado de registros expirados, portanto a remoção física é oportunista e pode ocorrer depois do prazo quando não há tráfego. O limitador também é limpo em lotes.

O servidor valida origem nas escritas, exige JSON, limita o corpo, usa SQL parametrizado e nunca busca os links enviados. Links são exibidos ao moderador como navegação explícita em nova aba.

## Migração e operação local

A declaração canônica está em `db/schema.ts`; `npm run db:generate` produz a migração SQL e os metadados do Drizzle. Depois de um build, aplique a migração gerada ao D1 local seguindo o comando de migração local do README do starter Sites, com binding `DB`. Configure os segredos apenas no ambiente local ignorado. Este checkout não inclui o helper de login local do starter: os fixtures locais usam explicitamente o header `oai-authenticated-user-id: local_eval` com `MODERATOR_USER_IDS=local_eval`. Esse header é um recurso de teste local e não representa uma identidade de produção; em produção a identidade é injetada pelo Sites após autenticação do visitante.
