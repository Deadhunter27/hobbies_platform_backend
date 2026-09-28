import { HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
import type { ErrorTrackerService } from '@infra/observability';
import { AppExceptionFilter } from './app-exception.filter';
import {
  ConflictError,
  DomainRuleViolation,
  ForbiddenError,
  InfrastructureError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '@shared/errors';

function makeTracker(): ErrorTrackerService {
  return { captureException: jest.fn() } as unknown as ErrorTrackerService;
}

function makeHost(requestId?: string): {
  host: ArgumentsHost;
  json: jest.Mock;
  status: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = {
    method: 'GET',
    url: '/api/v1/things/123?token=must-not-leak',
    baseUrl: '/api/v1/things',
    route: { path: '/:thingId' },
    headers: {},
    id: requestId,
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;

  return { host, json, status };
}

describe('AppExceptionFilter', () => {
  it.each([
    [new ValidationError('bad input'), 400, 'VALIDATION_FAILED'],
    [new NotFoundError('missing'), 404, 'RESOURCE_NOT_FOUND'],
    [new ConflictError('conflict'), 409, 'CONFLICT'],
    [new UnauthorizedError('nope'), 401, 'UNAUTHORIZED'],
    [new ForbiddenError('nope'), 403, 'FORBIDDEN'],
    [new DomainRuleViolation('rule broken'), 422, 'DOMAIN_RULE_VIOLATION'],
  ])(
    'maps expected %p without reporting it as an error-tracker issue',
    (error, statusCode, code) => {
      const tracker = makeTracker();
      const filter = new AppExceptionFilter(tracker);
      const { host, json, status } = makeHost();

      filter.catch(error, host);

      expect(status).toHaveBeenCalledWith(statusCode);
      expect(json).toHaveBeenCalledWith({
        error: { code, message: error.message, details: [] },
      });
      expect(tracker.captureException).not.toHaveBeenCalled();
    },
  );

  it('captures infrastructure errors with request correlation and route template only', () => {
    const tracker = makeTracker();
    const filter = new AppExceptionFilter(tracker);
    const { host, json, status } = makeHost('req-abc-123');
    const error = new InfrastructureError('db down', undefined, 'DATABASE_UNAVAILABLE');

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'DATABASE_UNAVAILABLE', message: 'db down', details: [] },
    });
    expect(tracker.captureException).toHaveBeenCalledWith(error, {
      requestId: 'req-abc-123',
      method: 'GET',
      route: '/api/v1/things/:thingId',
      errorCode: 'DATABASE_UNAVAILABLE',
    });
    expect(tracker.captureException).not.toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ route: expect.stringContaining('token=') }),
    );
  });

  it('rewrites a bare HttpException 404 to ROUTE_NOT_FOUND without reporting it', () => {
    const tracker = makeTracker();
    const filter = new AppExceptionFilter(tracker);
    const { host, json, status } = makeHost();

    filter.catch(new HttpException('Not Found', HttpStatus.NOT_FOUND), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith({
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: 'The requested route does not exist.',
        details: [],
      },
    });
    expect(tracker.captureException).not.toHaveBeenCalled();
  });

  it('captures an unexpected error but keeps the stable INTERNAL client envelope', () => {
    const tracker = makeTracker();
    const filter = new AppExceptionFilter(tracker);
    const { host, json, status } = makeHost('req-abc-123');
    const error = new Error('some internal detail nobody should see');
    const errorSpy = jest
      .spyOn(
        (filter as unknown as { logger: { error: (...args: unknown[]) => void } }).logger,
        'error',
      )
      .mockImplementation(() => undefined);

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL', message: 'An internal error occurred.', details: [] },
    });
    expect(tracker.captureException).toHaveBeenCalledWith(error, {
      requestId: 'req-abc-123',
      method: 'GET',
      route: '/api/v1/things/:thingId',
      errorCode: 'INTERNAL',
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('GET /api/v1/things/:thingId [requestId=req-abc-123]'),
      expect.any(String),
    );
    expect(errorSpy).not.toHaveBeenCalledWith(
      expect.stringContaining('token='),
      expect.anything(),
    );
  });
});
