import { Injectable } from '@nestjs/common';
import { PublicIdentityService } from '@modules/identity';
import type { PersonDirectory, PersonName } from '../application';

/** Adapts identity's public read service to this module's port (ADR-0034). */
@Injectable()
export class IdentityPersonDirectory implements PersonDirectory {
  constructor(private readonly identity: PublicIdentityService) {}

  findActive(ids: string[]): Promise<PersonName[]> {
    return this.identity.findActive(ids);
  }

  searchActive(query: string, limit: number): Promise<PersonName[]> {
    return this.identity.searchActive(query, limit);
  }
}
