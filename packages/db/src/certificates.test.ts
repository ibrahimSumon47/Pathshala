import { describe, expect, it } from 'vitest';
import { certificateNumberFor, generateCertificateCode } from './certificates';

describe('generateCertificateCode', () => {
  it('uses an unambiguous alphabet and a stable length', () => {
    const code = generateCertificateCode();
    expect(code).toMatch(/^[A-HJ-NP-Z2-9]{16}$/);
    expect(code).not.toMatch(/[IO01]/);
  });

  it('does not repeat consecutive codes in practice', () => {
    expect(generateCertificateCode()).not.toBe(generateCertificateCode());
  });
});

describe('certificateNumberFor', () => {
  it('carries the UTC issue year and the code prefix', () => {
    expect(certificateNumberFor(new Date('2026-12-31T23:00:00Z'), 'ABCDEF2345678900')).toBe('PS-2026-ABCDEF');
    expect(certificateNumberFor(new Date('2027-01-01T00:00:00Z'), 'ZZZZZZ2345678900')).toBe('PS-2027-ZZZZZZ');
  });
});
