#!/usr/bin/env node
/**
 * Author and message guard.
 *
 * Shared by .githooks/pre-push and CI so a push and a remote check agree. Every inspected
 * commit must be authored by the owner and must not credit a tool or add a trailer.
 *
 * Usage:
 *   node scripts/check-commits.mjs --all
 *   node scripts/check-commits.mjs origin/main..HEAD
 */
import { execFileSync } from 'node:child_process';

const OWNER_NAME = 'Md Ibrahim Hossain Sumon';
const OWNER_EMAIL = 'ibrahimsumon005@gmail.com';

// Credit and trailer patterns. Lower-cased matching keeps "Generated With" covered.
const BANNED = /(co-authored-by|co-authored|generated[ -]with|assisted-by|reviewed-by|signed-off-by|claude|chatgpt|openai|anthropic|copilot|cursor|windsurf|codebuff|freebuff|buffy|gemini|devin|aider|gpt-\d)/i;

/**
 * Read commits as records separated by \x1e, with fields separated by \x1f.
 * Using control characters keeps multi-line commit bodies in one record.
 */
function readCommits(revisions) {
  let raw;
  try {
    raw = execFileSync('git', ['log', '--format=%H%x1f%an%x1f%ae%x1f%B%x1e', ...revisions], {
      encoding: 'utf8',
      maxBuffer: 32 * 1024 * 1024,
    });
  } catch (error) {
    const detail = typeof error.stderr === 'string' ? error.stderr.trim() : error.message;
    console.error(`check-commits: could not read commits (${revisions.join(' ')})`);
    console.error(detail);
    process.exit(1);
  }

  return raw
    .split('\x1e')
    .map((record) => record.trim())
    .filter((record) => record.length > 0)
    .map((record) => {
      const [sha = '', name = '', email = '', ...rest] = record.split('\x1f');
      return { sha, name, email, body: rest.join('\x1f') };
    });
}

const revisions = process.argv.slice(2);
const commits = readCommits(revisions.length > 0 ? revisions : ['--all']);

if (commits.length === 0) {
  console.log('check-commits: no commits to inspect');
  process.exit(0);
}

const problems = [];
for (const commit of commits) {
  const short = commit.sha.slice(0, 7);
  if (commit.name !== OWNER_NAME || commit.email !== OWNER_EMAIL) {
    problems.push(`${short} is authored by ${commit.name} <${commit.email}>`);
  }
  if (BANNED.test(commit.body)) {
    problems.push(`${short} has a tool credit or trailer in its message`);
  }
}

if (problems.length > 0) {
  console.error('check-commits: refusing this history');
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  console.error(`Only ${OWNER_NAME} <${OWNER_EMAIL}> may author commits here.`);
  process.exit(1);
}

console.log(`check-commits: ${commits.length} commit(s) clear`);
