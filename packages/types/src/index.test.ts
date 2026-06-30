import { describe, it, expect } from 'vitest';
import { IndexerConfigSchema, SorobanEventSchema, IngestionCursorSchema } from './index.ts';

describe('IndexerConfigSchema', () => {
  it('parses a valid config', () => {
    const result = IndexerConfigSchema.parse({
      rpcUrl: 'https://soroban-testnet.stellar.org:443',
      databaseUrl: 'postgres://user:pass@localhost:5432/db',
      networkPassphrase: 'Test SDF Network ; September 2015',
    });
    expect(result.startLedger).toBe(1);
    expect(result.concurrency).toBe(5);
    expect(result.batchSize).toBe(100);
  });

  it('rejects an invalid rpcUrl', () => {
    expect(() =>
      IndexerConfigSchema.parse({
        rpcUrl: 'not-a-url',
        databaseUrl: 'postgres://localhost/db',
        networkPassphrase: 'Test SDF Network ; September 2015',
      })
    ).toThrow();
  });
});

describe('SorobanEventSchema', () => {
  it('parses a valid event', () => {
    const event = {
      id: 'event-1',
      contractId: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABSC4',
      type: 'contract' as const,
      topics: ['topic1'],
      value: '{"amount": 100}',
      transactionHash: 'abc123',
      ledgerSequence: 1000,
      timestamp: 1718000000,
    };
    const parsed = SorobanEventSchema.parse(event);
    expect(parsed.id).toBe('event-1');
    expect(parsed.type).toBe('contract');
  });

  it('rejects an invalid event type', () => {
    expect(() =>
      SorobanEventSchema.parse({
        id: 'x',
        contractId: 'C123',
        type: 'unknown',
        topics: [],
        value: '',
        transactionHash: 'hash',
        ledgerSequence: 1,
        timestamp: 1,
      })
    ).toThrow();
  });
});

describe('IngestionCursorSchema', () => {
  it('parses a valid cursor', () => {
    const cursor = {
      indexerId: 'my-indexer',
      lastLedger: 5000,
      status: 'running' as const,
      updatedAt: new Date(),
    };
    const parsed = IngestionCursorSchema.parse(cursor);
    expect(parsed.status).toBe('running');
    expect(parsed.lastLedger).toBe(5000);
  });
});
