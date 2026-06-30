import { pgTable, integer, varchar, timestamp, jsonb, text } from 'drizzle-orm/pg-core';

export const ledgers = pgTable('ledgers', {
  sequence: integer('sequence').primaryKey(),
  hash: varchar('hash', { length: 64 }).notNull(),
  prevHash: varchar('prev_hash', { length: 64 }).notNull(),
  timestamp: integer('timestamp').notNull(),
  transactionCount: integer('transaction_count').notNull(),
  operationCount: integer('operation_count').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const events = pgTable('events', {
  id: varchar('id', { length: 128 }).primaryKey(),
  contractId: varchar('contract_id', { length: 56 }).notNull(),
  type: varchar('type', { length: 16 }).notNull(), // 'contract', 'system', 'diagnostic'
  topics: jsonb('topics').$type<string[]>().notNull(),
  value: text('value').notNull(),
  transactionHash: varchar('transaction_hash', { length: 64 }).notNull(),
  ledgerSequence: integer('ledger_sequence')
    .notNull()
    .references(() => ledgers.sequence, { onDelete: 'cascade' }),
  timestamp: integer('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cursors = pgTable('cursors', {
  indexerId: varchar('indexer_id', { length: 64 }).primaryKey(),
  lastLedger: integer('last_ledger').notNull(),
  status: varchar('status', { length: 16 }).notNull(), // 'starting', 'running', 'stopped', 'failed'
  errorMessage: text('error_message'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
