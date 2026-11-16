import { describe, expect, it } from 'vitest';
import { validateAttachment } from './attachments';

const valid = {
  name: 'Worksheet',
  url: 'https://files.example.com/worksheet.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
};

describe('validateAttachment', () => {
  it('accepts a safe https attachment in an allowed format', () => {
    expect(validateAttachment(valid)).toEqual({ ok: true, value: valid });
  });

  it.each([
    [{ ...valid, url: 'http://files.example.com/a.pdf' }, 'https'],
    [{ ...valid, mimeType: 'text/html' }, 'type'],
    [{ ...valid, sizeBytes: 0 }, 'between'],
    [{ ...valid, name: '  ' }, 'Name'],
  ])('rejects unsafe metadata', (input, error) => {
    const result = validateAttachment(input);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(error);
  });
});
