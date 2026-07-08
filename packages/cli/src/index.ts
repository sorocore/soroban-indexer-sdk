#!/usr/bin/env node
import { Command } from 'commander';
import { logger } from '@soroban-indexer/shared';
import { SorobanRpcClient } from '@soroban-indexer/rpc';

const program = new Command();

program.name('soroban-index').description('CLI for Soroban Indexer SDK').version('0.1.0');

program
  .command('init')
  .description('Scaffold a new custom indexer project configuration')
  .argument('[dir]', 'Directory to initialize', '.')
  .action((dir) => {
    logger.info(`Initializing new indexer project in ${dir}...`);
    // Placeholder: Clone template or write config files
  });

program
  .command('sync')
  .description('Manually sync ledgers up to a specific target')
  .option('-s, --start <ledger>', 'Start ledger sequence')
  .option('-e, --end <ledger>', 'End ledger sequence')
  .action((options) => {
    logger.info('Starting manual sync...', options);
    // Placeholder: Start one-off indexer engine run
  });

program
  .command('start')
  .description('Starts the indexer daemon')
  .option('-c, --config <path>', 'Path to indexer config file', 'indexer.config.ts')
  .action((options) => {
    logger.info(`Starting indexer daemon using config ${options.config}...`);
    // Placeholder: Load config and run SorobanIndexer.start()
  });

program
  .command('generate')
  .description('Generate TypeScript interfaces and parsers from a contract WASM')
  .argument('<wasmPath>', 'Path to compiled contract .wasm file')
  .option('-o, --out <dir>', 'Output directory', './generated')
  .action((wasmPath, options) => {
    logger.info(`Generating bindings from ${wasmPath} to ${options.out}...`);
    // Placeholder: Parse WASM environment spec and emit TS files
  });

program
  .command('inspect')
  .description('Inspect live contract state on the network')
  .argument('<contractId>', 'Soroban contract ID')
  .option('--rpc <url>', 'RPC endpoint URL')
  .action(async (contractId, options) => {
    logger.info(`Inspecting contract ${contractId} on ${options.rpc || 'default RPC'}...`);
    const rpcUrl = options.rpc || 'https://soroban-testnet.stellar.org:443';
    try {
      const client = new SorobanRpcClient({
        rpcUrl,
        networkPassphrase: 'Test SDF Network ; September 2015',
      });
      const latestLedger = await client.getLatestLedger();
      const startLedger = Math.max(1, latestLedger - 100);
      const events = await client.getEvents(startLedger, latestLedger, [
        {
          type: 'contract',
          contractIds: [contractId],
        },
      ]);
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(events, null, 2));
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : String(error) },
        'Failed to inspect contract'
      );
    }
  });

program.parse(process.argv);
