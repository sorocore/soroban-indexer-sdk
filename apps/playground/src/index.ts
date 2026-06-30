import { IndexerClient } from '@soroban-indexer/sdk';

async function main() {
  const client = new IndexerClient({
    apiUrl: 'http://localhost:3000',
  });

  console.log('Fetching events from demo-api...');

  try {
    const events = await client.getEvents({
      limit: 10,
    });
    console.log(`Found ${events.length} events:`);
    console.log(JSON.stringify(events, null, 2));
  } catch (err) {
    console.error('Error fetching events:', err instanceof Error ? err.message : err);
    console.log('Ensure the demo-api is running (pnpm --filter demo-api run dev)');
  }
}

main();
