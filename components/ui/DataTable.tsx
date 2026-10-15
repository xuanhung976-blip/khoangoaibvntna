import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react';
import { cn } from '../../lib/cn';
import { SkeletonRows } from './Feedback';

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  sort?: (row: T) => string | number;
  className?: string;
  headerClassName?: string;
  align?: 'left' | 'center' | 'right';
  /** Ẩn cột dưới breakpoint (bảng vẫn cuộn ngang được). */
  hideBelow?: 'sm' | 'md' | 'lg' | 'xl';
};

type SortState = { key: string; dir: 'asc' | 'desc' } | null;

type Props<T> = {
  rows: T[];
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  rowClassName?: (row: T) => string | undefined;
  loading?: boolean;
  empty?: React.ReactNode;
  /** Hiển thị dạng thẻ trên màn hình nhỏ (< md). */
  mobileCard?: (row: T) => React.ReactNode;
  defaultSort?: SortState;
  pageSize?: number;
  className?: string;
  /** Reset phân trang khi giá trị này đổi (ví dụ bộ lọc). */
  resetKey?: unknown;
};

const HIDE: Record<NonNullable<Column<unknown>['hideBelow']>, string> = {
  sm: 'hidden sm:table-cell',
  md: 'hidden md:table-cell',
  lg: 'hidden lg:table-cell',
  xl: 'hidden xl:table-cell',
};

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' };

export function DataTable<T>({
  rows,
  columns,
  rowKey,
  onRowClick,
  rowClassName,
  loading,
  empty,
  mobileCard,
  defaultSort = null,
  pageSize = 60,
  className,
  resetKey,
}: Props<T>) {
  const [sort, setSort] = useState<SortState>(defaultSort);
  const [limit, setLimit] = useState(pageSize);

  useEffect(() => setLimit(pageSize), [resetKey, pageSize]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find(col => col.key === sort.key);
    if (!column?.sort) return rows;
    const factor = sort.dir === 'asc' ? 1 : -1;
    return [...rows].sort((a, b) => {
      const va = column.sort!(a);
      const vb = column.sort!(b);
      if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * factor;
      return String(va).localeCompare(String(vb), 'vi', { numeric: true }) * factor;
    });
  }, [rows, sort, columns]);

  const visible = sorted.slice(0, limit);

  const toggleSort = (key: string) => {
    setSort(current => {
      if (!current || current.key !== key) return { key, dir: 'asc' };
      if (current.dir === 'asc') return { key, dir: 'desc' };
      return defaultSort;
    });
  };

  if (loading && rows.length === 0) return <SkeletonRows />;
  if (rows.length === 0) return <>{empty}</>;

  return (
    <div className={className}>
      {mobileCard && (
        <ul className="divide-y divide-line md:hidden">
          {visible.map(row => (
            <li
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn('px-4 py-3', onRowClick && 'cursor-pointer active:bg-sunken', rowClassName?.(row))}
            >
              {mobileCard(row)}
            </li>
          ))}
        </ul>
      )}
      <div className={cn('scrollbar-thin overflow-x-auto', mobileCard && 'hidden md:block')}>
        <table className="w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              {columns.map(column => {
                const active = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      'sticky top-0 z-[1] whitespace-nowrap border-b border-line bg-sunken/95 px-4 py-2.5 text-xs font-semibold text-muted backdrop-blur',
                      ALIGN[column.align || 'left'],
                      column.hideBelow && HIDE[column.hideBelow],
                      column.headerClassName,
                    )}
                  >
                    {column.sort ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column.key)}
                        className={cn('inline-flex items-center gap-1 hover:text-fg', active && 'text-fg')}
                      >
                        {column.header}
                        {active ? (
                          sort!.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ChevronsUpDown className="h-3 w-3 opacity-40" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => (
              <tr
                key={rowKey(row)}
                onClick={
                  onRowClick
                    ? () => {
                        if (window.getSelection()?.toString()) return;
                        onRowClick(row);
                      }
                    : undefined
                }
                className={cn('group transition-colors', onRowClick && 'cursor-pointer hover:bg-sunken/70', rowClassName?.(row))}
              >
                {columns.map(column => (
                  <td
                    key={column.key}
                    className={cn(
                      'border-b border-line/70 px-4 py-3 align-middle',
                      ALIGN[column.align || 'left'],
                      column.hideBelow && HIDE[column.hideBelow],
                      column.className,
                    )}
                  >
                    {column.cell(row, index)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {sorted.length > limit && (
        <div className="flex items-center justify-center gap-3 border-t border-line px-4 py-3 text-sm">
          <span className="text-muted">
            Đang hiển thị {limit}/{sorted.length}
          </span>
          <button onClick={() => setLimit(value => value + pageSize)} className="font-medium text-primary hover:underline">
            Xem thêm {Math.min(pageSize, sorted.length - limit)}
          </button>
          <button onClick={() => setLimit(sorted.length)} className="text-muted hover:text-fg">
            Hiện tất cả
          </button>
        </div>
      )}
    </div>
  );
}

/** Ô thao tác trong bảng: chặn sự kiện click lan ra hàng. */
export const RowActions: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <div
    onClick={event => event.stopPropagation()}
    className={cn('flex items-center justify-end gap-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100', className)}
  >
    {children}
  </div>
);
