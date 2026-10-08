# Workflow operacional e de governança

## 1. Coleta

1. Consultar cabeçalhos ETag e Last-Modified da URL oficial.
2. Baixar o CSV somente quando houver mudança.
3. Preservar hash SHA-256 e metadados da coleta.
4. Decodificar Windows-1252 e filtrar o município do Rio.
5. Manter 36 meses no payload web: 12 atuais, 12 de comparação e 12 de contexto.
6. Gerar `public/data/neighborhood-labels.json` no build a partir do GeoJSON existente. O mapa carrega esse payload leve para rótulos; a geometria completa dos bairros só é solicitada quando a pessoa ativa “Limites dos bairros”.

Responsável lógico: **coletor**.

## 2. Validação fail-closed

1. Validar schema, chave, tipos, nulos e contagens não negativas.
2. Exigir 41 CISPs atuais e join exato com 41 polígonos.
3. Detectar regressão de competência e lacunas mensais.
4. Alertar quando o último mês estiver em fase 2 ou defasado.
5. Preservar agregados oficiais; não recalcular letalidade ou totais.
6. Publicar diff de revisões quando um mês antigo mudar.

Responsável lógico: **validador independente**.

## 3. Síntese

1. Comparar os 12 meses recentes com os 12 equivalentes anteriores.
2. Separar categorias contadas como casos das contadas como vítimas.
3. Suprimir destaque percentual em volume baixo.
4. Mostrar contagem, período, unidade, fase e fonte.
5. Não publicar taxa por CISP até existir denominador atual e defensável.

Responsável lógico: **sintetizador**.

## 4. Crítica editorial

Antes de cada nova funcionalidade, o crítico tenta provar que ela induz falsa precisão, duplica ISP Conecta/Crime Brasil/Fogo Cruzado ou incentiva estigmatização. Score, rota segura e alerta em tempo real são recusados no escopo atual.

Responsável lógico: **crítico de produto**.

## 5. Avaliação de go/kill

Avançar quando três atualizações forem ingeridas sem intervenção, o join territorial for 100%, a reconciliação oficial atingir 99,5% ou mais e testes com usuários mostrarem compreensão correta. Interromper se o principal pedido for previsão/rota, se a atualização virar manual ou se a diferença para produtos existentes não for percebida.

Responsável lógico: **avaliador**.

## 6. Publicação

1. Sincronizar e validar dados.
2. Construir o site.
3. Testar rota principal, API de dados, metodologia e fallback.
4. Publicar a versão exata validada.
5. Monitorar falhas e manter o último snapshot válido.

Responsável lógico: **mantenedor da publicação**.
