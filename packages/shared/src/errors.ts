export class BaseError extends Error {
  constructor(
    public readonly message: string,
    public readonly code: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class IndexerError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'INDEXER_ERROR', 500, details);
  }
}

export class RPCError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'RPC_ERROR', 502, details);
  }
}

export class ParserError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'PARSER_ERROR', 422, details);
  }
}

export class DatabaseError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'DATABASE_ERROR', 500, details);
  }
}

export class NotFoundError extends BaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'NOT_FOUND', 404, details);
  }
}
