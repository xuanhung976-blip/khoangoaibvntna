import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Tone } from '../../lib/domain';

export const TONE_SOFT: Record<Tone, string> = {
  neutral: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
  primary: 'bg-primary/10 text-primary',
  info: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  warning: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  danger: 'bg-rose-500/10 text-rose-700 dark:text-rose-300',
  violet: 'bg-violet-500/10 text-violet-700 dark:text-violet-300',
};

export const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-slate-400',
  primary: 'bg-primary',
  info: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  violet: 'bg-violet-500',
};

export const TONE_SOLID: Record<Tone, string> = {
  neutral: 'bg-slate-500 text-white',
  primary: 'bg-primary text-primary-fg',
  info: 'bg-sky-600 text-white',
  success: 'bg-emerald-600 text-white',
  warning: 'bg-amber-500 text-white',
  danger: 'bg-rose-600 text-white',
  violet: 'bg-violet-600 text-white',
};

export const TONE_TEXT: Record<Tone, string> = {
  neutral: 'text-muted',
  primary: 'text-primary',
  info: 'text-sky-600 dark:text-sky-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-rose-600 dark:text-rose-400',
  violet: 'text-violet-600 dark:text-violet-400',
};

export const TONE_BAR: Record<Tone, string> = {
  neutral: 'bg-slate-400',
  primary: 'bg-primary',
  info: 'bg-sky-500',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  violet: 'bg-violet-500',
};

type BadgeProps = {
  tone?: Tone;
  dot?: boolean;
  icon?: LucideIcon;
  solid?: boolean;
  className?: string;
  children: React.ReactNode;
  title?: string;
};

export const Badge: React.FC<BadgeProps> = ({ tone = 'neutral', dot, icon: Icon, solid, className, children, title }) => (
  <span
    title={title}
    className={cn(
      'inline-flex max-w-full items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium leading-5',
      solid ? TONE_SOLID[tone] : TONE_SOFT[tone],
      className,
    )}
  >
    {dot && <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TONE_DOT[tone])} />}
    {Icon && <Icon className="h-3 w-3 shrink-0" />}
    <span className="truncate">{children}</span>
  </span>
);

/** Ô đếm nhỏ (dùng trong menu, tab). */
export const CountPill: React.FC<{ value: number; tone?: Tone; className?: string }> = ({ value, tone = 'neutral', className }) =>
  value > 0 ? (
    <span
      className={cn(
        'num inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold',
        tone === 'neutral' ? 'bg-line text-muted' : TONE_SOLID[tone],
        className,
      )}
    >
      {value > 99 ? '99+' : value}
    </span>
  ) : null;
