import { execSync } from 'child_process';
import fs from 'fs';

const issues = [
  {
    title: 'Fix failing GitHub Actions CI workflow (TypeScript Module Resolution)',
    labels: 'bug,CI,good first issue',
    body: `### Background
Our GitHub Actions CI pipeline runs \`pnpm -r run build\` to compile the monorepo packages in topological order. Even though the \`packages/shared\` package successfully completes its build and generates \`dist/index.d.ts\`, the subsequent build step for \`packages/cli\` abruptly fails. 

### Problem Statement
The CI workflow consistently fails with the following error:
\`Error: packages/cli build: src/index.ts(3,24): error TS2307: Cannot find module '@soroban-indexer/shared' or its corresponding type declarations.\`
This happens because TypeScript 5.0+ \`Bundler\` module resolution in composite monorepos can fail to reliably resolve workspace packages purely through \`pnpm\`'s \`node_modules\` symlinks in a clean CI environment, resulting in a false negative during compilation.

### Proposed Solution
To fix this robustly and bypass fragile \`node_modules\` symlink resolution during compilation, we need to explicitly declare workspace package boundaries to the TypeScript compiler using a \`paths\` mapping in the root \`tsconfig.json\`.

### Implementation Guidelines
1. Open the root \`tsconfig.json\` file.
2. Under \`compilerOptions\`, add a \`paths\` object mapping \`@soroban-indexer/*\` to their physical directories (\`./packages/*\` and \`./apps/*\`).
3. Ensure no other packages are broken by running a local build before pushing.

### Instructions for Contributors
1. Fork the repository and clone it locally.
2. Create a new branch: \`git checkout -b fix/ci-workflow\`.
3. In \`/tsconfig.json\`, modify the \`compilerOptions\` to include:
   \`\`\`json
   "paths": {
     "@soroban-indexer/*": ["./packages/*", "./apps/*"]
   }
   \`\`\`
4. Run \`pnpm install\` and then verify the fix by running \`pnpm -r run build\`.
5. Write a conventional commit message: \`fix(ci): add workspace paths mapping to root tsconfig\`.
6. Push the branch and open a Pull Request referencing this issue (\`Closes #<issue-number>\`).

### Expected Behavior
The GitHub Actions CI workflow should successfully compile all 13 workspace projects without throwing \`TS2307\` module resolution errors.

### Acceptance Criteria
- [ ] Root \`tsconfig.json\` includes the \`paths\` mapping.
- [ ] Local build (\`pnpm -r run build\`) completes successfully.
- [ ] GitHub Actions CI workflow turns green upon PR submission.

**Affected Files**: \`tsconfig.json\`
**Difficulty**: Good First Issue
**Suitable for first-time contributors**: Yes`,
  },
  {
    title: 'Implement Pagination for `getEvents` in `IndexerEngine`',
    labels: 'enhancement,core',
    body: `### Background
The \`IndexerEngine\` in \`packages/core\` loops over ledgers and fetches smart contract events using the \`IRpcAdapter\`. Blockchain RPC endpoints usually enforce strict limits on the number of events (or payload size) returned in a single request. 

### Problem Statement
Currently, \`packages/core/src/engine.ts\` fetches events using a single \`this.rpc.getEvents(currentLedger, endLedger)\` call. It blindly assumes all events for the requested ledger range will be returned at once. If a heavily congested ledger range exceeds the RPC's maximum return limit, the indexer will drop events silently or the RPC request will crash.

### Proposed Solution
We need to handle pagination explicitly. The \`IRpcAdapter\` should return a pagination cursor alongside the events, and \`IndexerEngine\` should loop until all pages for the current ledger block are exhausted before advancing the database cursor.

### Implementation Guidelines
1. Update \`IRpcAdapter\` in \`packages/core/src/ports.ts\` so \`getEvents\` returns an object containing \`{ events: any[], nextCursor?: string }\`.
2. In \`engine.ts\`, inside \`runLoop()\`, implement a \`while(true)\` or \`do-while\` loop for the \`getEvents\` fetch phase.
3. Pass the \`nextCursor\` into subsequent \`getEvents\` calls until no cursor is returned.
4. Only update the database cursor (\`this.db.updateCursor\`) once all paginated chunks for the ledger block are successfully saved.

### Instructions for Contributors
1. Fork the repository and create a branch: \`git checkout -b feat/engine-pagination\`.
2. Update the \`IRpcAdapter\` interface in \`packages/core/src/ports.ts\`.
3. Refactor the fetching logic in \`packages/core/src/engine.ts\` to support paginated requests.
4. Ensure the database transaction/cursor update logic remains safe and only executes after a full ledger block is parsed.
5. Add unit tests for the pagination loop in \`packages/core/src/engine.test.ts\`.
6. Run \`pnpm run test\` and ensure all tests pass.
7. Open a Pull Request referencing this issue.

### Expected Behavior
The \`IndexerEngine\` should correctly ingest heavily congested ledger ranges by making multiple RPC calls using a pagination cursor without missing any events.

### Acceptance Criteria
- [ ] \`IRpcAdapter\` interface is updated to support pagination.
- [ ] \`IndexerEngine.runLoop\` utilizes the pagination token.
- [ ] Tests simulate a paginated RPC response and verify all events are ingested.
- [ ] CI pipeline passes.

**Affected Files**: \`packages/core/src/engine.ts\`, \`packages/core/src/ports.ts\`, \`packages/core/src/engine.test.ts\`
**Difficulty**: Intermediate
**Suitable for first-time contributors**: No`,
  },
  {
    title: 'Implement Exponential Backoff Strategy for RPC Retries',
    labels: 'enhancement,resilience',
    body: `### Background
In distributed systems, especially when querying blockchain RPC endpoints, rate-limiting (\`429 Too Many Requests\`) and transient network failures are common.

### Problem Statement
Currently, when an error occurs in the \`IndexerEngine\` (\`engine.ts\`), it catches the error, marks the status as \`failed\` in the database, and waits a fixed amount of time (\`this.config.pollIntervalMs * 2\`) before retrying. This rigid, non-scaling delay can exacerbate rate limits by hitting the RPC too aggressively during downtimes.

### Proposed Solution
Implement a standard exponential backoff strategy for network retries.

### Implementation Guidelines
1. Create a \`backoffMultiplier\` or \`retryCount\` state variable in the \`IndexerEngine\` class.
2. On failure, calculate the wait time using a formula like: \`delay = Math.min(baseDelay * Math.pow(2, retryCount), maxDelay)\`.
3. \`maxDelay\` should be a sensible default (e.g., 60 seconds) or added to \`IndexerConfig\`.
4. Wait for the calculated \`delay\`.
5. Upon a successful fetch, reset the \`retryCount\` back to 0.

### Instructions for Contributors
1. Fork the repo and create branch: \`git checkout -b feat/exponential-backoff\`.
2. Update \`IndexerConfig\` in \`packages/types/src/index.ts\` to include an optional \`maxRetryDelayMs\` property.
3. In \`packages/core/src/engine.ts\`, replace the hardcoded fallback timeout with the exponential backoff calculation.
4. Reset the backoff counter inside the successful \`try\` block execution.
5. Write tests confirming the delay increases appropriately upon simulated consecutive failures.
6. Commit (\`feat(core): implement exponential backoff for rpc retries\`), push, and open a PR.

### Expected Behavior
If the RPC goes down, the indexer should retry gracefully, progressively slowing down its retry attempts until it caps out at a maximum delay, saving bandwidth and respecting rate limits.

### Acceptance Criteria
- [ ] Backoff algorithm correctly doubles the wait time upon consecutive failures.
- [ ] Backoff delay is capped at a maximum value.
- [ ] Backoff counter is reset to zero on success.
- [ ] Unit tests cover the backoff logic.

**Affected Files**: \`packages/core/src/engine.ts\`, \`packages/types/src/index.ts\`
**Difficulty**: Intermediate
**Suitable for first-time contributors**: Yes`,
  },
  {
    title: 'Upgrade DB Schema to use strongly-typed `jsonb` for Event Values',
    labels: 'database,refactor,good first issue',
    body: `### Background
Soroban smart contract events emit complex XDR-encoded values (like structs and arrays). The parsing layer converts these into JSON formats for usability.

### Problem Statement
In \`packages/database/src/schema.ts\`, the \`value\` column inside the \`events\` table is currently defined as plain \`text('value')\`. Storing JSON data as plain text prevents developers from utilizing PostgreSQL's advanced JSON operators (e.g., \`->>\`, \`@>\`) to query and filter specific event parameters directly at the database level.

### Proposed Solution
Migrate the \`value\` column from \`text\` to \`jsonb\`.

### Implementation Guidelines
1. In \`packages/database/src/schema.ts\`, change \`value: text('value').notNull()\` to \`value: jsonb('value').$type<Record<string, any>>().notNull()\`.
2. Ensure you run the \`drizzle-kit generate\` (or equivalent tool setup in the project) to create a migration file for this schema change.
3. Update any mock data or tests that expect \`value\` to be a string instead of an object.

### Instructions for Contributors
1. Fork and create branch: \`git checkout -b refactor/schema-jsonb-events\`.
2. Update \`schema.ts\` as specified.
3. If a migration generation script exists in \`package.json\` for the \`database\` package, run it and commit the generated SQL files.
4. Fix any TypeScript errors resulting from the type change in the database layer.
5. Ensure linting and formatting pass.
6. Commit, push, and open a Pull Request.

### Expected Behavior
The database adapter will store event payloads natively as \`JSONB\`, allowing downstream consumers of the SDK to write highly efficient relational queries against event properties.

### Acceptance Criteria
- [ ] \`events.value\` column is typed as \`jsonb\` in \`schema.ts\`.
- [ ] Types are updated to accept an object instead of a string.
- [ ] Drizzle migration file is successfully generated and committed.
- [ ] CI pipeline passes.

**Affected Files**: \`packages/database/src/schema.ts\`, \`packages/database/drizzle/*\` (migrations)
**Difficulty**: Good First Issue
**Suitable for first-time contributors**: Yes`,
  },
  {
    title: 'Implement `soroban-index init` CLI scaffolding command',
    labels: 'enhancement,cli',
    body: `### Background
One of the primary goals of the SDK is to offer an excellent Developer Experience (DevEx). The CLI module (\`packages/cli\`) is intended to be the entry point for users building custom indexers.

### Problem Statement
Currently, the \`init\` command inside \`packages/cli/src/index.ts\` only logs a placeholder string: \`// Placeholder: Clone template or write config files\`. Users have no automated way to generate the boilerplate needed to start a project.

### Proposed Solution
Implement the \`init\` command. It should create a new directory, populate it with a basic \`package.json\`, a default \`indexer.config.ts\`, and a boilerplate \`src/index.ts\` that instantiates the \`IndexerEngine\`.

### Implementation Guidelines
1. Use the \`fs\` and \`path\` modules to create the target directory based on the \`[dir]\` argument.
2. Define template strings or bundle a small \`templates/\` folder inside the \`cli\` package containing the boilerplate.
3. Write the template files to the newly created directory.
4. Provide a success message with "Next steps" (e.g., \`cd my-indexer && npm install\`).

### Instructions for Contributors
1. Fork and branch: \`git checkout -b feat/cli-init-cmd\`.
2. Open \`packages/cli/src/index.ts\`.
3. Remove the placeholder comment in the \`init\` command action.
4. Implement the file-generation logic. Keep the template minimal (just enough to satisfy the \`IndexerEngine\` constructor).
5. Add basic error handling (e.g., abort if the target directory already exists and isn't empty).
6. Test locally by running \`node ./packages/cli/dist/index.js init test-dir\`.
7. Commit and open a PR.

### Expected Behavior
Executing \`soroban-index init my-project\` generates a ready-to-use boilerplate repository in the \`my-project\` directory.

### Acceptance Criteria
- [ ] \`init\` command generates a folder with \`package.json\` and \`indexer.config.ts\`.
- [ ] Command fails gracefully if the directory is not empty.
- [ ] A helpful success message is printed to the console.

**Affected Files**: \`packages/cli/src/index.ts\`
**Difficulty**: Intermediate
**Suitable for first-time contributors**: Yes`,
  },
  {
    title: 'Add Integration Tests for `IndexerEngine` using Testcontainers',
    labels: 'testing,core',
    body: `### Background
Currently, the \`packages/core\` module utilizes basic unit tests. While useful, these don't test the complex interplay between the \`IndexerEngine\`, PostgreSQL constraints, and realistic RPC behavior.

### Problem Statement
Without integration tests, refactoring the engine loop is incredibly risky. We need a way to ensure the engine correctly saves events to an actual database and respects state transitions (e.g., cursor saving) over multiple iterations.

### Proposed Solution
Introduce integration tests using \`testcontainers-node\` to spin up an ephemeral PostgreSQL database and a mocked in-memory RPC adapter.

### Implementation Guidelines
1. Add \`testcontainers\` as a \`devDependency\` to \`packages/core\`.
2. Create \`packages/core/src/engine.integration.test.ts\`.
3. In the \`beforeAll\` hook, use \`PostgreSqlContainer\` to start a database and run the Drizzle schema migrations against it.
4. Instantiate the real \`DatabaseAdapter\` pointing to the testcontainer.
5. Create a Mock \`IRpcAdapter\` that yields a predetermined set of blockchain events.
6. Start the \`IndexerEngine\`, let it loop, then stop it.
7. Assert that the database contains the exact events and that the cursor is accurately updated.

### Instructions for Contributors
1. Fork and branch: \`git checkout -b test/engine-integration\`.
2. Setup the \`testcontainers\` environment in the core package.
3. Write a thorough integration test as described in the guidelines.
4. Ensure the container teardown logic is properly handled in \`afterAll\` to prevent hanging CI jobs.
5. Run \`pnpm run test\` to verify.
6. Commit (\`test(core): add integration tests for indexer engine\`) and open a PR.

### Expected Behavior
The CI pipeline will now spin up a real PostgreSQL container, run the SDK against it, and verify full end-to-end correctness of the data ingestion pipeline.

### Acceptance Criteria
- [ ] \`testcontainers\` is utilized to spin up PostgreSQL.
- [ ] Engine successfully writes events to the real DB during the test.
- [ ] Cursor state is verified in the DB.
- [ ] Tests run successfully in GitHub Actions.

**Affected Files**: \`packages/core/src/engine.integration.test.ts\`, \`packages/core/package.json\`
**Difficulty**: Advanced
**Suitable for first-time contributors**: No`,
  },
  {
    title: 'Add Telemetry & Health Endpoint (Prometheus Metrics)',
    labels: 'enhancement,observability',
    body: `### Background
When running data indexers in production, operators need granular visibility into the health of the daemon—specifically, the "indexer lag" (the difference between the network's latest ledger and the indexer's current parsed ledger).

### Problem Statement
The \`IndexerEngine\` runs completely silently in the background (aside from standard stdout logging). There is no way for monitoring tools like Kubernetes, Prometheus, or Grafana to scrape its health or current status.

### Proposed Solution
Implement an optional metrics HTTP server that can be enabled via \`IndexerConfig\`. It should expose standard \`/health\` and \`/metrics\` routes.

### Implementation Guidelines
1. Add a \`metricsPort\` property to \`IndexerConfig\`.
2. If \`metricsPort\` is defined, \`IndexerEngine\` should spin up a lightweight HTTP server (using \`node:http\` or a lightweight framework) on \`start()\`.
3. Expose \`/health\` returning \`200 OK\` and \`{ status: 'running' }\`.
4. Expose \`/metrics\` returning Prometheus-formatted plain text metrics, such as:
   - \`indexer_current_ledger\`
   - \`indexer_latest_network_ledger\`
   - \`indexer_events_processed_total\`

### Instructions for Contributors
1. Fork and branch: \`git checkout -b feat/telemetry-endpoints\`.
2. Update \`IndexerConfig\` in \`packages/types/src/index.ts\`.
3. In \`packages/core/src/engine.ts\`, initialize the HTTP server if the port is configured.
4. Keep track of the \`latestNetworkLedger\` and \`totalEventsProcessed\` inside the \`runLoop\` to serve accurate metrics.
5. Close the HTTP server gracefully in the \`stop()\` method.
6. Add relevant unit tests.
7. Commit, push, and open a PR.

### Expected Behavior
Operators can configure \`metricsPort: 8080\`, navigate to \`http://localhost:8080/metrics\`, and view live telemetry data formatted for Prometheus scraping.

### Acceptance Criteria
- [ ] Server only starts if \`metricsPort\` is defined.
- [ ] \`/health\` endpoint returns 200 OK.
- [ ] \`/metrics\` endpoint accurately reflects the engine's internal ledger state.
- [ ] Server shuts down properly on \`stop()\`.

**Affected Files**: \`packages/core/src/engine.ts\`, \`packages/types/src/index.ts\`
**Difficulty**: Intermediate
**Suitable for first-time contributors**: No`,
  },
  {
    title: 'Write a Comprehensive "Getting Started" Guide',
    labels: 'documentation,good first issue',
    body: `### Background
A strong open-source project requires excellent documentation to onboard new users. To secure grants and attract users, we need to show how easy it is to use the \`soroban-indexer-sdk\`.

### Problem Statement
There is no central guide explaining how to piece the SDK components together to track a real Soroban smart contract.

### Proposed Solution
Create a comprehensive markdown tutorial in the \`docs/\` folder demonstrating an end-to-end workflow using a public AMM or Token contract.

### Implementation Guidelines
Write a clear, formatted Markdown document covering:
1. **Prerequisites**: Node.js, PostgreSQL.
2. **Installation**: Using the CLI to scaffold a project (\`soroban-index init\`).
3. **Configuration**: Setting up \`indexer.config.ts\` (RPC url, DB url, start ledger).
4. **Running**: Starting the daemon.
5. **Querying**: Provide a sample SQL query to fetch parsed events from the PostgreSQL database.

### Instructions for Contributors
1. Fork and branch: \`git checkout -b docs/getting-started-guide\`.
2. Create a \`docs/\` directory at the root if it doesn't exist.
3. Create \`docs/getting-started.md\`.
4. Write the tutorial in clear, idiomatic English. Use Markdown code blocks for all terminal commands and code snippets.
5. Ensure you link to this document from the main \`README.md\`.
6. Commit (\`docs: add comprehensive getting started guide\`) and open a PR.

### Expected Behavior
A new user landing on the repository can follow the guide step-by-step and successfully run a local indexer against the Stellar testnet/mainnet in under 10 minutes.

### Acceptance Criteria
- [ ] Document is clearly formatted and easy to read.
- [ ] All code snippets are syntactically correct.
- [ ] Main \`README.md\` contains a prominent link to the guide.

**Affected Files**: \`docs/getting-started.md\`, \`README.md\`
**Difficulty**: Good First Issue
**Suitable for first-time contributors**: Yes`,
  },
  {
    title: 'Implement Event Cleanup / Pruning Mechanism',
    labels: 'enhancement,database,core',
    body: `### Background
Indexing blockchain data requires significant database storage. For highly active smart contracts, the \`events\` table will grow exponentially, eventually degrading PostgreSQL query performance and inflating hosting costs.

### Problem Statement
The current SDK stores parsed events indefinitely. There is no built-in mechanism to prune or archive old data that is no longer needed by the dApp's frontend.

### Proposed Solution
Implement a configurable retention policy that automatically prunes events older than a specified threshold during the indexer's run loop.

### Implementation Guidelines
1. Add a \`retentionPeriodDays\` (number, optional) to \`IndexerConfig\`.
2. Update the \`IDatabaseAdapter\` to include a \`pruneOldEvents(timestampThreshold: number): Promise<number>\` method.
3. In \`packages/core/src/engine.ts\`, add a timer or logic inside the \`runLoop\` that triggers the pruning method once every few hours (or dynamically based on config).
4. Calculate the threshold timestamp by subtracting the retention days from the current date.

### Instructions for Contributors
1. Fork and branch: \`git checkout -b feat/event-retention-pruning\`.
2. Update the config types in \`packages/types\`.
3. Add the interface method in \`ports.ts\`.
4. Implement the SQL deletion logic in the actual database adapter (if one exists in \`packages/database\`, otherwise just update the interface for now).
5. Add the background scheduling logic to \`engine.ts\` so it doesn't block the main ingestion loop.
6. Commit and open a PR.

### Expected Behavior
If \`retentionPeriodDays: 30\` is configured, the engine will periodically issue DELETE commands to the database for any events older than 30 days, keeping database size manageable automatically.

### Acceptance Criteria
- [ ] \`retentionPeriodDays\` config is typed and parsed.
- [ ] \`IDatabaseAdapter\` supports pruning.
- [ ] \`IndexerEngine\` triggers pruning periodically without blocking ingestion.
- [ ] Unit tests cover the pruning trigger logic.

**Affected Files**: \`packages/types/src/index.ts\`, \`packages/core/src/ports.ts\`, \`packages/core/src/engine.ts\`
**Difficulty**: Intermediate
**Suitable for first-time contributors**: No`,
  },
  {
    title: 'Implement `soroban-index inspect` CLI Command',
    labels: 'enhancement,cli,dx',
    body: `### Background
When writing custom parsers for the Indexer, developers frequently need to understand the raw shape of the on-chain data for a specific contract to know what to expect.

### Problem Statement
The \`soroban-index inspect <contractId>\` command in the CLI (\`packages/cli/src/index.ts\`) is currently a placeholder. It provides no actual utility for fetching live contract state.

### Proposed Solution
Implement the \`inspect\` command to query a Soroban RPC node for a contract's details and recent events, printing the output in beautifully formatted JSON in the terminal.

### Implementation Guidelines
1. Add \`@stellar/stellar-sdk\` or the project's internal RPC adapter as a dependency to \`packages/cli\` if not already present.
2. In \`packages/cli/src/index.ts\`, replace the placeholder in the \`inspect\` action.
3. Instantiate a Soroban RPC client using the \`--rpc\` URL option (fallback to a default testnet URL).
4. Fetch the contract's latest ledger entries or recent events.
5. Use \`JSON.stringify(data, null, 2)\` or a package like \`cli-highlight\` to output the fetched state gracefully to the terminal.

### Instructions for Contributors
1. Fork and branch: \`git checkout -b feat/cli-inspect-cmd\`.
2. Review the command setup in \`packages/cli/src/index.ts\`.
3. Write the network fetching logic inside the action callback. Ensure you handle network errors gracefully (e.g., catching timeouts or invalid contract IDs and logging a user-friendly error).
4. Test locally using a known Soroban contract ID: \`node ./dist/index.js inspect C...\`
5. Commit and open a PR.

### Expected Behavior
Running the CLI command retrieves live data from the blockchain and prints it in an easily readable format, serving as a rapid debugging tool for indexer developers.

### Acceptance Criteria
- [ ] CLI correctly parses the \`<contractId>\` and \`--rpc\` arguments.
- [ ] Command makes a successful network request to fetch state/events.
- [ ] Console output is formatted readably.
- [ ] Network and input errors are caught and logged clearly.

**Affected Files**: \`packages/cli/src/index.ts\`, \`packages/cli/package.json\`
**Difficulty**: Intermediate
**Suitable for first-time contributors**: Yes`,
  },
];

for (const issue of issues) {
  const file = 'temp-issue.md';
  fs.writeFileSync(file, issue.body);
  console.log(`Creating issue: ${issue.title}`);
  try {
    execSync(
      `gh issue create --title "${issue.title}" --body-file "${file}" --label "${issue.labels}"`
    );
  } catch (err) {
    console.error('Error creating issue', err);
  }
}
if (fs.existsSync('temp-issue.md')) {
  fs.unlinkSync('temp-issue.md');
}
