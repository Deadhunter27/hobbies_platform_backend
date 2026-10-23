import { Inject, Injectable, Logger } from '@nestjs/common';
import { PolicyService, PLATFORM_RESOURCE, type Actor } from '@modules/access';
import { PlatformSettingsService } from '@modules/settings';
import { AUDIT_WRITER, type AuditWriter } from '@shared/application';
import { ForbiddenError } from '@shared/errors';
import { newId } from '@shared/utils';
import {
  CannotReportSelfError,
  ReportTargetNotFoundError,
  canAutoHide,
  type ReportDecision,
  type ReportReason,
  type ReportTarget,
} from '../domain';
import {
  MODERATION_TARGETS,
  REPORT_REPOSITORY,
  type ModerationTargets,
  type ReportGroup,
  type ReportRepository,
} from './ports/moderation.ports';

/**
 * ADR-0036: anyone signed in can report. When enough different people report
 * the same content (platform setting moderation.autoHideReportThreshold), it
 * is hidden until staff review it.
 */
@Injectable()
export class ReportContentUseCase {
  private readonly logger = new Logger(ReportContentUseCase.name);

  constructor(
    @Inject(REPORT_REPOSITORY) private readonly reports: ReportRepository,
    @Inject(MODERATION_TARGETS) private readonly targets: ModerationTargets,
    private readonly settings: PlatformSettingsService,
  ) {}

  async execute(
    actor: Actor,
    input: { target: ReportTarget; reason: ReportReason; note: string | null },
    now = new Date(),
  ): Promise<{ hidden: boolean }> {
    if (input.target.type === 'person' && input.target.id === actor.id) {
      throw new CannotReportSelfError();
    }
    if (!(await this.targets.exists(input.target))) {
      throw new ReportTargetNotFoundError(input.target);
    }
    await this.reports.create({
      id: newId(),
      reporterId: actor.id,
      target: input.target,
      reason: input.reason,
      note: input.note?.trim() || null,
      createdAt: now,
    });

    if (!canAutoHide(input.target.type)) return { hidden: false };
    const [reporters, threshold] = await Promise.all([
      this.reports.countOpenReporters(input.target),
      this.settings.get('moderation.autoHideReportThreshold'),
    ]);
    if (reporters < threshold) return { hidden: false };

    await this.targets.setVisible(input.target, false, now);
    await this.reports.markAutoHidden(input.target);
    this.logger.warn(
      { targetType: input.target.type, targetId: input.target.id, reporters },
      'Content auto-hidden after reports; awaiting staff review.',
    );
    return { hidden: true };
  }
}

@Injectable()
export class ReviewReportsUseCase {
  constructor(
    private readonly policy: PolicyService,
    @Inject(REPORT_REPOSITORY) private readonly reports: ReportRepository,
    @Inject(MODERATION_TARGETS) private readonly targets: ModerationTargets,
    @Inject(AUDIT_WRITER) private readonly audit: AuditWriter,
  ) {}

  async list(actor: Actor, limit: number): Promise<ReportGroup[]> {
    await this.assertStaff(actor);
    return this.reports.listOpen(limit);
  }

  /**
   * dismiss: reports were unfounded; auto-hidden content comes back.
   * remove: content stays hidden. People are never changed here (suspension
   * is a separate, deliberate staff action).
   */
  async resolve(
    actor: Actor,
    target: ReportTarget,
    decision: ReportDecision,
    now = new Date(),
  ): Promise<{ resolved: number }> {
    await this.assertStaff(actor);
    const result = await this.reports.resolve(
      target,
      decision === 'dismiss' ? 'dismissed' : 'actioned',
      actor.id,
      now,
    );
    if (canAutoHide(target.type)) {
      if (decision === 'dismiss' && result.autoHidden) {
        await this.targets.setVisible(target, true, now);
      } else if (decision === 'remove' && !result.autoHidden) {
        await this.targets.setVisible(target, false, now);
      }
    }
    await this.audit.write({
      actorId: actor.id,
      action: decision === 'dismiss' ? 'report.dismiss' : 'report.remove',
      resourceType: target.type,
      resourceId: target.id,
      metadata: { resolved: result.resolved, wasAutoHidden: result.autoHidden },
    });
    return { resolved: result.resolved };
  }

  private async assertStaff(actor: Actor): Promise<void> {
    const decision = await this.policy.can(actor, 'platform.manage', PLATFORM_RESOURCE);
    if (!decision.allow) {
      throw new ForbiddenError('Staff only.', undefined, 'ADMIN_ACCESS_DENIED');
    }
  }
}
