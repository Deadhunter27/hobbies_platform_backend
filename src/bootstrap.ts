import type { INestApplication } from '@nestjs/common';
import { RequestMethod, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule, type OpenAPIObject } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';

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

/** One builder for both the dev Swagger UI and the committed contract, so
 * the bearer scheme and metadata can never drift between them (ADR-0005). */
export function buildOpenApiDocument(app: INestApplication): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Hobbies Platform API')
    .setDescription('Public API for the Hobbies Platform backend.')
    .setVersion('1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .build();
  return cleanupOpenApiDoc(SwaggerModule.createDocument(app, config));
}
