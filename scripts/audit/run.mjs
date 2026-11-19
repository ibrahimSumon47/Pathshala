#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/**
 * The full local audit: static checks, security scans, dead code, the browser crawl, axe,
 * pa11y, the link check, Lighthouse and the API contract fuzz.
 *
 * Set AUDIT_BASE_URL to the origin under test (default: the deployed site). The API fuzz
 * needs MONGODB_URI; it starts the API on AUDIT_API_PORT (default 4001) and stops it.
 */

const base = process.env.AUDIT_BASE_URL ?? 'https://pathshala-web-eight.vercel.app';
const apiPort = process.env.AUDIT_API_PORT ?? '4001';
const apiBase = `http://127.0.0.1:${apiPort}`;
process.env.E2E_BASE_URL ??= base;

const isWindows = process.platform === 'win32';
const results = [];

/**
 * Resolve a CLI from the gitignored tools folder or the PATH. The result is absolute, because
 * a relative path with forward slashes is read as a command plus switches by cmd.exe.
 */
function tool(windowsPath, fallback) {
  return windowsPath && existsSync(windowsPath) ? resolve(windowsPath) : fallback;
}

/** Resolve an installed package's CLI script so it can run under node without a shell. */
function cliScript(name) {
  const manifest = JSON.parse(readFileSync(join('node_modules', name, 'package.json'), 'utf8'));
  const bin = typeof manifest.bin === 'string' ? manifest.bin : Object.values(manifest.bin ?? {})[0];
  if (typeof bin !== 'string') throw new Error(`${name} does not expose a bin script`);
  return resolve('node_modules', name, bin);
}

const pnpm = isWindows ? 'pnpm.cmd' : 'pnpm';
const semgrep = tool('tools/py/Scripts/semgrep.exe', 'semgrep');
const schemathesis = tool('tools/py/Scripts/schemathesis.exe', 'schemathesis');
const gitleaks = tool('tools/gitleaks/gitleaks.exe', 'gitleaks');
const osv = tool('tools/osv/osv-scanner_windows_amd64.exe', 'osv-scanner');

function run(name, command, args, extraEnv = {}, { shell = isWindows } = {}) {
  process.stdout.write(`\n=== ${name} ===\n`);
  return new Promise((done) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell,
      env: { ...process.env, PYTHONUTF8: '1', PYTHONIOENCODING: 'utf-8', ...extraEnv },
    });
    child.on('close', (code) => {
      const ok = code === 0;
      results.push({ name, ok });
      if (!ok) process.stdout.write(`\n--- ${name} failed with exit ${code} ---\n`);
      done(ok);
    });
  });
}

function chromium() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const root = isWindows
    ? join(process.env.LOCALAPPDATA ?? '', 'ms-playwright')
    : join(process.env.HOME ?? '', '.cache', 'ms-playwright');
  for (const version of ['chromium-1255', 'chromium-1248', 'chromium-1246']) {
    const candidate = isWindows
      ? join(root, version, 'chrome-win64', 'chrome.exe')
      : join(root, version, 'chrome-linux', 'chrome');
    if (existsSync(candidate)) return candidate;
  }
  return undefined;
}

/** Write one Lighthouse config and run it under its own report folder. */
async function lighthouse(name, configPath, config, chrome) {
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  await run(name, process.execPath, [cliScript('@lhci/cli'), 'autorun', '--config', configPath],
    { CHROME_PATH: chrome }, { shell: false });
}

