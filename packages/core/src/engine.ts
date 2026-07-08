import { logger } from '@soroban-indexer/shared';
import { IDatabaseAdapter, IRpcAdapter, IParserAdapter } from './ports.js';
import { IndexerConfig } from '@soroban-indexer/types';

export class IndexerEngine {
  private isRunning = false;
  private currentLedger: number;
  private lastPruneTime = 0;

  constructor(
    private readonly indexerId: string,
    private readonly config: IndexerConfig,
    private readonly db: IDatabaseAdapter,
    private readonly rpc: IRpcAdapter,
    private readonly parser: IParserAdapter
  ) {
    this.currentLedger = config.startLedger;
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    logger.info(`Starting indexer ${this.indexerId} from ledger ${this.currentLedger}`);

    // Fetch initial cursor
    const cursor = await this.db.getCursor(this.indexerId);
    if (cursor && cursor.lastLedger >= this.currentLedger) {
      this.currentLedger = cursor.lastLedger + 1;
      logger.info(`Resuming indexer ${this.indexerId} from ledger ${this.currentLedger}`);
    } else {
      await this.db.updateCursor({
        indexerId: this.indexerId,
        lastLedger: this.currentLedger - 1,
        status: 'starting',
        updatedAt: new Date(),
      });
    }

    this.runLoop();
  }

  public stop() {
    this.isRunning = false;
    logger.info(`Stopping indexer ${this.indexerId}...`);
  }

  private async runLoop() {
    while (this.isRunning) {
      try {
        if (this.config.retentionPeriodDays && Date.now() - this.lastPruneTime > 1000 * 60 * 60) {
          const threshold =
            Math.floor(Date.now() / 1000) - this.config.retentionPeriodDays * 24 * 60 * 60;
          this.db
            .pruneOldEvents(threshold)
            .then((count) => {
              if (count > 0) logger.info(`Pruned ${count} old events.`);
            })
            .catch((err) => {
              logger.error(
                { error: err instanceof Error ? err.message : String(err) },
                'Error pruning old events'
              );
            });
          this.lastPruneTime = Date.now();
        }

        const latestNetworkLedger = await this.rpc.getLatestLedger();

        if (this.currentLedger <= latestNetworkLedger) {
          const endLedger = Math.min(
            this.currentLedger + this.config.batchSize - 1,
            latestNetworkLedger
          );

          logger.debug(`Fetching ledgers ${this.currentLedger} to ${endLedger}...`);

          const rawEventsResponse = await this.rpc.getEvents(this.currentLedger, endLedger);
          const parsedEvents = this.parser.parseEvents(rawEventsResponse.events || []);

          if (parsedEvents.length > 0) {
            await this.db.saveEvents(parsedEvents);
            logger.info(
              `Saved ${parsedEvents.length} events for ledgers ${this.currentLedger}-${endLedger}`
            );
          }

          // Update cursor
          this.currentLedger = endLedger + 1;
          await this.db.updateCursor({
            indexerId: this.indexerId,
            lastLedger: endLedger,
            status: 'running',
            updatedAt: new Date(),
          });
        } else {
          // Wait for new ledgers
          await new Promise((resolve) => setTimeout(resolve, this.config.pollIntervalMs));
        }
      } catch (error) {
        logger.error({ error }, 'Error in indexer loop');
        await this.db.updateCursor({
          indexerId: this.indexerId,
          lastLedger: this.currentLedger - 1,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : String(error),
          updatedAt: new Date(),
        });

        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, this.config.pollIntervalMs * 2));
      }
    }
  }
}
