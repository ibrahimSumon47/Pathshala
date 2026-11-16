import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/**
 * Token tests read the shipped CSS rather than a copy of it, so the values that reach the
 * browser are exactly the ones being checked.
 */
const css = readFileSync(new URL('../theme.css', import.meta.url), 'utf8');

/** Pull `--name: value;` pairs out of one CSS block. */
function readBlock(selector: string): Record<string, string> {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = css.match(new RegExp(`${escaped}\\s*\\{([^}]+)\\}`))?.[1];
  if (!block) throw new Error(`Missing block ${selector}`);

  const values: Record<string, string> = {};
  for (const match of block.matchAll(/(--[a-z0-9-]+)\s*:\s*([^;]+);/gi)) {
    const [, name, value] = match;
    if (name && value) values[name] = value.trim();
  }
  return values;
}

const light = readBlock(':root');
const dark = readBlock("[data-theme='dark']");

/** Expand #rgb or #rrggbb into channel values. */
function toRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '');
  if (value.length === 3) {
    const [r, g, b] = [...value].map((part) => Number.parseInt(part + part, 16));
    return [r ?? 0, g ?? 0, b ?? 0];
  }
  const r = Number.parseInt(value.slice(0, 2), 16);
  const g = Number.parseInt(value.slice(2, 4), 16);
  const b = Number.parseInt(value.slice(4, 6), 16);
  return [r, g, b];
}

/** WCAG relative luminance for a colour, used by the contrast ratio below. */
function luminance(hex: string): number {
  const [r, g, b] = toRgb(hex).map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** WCAG contrast ratio between two colours. */
function contrast(foreground: string, background: string): number {
  const lighter = Math.max(luminance(foreground), luminance(background));
  const darker = Math.min(luminance(foreground), luminance(background));
  return (lighter + 0.05) / (darker + 0.05);
}

/** Read a colour token and fail loudly if a test asks for one that does not exist. */
function color(tokens: Record<string, string>, name: string): string {
  const value = tokens[name];
  if (!value) throw new Error(`Missing token ${name}`);
  return value;
}

describe.each([
  ['light', light],
  ['dark', dark],
])('%s theme', (_name, tokens) => {
  it('keeps primary text at AAA contrast', () => {
    expect(contrast(color(tokens, '--color-ink'), color(tokens, '--color-paper'))).toBeGreaterThanOrEqual(7);
  });

  it('keeps secondary text readable', () => {
    expect(contrast(color(tokens, '--color-ink-muted'), color(tokens, '--color-paper'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps links and accents readable on paper', () => {
    expect(contrast(color(tokens, '--color-accent'), color(tokens, '--color-paper'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps accent buttons readable', () => {
    expect(contrast(color(tokens, '--color-on-accent'), color(tokens, '--color-accent'))).toBeGreaterThanOrEqual(4.5);
  });

  it('keeps status colours readable on surfaces', () => {
    expect(contrast(color(tokens, '--color-success'), color(tokens, '--color-surface'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color(tokens, '--color-warning'), color(tokens, '--color-surface'))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color(tokens, '--color-danger'), color(tokens, '--color-surface'))).toBeGreaterThanOrEqual(4.5);
  });
});

it('defines the same colour roles in both themes', () => {
  const lightRoles = Object.keys(light).filter((key) => key.startsWith('--color-')).sort();
  const darkRoles = Object.keys(dark).filter((key) => key.startsWith('--color-')).sort();
  expect(darkRoles).toEqual(lightRoles);
});

it('keeps spacing on a 4px grid and in ascending order', () => {
  const steps = Object.entries(light)
    .filter(([name]) => name.startsWith('--space-'))
    .map(([, value]) => Number.parseInt(value, 10));

  expect(steps.length).toBeGreaterThanOrEqual(6);
  expect(steps.every((value) => value % 4 === 0)).toBe(true);
  expect(steps).toEqual([...steps].sort((a, b) => a - b));
});
