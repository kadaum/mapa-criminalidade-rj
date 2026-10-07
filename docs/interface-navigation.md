# Interface e navegação

A navegação principal representa as quatro tarefas do produto: Criminalidade, Câmeras, Meu bairro e Boletins. Comparar, Ranking, Histórico e Fontes e dados formam a navegação contextual da série policial.

Na home, nenhuma CISP é escolhida sem ação da pessoa. A URL omite `cisp` enquanto a visão é da cidade; busca, toque no mapa ou favorito local criam a seleção. Voltar e avançar relê a URL. Links compartilhados fixam `fim` na competência exibida, enquanto a navegação normal pode continuar usando `fim=latest`.

Regiões e câmeras salvas ficam apenas no `localStorage` do aparelho, sem conta. As chaves são `mapa-rj:favorite-cisps` e `mapa-rj:favorite-cameras`.

`/cameras` abre o catálogo somente ao entrar no destino. O mapa usa Ruas e 2D por padrão. Cada item pode usar `/cameras/{id}` como link permanente; o ID representa a câmera/fonte cadastrada, não o identificador efêmero de uma transmissão. Estado histórico de checagem e reprodução atual aparecem separados, sem promessa de disponibilidade contínua.
