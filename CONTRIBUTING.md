# Contributing to Soroban Indexer SDK

First off, thank you for considering contributing to the Soroban Indexer SDK!

## Development Workflow

1. **Fork the repo** and clone it locally.
2. **Install dependencies** using `pnpm install`.
3. **Run tests** and ensure everything passes with `pnpm test`.
4. **Create a branch** for your feature or bug fix: `git checkout -b feature/your-feature-name`.
5. **Commit your changes** following the [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) specification.
6. **Push to your fork** and submit a Pull Request.

## Monorepo Architecture

This project uses `pnpm workspaces`.
- `packages/*` contains reusable logic.
- `apps/*` contains runnable applications.

When adding new dependencies to a specific package, use:
`pnpm --filter <package-name> add <dependency>`

## Committing and Changesets

We use `changesets` for versioning. If your PR affects a publishable package, run:
`pnpm changeset`
and follow the prompts before committing.

## Quality Standards

All PRs must pass the CI pipeline (`lint`, `typecheck`, `test`). Please ensure you write tests for any new features or bug fixes.
