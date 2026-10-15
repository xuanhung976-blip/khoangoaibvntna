import React from 'react';
import { AlertTriangle, Inbox, Loader2, RefreshCw, type LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';
import type { Tone } from '../../lib/domain';
import { Button } from './Button';
import { errorMessage } from './Toast';

export const Spinner: React.FC<{ className?: string; label?: string }> = ({ className, label }) => (
  <div className={cn('flex items-center justify-center gap-2 py-10 text-sm text-muted', className)}>
    <Loader2 className="h-5 w-5 animate-spin text-primary" />
    {label}
  </div>
);

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => <span className={cn('skeleton block h-4', className)} />;

export const SkeletonRows: React.FC<{ rows?: number; className?: string }> = ({ rows = 6, className }) => (
  <div className={cn('space-y-3 p-4', className)}>
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="flex items-center gap-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3.5 w-1/3" />
          <Skeleton className="h-3 w-2/3" />
        </div>
        <Skeleton className="hidden h-6 w-20 sm:block" />
      </div>
    ))}
  </div>
);

export const EmptyState: React.FC<{
  icon?: LucideIcon;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}> = ({ icon: Icon = Inbox, title, description, action, className, compact }) => (
  <div className={cn('flex flex-col items-center justify-center text-center', compact ? 'px-4 py-6' : 'px-6 py-14', className)}>
    <span className={cn('flex items-center justify-center rounded-2xl bg-sunken text-faint ring-1 ring-line', compact ? 'h-10 w-10' : 'h-14 w-14')}>
      <Icon className={compact ? 'h-5 w-5' : 'h-6 w-6'} />
    </span>
    <p className={cn('font-semibold text-fg', compact ? 'mt-2 text-sm' : 'mt-4 text-[15px]')}>{title}</p>
    {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ error: unknown; onRetry?: () => void; className?: string }> = ({ error, onRetry, className }) => (
  <EmptyState
    className={className}
    icon={AlertTriangle}
    title="Không tải được dữ liệu"
    description={errorMessage(error, 'Vui lòng kiểm tra kết nối và thử lại.')}
    action={
      onRetry && (
        <Button icon={RefreshCw} onClick={onRetry}>
          Thử lại
        </Button>
      )
    }
  />
);

const CALLOUT_TONES: Record<Tone, string> = {
  neutral: 'border-line bg-sunken text-fg',
  primary: 'border-primary/25 bg-primary-soft text-fg',
  info: 'border-sky-500/25 bg-sky-500/5 text-fg',
  success: 'border-emerald-500/25 bg-emerald-500/5 text-fg',
  warning: 'border-amber-500/30 bg-amber-500/[0.07] text-fg',
  danger: 'border-rose-500/25 bg-rose-500/5 text-fg',
  violet: 'border-violet-500/25 bg-violet-500/5 text-fg',
};

const CALLOUT_ICON: Record<Tone, string> = {
  neutral: 'text-muted',
  primary: 'text-primary',
  info: 'text-sky-500',
  success: 'text-emerald-500',
  warning: 'text-amber-500',
  danger: 'text-rose-500',
  violet: 'text-violet-500',
};

export const Callout: React.FC<{
  tone?: Tone;
  icon?: LucideIcon;
  title?: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ tone = 'info', icon: Icon = AlertTriangle, title, children, action, className }) => (
  <div className={cn('flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center', CALLOUT_TONES[tone], className)}>
    <div className="flex min-w-0 flex-1 gap-3">
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', CALLOUT_ICON[tone])} />
      <div className="min-w-0 text-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="text-muted">{children}</div>}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
