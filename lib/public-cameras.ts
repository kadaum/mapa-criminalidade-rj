export type PublicCamera = {
  id: string;
  name: string;
  operator: string;
  address: string;
  coordinates: [number, number];
  locationSource: string;
  source: string;
  youtubeId: string;
  checkedAt: string;
};

// Curated public broadcasts only. Never import authenticated/internal feed URLs.
// Coordinates are directory references, not surveyed equipment positions.
export const publicCameras: PublicCamera[] = [
  {
    id: 'homes-posto-6',
    name: 'Copacabana · Posto 6',
    operator: 'Homes in Rio',
    address: 'Avenida Atlântica, 3950 — Copacabana, Rio de Janeiro',
    coordinates: [-43.19027778, -22.98305556],
    locationSource:
      'https://worldcam.eu/webcams/south-america/brazil/40611-rio-de-janeiro-copacabana-posto-6',
    source:
      'https://homesinrio.com/apartment-rio-de-janeiro-copacabana-beach-webcam',
    youtubeId: 'IhGNK_hImLs',
    checkedAt: '08/09/2026',
  },
];

export function cameraReference(camera: PublicCamera): string {
  return [
    'Referência de câmera para informar à autoridade responsável',
    `Câmera: ${camera.name} (${camera.id})`,
    `Operador publicado: ${camera.operator}`,
    `Endereço publicado pelo operador: ${camera.address}`,
    'Localização aproximada; posição exata do equipamento e campo de visão não confirmados.',
    `Fonte do endereço e da transmissão: ${camera.source}`,
    `Fonte do marcador: ${camera.locationSource}`,
    `Transmissão observada em ${camera.checkedAt}; disponibilidade atual e existência de gravações não confirmadas.`,
    '',
    'Completar antes de apresentar:',
    'Data do ocorrido: ____',
    'Horário aproximado e fuso: ____',
    'Local exato, cruzamento e sentido da via: ____',
    '',
    'Solicito avaliar se essa câmera pode ter registrado o ocorrido e, se cabível, solicitar as imagens ao responsável.',
    'Esta referência não comprova que o fato foi filmado. O Mapa de Criminalidade RJ não armazena nem fornece gravações.',
  ].join('\n');
}
