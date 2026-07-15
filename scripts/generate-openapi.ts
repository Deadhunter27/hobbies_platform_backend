import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import pino from 'pino';
import { AppModule } from '../src/app.module';
import { buildOpenApiDocument, configureApp } from '../src/bootstrap';

const logger = pino({ name: 'generate-openapi' });

/**
 * Boots a Nest application context (no `.listen()`) against the exact same
 * route table and document builder `main.ts` uses, so the committed spec
 * can never silently diverge from what's actually deployed (ADR-0005).
 */
async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);
  await app.init();

  const document = buildOpenApiDocument(app);
  const outputPath = join(__dirname, '..', 'openapi', 'openapi.json');
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
  logger.info({ outputPath }, 'OpenAPI spec generated');

  await app.close();
}

main().catch((error: unknown) => {
  logger.error({ err: error }, 'OpenAPI generation failed');
  process.exitCode = 1;
});
