import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Tone } from '../../lib/domain';
import { CountPill } from './Badge';

export type TabItem<T extends string> = {
  value: T;
  label: React.ReactNode;
  icon?: LucideIcon;
  count?: number;
  countTone?: Tone;
};

/** Tab gạch chân, cuộn ngang được trên mobile. */
export function Tabs<T extends string>({
  value,
  onChange,
  items,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  items: TabItem<T>[];
  className?: string;
}) {
  return (
    <div className={cn('scrollbar-none -mx-1 flex gap-1 overflow-x-auto border-b border-line px-1', className)} role="tablist">
      {items.map(item => {
        const active = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 px-3 pb-2.5 pt-2 text-sm font-medium transition-colors',
              active ? 'text-primary' : 'text-muted hover:text-fg',
            )}
          >
            {Icon && <Icon className="h-4 w-4" />}
            {item.label}
            {item.count !== undefined && <CountPill value={item.count} tone={active ? 'primary' : item.countTone || 'neutral'} />}
            {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-primary" />}
          </button>
        );
      })}
    </div>
  );
}

/** Điều khiển phân đoạn (nút bấm liền khối). */
export function Segmented<T extends string>({
  value,
  onChange,
  items,
  className,
  size = 'md',
}: {
  value: T;
  onChange: (value: T) => void;
  items: Array<{ value: T; label: React.ReactNode; icon?: LucideIcon; count?: number }>;
  className?: string;
  size?: 'sm' | 'md';
}) {
  return (
    <div className={cn('scrollbar-none inline-flex max-w-full overflow-x-auto rounded-xl border border-line bg-sunken p-0.5', className)}>
      {items.map(item => {
        const active = item.value === value;
        const Icon = item.icon;
        return (
          <button
            key={item.value}
            onClick={() => onChange(item.value)}
            className={cn(
              'flex shrink-0 items-center gap-1.5 rounded-[10px] font-medium transition-all',
              size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-[13px]',
              active ? 'bg-surface text-fg shadow-card' : 'text-muted hover:text-fg',
            )}
          >
            {Icon && <Icon className="h-3.5 w-3.5" />}
            {item.label}
            {item.count !== undefined && (
              <span className={cn('num text-[11px]', active ? 'text-primary' : 'text-faint')}>{item.count}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
