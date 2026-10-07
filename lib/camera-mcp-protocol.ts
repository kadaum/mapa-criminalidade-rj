export const CAMERA_MCP_PROTOCOLS = new Set(['2025-03-26','2025-06-18','2025-11-25']);
export const CAMERA_MCP_LATEST_PROTOCOL = '2025-11-25';

export function exactObject(value: unknown, keys: string[]) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const allowed = new Set(keys);
  return Object.keys(value).every((key) => allowed.has(key));
}

export function validRequestId(value: unknown) {
  return typeof value === 'string' || (Number.isInteger(value) && Number.isFinite(value));
}

export function negotiateProtocol(value: unknown) {
  return typeof value === 'string' && CAMERA_MCP_PROTOCOLS.has(value)
    ? value
    : CAMERA_MCP_LATEST_PROTOCOL;
}

type Schema = Record<string, unknown>;
export function validateJsonSchema(value: unknown, schema: Schema): boolean {
  if (Array.isArray(schema.anyOf))
    return schema.anyOf.some((candidate) => validateJsonSchema(value, candidate as Schema));
  if ('const' in schema && !Object.is(value, schema.const)) return false;
  if (Array.isArray(schema.enum) && !schema.enum.some((item) => Object.is(value, item))) return false;
  switch (schema.type) {
    case 'null': return value === null;
    case 'boolean': return typeof value === 'boolean';
    case 'number': return typeof value === 'number' && Number.isFinite(value) &&
      (schema.minimum === undefined || value >= Number(schema.minimum)) &&
      (schema.maximum === undefined || value <= Number(schema.maximum));
    case 'integer': return Number.isInteger(value) && Number.isFinite(value) &&
      (schema.minimum === undefined || Number(value) >= Number(schema.minimum)) &&
      (schema.maximum === undefined || Number(value) <= Number(schema.maximum));
    case 'string': return typeof value === 'string' &&
      (schema.minLength === undefined || value.length >= Number(schema.minLength)) &&
      (schema.maxLength === undefined || value.length <= Number(schema.maxLength));
    case 'array': {
      if (!Array.isArray(value) || (schema.minItems !== undefined && value.length < Number(schema.minItems)) ||
          (schema.maxItems !== undefined && value.length > Number(schema.maxItems))) return false;
      if (schema.uniqueItems === true && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) return false;
      return !schema.items || value.every((item) => validateJsonSchema(item, schema.items as Schema));
    }
    case 'object': {
      if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
      const object = value as Record<string, unknown>;
      const properties = (schema.properties ?? {}) as Record<string, Schema>;
      if (Array.isArray(schema.required) && schema.required.some((key) => !Object.hasOwn(object, String(key)))) return false;
      if (schema.additionalProperties === false && Object.keys(object).some((key) => !Object.hasOwn(properties, key))) return false;
      return Object.entries(properties).every(([key, child]) => !Object.hasOwn(object, key) || validateJsonSchema(object[key], child));
    }
    default: return true;
  }
}
