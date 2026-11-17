'use client';

import { Link } from '@/i18n/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import styles from './command-palette.module.css';

export type PaletteItem = { label: string; href: string };

type CourseResult = {
  slug: string;
  title: { bn?: string; en?: string };
  pricePaisa: number;
  instructor: string;
};

type CommandPaletteProps = {
  items: PaletteItem[];
};

/** One keyboard door into courses and account pages. No dependency, no global state. */
export function CommandPalette({ items }: CommandPaletteProps) {
  const t = useTranslations('Search');
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [courses, setCourses] = useState<CourseResult[]>([]);
  const [loading, setLoading] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const dialog = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((current) => !current);
      }
      if (event.key === 'Escape') setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const frame = requestAnimationFrame(() => input.current?.focus());
    return () => {
      cancelAnimationFrame(frame);
      document.body.style.overflow = '';
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    // Nothing to fetch below two characters; the previous request is aborted by cleanup.
    if (trimmed.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { signal: controller.signal });
        if (!response.ok) throw new Error('Search failed');
        const data = (await response.json()) as { courses?: CourseResult[] };
        setCourses(data.courses ?? []);
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setCourses([]);
      } finally {
        setLoading(false);
      }
    }, 160);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [open, query]);

  function close() {
    setOpen(false);
    setQuery('');
    trigger.current?.focus();
  }

  /** Keep Tab inside the dialog while it is modal. */
  function trapFocus(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'Tab') return;
    const focusable = [
      ...(dialog.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled])') ?? []),
    ];
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  }

  function moveFocus(event: React.KeyboardEvent, direction: 1 | -1) {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const links = [...(dialog.current?.querySelectorAll<HTMLAnchorElement>('a[data-palette-result]') ?? [])];
    if (links.length === 0) return;
    const index = links.indexOf(document.activeElement as HTMLAnchorElement);
    if (index === -1) {
      links[direction === 1 ? 0 : links.length - 1]?.focus();
      return;
    }
    links[(index + direction + links.length) % links.length]?.focus();
  }

  const searching = query.trim().length >= 2;
  const visibleItems = items.filter((item) => !searching || item.label.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <>
      <button
        ref={trigger}
        type="button"
        className={styles.trigger}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
      >
        <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.6-3.6" />
        </svg>
        <span className={styles.triggerLabel}>{t('label')}</span>
        <kbd className={styles.key}>⌘K</kbd>
      </button>

      {open ? (
        <div
          className={styles.overlay}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            ref={dialog}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="palette-title"
            onKeyDown={trapFocus}
          >
            <h2 id="palette-title" className={styles.srOnly}>
              {t('open')}
            </h2>
            <div className={styles.field}>
              <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.6-3.6" />
              </svg>
              <input
                ref={input}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Escape') close();
                  if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    const first = dialog.current?.querySelector<HTMLAnchorElement>('a[data-palette-result]');
                    first?.focus();
                  }
                }}
                placeholder={t('placeholder')}
                aria-label={t('placeholder')}
                autoComplete="off"
              />
              <kbd className={styles.key}>Esc</kbd>
              <button type="button" className={styles.close} onClick={close} aria-label={t('close')}>
                <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <div className={styles.body} onKeyDown={(event) => moveFocus(event, event.key === 'ArrowUp' ? -1 : 1)}>
              {searching ? (
                <p className={styles.groupLabel}>{loading ? t('searching') : t('courses')}</p>
              ) : null}
              {courses.length > 0 ? (
                <ul className={styles.list}>
                  {courses.map((course) => (
                    <li key={course.slug}>
                      <Link
                        href={`/courses/${course.slug}`}
                        data-palette-result
                        className={styles.result}
                        onClick={close}
                      >
                        <span>{course.title[locale === 'en' ? 'en' : 'bn'] ?? course.title.en ?? course.title.bn}</span>
                        <small>{course.instructor}</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
              {searching && !loading && courses.length === 0 ? <p className={styles.empty}>{t('empty')}</p> : null}

              {visibleItems.length > 0 ? (
                <>
                  <p className={styles.groupLabel}>{searching ? t('pages') : t('jumpTo')}</p>
                  <ul className={styles.list}>
                    {visibleItems.map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          data-palette-result
                          className={styles.result}
                          onClick={close}
                        >
                          <span>{item.label}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
            <p className={styles.hint}>{t('hint')}</p>
          </div>
        </div>
      ) : null}
    </>
  );
}
