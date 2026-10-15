import React, { useEffect, useRef, useState } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

export type MenuItem =
  | {
      label: React.ReactNode;
      icon?: LucideIcon;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
      hint?: React.ReactNode;
    }
  | 'divider';

/** Menu thả xuống đơn giản, đóng khi bấm ra ngoài hoặc Esc. */
export const Menu: React.FC<{
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  items: MenuItem[];
  align?: 'left' | 'right';
  header?: React.ReactNode;
  className?: string;
  width?: string;
  /** Mở lên trên (dùng cho phần tử gần đáy khung có overflow-hidden). */
  up?: boolean;
}> = ({ trigger, items, align = 'right', header, className, width = 'w-56', up }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn('relative', className)} onClick={event => event.stopPropagation()}>
      {trigger({ open, toggle: () => setOpen(value => !value) })}
      {open && (
        <div
          className={cn(
            'absolute z-[75] animate-fade-in rounded-xl border border-line bg-surface p-1 shadow-pop',
            up ? 'bottom-full mb-1.5' : 'mt-1.5',
            align === 'right' ? 'right-0' : 'left-0',
            width,
          )}
          role="menu"
        >
          {header}
          {items.map((item, index) =>
            item === 'divider' ? (
              <div key={`d${index}`} className="my-1 h-px bg-line" />
            ) : (
              <button
                key={index}
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onSelect();
                }}
                className={cn(
                  'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors disabled:opacity-50',
                  item.danger ? 'text-rose-600 hover:bg-rose-500/10 dark:text-rose-400' : 'text-fg hover:bg-sunken',
                )}
              >
                {item.icon && <item.icon className="h-4 w-4 shrink-0 opacity-70" />}
                <span className="flex-1">{item.label}</span>
                {item.hint && <span className="text-xs text-faint">{item.hint}</span>}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
};
