import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { buildOpenApiDocument, configureApp } from './bootstrap';
import { APP_CONFIG, type AppConfig } from '@config/index';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true });
  const config = app.get<AppConfig>(APP_CONFIG);

  app.useLogger(app.get(Logger));
  app.use(helmet());
  app.disable('x-powered-by');
  configureApp(app);
  // SIGTERM/SIGINT trigger onModuleDestroy so Prisma disconnects cleanly.
  app.enableShutdownHooks();

  // Swagger UI is served outside production only (docs/guides/openapi.md);
  // production consumers use the committed openapi/openapi.json contract.
  if (config.nodeEnv !== 'production') {
    SwaggerModule.setup('api/docs', app, buildOpenApiDocument(app));
  }

  await app.listen(config.port);
}

void bootstrap();
