import { Media, type ImageMime, type MediaKind } from './models/media';
import { connectToDatabase } from './connection';

/** 1.5 MB: small enough that one upload stays well under a serverless request limit. */
export const IMAGE_MAX_BYTES = 1_572_864;

/** A stored image as the rest of the app sees it: an id, a URL and its real type. */
export type StoredImage = { id: string; url: string; mimeType: ImageMime; sizeBytes: number };

/** Why an upload was refused, so the caller can write one honest message. */
export type ImageError = 'empty' | 'too-large' | 'unsupported';

export type SaveImageResult = { ok: true; image: StoredImage } | { ok: false; error: ImageError };

/** The public path an uploaded image is served from; ids are immutable. */
export function imageUrl(id: string): string {
  return `/api/media/${id}`;
}

/**
 * Read the format from the file signature. A browser-declared mime type is only a hint,
 * so refusing an unknown header is what actually keeps a script out of an image slot.
 */
export function sniffImageType(bytes: Uint8Array): ImageMime | null {
  const at = (index: number) => bytes[index] ?? 0;
  if (bytes.length >= 8 && at(0) === 0x89 && at(1) === 0x50 && at(2) === 0x4e && at(3) === 0x47 && at(4) === 0x0d && at(5) === 0x0a && at(6) === 0x1a && at(7) === 0x0a) {
    return 'image/png';
  }
  if (bytes.length >= 3 && at(0) === 0xff && at(1) === 0xd8 && at(2) === 0xff) return 'image/jpeg';
  // WebP is a RIFF container whose fourth chunk field spells WEBP.
  if (
    bytes.length >= 12 &&
    at(0) === 0x52 && at(1) === 0x49 && at(2) === 0x46 && at(3) === 0x46 &&
    at(8) === 0x57 && at(9) === 0x45 && at(10) === 0x42 && at(11) === 0x50
  ) {
    return 'image/webp';
  }
  return null;
}

/** Turn a stored image path back into its id; static paths and remote links return null. */
export function imageIdFromUrl(url: string | null | undefined): string | null {
  const match = /^\/api\/media\/([a-f0-9]{24})$/i.exec(url?.trim() ?? '');
  return match?.[1] ?? null;
}

/** Validate, then store one image for its uploader. */
export async function saveImage(options: {
  ownerId: string;
  kind: MediaKind;
  bytes: Uint8Array;
}): Promise<SaveImageResult> {
  const { ownerId, kind, bytes } = options;
  if (bytes.length === 0) return { ok: false, error: 'empty' };
  if (bytes.length > IMAGE_MAX_BYTES) return { ok: false, error: 'too-large' };
  const mimeType = sniffImageType(bytes);
  if (!mimeType) return { ok: false, error: 'unsupported' };

  await connectToDatabase();
  const document = await Media.create({
    owner: ownerId,
    kind,
    mimeType,
    sizeBytes: bytes.length,
    data: Buffer.from(bytes),
  });
  const id = String(document._id);
  return { ok: true, image: { id, url: imageUrl(id), mimeType, sizeBytes: bytes.length } };
}

/** Read the bytes behind an image URL so the route can stream them. */
export async function getImage(id: string): Promise<{ mimeType: ImageMime; sizeBytes: number; data: Buffer } | null> {
  if (!/^[a-f0-9]{24}$/i.test(id)) return null;
  await connectToDatabase();
  // A hydrated document casts the binary back to a Buffer, which is what a Response wants.
  const document = await Media.findById(id).select('+data mimeType sizeBytes');
  if (!document?.data) return null;
  return {
    mimeType: document.mimeType as ImageMime,
    sizeBytes: document.sizeBytes,
    data: document.data,
  };
}

/**
 * Remove one image, but only for the person who uploaded it. An admin who replaces
 * another teacher's cover leaves the old row behind rather than deleting someone
 * else's upload; the row is small and the catalogue no longer points at it.
 */
export async function deleteImage(options: { id: string; ownerId: string }): Promise<boolean> {
  if (!/^[a-f0-9]{24}$/i.test(options.id) || !/^[a-f0-9]{24}$/i.test(options.ownerId)) return false;
  await connectToDatabase();
  const result = await Media.deleteOne({ _id: options.id, owner: options.ownerId });
  return result.deletedCount === 1;
}

/** How many preview images a course page holds before it stops being a preview. */
export const MAX_COURSE_PREVIEW_IMAGES = 3;
