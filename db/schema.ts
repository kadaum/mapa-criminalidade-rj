import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';

export const contributions = sqliteTable(
  'contributions',
  {
    id: text('id').primaryKey(),
    protocolHash: text('protocol_hash').notNull(),
    kind: text('kind', {
      enum: ['camera_broken', 'correct_location', 'suggest_source'],
    }).notNull(),
    sourceUrl: text('source_url'),
    comment: text('comment').notNull(),
    status: text('status', {
      enum: ['pending', 'reviewing', 'accepted', 'rejected'],
    })
      .notNull()
      .default('pending'),
    moderatorNote: text('moderator_note'),
    createdAt: integer('created_at').notNull(),
    reviewedAt: integer('reviewed_at'),
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [
    uniqueIndex('contributions_protocol_hash_unique').on(table.protocolHash),
    index('contributions_status_created_idx').on(table.status, table.createdAt),
    index('contributions_expires_idx').on(table.expiresAt),
    check(
      'contributions_kind_check',
      sql`${table.kind} in ('camera_broken', 'correct_location', 'suggest_source')`,
    ),
    check(
      'contributions_status_check',
      sql`${table.status} in ('pending', 'reviewing', 'accepted', 'rejected')`,
    ),
  ],
);

export const contributionRateLimits = sqliteTable(
  'contribution_rate_limits',
  {
    ipHash: text('ip_hash').notNull(),
    windowStart: integer('window_start').notNull(),
    requestCount: integer('request_count').notNull().default(1),
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.ipHash, table.windowStart] }),
    index('contribution_rate_limits_expires_idx').on(table.expiresAt),
  ],
);

export const cameraObservationRounds = sqliteTable(
  'camera_observation_rounds',
  {
    roundId: text('round_id').primaryKey(),
    expectedIdsJson: text('expected_ids_json').notNull(),
    expectedCount: integer('expected_count').notNull(),
    state: text('state', {
      enum: ['open', 'complete', 'partial', 'failed'],
    })
      .notNull()
      .default('open'),
    collectorId: text('collector_id').notNull(),
    startedAtMs: integer('started_at_ms').notNull(),
    finishedAtMs: integer('finished_at_ms'),
    createdAt: integer('created_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [
    index('camera_observation_rounds_state_started_idx').on(
      table.state,
      table.startedAtMs,
    ),
    index('camera_observation_rounds_expires_idx').on(table.expiresAt),
    check(
      'camera_observation_rounds_state_check',
      sql`${table.state} in ('open', 'complete', 'partial', 'failed')`,
    ),
  ],
);

export const cameraObservationAttempts = sqliteTable(
  'camera_observation_attempts',
  {
    roundId: text('round_id')
      .notNull()
      .references(() => cameraObservationRounds.roundId, {
        onDelete: 'restrict',
      }),
    cameraId: text('camera_id').notNull(),
    startedAtMs: integer('started_at_ms').notNull(),
    endedAtMs: integer('ended_at_ms').notNull(),
    receivedAtMs: integer('received_at_ms').notNull(),
    outcome: text('outcome', {
      enum: [
        'playing',
        'first_frame_only',
        'failed',
        'unknown',
        'restricted',
        'external',
      ],
    }).notNull(),
    payloadJson: text('payload_json').notNull(),
    payloadSha256: text('payload_sha256').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roundId, table.cameraId] }),
    index('camera_observation_attempts_latest_idx').on(
      table.cameraId,
      table.endedAtMs,
      table.receivedAtMs,
      table.roundId,
    ),
    index('camera_observation_attempts_expires_idx').on(table.expiresAt),
    check(
      'camera_observation_attempts_outcome_check',
      sql`${table.outcome} in ('playing', 'first_frame_only', 'failed', 'unknown', 'restricted', 'external')`,
    ),
  ],
);
