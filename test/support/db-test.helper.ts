/**
 * Integration/e2e suites need a real Postgres (DATABASE_URL). Skip cleanly
 * rather than fail when it's absent — e.g. a contributor's inner dev loop
 * running `pnpm test` (unit only) never needs a database.
 */
export const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;
