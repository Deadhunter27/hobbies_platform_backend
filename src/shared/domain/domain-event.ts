export abstract class DomainEvent {
  public readonly occurredAt: Date;

  protected constructor() {
    this.occurredAt = new Date();
  }

  abstract readonly name: string;
}
