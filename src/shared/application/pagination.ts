export interface PageMeta {
  readonly nextCursor: string | null;
  readonly hasMore: boolean;
}

export interface CursorPage<T> {
  readonly data: T[];
  readonly page: PageMeta;
}
