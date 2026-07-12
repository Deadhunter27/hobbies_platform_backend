import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AppError } from '@shared/errors';
import { statusForAppError } from './error-code.map';

interface ErrorEnvelope {
  error: {
    code: string;
    message: string;
    details: unknown[];
  };
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

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string | number }>();
    // pino-http assigns req.id (echoed to the client as x-request-id); the
    // raw header alone is empty whenever the id was server-generated.
    const requestId = request.id ?? request.headers['x-request-id'] ?? 'unknown';

    if (exception instanceof AppError) {
      const status = statusForAppError(exception);
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

    this.logger.error(
      `Unhandled error on ${request.method} ${request.url} [requestId=${String(requestId)}]`,
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
