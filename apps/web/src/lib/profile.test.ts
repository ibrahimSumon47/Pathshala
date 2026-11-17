import { describe, expect, it } from 'vitest';
import { initialsFor, profileDetailsSchema } from './profile';

describe('profileDetailsSchema', () => {
  it('accepts one language and trims the rest', () => {
    const parsed = profileDetailsSchema.parse({
      name: '  Nusrat Jahan  ',
      headlineEn: '  Learning in public  ',
      bioBn: '',
      bioEn: '',
    });
    expect(parsed.name).toBe('Nusrat Jahan');
    expect(parsed.headlineEn).toBe('Learning in public');
    expect(parsed.headlineBn).toBe('');
  });

  it('rejects a missing name and prose past the stored limits', () => {
    expect(profileDetailsSchema.safeParse({ name: 'A' }).success).toBe(false);
    expect(profileDetailsSchema.safeParse({ name: 'Nusrat', headlineEn: 'x'.repeat(121) }).success).toBe(false);
    expect(profileDetailsSchema.safeParse({ name: 'Nusrat', bioBn: 'x'.repeat(601) }).success).toBe(false);
  });

  it('allows a headline-sized Bangla line without counting characters as bytes', () => {
    const line = 'প্রতিদিন ছোট ছোট ধাপে শেখাই';
    expect(profileDetailsSchema.safeParse({ name: 'রফিকুল ইসলাম', headlineBn: line }).success).toBe(true);
  });
});

describe('initialsFor', () => {
  it('takes the first letters of the first two words', () => {
    expect(initialsFor('Nusrat Jahan')).toBe('NJ');
    expect(initialsFor('  rafiqul   islam ')).toBe('RI');
  });

  it('falls back to two letters for one word and a question mark for nothing', () => {
    expect(initialsFor('Pathshala')).toBe('PA');
    expect(initialsFor('   ')).toBe('?');
  });

  it('keeps Bangla letters', () => {
    expect(initialsFor('রফিকুল ইসলাম')).toBe('রই');
  });
});
