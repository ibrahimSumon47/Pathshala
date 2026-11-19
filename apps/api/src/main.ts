import 'reflect-metadata';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';
import { buildOpenApiDocument, rememberOpenApiDocument } from './openapi.js';

async function bootstrap(): Promise<void> {
  const app = configureApp(await NestFactory.create(AppModule));
  rememberOpenApiDocument(buildOpenApiDocument());
  const configured = Number.parseInt(process.env.PORT ?? '', 10);
  const port = Number.isInteger(configured) && configured > 0 ? configured : 4000;
  await app.listen(port);
  new Logger('Bootstrap').log(`Pathshala API listening on http://localhost:${port}`);
}

void bootstrap();
