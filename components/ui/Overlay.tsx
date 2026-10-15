import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn';

/* Khóa cuộn trang khi có lớp phủ; đếm số lớp để không mở khóa sớm khi lồng nhau. */
let lockCount = 0;
const useScrollLock = (active: boolean) => {
  useEffect(() => {
    if (!active) return;
    lockCount += 1;
    document.body.style.overflow = 'hidden';
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) document.body.style.overflow = '';
    };
  }, [active]);
};

/* Chỉ lớp phủ trên cùng phản hồi phím Esc. */
const escStack: string[] = [];
const useEscape = (active: boolean, id: string, onClose: () => void) => {
  const handler = useRef(onClose);
  handler.current = onClose;
  useEffect(() => {
    if (!active) return;
    escStack.push(id);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && escStack[escStack.length - 1] === id) {
        event.stopPropagation();
        handler.current();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      const index = escStack.lastIndexOf(id);
      if (index >= 0) escStack.splice(index, 1);
    };
  }, [active, id]);
};

const useAutoFocus = (active: boolean, panelRef: React.RefObject<HTMLDivElement>) => {
  useEffect(() => {
    if (!active) return;
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel || panel.contains(document.activeElement)) return;
      const target = panel.querySelector<HTMLElement>('[data-autofocus], input:not([disabled]):not([type=hidden]), textarea, select');
      (target || panel).focus({ preventScroll: true });
    }, 40);
    return () => {
      window.clearTimeout(timer);
      previous?.focus?.({ preventScroll: true });
    };
  }, [active, panelRef]);
};

export const Portal: React.FC<{ children: React.ReactNode }> = ({ children }) => createPortal(children, document.body);

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  children?: React.ReactNode;
  /** Không đóng khi bấm nền (form dài để tránh mất dữ liệu). */
  persistent?: boolean;
  bodyClassName?: string;
};

const DIALOG_SIZES = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

export const Dialog: React.FC<DialogProps> = ({ open, onClose, title, description, icon, size = 'md', footer, children, persistent, bodyClassName }) => {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useScrollLock(open);
  useEscape(open, id, onClose);
  useAutoFocus(open, panelRef);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
        <div className="absolute inset-0 animate-fade-in bg-slate-950/40 backdrop-blur-[2px]" onClick={persistent ? undefined : onClose} />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className={cn(
            'relative flex max-h-[92vh] w-full animate-slide-up flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-pop outline-none sm:animate-scale-in sm:rounded-2xl',
            DIALOG_SIZES[size],
          )}
        >
          {(title || description) && (
            <div className="flex items-start gap-3 border-b border-line px-5 py-4">
              {icon}
              <div className="min-w-0 flex-1">
                {title && <h2 className="text-base font-semibold text-fg">{title}</h2>}
                {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
              </div>
              <button onClick={onClose} className="-mr-1 rounded-lg p-1.5 text-faint hover:bg-sunken hover:text-fg" aria-label="Đóng">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className={cn('scrollbar-thin flex-1 overflow-y-auto px-5 py-4', bodyClassName)}>{children}</div>
          {footer && <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-sunken/60 px-5 py-3">{footer}</div>}
        </div>
      </div>
    </Portal>
  );
};

type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  headerExtra?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  footer?: React.ReactNode;
  children?: React.ReactNode;
  persistent?: boolean;
  bodyClassName?: string;
};

const DRAWER_SIZES = { sm: 'sm:max-w-md', md: 'sm:max-w-xl', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };

/** Bảng trượt từ phải — dùng cho xem chi tiết & form dài, giữ nguyên ngữ cảnh danh sách phía sau. */
export const Drawer: React.FC<DrawerProps> = ({ open, onClose, title, subtitle, headerExtra, size = 'md', footer, children, persistent, bodyClassName }) => {
  const id = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useScrollLock(open);
  useEscape(open, id, onClose);
  useAutoFocus(open, panelRef);
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[60] flex justify-end">
        <div className="absolute inset-0 animate-fade-in bg-slate-950/35 backdrop-blur-[1px]" onClick={persistent ? undefined : onClose} />
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
          className={cn(
            'relative flex h-full w-full animate-slide-in-right flex-col border-l border-line bg-surface shadow-pop outline-none',
            DRAWER_SIZES[size],
          )}
        >
          <div className="flex items-start gap-3 border-b border-line px-5 py-4">
            <div className="min-w-0 flex-1">
              {title && <h2 className="truncate text-base font-semibold text-fg">{title}</h2>}
              {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
            </div>
            {headerExtra}
            <button onClick={onClose} className="-mr-1 rounded-lg p-1.5 text-faint hover:bg-sunken hover:text-fg" aria-label="Đóng">
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className={cn('scrollbar-thin flex-1 overflow-y-auto px-5 py-5', bodyClassName)}>{children}</div>
          {footer && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-sunken/60 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              {footer}
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
};
