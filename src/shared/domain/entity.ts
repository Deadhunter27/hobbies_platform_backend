export abstract class Entity<Id extends string = string> {
  protected constructor(public readonly id: Id) {}

  equals(other: Entity<Id> | undefined | null): boolean {
    if (!other) return false;
    if (this === other) return true;
    return this.id === other.id;
  }
}
