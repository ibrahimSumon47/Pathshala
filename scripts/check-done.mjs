#!/usr/bin/env node
/**
 * Project gate.
 *
 * Reads docs/features.json and exits non-zero while any feature is missing a done status
 * or concrete evidence. Run it before claiming a slice is finished and before the final
 * handover. It deliberately has no bypass flag.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FEATURES_PATH = path.join(ROOT, 'docs', 'features.json');
const STATUSES = new Set(['todo', 'in_progress', 'done']);
const MAX_EVIDENCE = 6;

/** Print a failure and stop with a non-zero status. */
function fail(message) {
  console.error(`check-done: ${message}`);
  process.exit(1);
}

/** Load and parse the feature file, with a readable error if it is malformed. */
function loadFeatures() {
  let raw;
  try {
    raw = readFileSync(FEATURES_PATH, 'utf8');
  } catch {
    fail(`cannot read ${path.relative(ROOT, FEATURES_PATH)}`);
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    fail(`invalid JSON in docs/features.json: ${error.message}`);
  }
  if (!parsed || !Array.isArray(parsed.features)) {
    fail('docs/features.json must contain a "features" array');
  }
  return parsed.features;
}

/** Check one feature record and return a list of human-readable problems. */
function inspect(feature, index) {
  const label = feature && feature.id ? feature.id : `#${index + 1}`;
  const problems = [];
  if (!feature || typeof feature !== 'object') {
    return [`${label}: entry is not an object`];
  }
  if (typeof feature.id !== 'string' || feature.id.trim() === '') {
    problems.push(`${label}: id is required`);
  }
  if (typeof feature.title !== 'string' || feature.title.trim() === '') {
    problems.push(`${label}: title is required`);
  }
  if (!STATUSES.has(feature.status)) {
    problems.push(`${label}: status must be todo, in_progress or done`);
  }
  if (!Array.isArray(feature.evidence)) {
    problems.push(`${label}: evidence must be an array`);
    return problems;
  }
  if (feature.evidence.length > MAX_EVIDENCE) {
    problems.push(`${label}: keep evidence to ${MAX_EVIDENCE} concrete pointers`);
  }
  if (feature.status === 'done' && feature.evidence.length === 0) {
    problems.push(`${label}: marked done without evidence`);
  }
  feature.evidence.forEach((entry, evidenceIndex) => {
    if (typeof entry !== 'string' || entry.trim().length < 4) {
      problems.push(`${label}: evidence ${evidenceIndex + 1} is not a usable reference`);
    }
  });
  return problems;
}

/** Build per-phase progress lines so the gap is obvious at a glance. */
function summarizeByPhase(features) {
  const phases = new Map();
  for (const feature of features) {
    const phase = typeof feature.phase === 'string' ? feature.phase : 'unphased';
    const bucket = phases.get(phase) ?? { done: 0, total: 0 };
    bucket.total += 1;
    if (feature.status === 'done' && Array.isArray(feature.evidence) && feature.evidence.length > 0) {
      bucket.done += 1;
    }
    phases.set(phase, bucket);
  }
  return [...phases.entries()].map(([phase, bucket]) => `${phase}: ${bucket.done}/${bucket.total}`);
}

const features = loadFeatures();
if (features.length === 0) {
  fail('no features listed');
}

const problems = [];
const seen = new Set();
features.forEach((feature, index) => {
  problems.push(...inspect(feature, index));
  if (feature && typeof feature.id === 'string') {
    if (seen.has(feature.id)) {
      problems.push(`${feature.id}: duplicate id`);
    }
    seen.add(feature.id);
  }
});

if (problems.length > 0) {
  console.error('check-done: feature list is inconsistent');
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  process.exit(1);
}

const done = features.filter((feature) => feature.status === 'done').length;
const remaining = features.length - done;

console.log(`Features done: ${done}/${features.length}`);
console.log(summarizeByPhase(features).join('  |  '));

if (remaining > 0) {
  console.error(`check-done: ${remaining} feature(s) still open — the project is not done`);
  process.exit(1);
}

console.log('check-done: every feature is done with evidence');
