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

export function contextForNeighborhood(
  context: NeighborhoodContext,
  name: string,
): NeighborhoodContextRecord | undefined {
  return context.records.find((record) => record.name === name);
}

export function contextPercent(metric: NeighborhoodMetric): number | null {
  return metric.total > 0 ? metric.yesPct : null;
}
