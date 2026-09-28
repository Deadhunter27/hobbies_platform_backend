import type { AppConfig } from '@config/index';
import { ErrorTrackerService, sanitizeSentryEvent } from './error-tracker.service';

describe('Sentry Alpha privacy boundary', () => {
  it('removes request, user, breadcrumbs, extras and auto-collected contexts', () => {
    const event = {
      message: 'boom',
      request: { headers: { authorization: 'Bearer secret' }, data: { password: 'secret' } },
      user: { id: 'user-1', email: 'private@example.com' },
      breadcrumbs: [{ message: 'sensitive action' }],
      extra: { refreshToken: 'secret' },
      contexts: { runtime: { name: 'node' }, custom: { token: 'secret' } },
      tags: { request_id: 'req-123' },
    };

    const sanitized = sanitizeSentryEvent(event);

    expect(sanitized).toBe(event);
    expect(sanitized).not.toHaveProperty('request');
    expect(sanitized).not.toHaveProperty('user');
    expect(sanitized).not.toHaveProperty('breadcrumbs');
    expect(sanitized).not.toHaveProperty('extra');
    expect(sanitized).not.toHaveProperty('contexts');
    expect(sanitized.tags).toEqual({ request_id: 'req-123' });
    expect(sanitized.message).toBe('boom');
  });

  it('is a no-op when the tracker is disabled outside production', () => {
    const config = {
      nodeEnv: 'test',
      sentryDsn: null,
      sentryRelease: null,
    } as AppConfig;
    const tracker = new ErrorTrackerService(config);

    expect(() => tracker.onModuleInit()).not.toThrow();
    expect(() =>
      tracker.captureException(new Error('not sent'), {
        requestId: 'req-test',
        method: 'GET',
        route: '/api/v1/test',
        errorCode: 'INTERNAL',
      }),
    ).not.toThrow();
  });
});
