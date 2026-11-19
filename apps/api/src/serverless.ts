import 'reflect-metadata';
import type { Express } from 'express';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { configureApp } from './bootstrap.js';
import { buildOpenApiDocument, rememberOpenApiDocument } from './openapi.js';

let serverPromise: Promise<Express> | null = null;

/** Boot Nest once per function instance; warm invocations reuse the same app. */
async function createServer(): Promise<Express> {
  // Passing the adapter explicitly keeps it in the bundle when the function is bundled
  // into one file for serverless deployment.
  const app = await NestFactory.create(AppModule, new ExpressAdapter(), { logger: ['error', 'warn'] });
  configureApp(app);
  await app.init();
  rememberOpenApiDocument(buildOpenApiDocument());
  return app.getHttpAdapter().getInstance() as Express;
}

export function getServer(): Promise<Express> {
  serverPromise ??= createServer();
  return serverPromise;
}
