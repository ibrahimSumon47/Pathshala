import 'reflect-metadata';
import type { Express } from 'express';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { configureApp } from './bootstrap';

let serverPromise: Promise<Express> | null = null;

/** Boot Nest once per function instance; warm invocations reuse the same app. */
async function createServer(): Promise<Express> {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  configureApp(app);
  await app.init();
  return app.getHttpAdapter().getInstance() as Express;
}

export function getServer(): Promise<Express> {
  serverPromise ??= createServer();
  return serverPromise;
}
