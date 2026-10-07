import {
  isSameOrigin,
  readBoundedJson,
} from '@/lib/contribution-core';
import {
  database,
  requireModerator,
} from '@/lib/contribution-http';
import {
  finalizeObservationRound,
  ObservationConflict,
  ObservationInvalid,
  ObservationNotFound,
  readObservationAttempts,
  readObservationRounds,
  recordObservationAttempt,
  startObservationRound,
} from '@/lib/camera-observation-service';
import {
  CAMERA_MCP_PROTOCOLS,
  exactObject,
  negotiateProtocol,
  validRequestId,
  validateJsonSchema,
} from '@/lib/camera-mcp-protocol';
const nullableNumber = { anyOf: [{ type: 'number' }, { type: 'null' }] };
const sampleSchema = {
  type: 'object',
  properties: {
    at: { type: 'string' }, monotonicMs: { type: 'number' },
    sameDomVideo: { type: 'boolean' }, sameStream: { type: 'boolean' },
    sameTrack: { type: 'boolean' }, trackLive: { type: 'boolean' },
    readyState: { type: 'number' }, width: { type: 'number' }, height: { type: 'number' },
    qualityTotalFrames: nullableNumber, qualityDroppedFrames: nullableNumber,
    counterBasis: { type: 'string', enum: ['quality_non_dropped', 'webkit_decoded'] },
    counterFrames: nullableNumber, presentedFrames: nullableNumber,
  },
  required: ['at','monotonicMs','sameDomVideo','sameStream','sameTrack','trackLive','readyState','width','height','qualityTotalFrames','qualityDroppedFrames','counterBasis','counterFrames','presentedFrames'],
  additionalProperties: false,
};
const attemptSchema = {
  type: 'object',
  properties: {
    roundId: { type: 'string', minLength: 8, maxLength: 100 }, id: { type: 'string' },
    source: { type: 'string' }, publisher: { type: 'string' }, operator: { type: 'string' },
    permission: { type: 'string', enum: ['unknown'] }, adapter: { type: 'string', enum: ['youtube','camerasrj'] },
    context: { type: 'object', properties: {
      device: { const: 'desktop' }, origin: { type: 'string', maxLength: 256 }, headless: { const: true },
      browser: { type: 'string', maxLength: 400 },
      viewport: { type: 'object', properties: { width: { type: 'integer' }, height: { type: 'integer' } }, required: ['width','height'], additionalProperties: false },
    }, required: ['device','origin','headless','browser','viewport'], additionalProperties: false },
    startedAt: { type: 'string' }, endedAt: { type: 'string' }, durationMs: { type: 'number' }, observationDurationMs: { type: 'number' },
    firstFrame: { anyOf: [{ type: 'null' }, { type: 'object', properties: { at: { type: 'string' }, signal: { type: 'string', enum: ['youtube_rvfc_rendered_video','provider_first_frame_live_track'] } }, required: ['at','signal'], additionalProperties: false }] },
    samples: { anyOf: [{ type: 'null' }, { type: 'array', minItems: 2, maxItems: 2, items: sampleSchema }] },
    errorCategory: { anyOf: [{ type: 'null' }, { type: 'string', enum: ['source','access','interrupted'] }] },
    providerError: { anyOf: [{ type: 'null' }, { type: 'object', properties: { at: { type: 'string' }, state: { type: 'string', enum: ['metric','playing','error','interrupted'] }, code: { anyOf: [{ type: 'null' }, { type: 'string', enum: ['codec','offline','notFound','timeout','unavailable'] }] }, httpStatus: { anyOf: [{ type: 'null' }, { type: 'integer', minimum: 100, maximum: 599 }] } }, required: ['at','state','code','httpStatus'], additionalProperties: false }] },
    restricted: { type: 'boolean' }, external: { type: 'boolean' }, sameVideoSourceIdentity: { type: 'boolean' },
    youtubeApiPlaying: { type: 'boolean' }, renderedFrame: { type: 'boolean' },
    navigationError: { anyOf: [{ type: 'null' }, { const: 'navigation_failed' }] },
    outcome: { type: 'string', enum: ['playing','first_frame_only','failed','unknown','restricted','external'] },
  },
  required: ['roundId','id','source','publisher','operator','permission','adapter','context','startedAt','endedAt','durationMs','observationDurationMs','firstFrame','samples','errorCategory','providerError','restricted','external','sameVideoSourceIdentity','youtubeApiPlaying','renderedFrame','navigationError'],
  additionalProperties: false,
};

