"""Deriva um contexto de renda exploratorio por CISP a partir do Censo 2022.

Uso:
  python scripts/derive-cisp-income.py \
    RJ_setores_CD2022.gpkg \
    Agregados_por_setores_renda_responsavel_BR.csv \
    /tmp/CISPshp/cisp.shp \
    research/data/cisp-income-context.json

Requer geopandas, pandas e pyogrio. O indicador produzido NAO e renda per
capita nem a mediana oficial da CISP: e a media ponderada, pelo numero de
responsaveis, das medianas setoriais do rendimento nominal mensal dos
responsaveis com rendimento (V06006). Ele deve ser usado somente para ordenar
grupos socioeconomicos em analises exploratorias.
"""

from __future__ import annotations

import hashlib
import json
import sys
from datetime import date
from pathlib import Path

import geopandas as gpd
import pandas as pd


SECTOR_FILE, INCOME_FILE, CISP_FILE, OUTPUT_FILE = map(Path, sys.argv[1:5])


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


sectors = gpd.read_file(
    SECTOR_FILE,
    layer="RJ_setores_CD2022",
    where="CD_MUN='3304557'",
)[["CD_SETOR", "geometry"]]
sectors = sectors.dissolve(by="CD_SETOR").reset_index()

income = pd.read_csv(
    INCOME_FILE,
    sep=";",
    dtype={"CD_SETOR": str},
    usecols=["CD_SETOR", "V06001", "V06002", "V06004", "V06006"],
    na_values=["X"],
)
for column in ["V06001", "V06002", "V06004", "V06006"]:
    income[column] = pd.to_numeric(income[column], errors="coerce")
sectors = sectors.merge(income, on="CD_SETOR", how="left")

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
    .dropna(subset=["cisp"])
)
assigned["cisp"] = assigned.cisp.astype(int)


def weighted_average(group: pd.DataFrame, column: str) -> float:
    values = group[[column, "V06001"]].dropna()
    values = values[values.V06001 > 0]
    return float((values[column] * values.V06001).sum() / values.V06001.sum())


records = []
for cisp, group in assigned.groupby("cisp"):
    records.append(
        {
            "cisp": int(cisp),
            "sectorCount": int(len(group)),
            "responsiblePersons": int(group.V06001.fillna(0).sum()),
            "residentsInOccupiedPrivateHouseholds": int(group.V06002.fillna(0).sum()),
            "weightedSectorMeanIncome": round(weighted_average(group, "V06004"), 2),
            "weightedSectorMedianIncomeProxy": round(weighted_average(group, "V06006"), 2),
        }
    )

result = {
    "schemaVersion": 1,
    "generatedAt": date.today().isoformat(),
    "status": "exploratory",
    "source": {
        "publisher": "Instituto Brasileiro de Geografia e Estatistica",
        "title": "Agregados por Setores Censitarios - Rendimento do Responsavel",
        "dataUrl": "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/Agregados_por_setores_renda_responsavel_BR_20260508_csv.zip",
        "dictionaryUrl": "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios_Rendimento_do_Responsavel/dicionario_de_dados_renda_responsavel_20260508.xlsx",
        "geometryUrl": "https://ftp.ibge.gov.br/Censos/Censo_Demografico_2022/Agregados_por_Setores_Censitarios/malha_com_atributos/setores/gpkg/UF/RJ/RJ_setores_CD2022.gpkg",
        "cispBoundaryUrl": "https://www.ispdados.rj.gov.br/Arquivos/CISPshp.rar",
        "inputSha256": sha256(INCOME_FILE),
    },
    "method": "Cada setor do Rio foi atribuido a geometria oficial da CISP com maior area de intersecao em EPSG:31983. O proxy e a media ponderada por V06001 das medianas setoriais V06006; nao e renda per capita nem mediana oficial da CISP.",
    "audit": {
        "municipalityCode": "3304557",
        "assignedSectorCount": int(len(assigned)),
        "cispCount": int(len(records)),
    },
    "records": sorted(records, key=lambda record: record["cisp"]),
}

OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)
OUTPUT_FILE.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
print(json.dumps(result["audit"], ensure_ascii=False, indent=2))
