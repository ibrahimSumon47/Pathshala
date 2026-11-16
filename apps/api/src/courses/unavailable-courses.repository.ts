import { ServiceUnavailableException } from '@nestjs/common';
import type { CoursesRepository, PublishedCourse } from './courses.repository.js';

/**
 * Used until MONGODB_URI is configured. Returning an empty list would look like a
 * healthy catalogue with no courses, so the API reports the real state instead.
 */
export class UnavailableCoursesRepository implements CoursesRepository {
  async listPublished(_limit: number): Promise<PublishedCourse[]> {
    throw new ServiceUnavailableException({
      code: 'database_unavailable',
      message: 'The course catalogue is not available until the database is configured.',
    });
  }
}
