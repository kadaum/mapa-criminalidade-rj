import assert from 'node:assert/strict';
import test from 'node:test';
import {
  isSameOrigin,
  moderatorAuthorization,
  readBoundedJson,
  validateContribution,
  validateReview,
} from '../lib/contribution-core.ts';
import {
  contributionStatus,
  createContribution,
} from '../lib/contribution-service.ts';

void test('validation accepts the three bounded contribution types and normalizes public URLs', () => {
  for (const kind of ['camera_broken', 'correct_location', 'suggest_source']) {
    const result = validateContribution({
      kind,
      sourceUrl: 'https://example.org/camera?id=1',
      comment: '  observação  ',
      website: '',
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.comment, 'observação');
  }
  assert.equal(
    validateContribution({ kind: 'suggest_source', comment: 'x' }).ok,
    false,
  );
  assert.equal(
    validateContribution({
      kind: 'camera_broken',
      sourceUrl: 'file:///etc/passwd',
      comment: 'x',
    }).ok,
    false,
  );
  assert.equal(
    validateContribution({
      kind: 'camera_broken',
      sourceUrl: 'https://user:pass@example.org',
      comment: 'x',
    }).ok,
    false,
  );
  assert.equal(
    validateContribution({
      kind: 'camera_broken',
      sourceUrl: 'http://localhost/admin',
      comment: 'x',
    }).ok,
    false,
  );
  assert.equal(
    validateContribution({
      kind: 'camera_broken',
      sourceUrl: 'https://192.168.1.4/feed',
      comment: 'x',
    }).ok,
    false,
  );
  assert.equal(
    validateContribution({ kind: 'camera_broken', comment: 'x'.repeat(1001) })
      .ok,
    false,
  );
  assert.equal(
    validateContribution({
      kind: 'camera_broken',
      comment: 'x',
      website: 'bot',
    }).ok,
    false,
  );
});

void test('writes require the exact request origin and bounded JSON', async () => {
  assert.equal(
    isSameOrigin(
      new Request('https://site.test/api', {
        headers: { origin: 'https://site.test' },
      }),
    ),
    true,
  );
  assert.equal(
    isSameOrigin(
      new Request('https://site.test/api', {
        headers: { origin: 'https://evil.test' },
      }),
    ),
    false,
  );
  await assert.rejects(
    () =>
      readBoundedJson(
        new Request('https://site.test', {
          method: 'POST',
          body: '{}',
          headers: { 'content-type': 'text/plain' },
        }),
      ),
    (error: Response) => error.status === 415,
  );
  await assert.rejects(
    () =>
      readBoundedJson(
        new Request('https://site.test', {
          method: 'POST',
          body: 'x'.repeat(12001),
          headers: { 'content-type': 'application/json' },
        }),
      ),
    (error: Response) => error.status === 413,
  );
});

void test('moderation denies missing configuration, anonymous and wrong identities', () => {
  assert.equal(moderatorAuthorization(null, 'owner').status, 401);
  assert.equal(moderatorAuthorization('owner', undefined).status, 403);
  assert.equal(moderatorAuthorization('other', 'owner,second').status, 403);
  assert.equal(moderatorAuthorization('owner', 'owner,second').ok, true);
  assert.equal(validateReview({ status: 'pending', note: '' }).ok, false);
  assert.equal(
    validateReview({ status: 'accepted', note: 'x'.repeat(501) }).ok,
    false,
  );
});

type Row = Record<string, unknown>;
class FakeStatement {
  args: unknown[] = [];
  private db: FakeDb;
  readonly sql: string;
  constructor(db: FakeDb, sql: string) {
    this.db = db;
    this.sql = sql;
  }
  bind(...args: unknown[]) {
    this.args = args;
    return this;
  }
  async run() {
    return this.db.execute(this);
  }
  async all<T>() {
    return this.db.query(this) as Promise<{ results: T[] }>;
  }
  async first<T>() {
    return (await this.db.query(this)).results[0] as T | null;
  }
}
class FakeDb {
  rates = new Map<string, number>();
  rows: Row[] = [];
  statements: FakeStatement[] = [];
  prepare(sql: string) {
    const statement = new FakeStatement(this, sql);
    this.statements.push(statement);
    return statement as unknown as D1PreparedStatement;
  }
  async batch(statements: D1PreparedStatement[]) {
    return Promise.all(
      statements.map((item) =>
        (item as unknown as FakeStatement).sql.startsWith('SELECT')
          ? this.query(item as unknown as FakeStatement)
          : this.execute(item as unknown as FakeStatement),
      ),
    ) as unknown as Promise<D1Result<unknown>[]>;
  }
  async execute(statement: FakeStatement) {
    if (statement.sql.startsWith('INSERT INTO contribution_rate_limits')) {
      const key = `${String(statement.args[0])}:${String(statement.args[1])}`;
      this.rates.set(key, (this.rates.get(key) ?? 0) + 1);
    }
    if (statement.sql.startsWith('INSERT INTO contributions'))
      this.rows.push({
        id: statement.args[0],
        protocol_hash: statement.args[1],
        status: statement.args[5],
        created_at: statement.args[6],
        reviewed_at: null,
        expires_at: statement.args[7],
      });
    return { results: [], success: true, meta: { changes: 1 } };
  }
  async query(statement: FakeStatement) {
    if (statement.sql.includes('FROM contribution_rate_limits'))
      return {
        results: [
          {
            request_count:
              this.rates.get(`${String(statement.args[0])}:${String(statement.args[1])}`) ?? 0,
          },
        ],
        success: true,
        meta: {},
      };
    if (statement.sql.includes('WHERE protocol_hash = ?'))
      return {
        results: this.rows.filter(
          (row) =>
            row.protocol_hash === statement.args[0] &&
            Number(row.expires_at) > Number(statement.args[1]),
        ),
        success: true,
        meta: {},
      };
    return { results: [], success: true, meta: {} };
  }
}

void test('D1 queue is durable across service calls, parameterized, opaque and rate limited', async () => {
  const db = new FakeDb();
  const input = { kind: 'camera_broken', comment: 'teste', sourceUrl: null };
  const now = Math.floor(Date.now() / 1000);
  const first = await createContribution(
    db as unknown as D1Database,
    input,
    'hashed-ip',
    now,
  );
  assert.equal(first.ok, true);
  if (!first.ok) return;
  const stored = await contributionStatus(
    db as unknown as D1Database,
    first.protocol,
  );
  assert.equal(stored?.status, 'pending');
  assert.equal(
    JSON.stringify(db.rows).includes(first.protocol),
    false,
    'raw protocol must not be stored',
  );
  assert.ok(
    db.statements.every(
      (statement) =>
        !statement.sql.includes('hashed-ip') &&
        !statement.sql.includes('teste'),
    ),
    'values must be bound parameters',
  );
  for (let i = 0; i < 4; i++)
    assert.equal(
      (
        await createContribution(
          db as unknown as D1Database,
          input,
          'hashed-ip',
          now,
        )
      ).ok,
      true,
    );
  const limited = await createContribution(
    db as unknown as D1Database,
    input,
    'hashed-ip',
    now,
  );
  assert.equal(limited.ok, false);
});
