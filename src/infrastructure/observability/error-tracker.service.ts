import { Inject, Injectable, type OnModuleDestroy, type OnModuleInit } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import { APP_CONFIG, type AppConfig } from '@config/index';

interface ScrubbableSentryEvent {
  request?: unknown;
  user?: unknown;
  breadcrumbs?: unknown;
  extra?: unknown;
  contexts?: unknown;
}

export interface ErrorCaptureContext {
  readonly requestId: string;
  readonly method: string;
  readonly route: string;
  readonly errorCode: string;
}

/**
 * Stage-1 privacy boundary for Sentry. Stack traces and the exception itself
 * remain useful, while HTTP request data, users, breadcrumbs, arbitrary extra
 * data and auto-collected contexts are removed before anything leaves the app.
 */
export function sanitizeSentryEvent<T extends ScrubbableSentryEvent>(event: T): T {
  delete event.request;
  delete event.user;
  delete event.breadcrumbs;
  delete event.extra;
  delete event.contexts;
  return event;
}

@Injectable()
export class ErrorTrackerService implements OnModuleInit, OnModuleDestroy {
  private enabled = false;

  constructor(@Inject(APP_CONFIG) private readonly config: AppConfig) {}

  onModuleInit(): void {
    if (!this.config.sentryDsn) return;

    Sentry.init({
      dsn: this.config.sentryDsn,
      environment: this.config.nodeEnv,
      release: this.config.sentryRelease ?? undefined,
      tracesSampleRate: 0,
      maxBreadcrumbs: 0,
      beforeSend: (event) => sanitizeSentryEvent(event),
    });
    this.enabled = true;
  }

  captureException(exception: unknown, context: ErrorCaptureContext): void {
    if (!this.enabled) return;

    Sentry.withScope((scope) => {
      scope.setTag('request_id', context.requestId);
      scope.setTag('http.method', context.method);
      scope.setTag('http.route', context.route);
      scope.setTag('error.code', context.errorCode);
      Sentry.captureException(exception);
    });
  }

  async onModuleDestroy(): Promise<void> {
    if (this.enabled) {
      await Sentry.flush(2_000);
    }
  }
}
