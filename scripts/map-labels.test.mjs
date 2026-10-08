import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { labelAnchor, visibleLabelIds } from '../lib/map-labels.ts';

test('labels get an interior anchor, including polygons with holes', () => {
  const square = [[0,0],[10,0],[10,10],[0,10],[0,0]];
  const hole = [[2,2],[8,2],[8,8],[2,8],[2,2]];
  const p = labelAnchor({type:'Polygon',coordinates:[square,hole]});
  assert.ok(p && (p[0] < 2 || p[0] > 8 || p[1] < 2 || p[1] > 8));
  const data = JSON.parse(fs.readFileSync(new URL('../public/data/neighborhoods-rio.geojson', import.meta.url)));
  assert.equal(data.features.length,163);
  for (const feature of data.features) assert.ok(labelAnchor(feature.geometry), feature.properties.name);
});

test('zooming apart reveals labels while overlapping names and controls are protected', () => {
  const a={id:1,x:200,y:180,width:110,height:20};
  const b={id:2,x:230,y:180,width:90,height:20};
  assert.deepEqual([...visibleLabelIds([a,b],800,600)],[1]);
  assert.deepEqual([...visibleLabelIds([a,{...b,x:400}],800,600)],[1,2]);
  assert.equal(visibleLabelIds([{...a,y:35},{...b,y:550}],800,600).size,0);
});
