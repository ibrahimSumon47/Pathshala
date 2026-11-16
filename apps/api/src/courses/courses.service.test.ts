import { describe, expect, it, vi } from 'vitest';
import type { CoursesRepository, PublishedCourse } from './courses.repository';
import { CoursesService } from './courses.service';

const course: PublishedCourse = {
  id: '64b7f0f0f0f0f0f0f0f0f0f0',
  slug: 'spoken-english-basics',
  title: { bn: 'ইংরেজি বলার শুরু', en: 'Spoken English Basics' },
  subtitle: null,
  pricePaisa: 120000,
  language: 'bn',
  level: 'beginner',
  ratingAverage: 0,
  enrolmentCount: 0,
  publishedAt: '2026-11-01T00:00:00.000Z',
};

describe('CoursesService', () => {
  it('passes the limit to the repository and returns its rows', async () => {
    const listPublished = vi.fn(async () => [course]);
    const repository: CoursesRepository = { listPublished };
    const service = new CoursesService(repository);

    await expect(service.listPublished(20)).resolves.toEqual([course]);
    expect(listPublished).toHaveBeenCalledWith(20);
  });

  it('propagates repository failures instead of hiding them', async () => {
    const failure = new Error('database down');
    const repository: CoursesRepository = {
      listPublished: async () => {
        throw failure;
      },
    };

    await expect(new CoursesService(repository).listPublished(10)).rejects.toBe(failure);
  });
});
