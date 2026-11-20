'use client';

import { useRef } from 'react';
import { coverTargetSize } from '@/lib/course-cover';
import styles from './studio.module.css';

/**
 * Re-encode a picked cover in the browser: draw it inside the cover box and store it as WebP.
 * A phone then downloads a small picture instead of a multi-hundred-KB JPEG, with no image work
 * in the request path. Returns null when the file is not a decodable image or the browser cannot
 * encode WebP, so the original upload still goes through and the server's checks stay in charge.
 */
async function prepareCover(file: File): Promise<File | null> {
  if (typeof createImageBitmap !== 'function') return null;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return null;
  }
  try {
    const size = coverTargetSize(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, size.width, size.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.85));
    // Safari can answer with a PNG when it cannot encode; that keeps the uploaded file.
    if (!blob || blob.type !== 'image/webp') return null;
    return new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'cover'}.webp`, { type: 'image/webp' });
  } finally {
    bitmap.close();
  }
}

/** The course cover file field, which prepares the chosen picture before the form submits it. */
export function CoverField({ label, hint }: { label: string; hint: string }) {
  const input = useRef<HTMLInputElement>(null);

  async function pick() {
    const field = input.current;
    const file = field?.files?.[0];
    if (!field || !file) return;
    const prepared = await prepareCover(file);
    if (!prepared || !field.isConnected) return;
    // Replace the input's own file list, so the ordinary form submit carries the WebP.
    const transfer = new DataTransfer();
    transfer.items.add(prepared);
    field.files = transfer.files;
  }

  return (
    <div className={styles.fileField}>
      <label className={styles.fileLabel} htmlFor="course-cover">
        {label}
      </label>
      <input
        ref={input}
        id="course-cover"
        name="cover"
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className={styles.file}
        onChange={() => void pick()}
      />
      <p className={styles.meta}>{hint}</p>
    </div>
  );
}
