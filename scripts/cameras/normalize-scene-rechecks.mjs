import fs from 'node:fs';
const input = process.argv[2] || 'research/cameras/reviewed-mapped-scenes-2026-09-27.jsonl';
const output = process.argv[3] || 'research/cameras/reviewed-scene-rechecks-2026-09-27.json';
const visual = new Map(JSON.parse(fs.readFileSync('research/cameras/mapped-scenes-visual-review-2026-09-26.json', 'utf8')).cameras.map(c => [c.id, c]));
const latest = new Map();
for (const line of fs.readFileSync(input, 'utf8').split(/\r?\n/).filter(Boolean)) {
  const row = JSON.parse(line);
  if (row.status !== 'deferred_rate_limit' && (!latest.has(row.id) || latest.get(row.id).checkedAt < row.checkedAt)) latest.set(row.id, row);
}
const records = [...latest.values()].map(row => {
  const review = visual.get(row.id);
  const available = row.status === 'image_available';
  if (available) {
    const [a, b] = row.samples || [];
    if (!a || !b || Date.parse(b.observedAt) - Date.parse(a.observedAt) < 2500 || !(b.video.frames > a.video.frames && b.video.time > a.video.time + 0.5 && b.video.width >= 64 && b.video.height >= 36)) throw new Error(`Invalid evidence pair: ${row.id}`);
    if (!review) throw new Error(`Missing visual review: ${row.id}`);
  }
  const unusable = available && review.visualStatus === 'image_unavailable';
  const occluded = available && /occlud/.test(review.visualStatus);
  return {id: row.id, playbackCheck: {
    checkedAt: row.checkedAt,
    outcome: unusable ? 'failed' : available ? 'playing' : 'inconclusive',
    reason: unusable
      ? 'O vídeo avançou, mas a revisão visual encontrou imagem preta sem cena utilizável.'
      : available
        ? occluded
          ? 'O vídeo avançou na rechecagem, mas a imagem tem obstruções que limitam a visualização do local.'
          : 'Vídeo em movimento confirmado por duas amostras e revisão visual das imagens capturadas. A disponibilidade pode mudar.'
        : 'A rechecagem não recebeu duas imagens de cena verificáveis em até 45 segundos. Isso não comprova que a câmera esteja desligada.',
    method: 'Chrome em iframe visível; pares de amostras com dimensões reais e avanço de tempo/quadros, seguidos de inspeção visual quando havia captura.',
  }};
});
fs.writeFileSync(output, JSON.stringify(records, null, 2) + '\n');
console.log(JSON.stringify({records: records.length, counts: records.reduce((a, r) => (a[r.playbackCheck.outcome] = (a[r.playbackCheck.outcome] || 0) + 1, a), {})}));
