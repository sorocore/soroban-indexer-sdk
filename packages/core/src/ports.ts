import { SorobanEvent, LedgerMetadata, IngestionCursor } from '@soroban-indexer/types';

export interface IDatabaseAdapter {
  saveLedger(ledger: LedgerMetadata): Promise<void>;
  saveEvents(events: SorobanEvent[]): Promise<void>;
  getCursor(indexerId: string): Promise<IngestionCursor | null>;
  updateCursor(cursor: IngestionCursor): Promise<void>;
}

export interface IRpcAdapter {
  getLatestLedger(): Promise<number>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getEvents(startLedger: number, endLedger: number): Promise<any>;
}

export interface IParserAdapter {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  parseEvents(rawEvents: any[]): SorobanEvent[];
}
