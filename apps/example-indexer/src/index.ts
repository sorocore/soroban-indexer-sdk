import * as dotenv from 'dotenv';
import { logger } from '@soroban-indexer/shared';
import { SorobanIndexer } from '@soroban-indexer/indexer';

dotenv.config();

const run = async () => {
  const rpcUrl = process.env.RPC_URL || 'https://soroban-testnet.stellar.org:443';
  const databaseUrl =
    process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/soroban_indexer';
  const networkPassphrase = process.env.NETWORK_PASSPHRASE || 'Test SDF Network ; September 2015';
  const startLedger = process.env.START_LEDGER ? parseInt(process.env.START_LEDGER, 10) : 1;

  const indexer = new SorobanIndexer('example-indexer-1', {
    rpcUrl,
    databaseUrl,
    networkPassphrase,
    startLedger,
    concurrency: 5,
    batchSize: 100,
    retryLimit: 5,
    pollIntervalMs: 2000,
  });

  // Graceful shutdown handling
  const shutdown = async () => {
    logger.info('Shutting down...');
    indexer.stop();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  logger.info('Starting Soroban example-indexer...');
  await indexer.start();
};

run().catch((error) => {
  logger.error({ error }, 'Fatal error running indexer');
  process.exit(1);
});
