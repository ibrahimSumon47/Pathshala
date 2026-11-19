import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './badge.module.css';

type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning';

export type BadgeProps = {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string | undefined;
};

/** Small, non-interactive label. Text carries the meaning; colour only reinforces it. */
export function Badge({ children, tone = 'neutral', className }: BadgeProps) {
  return <span className={cn(styles.badge, styles[tone], className)}>{children}</span>;
}
