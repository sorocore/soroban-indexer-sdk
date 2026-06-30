import { rpc, xdr } from '@stellar/stellar-sdk';
import { RPCError, logger } from '@soroban-indexer/shared';

export interface RpcClientOptions {
  rpcUrl: string;
  networkPassphrase: string;
  retryLimit?: number;
  retryDelayMs?: number;
}

export class SorobanRpcClient {
  private client: rpc.Server;
  private networkPassphrase: string;
  private retryLimit: number;
  private retryDelayMs: number;

  constructor(options: RpcClientOptions) {
    this.client = new rpc.Server(options.rpcUrl);
    this.networkPassphrase = options.networkPassphrase;
    this.retryLimit = options.retryLimit ?? 3;
    this.retryDelayMs = options.retryDelayMs ?? 1000;
  }

  /**
   * Executes a promise-returning RPC call with automatic retry policy
   */
  private async executeWithRetry<T>(fn: () => Promise<T>, actionName: string): Promise<T> {
    let lastError: unknown;
    let delay = this.retryDelayMs;

    for (let attempt = 1; attempt <= this.retryLimit; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastError = err;
        logger.warn(
          { actionName, attempt, error: err instanceof Error ? err.message : String(err) },
          `RPC call failed, retrying in ${delay}ms...`
        );
        if (attempt < this.retryLimit) {
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
        }
      }
    }
    throw new RPCError(
      `RPC command '${actionName}' failed after ${this.retryLimit} attempts`,
      lastError
    );
  }

  /**
   * Checks the health of the target Soroban RPC node
   */
  async getHealth(): Promise<string> {
    return this.executeWithRetry(async () => {
      const health = await this.client.getHealth();
      return health.status;
    }, 'getHealth');
  }

  /**
   * Gets the sequence number of the latest closed ledger
   */
  async getLatestLedger(): Promise<number> {
    return this.executeWithRetry(async () => {
      const response = await this.client.getLatestLedger();
      return response.sequence;
    }, 'getLatestLedger');
  }

  /**
   * Fetches blockchain events within a ledger range
   */
  async getEvents(
    startLedger: number,
    endLedger: number,
    filters: Array<{
      type: 'contract' | 'system' | 'diagnostic';
      contractIds?: string[];
      topics?: string[][];
    }> = []
  ): Promise<rpc.Api.GetEventsResponse> {
    return this.executeWithRetry(async () => {
      // Queries events via the SDK Server client
      const response = await this.client.getEvents({
        startLedger,
        filters,
        limit: 100,
      });
      return response;
    }, 'getEvents');
  }

  /**
   * Fetches transaction status and execution outcome details
   */
  async getTransaction(hash: string): Promise<rpc.Api.GetTransactionResponse> {
    return this.executeWithRetry(async () => {
      return await this.client.getTransaction(hash);
    }, 'getTransaction');
  }

  /**
   * Fetches ledger entries for a list of base64 XDR keys
   */
  async getLedgerEntries(keys: string[]): Promise<rpc.Api.GetLedgerEntriesResponse> {
    return this.executeWithRetry(async () => {
      // Convert raw strings into key structures
      // and call RPC to fetch state
      const ledgerKeys = keys.map((k) => xdr.LedgerKey.fromXDR(k, 'base64'));
      return await this.client.getLedgerEntries(...ledgerKeys);
    }, 'getLedgerEntries');
  }

  /**
   * Helper to retrieve raw server client reference
   */
  getRawClient(): rpc.Server {
    return this.client;
  }

  /**
   * Helper to retrieve configured network passphrase
   */
  getNetworkPassphrase(): string {
    return this.networkPassphrase;
  }
}
