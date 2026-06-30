import { SorobanEvent, LedgerMetadata, IngestionCursor } from '@soroban-indexer/types';

export interface IDatabaseAdapter {
  saveLedger(ledger: LedgerMetadata): Promise<void>;
  saveEvents(events: SorobanEvent[]): Promise<void>;
  getCursor(indexerId: string): Promise<IngestionCursor | null>;
  updateCursor(cursor: IngestionCursor): Promise<void>;
}

export interface IRpcAdapter {
  getLatestLedger(): Promise<number>;
  getEvents(startLedger: number, endLedger: number): Promise<any>;
}

export interface IParserAdapter {
  parseEvents(rawEvents: any[]): SorobanEvent[];
}
