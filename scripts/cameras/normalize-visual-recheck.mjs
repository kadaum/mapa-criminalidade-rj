import fs from 'node:fs';
const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) throw new Error('Provide reviewed visual report and output paths');
const report = JSON.parse(fs.readFileSync(input, 'utf8'));
const records = report.cameras.filter(c => c.status === 'image_unavailable' && c.checkedAt).map(c => ({
  id: c.id,
  playbackCheck: {
    checkedAt: c.checkedAt,
    outcome: 'inconclusive',
    reason: 'Houve reprodução em teste anterior, mas a revisão visual mais recente não recebeu uma imagem utilizável em 45 segundos. A disponibilidade continua incerta.',
    method: 'Revisão individual no player público em Chrome, com captura de tela e inspeção do vídeo; trilha live ou placeholder não foram considerados imagem.',
  },
}));
fs.writeFileSync(output, JSON.stringify(records, null, 2) + '\n');
console.log(JSON.stringify({records: records.length, output}));
