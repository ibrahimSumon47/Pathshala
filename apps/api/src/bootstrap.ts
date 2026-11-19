import type { INestApplication } from '@nestjs/common';

type RequestLike = { method: string; path?: string; url?: string };
type ResponseLike = {
  setHeader(name: string, value: string): void;
  status(code: number): { json(body: unknown): void };
};
type Next = () => void;

/** Paths this API answers; a request with another method on one of them is a 405. */
const KNOWN_PATHS = [/^\/health\/?$/, /^\/courses\/?$/, /^\/courses\/[^/]+\/?$/];
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Answer unsupported methods on a real route with 405 instead of Express's 404, so a
 * client (and the OpenAPI contract) can tell "no such route" from "not this method".
 */
export function methodNotAllowed(request: RequestLike, response: ResponseLike): boolean {
  if (READ_METHODS.has(request.method.toUpperCase())) return false;
  const path = (request.path ?? request.url ?? '').split('?')[0] ?? '';
  if (!KNOWN_PATHS.some((pattern) => pattern.test(path))) return false;
  // RFC 9110 requires the methods that would have worked.
  response.setHeader('Allow', 'GET, HEAD, OPTIONS');
  response
    .status(405)
    .json({ error: { code: 'method_not_allowed', message: 'That method is not allowed on this route.' } });
  return true;
}

/** Settings shared by the long-running server and the serverless handler. */
export function configureApp(app: INestApplication): INestApplication {
  const origins = (process.env.WEB_ORIGIN ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length > 0) {
    app.enableCors({ origin: origins, methods: ['GET', 'OPTIONS'] });
  }

  // Registered before the controllers so it runs ahead of Nest's own 404 handler.
  app.use((request: RequestLike, response: ResponseLike, next: Next) => {
    if (!methodNotAllowed(request, response)) next();
  });

  app.enableShutdownHooks();
  return app;
}
