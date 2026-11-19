import { readFileSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { accounts, signIn } from './helpers';

/**
 * Crawls every role's routes at three widths in both themes and fails on the problems a
 * person would notice: console noise, failed requests, uncaught errors, sideways scroll,
 * unsized or unlabelled images and text that is cut off by its own box.
 *
 * The route list comes from `pnpm audit:routes`, which reads the database without writing.
 * Screenshots are captured for a representative set so a human can review them.
 */

type Route = { path: string; label: string; expectStatus?: number };
type Plan = { public: Route[]; student: Route[]; instructor: Route[]; admin: Route[]; states: Route[] };
type Problem = { kind: string; detail: string; url: string };

const sizes = [
  { label: '375', width: 375, height: 812 },
  { label: '768', width: 768, height: 1024 },
  { label: '1440', width: 1440, height: 900 },
];
const themes = ['light', 'dark'] as const;
const baseURL = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:59802';

/** Pages a person should look at, one per template, with real data in it. */
const reviewed = new Set([
  'landing',
  'catalogue',
  'course',
  'preview-lesson',
  'sign-in',
  'dashboard',
  'learn',
  'cart',
  'studio-course',
  'admin',
  'state-empty-search',
  'state-sign-in-error',
]);

/** Collect console, network and runtime problems once per page; the crawl resets the list. */
function watch(page: Page, problems: Problem[], expectedStatus: () => number | undefined): void {
  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    problems.push({ kind: `console.${message.type()}`, detail: message.text().slice(0, 300), url: page.url() });
  });
  page.on('pageerror', (error) => {
    problems.push({ kind: 'pageerror', detail: String(error).slice(0, 300), url: page.url() });
  });
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText ?? '';
    // Aborted prefetches are ordinary navigation noise, not a broken page.
    if (/ERR_ABORTED/.test(failure)) return;
    problems.push({ kind: 'requestfailed', detail: `${request.url()} ${failure}`, url: page.url() });
  });
  page.on('response', (response) => {
    const status = response.status();
    if (status < 400 || status === expectedStatus()) return;
    problems.push({ kind: `http.${status}`, detail: response.url(), url: page.url() });
  });
}

/** Read the DOM once per page: overflow, broken or unlabelled images, clipped text. */
async function inspect(page: Page): Promise<Problem[]> {
  const found = await page.evaluate(() => {
    const problems: { kind: string; detail: string }[] = [];
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth + 1) {
      problems.push({
        kind: 'horizontal-scroll',
        detail: `${root.scrollWidth}px wide in a ${root.clientWidth}px viewport`,
      });
    }

    for (const image of Array.from(document.images)) {
      const source = image.currentSrc || image.src;
      if (!image.hasAttribute('alt')) problems.push({ kind: 'image-alt', detail: source });
      if (image.complete && image.naturalWidth === 0) problems.push({ kind: 'image-broken', detail: source });
      // A reserved box is what prevents a layout shift: attributes, a fill parent, a
      // fixed CSS box or an aspect ratio all count.
      const style = getComputedStyle(image);
      const sized =
        (image.hasAttribute('width') && image.hasAttribute('height')) ||
        image.getAttribute('data-nimg') === 'fill' ||
        style.aspectRatio !== 'auto' ||
        getComputedStyle(image.parentElement ?? image).aspectRatio !== 'auto' ||
        (/^\d+(\.\d+)?px$/.test(style.width) && /^\d+(\.\d+)?px$/.test(style.height));
      if (!sized) problems.push({ kind: 'image-size', detail: source });
    }

    for (const element of Array.from(document.querySelectorAll<HTMLElement>('body *'))) {
      const text = element.childElementCount === 0 ? element.textContent?.trim() : '';
      if (!text) continue;
      const box = element.getBoundingClientRect();
      // Text that is hidden for sighted readers only (1px, clipped) is not clipped copy.
      if (box.width <= 1 || box.height <= 1) continue;
      const style = getComputedStyle(element);
      const clippedX =
        (style.overflowX === 'hidden' || style.overflowX === 'clip') &&
        element.scrollWidth > element.clientWidth + 1;
      const clippedY =
        (style.overflowY === 'hidden' || style.overflowY === 'clip') &&
        element.scrollHeight > element.clientHeight + 1 &&
        style.webkitLineClamp === 'none';
      if (!clippedX && !clippedY) continue;
      problems.push({
        kind: 'clipped-text',
        detail: `${element.tagName.toLowerCase()} "${text.slice(0, 40)}"`,
      });
    }
    return problems;
  });
  return found.map((problem) => ({ ...problem, url: page.url() }));
}

