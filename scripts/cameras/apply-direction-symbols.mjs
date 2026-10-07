import fs from 'node:fs';
// Symbol dimensions are presentation choices, separate from optical coverage.
const symbols = [['homes-posto-3', {
  bearingDeg: 58.5,
  spreadDeg: 35,
  displayLengthMeters: 180,
  source: 'https://homesinrio.com/rio-de-janeiro-luxury-apartment-webcam',
  assessedAt: '2026-09-26',
  note: 'Cone esquemático de direção: nordeste, conforme descrição do operador e referências geográficas de Leme e Pão de Açúcar. A abertura e o comprimento do desenho não representam o campo de visão nem o alcance da câmera. Posição aproximada do prédio.',
}], ['camerasrj-310', {
  bearingDeg: 225,
  spreadDeg: 35,
  displayLengthMeters: 80,
  source: 'https://irph.prefeitura.rio/patrimonio-em-cores/attachment/pag-21-paroquia-nossa-senhora-da-gloria-rio-de-janeiro/',
  assessedAt: '2026-09-27',
  note: 'Cone esquemático de direção: sudoeste, em direção à Igreja Nossa Senhora da Glória identificada na imagem. O ponto da câmera é uma referência aproximada do cruzamento. A abertura e o comprimento do desenho não representam o campo de visão nem o alcance da câmera.',
}]];
const catalogPath = 'public/data/public-cameras.json';
const updatesPath = 'research/cameras/reviewed-updates.json';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const updates = JSON.parse(fs.readFileSync(updatesPath, 'utf8'));
for (const [id, directionSymbol] of symbols) {
const camera = catalog.cameras.find(c => c.id === id);
if (!camera) throw new Error('Camera missing');
camera.directionSymbol = directionSymbol;
const previous = updates.find(c => c.id === id);
if (previous) previous.directionSymbol = directionSymbol;
else updates.push({id, directionSymbol});
}
fs.writeFileSync(catalogPath, JSON.stringify(catalog) + '\n');
fs.writeFileSync(updatesPath, JSON.stringify(updates, null, 2) + '\n');
console.log('Applied sourced direction symbol; optical coverage remains unknown.');
