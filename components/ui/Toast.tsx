import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Portal } from './Overlay';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

type ToastAction = { label: string; onClick: () => void };
type ToastItem = { id: number; message: string; type: ToastType; description?: string; action?: ToastAction };

const listeners = new Set<(toast: ToastItem) => void>();
const lastShown = new Map<string, number>();
let seq = 0;

/** Hiển thị thông báo nhanh. Thông báo trùng trong 2 giây bị bỏ qua. */
export const showToast = (message: string, type: ToastType = 'info', description?: string, action?: ToastAction) => {
  const key = `${type}:${message}`;
  const now = Date.now();
  if (!action && now - (lastShown.get(key) || 0) < 2000) return;
  lastShown.set(key, now);
  const toast = { id: ++seq, message, type, description, action };
  listeners.forEach(listener => listener(toast));
};

/** Trích thông điệp lỗi thân thiện từ lỗi API. */
export const errorMessage = (error: unknown, fallback = 'Đã có lỗi xảy ra'): string => {
  const raw = (error as any)?.message || (typeof error === 'string' ? error : '');
  const code = (error as any)?.code || '';
  if (code === 'PERMISSION_DENIED' || raw.includes('PERMISSION_DENIED')) return 'Bạn không có quyền thực hiện thao tác này.';
  if (code === 'PASSWORD_CHANGE_REQUIRED' || raw.includes('PASSWORD_CHANGE_REQUIRED')) return 'Vui lòng đổi mật khẩu trước khi tiếp tục.';
  if (raw.includes('AUTH_REQUIRED') || raw.includes('SESSION_EXPIRED')) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (raw.includes('Server is busy')) return 'Máy chủ đang bận, vui lòng thử lại sau vài giây.';
  if (raw === 'Failed to fetch') return 'Không kết nối được máy chủ.';
  return raw ? raw.replace(/^[A-Z_]+:\s*/, '') : fallback;
};

const ICONS = { success: CheckCircle2, error: XCircle, warning: AlertTriangle, info: Info };
const ICON_TONE = {
  success: 'text-emerald-500',
  error: 'text-rose-500',
  warning: 'text-amber-500',
  info: 'text-sky-500',
};

export const Toaster: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    const listener = (toast: ToastItem) => {
      setToasts(current => [...current.slice(-3), toast]);
      window.setTimeout(() => setToasts(current => current.filter(item => item.id !== toast.id)), toast.type === 'error' || toast.action ? 6000 : 3500);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <Portal>
      <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:inset-x-auto sm:right-4 sm:top-4 sm:items-end">
        {toasts.map(toast => {
          const Icon = ICONS[toast.type];
          return (
            <div
              key={toast.id}
              role="status"
              className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-pop"
            >
              <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', ICON_TONE[toast.type])} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-fg">{toast.message}</p>
                {toast.description && <p className="mt-0.5 text-xs text-muted">{toast.description}</p>}
              </div>
              {toast.action && (
                <button
                  onClick={() => {
                    toast.action!.onClick();
                    setToasts(current => current.filter(item => item.id !== toast.id));
                  }}
                  className="shrink-0 rounded-lg px-2 py-0.5 text-sm font-semibold text-primary hover:bg-primary-soft"
                >
                  {toast.action.label}
                </button>
              )}
              <button
                onClick={() => setToasts(current => current.filter(item => item.id !== toast.id))}
                className="rounded-md p-0.5 text-faint hover:text-fg"
                aria-label="Đóng thông báo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </Portal>
  );
};