async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('load');
  // Entrance motion fades content in; inspect the settled page, not a blended frame.
  await page.waitForTimeout(400);
}

async function crawl(page: Page, routes: Route[], problems: Problem[], role: string): Promise<void> {
  let expectedStatus: number | undefined;
  watch(page, problems, () => expectedStatus);

  for (const route of routes) {
    expectedStatus = route.expectStatus;
    const isReviewed = reviewed.has(route.label.replace(/-(en|bn)$/, ''));
    for (const size of sizes) {
      for (const theme of themes) {
        await page.setViewportSize({ width: size.width, height: size.height });
        await page.context().addCookies([
          { name: 'pathshala-theme', value: theme, domain: new URL(baseURL).hostname, path: '/' },
        ]);
        await page.emulateMedia({ colorScheme: theme });

        const before = problems.length;
        await page.goto(route.path, { waitUntil: 'domcontentloaded' });
        await settle(page);

        // A signed-in page that bounces to the form would hide everything behind it.
        if (role !== 'public') {
          expect(page.url(), `${route.path} kept the ${role} session`).not.toContain('/sign-in');
        }

        const local = await inspect(page);
        problems.push(...local);

        if (isReviewed) {
          const directory = join('docs', 'audit', 'screens', role);
          await mkdir(directory, { recursive: true });
          await page.screenshot({
            path: join(directory, `${route.label}-${size.label}-${theme}.png`),
            animations: 'disabled',
            caret: 'hide',
          });
        }

        // Print per page as it happens: the final assertion lists every finding, and the
        // crawl should reach the last route instead of stopping at the first problem.
        if (problems.length > before) {
          for (const problem of problems.slice(before)) {
            process.stdout.write(`${route.path} ${size.label} ${theme} ${problem.kind}: ${problem.detail}\n`);
          }
        }
      }
    }
  }
}

const plan = JSON.parse(readFileSync('docs/audit/routes.json', 'utf8')) as Plan;

test.describe.configure({ mode: 'serial' });

test('every public route is clean at three widths in both themes', async ({ page }) => {
  test.setTimeout(900_000);
  const problems: Problem[] = [];
  await crawl(page, [...plan.public, ...plan.states], problems, 'public');
  expect(problems).toEqual([]);
});

test('every learner route is clean at three widths in both themes', async ({ page }) => {
  test.setTimeout(900_000);
  await signIn(page, accounts.student.email, accounts.student.password);
  const problems: Problem[] = [];
  await crawl(page, plan.student, problems, 'student');
  expect(problems).toEqual([]);
});

test('every teacher route is clean at three widths in both themes', async ({ page }) => {
  test.setTimeout(900_000);
  await signIn(page, accounts.instructor.email, accounts.instructor.password);
  const problems: Problem[] = [];
  await crawl(page, plan.instructor, problems, 'instructor');
  expect(problems).toEqual([]);
});

test('every operator route is clean at three widths in both themes', async ({ page }) => {
  test.setTimeout(900_000);
  await signIn(page, accounts.admin.email, accounts.admin.password);
  const problems: Problem[] = [];
  await crawl(page, plan.admin, problems, 'admin');
  expect(problems).toEqual([]);
});
