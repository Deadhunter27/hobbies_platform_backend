import { Inject, Injectable } from '@nestjs/common';
import type { TxContext } from '@shared/application';
import { CommunityNotFoundError, type Community, type CommunityStatus } from '../domain';
import { COMMUNITY_REPOSITORY, type CommunityRepository } from './ports/community.repository.port';

@Injectable()
export class SetCommunityStatusUseCase {
  constructor(@Inject(COMMUNITY_REPOSITORY) private readonly repository: CommunityRepository) {}

  async execute(
    communityId: string,
    status: CommunityStatus,
    now = new Date(),
    tx?: TxContext,
  ): Promise<Community> {
    const existing = await this.repository.findById(communityId, tx);
    if (!existing) throw new CommunityNotFoundError(communityId);
    if (existing.status === status) return existing;

    const updated = await this.repository.updateStatus(
      { id: communityId, status, updatedAt: now },
      tx,
    );
    if (!updated) throw new CommunityNotFoundError(communityId);
    return updated;
  }
}
