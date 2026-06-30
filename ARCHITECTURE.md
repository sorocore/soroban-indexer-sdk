# Architecture Overview

The `soroban-indexer-sdk` is built upon **Clean Architecture** and **Hexagonal (Ports & Adapters)** principles.

## Core Design

The indexing process is decoupled from specific data sources and storage engines. 
The central logic resides in `@soroban-indexer/core`, which defines interface `Ports` that external packages must implement as `Adapters`.

### 1. Core (`@soroban-indexer/core`)
Contains the `IndexerEngine` that handles the polling loop, batching, error recovery, and cursor state management. It knows *what* to do but not *how* to connect to PostgreSQL or Soroban.

### 2. Adapters
- **Database Adapter (`@soroban-indexer/database`)**: Implements `IDatabaseAdapter`. Uses Drizzle ORM to persist ledgers, events, and cursors to PostgreSQL.
- **RPC Adapter (`@soroban-indexer/rpc`)**: Implements `IRpcAdapter`. Uses `@stellar/stellar-sdk` to fetch data from a Soroban RPC node with built-in retry backoff.
- **Parser Adapter (`@soroban-indexer/parser`)**: Implements `IParserAdapter`. Translates raw XDR strings into structured JSON.

### 3. Glue (`@soroban-indexer/indexer`)
Provides the `SorobanIndexer` class, which instantiates the adapters and injects them into the `IndexerEngine`.

## Apps

- **demo-api**: A Fastify REST server serving data directly from the PostgreSQL database using Drizzle queries.
- **example-indexer**: A Node.js daemon that executes the `SorobanIndexer` loop continuously.
- **playground**: A script demonstrating how to use the client `@soroban-indexer/sdk`.
