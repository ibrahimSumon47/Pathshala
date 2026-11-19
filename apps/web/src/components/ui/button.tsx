import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import styles from './button.module.css';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'sm';

type ButtonStyleOptions = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string | undefined;
};

/**
 * Shared class builder. Links need to look like buttons without nesting a <button> inside
 * an anchor, which is invalid and confusing for keyboard users.
 */
export function buttonStyles({ variant = 'primary', size = 'md', className }: ButtonStyleOptions = {}): string {
  return cn(styles.button, styles[variant], styles[size], className);
}

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  children: ReactNode;
};

/** Native button with the shared visual language; defaults to a non-submitting type. */
export function Button({ variant = 'primary', size = 'md', className, children, type = 'button', ...rest }: ButtonProps) {
  return (
    <button type={type} className={buttonStyles({ variant, size, className })} {...rest}>
      {children}
    </button>
  );
}
