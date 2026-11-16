import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './empty-state.module.css';

export type EmptyStateProps = {
  title: string;
  body: string;
  action?: ReactNode;
  className?: string | undefined;
};

/** Honest empty state: says what is missing and what happens next, with an optional action. */
export function EmptyState({ title, body, action, className }: EmptyStateProps) {
  return (
    <section className={cn(styles.empty, className)}>
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.body}>{body}</p>
      {action ? <div className={styles.action}>{action}</div> : null}
    </section>
  );
}
