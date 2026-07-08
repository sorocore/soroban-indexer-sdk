#!/usr/bin/env node
import { Command } from 'commander';
import { logger } from '@soroban-indexer/shared';
import { SorobanRpcClient } from '@soroban-indexer/rpc';
import fs from 'fs';
import path from 'path';

const program = new Command();

program.name('soroban-index').description('CLI for Soroban Indexer SDK').version('0.1.0');

// ---------------------------------------------------------------------------
// Template strings for `init` scaffolding
// ---------------------------------------------------------------------------

const packageJsonTemplate = (projectName: string) =>
  JSON.stringify(
    {
      name: projectName,
      version: '0.1.0',
      type: 'module',
      scripts: {
        build: 'tsc',
        start: 'node dist/index.js',
        dev: 'ts-node --esm src/index.ts',
      },
      dependencies: {
        '@soroban-indexer/sdk': '^0.1.0',
      },
      devDependencies: {
        typescript: '^5.4.5',
        '@types/node': '^20.14.9',
        'ts-node': '^10.9.2',
      },
    },
    null,
    2
  );

const indexerConfigTemplate = `import type { IndexerConfig } from '@soroban-indexer/sdk';

const config: IndexerConfig = {
  // The Soroban RPC endpoint to connect to
  rpcUrl: process.env.SOROBAN_RPC_URL ?? 'https://soroban-testnet.stellar.org:443',

  // Stellar network passphrase
  networkPassphrase: process.env.NETWORK_PASSPHRASE ?? 'Test SDF Network ; September 2015',

  // PostgreSQL connection string
  databaseUrl: process.env.DATABASE_URL ?? 'postgres://localhost:5432/soroban_indexer',

  // Unique identifier for this indexer instance (used for cursor tracking)
  indexerId: process.env.INDEXER_ID ?? 'my-indexer',

  // Ledger sequence to start indexing from (0 = latest)
  startLedger: 0,

  // Contract IDs to filter events for (empty = all contracts)
  contractIds: [],
};

export default config;
`;

const srcIndexTemplate = `import { IndexerEngine } from '@soroban-indexer/sdk';
import config from '../indexer.config.js';

async function main() {
  const engine = new IndexerEngine(config);

  // Register a handler for contract events
  engine.on('event', (event) => {
    console.log('[Event]', JSON.stringify(event, null, 2));
  });

  // Register a handler for each indexed ledger
  engine.on('ledger', (ledger) => {
    console.log(\`[Ledger] Indexed ledger #\${ledger.sequence}\`);
  });

  await engine.start();
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
`;

const tsconfigTemplate = JSON.stringify(
  {
    compilerOptions: {
      target: 'ES2022',
      module: 'NodeNext',
      moduleResolution: 'NodeNext',
      outDir: './dist',
      rootDir: './src',
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
    },
    include: ['src'],
  },
  null,
  2
);

const envExampleTemplate = `# Soroban RPC endpoint
SOROBAN_RPC_URL=https://soroban-testnet.stellar.org:443

# Stellar network passphrase
NETWORK_PASSPHRASE=Test SDF Network ; September 2015

# PostgreSQL connection string
DATABASE_URL=postgres://localhost:5432/soroban_indexer

# Unique indexer instance ID
INDEXER_ID=my-indexer
`;

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

program
  .command('init')
  .description('Scaffold a new custom indexer project configuration')
  .argument('[dir]', 'Directory to initialize', '.')
  .action((dir: string) => {
    const targetDir = path.resolve(process.cwd(), dir);
    const projectName = path.basename(targetDir);

    logger.info(`Initializing new indexer project "${projectName}" in ${targetDir}...`);

    // Guard: abort if directory exists and is not empty
    if (fs.existsSync(targetDir)) {
      const entries = fs.readdirSync(targetDir);
      if (entries.length > 0) {
        logger.error(
          `Directory "${targetDir}" already exists and is not empty. ` +
            `Please choose an empty directory or a new path.`
        );
        process.exit(1);
      }
    } else {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Create src/ sub-directory
    const srcDir = path.join(targetDir, 'src');
    fs.mkdirSync(srcDir, { recursive: true });

    // Write all scaffold files
    const files: Array<[string, string]> = [
      ['package.json', packageJsonTemplate(projectName)],
      ['indexer.config.ts', indexerConfigTemplate],
      ['tsconfig.json', tsconfigTemplate],
      ['.env.example', envExampleTemplate],
      [path.join('src', 'index.ts'), srcIndexTemplate],
    ];

    for (const [relativePath, content] of files) {
      const fullPath = path.join(targetDir, relativePath);
      fs.writeFileSync(fullPath, content, 'utf-8');
      logger.info(`  Created ${relativePath}`);
    }

    // Success banner
    // eslint-disable-next-line no-console
    console.log(`
✅  Project scaffolded successfully!

Next steps:
  cd ${dir === '.' ? projectName : dir}
  cp .env.example .env
  npm install
  npm run dev

Happy indexing! 🚀
`);
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
