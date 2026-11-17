import type { CourseFaq, LocalizedText } from '@pathshala/db';

/** Course pages promise six to eight outcomes; the editor enforces the same window. */
export const MIN_OUTCOMES = 6;
export const MAX_OUTCOMES = 8;
const MAX_FAQ = 6;
const LINE_LIMIT = 200;

/**
 * One item per line, so an instructor can paste a list without learning a markup language.
 * Blank lines disappear, which makes trailing newlines harmless.
 */
export function linesToList(value: string, limit = 20): string[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .slice(0, limit)
    .map((line) => line.slice(0, LINE_LIMIT));
}

/** Render a stored list back into the textarea without losing the other language. */
export function listToLines(items: LocalizedText[] | undefined, locale: 'bn' | 'en'): string {
  return (items ?? [])
    .map((item) => item[locale] ?? '')
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * Merge the two language columns by position. A line that exists only in one language keeps
 * the other side empty, so the page falls back to the language that was written.
 */
export function mergeLocalized(bn: string, en: string, limit = 20): LocalizedText[] {
  const bnLines = linesToList(bn, limit);
  const enLines = linesToList(en, limit);
  const count = Math.max(bnLines.length, enLines.length);
  const merged: LocalizedText[] = [];
  for (let index = 0; index < count; index += 1) {
    const item: LocalizedText = {};
    const bnLine = bnLines[index];
    const enLine = enLines[index];
    if (bnLine) item.bn = bnLine;
    if (enLine) item.en = enLine;
    if (bnLine || enLine) merged.push(item);
  }
  return merged;
}

/** FAQ rows are written as `Question | Answer`, one pair per line. */
export function parseFaqLines(value: string): CourseFaq[] {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.includes('|'))
    .slice(0, MAX_FAQ)
    .flatMap((line) => {
      const [question, ...rest] = line.split('|');
      const answer = rest.join('|').trim();
      if (!question?.trim() || !answer) return [];
      return [{ question: { en: question.trim().slice(0, 200) }, answer: { en: answer.slice(0, 2000) } }];
    });
}

/** Merge the two FAQ textareas by position, matching how the list fields behave. */
export function mergeFaqs(bn: string, en: string): CourseFaq[] {
  const bnRows = parseFaqLines(bn);
  const enRows = parseFaqLines(en);
  const count = Math.max(bnRows.length, enRows.length);
  const merged: CourseFaq[] = [];
  for (let index = 0; index < count; index += 1) {
    const bnRow = bnRows[index];
    const enRow = enRows[index];
    const faq: CourseFaq = { question: {}, answer: {} };
    if (bnRow?.question.en) faq.question.bn = bnRow.question.en;
    if (enRow?.question.en) faq.question.en = enRow.question.en;
    if (bnRow?.answer.en) faq.answer.bn = bnRow.answer.en;
    if (enRow?.answer.en) faq.answer.en = enRow.answer.en;
    if ((faq.question.bn ?? faq.question.en) && (faq.answer.bn ?? faq.answer.en)) merged.push(faq);
  }
  return merged;
}

/** Render stored FAQs back into the `Question | Answer` textarea for one language. */
export function faqsToLines(faqs: CourseFaq[] | undefined, locale: 'bn' | 'en'): string {
  return (faqs ?? [])
    .map((faq) => {
      const question = faq.question[locale] ?? '';
      const answer = faq.answer[locale] ?? '';
      return question && answer ? `${question} | ${answer}` : '';
    })
    .filter((line) => line.length > 0)
    .join('\n');
}
