import { getCourseBySlug, listCatalog, type CatalogPage, type CourseDetail } from '@pathshala/db';
import type { CoursesQuery } from './courses-query.schema.js';
import type { CoursesRepository } from './courses.repository.js';

/** Mongo-backed catalogue. The connection opens lazily on the first request. */
export class MongoCoursesRepository implements CoursesRepository {
  listPublished(query: CoursesQuery): Promise<CatalogPage> {
    return listCatalog({
      ...(query.q ? { q: query.q } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.level ? { level: query.level } : {}),
      ...(query.language ? { language: query.language } : {}),
      price: query.price,
      page: query.page,
      pageSize: query.limit,
    });
  }

  getBySlug(slug: string): Promise<CourseDetail | null> {
    return getCourseBySlug(slug);
  }
}
