# Contexto IBGE por bairro

`public/data/neighborhood-context.json` contém um recorte reproduzível dos agregados oficiais do IBGE para Centro, Copacabana, Tijuca, Campo Grande e Barra da Tijuca, no município do Rio de Janeiro.

O artefato usa `V05000` como denominador de domicílios particulares permanentes ocupados em setores selecionados para a pesquisa do entorno. Para cada bairro, `lighting` usa `V05012`/`V05013`/`V05014` (iluminação pública: sim/não/não declarado) e `sidewalk` usa `V05021`/`V05022`/`V05023` (calçada: sim/não/não declarado). `yesPct` é a porcentagem de domicílios pesquisados com presença observada na face do entorno; não mede ruas, lâmpadas funcionais, conservação ou acessibilidade.

`retrievedAt` está em UTC; `retrievedAtLocal` preserva a data/hora de exibição no fuso America/New_York. A referência é o Censo 2022. “Não declarado” é a categoria publicada pelo IBGE e permanece no denominador; não é convertido em “não”.

Atualização manual:

```bash
node scripts/sync-neighborhood-context.mjs
node --test scripts/neighborhood-context.test.mjs
```

O script baixa somente o ZIP de bairros (arquivo compacto) e o ZIP de dicionários. Não baixa setores censitários, consulta BigQuery nem agrega CISP. Cada execução registra `retrievedAt`, SHA-256 do ZIP, URLs oficiais, nomes dos três arquivos de dicionário e as limitações de uso. O arquivo foi publicado como download público, mas a licença específica não foi localizada na página/FTP; a atribuição ao IBGE deve ser preservada e a licença confirmada antes de redistribuição ampla.

O contexto é descritivo e territorial. Não é um indicador de segurança e não sustenta inferência causal ou atribuição de registros policiais ao bairro.
