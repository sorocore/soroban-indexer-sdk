import http from 'node:http';
import { logger } from '@soroban-indexer/shared';
import { IDatabaseAdapter, IRpcAdapter, IParserAdapter } from './ports.js';
import { IndexerConfig } from '@soroban-indexer/types';

export class IndexerEngine {
  private isRunning = false;
  private currentLedger: number;
  private lastPruneTime = 0;
  private metricsServer?: http.Server;
  private latestNetworkLedger = 0;
  private totalEventsProcessed = 0;

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

    if (this.config.metricsPort) {
      this.startMetricsServer(this.config.metricsPort);
    }

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
    if (this.metricsServer) {
      this.metricsServer.close();
      this.metricsServer = undefined;
    }
  }

  private startMetricsServer(port: number) {
    this.metricsServer = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
      if (url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'running' }));
      } else if (url.pathname === '/metrics') {
        const body = [
          '# HELP indexer_current_ledger Current ledger sequence indexed',
          '# TYPE indexer_current_ledger gauge',
          `indexer_current_ledger ${this.currentLedger}`,
          '',
          '# HELP indexer_latest_network_ledger Latest ledger sequence on the network',
          '# TYPE indexer_latest_network_ledger gauge',
          `indexer_latest_network_ledger ${this.latestNetworkLedger}`,
          '',
          '# HELP indexer_events_processed_total Total number of Soroban events processed',
          '# TYPE indexer_events_processed_total counter',
          `indexer_events_processed_total ${this.totalEventsProcessed}`,
          '',
        ].join('\n');
        res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4; charset=utf-8' });
        res.end(body);
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
      }
    });

    this.metricsServer.listen(port, () => {
      logger.info(`Metrics server listening on port ${port}`);
    });
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
        this.latestNetworkLedger = latestNetworkLedger;

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
            this.totalEventsProcessed += parsedEvents.length;
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
