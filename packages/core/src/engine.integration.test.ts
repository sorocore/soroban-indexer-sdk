import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { createDatabase, schema, Database } from '@soroban-indexer/database';
import { DatabaseAdapter } from '@soroban-indexer/indexer';
import { IndexerEngine } from './engine.js';
import type { IRpcAdapter, IParserAdapter } from './ports.js';
import type { SorobanEvent, IndexerConfig } from '@soroban-indexer/types';
import { fileURLToPath } from 'url';
import path from 'path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { asc } from 'drizzle-orm';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDockerAvailable = (() => {
  try {
    execSync('docker info', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe.runIf(isDockerAvailable)('IndexerEngine Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let dbUrl: string;
  let dbInstance: Database;

  beforeAll(async () => {
    // Spin up container
    container = await new PostgreSqlContainer().start();
    dbUrl = container.getConnectionUri();

    // Instantiate drizzle
    dbInstance = createDatabase(dbUrl, 5);

    // Run migrations
    const migrationsFolder = path.resolve(__dirname, '../../database/drizzle');
    await migrate(dbInstance, { migrationsFolder });
  }, 60000);

  afterAll(async () => {
    if (dbInstance) {
      await dbInstance.$client.end();
    }
    if (container) {
      await container.stop();
    }
  }, 10000);

  it('correctly saves events and updates cursor state in real PostgreSQL database over multiple iterations', async () => {
    const dbAdapter = new DatabaseAdapter(dbInstance);
    const indexerId = 'test-integration-indexer';

    // Satisfy foreign key constraint: ledger sequences 100, 101, 102 must exist
    await dbAdapter.saveLedger({
      sequence: 100,
      hash: 'ledger-hash-100',
      prevHash: 'ledger-prev-hash-99',
      timestamp: 1234567890,
      transactionCount: 1,
      operationCount: 1,
    });
    await dbAdapter.saveLedger({
      sequence: 101,
      hash: 'ledger-hash-101',
      prevHash: 'ledger-hash-100',
      timestamp: 1234567891,
      transactionCount: 1,
      operationCount: 1,
    });
    await dbAdapter.saveLedger({
      sequence: 102,
      hash: 'ledger-hash-102',
      prevHash: 'ledger-hash-101',
      timestamp: 1234567892,
      transactionCount: 1,
      operationCount: 1,
    });

    let mockLatestLedger = 100;
    const mockRpc: IRpcAdapter = {
      getLatestLedger: async () => mockLatestLedger,
      getEvents: async (start, _end) => {
        return {
          events: [
            {
              id: `0000000100-000000000${start}`,
              contractId: 'CA3D5YXTSTZDUVTRSTZDUVTRSTZDUVTRSTZDUVTRSTZDUVTRSTZDUVTR',
              type: 'contract',
              topics: [`topic-${start}`],
              value: `value-${start}`,
              transactionHash: `hash-${start}`,
              ledger: start,
              ledgerClosedAt: '1234567890',
            },
          ],
        };
      },
    };

    const mockParser: IParserAdapter = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      parseEvents: (rawEvents: any[]): SorobanEvent[] => {
        return rawEvents.map((e) => ({
          id: e.id,
          contractId: e.contractId,
          type: e.type,
          topics: e.topics,
          value: e.value,
          transactionHash: e.transactionHash,
          ledgerSequence: e.ledger,
          timestamp: parseInt(e.ledgerClosedAt, 10),
        }));
      },
    };

    const config: IndexerConfig = {
      rpcUrl: 'http://localhost:8000',
      databaseUrl: dbUrl,
      networkPassphrase: 'Test Network',
      startLedger: 100,
      concurrency: 1,
      batchSize: 1,
      retryLimit: 1,
      pollIntervalMs: 50,
    };

    // Instantiate and start engine
    const engine = new IndexerEngine(indexerId, config, dbAdapter, mockRpc, mockParser);
    const startPromise = engine.start();

    // 1. Wait until cursor lastLedger is 100 (first iteration)
    let cursor = null;
    for (let i = 0; i < 40; i++) {
      cursor = await dbAdapter.getCursor(indexerId);
      if (cursor && cursor.lastLedger === 100 && cursor.status === 'running') {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(cursor?.lastLedger).toBe(100);

    // 2. Increase latest ledger to 102 to trigger more iterations in the loop
    mockLatestLedger = 102;

    // 3. Wait until cursor lastLedger reaches 102
    for (let i = 0; i < 40; i++) {
      cursor = await dbAdapter.getCursor(indexerId);
      if (cursor && cursor.lastLedger === 102 && cursor.status === 'running') {
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Stop engine
    engine.stop();
    await startPromise.catch(() => {});

    // Assert cursor is updated correctly to 102
    expect(cursor).toBeDefined();
    expect(cursor?.lastLedger).toBe(102);
    expect(cursor?.status).toBe('running');

    // Assert that the database contains the saved events
    const savedEvents = await dbInstance
      .select()
      .from(schema.events)
      .orderBy(asc(schema.events.ledgerSequence));

    expect(savedEvents).toHaveLength(3);

    expect(savedEvents[0].id).toBe('0000000100-000000000100');
    expect(savedEvents[0].value).toBe('value-100');
    expect(savedEvents[0].ledgerSequence).toBe(100);

    expect(savedEvents[1].id).toBe('0000000100-000000000101');
    expect(savedEvents[1].value).toBe('value-101');
    expect(savedEvents[1].ledgerSequence).toBe(101);

    expect(savedEvents[2].id).toBe('0000000100-000000000102');
    expect(savedEvents[2].value).toBe('value-102');
    expect(savedEvents[2].ledgerSequence).toBe(102);
  });
});
