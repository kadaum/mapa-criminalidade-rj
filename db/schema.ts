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
