# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial monorepo scaffolding using pnpm workspaces.
- `@soroban-indexer/core` package with engine and ports.
- `@soroban-indexer/rpc` for Soroban RPC interactions.
- `@soroban-indexer/database` using Drizzle ORM and PostgreSQL.
- `@soroban-indexer/parser` for XDR deserialization.
- Apps: `demo-api`, `example-indexer`, `playground`.
- CI setup using GitHub Actions.
