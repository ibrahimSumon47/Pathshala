/** Whole-number course progress, clamped to 0–100 and safe for an empty course. */
export function calculateProgress(completed: number, total: number): number {
  if (!Number.isFinite(completed) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((completed / total) * 100)));
}
