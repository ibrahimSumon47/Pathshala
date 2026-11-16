import type { CoursesRepository, PublishedCourse } from './courses.repository.js';

/** Application logic for the catalogue; the repository decides where the data lives. */
export class CoursesService {
  constructor(private readonly repository: CoursesRepository) {}

  listPublished(limit: number): Promise<PublishedCourse[]> {
    return this.repository.listPublished(limit);
  }
}
