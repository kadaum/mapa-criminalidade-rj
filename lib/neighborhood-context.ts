export type NeighborhoodMetric = {
  yes: number;
  no: number;
  unknown: number;
  total: number;
  yesPct: number;
};

export type NeighborhoodContextRecord = {
  ibgeCode: string;
  name: string;
  municipalityCode: string;
  householdsSurveyed: number;
  lighting: NeighborhoodMetric;
  sidewalk: NeighborhoodMetric;
};

export type NeighborhoodContext = {
  schemaVersion: 1;
  retrievedAt: string;
  retrievedAtLocal?: string;
  reference: string;
  source: {
    publisher: string;
    dataUrl: string;
    dictionaryUrl: string;
    zipSha256: string;
    dictionaryEntries: string[];
    licenseStatus: string;
    attribution: string;
  };
  method: string;
  limitations: string[];
  records: NeighborhoodContextRecord[];
};

export function neighborhoodDataset(context: NeighborhoodContext, neighborhoodName: string) {
  return {
    '@type': 'Dataset',
    name: context.reference,
    description: `${context.reference}: agregados do Censo Demográfico 2022 do IBGE sobre características observadas no entorno dos domicílios. Esta página apresenta o recorte de ${neighborhoodName}, com domicílios pesquisados e proporções com iluminação pública e calçada; “não declarado” permanece no denominador. Os dados descrevem observações de 2022, não funcionamento, conservação, acessibilidade ou segurança da infraestrutura.`,
    creator: { '@type': 'Organization', name: context.source.publisher },
    distribution: { '@type': 'DataDownload', contentUrl: context.source.dataUrl, encodingFormat: 'ZIP' },
  };
}

export function contextForNeighborhood(
  context: NeighborhoodContext,
  name: string,
): NeighborhoodContextRecord | undefined {
  return context.records.find((record) => record.name === name);
}

export function contextPercent(metric: NeighborhoodMetric): number | null {
  return metric.total > 0 ? metric.yesPct : null;
}
