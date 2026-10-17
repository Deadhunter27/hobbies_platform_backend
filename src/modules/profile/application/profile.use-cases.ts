import { Inject, Injectable } from '@nestjs/common';
import { GetHobbyUseCase } from '@modules/catalog';
import type { Actor } from '@modules/access';
import { MediaService } from '@modules/media';
import { newId } from '@shared/utils';
import {
  HobbyContext,
  HobbyContextNotFoundError,
  ProfileContext,
  ProfileDetails,
  type ProfileDetailsPatch,
  type ExperienceLevel,
  type ProfileIntent,
  type SocialPreference,
} from '../domain';
import { ProfileAuthorization } from './authorization';
import { PROFILE_REPOSITORY, type ProfileRepository } from './ports/profile.repository.port';

@Injectable()
export class GetMyProfileContextUseCase {
  constructor(
    private readonly authorization: ProfileAuthorization,
    @Inject(PROFILE_REPOSITORY) private readonly repository: ProfileRepository,
  ) {}

  async execute(actor: Actor): Promise<ProfileContext | null> {
    await this.authorization.assertCanRead(actor);
    return this.repository.findProfile(actor.id);
  }
}

export interface UpsertMyProfileContextInput {
  city: string | null;
  countryCode: string | null;
  timezone: string | null;
}

@Injectable()
export class UpsertMyProfileContextUseCase {
  constructor(
    private readonly authorization: ProfileAuthorization,
    @Inject(PROFILE_REPOSITORY) private readonly repository: ProfileRepository,
  ) {}

  async execute(actor: Actor, input: UpsertMyProfileContextInput): Promise<ProfileContext> {
    await this.authorization.assertCanUpdate(actor);
    const context = ProfileContext.create({ userId: actor.id, ...input });
    return this.repository.upsertProfile(context);
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

export interface UpsertMyHobbyContextInput {
  experienceLevel: ExperienceLevel;
  primaryIntent: ProfileIntent;
  secondaryIntents: ProfileIntent[];
  goal: string | null;
  socialPreference: SocialPreference;
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
    input: UpsertMyHobbyContextInput,
  ): Promise<HobbyContext> {
    await this.authorization.assertCanUpdate(actor);
    await this.getHobby.execute({ slugOrId: hobbyId });

    const existing = await this.repository.findHobbyContext(actor.id, hobbyId);
    const context = HobbyContext.create({
      id: existing?.id ?? newId(),
      userId: actor.id,
      hobbyId,
      ...input,
    });
    return this.repository.upsertHobbyContext(context);
  }
}

@Injectable()
export class GetMyProfileDetailsUseCase {
  constructor(
    private readonly authorization: ProfileAuthorization,
    @Inject(PROFILE_REPOSITORY) private readonly repository: ProfileRepository,
  ) {}

  async execute(actor: Actor): Promise<ProfileDetails> {
    await this.authorization.assertCanRead(actor);
    return (await this.repository.findDetails(actor.id)) ?? ProfileDetails.empty(actor.id);
  }
}

@Injectable()
export class UpdateMyProfileDetailsUseCase {
  constructor(
    private readonly authorization: ProfileAuthorization,
    private readonly media: MediaService,
    @Inject(PROFILE_REPOSITORY) private readonly repository: ProfileRepository,
  ) {}

  async execute(actor: Actor, patch: ProfileDetailsPatch): Promise<ProfileDetails> {
    await this.authorization.assertCanUpdate(actor);
    const current = (await this.repository.findDetails(actor.id)) ?? ProfileDetails.empty(actor.id);
    const avatarChanges =
      patch.avatarMediaId !== undefined && patch.avatarMediaId !== current.avatarMediaId;
    if (avatarChanges && patch.avatarMediaId) {
      await this.media.assertAttachable(actor.id, patch.avatarMediaId, 'avatar');
    }
    const saved = await this.repository.saveDetails(current.apply(patch));
    // Replaced or removed avatar: delete the old photo so it never lingers in storage.
    if (avatarChanges) await this.media.discard(current.avatarMediaId);
    return saved;
  }
}

@Injectable()
export class ProfileAvatarUrlResolver {
  constructor(private readonly media: MediaService) {}

  resolve(details: ProfileDetails): Promise<string | null> {
    return this.media.signedUrl(details.avatarMediaId);
  }
}
