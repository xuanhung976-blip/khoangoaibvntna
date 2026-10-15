import React, { useState } from 'react';
import { cn } from '../../lib/cn';
import type { Tone } from '../../lib/domain';
import { TONE_BAR } from './Badge';

/*
 * Biểu đồ SVG/HTML nhẹ, một chuỗi dữ liệu (một sắc độ), theo quy ước:
 * cột ≤ 24px, bo 4px ở đầu dữ liệu và vuông ở đường gốc, lưới mảnh 1px,
 * nhãn chữ dùng màu chữ (không dùng màu dữ liệu), có tooltip khi rê chuột.
 */

export type BarDatum = { key: string; label: string; value: number; tooltip?: string; highlight?: boolean };

const niceMax = (value: number) => {
  if (value <= 0) return 4;
  const exp = Math.pow(10, Math.floor(Math.log10(value)));
  const steps = [1, 2, 2.5, 5, 10];
  for (const step of steps) {
    const candidate = step * exp;
    if (candidate >= value) return candidate;
  }
  return 10 * exp;
};

/** Biểu đồ cột dọc (ví dụ số ca phẫu thuật theo tháng). */
export const ColumnChart: React.FC<{
  data: BarDatum[];
  height?: number;
  valueLabel?: string;
  className?: string;
  onSelect?: (key: string) => void;
}> = ({ data, height = 180, valueLabel = '', className, onSelect }) => {
  const [hover, setHover] = useState<number | null>(null);
  const max = niceMax(Math.max(0, ...data.map(item => item.value)));
  const ticks = [0, max / 2, max];

  return (
    <div className={cn('relative', className)}>
      <div className="flex" style={{ height }}>
        {/* Trục Y */}
        <div className="relative mr-2 w-7 shrink-0 text-right">
          {ticks.map(tick => (
            <span key={tick} className="num absolute right-0 -translate-y-1/2 text-[10px] text-faint" style={{ top: `${100 - (tick / max) * 100}%` }}>
              {Number.isInteger(tick) ? tick : tick.toFixed(1)}
            </span>
          ))}
        </div>
        <div className="relative flex-1">
          {ticks.map(tick => (
            <div key={tick} className="absolute inset-x-0 h-px bg-line" style={{ top: `${100 - (tick / max) * 100}%` }} />
          ))}
          <div className="absolute inset-0 flex items-end gap-[2px]">
            {data.map((item, index) => {
              const pct = max ? (item.value / max) * 100 : 0;
              return (
                <button
                  type="button"
                  key={item.key}
                  onMouseEnter={() => setHover(index)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(index)}
                  onBlur={() => setHover(null)}
                  onClick={onSelect ? () => onSelect(item.key) : undefined}
                  className={cn('group relative flex h-full flex-1 items-end justify-center', onSelect ? 'cursor-pointer' : 'cursor-default')}
                  aria-label={`${item.label}: ${item.value} ${valueLabel}`}
                >
                  <span className={cn('absolute inset-x-0 bottom-0 top-0 rounded-md transition-colors', hover === index && 'bg-sunken')} />
                  <span
                    className={cn(
                      'relative w-full max-w-[24px] rounded-t-[4px] transition-all duration-300',
                      item.highlight ? 'bg-primary' : 'bg-primary/40 group-hover:bg-primary/60',
                    )}
                    style={{ height: `${Math.max(item.value > 0 ? 2 : 0, pct)}%` }}
                  />
                </button>
              );
            })}
          </div>
          {hover !== null && data[hover] && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-line bg-surface px-2.5 py-1.5 text-xs shadow-pop"
              style={{
                left: `${((hover + 0.5) / data.length) * 100}%`,
                top: `${Math.max(0, 100 - (data[hover].value / max) * 100) - 4}%`,
              }}
            >
              <div className="font-semibold text-fg">{data[hover].label}</div>
              <div className="text-muted">
                {data[hover].tooltip || (
                  <>
                    <span className="num font-semibold text-fg">{data[hover].value}</span> {valueLabel}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Trục X */}
      <div className="ml-9 mt-1.5 flex gap-[2px]">
        {data.map((item, index) => (
          <span
            key={item.key}
            className={cn(
              'flex-1 truncate text-center text-[10px]',
              item.highlight ? 'font-semibold text-fg' : 'text-faint',
              data.length > 8 && index % 2 === 1 && 'invisible sm:visible',
            )}
          >
            {item.label}
          </span>
        ))}
      </div>
    </div>
  );
};

/** Danh sách thanh ngang có nhãn (cơ cấu nhóm). Một sắc độ: nhãn mang danh tính, độ dài mang độ lớn. */
export const BarList: React.FC<{
  data: Array<{ key: string; label: React.ReactNode; value: number; hint?: React.ReactNode }>;
  total?: number;
  tone?: Tone;
  className?: string;
  showPercent?: boolean;
  onSelect?: (key: string) => void;
}> = ({ data, total, tone = 'primary', className, showPercent = true, onSelect }) => {
  const max = Math.max(1, ...data.map(item => item.value));
  const sum = total ?? data.reduce((acc, item) => acc + item.value, 0);
  return (
    <ul className={cn('space-y-3', className)}>
      {data.map(item => {
        const pct = sum > 0 ? Math.round((item.value / sum) * 100) : 0;
        const Comp: any = onSelect ? 'button' : 'div';
        return (
          <li key={item.key}>
            <Comp
              type={onSelect ? 'button' : undefined}
              onClick={onSelect ? () => onSelect(item.key) : undefined}
              className={cn('block w-full text-left', onSelect && 'rounded-lg hover:bg-sunken')}
              title={`${typeof item.label === 'string' ? item.label : ''}: ${item.value}${showPercent ? ` (${pct}%)` : ''}`}
            >
              <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-fg">{item.label}</span>
                <span className="num shrink-0 font-semibold text-fg">
                  {item.value}
                  {showPercent && <span className="ml-1 text-xs font-normal text-muted">{pct}%</span>}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-line/60">
                <div className={cn('h-full rounded-full transition-all duration-500', TONE_BAR[tone])} style={{ width: `${(item.value / max) * 100}%` }} />
              </div>
              {item.hint && <div className="mt-1 text-xs text-muted">{item.hint}</div>}
            </Comp>
          </li>
        );
      })}
    </ul>
  );
};

/** Đường xu hướng nhỏ (12 điểm), điểm cuối được nhấn. */
export const Sparkline: React.FC<{ values: number[]; width?: number; height?: number; className?: string }> = ({
  values,
  width = 96,
  height = 28,
  className,
}) => {
  if (values.length < 2) return null;
  const max = Math.max(1, ...values);
  const min = Math.min(0, ...values);
  const step = width / (values.length - 1);
  const y = (value: number) => height - 3 - ((value - min) / (max - min || 1)) * (height - 6);
  const points = values.map((value, index) => `${(index * step).toFixed(1)},${y(value).toFixed(1)}`).join(' ');
  const lastX = (values.length - 1) * step;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={cn('overflow-visible', className)} aria-hidden>
      <polygon points={`0,${height} ${points} ${lastX},${height}`} className="fill-primary/10" />
      <polyline points={points} fill="none" className="stroke-primary/60" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={lastX} cy={y(values[values.length - 1])} r={4} className="fill-primary stroke-surface" strokeWidth={2} />
    </svg>
  );
};

/** Đồng hồ mức (ví dụ công suất giường): phần lấp đầy đổi màu theo mức độ. */
export const Meter: React.FC<{ value: number; max: number; className?: string; warnAt?: number; dangerAt?: number }> = ({
  value,
  max,
  className,
  warnAt = 0.85,
  dangerAt = 1,
}) => {
  const ratio = max > 0 ? value / max : 0;
  const tone = ratio >= dangerAt ? 'bg-rose-500' : ratio >= warnAt ? 'bg-amber-500' : 'bg-primary';
  const track = ratio >= dangerAt ? 'bg-rose-500/15' : ratio >= warnAt ? 'bg-amber-500/15' : 'bg-primary/15';
  return (
    <div className={cn('h-2.5 overflow-hidden rounded-full', track, className)}>
      <div className={cn('h-full rounded-full transition-all duration-500', tone)} style={{ width: `${Math.min(100, ratio * 100)}%` }} />
    </div>
  );
};

export type StackSeries = { key: string; label: string; className: string };
export type StackRow = { key: string; label: React.ReactNode; title: string; values: Record<string, number>; sub?: React.ReactNode };

/** Chú thích màu cho biểu đồ nhiều chuỗi (danh tính không chỉ dựa vào màu: luôn kèm nhãn chữ). */
export const ChartLegend: React.FC<{ series: StackSeries[]; className?: string }> = ({ series, className }) => (
  <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted', className)}>
    {series.map(item => (
      <span key={item.key} className="inline-flex items-center gap-1.5">
        <span className={cn('h-2.5 w-2.5 rounded-[3px]', item.className)} />
        {item.label}
      </span>
    ))}
  </div>
);

/**
 * Thanh ngang xếp chồng theo từng hàng (ví dụ việc của từng nhân viên: quá hạn / đang làm / xong).
 * Độ dài tỉ lệ với hàng lớn nhất; khe 2px giữa các đoạn; rê chuột xem số liệu.
 */
export const StackedBarList: React.FC<{
  rows: StackRow[];
  series: StackSeries[];
  onSelect?: (key: string) => void;
  className?: string;
  emptyText?: string;
}> = ({ rows, series, onSelect, className, emptyText = 'Chưa có dữ liệu' }) => {
  const [hover, setHover] = useState<string | null>(null);
  const totals = rows.map(row => series.reduce((sum, item) => sum + (row.values[item.key] || 0), 0));
  const max = Math.max(1, ...totals);
  if (!rows.length) return <p className="py-6 text-center text-sm text-muted">{emptyText}</p>;
  return (
    <ul className={cn('space-y-2', className)}>
      {rows.map((row, index) => {
        const total = totals[index];
        const Comp: any = onSelect ? 'button' : 'div';
        return (
          <li key={row.key} className="relative">
            <Comp
              type={onSelect ? 'button' : undefined}
              onClick={onSelect ? () => onSelect(row.key) : undefined}
              onMouseEnter={() => setHover(row.key)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(row.key)}
              onBlur={() => setHover(null)}
              className={cn('grid w-full grid-cols-[minmax(90px,150px)_1fr_auto] items-center gap-3 rounded-lg px-1 py-1 text-left', onSelect && 'hover:bg-sunken')}
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] text-fg">{row.label}</span>
                {row.sub && <span className="block truncate text-[11px] text-muted">{row.sub}</span>}
              </span>
              <span className="flex h-3 items-center">
                <span className="flex h-full gap-[2px]" style={{ width: `${(total / max) * 100}%`, minWidth: total ? 4 : 0 }}>
                  {series.map(item => {
                    const value = row.values[item.key] || 0;
                    if (!value) return null;
                    return <span key={item.key} className={cn('h-full first:rounded-l-[4px] last:rounded-r-[4px]', item.className)} style={{ flexGrow: value, flexBasis: 0 }} />;
                  })}
                </span>
              </span>
              <span className="num w-7 text-right text-[13px] font-semibold text-fg">{total}</span>
            </Comp>
            {hover === row.key && (
              <div className="pointer-events-none absolute left-1/3 top-full z-10 mt-1 rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-pop">
                <p className="mb-1 font-semibold text-fg">{row.title}</p>
                {series.map(item => (
                  <p key={item.key} className="flex items-center gap-2 text-muted">
                    <span className={cn('h-2 w-2 rounded-[2px]', item.className)} />
                    {item.label}: <span className="num font-semibold text-fg">{row.values[item.key] || 0}</span>
                  </p>
                ))}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
};

/** Một thanh 100% thể hiện tỉ trọng các trạng thái (thay cho biểu đồ tròn). */
export const ProportionBar: React.FC<{ series: StackSeries[]; values: Record<string, number>; className?: string }> = ({ series, values, className }) => {
  const total = series.reduce((sum, item) => sum + (values[item.key] || 0), 0);
  return (
    <div className={className}>
      <div className="flex h-4 w-full gap-[2px] overflow-hidden rounded-[6px] bg-line/50">
        {total > 0 &&
          series.map(item =>
            values[item.key] ? (
              <span
                key={item.key}
                title={`${item.label}: ${values[item.key]} (${Math.round((values[item.key] / total) * 100)}%)`}
                className={cn('h-full', item.className)}
                style={{ flexGrow: values[item.key], flexBasis: 0 }}
              />
            ) : null,
          )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {series.map(item => (
          <div key={item.key} className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-xs text-muted">
              <span className={cn('h-2.5 w-2.5 shrink-0 rounded-[3px]', item.className)} />
              {item.label}
            </p>
            <p className="num text-lg font-semibold text-fg">
              {values[item.key] || 0}
              <span className="ml-1 text-xs font-normal text-muted">{total ? `${Math.round(((values[item.key] || 0) / total) * 100)}%` : ''}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
