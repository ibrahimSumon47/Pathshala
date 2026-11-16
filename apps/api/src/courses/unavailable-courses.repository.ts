import { ServiceUnavailableException } from '@nestjs/common';
import type { CatalogPage, CourseDetail } from '@pathshala/db';
import type { CoursesQuery } from './courses-query.schema.js';
import type { CoursesRepository } from './courses.repository.js';

/**
 * Used until MONGODB_URI is configured. Returning an empty list would look like a
 * healthy catalogue with no courses, so the API reports the real state instead.
 */
export class UnavailableCoursesRepository implements CoursesRepository {
  async listPublished(_query: CoursesQuery): Promise<CatalogPage> {
    throw this.unavailable();
  }

  async getBySlug(_slug: string): Promise<CourseDetail | null> {
    throw this.unavailable();
  }

  private unavailable(): ServiceUnavailableException {
    return new ServiceUnavailableException({
      code: 'database_unavailable',
      message: 'The course catalogue is not available until the database is configured.',
    });
  }
}
