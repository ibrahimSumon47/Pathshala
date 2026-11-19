import { withoutControlCharacters } from '@pathshala/db';
import { z } from 'zod';

/** Drop control characters before a query reaches a regular expression. */
const searchText = z
  .string()
  .trim()
  .transform((value) => withoutControlCharacters(value).trim())
  .pipe(z.string().max(80));

/** Catalogue query: bounded text, facet filters and a page size a client cannot exceed. */
export const coursesQuerySchema = z
  .object({
    q: searchText.optional(),
    category: searchText.optional(),
    level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
    language: z.enum(['bn', 'en']).optional(),
    price: z.enum(['all', 'free', 'paid']).default('all'),
    page: z.coerce.number().int().min(1).max(500).default(1),
    limit: z.coerce.number().int().min(1).max(24).default(20),
  })
  .strict();

export const courseSlugSchema = z
  .string()
  .trim()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use a lowercase course slug');

export type CoursesQuery = z.infer<typeof coursesQuerySchema>;
