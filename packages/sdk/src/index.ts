import { EventFilter, SorobanEvent, LedgerMetadata } from '@soroban-indexer/types';

export interface IndexerClientConfig {
  apiUrl: string;
  apiKey?: string;
}

export class IndexerClient {
  private apiUrl: string;
  private apiKey?: string;

  constructor(config: IndexerClientConfig) {
    this.apiUrl = config.apiUrl;
    this.apiKey = config.apiKey;
  }

  private async fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    const res = await fetch(`${this.apiUrl}${endpoint}`, {
      ...options,
      headers: { ...headers, ...options?.headers },
    });

    if (!res.ok) {
      throw new Error(`API request failed: ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  /**
   * Queries indexed Soroban events matching the given filters.
   */
  async getEvents(filter: EventFilter): Promise<SorobanEvent[]> {
    const params = new URLSearchParams();
    if (filter.contractId) params.append('contractId', filter.contractId);
    if (filter.topic) params.append('topic', filter.topic);
    if (filter.fromLedger) params.append('fromLedger', filter.fromLedger.toString());
    if (filter.toLedger) params.append('toLedger', filter.toLedger.toString());
    if (filter.limit) params.append('limit', filter.limit.toString());
    if (filter.offset) params.append('offset', filter.offset.toString());

    const qs = params.toString();
    const endpoint = `/api/events${qs ? '?' + qs : ''}`;
    return this.fetchApi<SorobanEvent[]>(endpoint);
  }

  /**
   * Fetches metadata for a specific ledger.
   */
  async getLedger(sequence: number): Promise<LedgerMetadata> {
    return this.fetchApi<LedgerMetadata>(`/api/ledgers/${sequence}`);
  }

  /**
   * Streams live events as they are indexed via Server-Sent Events (SSE) or WebSockets.
   * Placeholder implementation for streaming logic.
   */
  subscribeToEvents(_filter: EventFilter, _callback: (event: SorobanEvent) => void): () => void {
    // TODO: Implement EventSource or WebSocket connection to stream live events
    console.warn('Streaming subscriptions not fully implemented yet');

    // Return an unsubscribe function
    return () => {
      // close connection
    };
  }
}
