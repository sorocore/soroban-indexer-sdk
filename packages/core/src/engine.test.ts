import { describe, it, expect } from 'vitest';
import { IndexerEngine } from './engine.js';
import type { IDatabaseAdapter, IRpcAdapter, IParserAdapter } from './ports.js';
import type {
  SorobanEvent,
  IngestionCursor,
  LedgerMetadata,
  IndexerConfig,
} from '@soroban-indexer/types';

// ---- Mock Adapters ----

const mockDb: IDatabaseAdapter = {
  saveLedger: async (_ledger: LedgerMetadata) => {},
  saveEvents: async (_events: SorobanEvent[]) => {},
  getCursor: async (_id: string): Promise<IngestionCursor | null> => null,
  updateCursor: async (_cursor: IngestionCursor) => {},
  pruneOldEvents: async (_threshold: number) => 0,
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

    const engine = new IndexerEngine(
      'test-indexer',
      baseConfig,
      dbWithCursor,
      rpcAtLedger,
      mockParser
    );
    const startPromise = engine.start();
    await new Promise((r) => setTimeout(r, 200)); // let start() call getCursor
    engine.stop();
    await startPromise.catch(() => {});
    // getCursor must have been called during start()
    expect(cursorChecked).toBe(true);
  });

  it('triggers pruning when retentionPeriodDays is configured', async () => {
    let pruneCalled = false;
    const dbWithPruning: IDatabaseAdapter = {
      ...mockDb,
      pruneOldEvents: async (_threshold: number) => {
        pruneCalled = true;
        return 5;
      },
    };
    const rpc: IRpcAdapter = {
      getLatestLedger: async () => 10,
      getEvents: async () => ({ events: [] }),
    };
    const configWithRetention = { ...baseConfig, retentionPeriodDays: 30 };
    const engine = new IndexerEngine('test', configWithRetention, dbWithPruning, rpc, mockParser);
    const p = engine.start();
    await new Promise((r) => setTimeout(r, 100)); // allow runLoop to run
    engine.stop();
    await p.catch(() => {});
    expect(pruneCalled).toBe(true);
  });

  it('starts metrics server and responds to /health and /metrics when metricsPort is configured', async () => {
    const testPort = 19876;
    const configWithMetrics = { ...baseConfig, metricsPort: testPort };
    const rpc: IRpcAdapter = {
      getLatestLedger: async () => 500,
      getEvents: async () => ({ events: [] }),
    };

    const engine = new IndexerEngine('test-telemetry', configWithMetrics, mockDb, rpc, mockParser);
    const startPromise = engine.start();

    // Wait for server to bind
    await new Promise((r) => setTimeout(r, 100));

    try {
      const healthRes = await fetch(`http://127.0.0.1:${testPort}/health`);
      expect(healthRes.status).toBe(200);
      const healthJson = await healthRes.json();
      expect(healthJson).toEqual({ status: 'running' });

      const metricsRes = await fetch(`http://127.0.0.1:${testPort}/metrics`);
      expect(metricsRes.status).toBe(200);
      expect(metricsRes.headers.get('content-type')).toContain('text/plain');
      const metricsText = await metricsRes.text();
      expect(metricsText).toContain('indexer_current_ledger');
      expect(metricsText).toContain('indexer_latest_network_ledger');
      expect(metricsText).toContain('indexer_events_processed_total');

      const notFoundRes = await fetch(`http://127.0.0.1:${testPort}/unknown`);
      expect(notFoundRes.status).toBe(404);
    } finally {
      engine.stop();
      await startPromise.catch(() => {});
    }

    // Verify server is closed after stop()
    await new Promise((r) => setTimeout(r, 50));
    await expect(fetch(`http://127.0.0.1:${testPort}/health`)).rejects.toThrow();
  });

  it('does not start metrics server when metricsPort is not configured', async () => {
    const testPort = 19877;
    const engine = new IndexerEngine('test-no-metrics', baseConfig, mockDb, mockRpc, mockParser);
    const startPromise = engine.start();
    await new Promise((r) => setTimeout(r, 50));
    engine.stop();
    await startPromise.catch(() => {});

    await expect(fetch(`http://127.0.0.1:${testPort}/health`)).rejects.toThrow();
  });
});
