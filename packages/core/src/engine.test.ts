import { describe, it, expect } from 'vitest';
import { IndexerEngine } from './engine.ts';
import type { IDatabaseAdapter, IRpcAdapter, IParserAdapter } from './ports.ts';
import type { SorobanEvent, IngestionCursor, LedgerMetadata, IndexerConfig } from '@soroban-indexer/types';

// ---- Mock Adapters ----

const mockDb: IDatabaseAdapter = {
  saveLedger: async (_ledger: LedgerMetadata) => {},
  saveEvents: async (_events: SorobanEvent[]) => {},
  getCursor: async (_id: string): Promise<IngestionCursor | null> => null,
  updateCursor: async (_cursor: IngestionCursor) => {},
};

const mockRpc: IRpcAdapter = {
  getLatestLedger: async () => 1000,
  getEvents: async () => ({ events: [] }),
};

const mockParser: IParserAdapter = {
  parseEvents: (_raw: unknown[]) => [],
};

const baseConfig: IndexerConfig = {
  rpcUrl: 'https://soroban-testnet.stellar.org:443',
  databaseUrl: 'postgres://localhost/test',
  networkPassphrase: 'Test SDF Network ; September 2015',
  startLedger: 1,
  concurrency: 1,
  batchSize: 10,
  retryLimit: 1,
  pollIntervalMs: 50,
};

describe('IndexerEngine', () => {
  it('constructs without throwing', () => {
    expect(
      () => new IndexerEngine('test-indexer', baseConfig, mockDb, mockRpc, mockParser)
    ).not.toThrow();
  });

  it('stop() can be called before start()', () => {
    const engine = new IndexerEngine('test-indexer', baseConfig, mockDb, mockRpc, mockParser);
    expect(() => engine.stop()).not.toThrow();
  });

  it('picks up existing cursor from the database without throwing', async () => {
    let cursorChecked = false;
    const dbWithCursor: IDatabaseAdapter = {
      ...mockDb,
      getCursor: async () => {
        cursorChecked = true;
        return {
          indexerId: 'test-indexer',
          lastLedger: 999,
          status: 'running',
          updatedAt: new Date(),
        };
      },
    };

    // RPC returns the same ledger as cursor — engine should wait (poll)
    const rpcAtLedger: IRpcAdapter = {
      getLatestLedger: async () => 999,
      getEvents: async () => ({ events: [] }),
    };

    const engine = new IndexerEngine('test-indexer', baseConfig, dbWithCursor, rpcAtLedger, mockParser);
    const startPromise = engine.start();
    await new Promise((r) => setTimeout(r, 200)); // let start() call getCursor
    engine.stop();
    await startPromise.catch(() => {});
    // getCursor must have been called during start()
    expect(cursorChecked).toBe(true);
  });
});
