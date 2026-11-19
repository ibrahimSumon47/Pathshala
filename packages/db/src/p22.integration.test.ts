import { MongoMemoryServer } from 'mongodb-memory-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { getCourseBySlug, listCatalog } from './catalog';
import { connectToDatabase, disconnectFromDatabase } from './connection';
import {
  IMAGE_MAX_BYTES,
  deleteImage,
  getImage,
  imageIdFromUrl,
  imageUrl,
  saveImage,
  sniffImageType,
} from './media';
import { Category } from './models/category';
import { Course } from './models/course';
import { Media } from './models/media';
import { User } from './models/user';

let mongo: MongoMemoryServer;
let instructorId = '';

/** Real file signatures: a PNG header, a JPEG start marker and a WebP RIFF container. */
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]);
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]);

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri();
  await connectToDatabase();
  const instructor = await User.create({
    name: 'Rafiqul Islam',
    email: 'media-teacher@example.com',
    roles: ['instructor'],
  });
  instructorId = String(instructor._id);
});

afterAll(async () => {
  await disconnectFromDatabase();
  await mongo?.stop();
});

describe('uploaded course images', () => {
  it('reads the real format from the bytes', () => {
    expect(sniffImageType(PNG)).toBe('image/png');
    expect(sniffImageType(JPEG)).toBe('image/jpeg');
    expect(sniffImageType(WEBP)).toBe('image/webp');
    // An SVG or an HTML page can carry script, so neither is accepted as an image.
    expect(sniffImageType(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg">'))).toBeNull();
    expect(sniffImageType(new Uint8Array([0x89]))).toBeNull();
  });

  it('refuses empty, oversized and unknown files without storing anything', async () => {
    const empty = await saveImage({ ownerId: instructorId, kind: 'course-cover', bytes: new Uint8Array() });
    expect(empty).toEqual({ ok: false, error: 'empty' });

    const oversized = await saveImage({
      ownerId: instructorId,
      kind: 'course-cover',
      bytes: new Uint8Array(IMAGE_MAX_BYTES + 1),
    });
    expect(oversized).toEqual({ ok: false, error: 'too-large' });

    const text = await saveImage({
      ownerId: instructorId,
      kind: 'course-cover',
      bytes: new TextEncoder().encode('not an image at all'),
    });
    expect(text).toEqual({ ok: false, error: 'unsupported' });

    expect(await Media.countDocuments({ owner: instructorId })).toBe(0);
  });

  it('stores the bytes and serves them back with the sniffed type', async () => {
    const saved = await saveImage({ ownerId: instructorId, kind: 'course-preview', bytes: WEBP });
    if (!saved.ok) throw new Error(`unexpected refusal: ${saved.error}`);
    expect(saved.image.url).toBe(imageUrl(saved.image.id));
    expect(saved.image.mimeType).toBe('image/webp');
    expect(saved.image.sizeBytes).toBe(WEBP.length);

    const stored = await getImage(saved.image.id);
    expect(stored?.mimeType).toBe('image/webp');
    expect(stored?.sizeBytes).toBe(WEBP.length);
    expect(Array.from(stored?.data ?? [])).toEqual(Array.from(WEBP));

    // The bytes are not part of a normal read, so no listing query can leak an image.
    const withoutData = await Media.findById(saved.image.id).lean();
    expect(withoutData?.data).toBeUndefined();
  });

  it('only deletes an image for the person who uploaded it', async () => {
    const saved = await saveImage({ ownerId: instructorId, kind: 'course-cover', bytes: PNG });
    if (!saved.ok) throw new Error(`unexpected refusal: ${saved.error}`);

    expect(await deleteImage({ id: saved.image.id, ownerId: 'not-the-owner' })).toBe(false);
    expect(await getImage(saved.image.id)).not.toBeNull();

    expect(await deleteImage({ id: saved.image.id, ownerId: instructorId })).toBe(true);
    expect(await getImage(saved.image.id)).toBeNull();
    expect(await getImage('not-an-id')).toBeNull();
  });

  it('recognises only its own stored paths', () => {
    const id = '64b7f0c2a1b2c3d4e5f60718';
    expect(imageIdFromUrl(`/api/media/${id}`)).toBe(id);
    expect(imageIdFromUrl('/images/courses/design-with-type.jpg')).toBeNull();
    expect(imageIdFromUrl('https://example.com/photo.jpg')).toBeNull();
    expect(imageIdFromUrl(undefined)).toBeNull();
  });
});

describe('courses carrying pictures', () => {
  it('publishes a cover on the catalogue card and a preview on the course page', async () => {
    const category = await Category.create({
      slug: 'media-subject',
      name: { bn: 'ছবির বিষয়', en: 'Media subject' },
      order: 1,
      isActive: true,
    });
    const cover = await saveImage({ ownerId: instructorId, kind: 'course-cover', bytes: JPEG });
    const preview = await saveImage({ ownerId: instructorId, kind: 'course-preview', bytes: PNG });
    if (!cover.ok || !preview.ok) throw new Error('seed images were refused');

    await Course.create({
      title: { bn: 'ছবি সহ কোর্স', en: 'A course with pictures' },
      slug: 'a-course-with-pictures',
      shortDescription: { bn: 'সংক্ষিপ্ত', en: 'Short' },
      category: category._id,
      instructor: instructorId,
      language: 'en',
      level: 'beginner',
      pricePaisa: 0,
      status: 'published',
      outcomes: [{ en: 'One' }, { en: 'Two' }, { en: 'Three' }, { en: 'Four' }, { en: 'Five' }, { en: 'Six' }],
      thumbnailUrl: cover.image.url,
      previewImageUrls: [preview.image.url],
      promoVideoUrl: 'https://example.com/preview.mp4',
      publishedAt: new Date('2026-11-01T10:00:00Z'),
    });

    const catalogue = await listCatalog({ pageSize: 10 });
    const card = catalogue.courses.find((course) => course.slug === 'a-course-with-pictures');
    expect(card?.thumbnailUrl).toBe(cover.image.url);

    const detail = await getCourseBySlug('a-course-with-pictures');
    expect(detail?.previewImageUrls).toEqual([preview.image.url]);
    expect(detail?.promoVideoUrl).toBe('https://example.com/preview.mp4');
  });

  it('defaults a course without pictures to no images at all', async () => {
    const category = await Category.create({
      slug: 'plain-subject',
      name: { bn: 'সাদা বিষয়', en: 'Plain subject' },
      order: 2,
      isActive: true,
    });
    const course = await Course.create({
      title: { bn: 'সাদা', en: 'Plain' },
      slug: 'plain-course',
      category: category._id,
      instructor: instructorId,
      language: 'en',
      level: 'beginner',
      pricePaisa: 0,
      status: 'published',
    });
    expect(course.previewImageUrls).toEqual([]);
    expect(course.thumbnailUrl).toBeUndefined();
  });
});
