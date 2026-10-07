import assert from 'node:assert/strict';
import test from 'node:test';
import { isSameOrigin, moderatorAuthorization } from '../lib/contribution-core.ts';
import {
  CAMERA_MCP_LATEST_PROTOCOL,
  CAMERA_MCP_PROTOCOLS,
  exactObject,
  negotiateProtocol,
  validRequestId,
  validateJsonSchema,
} from '../lib/camera-mcp-protocol.ts';

void test('MCP protocol negotiation, IDs and closed tool envelopes are bounded', () => {
  for (const version of CAMERA_MCP_PROTOCOLS) assert.equal(negotiateProtocol(version), version);
  assert.equal(negotiateProtocol('2099-01-01'), CAMERA_MCP_LATEST_PROTOCOL);
  assert.equal(validRequestId('a'), true);
  assert.equal(validRequestId(1), true);
  assert.equal(validRequestId(null), false);
  assert.equal(validRequestId({}), false);
  assert.equal(exactObject({ jsonrpc: '2.0', method: 'tools/list' }, ['jsonrpc','id','method','params']), true);
  assert.equal(exactObject({ jsonrpc: '2.0', method: 'tools/list', private: true }, ['jsonrpc','id','method','params']), false);
  const schema = { type: 'object', properties: { limit: { type: 'integer', minimum: 1, maximum: 50 } }, additionalProperties: false };
  assert.equal(validateJsonSchema({ limit: 10 }, schema), true);
  assert.equal(validateJsonSchema({}, schema), true);
  assert.equal(validateJsonSchema({ limit: '10' }, schema), false);
  assert.equal(validateJsonSchema({ limit: 10, extra: true }, schema), false);
  assert.equal(validateJsonSchema([], schema), false);
});

void test('data-bearing calls require configured managed identity and cross-origin requests fail', () => {
  assert.equal(moderatorAuthorization(null, 'owner').status, 401);
  assert.equal(moderatorAuthorization('other', 'owner').status, 403);
  assert.equal(moderatorAuthorization('owner', 'owner').ok, true);
  assert.equal(isSameOrigin(new Request('https://site.test/mcp', { headers: { origin: 'https://site.test' } })), true);
  assert.equal(isSameOrigin(new Request('https://site.test/mcp', { headers: { origin: 'https://other.test' } })), false);
});
