import { describe, expect, it } from 'vitest';
import { buildCsv, csvCell } from './csv';

describe('csvCell', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line\nbreak')).toBe('"line\nbreak"');
  });

  it('neutralises formula injection without losing the original text', () => {
    expect(csvCell('=HYPERLINK("http://evil")')).toBe('"\'=HYPERLINK(""http://evil"")"');
    expect(csvCell('+1+1')).toBe('"\'+1+1"');
    expect(csvCell('-2')).toBe('"\'-2"');
    expect(csvCell('@SUM(A1)')).toBe('"\'@SUM(A1)"');
  });
});

describe('buildCsv', () => {
  it('writes a fixed header and CRLF rows', () => {
    const csv = buildCsv(['action', 'actor'], [{ action: 'course.status', actor: 'Sumon' }]);
    expect(csv).toBe('\u0022action\u0022,\u0022actor\u0022\r\n\u0022course.status\u0022,\u0022Sumon\u0022\r\n');
  });
});
