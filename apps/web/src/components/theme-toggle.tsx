'use client';

import { useTranslations } from 'next-intl';
import { useSyncExternalStore } from 'react';
import styles from './theme-toggle.module.css';

type Theme = 'light' | 'dark';

// The document is the source of truth, so a custom event is enough to notify React.
const THEME_EVENT = 'pathshala:theme';

/** Sun icon, drawn small and decorative. */
function SunIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

/** Moon icon, drawn small and decorative. */
function MoonIcon() {
  return (
    <svg aria-hidden="true" focusable="false" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  );
}

/** Listen for theme changes made in this tab. */
function subscribe(onChange: () => void) {
  window.addEventListener(THEME_EVENT, onChange);
  return () => window.removeEventListener(THEME_EVENT, onChange);
}

/** Read the theme the boot script already applied to the document. */
function readTheme(): Theme {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/** The server cannot see the stored preference, so it assumes the light default. */
function readServerTheme(): Theme {
  return 'light';
}

/** Lets the reader flip the theme; the choice is stored locally for the next visit. */
export function ThemeToggle() {
  const t = useTranslations('Theme');
  const theme = useSyncExternalStore(subscribe, readTheme, readServerTheme);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem('pathshala-theme', next);
    window.dispatchEvent(new Event(THEME_EVENT));
  }

  return (
    <button
      type="button"
      className={styles.button}
      onClick={toggle}
      aria-label={t('toggle')}
      aria-pressed={theme === 'dark'}
      title={theme === 'dark' ? t('light') : t('dark')}
    >
      {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
    </button>
  );
}
