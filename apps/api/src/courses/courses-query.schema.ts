import { z } from 'zod';

/** Catalogue query: one optional page size, bounded so a client cannot ask for everything. */
export const coursesQuerySchema = z
  .object({
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export type CoursesQuery = z.infer<typeof coursesQuerySchema>;
