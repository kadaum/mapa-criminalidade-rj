"""Reproduz a população Censo 2022 por CISP.

Uso:
  python scripts/derive-census-population.py RJ_setores_CD2022.gpkg Agregados_por_setores_basico_BR.csv /tmp/CISPshp/cisp.shp

Requer geopandas, pandas e pyogrio. O resultado é impresso em JSON para revisão;
o arquivo publicado permanece versionado e passa pelas validações do projeto.
Use sempre o SHP oficial completo do ISP no terceiro argumento. A geometria
simplificada usada pelo site serve apenas para exibição e distorce fronteiras.
"""

from __future__ import annotations

import json
import sys

import geopandas as gpd
import pandas as pd


SECTOR_FILE, POPULATION_FILE, CISP_FILE = sys.argv[1:4]

sectors = gpd.read_file(
    SECTOR_FILE,
    layer="RJ_setores_CD2022",
    where="CD_MUN='3304557'",
)[["CD_SETOR", "geometry"]]
sectors = sectors.dissolve(by="CD_SETOR").reset_index()

population = pd.read_csv(
    POPULATION_FILE,
    sep=";",
    encoding="latin1",
    decimal=",",
    usecols=["CD_SETOR", "CD_MUN", "v0001"],
    dtype={"CD_SETOR": str, "CD_MUN": str},
)
population = population[population.CD_MUN == "3304557"][["CD_SETOR", "v0001"]]
sectors = sectors.merge(population, on="CD_SETOR", how="left")
sectors["v0001"] = sectors.v0001.fillna(0).astype(int)

cisps = gpd.read_file(CISP_FILE)[["cisp", "geometry"]]
sectors = sectors.to_crs(31983)
cisps = cisps.to_crs(31983)

candidates = gpd.sjoin(sectors, cisps, how="left", predicate="intersects")
candidates = candidates.merge(
    cisps.rename(columns={"geometry": "cisp_geometry"}), on="cisp", how="left"
)
candidates["overlap_m2"] = [
    sector.intersection(cisp).area if cisp is not None else 0
    for sector, cisp in zip(candidates.geometry, candidates.cisp_geometry)
]
assigned = (
    candidates.sort_values(["CD_SETOR", "overlap_m2"], ascending=[True, False])
    .drop_duplicates("CD_SETOR")
)

records = (
    assigned.dropna(subset=["cisp"])
    .groupby("cisp")
    .agg(population=("v0001", "sum"), sectors=("CD_SETOR", "count"))
    .reset_index()
)
records["cisp"] = records.cisp.astype(int)
records["population"] = records.population.astype(int)

unmatched = assigned[assigned.cisp.isna() | (assigned.overlap_m2 <= 0)]
result = {
    "sectorCount": len(sectors),
    "populationTotal": int(sectors.v0001.sum()),
    "populationAssigned": int(records.population.sum()),
    "unmatchedSectorCount": len(unmatched),
    "unmatchedPopulation": int(unmatched.v0001.sum()),
    "records": records.to_dict(orient="records"),
}
print(json.dumps(result, ensure_ascii=False, indent=2))
