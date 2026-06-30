export class BaseError extends Error {
  message;
  code;
  statusCode;
  details;
  constructor(message, code, statusCode = 500, details) {
    super(message);
    this.message = message;
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}
export class IndexerError extends BaseError {
  constructor(message, details) {
    super(message, 'INDEXER_ERROR', 500, details);
  }
}
export class RPCError extends BaseError {
  constructor(message, details) {
    super(message, 'RPC_ERROR', 502, details);
  }
}
export class ParserError extends BaseError {
  constructor(message, details) {
    super(message, 'PARSER_ERROR', 422, details);
  }
}
export class DatabaseError extends BaseError {
  constructor(message, details) {
    super(message, 'DATABASE_ERROR', 500, details);
  }
}
export class NotFoundError extends BaseError {
  constructor(message, details) {
    super(message, 'NOT_FOUND', 404, details);
  }
}
//# sourceMappingURL=errors.js.map
