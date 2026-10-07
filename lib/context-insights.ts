import {
  cityMetric,
  periodTotal,
  regionMetrics,
  windowPeriods,
  type CrimeRow,
} from './crime-analysis.ts';

export type ContextInsight = {
  key: string;
  cisp: number;
  indicator: string;
  kind: 'contrast' | 'divergence' | 'component' | 'concentration';
  title: string;
  evidence: string[];
  caveat: string;
  score: number;
};
const n = (value: number, digits = 0) =>
  value.toLocaleString('pt-BR', { maximumFractionDigits: digits });

/** Descriptive, reproducible comparisons. Scores order examples, not severity or risk. */
export function contextInsights(
  rows: CrimeRow[],
  populations: { cisp: number; population: number }[],
  end: string,
  months: number,
  comparison: 'previous' | 'year' | 'none' = 'previous',
): ContextInsight[] {
  if (
    populations.length !== 41 ||
    new Set(populations.map((p) => p.cisp)).size !== 41 ||
    populations.some(
      (p) => !Number.isSafeInteger(p.population) || p.population <= 0,
    )
  )
    return [];
  const ids = [
    'total_furtos',
    'total_roubos',
    'letalidade_violenta',
    'furto_celular',
  ];
  const byId = new Map(
    ids.map((id) => [id, regionMetrics(rows, populations, id, end, months, comparison)]),
  );
  const city = new Map(ids.map((id) => [id, cityMetric(byId.get(id)!)]));
  const out: ContextInsight[] = [];
  const cf = city.get('total_furtos')!,
    cl = city.get('letalidade_violenta')!;
  for (const p of populations) {
    const f = byId.get('total_furtos')!.find((m) => m.cisp === p.cisp)!;
    const l = byId.get('letalidade_violenta')!.find((m) => m.cisp === p.cisp)!;
    if (
      p.population >= 50000 &&
      f.count !== null &&
      f.count >= 100 &&
      l.count !== null &&
      cf.rate &&
      cl.rate &&
      f.rate! >= 2 * cf.rate &&
      l.rate! <= 0.5 * cl.rate
    ) {
      out.push({
        key: `contrast-${p.cisp}`,
        cisp: p.cisp,
        indicator: 'total_furtos',
        kind: 'contrast',
        score: f.rate! / cf.rate,
        title: 'Furtos acima do Rio; violência letal abaixo',
        evidence: [
          `Furtos: ${n(f.rate!, 1)} casos por 100 mil moradores; Rio: ${n(cf.rate, 1)}. São ${n(f.rate! / cf.rate, 2)} vezes a taxa municipal.`,
          `Letalidade violenta: ${n(l.rate!, 1)} vítimas por 100 mil; Rio: ${n(cl.rate, 1)}.`,
          `${n(f.count)} furtos e ${n(l.count)} vítimas de letalidade na região; ${n(p.population)} moradores no denominador.`,
        ],
        caveat:
          'Indicadores diferentes podem contar histórias diferentes. Taxa por morador não é risco individual: visitantes e circulação não entram na população. Números pequenos de vítimas exigem cautela.',
      });
    }
    for (const id of ['total_furtos', 'total_roubos', 'furto_celular']) {
      const m = byId.get(id)!.find((x) => x.cisp === p.cisp)!,
        c = city.get(id)!;
      if (
        m.change === null ||
        c.change === null ||
        m.previous! < 100 ||
        Math.abs(m.count! - m.previous!) < 100 ||
        Math.abs(m.change) < 10 ||
        Math.abs(c.change) < 1 ||
        m.change * c.change >= 0
      )
        continue;
      out.push({
        key: `divergence-${id}-${p.cisp}`,
        cisp: p.cisp,
        indicator: id,
        kind: 'divergence',
        score: Math.abs(m.count! - m.previous!),
        title: `Na região ${m.change > 0 ? 'subiu' : 'caiu'}; no Rio ${c.change > 0 ? 'subiu' : 'caiu'}`,
        evidence: [
          `Região: ${n(m.previous!)} → ${n(m.count!)} casos (${m.change > 0 ? '+' : ''}${n(m.change, 1)}%).`,
          `Rio: ${n(c.previous!)} → ${n(c.count!)} casos (${c.change > 0 ? '+' : ''}${n(c.change, 1)}%).`,
        ],
        caveat:
          'Mesmas janelas e mesmo indicador. O contraste não prova deslocamento dos crimes nem explica suas causas.',
      });
    }
    const phone = byId.get('furto_celular')!.find((m) => m.cisp === p.cisp)!;
    if (
      f.count !== null &&
      f.previous !== null &&
      phone.count !== null &&
      phone.previous !== null &&
      phone.count <= f.count &&
      phone.previous <= f.previous
    ) {
      const totalDelta = f.count - f.previous,
        phoneDelta = phone.count - phone.previous;
      if (totalDelta >= 100 && phoneDelta >= 20 && phoneDelta <= totalDelta)
        out.push({
          key: `component-${p.cisp}`,
          cisp: p.cisp,
          indicator: 'furto_celular',
          kind: 'component',
          score: phoneDelta,
          title: 'Celulares no aumento dos furtos',
          evidence: [
            `Total de furtos: ${n(f.previous)} → ${n(f.count)} (+${n(totalDelta)} casos).`,
            `Furtos de celular: ${n(phone.previous)} → ${n(phone.count)} (+${n(phoneDelta)}).`,
            `O aumento dos furtos de celular equivale a ${n((phoneDelta / totalDelta) * 100, 1)}% do aumento líquido do total de furtos.`,
          ],
          caveat:
            'Decomposição aritmética, não causa. Furto de celular já está dentro do total de furtos: não some os dois.',
        });
    }
    if (months >= 3 && l.count !== null && l.count >= 20) {
      const local = rows.filter((r) => r.cisp === p.cisp);
      const monthly = windowPeriods(end, months).map((period) => ({
        period,
        count: periodTotal(local, [period], 'letalidade_violenta'),
      }));
      const max = monthly.sort(
        (a, b) => b.count! - a.count! || a.period.localeCompare(b.period),
      )[0];
      if (monthly.every((m) => m.count !== null) && max.count! / l.count >= 0.5)
        out.push({
          key: `concentration-${p.cisp}`,
          cisp: p.cisp,
          indicator: 'letalidade_violenta',
          kind: 'concentration',
          score: max.count!,
          title: 'Um mês concentra a violência letal do período',
          evidence: [
            `${max.period}: ${n(max.count!)} das ${n(l.count)} vítimas (${n((max.count! / l.count) * 100, 1)}%).`,
            `Os outros ${months - 1} meses somam ${n(l.count - max.count!)} vítimas.`,
          ],
          caveat:
            'Concentração temporal não é uma piora contínua. Estes dados, sozinhos, não identificam o evento ou suas causas.',
        });
    }
  }
  return ['contrast', 'divergence', 'component', 'concentration'].flatMap(
    (kind) =>
      out
        .filter((x) => x.kind === kind)
        .sort(
          (a, b) =>
            b.score - a.score || a.cisp - b.cisp || a.key.localeCompare(b.key),
        )
        .slice(0, 2),
  );
}
