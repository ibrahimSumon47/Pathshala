'use client';

import { Link, usePathname } from '@/i18n/navigation';
import { cn } from '@/lib/cn';
import styles from './site-header.module.css';

export type SiteNavItem = { href: string; label: string };

type SiteNavProps = {
  items: SiteNavItem[];
  label: string;
};

/** Primary navigation with an active pill, kept client-side because the pathname is. */
export function SiteNav({ items, label }: SiteNavProps) {
  const pathname = usePathname();

  return (
    <nav className={styles.nav} aria-label={label}>
      {items.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(styles.navLink, active && styles.navActive)}
            aria-current={active ? 'page' : undefined}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
