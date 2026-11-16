import type { CourseDoc } from '@pathshala/db';
import type { CoursesRepository, PublishedCourse } from './courses.repository.js';

type LeanCourse = CourseDoc & { _id: { toString(): string } };

/** Mongo-backed catalogue. The connection is opened lazily on the first request. */
export class MongoCoursesRepository implements CoursesRepository {
  async listPublished(limit: number): Promise<PublishedCourse[]> {
    const { Course, connectToDatabase } = await import('@pathshala/db');
    await connectToDatabase();

    const documents = (await Course.find({ status: 'published' })
      .sort({ publishedAt: -1 })
      .limit(limit)
      .lean()) as unknown as LeanCourse[];

    return documents.map((document) => ({
      id: document._id.toString(),
      slug: document.slug,
      title: { bn: document.title.bn ?? '', en: document.title.en ?? '' },
      subtitle: document.subtitle
        ? { bn: document.subtitle.bn ?? '', en: document.subtitle.en ?? '' }
        : null,
      pricePaisa: document.pricePaisa,
      language: document.language,
      level: document.level,
      ratingAverage: document.ratingAverage,
      enrolmentCount: document.enrolmentCount,
      publishedAt: document.publishedAt?.toISOString() ?? null,
    }));
  }
}
