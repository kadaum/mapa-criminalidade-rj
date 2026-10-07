# Contribuindo

Obrigado por ajudar a melhorar o Mapa da Criminalidade RJ. O projeto acompanha registros policiais mensais por CISP e referências públicas de câmeras. Contribuições devem preservar as fontes, as limitações e a privacidade descritas no [README](README.md) e em [`docs/public-cameras.md`](docs/public-cameras.md).

## Antes de abrir uma contribuição

- Use Node.js `>=22.13.0`.
- Instale as dependências com `npm ci`.
- Antes do build público, rode `npm run prepare:public-data`; os ZIPs compactos oficiais são temporários e não devem ser commitados.
- Rode `npm run validate:data` para mudanças que envolvam dados.
- Rode `npm run dev` para conferir uma alteração de interface.
- Rode os testes existentes relacionados à área alterada; os comandos de câmera estão em [`docs/camera-p0-evaluation.md`](docs/camera-p0-evaluation.md).
- A identidade de hospedagem em `.openai/` pertence ao ambiente do Sites e é ignorada pelo Git. O clone público compila com um binding D1 local de desenvolvimento; nunca publique IDs reais, segredos ou credenciais.

O projeto usa `npm ci`, `npm run sync:data`, `npm run validate:data` e `npm run dev` para o fluxo básico documentado no README. Não é necessário publicar, fazer push ou abrir um PR para validar uma contribuição local.

## O que pode ser proposto

1. **Correção de fonte de dados:** indique a fonte original, o recorte temporal afetado, o método de transformação e como a correção pode ser reproduzida. Não substitua ausência por zero.
2. **Correção de câmera:** use um ID público permanente ou URL pública sem autenticação; indique a data da observação e o que foi realmente observado. Um carregamento de página não prova imagem ou transmissão.
3. **Correção de interface:** descreva a rota, o estado inicial, o resultado esperado e o resultado atual. Não envie endereço exato de pessoa, documento, boletim ou dado pessoal.
4. **Correção de documentação:** aponte o trecho e a fonte que sustenta a alteração.

O formulário público em `/contribuir` é moderado e não altera o catálogo automaticamente. Para mudanças de código, use os templates de issue ou uma proposta no repositório; a revisão pode pedir evidência adicional.

## Oito tarefas pequenas para começar

1. Atualizar uma explicação de unidade ou período no README. Critério: a frase aponta a fonte e mantém a distinção entre registros, casos e vítimas.
2. Melhorar o texto de estado vazio de uma lista. Critério: o estado informa a ação seguinte e não promete disponibilidade de uma fonte.
3. Adicionar uma checagem de link público de câmera. Critério: a checagem rejeita autenticação e não baixa uma fila completa durante testes.
4. Corrigir um rótulo de competência. Critério: o rótulo usa o período do snapshot e passa a validação existente.
5. Documentar um recorte do ISP-RJ. Critério: o texto registra período, colunas usadas, transformação e limitação.
6. Melhorar foco ou nome acessível de um controle. Critério: a alteração é verificável no navegador e preserva teclado e movimento reduzido.
7. Adicionar um caso de teste para sinal de player. Critério: o teste usa resposta controlada e distingue carregamento, primeiro quadro e progresso.
8. Corrigir uma atribuição de fonte. Critério: o texto identifica publicador, URL e licença conhecida sem ampliar a licença do código ou dos dados.

Evite tarefas que dependam de horários, aparelhos, acesso autenticado ao 1746 ou disponibilidade contínua de terceiros. Registre incertezas em vez de preenchê-las com suposições.

## Revisão

Mantenha cada alteração pequena e explique a validação executada. Não inclua dados pessoais, tokens, credenciais, dumps de banco ou artefatos de desenvolvimento. Uma contribuição pode ser aceita para revisão sem ser publicada ou incorporada ao catálogo.
