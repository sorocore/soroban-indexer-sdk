import { z } from 'zod';

// Config Schemas
export const IndexerConfigSchema = z.object({
  rpcUrl: z.string().url(),
  databaseUrl: z.string(),
  startLedger: z.number().int().nonnegative().default(1),
  networkPassphrase: z.string(),
  concurrency: z.number().int().positive().default(5),
  batchSize: z.number().int().positive().default(100),
  retryLimit: z.number().int().nonnegative().default(3),
  pollIntervalMs: z.number().int().positive().default(1000),
});

export type IndexerConfig = z.infer<typeof IndexerConfigSchema>;

// Ledger Models
export const LedgerMetadataSchema = z.object({
  sequence: z.number().int().positive(),
  hash: z.string(),
  prevHash: z.string(),
  timestamp: z.number().int().positive(),
  transactionCount: z.number().int().nonnegative(),
  operationCount: z.number().int().nonnegative(),
});

export type LedgerMetadata = z.infer<typeof LedgerMetadataSchema>;

// Event Models
export const SorobanEventSchema = z.object({
  id: z.string(),
  contractId: z.string(),
  type: z.enum(['contract', 'system', 'diagnostic']),
  topics: z.array(z.string()),
  value: z.string(), // JSON string of parsed value or raw XDR
  transactionHash: z.string(),
  ledgerSequence: z.number().int().positive(),
  timestamp: z.number().int().positive(),
});

export type SorobanEvent = z.infer<typeof SorobanEventSchema>;

// Cursor State
export const IngestionCursorSchema = z.object({
  indexerId: z.string(),
  lastLedger: z.number().int().nonnegative(),
  status: z.enum(['starting', 'running', 'stopped', 'failed']),
  errorMessage: z.string().optional(),
  updatedAt: z.date(),
});

export type IngestionCursor = z.infer<typeof IngestionCursorSchema>;

// API Query Interfaces
export interface EventFilter {
  contractId?: string;
  topic?: string;
  fromLedger?: number;
  toLedger?: number;
  limit?: number;
  offset?: number;
}
