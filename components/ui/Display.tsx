import React from 'react';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Tone } from '../../lib/domain';
import { initials } from '../../lib/text';
import { TONE_BAR, TONE_SOFT, TONE_TEXT } from './Badge';

/* ---------------- Avatar ---------------- */

const AVATAR_COLORS = [
  'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
];

const hash = (value: string) => {
  let h = 0;
  for (let i = 0; i < value.length; i++) h = (h * 31 + value.charCodeAt(i)) | 0;
  return Math.abs(h);
};

export const Avatar: React.FC<{ name?: string; size?: 'xs' | 'sm' | 'md' | 'lg'; className?: string }> = ({ name = '', size = 'md', className }) => (
  <span
    title={name}
    className={cn(
      'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold',
      AVATAR_COLORS[hash(name) % AVATAR_COLORS.length],
      size === 'xs' && 'h-6 w-6 text-[10px]',
      size === 'sm' && 'h-8 w-8 text-[11px]',
      size === 'md' && 'h-9 w-9 text-xs',
      size === 'lg' && 'h-12 w-12 text-sm',
      className,
    )}
  >
    {initials(name)}
  </span>
);

/* ---------------- Progress ---------------- */

export const Progress: React.FC<{ value: number; tone?: Tone; className?: string; size?: 'sm' | 'md'; showLabel?: boolean }> = ({
  value,
  tone,
  className,
  size = 'sm',
  showLabel,
}) => {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const autoTone: Tone = tone || (pct >= 100 ? 'success' : pct >= 50 ? 'primary' : pct > 0 ? 'info' : 'neutral');
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className={cn('flex-1 overflow-hidden rounded-full bg-line/70', size === 'sm' ? 'h-1.5' : 'h-2.5')}>
        <div className={cn('h-full rounded-full transition-all duration-500', TONE_BAR[autoTone])} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="num w-9 text-right text-xs font-medium text-muted">{pct}%</span>}
    </div>
  );
};

/* ---------------- Page header ---------------- */

export const PageHeader: React.FC<{
  title: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  actions?: React.ReactNode;
  className?: string;
}> = ({ title, description, icon: Icon, actions, className }) => (
  <div className={cn('flex flex-col gap-3 md:flex-row md:items-end md:justify-between', className)}>
    <div className="flex min-w-0 items-center gap-3">
      {Icon && (
        <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary ring-1 ring-primary/10 sm:flex">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-fg sm:text-[22px]">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
      </div>
    </div>
    {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
  </div>
);

/* ---------------- Card / Section ---------------- */

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...rest }) => <div className={cn('card', className)} {...rest} />;

export const SectionCard: React.FC<{
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: LucideIcon;
  iconTone?: Tone;
  actions?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}> = ({ title, description, icon: Icon, iconTone = 'primary', actions, children, className, bodyClassName }) => (
  <section className={cn('card flex flex-col', className)}>
    {(title || actions) && (
      <header className="flex items-center gap-3 border-b border-line px-4 py-3 sm:px-5">
        {Icon && (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONE_SOFT[iconTone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          {title && <h2 className="truncate text-[15px] font-semibold text-fg">{title}</h2>}
          {description && <p className="truncate text-xs text-muted">{description}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-1.5">{actions}</div>}
      </header>
    )}
    <div className={cn('flex-1', bodyClassName)}>{children}</div>
  </section>
);

/* ---------------- Stat card ---------------- */

export const StatCard: React.FC<{
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  hint?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  footer?: React.ReactNode;
}> = ({ label, value, icon: Icon, tone = 'primary', hint, onClick, className, footer }) => {
  const Comp: any = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'card group relative flex flex-col p-4 text-left transition-all',
        onClick && 'hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-pop',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="text-[13px] font-medium text-muted">{label}</div>
        {Icon && (
          <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', TONE_SOFT[tone])}>
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <div className="num mt-1 text-[28px] font-semibold leading-tight tracking-tight text-fg">{value}</div>
      {hint && (
        <div className="mt-1 flex items-center gap-1 text-xs text-muted">
          {hint}
          {onClick && <ArrowRight className="h-3 w-3 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />}
        </div>
      )}
      {footer}
    </Comp>
  );
};

/* ---------------- Key/value ---------------- */

export const KeyValue: React.FC<{ label: React.ReactNode; value?: React.ReactNode; className?: string; mono?: boolean }> = ({ label, value, className, mono }) => (
  <div className={cn('min-w-0', className)}>
    <dt className="text-xs text-muted">{label}</dt>
    <dd className={cn('mt-0.5 break-words text-sm font-medium text-fg', mono && 'font-mono')}>
      {value === undefined || value === null || value === '' ? <span className="text-faint">—</span> : value}
    </dd>
  </div>
);

export const ToneText: React.FC<{ tone: Tone; children: React.ReactNode; className?: string }> = ({ tone, children, className }) => (
  <span className={cn(TONE_TEXT[tone], className)}>{children}</span>
);

/** Thanh công cụ bên trên bảng: tìm kiếm + bộ lọc. */
export const Toolbar: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div className={cn('flex flex-col gap-2 border-b border-line p-3 sm:flex-row sm:flex-wrap sm:items-center sm:px-4', className)}>{children}</div>
);
