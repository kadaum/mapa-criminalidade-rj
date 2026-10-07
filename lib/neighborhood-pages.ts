import contextJson from '@/public/data/neighborhood-context.json';
import { areas } from '@/lib/organic-data';
import type { NeighborhoodContext } from '@/lib/neighborhood-context';

export const neighborhoodContext = contextJson as NeighborhoodContext;

export const pilotNeighborhoods = [
  { slug: 'centro', name: 'Centro' },
  { slug: 'copacabana', name: 'Copacabana' },
  { slug: 'tijuca', name: 'Tijuca' },
  { slug: 'barra-da-tijuca', name: 'Barra da Tijuca' },
  { slug: 'campo-grande', name: 'Campo Grande' },
] as const;

export type PilotNeighborhood = (typeof pilotNeighborhoods)[number];

export function neighborhoodBySlug(slug: string) {
  return pilotNeighborhoods.find((item) => item.slug === slug);
}

export function cispsForNeighborhood(name: string) {
  const expected = name.toLocaleLowerCase('pt-BR');
  return areas.filter((area) => area.neighborhoods.some((raw) =>
    raw.replace(/\s*\(parte\)$/i, '').toLocaleLowerCase('pt-BR') === expected));
}
