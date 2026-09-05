# Como contribuir

Você pode abrir uma issue para relatar um problema, propor uma melhoria ou discutir uma fonte. Para alterar código, faça um fork, crie uma branch e envie um pull request. Não precisa de acesso à hospedagem do autor.

Antes do PR, execute `npm ci`, `npm test`, `npm run typecheck`, `npm run lint` e `npm run build`. Mudanças visuais devem incluir capturas desktop/mobile; alterações analíticas devem incluir um teste reproduzível e a fonte/metodologia. Não inclua dados reais, credenciais, arquivos `.env`, configurações de conta ou saídas locais.

O lint cobre páginas, componentes de produto, bibliotecas e scripts. Os componentes de base em `components/ui` são verificados por TypeScript, mas ainda têm dívida de lint herdada do template; não alegamos cobertura completa de acessibilidade por testes estáticos.

Preserve estes contratos:

- CISP é a unidade dos registros, bairro é uma associação de navegação.
- Dado ausente não é zero; cobertura incompleta não gera ranking enganoso.
- Toda comparação identifica as duas janelas e usa a mesma unidade.
- Taxa usa população compatível e não significa risco individual.
- Agregados e componentes nunca são somados como se fossem exclusivos.
- Mantenha atribuição das fontes e acessibilidade, incluindo teclado e movimento reduzido.

PRs não implantam o site e não recebem segredos de produção. Mudanças precisam de revisão do mantenedor antes de integrar/publicar. Agradecemos contribuições respeitosas; não publique informações de vítimas nem detalhes de vulnerabilidades em issues abertas. Para segurança, veja SECURITY.md.
