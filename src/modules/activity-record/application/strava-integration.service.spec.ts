import type { AppConfig } from '@config/index';
import type { PrismaService } from '@infra/database';
import type { ActivityRecordService } from './activity-record.service';
import { StravaIntegrationService } from './strava-integration.service';

function service(): StravaIntegrationService {
  const config = {
    stravaClientId: '12345',
    stravaClientSecret: 'client-secret',
    stravaRedirectUri: 'https://api.example.com/api/v1/integrations/strava/callback',
    stravaWebhookVerifyToken: 'verify-token-long-enough',
    integrationTokenEncryptionKey: 'ab'.repeat(32),
    wayfinderMobileRedirectUri: 'wayfinder://strava-connected',
  } as unknown as AppConfig;
  return new StravaIntegrationService({} as PrismaService, {} as ActivityRecordService, config);
}

describe('StravaIntegrationService token encryption', () => {
  const plaintext = 'strava-access-token-value';

  it('round-trips a token and never stores it in clear text', () => {
    const svc = service();
    const sealed = svc['encrypt'](plaintext);

    expect(sealed).not.toContain(plaintext);
    expect(sealed.split('.')).toHaveLength(3);
    expect(svc['decrypt'](sealed)).toBe(plaintext);
  });

  it('uses a fresh IV per encryption', () => {
    const svc = service();
    expect(svc['encrypt'](plaintext)).not.toBe(svc['encrypt'](plaintext));
  });

  it('rejects a tampered ciphertext', () => {
    const svc = service();
    const [iv, tag, data] = svc['encrypt'](plaintext).split('.');
    const bytes = Buffer.from(data!, 'base64url');
    bytes[0] = bytes[0]! ^ 0xff;

    expect(() => svc['decrypt'](`${iv}.${tag}.${bytes.toString('base64url')}`)).toThrow();
  });

  it('rejects a truncated authentication tag', () => {
    const svc = service();
    const [iv, tag, data] = svc['encrypt'](plaintext).split('.');
    const shortTag = Buffer.from(tag!, 'base64url').subarray(0, 4).toString('base64url');

    expect(() => svc['decrypt'](`${iv}.${shortTag}.${data}`)).toThrow(
      'Invalid encrypted integration token.',
    );
  });
});
