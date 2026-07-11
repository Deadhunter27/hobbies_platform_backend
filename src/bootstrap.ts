import type { INestApplication } from '@nestjs/common';
import { RequestMethod, VersioningType } from '@nestjs/common';

/**
 * Shared between main.ts and scripts/generate-openapi.ts so the OpenAPI
 * spec is always generated against the exact same route table the running
 * app serves (versioning + prefix applied identically in both places).
 */
export function configureApp(app: INestApplication): void {
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.setGlobalPrefix('api', {
    exclude: [
      { path: 'health/live', method: RequestMethod.GET },
      { path: 'health/ready', method: RequestMethod.GET },
    ],
  });
}
