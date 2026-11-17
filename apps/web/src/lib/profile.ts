import { z } from 'zod';

/**
 * Bilingual profile prose. Empty fields are allowed on purpose: a reader may write only one
 * language and the page falls back to the other side.
 */
export const profileDetailsSchema = z.object({
  name: z.string().trim().min(2, 'Write your name.').max(80),
  headlineBn: z.string().trim().max(120, 'Keep the headline under 120 characters.').default(''),
  headlineEn: z.string().trim().max(120, 'Keep the headline under 120 characters.').default(''),
  bioBn: z.string().trim().max(600, 'Keep the introduction under 600 characters.').default(''),
  bioEn: z.string().trim().max(600, 'Keep the introduction under 600 characters.').default(''),
});

export type ProfileDetails = z.infer<typeof profileDetailsSchema>;

/** Two letters for an avatar without a photo; works for Bangla names as well as Latin ones. */
export function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]!.slice(0, 1)}${words[1]!.slice(0, 1)}`.toUpperCase();
}
