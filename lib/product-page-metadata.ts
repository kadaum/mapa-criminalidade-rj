const ORIGIN = 'https://mapa-criminalidade-rj.ricardoguia.com';

export function neighborhoodMetadata(name: string, slug: string) {
  const title = `${name}: contexto do bairro e CISPs relacionadas`;
  const description = `Contexto do Censo 2022 para ${name} e registros das regiões policiais relacionadas, com período, fonte e limites territoriais explícitos.`;
  const url = `${ORIGIN}/bairros/${slug}`;
  const image = `${ORIGIN}/share/bairro-${slug}.png`;
  return { title: `${title} | Mapa da Criminalidade RJ`, description, alternates: { canonical: url }, openGraph: { title, description, url, type: 'article', images: [{ url: image, width: 1200, height: 630, alt: `${name}: contexto do Censo 2022 e CISPs relacionadas` }] }, twitter: { card: 'summary_large_image', title, description, images: [image] } };
}

export function bulletinMetadata(end: string, label: string) {
  const title = `Boletim de ${label} | Mapa da Criminalidade RJ`;
  const description = `Comparação de registros policiais no município em duas janelas equivalentes de 12 meses até ${label}, com fonte e cobertura explícitas.`;
  const url = `${ORIGIN}/boletins/${end}`;
  const image = `${ORIGIN}/share/boletim-${end}.png`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, type: 'article', images: [{ url: image, width: 1200, height: 630, alt: `Boletim de registros policiais até ${label}` }] }, twitter: { card: 'summary_large_image', title, description, images: [image] } };
}
