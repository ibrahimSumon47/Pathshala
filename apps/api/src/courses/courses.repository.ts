export type LocalizedTitle = { bn: string; en: string };

export type PublishedCourse = {
  id: string;
  slug: string;
  title: LocalizedTitle;
  subtitle: LocalizedTitle | null;
  pricePaisa: number;
  language: 'bn' | 'en';
  level: 'beginner' | 'intermediate' | 'advanced';
  ratingAverage: number;
  enrolmentCount: number;
  publishedAt: string | null;
};

export interface CoursesRepository {
  listPublished(limit: number): Promise<PublishedCourse[]>;
}

export const COURSES_REPOSITORY = Symbol('COURSES_REPOSITORY');