async function waitFor(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return true;
    } catch {
      // The server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

async function apiFuzz() {
  if (!process.env.MONGODB_URI) {
    process.stdout.write('\n=== API fuzz skipped: MONGODB_URI is not set ===\n');
    return;
  }

  process.stdout.write('\n=== API: starting for the contract fuzz ===\n');
  const child = spawn(pnpm, ['--filter', '@pathshala/api', 'exec', 'tsx', 'src/main.ts'], {
    cwd: 'apps/api',
    env: { ...process.env, PORT: apiPort },
    stdio: 'ignore',
    shell: isWindows,
  });

  try {
    if (!(await waitFor(`${apiBase}/openapi.json`, 40_000))) {
      process.stdout.write('The API did not start; the fuzz step is marked failed.\n');
      results.push({ name: 'Schemathesis', ok: false });
      return;
    }
    const schema = await (await fetch(`${apiBase}/openapi.json`)).text();
    writeFileSync('docs/audit/openapi.json', schema);
    await run('Schemathesis', schemathesis, [
      'run', 'docs/audit/openapi.json', '-u', apiBase,
      '-c', 'all', '--max-examples', '10', '--rate-limit', '50/m',
      '--max-time', '120', '--workers', '1', '--phases', 'coverage,fuzzing',
    ], {}, { shell: false });
  } finally {
    // On Windows the pnpm shim owns the real server, so end the whole tree.
    if (isWindows) spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' });
    else child.kill('SIGTERM');
    await new Promise((resolve) => setTimeout(resolve, 1_500));
  }
}

async function main() {
  await run('lint', pnpm, ['lint']);
  await run('typecheck', pnpm, ['typecheck']);
  await run('unit tests', pnpm, ['test']);

  await run('knip', pnpm, ['exec', 'knip']);
  await run('madge (circular imports)', pnpm, ['exec', 'madge', '--circular', '--extensions', 'ts,tsx',
    'apps/web/src', 'apps/api/src', 'apps/paybridge/src', 'packages/db/src', 'packages/shared/src', 'packages/tokens/src']);
  await run('depcheck', pnpm, ['exec', 'depcheck',
    '--ignores=@pathshala/db,@vitest/coverage-v8,depcheck,knip,lighthouse,linkinator,madge,pa11y-ci,@lhci/cli,vite,vitest']);

  await run('gitleaks', gitleaks, ['git', '--redact', '--no-banner', '--exit-code', '1', '--log-opts=--all'], {}, { shell: false });
  await run('pnpm audit (production)', pnpm, ['audit', '--prod', '--audit-level', 'high']);
  await run('OSV-Scanner', osv, ['scan', '--config', 'osv-scanner.toml', '--output-file', 'docs/audit/osv.json', '.'], {}, { shell: false });
  await run('Semgrep', semgrep, ['--config', 'p/ci', '--error', '--metrics=off', 'apps', 'packages', 'scripts'], {}, { shell: false });

  if (process.env.MONGODB_URI) await run('route inventory', pnpm, ['audit:routes']);

  if (existsSync('docs/audit/routes.json')) {
    await run('browser crawl and screenshots', pnpm, ['exec', 'playwright', 'test', 'e2e/audit.spec.ts', '--reporter=line']);
    await run('axe (product pages)', pnpm, ['exec', 'playwright', 'test', 'e2e/a11y.spec.ts', '--reporter=line']);
  } else {
    process.stdout.write('\n=== crawl skipped: docs/audit/routes.json is missing ===\n');
  }

  const routes = existsSync('docs/audit/routes.json')
    ? JSON.parse(readFileSync('docs/audit/routes.json', 'utf8'))
    : { public: [], states: [] };
  const publicUrls = [...routes.public, ...routes.states].map((route) => `${base}${route.path}`);

  const pa11yConfig = JSON.parse(readFileSync('scripts/audit/pa11y.json', 'utf8'));
  pa11yConfig.urls = publicUrls;
  writeFileSync('docs/audit/pa11y.json', `${JSON.stringify(pa11yConfig, null, 2)}\n`);
  const chrome = chromium();
  await run('pa11y-ci (WCAG 2 AA)', process.execPath, [cliScript('pa11y-ci'), '--config', 'docs/audit/pa11y.json'],
    chrome ? { PUPPETEER_EXECUTABLE_PATH: chrome } : {}, { shell: false });

  // The skip patterns contain `|` and parentheses, which cmd.exe would split into commands.
  await run('linkinator', process.execPath, [cliScript('linkinator'), base, '--recurse',
    '--skip', '^(mailto|tel):',
    '--skip', '^https?://(?!pathshala-web-eight\\.vercel\\.app)',
    '--timeout', '20000', '--concurrency', '4'], {}, { shell: false });

  const desktopUrls = routes.public
    .filter((route) => !route.path.includes('sign-in') && !route.path.includes('register'))
    .slice(0, 12);
  // The mobile preset is the default and is heavily throttled. One sample on a cold Vercel
  // instance swung between 0.67 and 0.88, so the mobile budget reads the median of three runs
  // on the two templates people land on. The desktop thresholds stay as they were.
  const mobileLabels = new Set(['catalogue-en', 'catalogue-bn', 'course-en', 'course-bn']);
  const mobileUrls = routes.public
    .filter((route) => mobileLabels.has(route.label))
    .map((route) => `${base}${route.path}`);

  if (!chrome) {
    process.stdout.write('\n=== Lighthouse skipped: no Chromium found ===\n');
  } else {
    if (desktopUrls.length > 0) {
      await lighthouse('Lighthouse desktop (@lhci/cli)', 'docs/audit/lighthouserc.json', {
        ci: {
          collect: {
            url: desktopUrls.map((route) => `${base}${route.path}`),
            numberOfRuns: 1,
            settings: { preset: 'desktop', chromeFlags: '--no-sandbox' },
          },
          assert: {
            assertions: {
              'categories:performance': ['error', { minScore: 0.85 }],
              'categories:accessibility': ['error', { minScore: 0.95 }],
              'categories:best-practices': ['error', { minScore: 0.9 }],
              'categories:seo': ['error', { minScore: 0.9 }],
            },
          },
          upload: { target: 'filesystem', outputDir: 'docs/audit/lighthouse' },
        },
      }, chrome);
    }
    if (mobileUrls.length > 0) {
      await lighthouse('Lighthouse mobile, median of 3 (@lhci/cli)', 'docs/audit/lighthouserc-mobile.json', {
        ci: {
          collect: { url: mobileUrls, numberOfRuns: 3, settings: { chromeFlags: '--no-sandbox' } },
          assert: {
            assertions: {
              // Two sessions after the course cover moved to WebP measured medians of 0.86-0.98,
              // and the untouched catalogue moved 0.96 -> 0.86 between them, so run-to-run
              // variance is larger than the fix's ~300 ms and the budget stays at 0.80.
              'categories:performance': ['error', { minScore: 0.8 }],
              'categories:accessibility': ['error', { minScore: 0.95 }],
              'categories:best-practices': ['error', { minScore: 0.9 }],
              'categories:seo': ['error', { minScore: 0.9 }],
            },
          },
          upload: { target: 'filesystem', outputDir: 'docs/audit/lighthouse-mobile' },
        },
      }, chrome);
    }
    if (desktopUrls.length === 0 && mobileUrls.length === 0) {
      process.stdout.write('\n=== Lighthouse skipped: no routes in the plan ===\n');
    }
  }

  await apiFuzz();

  process.stdout.write('\n=== audit summary ===\n');
  for (const result of results) process.stdout.write(`${result.ok ? 'pass' : 'FAIL'}  ${result.name}\n`);
  const failed = results.filter((result) => !result.ok);
  process.stdout.write(`\n${results.length - failed.length}/${results.length} checks passed\n`);
  process.exit(failed.length === 0 ? 0 : 1);
}

await main();
