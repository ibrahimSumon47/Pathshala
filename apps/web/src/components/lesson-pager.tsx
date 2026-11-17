'use client';

import { Link, useRouter } from '@/i18n/navigation';
import { useEffect } from 'react';
import styles from './lesson-pager.module.css';

type LessonLink = { href: string; label: string };

type LessonPagerProps = {
  previous: LessonLink | null;
  next: LessonLink | null;
  hint: string;
};

/** Previous/next lesson links plus Alt+←/→ so a reader can move without the sidebar. */
export function LessonPager({ previous, next, hint }: LessonPagerProps) {
  const router = useRouter();

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (!event.altKey || event.metaKey || event.ctrlKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === 'ArrowLeft' && previous) {
        event.preventDefault();
        router.push(previous.href);
      }
      if (event.key === 'ArrowRight' && next) {
        event.preventDefault();
        router.push(next.href);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, previous, router]);

  if (!previous && !next) return null;

  return (
    <nav className={styles.pager} aria-label={hint}>
      <p className={styles.hint}>{hint}</p>
      <div className={styles.links}>
        {previous ? (
          <Link href={previous.href} className={styles.link}>
            <span aria-hidden="true">←</span>
            <span>{previous.label}</span>
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link href={next.href} className={`${styles.link} ${styles.next}`}>
            <span>{next.label}</span>
            <span aria-hidden="true">→</span>
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
