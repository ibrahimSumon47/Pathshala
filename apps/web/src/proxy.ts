import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next 16 renamed the middleware file convention to proxy.ts; the handler is unchanged.
export default createMiddleware(routing);

export const config = {
  // Match every page, but leave API routes, Next internals and files with an extension.
  matcher: '/((?!api|trpc|_next|_vercel|.*\\..*).*)',
};
