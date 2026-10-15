import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { matchesQuery, relevance } from '../../lib/text';

export type ComboOption = {
  value: string;
  label: string;
  description?: string;
  /** Chuỗi tìm kiếm bổ sung (mã, SĐT…). */
  keywords?: string;
  meta?: React.ReactNode;
  disabled?: boolean;
};

type Props = {
  value: string;
  onChange: (value: string, option?: ComboOption) => void;
  options: ComboOption[];
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  /** Cho phép nhập giá trị tự do khi không có trong danh sách. */
  allowCustom?: boolean;
  clearable?: boolean;
  className?: string;
  invalid?: boolean;
  maxResults?: number;
};

/** Cuộn riêng danh sách tới mục đang chọn (không kéo theo trang/drawer như scrollIntoView). */
export const scrollListTo = (list: HTMLElement | null, index: number) => {
  const item = list?.querySelector<HTMLElement>(`[data-index="${index}"]`);
  if (!list || !item) return;
  const top = item.offsetTop;
  const bottom = top + item.offsetHeight;
  if (top < list.scrollTop) list.scrollTop = top;
  else if (bottom > list.scrollTop + list.clientHeight) list.scrollTop = bottom - list.clientHeight;
};

/** Ô chọn có tìm kiếm không dấu, điều hướng bằng bàn phím. */
export const Combobox: React.FC<Props> = ({
  value,
  onChange,
  options,
  placeholder = 'Chọn…',
  emptyText = 'Không tìm thấy kết quả',
  disabled,
  allowCustom,
  clearable = true,
  className,
  invalid,
  maxResults = 80,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = options.find(option => option.value === value);
  const display = selected?.label ?? value ?? '';

  const filtered = useMemo(() => {
    if (!query.trim()) return options.slice(0, maxResults);
    return options
      .filter(option => matchesQuery(query, option.label, option.description, option.keywords, option.value))
      .map(option => ({ option, score: relevance(query, option.label, option.keywords, option.value) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, maxResults)
      .map(item => item.option);
  }, [options, query, maxResults]);

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => setActive(0), [query, open]);

  useEffect(() => {
    scrollListTo(listRef.current, active);
  }, [active]);

  const choose = (option?: ComboOption) => {
    if (option?.disabled) return;
    if (option) onChange(option.value, option);
    else if (allowCustom && query.trim()) onChange(query.trim());
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActive(index => Math.min(filtered.length - 1, index + 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive(index => Math.max(0, index - 1));
    } else if (event.key === 'Enter') {
      if (!open) return;
      event.preventDefault();
      choose(filtered[active]);
    } else if (event.key === 'Escape' && open) {
      event.stopPropagation();
      setOpen(false);
      setQuery('');
    } else if (event.key === 'Tab' && open) {
      setOpen(false);
      setQuery('');
    }
  };

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      <div className="relative">
        <input
          ref={inputRef}
          disabled={disabled}
          value={open ? query : display}
          placeholder={open && display ? display : placeholder}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={event => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          className={cn('input pr-14', invalid && 'border-rose-400', !open && !display && 'text-faint')}
          role="combobox"
          aria-expanded={open}
          autoComplete="off"
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
          {clearable && value && !disabled && (
            <button
              type="button"
              tabIndex={-1}
              onClick={() => {
                onChange('');
                setQuery('');
              }}
              className="rounded-md p-1 text-faint hover:bg-sunken hover:text-fg"
              aria-label="Xoá lựa chọn"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <ChevronDown className="h-4 w-4 text-faint" />
        </div>
      </div>
      {open && !disabled && (
        <ul
          ref={listRef}
          className="scrollbar-thin absolute z-[80] mt-1.5 max-h-72 w-full min-w-[220px] animate-fade-in overflow-y-auto rounded-xl border border-line bg-surface p-1 shadow-pop"
          role="listbox"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-3 text-center text-sm text-muted">
              {allowCustom && query.trim() ? (
                <button type="button" className="font-medium text-primary" onMouseDown={event => event.preventDefault()} onClick={() => choose()}>
                  Dùng “{query.trim()}”
                </button>
              ) : (
                emptyText
              )}
            </li>
          ) : (
            filtered.map((option, index) => {
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  data-index={index}
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={event => event.preventDefault()}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(option)}
                  className={cn(
                    'flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-sm',
                    index === active ? 'bg-sunken' : '',
                    option.disabled && 'cursor-not-allowed opacity-50',
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className={cn('truncate', isSelected ? 'font-semibold text-primary' : 'text-fg')}>{option.label}</div>
                    {option.description && <div className="truncate text-xs text-muted">{option.description}</div>}
                  </div>
                  {option.meta}
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
};

/** Chuyển danh sách tên thành tuỳ chọn combobox. */
export const namesToOptions = (names: string[]): ComboOption[] =>
  Array.from(new Set(names.filter(Boolean))).map(name => ({ value: name, label: name }));
