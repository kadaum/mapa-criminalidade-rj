/** The only neighborhood names accepted from camera-directory URL filters. */
export const cameraPilotNeighborhoods = [
  'Centro',
  'Copacabana',
  'Tijuca',
  'Barra da Tijuca',
  'Campo Grande',
] as const;

const normalize = (value: string) =>
  value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR').trim();

export function cameraNeighborhoodFromUrl(value: string | null | undefined) {
  if (!value || value.length > 80) return '';
  const normalized = normalize(value);
  return cameraPilotNeighborhoods.find((name) => normalize(name) === normalized) ?? '';
}
