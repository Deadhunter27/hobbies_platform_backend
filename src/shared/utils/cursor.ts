import { z } from 'zod';
import { InvalidCursorError } from '@shared/errors';
import { ULID_REGEX } from './id';

const cursorSchema = z.object({
  v: z.literal(1),
  name: z.string().min(1),
  id: z.string().regex(ULID_REGEX),
});

export type CursorPayload = z.infer<typeof cursorSchema>;

/**
 * Opaque cursor = base64url(JSON) of the fixed (name, id) keyset tuple.
 * Not signed: it carries no sensitive data, only public field values.
 */
export function encodeCursor(payload: Omit<CursorPayload, 'v'>): string {
  const full: CursorPayload = { v: 1, ...payload };
  return Buffer.from(JSON.stringify(full), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string): CursorPayload {
  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'));
  } catch {
    throw new InvalidCursorError();
  }

  const result = cursorSchema.safeParse(json);
  if (!result.success) {
    throw new InvalidCursorError();
  }

  return result.data;
}
