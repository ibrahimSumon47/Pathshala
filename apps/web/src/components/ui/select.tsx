import type { SelectHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';
import styles from './select.module.css';

type SelectOption = { value: string; label: string };

export type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id' | 'children'> & {
  id: string;
  label: string;
  options: readonly SelectOption[];
  hint?: string;
  error?: string;
};

/**
 * Native select for short option lists. Native wins on mobile and keeps keyboard and
 * screen-reader behaviour for free; richer pickers can replace it later where needed.
 */
export function Select({ id, label, options, hint, error, className, ...rest }: SelectProps) {
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(' ');

  return (
    <div className={cn(styles.field, className)}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={cn(styles.select, error ? styles.invalid : undefined)}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy || undefined}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint ? (
        <p className={styles.hint} id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
      {error ? (
        <p className={styles.error} id={`${id}-error`} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
