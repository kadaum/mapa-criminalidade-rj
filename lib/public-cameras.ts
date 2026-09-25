export type PublicCamera = {
  id: string;
  name: string;
  neighborhood: string;
  operator: string;
  publisher: string;
  address: string;
  coordinates: [number, number] | null;
  precision: 'directory' | 'intersection' | 'address' | 'spot' | 'unresolved';
  locationSource: string;
  source: string;
  watchUrl?: string;
  youtubeId?: string;
  access: 'public' | 'registration' | 'subscription';
  status: 'observed' | 'unverified' | 'failed' | 'offline';
  checkedAt?: string;
  note?: string;
};
export type CameraCatalog = { reviewedAt: string; cameras: PublicCamera[] };
export const statusLabels = {
  observed: 'Imagem conferida',
  unverified: 'Imagem não testada',
  failed: 'Falhou no teste',
  offline: 'Fonte indica offline',
};
export const precisionLabels = {
  directory: 'Referência aproximada de diretório',
  intersection: 'Cruzamento de referência',
  address: 'Endereço estimado na via',
  spot: 'Local indicado pelo operador',
  unresolved: 'Localização pendente',
};
export const accessLabels = {
  public: 'Acesso público',
  registration: 'Exige cadastro',
  subscription: 'Exige assinatura',
};
export const publicCameras: PublicCamera[] = [
  {
    id: 'homes-posto-6',
    name: 'Copacabana · Posto 6',
    neighborhood: 'Copacabana',
    operator: 'Homes in Rio',
    publisher: 'Homes in Rio',
    address: 'Avenida Atlântica, 3950 — Copacabana, Rio de Janeiro',
    coordinates: [-43.19027778, -22.98305556],
    precision: 'directory',
    locationSource:
      'https://worldcam.eu/webcams/south-america/brazil/40611-rio-de-janeiro-copacabana-posto-6',
    source:
      'https://homesinrio.com/apartment-rio-de-janeiro-copacabana-beach-webcam',
    youtubeId: 'Hr7c0XuEgm0',
    access: 'public',
    status: 'observed',
    checkedAt: '25/09/2026',
    note: 'A câmera muda de direção. O endereço é publicado pelo operador; o marcador vem de um diretório.',
  },
];
export function cameraReference(camera: PublicCamera): string {
  return [
    'Referência de câmera para informar à autoridade responsável',
    `Câmera: ${camera.name} (${camera.id})`,
    `Operador: ${camera.operator}`,
    `Fonte do catálogo: ${camera.publisher}`,
    `Local publicado: ${camera.address || camera.neighborhood}`,
    `Precisão: ${precisionLabels[camera.precision]}. ${camera.coordinates ? 'A coordenada indica um local de referência estimado; não confirma a instalação física nem o campo de visão.' : 'Não há coordenada confiável para indicar a instalação física ou o campo de visão.'}`,
    `Fonte: ${camera.source}`,
    `Fonte de localização: ${camera.locationSource || 'Não localizada'}`,
    `Imagem: ${statusLabels[camera.status]}${camera.checkedAt ? ` em ${camera.checkedAt}` : ''}. Existência de gravações não confirmada.`,
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
