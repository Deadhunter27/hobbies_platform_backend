import { Global, Module } from '@nestjs/common';
import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { APP_CONFIG, type AppConfig } from '@config/index';

const REQUEST_ID_HEADER = 'x-request-id';

function resolveRequestId(req: IncomingMessage, res: ServerResponse): string {
  const existing = req.headers[REQUEST_ID_HEADER];
  const id = (Array.isArray(existing) ? existing[0] : existing) ?? randomUUID();
  res.setHeader(REQUEST_ID_HEADER, id);
  return id;
}

/**
 * Pino structured logging with correlation IDs (ADR-0010). The correlation
 * id is read from (or generated for) the `x-request-id` header and bound to
 * every log line for the request via pino-http's async context, then
 * echoed back on the response.
 */
@Global()
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [APP_CONFIG],
      useFactory: (config: AppConfig) => ({
        pinoHttp: {
          level: config.logLevel,
          genReqId: resolveRequestId,
          redact: {
            paths: [
              'req.headers.authorization',
              'req.headers.cookie',
              '*.password',
              '*.currentPassword',
              '*.newPassword',
              '*.passwordHash',
              '*.token',
              '*.refreshToken',
              '*.accessToken',
            ],
            remove: true,
          },
          transport: config.isDevelopment
            ? { target: 'pino-pretty', options: { colorize: true, singleLine: true } }
            : undefined,
        },
      }),
    }),
  ],
  exports: [PinoLoggerModule],
})
export class LoggerModule {}
