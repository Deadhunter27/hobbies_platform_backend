import { Entity } from '@shared/domain';
import { newId } from '@shared/utils';

export interface SessionProps {
  id: string;
  userId: string;
  refreshTokenHash: string;
  familyId: string;
  deviceLabel: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  replacedById: string | null;
  createdAt: Date;
}

/**
 * ADR-0017: sessions form rotation families. A brand-new login starts a
 * family (familyId = own id); each rotation creates a sibling in the same
 * family. Reuse of a rotated token revokes the entire family.
 */
export class Session extends Entity {
  private constructor(private readonly props: SessionProps) {
    super(props.id);
  }

  static create(input: {
    userId: string;
    refreshTokenHash: string;
    expiresAt: Date;
    familyId?: string;
    deviceLabel?: string | null;
  }): Session {
    const id = newId();
    return new Session({
      id,
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      familyId: input.familyId ?? id,
      deviceLabel: input.deviceLabel ?? null,
      expiresAt: input.expiresAt,
      revokedAt: null,
      replacedById: null,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: SessionProps): Session {
    return new Session(props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get refreshTokenHash(): string {
    return this.props.refreshTokenHash;
  }

  get familyId(): string {
    return this.props.familyId;
  }

  get deviceLabel(): string | null {
    return this.props.deviceLabel;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get replacedById(): string | null {
    return this.props.replacedById;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  /** A session that was rotated or revoked must never authenticate again;
   * presenting its token is the reuse-detection signal. */
  get isRotatedOrRevoked(): boolean {
    return this.props.revokedAt !== null || this.props.replacedById !== null;
  }

  isExpiredAt(now: Date): boolean {
    return this.props.expiresAt.getTime() <= now.getTime();
  }
}
