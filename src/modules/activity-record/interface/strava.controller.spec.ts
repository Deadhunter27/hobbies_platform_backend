import type { AppConfig } from '@config/index';
import type { ErrorTrackerService } from '@infra/observability';
import { ConflictError, UnauthorizedError } from '@shared/errors';
import type { StravaIntegrationService } from '../application/strava-integration.service';
import { callbackFailureReason, StravaPublicController } from './strava.controller';

const MOBILE = 'wayfinder://strava-connected';

function controller(complete: () => Promise<string>) {
  const captured: string[] = [];
  const strava = { completeAuthorization: complete } as unknown as StravaIntegrationService;
  const errors = {
    captureException: (_error: unknown, context: { errorCode: string }) =>
      captured.push(context.errorCode),
  } as unknown as ErrorTrackerService;
  const config = { wayfinderMobileRedirectUri: MOBILE } as unknown as AppConfig;
  return { ctl: new StravaPublicController(strava, errors, config), captured };
}

describe('StravaPublicController.callback', () => {
  it('redirects to the app with success after a completed exchange', async () => {
    const { ctl, captured } = controller(async () => MOBILE);
    const result = await ctl.callback({ code: 'c', state: 's' });
    expect(result).toEqual({ url: `${MOBILE}?status=success`, statusCode: 302 });
    expect(captured).toEqual([]);
  });

  it('reports a known failure reason to the app and to error tracking', async () => {
    const { ctl, captured } = controller(async () => {
      throw new ConflictError(
        'Strava authorization could not be completed.',
        [{ stravaStatus: 400, stravaErrors: ['Application.client_secret:invalid'] }],
        'STRAVA_AUTH_FAILED',
      );
    });
    const result = await ctl.callback({ code: 'c', state: 's' });
    expect(result.url).toBe(`${MOBILE}?status=failed&reason=STRAVA_AUTH_FAILED`);
    expect(captured).toEqual(['STRAVA_AUTH_FAILED']);
  });

  it('never forwards unknown error details to the deep link', async () => {
    const { ctl } = controller(async () => {
      throw new Error('database password is hunter2');
    });
    const result = await ctl.callback({ code: 'c', state: 's' });
    expect(result.url).toBe(`${MOBILE}?status=failed&reason=UNKNOWN`);
  });

  it('treats a user cancellation as cancelled without calling Strava', async () => {
    const { ctl, captured } = controller(async () => {
      throw new Error('should not be called');
    });
    const result = await ctl.callback({ error: 'access_denied' });
    expect(result.url).toBe(`${MOBILE}?status=cancelled`);
    expect(captured).toEqual([]);
  });
});

describe('callbackFailureReason', () => {
  it('maps only allow-listed codes', () => {
    expect(callbackFailureReason(new UnauthorizedError('x', [], 'STRAVA_STATE_EXPIRED'))).toBe(
      'STRAVA_STATE_EXPIRED',
    );
    expect(callbackFailureReason(new UnauthorizedError('x', [], 'SOMETHING_ELSE'))).toBe('UNKNOWN');
  });
});
