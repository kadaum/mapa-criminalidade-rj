# Comparação de desempenho em laboratório

Data: 24/09/2026. Comparação da página inicial entre o commit anterior `8bf196336fb5b23b54f4a7932a6d8658fd49ee97` (Site v33) e o candidato que reserva a altura do mapa durante a carga. Ambos foram compilados com as mesmas dependências do projeto e servidos localmente por Wrangler 4.129.0, em portas separadas. Lighthouse 13.5.0, Headless Chrome 153, perfil móvel padrão, categoria Performance, simulação padrão de rede e CPU. Três execuções por versão, em sequência, com mediana como resumo. Os arquivos JSON de cada execução foram inspecionados e não têm `runtimeError`.

| Métrica | Antes (v33) | Depois (candidato) |
| --- | ---: | ---: |
| Pontuação Performance /100 | 38 (35–62) | 81 (68–81) |
| FCP | 4,13 s (2,47–4,14) | 1,55 s (1,41–2,00) |
| LCP | 7,30 s (3,12–7,38) | 1,85 s (1,56–2,30) |
| Total Blocking Time | 1,84 s (1,73–1,99) | 0,74 s (0,70–2,10) |
| Cumulative Layout Shift | 0,0046 | 0,0000 |
| Speed Index | 4,45 s (3,31–6,25) | 2,56 s (2,56–3,17) |
| Peso total de rede no Lighthouse | 1.069 KiB | 1.073 KiB |

Uma primeira medição do novo site antes da correção encontrou CLS 0,453: a tabela factual abaixo do mapa mudava de posição quando o cliente substituía o estado de carregamento. A altura reservada no estado de carregamento foi ajustada por largura de tela, com medidas do mapa em 360, 412, 640, 768 e 1280 px. As três medições finais registraram CLS 0.

Esta é uma comparação local e sintética; não mede INP, Core Web Vitals de campo nem latência de usuários reais. O ISP externo é usado no código anterior, enquanto o novo site usa snapshot publicado, e essa mudança faz parte da comparação. Houve variação apreciável no CPU/ambiente, por isso são apresentados intervalos e medianas. O processo Lighthouse no Windows às vezes retornou erro `EPERM` ao apagar sua pasta temporária depois de gerar o JSON; os relatórios estavam íntegros e sem erro de execução do audit. Repetir em CI ou serviço de campo quando houver infraestrutura de medição.
