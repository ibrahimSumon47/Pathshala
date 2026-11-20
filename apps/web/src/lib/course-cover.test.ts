import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { coverSources, coverTargetSize } from './course-cover';

/**
 * The guard for seeded covers: every cover JPEG in the public folder must have both WebP twins
 * beside it, and the course page's <source> must resolve to those same files. A new seeded
 * course that arrives with only a JPEG fails here instead of shipping a 66 KB hero.
 */
const COVER_DIR = new URL('../../public/images/courses/', import.meta.url);

/**
 * Two lesson-body screenshots share the folder but are never the course hero, so they carry no
 * twins. Anything else in the folder that is not listed here has to ship both twins.
 */
const NOT_COVERS = new Set(['javascript-first-steps-editor.jpg', 'javascript-first-steps-exercise.jpg']);

const files = readdirSync(COVER_DIR);
const covers = files.filter((name) => name.endsWith('.jpg') && !NOT_COVERS.has(name)).sort();

/** A real WebP is a RIFF container whose fourth chunk field spells WEBP. */
function isWebp(bytes: Buffer): boolean {
  return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
}

describe('seeded course covers', () => {
  it('finds the cover folder and its covers', () => {
    expect(covers.length).toBe(6);
    expect(files).toContain('javascript-first-steps-editor.jpg');
  });

  it.each(covers)('%s ships a phone and a full WebP twin', (name) => {
    const base = name.replace(/\.jpg$/, '');
    const jpeg = readFileSync(new URL(name, COVER_DIR));
    expect(jpeg.subarray(0, 3)).toEqual(Buffer.from([0xff, 0xd8, 0xff]));

    for (const twin of [`${base}-1024.webp`, `${base}.webp`]) {
      expect(files, `${name} is missing ${twin}`).toContain(twin);
      const bytes = readFileSync(new URL(twin, COVER_DIR));
      expect(isWebp(bytes), `${twin} is not a WebP file`).toBe(true);
      // The twin exists to cut the bytes the hero fetches, so it has to be the smaller file.
      expect(bytes.byteLength, `${twin} is not smaller than ${name}`).toBeLessThan(jpeg.byteLength);
    }
  });

  it.each(covers)('%s resolves through the course page <source>', (name) => {
    const sources = coverSources(`/images/courses/${name}`);
    expect(sources, `${name} does not match the cover pattern`).not.toBeNull();
    const phone = twinsOf(name)[0];
    const full = twinsOf(name)[1];
    expect(sources?.phone).toBe(`/images/courses/${phone}`);
    expect(sources?.full).toBe(`/images/courses/${full}`);
    // Both srcSet entries have to be real files, or the browser falls back to the JPEG.
    for (const twin of [phone, full]) expect(files).toContain(twin);
  });

  it('leaves no WebP twin behind without its JPEG', () => {
    for (const name of files.filter((file) => file.endsWith('.webp'))) {
      const jpeg = `${name.replace(/(?:-1024)?\.webp$/, '')}.jpg`;
      expect(files, `${name} has no ${jpeg}`).toContain(jpeg);
    }
  });
});

describe('coverTargetSize', () => {
  it('caps a large picture at the cover edge and keeps its shape', () => {
    expect(coverTargetSize(4000, 3000)).toEqual({ width: 1392, height: 1044 });
  });

  it('caps by the longest edge, so a tall picture still fits', () => {
    expect(coverTargetSize(1000, 2000)).toEqual({ width: 696, height: 1392 });
  });

  it('never enlarges a picture that is already small', () => {
    expect(coverTargetSize(640, 360)).toEqual({ width: 640, height: 360 });
  });
});

function twinsOf(name: string): [string, string] {
  const base = name.replace(/\.jpg$/, '');
  return [`${base}-1024.webp`, `${base}.webp`];
}
