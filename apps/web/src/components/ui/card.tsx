import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './card.module.css';

export type CardProps = {
  children: ReactNode;
  className?: string | undefined;
};

/** Quiet surface for grouped content. No shadow by default: the border does the work. */
export function Card({ children, className }: CardProps) {
  return <div className={cn(styles.card, className)}>{children}</div>;
}
