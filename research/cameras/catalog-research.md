# Rio public camera catalog audit — 2026-09-08

## Deliverables
- `/tmp/catalog-geocoded.json`: all 6,658 unique camera IDs cataloged by CamerasRJ; 962 camera entries geocoded to 462 distinct intersections in 93 neighborhoods; 5,696 unresolved.
- `/tmp/camerasrj-public-catalog.json`: source JSON delivered by website UI, no coordinates or feed credentials.
- `/tmp/camerasrj-normalized-public-catalog.json`: normalized IDs, public page and player links, unknown operator and playback status.
- `/tmp/rio-cadlog-streets.geojson`: 132,063 official street segments, downloaded by paginated read-only ArcGIS queries.
- `/tmp/geocode-camera-intersections.py`: reproducible conservative geocoder.
- `/tmp/fetch-rio-streets.py`: paginated official street acquisition.

## Provenance
Catalog URL observed in website HTML `window.CAMERAS_RJ_ASSETS.bairrosUrl`:
https://www.camerasrj.com.br/js/cor-bairros.6c9cb31aa85ea04fcd6326f2ad52c2d36b43c4893486388dfb3edcee5be9b3ee.json

Public per-camera URL syntax verified from site's frontend JavaScript: `https://www.camerasrj.com.br/?bairro=...&camera=49`; player `https://player.camerasrj.com.br/camera/49/`. No stream URLs, tokens, passwords or restricted municipal feeds used.

Official street source, CC BY 4.0, Instituto Pereira Passos / Prefeitura da Cidade do Rio de Janeiro:
https://www.arcgis.com/home/item.html?id=899168c8feab4230a9f795ed07cdde7b
https://pgeo3.rio.rj.gov.br/arcgis/rest/services/CadLog/Trechos_Logradouros/MapServer/0
The geocoder uses exact normalized street names, same named neighborhood, unique near-coincident vertices within 15 m; rejects ambiguous intersections over 80 m apart. It never assigns a neighborhood center or unverified building location. Each result preserves source object IDs and matched names. Coordinates represent the street intersection, not surveyed camera mount.

## Audit
- 6,658 unique source IDs; 146 named neighborhood groups (includes `Indefinido`).
- 4,126 distinct original captions, so camera count is not physical location count.
- 962 mapped camera entries, 462 distinct intersection coordinates, 93 neighborhood groups.
- All 962 mapped entries fall inside repository `neighborhoods-rio.geojson` polygon union.
- Max vertex separation: 13.55 m.
- Outcomes: 962 resolved; 4,789 not a single clean X intersection; 756 unmatched street names; 74 ambiguous multiple intersections; 77 no shared vertex.
- Example ID49 Rua Barata Ribeiro × Rua Siqueira Campos: [-43.185249,-22.968315], vertex distance 0 m.
- ID1197 Avenida Atlantica × Julio de Castilho remains unresolved due to name mismatch; no guessed fix.

## Availability and use
https://www.camerasrj.com.br/compatibilidade/ (updated 2026-08-06) documents WebRTC H.265/HEVC browser/hardware dependencies. Loading page or iframe is not proof of moving video. An error does not alone prove camera offline. No 6,658-camera streaming sweep performed; normalized playbackStatus is not-checked.
https://www.camerasrj.com.br/termos-de-uso/ permits linking with proper context and protects its editorial organization. Catalog has no explicit open-data license located; no blanket open-source or redistribution permission should be inferred. Avoid copying editorial text/UI and preserve attribution.
https://cor.rio/centro-de-operacoes-e-resiliencia-da-prefeitura-do-rio-disponibiliza-nova-versao-do-aplicativo-cor-rio/ (2025-07-06) confirms 5,000 municipal cameras offered in public app then; historical institutional count is not current count and not additional to CamerasRJ.
https://ofaceoff.github.io/CIVOPS/ currently displays camera catalog connection error. Do not add its supposed count to CamerasRJ; likely overlapping municipal cameras.
