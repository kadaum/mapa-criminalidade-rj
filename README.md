# Mapa da Criminalidade RJ

Ferramenta cívica de código aberto para explorar **registros policiais por CISP** no município do Rio de Janeiro: mapa, comparação de regiões, rankings e insights com períodos explícitos.

[Abrir o site](https://mapa-aberto-rj.ricardo-guia.chatgpt.site) · [Como contribuir](CONTRIBUTING.md) · [Fontes e limites](DATA_SOURCES.md) · [Segurança](SECURITY.md)

Não é um mapa de risco individual nem uma contagem de todos os crimes ocorridos. A busca por bairro aponta para a área de delegacia correspondente, não desagrega registros por bairro. Um registro pode conter múltiplos títulos e fatos não criminais. Não some indicadores agregados e seus componentes.

## Rodar localmente

Requer Node.js 22.13+ e npm. Não é necessário criar conta nem fornecer chave de API.

```sh
npm ci
npm test
npm run typecheck
```

Os dados de terceiros **não estão incluídos** na licença MIT nem versionados neste repositório. Para visualizar o mapa, leia [DATA_SOURCES.md](DATA_SOURCES.md) e obtenha as cópias locais:

```sh
npm run data:setup -- --accept-source-terms
npm run validate:data
npm run dev
```

O comando baixa os cinco arquivos públicos que o site usa, sem credenciais. Depende da disponibilidade do site e não concede uma licença nova para esses arquivos. Eles ficam ignorados pelo Git. Sem essa etapa, os testes unitários e o build funcionam, mas a interface não terá as camadas e a população necessárias. Abra o endereço local informado pelo terminal.

```sh
npm run build
npm start
```

## Atualização e confiabilidade

A API do aplicativo consulta uma URL fixa do ISP, com timeout e limite de tamanho. A série é **mensal, não em tempo real**; publicação e revisões dependem do ISP. O cabeçalho de cache permite seis horas em um CDN compatível, mas cada hospedagem precisa configurar/verificar seu cache. A navegação consulta a API; uma aba deixada aberta não faz atualização periódica. Na falha, o cliente tenta o snapshot local.

A população é uma derivação do Censo 2022 e dos limites das CISPs, não uma estimativa mensal. Alterações territoriais exigem recálculo e revisão; não prometemos manutenção zero. Os insights são regras determinísticas calculadas sobre os dados carregados, não textos de IA atualizados manualmente.

`npm run sync:data` atualiza estatísticas, relação CISP/bairros e bairros, mas **não recalcula população nem reconstrói os limites das CISPs**. Consulte as fontes e scripts antes de publicar uma instância independente.

## Testes e contribuições

`npm test` executa testes sintéticos de taxas, janelas, empates e dados ausentes, sem rede. `npm run test:integration` também executa regressões de referência com dados reais; algumas expectativas são específicas do snapshot de julho de 2026 e precisam ser revisadas quando a referência muda. Não confunda testes unitários aprovados com validação de uma base nova.

PRs passam por verificações automáticas, mas não publicam em produção. Sugestões, correções de acessibilidade, UX, testes e auditorias dos dados são bem-vindas. Veja [CONTRIBUTING.md](CONTRIBUTING.md).

## Licença

Código sob [MIT](LICENSE). Dados, mapas-base e bibliotecas têm seus próprios termos. O repositório público é um snapshot limpo do código; não contém histórico operacional, configurações de hospedagem ou credenciais. Isso reduz exposição, mas não constitui garantia de ausência de vulnerabilidades.
