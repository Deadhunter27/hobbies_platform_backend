import { Inject, Injectable } from '@nestjs/common';
import { GetHobbyUseCase } from '@modules/catalog/application/use-cases/get-hobby.use-case';
import type { Actor } from '@modules/access';
import { newId } from '@shared/utils';
import {
  HobbyContext,
  HobbyContextNotFoundError,
  ProfileContext,
  type ExperienceLevel,
  type ProfileIntent,
  type SocialPreference,
} from '../domain';
import { ProfileAuthorization } from './authorization';
import { PROFILE_REPOSITORY, type ProfileRepository } from './ports/profile.repository.port';

export interface UpsertProfileContextInput {
  city: string | null;
  countryCode: string | null;
  timezone: string | null;
}

export interface UpsertHobbyContextInput {
  experienceLevel: ExperienceLevel;
  primaryIntent: ProfileIntent;
  secondaryIntents: ProfileIntent[];
  goal: string | null;
  socialPreference: SocialPreference;
}

@Injectable()
export class GetMyProfileContextUseCase {
  constructor(
    private readonly authorization: ProfileAuthorization,
    @Inject(PROFILE_REPOSITORY) private readonly repository: ProfileRepository,
  ) {}

  async execute(actor: Actor): Promise<ProfileContext | null> {
    await this.authorization.assertCanRead(actor);
    return this.repository.findProfileContext(actor.id);
  }
}

@Injectable()
export class UpsertMyProfileContextUseCase {
  constructor(
    private readonly authorization: ProfileAuthorization,
    @Inject(PROFILE_REPOSITORY) private readonly repository: ProfileRepository,
  ) {}

  async execute(actor: Actor, input: UpsertProfileContextInput): Promise<ProfileContext> {
    await this.authorization.assertCanUpdate(actor);
    const existing = await this.repository.findProfileContext(actor.id);
    const context = existing
      ? existing.update(input)
      : ProfileContext.create({ userId: actor.id, ...input });
    return this.repository.saveProfileContext(context);
  }
}

@Injectable()
export class ListMyHobbyContextsUseCase {
  constructor(
    private readonly authorization: ProfileAuthorization,
    @Inject(PROFILE_REPOSITORY) private readonly repository: ProfileRepository,
  ) {}

  async execute(actor: Actor): Promise<HobbyContext[]> {
    await this.authorization.assertCanRead(actor);
    return this.repository.listHobbyContexts(actor.id);
  }
}

@Injectable()
export class GetMyHobbyContextUseCase {
  constructor(
    private readonly authorization: ProfileAuthorization,
    @Inject(PROFILE_REPOSITORY) private readonly repository: ProfileRepository,
  ) {}

  async execute(actor: Actor, hobbyId: string): Promise<HobbyContext> {
    await this.authorization.assertCanRead(actor);
    const context = await this.repository.findHobbyContext(actor.id, hobbyId);
    if (!context) throw new HobbyContextNotFoundError(hobbyId);
    return context;
  }
}

@Injectable()
export class UpsertMyHobbyContextUseCase {
  constructor(
    private readonly authorization: ProfileAuthorization,
    private readonly getHobby: GetHobbyUseCase,
    @Inject(PROFILE_REPOSITORY) private readonly repository: ProfileRepository,
  ) {}

  async execute(
    actor: Actor,
    hobbyId: string,
    input: UpsertHobbyContextInput,
  ): Promise<HobbyContext> {
    await this.authorization.assertCanUpdate(actor);
    await this.getHobby.execute({ slugOrId: hobbyId });

    const existing = await this.repository.findHobbyContext(actor.id, hobbyId);
    const context = existing
      ? existing.update(input)
      : HobbyContext.create({ id: newId(), userId: actor.id, hobbyId, ...input });
    return this.repository.saveHobbyContext(context);
  }
}
