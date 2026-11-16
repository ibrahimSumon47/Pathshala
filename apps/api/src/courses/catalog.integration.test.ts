import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Category, Course, User, connectToDatabase, disconnectFromDatabase } from '@pathshala/db';
import { MongoCoursesRepository } from './mongo-courses.repository.js';
import { CoursesService } from './courses.service.js';

let mongo: MongoMemoryServer;
let service: CoursesService;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectToDatabase();
  await Promise.all([Category.init(), Course.init(), User.init()]);

  const instructor = await User.create({
    name: 'Teacher',
    email: 'teacher@example.com',
    roles: ['instructor'],
    locale: 'bn',
  });
  const programming = await Category.create({ name: { bn: 'প্রোগ্রামিং', en: 'Programming' }, slug: 'programming' });
  const music = await Category.create({ name: { bn: 'সংগীত', en: 'Music' }, slug: 'music' });

  await Course.create([
    {
      title: { bn: 'জাভাস্ক্রিপ্ট', en: 'JavaScript basics' },
      slug: 'javascript-basics',
      category: programming._id,
      instructor: instructor._id,
      language: 'bn',
      level: 'beginner',
      pricePaisa: 0,
      status: 'published',
      publishedAt: new Date(),
    },
    {
      title: { bn: 'হারমোনিয়াম', en: 'Harmonium' },
      slug: 'harmonium',
      category: music._id,
      instructor: instructor._id,
      language: 'bn',
      level: 'beginner',
      pricePaisa: 100000,
      status: 'published',
      publishedAt: new Date(),
    },
    {
      title: { bn: 'খসড়া', en: 'A draft' },
      slug: 'draft-course',
      category: music._id,
      instructor: instructor._id,
      language: 'en',
      level: 'advanced',
      pricePaisa: 50000,
      status: 'draft',
    },
  ]);

  service = new CoursesService(new MongoCoursesRepository());
});

afterAll(async () => {
  await disconnectFromDatabase();
  await mongo?.stop();
});

describe('catalogue against an in-memory MongoDB', () => {
  it('returns only published courses and the requested page size', async () => {
    const page = await service.listPublished({ page: 1, limit: 1, price: 'all' });
    expect(page.total).toBe(2);
    expect(page.courses).toHaveLength(1);
    expect(page.pageCount).toBe(2);
    expect(page.courses[0]?.slug).toBeDefined();
    expect(page.courses.some((course) => course.slug === 'draft-course')).toBe(false);
  });

  it('filters by category, language, level and price', async () => {
    const free = await service.listPublished({ page: 1, limit: 20, price: 'free' });
    expect(free.courses.map((course) => course.slug)).toEqual(['javascript-basics']);

    const music = await service.listPublished({ page: 1, limit: 20, price: 'paid', category: 'music' });
    expect(music.courses.map((course) => course.slug)).toEqual(['harmonium']);

    const advanced = await service.listPublished({ page: 1, limit: 20, price: 'all', level: 'advanced' });
    expect(advanced.total).toBe(0);
  });

  it('searches both language fields and returns a full course detail', async () => {
    const found = await service.listPublished({ page: 1, limit: 20, price: 'all', q: 'JavaScript' });
    expect(found.courses.map((course) => course.slug)).toContain('javascript-basics');

    const detail = await service.getBySlug('javascript-basics');
    expect(detail?.title.en).toBe('JavaScript basics');
    expect(detail?.sections).toEqual([]);
  });
});
