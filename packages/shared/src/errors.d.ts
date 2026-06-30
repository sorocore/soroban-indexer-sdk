export declare class BaseError extends Error {
    readonly message: string;
    readonly code: string;
    readonly statusCode: number;
    readonly details?: unknown | undefined;
    constructor(message: string, code: string, statusCode?: number, details?: unknown | undefined);
}
export declare class IndexerError extends BaseError {
    constructor(message: string, details?: unknown);
}
export declare class RPCError extends BaseError {
    constructor(message: string, details?: unknown);
}
export declare class ParserError extends BaseError {
    constructor(message: string, details?: unknown);
}
export declare class DatabaseError extends BaseError {
    constructor(message: string, details?: unknown);
}
export declare class NotFoundError extends BaseError {
    constructor(message: string, details?: unknown);
}
//# sourceMappingURL=errors.d.ts.map