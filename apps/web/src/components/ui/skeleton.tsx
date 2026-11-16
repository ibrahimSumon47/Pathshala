import { cn } from '@/lib/cn';
import styles from './skeleton.module.css';

export type SkeletonProps = {
  width?: string;
  height?: string;
  shape?: 'line' | 'block' | 'circle';
  className?: string | undefined;
};

/**
 * Loading placeholder. It is hidden from assistive technology on purpose: a screen reader
 * should hear the loading status from the region that owns it, not a decorative block.
 */
export function Skeleton({ width = '100%', height = '1rem', shape = 'line', className }: SkeletonProps) {
  return <span aria-hidden="true" className={cn(styles.skeleton, styles[shape], className)} style={{ width, height }} />;
}
