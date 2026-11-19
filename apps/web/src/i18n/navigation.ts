import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/**
 * Locale-aware wrappers around the Next.js navigation APIs. Components import these
 * instead of `next/link` so a link written as `/courses` works in both languages.
 */
const navigation = createNavigation(routing);

/** Components import these locale-aware wrappers instead of the bare Next.js ones. */
export const { Link, usePathname, useRouter } = navigation;
