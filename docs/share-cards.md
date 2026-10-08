# Cartões de compartilhamento

`scripts/build-share-cards.mjs` gera os cartões estáticos Open Graph em `public/share/`.

Execute com Node 22 e o Sharp já instalado:

```sh
node --experimental-strip-types scripts/build-share-cards.mjs
```

São gerados cinco cartões de bairro (`bairro-<slug>.png`) e um cartão por período aceito por `availableBulletinPeriods`, no formato `boletim-YYYY-MM.png`. O gerador lê os snapshots versionados em `public/data/`, calcula os boletins com a mesma função de disponibilidade usada pelo app e valida 1200×630 px e o orçamento de 150 KB por arquivo.

Os cartões de bairro mostram o denominador de domicílios do Censo 2022, indicadores observados no entorno e as CISPs relacionadas. A legenda deixa claro que a relação territorial não atribui crimes ao bairro. Os cartões de boletim mostram roubos no município em janelas equivalentes de 12 meses, variação anual e cobertura das 41 CISPs.

As fontes e o recorte temporal aparecem no próprio cartão. Não são usadas imagens externas, fotografias ou outros meios protegidos. As URLs absolutas são ligadas a `openGraph.images` e `twitter.images` em `lib/product-page-metadata.ts`; o canonical continua apontando para a página correspondente.
