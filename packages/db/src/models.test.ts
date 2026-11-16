import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { ATTACHMENT_MIME_TYPES } from './common';
import { Category } from './models/category';
import { Course } from './models/course';
import { Enrolment } from './models/enrolment';
import { Lesson } from './models/lesson';
import { Order } from './models/order';
import { Section } from './models/section';
import { User } from './models/user';

const ids = {
  category: new Types.ObjectId(),
  instructor: new Types.ObjectId(),
  course: new Types.ObjectId(),
  section: new Types.ObjectId(),
  student: new Types.ObjectId(),
};

/**
 * Validate without a database connection and return the field errors, if any.
 * Mongoose 9 deprecates validateSync, so the tests use the async API that will remain.
 */
async function validationErrors(document: { validate: () => Promise<unknown> }): Promise<Record<string, unknown> | null> {
  try {
    await document.validate();
    return null;
  } catch (error) {
    // Mongoose attaches field errors to its ValidationError; only that shape is needed here.
    const validationError = error as { errors?: Record<string, unknown> };
    return validationError.errors ?? {};
  }
}

/** Build a course with valid defaults so each test can vary one field. */
function buildCourse(overrides: Record<string, unknown> = {}) {
  return new Course({
    title: { bn: 'হাতেখড়ি', en: 'First steps' },
    slug: 'first-steps',
    category: ids.category,
    instructor: ids.instructor,
    language: 'bn',
    level: 'beginner',
    pricePaisa: 120_000,
    status: 'draft',
    ...overrides,
  });
}

/** Find one schema index by its key shape. */
function findIndex(schema: { indexes: () => Array<[Record<string, unknown>, Record<string, unknown>]> }, keys: string[]) {
  return schema.indexes().find(([fields]) => Object.keys(fields).join(',') === keys.join(','));
}

describe('User', () => {
  it('accepts a student with the Bangla locale by default', async () => {
    const user = new User({ name: 'সুমন', email: 'Student@Example.com' });
    expect(await validationErrors(user)).toBeNull();
    expect(user.roles).toEqual(['student']);
    expect(user.locale).toBe('bn');
    expect(user.email).toBe('student@example.com');
  });

  it('rejects unknown roles', async () => {
    const errors = await validationErrors(new User({ name: 'সুমন', email: 'a@example.com', roles: ['owner'] }));
    expect(errors?.['roles.0']).toBeDefined();
  });

  it('keeps email unique', () => {
    const uniqueIndex = User.schema.indexes().find(([fields]) => fields.email === 1);
    expect(uniqueIndex?.[1]?.unique).toBe(true);
  });
});

describe('Category', () => {
  it('requires a bilingual name and a clean slug', async () => {
    const good = new Category({ name: { bn: 'প্রোগ্রামিং', en: 'Programming' }, slug: 'programming' });
    expect(await validationErrors(good)).toBeNull();

    const errors = await validationErrors(new Category({ name: {}, slug: 'Not A Slug' }));
    expect(errors?.name).toBeDefined();
    expect(errors?.slug).toBeDefined();
  });
});

describe('Course', () => {
  it('accepts a course authored in one language', async () => {
    expect(await validationErrors(buildCourse({ title: { bn: 'শুধু বাংলা' } }))).toBeNull();
  });

  it('rejects an empty title', async () => {
    const errors = await validationErrors(buildCourse({ title: {} }));
    expect(errors?.title).toBeDefined();
  });

  it('rejects fractional paisa', async () => {
    const errors = await validationErrors(buildCourse({ pricePaisa: 120_000.5 }));
    expect(errors?.pricePaisa).toBeDefined();
  });

  it('rejects an unknown status', async () => {
    const errors = await validationErrors(buildCourse({ status: 'live' }));
    expect(errors?.status).toBeDefined();
  });

  it('indexes the catalogue query and both language titles', () => {
    const keys = Course.schema.indexes().map(([fields]) => Object.keys(fields).join(','));
    expect(keys).toContain('status,category,language,level,publishedAt');
    expect(keys).toContain('title.bn,title.en,subtitle.bn,subtitle.en');
  });
});

