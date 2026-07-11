import { encodeCursor, decodeCursor } from './cursor';
import { InvalidCursorError } from '@shared/errors';
import { newId } from './id';

describe('cursor encode/decode', () => {
  it('round-trips a payload through encode and decode', () => {
    const id = newId();
    const cursor = encodeCursor({ name: 'Padel', id });

    const decoded = decodeCursor(cursor);

    expect(decoded).toEqual({ v: 1, name: 'Padel', id });
  });

  it('throws InvalidCursorError for non-base64 garbage', () => {
    expect(() => decodeCursor('***not-base64***')).toThrow(InvalidCursorError);
  });

  it('throws InvalidCursorError for base64 that is not JSON', () => {
    const notJson = Buffer.from('not json at all', 'utf8').toString('base64url');
    expect(() => decodeCursor(notJson)).toThrow(InvalidCursorError);
  });

  it('throws InvalidCursorError when the decoded shape does not match the schema', () => {
    const wrongShape = Buffer.from(JSON.stringify({ v: 1, foo: 'bar' }), 'utf8').toString(
      'base64url',
    );
    expect(() => decodeCursor(wrongShape)).toThrow(InvalidCursorError);
  });

  it('throws InvalidCursorError when the id is not a valid ULID', () => {
    const badId = Buffer.from(
      JSON.stringify({ v: 1, name: 'Padel', id: 'not-a-ulid' }),
      'utf8',
    ).toString('base64url');
    expect(() => decodeCursor(badId)).toThrow(InvalidCursorError);
  });
});
