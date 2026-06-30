import { describe, it, expect } from 'vitest';
import {
  BaseError,
  IndexerError,
  RPCError,
  ParserError,
  DatabaseError,
  NotFoundError,
} from './errors.js';

describe('Error classes', () => {
  it('BaseError sets the correct properties', () => {
    const err = new BaseError('something went wrong', 'BASE_ERR', 500, { detail: 'x' });
    expect(err.message).toBe('something went wrong');
    expect(err.code).toBe('BASE_ERR');
    expect(err.statusCode).toBe(500);
    expect(err.details).toEqual({ detail: 'x' });
    expect(err instanceof Error).toBe(true);
  });

  it('IndexerError has correct code and status', () => {
    const err = new IndexerError('indexer failed');
    expect(err.code).toBe('INDEXER_ERROR');
    expect(err.statusCode).toBe(500);
  });

  it('RPCError has 502 status code', () => {
    const err = new RPCError('rpc unreachable');
    expect(err.statusCode).toBe(502);
    expect(err.code).toBe('RPC_ERROR');
  });

  it('ParserError has 422 status code', () => {
    const err = new ParserError('parse failed');
    expect(err.statusCode).toBe(422);
    expect(err.code).toBe('PARSER_ERROR');
  });

  it('DatabaseError has correct code', () => {
    const err = new DatabaseError('db unavailable');
    expect(err.code).toBe('DATABASE_ERROR');
  });

  it('NotFoundError has 404 status code', () => {
    const err = new NotFoundError('ledger not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
  });
});
