import { ATTACHMENT_MIME_TYPES, type AttachmentMimeType } from '@pathshala/db';

export type AttachmentInput = {
  name: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
};

export type ValidAttachment = { ok: true; value: { name: string; url: string; mimeType: AttachmentMimeType; sizeBytes: number } };
export type InvalidAttachment = { ok: false; error: string };

/** Upload metadata is validated before it reaches Mongo; files themselves live elsewhere. */
export function validateAttachment(input: AttachmentInput): ValidAttachment | InvalidAttachment {
  const name = input.name.trim();
  const url = input.url.trim();
  if (!name) return { ok: false, error: 'Name the attachment.' };
  if (!url.startsWith('https://')) return { ok: false, error: 'Attachments need an https URL.' };
  if (!ATTACHMENT_MIME_TYPES.includes(input.mimeType as AttachmentMimeType)) {
    return { ok: false, error: 'That attachment type is not allowed.' };
  }
  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes < 1 || input.sizeBytes > 20 * 1024 * 1024) {
    return { ok: false, error: 'Attachments must be between 1 byte and 20 MB.' };
  }
  return {
    ok: true,
    value: { name, url, mimeType: input.mimeType as AttachmentMimeType, sizeBytes: input.sizeBytes },
  };
}
