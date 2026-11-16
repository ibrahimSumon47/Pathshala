import type { INestApplication } from '@nestjs/common';

/** Settings shared by the long-running server and the serverless handler. */
export function configureApp(app: INestApplication): INestApplication {
  const origins = (process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length > 0) {
    app.enableCors({ origin: origins, methods: ['GET', 'OPTIONS'] });
  }

  app.enableShutdownHooks();
  return app;
}
