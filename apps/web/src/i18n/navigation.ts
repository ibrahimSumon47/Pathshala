import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware wrappers around the Next.js navigation APIs. Components import these
 * instead of `next/link` so a link written as `/courses` works in both languages.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
