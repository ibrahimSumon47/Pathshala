export const THEME_COOKIE = 'pathshala-theme';

export type Theme = 'light' | 'dark';

/** Only an explicit `dark` cookie switches the theme; everything else is the light default. */
export function normalizeTheme(value: string | undefined): Theme {
  return value === 'dark' ? 'dark' : 'light';
}
