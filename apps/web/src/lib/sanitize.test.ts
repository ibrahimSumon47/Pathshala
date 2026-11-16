import { describe, expect, it } from 'vitest';
import { sanitizeLessonHtml } from './sanitize';

describe('sanitizeLessonHtml', () => {
  it('keeps teaching markup', () => {
    const html = '<h2>Variables</h2><p>Use <strong>const</strong>.</p><ul><li>One</li></ul>';
    expect(sanitizeLessonHtml(html)).toBe(html);
  });

  it('drops scripts, event handlers and javascript links', () => {
    const html = '<p onclick="steal()">Hi</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>';
    const clean = sanitizeLessonHtml(html);
    expect(clean).not.toContain('<script');
    expect(clean).not.toContain('onclick');
    expect(clean).not.toContain('javascript:');
  });

  it('adds rel to external links', () => {
    expect(sanitizeLessonHtml('<a href="https://example.com">notes</a>')).toContain('rel="noopener noreferrer"');
  });
});
