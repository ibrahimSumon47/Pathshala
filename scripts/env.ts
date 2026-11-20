import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/**
 * Give a command-line script the workspace's `.env.local`, so `pnpm db:seed` and friends run from
 * a plain terminal. Node's loader keeps a variable that is already set, so CI and an explicit
 * export behave exactly as before, and a value is never printed or passed on a command line.
 */
export function loadLocalEnv(): void {
  const file = fileURLToPath(new URL('../.env.local', import.meta.url));
  if (existsSync(file)) process.loadEnvFile(file);
}