describe('Section and Lesson', () => {
  it('keeps section order unique inside a course', () => {
    const index = findIndex(Section.schema, ['course', 'order']);
    expect(index?.[1]?.unique).toBe(true);
  });

  it('keeps lesson order unique inside a section', () => {
    const index = findIndex(Lesson.schema, ['course', 'section', 'order']);
    expect(index?.[1]?.unique).toBe(true);
  });

  it('stores attachments without accepting arbitrary mime types', async () => {
    const base = {
      course: ids.course,
      section: ids.section,
      title: { en: 'Reading' },
      order: 0,
    };

    const good = new Lesson({
      ...base,
      content: {
        bodyHtml: '<p>Hello</p>',
        attachments: [
          { name: 'notes.pdf', url: 'https://example.com/notes.pdf', mimeType: 'application/pdf', sizeBytes: 2048 },
        ],
      },
    });
    expect(await validationErrors(good)).toBeNull();

    const errors = await validationErrors(
      new Lesson({
        ...base,
        content: {
          attachments: [{ name: 'page.html', url: 'https://example.com/page.html', mimeType: 'text/html', sizeBytes: 10 }],
        },
      }),
    );
    expect(errors?.['content.attachments.0.mimeType']).toBeDefined();
    expect(ATTACHMENT_MIME_TYPES).toContain('application/pdf');
  });

  it('leaves the video slot ready but empty by default', async () => {
    const lesson = new Lesson({ course: ids.course, section: ids.section, title: { en: 'Intro' }, order: 1 });
    expect(await validationErrors(lesson)).toBeNull();
    expect(lesson.video).toBeNull();
  });
});

describe('Enrolment', () => {
  it('allows one enrolment per student per course', () => {
    const index = Enrolment.schema.indexes().find(([fields]) => fields.student === 1 && fields.course === 1);
    expect(index?.[1]?.unique).toBe(true);
  });

  it('rejects fractional or out-of-range progress', async () => {
    const base = { student: ids.student, course: ids.course };
    const fractional = await validationErrors(new Enrolment({ ...base, progressPercent: 12.5 }));
    expect(fractional?.progressPercent).toBeDefined();

    const outOfRange = await validationErrors(new Enrolment({ ...base, progressPercent: 120 }));
    expect(outOfRange?.progressPercent).toBeDefined();
  });
});

describe('Order', () => {
  it('requires an idempotency key and keeps it unique', async () => {
    const index = Order.schema.indexes().find(([fields]) => fields.idempotencyKey === 1);
    expect(index?.[1]?.unique).toBe(true);

    const errors = await validationErrors(
      new Order({
        user: ids.student,
        course: ids.course,
        instructor: ids.instructor,
        orderNumber: 'PS-20261116-AAAAAAAA',
        courseSlug: 'javascript-first-steps',
        courseTitle: { bn: 'জাভাস্ক্রিপ্ট', en: 'JavaScript' },
        amountPaisa: 120_000,
        totalPaisa: 120_000,
        provider: 'paybridge',
        status: 'pending',
      }),
    );
    expect(errors?.idempotencyKey).toBeDefined();
  });

  it('accepts both payment rails and BDT only', async () => {
    const base = {
      user: ids.student,
      course: ids.course,
      instructor: ids.instructor,
      orderNumber: 'PS-20261116-BBBBBBBB',
      courseSlug: 'javascript-first-steps',
      courseTitle: { bn: 'জাভাস্ক্রিপ্ট', en: 'JavaScript' },
      amountPaisa: 120_000,
      discountPaisa: 0,
      totalPaisa: 120_000,
      idempotencyKey: 'checkout-1',
      status: 'paid',
    };
    expect(await validationErrors(new Order({ ...base, provider: 'stripe' }))).toBeNull();
    expect(await validationErrors(new Order({ ...base, provider: 'paybridge' }))).toBeNull();

    const wrongCurrency = await validationErrors(
      new Order({ ...base, idempotencyKey: 'checkout-2', provider: 'stripe', currency: 'USD' }),
    );
    expect(wrongCurrency?.currency).toBeDefined();
  });
});
