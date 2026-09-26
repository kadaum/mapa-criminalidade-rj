import fs from 'node:fs';
// Symbol dimensions are presentation choices, separate from optical coverage.
const id = 'homes-posto-3';
const directionSymbol = {
  bearingDeg: 58.5,
  spreadDeg: 35,
  displayLengthMeters: 180,
  source: 'https://homesinrio.com/rio-de-janeiro-luxury-apartment-webcam',
  assessedAt: '2026-09-26',
  note: 'Cone esquemático de direção: nordeste, conforme descrição do operador e referências geográficas de Leme e Pão de Açúcar. A abertura e o comprimento do desenho não representam o campo de visão nem o alcance da câmera. Posição aproximada do prédio.',
};
const catalogPath = 'public/data/public-cameras.json';
const updatesPath = 'research/cameras/reviewed-updates.json';
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
const updates = JSON.parse(fs.readFileSync(updatesPath, 'utf8'));
const camera = catalog.cameras.find(c => c.id === id);
if (!camera) throw new Error('Camera missing');
camera.directionSymbol = directionSymbol;
const previous = updates.find(c => c.id === id);
if (previous) previous.directionSymbol = directionSymbol;
else updates.push({id, directionSymbol});
fs.writeFileSync(catalogPath, JSON.stringify(catalog) + '\n');
fs.writeFileSync(updatesPath, JSON.stringify(updates, null, 2) + '\n');
console.log('Applied sourced direction symbol; optical coverage remains unknown.');
