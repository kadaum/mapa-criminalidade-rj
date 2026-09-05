# Pautas para apresentar o produto

Análise do snapshot ISP-RJ até julho/2026. Atual: agosto/2025–julho/2026; anterior: agosto/2024–julho/2025. Conferência independente reproduziu os contrastes das CISPs 14 e 22. Este documento é uma análise datada, não uma página atualizada automaticamente. O panorama no site recalcula suas regras sobre os dados consultados.

## Pauta principal: segurança não cabe em um único indicador

Na CISP 14 (Ipanema e Leblon), foram registrados 6.559 furtos e cinco vítimas de letalidade violenta. Furtos: 8.574,3 por 100 mil moradores, contra 1.858,2 no Rio (4,61 vezes). Letalidade: 6,5 vítimas por 100 mil, contra 25,6 no Rio. A população atribuída à CISP é 76.496.

Formulação sugerida: **Uma região pode ter furtos acima da média e violência letal abaixo. É por isso que um mapa precisa mostrar qual ocorrência está sendo comparada.**

Não dizer que o morador tem 4,6 vezes mais risco: numerador inclui fatos envolvendo visitantes; denominador só moradores. Cinco vítimas é uma contagem pequena, não evidência de estabilidade. Não qualificar como região rica com base apenas no nome dos bairros.

## Outros achados reproduzíveis

- **Celulares e trajetórias opostas:** na CISP 14, furtos de celular passaram de 2.052 a 2.728 (+32,9%); no Rio, de 33.778 a 32.767 (-3%). O aumento local de 676 equivale a 74,6% do aumento líquido de 906 no total de furtos. Decomposição aritmética, não causa; celular já pertence ao agregado.
- **Copacabana não é uma região estatística única:** CISP 12 (parte de Copacabana e Leme) teve 5.673 furtos e 454 roubos, relação de 12,5:1. Não estender a toda Copacabana, que também aparece na CISP 13.
- **Trajetórias diferentes na Zona Sul:** CISP 10 (Botafogo, Humaitá e Urca) teve queda de 23,3% nos furtos (5.537 → 4.246); CISP 14 teve alta de 16% (5.653 → 6.559). Isso não demonstra transferência de crimes.
- **O Rio em três direções:** roubos 66.288 → 58.944 (-11,1%); furtos 118.391 → 115.420 (-2,5%); letalidade 1.372 → 1.589 vítimas (+15,8%). Não somar indicadores de unidades distintas.
- **Um ano pode esconder um mês:** CISP 22 teve 150 vítimas de letalidade no período, das quais 122 em outubro/2025 (81,3%); os outros 11 meses somam 28. Destas 122, 118 constam do indicador de mortes por intervenção de agente do Estado. O conjunto não identifica por si só as circunstâncias do evento. Não narrar como piora contínua.
- **Tijuca é uma busca, não uma CISP:** a CISP 18 tem 8.571,1 furtos por 100 mil moradores, e a CISP 19, 2.881,5. Ambas incluem outros bairros além de partes da Tijuca. Não atribuir taxas a seus trechos de bairro isoladamente.

## Contexto e fontes

- [CSV oficial ISP-RJ](https://www.ispdados.rj.gov.br/Arquivos/BaseDPEvolucaoMensalCisp.csv)
- [Agregação dos indicadores](https://www.ispdados.rj.gov.br/MetodologiaAgregacao.html)
- [Relação territorial oficial](https://www.ispdados.rj.gov.br/Arquivos/Relacao_RISPxAISPxCISP.csv)
- [Prefeitura: empregos e empresas na GEL Lagoa](https://prefeitura.rio/desenvolvimento-economico/bairros-da-gel-lagoa-reunem-109-mil-empresas-e-mais-de-100-mil-trabalhadores-formais/): contexto de atividade econômica, não população flutuante medida nem renda domiciliar por CISP. GEL e CISP não são geografias intercambiáveis.

População: agregação espacial do projeto a partir de setores do Censo 2022 e malha CISP. Não é uma tabela de população por CISP publicada diretamente pelo IBGE. Números criminais estão sujeitos a revisão e subnotificação.

## Escolhas de produto

O panorama usa regras de contraste entre indicadores, divergência local versus Rio, componente do aumento e concentração mensal. Até dois exemplos por regra, ordem determinística e mínimos explícitos. Não é seleção dos lugares mais perigosos. Renda, turismo e fluxos não são explicações causais automáticas.

Design: referência de organização do [Felt](https://help.felt.com/getting-started/tour-the-interface), escala sequencial orientada por [CARTOColors](https://carto.com/carto-colors/), enquadramento com [MapLibre](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/PaddingOptions/). Sem nova dependência cartográfica, 3D ou serviço pago.
