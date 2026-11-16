import type { Request, Response } from 'express';
import { getServer } from '../src/serverless';

/**
 * Vercel sends every rewritten request here. Strip the platform's /api prefix so the
 * same controllers answer locally and in production.
 */
export default async function handler(req: Request, res: Response): Promise<void> {
  if (req.url?.startsWith('/api/')) {
    req.url = req.url.slice(4);
  } else if (req.url === '/api') {
    req.url = '/';
  }

  const server = await getServer();
  server(req, res);
}
