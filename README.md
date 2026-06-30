# Soroban Indexer SDK

A TypeScript-first SDK and indexing framework for the Soroban blockchain. This monorepo allows developers to efficiently index, query, and subscribe to Soroban blockchain data for building wallets, explorers, analytics platforms, NFT marketplaces, payment systems, and DeFi applications.

## Packages

- `@soroban-indexer/core`: Indexer orchestration engine and interfaces
- `@soroban-indexer/indexer`: Concrete implementation gluing the engine to PostgreSQL and RPC
- `@soroban-indexer/rpc`: Wrappers for Stellar SDK RPC interactions with robust retry handling
- `@soroban-indexer/database`: Drizzle ORM and PostgreSQL persistence adapters
- `@soroban-indexer/parser`: Utilities to decode base64 Soroban XDR into native JS/TS types
- `@soroban-indexer/sdk`: Front-end ready client library for querying the indexed data
- `@soroban-indexer/cli`: CLI utility to scaffold, sync, generate, and inspect contracts
- `@soroban-indexer/types`: Zod schemas and standard types
- `@soroban-indexer/shared`: Logging (Pino) and error boundaries

## Getting Started

### Prerequisites

- Node.js >= 20.0
- pnpm >= 9
- PostgreSQL (or Docker to run the included compose stack)
- Rust (for compiling the test contract)

### Installation

1. Install dependencies:
```bash
pnpm install
```

2. Build packages:
```bash
pnpm run build
```

3. Run the database via Docker:
```bash
docker-compose up postgres -d
```

4. Push migrations:
```bash
pnpm --filter @soroban-indexer/database db:push
```

### Running the Example Indexer

```bash
pnpm --filter example-indexer dev
```

### Running the Query API

```bash
pnpm --filter demo-api dev
```

## Community and Contribution

Please review the following guidelines before contributing:
- [CONTRIBUTING.md](CONTRIBUTING.md)
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)
- [ARCHITECTURE.md](ARCHITECTURE.md)

## License

MIT License. See [LICENSE](LICENSE) for more details.
