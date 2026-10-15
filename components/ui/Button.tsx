import React from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft' | 'outline' | 'danger-soft';
type Size = 'xs' | 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-fg hover:bg-primary-strong shadow-sm shadow-primary/20',
  secondary: 'bg-surface text-fg border border-line hover:bg-sunken hover:border-faint/60 shadow-card',
  outline: 'border border-line text-fg hover:bg-sunken',
  ghost: 'text-muted hover:text-fg hover:bg-sunken',
  soft: 'bg-primary-soft text-primary hover:bg-primary/15',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 shadow-sm shadow-rose-600/20',
  'danger-soft': 'text-rose-600 hover:bg-rose-500/10 dark:text-rose-400',
};

const SIZES: Record<Size, string> = {
  xs: 'h-7 px-2 text-xs gap-1 rounded-lg',
  sm: 'h-8 px-2.5 text-[13px] gap-1.5 rounded-lg',
  md: 'h-9 px-3.5 text-sm gap-2 rounded-xl',
  lg: 'h-11 px-5 text-[15px] gap-2 rounded-xl',
};

const ICON_SIZES: Record<Size, string> = {
  xs: 'h-7 w-7 rounded-lg',
  sm: 'h-8 w-8 rounded-lg',
  md: 'h-9 w-9 rounded-xl',
  lg: 'h-11 w-11 rounded-xl',
};

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  icon?: LucideIcon;
  iconRight?: LucideIcon;
  /** Nút chỉ có biểu tượng (cần aria-label/title). */
  iconOnly?: boolean;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = 'secondary', size = 'md', loading, icon: Icon, iconRight: IconRight, iconOnly, className, children, disabled, type = 'button', ...rest },
    ref,
  ) => {
    const iconClass = size === 'lg' ? 'h-[18px] w-[18px]' : size === 'xs' ? 'h-3.5 w-3.5' : 'h-4 w-4';
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        className={cn(
          'inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-all duration-150',
          'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
          VARIANTS[variant],
          iconOnly ? ICON_SIZES[size] : SIZES[size],
          className,
        )}
        {...rest}
      >
        {loading ? <Loader2 className={cn(iconClass, 'animate-spin')} /> : Icon ? <Icon className={iconClass} /> : null}
        {!iconOnly && children}
        {!iconOnly && IconRight && <IconRight className={iconClass} />}
      </button>
    );
  },
);
Button.displayName = 'Button';
