import type { IncomingMessage, ServerResponse } from 'node:http';
import { getServer } from '../src/serverless.js';

/**
 * Vercel sends every rewritten request here. Strip the platform's /api prefix so the
 * same controllers answer locally and in production.
 */
export default async function handler(req: IncomingMessage, res: ServerResponse): Promise<void> {
  if (req.url?.startsWith('/api/')) {
    req.url = req.url.slice(4);
  } else if (req.url === '/api') {
    req.url = '/';
  }

  const server = await getServer();
  (server as unknown as (request: IncomingMessage, response: ServerResponse) => void)(req, res);
}
