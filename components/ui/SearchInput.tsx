import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '../../lib/cn';

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  shortcut?: string;
};

export const SearchInput = React.forwardRef<HTMLInputElement, Props>(({ value, onChange, placeholder = 'Tìm kiếm…', className, autoFocus, shortcut }, ref) => (
  <div className={cn('relative min-w-0', className)}>
    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
    <input
      ref={ref}
      value={value}
      autoFocus={autoFocus}
      onChange={event => onChange(event.target.value)}
      onKeyDown={event => {
        if (event.key === 'Escape' && value) {
          event.stopPropagation();
          onChange('');
        }
      }}
      placeholder={placeholder}
      className="input h-9 pl-9 pr-9"
      type="search"
      enterKeyHint="search"
    />
    {value ? (
      <button
        type="button"
        onClick={() => onChange('')}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-faint hover:bg-sunken hover:text-fg"
        aria-label="Xoá tìm kiếm"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    ) : shortcut ? (
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 font-mono text-[10px] text-faint sm:block">
        {shortcut}
      </kbd>
    ) : null}
  </div>
));
SearchInput.displayName = 'SearchInput';
