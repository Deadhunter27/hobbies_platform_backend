import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { Logger } from 'nestjs-pino';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';
import { APP_CONFIG, type AppConfig } from '@config/index';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.useLogger(app.get(Logger));
  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Hobbies Platform API')
    .setDescription('Public API for the Hobbies Platform backend.')
    .setVersion('1.0')
    .build();
  const document = cleanupOpenApiDoc(SwaggerModule.createDocument(app, swaggerConfig));
  SwaggerModule.setup('api/docs', app, document);

  const config = app.get<AppConfig>(APP_CONFIG);
  await app.listen(config.port);
}

void bootstrap();
