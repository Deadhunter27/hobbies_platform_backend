import type { Actor, PolicyService } from '@modules/access';
import type { PlatformSettingsService } from '@modules/settings';
import type { AuditWriter } from '@shared/application';
import type { ReportTarget } from '../domain';
import type { ModerationTargets, NewReport, ReportRepository } from './ports/moderation.ports';
import { ReportContentUseCase, ReviewReportsUseCase } from './report.use-cases';

const POST: ReportTarget = { type: 'post', id: '01HZZZZZZZZZZZZZZZZZZZZZP1' };
const reporter = (n: number) =>
  ({ id: `01HZZZZZZZZZZZZZZZZZZZZZR${n}`, globalRole: 'user' }) as Actor;
const staff = { id: '01HZZZZZZZZZZZZZZZZZZZZZS1', globalRole: 'staff' } as Actor;

function setup(threshold = 3) {
  const reports: Array<NewReport & { status: string; autoHidden: boolean }> = [];
  const visible = new Map<string, boolean>([[POST.id, true]]);
  const audit: unknown[] = [];
  const repository: ReportRepository = {
    create: async (report) => {
      if (
        reports.some((r) => r.reporterId === report.reporterId && r.target.id === report.target.id)
      ) {
        return false;
      }
      reports.push({ ...report, status: 'open', autoHidden: false });
      return true;
    },
    countOpenReporters: async (target) =>
      reports.filter((r) => r.target.id === target.id && r.status === 'open').length,
    markAutoHidden: async (target) => {
      reports.filter((r) => r.target.id === target.id).forEach((r) => (r.autoHidden = true));
    },
    listOpen: async () => [],
    resolve: async (target, status) => {
      const open = reports.filter((r) => r.target.id === target.id && r.status === 'open');
      const autoHidden = open.some((r) => r.autoHidden);
      open.forEach((r) => (r.status = status));
      return { resolved: open.length, autoHidden };
    },
  };
  const targets: ModerationTargets = {
    exists: async (target) => visible.has(target.id),
    setVisible: async (target, value) => {
      visible.set(target.id, value);
    },
  };
  const settings = { get: async () => threshold } as unknown as PlatformSettingsService;
  const policy = {
    can: async (actor: Actor) => ({ allow: actor.globalRole === 'staff' }),
  } as unknown as PolicyService;
  const writer: AuditWriter = { write: async (record) => void audit.push(record) };
  return {
    visible,
    audit,
    report: new ReportContentUseCase(repository, targets, settings),
    review: new ReviewReportsUseCase(policy, repository, targets, writer),
  };
}

const spam = { target: POST, reason: 'spam' as const, note: null };

describe('Reporting', () => {
  it('hides content once enough different people report it', async () => {
    const { report, visible } = setup(2);
    expect(await report.execute(reporter(1), spam)).toEqual({ hidden: false });
    expect(await report.execute(reporter(1), spam)).toEqual({ hidden: false });
    expect(visible.get(POST.id)).toBe(true);
    expect(await report.execute(reporter(2), spam)).toEqual({ hidden: true });
    expect(visible.get(POST.id)).toBe(false);
  });

  it('never auto-hides people and refuses self-reports', async () => {
    const { report } = setup(1);
    const me = reporter(1);
    await expect(
      report.execute(me, { target: { type: 'person', id: me.id }, reason: 'spam', note: null }),
    ).rejects.toMatchObject({ code: 'CANNOT_REPORT_SELF' });
  });

  it('rejects reports about content that does not exist', async () => {
    const { report } = setup();
    await expect(
      report.execute(reporter(1), {
        target: { type: 'post', id: '01HZZZZZZZZZZZZZZZZZZZZZX9' },
        reason: 'spam',
        note: null,
      }),
    ).rejects.toMatchObject({ code: 'REPORT_TARGET_NOT_FOUND' });
  });

  it('dismissing restores auto-hidden content; only staff can review; decisions are audited', async () => {
    const { report, review, visible, audit } = setup(1);
    await report.execute(reporter(1), spam);
    expect(visible.get(POST.id)).toBe(false);
    await expect(review.resolve(reporter(2), POST, 'dismiss')).rejects.toMatchObject({
      code: 'ADMIN_ACCESS_DENIED',
    });
    expect(await review.resolve(staff, POST, 'dismiss')).toEqual({ resolved: 1 });
    expect(visible.get(POST.id)).toBe(true);
    expect(audit).toHaveLength(1);
  });

  it('removing hides content that was not auto-hidden yet', async () => {
    const { report, review, visible } = setup(5);
    await report.execute(reporter(1), spam);
    expect(visible.get(POST.id)).toBe(true);
    await review.resolve(staff, POST, 'remove');
    expect(visible.get(POST.id)).toBe(false);
  });
});
