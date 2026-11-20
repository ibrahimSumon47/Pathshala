/**
 * Seeded covers ship two WebP twins beside the JPEG, so a phone fetches roughly a third of the
 * bytes. Uploaded media is served from `/api/media/<id>` and is not a `/images/courses/*.jpg`
 * path, so it keeps its single file.
 */
export type CoverSources = { phone: string; full: string };

/** Map a seeded cover JPEG to the WebP twins that sit beside it, or null for anything else. */
export function coverSources(url: string): CoverSources | null {
  const match = /^\/images\/courses\/([a-z0-9-]+)\.jpg$/.exec(url);
  if (!match) return null;
  const base = `/images/courses/${match[1]}`;
  return { phone: `${base}-1024.webp`, full: `${base}.webp` };
}

/** The longest edge a stored cover needs: the hero is 1280 px wide, so this covers a 2x screen. */
export const COVER_MAX_EDGE = 1392;

/** Fit a picture inside the cover box without ever enlarging a smaller one. */
export function coverTargetSize(width: number, height: number): { width: number; height: number } {
  const longest = Math.max(width, height, 1);
  const scale = Math.min(1, COVER_MAX_EDGE / longest);
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}
