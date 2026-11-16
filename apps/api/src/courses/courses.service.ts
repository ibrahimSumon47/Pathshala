import type { CatalogPage, CourseDetail } from '@pathshala/db';
import type { CoursesQuery } from './courses-query.schema.js';
import type { CoursesRepository } from './courses.repository.js';

/** Application logic for the catalogue; the repository decides where the data lives. */
export class CoursesService {
  constructor(private readonly repository: CoursesRepository) {}

  listPublished(query: CoursesQuery): Promise<CatalogPage> {
    return this.repository.listPublished(query);
  }

  getBySlug(slug: string): Promise<CourseDetail | null> {
    return this.repository.getBySlug(slug);
  }
}
