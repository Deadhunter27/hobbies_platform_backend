import { Inject, Injectable } from '@nestjs/common';
import type { Actor } from '@modules/access';
import { PlatformSettingsService } from '@modules/settings';
import { ForbiddenError } from '@shared/errors';
import { PROFILE_REPOSITORY, type ProfileRepository } from './ports/profile.repository.port';

export type CreatableKind = 'community' | 'event';

export class CreationNotAllowedError extends ForbiddenError {
  constructor(kind: CreatableKind, requirement: 'verified' | 'staff') {
    super(
      requirement === 'staff'
        ? `Only the Wayfinder team can create a ${kind} right now.`
        : `Set a username on your profile before creating a ${kind}.`,
      [{ kind, requirement }],
      'CREATION_NOT_ALLOWED',
    );
  }
}

/**
 * Who may create communities and events (ADR-0035). The rule is a platform
 * setting (ADR-0033): everyone, verified people, or staff only. "Verified"
 * currently means the person has claimed a @username; stronger checks can
 * replace it without changing callers.
 */
@Injectable()
export class CreatorEligibilityService {
  constructor(
    private readonly settings: PlatformSettingsService,
    @Inject(PROFILE_REPOSITORY) private readonly repository: ProfileRepository,
  ) {}

  async assertCanCreate(actor: Actor, kind: CreatableKind): Promise<void> {
    const policy = await this.settings.get(
      kind === 'community' ? 'community.creationPolicy' : 'event.creationPolicy',
    );
    if (policy === 'everyone' || actor.globalRole === 'staff') return;
    if (policy === 'staff') throw new CreationNotAllowedError(kind, 'staff');
    const details = await this.repository.findDetails(actor.id);
    if (!details?.handle) throw new CreationNotAllowedError(kind, 'verified');
  }
}
