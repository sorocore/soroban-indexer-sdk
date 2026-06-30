import {
  IndexerEngine,
  IDatabaseAdapter,
  IRpcAdapter,
  IParserAdapter,
} from '@soroban-indexer/core';
import {
  IndexerConfig,
  SorobanEvent,
  LedgerMetadata,
  IngestionCursor,
} from '@soroban-indexer/types';
import { createDatabase, Database, schema } from '@soroban-indexer/database';
import { SorobanRpcClient } from '@soroban-indexer/rpc';
import { parseSorobanEvent } from '@soroban-indexer/parser';
import { eq } from 'drizzle-orm';

class DatabaseAdapter implements IDatabaseAdapter {
  constructor(private db: Database) {}

  async saveLedger(ledger: LedgerMetadata): Promise<void> {
    await this.db.insert(schema.ledgers).values(ledger).onConflictDoNothing();
  }

  async saveEvents(events: SorobanEvent[]): Promise<void> {
    await this.db.insert(schema.events).values(events).onConflictDoNothing();
  }

  async getCursor(indexerId: string): Promise<IngestionCursor | null> {
    const records = await this.db
      .select()
      .from(schema.cursors)
      .where(eq(schema.cursors.indexerId, indexerId))
      .limit(1);

    if (records.length === 0) return null;
    return records[0] as IngestionCursor;
  }

  async updateCursor(cursor: IngestionCursor): Promise<void> {
    await this.db
      .insert(schema.cursors)
      .values(cursor)
      .onConflictDoUpdate({
        target: schema.cursors.indexerId,
        set: {
          lastLedger: cursor.lastLedger,
          status: cursor.status,
          errorMessage: cursor.errorMessage,
          updatedAt: cursor.updatedAt,
        },
      });
  }
}

class RpcAdapter implements IRpcAdapter {
  constructor(private client: SorobanRpcClient) {}

  async getLatestLedger(): Promise<number> {
    return this.client.getLatestLedger();
  }

  async getEvents(startLedger: number, endLedger: number): Promise<any> {
    return this.client.getEvents(startLedger, endLedger);
  }
}

class ParserAdapter implements IParserAdapter {
  parseEvents(rawEvents: any[]): SorobanEvent[] {
    return rawEvents.map((e) =>
      parseSorobanEvent(e, e.txHash, e.ledger, parseInt(e.ledgerClosedAt, 10))
    );
  }
}

export class SorobanIndexer {
  private engine: IndexerEngine;

  constructor(indexerId: string, config: IndexerConfig) {
    const db = createDatabase(config.databaseUrl);
    const rpcClient = new SorobanRpcClient({
      rpcUrl: config.rpcUrl,
      networkPassphrase: config.networkPassphrase,
    });

    this.engine = new IndexerEngine(
      indexerId,
      config,
      new DatabaseAdapter(db),
      new RpcAdapter(rpcClient),
      new ParserAdapter()
    );
  }

  public async start() {
    return this.engine.start();
  }

  public stop() {
    return this.engine.stop();
  }
}
