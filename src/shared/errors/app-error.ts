/**
 * Root of the error hierarchy (ADR-0009). Domain/application code throws
 * these and never `HttpException` — mapping to HTTP status/response shape
 * happens once, in the interface-layer global exception filter.
 */
export abstract class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: unknown[],
    public override readonly cause?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
