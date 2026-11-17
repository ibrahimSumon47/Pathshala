import { describe, expect, it } from 'vitest';
import {
  MAX_OUTCOMES,
  faqsToLines,
  linesToList,
  listToLines,
  mergeFaqs,
  mergeLocalized,
  parseFaqLines,
} from './course-content';

describe('course content helpers', () => {
  it('trims lines, drops blanks and survives Windows line endings', () => {
    expect(linesToList('  save the file \r\n\r\nrun it\n')).toEqual(['save the file', 'run it']);
  });

  it('caps a pasted list at the limit so a runaway paste cannot fill the page', () => {
    const pasted = Array.from({ length: MAX_OUTCOMES + 5 }, (_, index) => `outcome ${index + 1}`).join('\n');
    expect(linesToList(pasted, MAX_OUTCOMES)).toHaveLength(MAX_OUTCOMES);
  });

  it('merges the two language columns by position and keeps a one-sided line', () => {
    const merged = mergeLocalized('এক\nদুই', 'One');
    expect(merged).toHaveLength(2);
    expect(merged[0]).toEqual({ bn: 'এক', en: 'One' });
    expect(merged[1]).toEqual({ bn: 'দুই' });
  });

  it('renders only the requested language back into the textarea', () => {
    const items = [{ bn: 'এক', en: 'One' }, { bn: 'দুই' }];
    expect(listToLines(items, 'en')).toBe('One');
    expect(listToLines(items, 'bn')).toBe('এক\nদুই');
  });

  it('parses FAQ pairs and keeps a pipe inside the answer', () => {
    expect(parseFaqLines('Can I pay later? | Yes | with a coupon')).toEqual([
      { question: { en: 'Can I pay later?' }, answer: { en: 'Yes | with a coupon' } },
    ]);
    expect(parseFaqLines('no separator here')).toEqual([]);
  });

  it('merges bilingual FAQs and skips a pair that lost its answer', () => {
    const faqs = mergeFaqs('কোর্স কত দিন? | চার সপ্তাহ', 'How long is it? | Four weeks\nBroken | ');
    expect(faqs).toHaveLength(1);
    expect(faqs[0]).toEqual({
      question: { bn: 'কোর্স কত দিন?', en: 'How long is it?' },
      answer: { bn: 'চার সপ্তাহ', en: 'Four weeks' },
    });
    expect(faqsToLines(faqs, 'en')).toBe('How long is it? | Four weeks');
  });
});
