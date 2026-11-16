import type { CatalogPage, CourseDetail } from '@pathshala/db';
import type { CoursesQuery } from './courses-query.schema.js';

export type { CatalogPage, CourseDetail };

export interface CoursesRepository {
  listPublished(query: CoursesQuery): Promise<CatalogPage>;
  getBySlug(slug: string): Promise<CourseDetail | null>;
}

export const COURSES_REPOSITORY = Symbol('COURSES_REPOSITORY');
