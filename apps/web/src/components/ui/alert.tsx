import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './alert.module.css';

type AlertTone = 'success' | 'error' | 'info';

type AlertProps = {
  children: ReactNode;
  tone?: AlertTone;
  className?: string | undefined;
};

/** One-line feedback with a live region, used by forms across the app. */
export function Alert({ children, tone = 'info', className }: AlertProps) {
  return (
    <p className={cn(styles.alert, styles[tone], className)} role={tone === 'error' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
