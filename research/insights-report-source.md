# Mapa Aberto RJ — relatório-fonte de insights e evolução visual

Data da verificação: 04/09/2026.

## Resumo executivo

A principal conclusão não é um ranking de “lugares perigosos”. É que o mapa muda radicalmente conforme a pergunta: carga total, taxa por residente, tipo de ocorrência e período produzem leituras diferentes — e todas podem ser verdadeiras ao mesmo tempo.

Os três achados mais fortes para publicação são:

1. Campo Grande e entorno lideram em volume de registros, mas ficam em 35º lugar entre 41 CISPs na taxa por morador.
2. Entre CISPs com pelo menos 50 mil residentes, o grupo de renda mais alta tem 7,45 vezes mais furtos registrados e 69% menos homicídios dolosos por residente que o grupo de renda mais baixa. É um perfil diferente de ocorrência, não “mais” ou “menos crime” em sentido geral.
3. No Rio inteiro, roubos caíram 11,1%, enquanto a letalidade violenta subiu 15,8%. Um índice único esconderia a divergência.

O notebook executado que reproduz os cálculos está em `research/insights-mapa-aberto-rj.ipynb`.

## Recorte e qualidade

- Período atual: agosto de 2025 a julho de 2026.
- Comparação: agosto de 2024 a julho de 2025.
- Cobertura: 1.476 linhas, 36 meses e 41 CISPs do município do Rio.
- Crimes e ocorrências: série mensal oficial do ISP-RJ.
- População: Censo 2022 por setor, atribuída à CISP oficial com maior área de interseção.
- Renda: Censo 2022, variável V06006, rendimento nominal mediano mensal dos responsáveis com rendimento em cada setor.
- Abril a julho de 2026 estão em fase 2 do ISP: consolidados sem a errata trimestral posterior.

## Insight 1 — volume não é taxa

A CISP 35 — Campo Grande, Cosmos, Inhoaíba, Santíssimo e Senador Vasconcelos — teve 30.425 registros de ocorrência, maior quantidade entre as 41 áreas. Sua população estimada é 602.626 residentes. O resultado é 5.048,7 registros por 100 mil, a 35ª maior taxa.

Isso não torna uma métrica certa e outra errada:

- quantidade descreve a carga absoluta sobre moradores e serviços;
- taxa residencial permite comparar áreas de tamanhos diferentes;
- nenhuma das duas mede, sozinha, a probabilidade individual de vitimização.

O caso extremo é a CISP 1, no Centro: 8.760 registros e 1.381 residentes produzem 634.323 por 100 mil. A aritmética está correta; a interpretação literal não está. Trabalhadores, passageiros e visitantes entram no numerador, mas não no denominador residencial.

## Insight 2 — renda muda o perfil das ocorrências

Para reduzir o efeito de denominadores muito pequenos, foram mantidas apenas CISPs com pelo menos 50 mil residentes. Compararam-se as sete maiores e as sete menores pelo proxy de renda.

| Indicador, por 100 mil | 7 CISPs de renda mais alta | 7 CISPs de renda mais baixa | Relação |
|---|---:|---:|---:|
| Furtos | 4.657,2 | 625,1 | 7,45× |
| Furto de celular | 1.535,1 | 110,6 | 13,88× |
| Estelionato | 2.432,3 | 717,6 | 3,39× |
| Homicídio doloso | 6,6 | 21,4 | 69% menor |
| Roubo de veículo | 44,5 | 204,4 | 78% menor |
| Total de roubos | 847,9 | 647,8 | 31% maior |

O grupo superior reúne as CISPs 12, 13, 9, 10, 16, 15 e 14. O inferior reúne 11, 36, 43, 39, 21, 34 e 31.

O proxy de renda é a média ponderada, pelo número de responsáveis, das medianas setoriais V06006. Não é renda domiciliar per capita nem uma mediana oficial da CISP. O resultado é exploratório e não causal. Fluxo de visitantes, turismo, oportunidade, posse de bens e propensão a registrar ocorrências são explicações concorrentes que os dados agregados não isolam.

## Insight 3 — “crime caiu” e “violência subiu” podem coexistir

| Indicador | Período anterior | Período atual | Variação |
|---|---:|---:|---:|
| Total de roubos | 66.288 | 58.944 | -11,1% |
| Roubo de rua | 40.093 | 33.686 | -16,0% |
| Homicídio doloso | 936 | 1.016 | +8,5% |
| Letalidade violenta | 1.372 | 1.589 | +15,8% |
| Mortes por intervenção policial | 322 | 461 | +43,2% |

