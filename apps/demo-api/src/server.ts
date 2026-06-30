import Fastify from 'fastify';
import { logger } from '@soroban-indexer/shared';
import { createDatabase, schema } from '@soroban-indexer/database';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import * as dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const fastify = Fastify({ logger: false });
const dbUrl =
  process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/soroban_indexer';
const db = createDatabase(dbUrl);

// Validation Schemas
const EventQuerySchema = z.object({
  contractId: z.string().optional(),
  topic: z.string().optional(),
  fromLedger: z.coerce.number().optional(),
  toLedger: z.coerce.number().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

fastify.get('/api/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.get('/api/events', async (request, reply) => {
  try {
    const query = EventQuerySchema.parse(request.query);
    const conditions = [];

    if (query.contractId) conditions.push(eq(schema.events.contractId, query.contractId));
    if (query.fromLedger) conditions.push(gte(schema.events.ledgerSequence, query.fromLedger));
    if (query.toLedger) conditions.push(lte(schema.events.ledgerSequence, query.toLedger));

    // Note: robust topic filtering with JSONB requires specialized queries, basic eq placeholder
    if (query.topic) {
      // In production, we'd use pg jsonb containment ops here
    }

    const results = await db
      .select()
      .from(schema.events)
      .where(and(...conditions))
      .orderBy(desc(schema.events.ledgerSequence), desc(schema.events.timestamp))
      .limit(query.limit);

    return results;
  } catch (error) {
    logger.error({ error }, 'Failed to query events');
    reply.status(400).send({ error: 'Invalid query parameters' });
  }
});

fastify.get('/api/ledgers/:sequence', async (request, reply) => {
  const sequence = parseInt((request.params as any).sequence, 10);
  if (isNaN(sequence)) return reply.status(400).send({ error: 'Invalid sequence' });

  const records = await db
    .select()
    .from(schema.ledgers)
    .where(eq(schema.ledgers.sequence, sequence))
    .limit(1);

  if (records.length === 0) {
    return reply.status(404).send({ error: 'Ledger not found' });
  }
  return records[0];
});

const start = async () => {
  try {
    const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
    await fastify.listen({ port, host: '0.0.0.0' });
    logger.info(`Demo API server running on http://localhost:${port}`);
  } catch (err) {
    logger.error({ err }, 'Failed to start API server');
    process.exit(1);
  }
};

start();
