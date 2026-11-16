import sanitizeHtml from 'sanitize-html';

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ['p', 'br', 'strong', 'em', 'u', 's', 'ul', 'ol', 'li', 'h2', 'h3', 'blockquote', 'code', 'pre', 'a'],
  allowedAttributes: { a: ['href', 'title', 'rel'] },
  allowedSchemes: ['https', 'mailto'],
  disallowedTagsMode: 'discard',
  transformTags: {
    a: (tagName, attributes) => ({
      tagName,
      attribs: { ...attributes, rel: 'noopener noreferrer' },
    }),
  },
};

/** Lesson bodies are rich text, so the server strips scripts, styles and unsafe links. */
export function sanitizeLessonHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS).trim();
}
