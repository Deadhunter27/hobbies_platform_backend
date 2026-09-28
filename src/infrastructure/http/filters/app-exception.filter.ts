import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorTrackerService } from '@infra/observability';
import { AppError } from '@shared/errors';
import { statusForAppError } from './error-code.map';

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
}

type RoutedRequest = Request & {
  id?: string | number;
  route?: { path?: unknown };
};

function routeTemplateOf(request: RoutedRequest): string {
  const path = request.route?.path;
  if (typeof path !== 'string') return 'unknown';
  return `${request.baseUrl ?? ''}${path}` || path;
}

/**
 * Single global exception filter (ADR-0009). Domain/application code never
 * throws HttpException, so the only legitimate HttpException reaching this
 * filter is Nest's own unmatched-route 404 — everything else with an
 * HttpException is defensive fallback handling.
 */
@Catch()
export class AppExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  constructor(private readonly errorTracker: ErrorTrackerService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<RoutedRequest>();
    // pino-http assigns req.id (echoed to the client as x-request-id); the
    // raw header alone is empty whenever the id was server-generated.
    const requestId = String(request.id ?? request.headers['x-request-id'] ?? 'unknown');
    const route = routeTemplateOf(request);

    if (exception instanceof AppError) {
      const status = statusForAppError(exception);
      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.capture(exception, requestId, request.method, route, exception.code);
      }
      this.respond(response, status, exception.code, exception.message, exception.details ?? []);
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();

      if (status === HttpStatus.NOT_FOUND) {
        this.respond(
          response,
          status,
          'ROUTE_NOT_FOUND',
          'The requested route does not exist.',
          [],
        );
        return;
      }

      if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
        this.capture(exception, requestId, request.method, route, 'HTTP_ERROR');
      }

      const body = exception.getResponse();
      const message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
      this.respond(
        response,
        status,
        'HTTP_ERROR',
        Array.isArray(message) ? message.join(', ') : message,
        [],
      );
      return;
    }

    this.capture(exception, requestId, request.method, route, 'INTERNAL');
    this.logger.error(
      `Unhandled error on ${request.method} ${route} [requestId=${requestId}]`,
      exception instanceof Error ? exception.stack : String(exception),
    );
    this.respond(
      response,
      HttpStatus.INTERNAL_SERVER_ERROR,
      'INTERNAL',
      'An internal error occurred.',
      [],
    );
  }

  private capture(
    exception: unknown,
    requestId: string,
    method: string,
    route: string,
    errorCode: string,
  ): void {
    this.errorTracker.captureException(exception, { requestId, method, route, errorCode });
  }

  private respond(
    response: Response,
    status: number,
    code: string,
    message: string,
    details: unknown[],
  ): void {
    const envelope: ErrorEnvelope = { error: { code, message, details } };
    response.status(status).json(envelope);
  }
}
