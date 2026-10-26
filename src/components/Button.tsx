import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import type { LinkProps } from 'react-router-dom';
import { Link } from '../i18n/Link';

export type ButtonVariant = 'primary' | 'secondary' | 'outline-light' | 'ghost';
export type ButtonSize = 'md' | 'lg';

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-electric-600 text-white shadow-sm shadow-navy-900/10 hover:bg-electric-700 active:bg-electric-700',
  secondary: 'bg-navy-900 text-white hover:bg-navy-700',
  'outline-light': 'border border-white/25 text-white hover:border-white/60 hover:bg-white/5',
  ghost: 'border border-line bg-white text-ink hover:border-slate-300 hover:bg-surface',
};

const sizes: Record<ButtonSize, string> = {
  md: 'h-11 px-5 text-sm',
  lg: 'h-12 px-6 text-[15px]',
};

export const buttonClasses = (variant: ButtonVariant = 'primary', size: ButtonSize = 'md', extra = '') =>
  [
    'inline-flex items-center justify-center gap-2 rounded-full font-semibold whitespace-nowrap',
    'transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    sizes[size],
    extra,
  ].join(' ');

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children: ReactNode;
}

export function Button({
  variant,
  size,
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}: CommonProps & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={buttonClasses(variant, size, className)} {...rest}>
      {children}
      {icon}
    </button>
  );
}

export function ButtonLink({ variant, size, icon, children, className = '', ...rest }: CommonProps & LinkProps) {
  return (
    <Link className={buttonClasses(variant, size, className)} {...rest}>
      {children}
      {icon}
    </Link>
  );
}

export function ButtonAnchor({
  variant,
  size,
  icon,
  children,
  className = '',
  ...rest
}: CommonProps & AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className={buttonClasses(variant, size, className)} {...rest}>
      {children}
      {icon}
    </a>
  );
}
