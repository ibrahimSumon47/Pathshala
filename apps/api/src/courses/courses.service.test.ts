import { describe, expect, it, vi } from 'vitest';
import type { CatalogPage, CourseDetail } from '@pathshala/db';
import type { CoursesRepository } from './courses.repository.js';
import { CoursesService } from './courses.service.js';

const page: CatalogPage = {
  courses: [
    {
      id: '64b7f0f0f0f0f0f0f0f0f0f0',
      slug: 'spoken-english-basics',
      title: { bn: 'ইংরেজি বলার শুরু', en: 'Spoken English Basics' },
      subtitle: null,
      pricePaisa: 120000,
      language: 'bn',
      level: 'beginner',
      ratingAverage: 0,
      ratingCount: 0,
      enrolmentCount: 0,
      categoryName: { bn: 'ইংরেজি', en: 'English' },
      instructorName: 'Teacher',
      thumbnailUrl: null,
      publishedAt: '2026-11-01T00:00:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  pageCount: 1,
};

const repository: CoursesRepository = {
  listPublished: async () => page,
  getBySlug: async () =>
    ({
      ...page.courses[0],
      shortDescription: { bn: 'সংক্ষেপ', en: 'Short description' },
      description: { bn: 'বর্ণনা', en: 'Description' },
      outcomes: [],
      requirements: [],
      audience: [],
      faqs: [],
      instructor: { id: '64b7f0f0f0f0f0f0f0f0f0f1', name: 'Teacher', bio: {}, image: null },
      sections: [],
      previewImageUrls: [],
      promoVideoUrl: null,
      lessonCount: 0,
      totalDurationMinutes: 0,
      ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
      related: [],
      updatedAt: '2026-11-01T00:00:00.000Z',
    }) as CourseDetail,
};

describe('CoursesService', () => {
  it('passes the catalogue query to the repository and returns its page', async () => {
    const listPublished = vi.fn(async () => page);
    const service = new CoursesService({ ...repository, listPublished });

    await expect(service.listPublished({ page: 1, limit: 20, price: 'all' })).resolves.toEqual(page);
    expect(listPublished).toHaveBeenCalledWith({ page: 1, limit: 20, price: 'all' });
  });

  it('returns a course detail by slug', async () => {
    await expect(new CoursesService(repository).getBySlug('spoken-english-basics')).resolves.toMatchObject({
      slug: 'spoken-english-basics',
    });
  });

  it('propagates repository failures instead of hiding them', async () => {
    const failure = new Error('database down');
    const service = new CoursesService({
      listPublished: async () => {
        throw failure;
      },
      getBySlug: async () => null,
    });

    await expect(service.listPublished({ page: 1, limit: 10, price: 'all' })).rejects.toBe(failure);
  });
});
