/**
 * ADR-0019: state changes and their audit rows commit atomically. TxContext
 * is deliberately opaque — application code passes it through untouched;
 * only infrastructure adapters know it is a Prisma transaction client.
 */
export type TxContext = { readonly __txBrand: unique symbol };

export interface UnitOfWork {
  run<T>(fn: (tx: TxContext) => Promise<T>): Promise<T>;
}

export const UNIT_OF_WORK = Symbol('UNIT_OF_WORK');
