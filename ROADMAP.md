# Roadmap

## Phase 1 (Current)
- Base monorepo scaffolding (pnpm workspaces)
- Core indexing loop and Hexagonal architecture abstraction
- PostgreSQL persistence with Drizzle ORM
- Soroban RPC integration
- XDR Parsing utilities
- CLI scaffolding

## Phase 2 (Upcoming)
- Implement WebSocket/SSE streaming in the SDK
- GraphQL API endpoint alongside REST
- Advanced event filtering and automatic subgraph-style mapping generation
- Redis caching layer for the API

## Phase 3
- Full Soroban Contract storage historical state reconstruction
- Webhook notification dispatcher for specific contract events
- Support for alternative database backends (e.g., ClickHouse, MongoDB)
