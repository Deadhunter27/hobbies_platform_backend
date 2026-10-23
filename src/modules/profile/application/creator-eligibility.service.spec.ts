import type { Actor } from '@modules/access';
import type { PlatformSettingsService } from '@modules/settings';
import { CreatorEligibilityService } from './creator-eligibility.service';
import type { ProfileRepository } from './ports/profile.repository.port';

const user = { id: '01HZZZZZZZZZZZZZZZZZZZZZA1', globalRole: 'user' } as Actor;
const staff = { id: '01HZZZZZZZZZZZZZZZZZZZZZS1', globalRole: 'staff' } as Actor;

function service(policy: string, handle: string | null) {
  const settings = { get: async () => policy } as unknown as PlatformSettingsService;
  const repository = {
    findDetails: async () => (handle ? { handle } : null),
  } as unknown as ProfileRepository;
  return new CreatorEligibilityService(settings, repository);
}

describe('CreatorEligibilityService', () => {
  it('lets everyone create when the policy is everyone', async () => {
    await expect(
      service('everyone', null).assertCanCreate(user, 'community'),
    ).resolves.toBeUndefined();
  });

  it('requires a username when the policy is verified', async () => {
    await expect(service('verified', null).assertCanCreate(user, 'event')).rejects.toMatchObject({
      code: 'CREATION_NOT_ALLOWED',
    });
    await expect(
      service('verified', 'dina').assertCanCreate(user, 'event'),
    ).resolves.toBeUndefined();
  });

  it('allows only staff when the policy is staff', async () => {
    await expect(service('staff', 'dina').assertCanCreate(user, 'community')).rejects.toMatchObject(
      {
        code: 'CREATION_NOT_ALLOWED',
      },
    );
    await expect(
      service('staff', null).assertCanCreate(staff, 'community'),
    ).resolves.toBeUndefined();
  });
});
