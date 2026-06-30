# Basic Event Indexing Example

This example demonstrates how to set up a minimal Soroban event indexer using the `@soroban-indexer/indexer` package.

## Setup

1. Copy `.env.example` to `.env` in the repository root and fill in your configuration.
2. Start PostgreSQL: `docker-compose up postgres -d`
3. Push the schema: `pnpm --filter @soroban-indexer/database db:push`
4. Run this example: `pnpm --filter basic-event-indexing start`

## What This Example Does

- Connects to the Soroban testnet RPC endpoint
- Starts indexing events from `START_LEDGER`
- Persists all contract events to PostgreSQL

## Extending

To filter specific contracts, modify the RPC event filters inside `@soroban-indexer/rpc`'s `getEvents` call,
or create custom event handlers in the indexer configuration.
