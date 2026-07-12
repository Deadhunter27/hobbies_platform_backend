import { HttpException, HttpStatus } from '@nestjs/common';
import type { ArgumentsHost } from '@nestjs/common';
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

function makeHost(requestId?: string): {
  host: ArgumentsHost;
  json: jest.Mock;
  status: jest.Mock;
} {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { method: 'GET', url: '/test', headers: {}, id: requestId };

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
    [new InfrastructureError('db down'), 500, 'INFRASTRUCTURE_ERROR'],
  ])('maps %p to the documented status and code', (error, expectedStatus, expectedCode) => {
    const filter = new AppExceptionFilter();
    const { host, json, status } = makeHost();

    filter.catch(error, host);

    expect(status).toHaveBeenCalledWith(expectedStatus);
    expect(json).toHaveBeenCalledWith({
      error: { code: expectedCode, message: error.message, details: [] },
    });
  });

  it('rewrites a bare HttpException 404 to ROUTE_NOT_FOUND', () => {
    const filter = new AppExceptionFilter();
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
  });

  it('maps a bare Error to 500 INTERNAL without leaking its message', () => {
    const filter = new AppExceptionFilter();
    const { host, json, status } = makeHost();

    filter.catch(new Error('some internal detail nobody should see'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: { code: 'INTERNAL', message: 'An internal error occurred.', details: [] },
    });
  });

  it('logs unhandled errors with the pino-assigned request id', () => {
    const filter = new AppExceptionFilter();
    const { host } = makeHost('req-abc-123');
    const errorSpy = jest
      .spyOn(
        (filter as unknown as { logger: { error: (...args: unknown[]) => void } }).logger,
        'error',
      )
      .mockImplementation(() => undefined);

    filter.catch(new Error('boom'), host);

    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('requestId=req-abc-123'),
      expect.any(String),
    );
  });
});