const tools = [
  {
    name: 'camera_round_start',
    description: 'Cria de forma idempotente uma rodada privada para um subconjunto permitido de câmeras.',
    inputSchema: {
      type: 'object',
      properties: {
        roundId: { type: 'string', minLength: 8, maxLength: 100 },
        expectedIds: { type: 'array', minItems: 1, maxItems: 10, uniqueItems: true, items: { type: 'string' } },
        startedAt: { type: 'string' },
      },
      required: ['roundId', 'expectedIds', 'startedAt'],
      additionalProperties: false,
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'camera_attempt_record',
    description: 'Valida, recalcula e registra uma tentativa sanitizada sem alterar o catálogo público.',
    inputSchema: {
      type: 'object',
      properties: {
        attempt: attemptSchema,
      },
      required: ['attempt'],
      additionalProperties: false,
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'camera_round_finalize',
    description: 'Finaliza uma rodada como completa, parcial ou falha, preservando tentativas existentes.',
    inputSchema: {
      type: 'object',
      properties: {
        roundId: { type: 'string', minLength: 8, maxLength: 100 },
        state: { type: 'string', enum: ['complete', 'partial', 'failed'] },
      },
      required: ['roundId', 'state'],
      additionalProperties: false,
    },
    annotations: { destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'camera_rounds_read',
    description: 'Lista um número limitado de resumos privados de rodadas para revisão.',
    inputSchema: {
      type: 'object',
      properties: { limit: { type: 'integer', minimum: 1, maximum: 50 } },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
  {
    name: 'camera_attempts_export',
    description: 'Exporta tentativas canônicas privadas em ordem temporal determinística.',
    inputSchema: {
      type: 'object',
      properties: {
        roundId: { type: 'string', minLength: 8, maxLength: 100 },
        cameraId: { type: 'string' },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
      },
      additionalProperties: false,
    },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  },
];

function jsonRpc(id: unknown, result: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return Response.json({ jsonrpc: '2.0', id: id ?? null, result }, { ...init, headers });
}

function jsonRpcError(id: unknown, code: number, message: string, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Cache-Control', 'no-store');
  headers.set('Content-Type', 'application/json; charset=utf-8');
  return Response.json({ jsonrpc: '2.0', id: id ?? null, error: { code, message } }, { ...init, headers });
}

function toolResult(value: unknown, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(value) }],
    structuredContent: isError ? undefined : value,
    ...(isError ? { isError: true } : {}),
  };
}

function plainError(error: unknown) {
  if (error instanceof ObservationConflict) return { code: 'conflict', message: error.message };
  if (error instanceof ObservationNotFound) return { code: 'not_found', message: error.message };
  if (error instanceof ObservationInvalid) return { code: 'invalid_input', message: error.message };
  console.error('Camera observation MCP call failed');
  return { code: 'internal_error', message: 'Não foi possível concluir a operação.' };
}

function noStoreResponse(response: Response) {
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function invalidOrigin(request: Request) {
  return request.headers.has('origin') && !isSameOrigin(request);
}

export async function POST(request: Request) {
  if (invalidOrigin(request)) return new Response('Origem inválida.', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  const version = request.headers.get('mcp-protocol-version');
  if (version && !CAMERA_MCP_PROTOCOLS.has(version))
    return new Response('Versão MCP não suportada.', { status: 400, headers: { 'Cache-Control': 'no-store' } });
  let message: Record<string, unknown>;
  try {
    const parsed = await readBoundedJson(request);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return jsonRpcError(null, -32600, 'Invalid Request');
    message = parsed as Record<string, unknown>;
  } catch (error) {
    if (error instanceof Response) return noStoreResponse(error);
    return jsonRpcError(null, -32700, 'Parse error');
  }
  if (message.jsonrpc !== '2.0' || typeof message.method !== 'string')
    return jsonRpcError(message.id, -32600, 'Invalid Request');
  if (!exactObject(message, ['jsonrpc','id','method','params']))
    return jsonRpcError(message.id, -32600, 'Invalid Request');
  if (message.id === undefined)
    return new Response(null, { status: 202, headers: { 'Cache-Control': 'no-store' } });
  if (!validRequestId(message.id))
    return jsonRpcError(null, -32600, 'Invalid Request');

  if (message.method === 'initialize') {
    const requested = (message.params as { protocolVersion?: unknown } | undefined)?.protocolVersion;
    const protocolVersion = negotiateProtocol(requested);
    return jsonRpc(message.id, {
      protocolVersion,
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'mapa-criminalidade-rj-camera-observations', version: '1.0.0' },
    });
  }
  if (message.method === 'ping') return jsonRpc(message.id, {});
  if (message.method === 'tools/list') return jsonRpc(message.id, { tools });
  if (message.method !== 'tools/call')
    return jsonRpcError(message.id, -32601, 'Method not found');

  try {
    const moderatorId = requireModerator(request);
    const params = message.params as { name?: unknown; arguments?: unknown } | undefined;
    if (!exactObject(params, ['name','arguments']) || typeof params?.name !== 'string')
      return jsonRpcError(message.id, -32602, 'Invalid params');
    const args = params.arguments ?? {};
    const tool = tools.find((candidate) => candidate.name === params.name);
    if (!tool) return jsonRpcError(message.id, -32602, 'Unknown tool');
    if (!validateJsonSchema(args, tool.inputSchema))
      return jsonRpcError(message.id, -32602, 'Invalid params');
    let value: unknown;
    switch (params.name) {
      case 'camera_round_start':
        value = await startObservationRound(database(), args, moderatorId);
        break;
      case 'camera_attempt_record':
        value = await recordObservationAttempt(database(), (args as { attempt?: unknown }).attempt);
        break;
      case 'camera_round_finalize':
        value = await finalizeObservationRound(database(), args);
        break;
      case 'camera_rounds_read':
        value = await readObservationRounds(database(), args);
        break;
      case 'camera_attempts_export':
        value = await readObservationAttempts(database(), args);
        break;
      default:
        return jsonRpcError(message.id, -32602, 'Unknown tool');
    }
    return jsonRpc(message.id, toolResult(value));
  } catch (error) {
    if (error instanceof Response) return noStoreResponse(error);
    return jsonRpc(message.id, toolResult(plainError(error), true));
  }
}

export function GET(request: Request) {
  if (invalidOrigin(request)) return new Response('Origem inválida.', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { Allow: 'POST', 'Cache-Control': 'no-store' },
  });
}