Não se deve criar um “índice geral de segurança” somando ou normalizando esses campos sem um modelo substantivo explícito. Casos e vítimas obedecem a regras diferentes, e alguns agregados já incluem componentes exibidos separadamente.

## Insight 4 — uma concentração territorial e mensal explica boa parte do salto

Na CISP 22 — Penha, Olaria e partes de Brás de Pina e Penha Circular — a letalidade passou de 48 para 150 vítimas, aumento de 102. O município aumentou 217 vítimas. Logo, a CISP 22 responde por 47,0% do aumento municipal.

Em outubro de 2025, a base registra 118 mortes por intervenção policial na CISP 22; são 94,4% das 125 registradas nessa CISP em todo o período. Sem a CISP 22, a letalidade do município teria aumentado 8,7%, e não 15,8%.

A concentração coincide temporal e territorialmente com a Operação Contenção, realizada em 28/10/2025 nos complexos da Penha e do Alemão. O balanço estadual divulgado à época informou 121 mortos. A correspondência é forte, mas continua sendo uma inferência: a base mensal por CISP não marca quais registros pertencem à operação.

## Insight 5 — a composição do patrimônio muda por região

- Copacabana/Leme: 5.673 furtos e 454 roubos, 12,5 furtos por roubo.
- Ipanema/Leblon: 6.559 furtos e 729 roubos, 9,0 por roubo.
- Acari/Pavuna: 1.502 furtos e 3.366 roubos, 0,45 por roubo.
- Madureira e entorno: 3.435 furtos e 3.564 roubos, praticamente 1 para 1.

Na CISP 18, Maracanã/Tijuca, roubos caíram 16,9% enquanto furtos subiram 16,7%; furto de celular subiu 36,7%. Não é correto dizer que um tipo “virou” o outro, mas a inversão mostra como um total agregado pode ocultar mudança de composição.

## Recomendação para o mapa

### Implementar agora

- Manter MapLibre e usar `feature-state` para hover/seleção sem reconstruir geometrias.
- Tooltip ligado ao ponteiro, com colisão nas bordas e título em até duas linhas.
- Um único conjunto de rótulos: o mapa-base já traz nomes; duplicar uma camada própria prejudica leitura.
- Motion funcional: 160–280 ms em opacidade, cor e contorno; respeitar `prefers-reduced-motion`.
- Desktop com hover curto e clique persistente; touch com seleção persistente e cartão inferior.
- Legenda clicável para destacar as áreas de uma faixa.
- Ranking sincronizado: hover na lista realça a área e vice-versa.
- Busca por bairro/endereço respondendo “este ponto pertence à CISP X”.

### Adiar

- `deck.gl` só passa a fazer sentido se existirem pontos publicáveis, agregação H3 ou dezenas de milhares de eventos.
- Three.js, prédios 3D, perspectiva e Blender não melhoram a comparação de 41 polígonos. Altura e inclinação introduzem distorção perceptiva, custo de renderização e acessibilidade pior.

Arquitetura recomendada: MapLibre para o mapa, CSS/Motion para a interface e D3 apenas para séries/rankings. Para o volume atual, essa combinação produz mais fluidez que adicionar um motor 3D.

## Benchmarks

- [The Trace — Atlas of American Gun Violence](https://projects.thetrace.org/gun-violence-map/): busca local, promessa humana e compartilhamento.
- [NYC Street Tree Map](https://tree-map.nycgovparks.org/tree-map): granularidade progressiva com zoom.
- [NYC Population FactFinder](https://popfactfinder.planning.nyc.gov/): mapa, comparação e ranking sincronizados.
- [CDC PLACES](https://www.cdc.gov/places/tools/explore-places-interactive-map.html): categorias e medidas explicadas.
- [Datawrapper — choropleth maps](https://www.datawrapper.de/academy/customizing-your-choropleth-map): escala, legenda e contexto.
- [Fogo Cruzado](https://fogocruzado.org.br/perguntas-frequentes/): linguagem brasileira e transparência metodológica.

## Fontes primárias

- [ISP-RJ — base mensal por CISP](https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv)
- [ISP-RJ — nota metodológica](https://www.ispdados.rj.gov.br/metodDivulDados.html)
- [IBGE — rendimento do responsável por setor](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/Agregados_por_setores_renda_responsavel_BR_20260508_csv.zip)
- [IBGE — dicionário da renda](https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/dicionario_de_dados_renda_responsavel_20260508.xlsx)
- [ISP-RJ — limites oficiais das CISPs](https://www.ispdados.rj.gov.br/Arquivos/CISPshp.rar)
- [Governo do RJ — balanço da Operação Contenção](https://www.rj.gov.br/radioroquettepinto/node/12539)

