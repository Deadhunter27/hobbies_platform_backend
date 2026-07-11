import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import pino from 'pino';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/bootstrap';

const logger = pino({ name: 'generate-openapi' });

/**
 * Boots a Nest application context (no `.listen()`) against the exact same
 * route table `main.ts` serves, so the committed spec can never silently
 * diverge from what's actually deployed (ADR-0005).
 */
async function main(): Promise<void> {
  const app = await NestFactory.create(AppModule, { logger: false });
  configureApp(app);
  await app.init();

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hobbies Platform API')
    .setDescription('Public API for the Hobbies Platform backend.')
    .setVersion('1.0')
    .build();

  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, swaggerConfig));
  const outputPath = join(__dirname, '..', 'openapi', 'openapi.json');
  writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);
  logger.info({ outputPath }, 'OpenAPI spec generated');

  await app.close();
}

main().catch((error: unknown) => {
  logger.error({ err: error }, 'OpenAPI generation failed');
  process.exitCode = 1;
});
