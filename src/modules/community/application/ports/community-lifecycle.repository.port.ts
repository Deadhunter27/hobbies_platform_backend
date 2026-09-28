import type { TxContext } from '@shared/application';
import type { Community, CommunityStatus } from '../../domain';

export const COMMUNITY_LIFECYCLE_REPOSITORY = Symbol('COMMUNITY_LIFECYCLE_REPOSITORY');

export interface CommunityLifecycleRepository {
  findById(id: string, tx?: TxContext): Promise<Community | null>;
  updateStatus(
    input: { id: string; status: CommunityStatus; updatedAt: Date },
    tx?: TxContext,
  ): Promise<Community | null>;
}
