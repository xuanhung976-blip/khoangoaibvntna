import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, BarChart3, ChevronLeft, ChevronRight, Download, Gift, Star } from 'lucide-react';
import type { StaffEvaluation, StaffReward, StaffTask } from '../../types';
import { fmtDate } from '../../lib/dates';
import { cn } from '../../lib/cn';
import { exportToExcel } from '../../utils/exportUtils';
import { Badge, Button, EmptyState, SectionCard, Segmented } from '../../components/ui';
import { RANK_TONE, compareBounds, comparePeriodOf, compareStaff, fmtSigned, meanOf, type CompareKind, type ComparePeriod, type CompareRow } from './staffLogic';

/**
 * Màu thưởng / phạt cho biểu đồ và bảng so sánh: xanh dương / đỏ hồng — cặp đạt kiểm tra mù màu
 * (xanh lá / đỏ không đạt với người mù màu đỏ–lục). Luôn kèm dấu +/− làm nhãn phụ.
 */
export const BONUS_TEXT = 'text-blue-600 dark:text-blue-400';
export const PENALTY_TEXT = 'text-rose-600 dark:text-rose-400';
const BONUS_FILL = 'bg-blue-600 dark:bg-blue-500';
const PENALTY_FILL = 'bg-rose-600 dark:bg-rose-500';

type Metric = 'onTimeRate' | 'suggested' | 'final' | 'assigned';
const METRICS: Record<Metric, { label: string; unit: string; max?: number }> = {
  onTimeRate: { label: 'Đúng hạn', unit: '%', max: 100 },
  suggested: { label: 'Điểm gợi ý', unit: '', max: 100 },
  final: { label: 'Điểm cuối', unit: '', max: 100 },
  assigned: { label: 'Việc được giao', unit: '' },
};

type SortKey = keyof Pick<CompareRow, 'fullName' | 'assigned' | 'done' | 'onTimeRate' | 'overdue' | 'suggested' | 'bonus' | 'penalty' | 'rewardAvg' | 'criteria' | 'final'>;

const shiftPeriod = (period: ComparePeriod, step: number): ComparePeriod => {
  if (period.kind === 'year') return { ...period, year: period.year + step };
  if (period.kind === 'quarter') {
    const index = period.year * 4 + (period.quarter - 1) + step;
    return { ...period, year: Math.floor(index / 4), quarter: (index % 4) + 1 };
  }
  const index = period.year * 12 + (period.month - 1) + step;
  return { ...period, year: Math.floor(index / 12), month: (index % 12) + 1 };
};

const shortName = (name: string) => name.replace(/^(BS|ĐD|ThS|TS|BSCK[I12]*|CN)\.?\s*/i, '').split(' ').slice(-2).join(' ');

/* ---------------- Biểu đồ 1: xếp hạng theo một chỉ số ---------------- */

const RankingChart: React.FC<{ rows: CompareRow[]; metric: Metric; onOpen: (username: string) => void }> = ({ rows, metric, onOpen }) => {
  const meta = METRICS[metric];
  const valued = rows.filter(row => row[metric] !== null).sort((a, b) => (b[metric] as number) - (a[metric] as number));
  const missing = rows.filter(row => row[metric] === null);
  const max = meta.max ?? Math.max(1, ...valued.map(row => row[metric] as number));
  const avg = meanOf(valued.map(row => row[metric]));
  if (!valued.length) return <EmptyState compact icon={BarChart3} title={`Chưa có số liệu "${meta.label}" trong kỳ`} />;
  return (
    <div>
      <ul className="space-y-1.5">
        {valued.map(row => {
          const value = row[metric] as number;
          return (
            <li key={row.username}>
              <button
                onClick={() => onOpen(row.username)}
                className="group grid w-full grid-cols-[120px_1fr_44px] items-center gap-3 rounded-lg px-1 py-1 text-left hover:bg-sunken"
                title={`${row.fullName}: ${value}${meta.unit}${avg !== null ? ` (TB khoa ${avg}${meta.unit})` : ''}`}
              >
                <span className="truncate text-sm text-fg">{shortName(row.fullName)}</span>
                <span className="relative h-2.5 rounded-full bg-sunken">
                  <span className="absolute inset-y-0 left-0 rounded-full bg-primary transition-[width]" style={{ width: `${Math.max(2, (value / max) * 100)}%` }} />
                  {avg !== null && <span className="absolute -inset-y-1 w-0 border-l-2 border-dashed border-fg/40" style={{ left: `${(avg / max) * 100}%` }} />}
                </span>
                <span className="num text-right text-sm font-semibold text-fg">
                  {value}
                  {meta.unit}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
        {avg !== null && (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-0 border-l-2 border-dashed border-fg/40" /> TB khoa {avg}
            {meta.unit}
          </span>
        )}
        {missing.length > 0 && <span>Chưa có số liệu: {missing.map(row => shortName(row.fullName)).join(', ')}</span>}
      </div>
    </div>
  );
};

/* ---------------- Biểu đồ 2: thưởng / phạt hai chiều ---------------- */

const RewardChart: React.FC<{ rows: CompareRow[]; onOpen: (username: string) => void }> = ({ rows, onOpen }) => {
  const list = rows.filter(row => row.bonus || row.penalty).sort((a, b) => a.bonus - a.penalty - (b.bonus - b.penalty) || b.penalty - a.penalty);
  const max = Math.max(1, ...list.map(row => Math.max(row.bonus, row.penalty)));
  if (!list.length) return <EmptyState compact icon={Gift} title="Kỳ này chưa ghi thưởng / phạt" />;
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <span className={cn('h-2.5 w-2.5 rounded-sm', PENALTY_FILL)} /> Phạt
        </span>
        <span className="inline-flex items-center gap-1.5">
          Thưởng <span className={cn('h-2.5 w-2.5 rounded-sm', BONUS_FILL)} />
        </span>
      </div>
      <ul className="space-y-1.5">
        {list.map(row => (
          <li key={row.username}>
            <button
              onClick={() => onOpen(row.username)}
              className="grid w-full grid-cols-[1fr_96px_1fr] items-center gap-2 rounded-lg px-1 py-1 hover:bg-sunken"
              title={`${row.fullName}: thưởng ${row.bonus}, phạt ${row.penalty}, TB tháng ${fmtSigned(row.rewardAvg)}`}
            >
              <span className="flex items-center justify-end gap-1.5">
                {row.penalty > 0 && <span className={cn('num text-xs font-semibold', PENALTY_TEXT)}>−{row.penalty}</span>}
                <span className={cn('h-2.5 rounded-l-full', PENALTY_FILL)} style={{ width: `${(row.penalty / max) * 100}%` }} />
              </span>
              <span className="truncate text-center text-xs text-fg">{shortName(row.fullName)}</span>
              <span className="flex items-center gap-1.5">
                <span className={cn('h-2.5 rounded-r-full', BONUS_FILL)} style={{ width: `${(row.bonus / max) * 100}%` }} />
                {row.bonus > 0 && <span className={cn('num text-xs font-semibold', BONUS_TEXT)}>+{row.bonus}</span>}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

/* ---------------- Bảng so sánh ---------------- */

const SignedCell: React.FC<{ value: number }> = ({ value }) => (
  <span className={cn('num font-semibold', value > 0 ? BONUS_TEXT : value < 0 ? PENALTY_TEXT : 'text-faint')}>{fmtSigned(value)}</span>
);

const HeaderCell: React.FC<{ label: string; sortKey: SortKey; sort: { key: SortKey; dir: 1 | -1 }; onSort: (key: SortKey) => void; align?: 'left' | 'right'; className?: string }> = ({
  label,
  sortKey,
  sort,
  onSort,
  align = 'right',
  className,
}) => (
  <th className={cn('px-2 py-2 font-medium', align === 'left' ? 'text-left' : 'text-right', className)}>
    <button onClick={() => onSort(sortKey)} className={cn('inline-flex items-center gap-1 hover:text-fg', sort.key === sortKey && 'text-fg')}>
      {label}
      {sort.key === sortKey && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
    </button>
  </th>
);

export const StaffComparison: React.FC<{
  users: Array<{ username: string; fullName: string }>;
  tasks: StaffTask[];
  evaluations: StaffEvaluation[];
  rewards: StaffReward[];
  today: string;
  onOpen: (username: string) => void;
}> = ({ users, tasks, evaluations, rewards, today, onOpen }) => {
  const [period, setPeriod] = useState<ComparePeriod>(() => comparePeriodOf(today));
  const [metric, setMetric] = useState<Metric>('onTimeRate');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'onTimeRate', dir: -1 });
  const bounds = compareBounds(period);
  const rows = useMemo(() => compareStaff(users, tasks, evaluations, rewards, period, today), [users, tasks, evaluations, rewards, period, today]);

  const sorted = useMemo(
    () =>
      [...rows].sort((a, b) => {
        const left = a[sort.key];
        const right = b[sort.key];
        if (typeof left === 'string' || typeof right === 'string') return String(left).localeCompare(String(right), 'vi') * sort.dir;
        // Ô trống (chưa có số liệu) luôn xuống cuối, dù xếp tăng hay giảm.
        if (left === null) return right === null ? 0 : 1;
        if (right === null) return -1;
        return (left - right) * sort.dir;
      }),
    [rows, sort],
  );
  const onSort = (key: SortKey) => setSort(current => (current.key === key ? { key, dir: current.dir === 1 ? -1 : 1 } : { key, dir: key === 'fullName' ? 1 : -1 }));

  const avg = {
    assigned: meanOf(rows.map(row => row.assigned)),
    done: meanOf(rows.map(row => row.done)),
    onTimeRate: meanOf(rows.map(row => row.onTimeRate)),
    overdue: meanOf(rows.map(row => row.overdue)),
    suggested: meanOf(rows.map(row => row.suggested)),
    bonus: meanOf(rows.map(row => row.bonus)),
    penalty: meanOf(rows.map(row => row.penalty)),
    rewardAvg: meanOf(rows.map(row => row.rewardAvg)),
    criteria: meanOf(rows.map(row => row.criteria)),
    final: meanOf(rows.map(row => row.final)),
  };

  const exportExcel = () =>
    exportToExcel({
      fileName: `So_sanh_nhan_vien_${bounds.from}_${bounds.to}.xlsx`,
      sheetName: 'So sánh nhân viên',
      title: 'BẢNG SO SÁNH NHÂN VIÊN',
      subtitle: `${bounds.label} (${fmtDate(bounds.from)} – ${fmtDate(bounds.to)}) · ${rows.length} nhân viên`,
      headers: ['STT', 'Nhân viên', 'Việc giao', 'Đã xong', 'Đúng hạn (%)', 'Quá hạn', 'Điểm gợi ý', 'Thưởng', 'Phạt', 'TB thưởng/phạt tháng', 'Điểm tiêu chí', 'Điểm cuối', 'Xếp loại'],
      rows: [
        ...sorted.map((row, index) => [
          index + 1,
          row.fullName,
          row.assigned,
          row.done,
          row.onTimeRate ?? '',
          row.overdue,
          row.suggested ?? '',
          row.bonus,
          row.penalty,
          row.rewardAvg,
          row.criteria ?? '',
          row.final ?? '',
          row.rank || row.evalLabel,
        ]),
        ['', 'Trung bình khoa', avg.assigned ?? '', avg.done ?? '', avg.onTimeRate ?? '', avg.overdue ?? '', avg.suggested ?? '', avg.bonus ?? '', avg.penalty ?? '', avg.rewardAvg ?? '', avg.criteria ?? '', avg.final ?? '', ''],
      ],
    });

  return (
    <div className="space-y-4 p-4">
      {/* Kỳ so sánh */}
      <div className="flex flex-wrap items-center gap-2">
        <Segmented<CompareKind>
          size="sm"
          value={period.kind}
          onChange={kind => setPeriod(comparePeriodOf(today, kind))}
          items={[
            { value: 'month', label: 'Tháng' },
            { value: 'quarter', label: 'Quý' },
            { value: 'year', label: 'Năm' },
          ]}
        />
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" iconOnly icon={ChevronLeft} onClick={() => setPeriod(shiftPeriod(period, -1))} aria-label="Kỳ trước" />
          <span className="min-w-[96px] text-center text-sm font-semibold text-fg">{bounds.label}</span>
          <Button size="sm" variant="ghost" iconOnly icon={ChevronRight} onClick={() => setPeriod(shiftPeriod(period, 1))} aria-label="Kỳ sau" />
        </div>
        <span className="text-xs text-muted">
          {fmtDate(bounds.from)} – {fmtDate(bounds.to)}
          {period.kind === 'month' && ' · đánh giá lấy theo quý chứa tháng này'}
        </span>
        <Button size="sm" variant="soft" icon={Download} className="ml-auto" onClick={exportExcel} disabled={!rows.length}>
          Xuất Excel
        </Button>
      </div>

      {!rows.length ? (
        <EmptyState icon={BarChart3} title="Không có nhân viên phù hợp" />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <SectionCard
              title="Xếp hạng theo chỉ số"
              description="Vạch đứt là trung bình khoa — người dưới vạch cần chú ý"
              icon={BarChart3}
              bodyClassName="p-4"
              actions={
                <Segmented<Metric>
                  size="sm"
                  value={metric}
                  onChange={setMetric}
                  items={(Object.keys(METRICS) as Metric[]).map(value => ({ value, label: METRICS[value].label }))}
                />
              }
            >
              <RankingChart rows={rows} metric={metric} onOpen={onOpen} />
            </SectionCard>
            <SectionCard title="Thưởng / phạt trong kỳ" description="Phạt sang trái, thưởng sang phải — bị trừ nhiều xếp trên" icon={Gift} bodyClassName="p-4">
              <RewardChart rows={rows} onOpen={onOpen} />
            </SectionCard>
          </div>

          <div className="scrollbar-thin overflow-x-auto rounded-2xl border border-line">
            <table className="w-full min-w-[980px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-line bg-sunken/60 text-[11px] font-semibold uppercase tracking-wide text-muted">
                  <th className="sticky left-0 z-10 bg-sunken px-3 py-1.5 text-left" />
                  <th colSpan={5} className="border-l border-line px-2 py-1.5 text-center">Công việc</th>
                  <th colSpan={3} className="border-l border-line px-2 py-1.5 text-center">Thưởng / phạt</th>
                  <th colSpan={3} className="border-l border-line px-2 py-1.5 text-center">Đánh giá</th>
                </tr>
                <tr className="border-b border-line text-xs text-muted">
                  <HeaderCell label="Nhân viên" sortKey="fullName" sort={sort} onSort={onSort} align="left" className="sticky left-0 z-10 bg-surface px-3" />
                  <HeaderCell label="Giao" sortKey="assigned" sort={sort} onSort={onSort} />
                  <HeaderCell label="Xong" sortKey="done" sort={sort} onSort={onSort} />
                  <HeaderCell label="Đúng hạn" sortKey="onTimeRate" sort={sort} onSort={onSort} />
                  <HeaderCell label="Quá hạn" sortKey="overdue" sort={sort} onSort={onSort} />
                  <HeaderCell label="Gợi ý" sortKey="suggested" sort={sort} onSort={onSort} />
                  <HeaderCell label="Thưởng" sortKey="bonus" sort={sort} onSort={onSort} />
                  <HeaderCell label="Phạt" sortKey="penalty" sort={sort} onSort={onSort} />
                  <HeaderCell label="TB tháng" sortKey="rewardAvg" sort={sort} onSort={onSort} />
                  <HeaderCell label="Tiêu chí" sortKey="criteria" sort={sort} onSort={onSort} />
                  <HeaderCell label="Điểm cuối" sortKey="final" sort={sort} onSort={onSort} />
                  <th className="px-3 py-2 text-left font-medium">Xếp loại</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map(row => {
                  const lowOnTime = row.onTimeRate !== null && avg.onTimeRate !== null && row.onTimeRate < avg.onTimeRate - 15;
                  return (
                    <tr key={row.username} onClick={() => onOpen(row.username)} className="cursor-pointer border-b border-line last:border-0 hover:bg-sunken/60">
                      <td className="sticky left-0 z-10 bg-surface px-3 py-2 font-medium text-fg">{row.fullName}</td>
                      <td className="num border-l border-line px-2 text-right text-fg">{row.assigned}</td>
                      <td className="num px-2 text-right text-fg">{row.done}</td>
                      <td className={cn('num px-2 text-right', lowOnTime ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-fg')} title={lowOnTime ? 'Thấp hơn TB khoa hơn 15 điểm' : undefined}>
                        {row.onTimeRate === null ? <span className="text-faint">—</span> : `${row.onTimeRate}%`}
                      </td>
                      <td className={cn('num px-2 text-right', row.overdue ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-faint')}>{row.overdue}</td>
                      <td className="num px-2 text-right text-fg">{row.suggested ?? <span className="text-faint">—</span>}</td>
                      <td className={cn('num border-l border-line px-2 text-right', row.bonus ? BONUS_TEXT : 'text-faint')}>+{row.bonus}</td>
                      <td className={cn('num px-2 text-right', row.penalty ? PENALTY_TEXT : 'text-faint')}>−{row.penalty}</td>
                      <td className="px-2 text-right">
                        <SignedCell value={row.rewardAvg} />
                      </td>
                      <td className="num border-l border-line px-2 text-right text-fg">{row.criteria ?? <span className="text-faint">—</span>}</td>
                      <td className="num px-2 text-right font-semibold text-fg">{row.final ?? <span className="font-normal text-faint">—</span>}</td>
                      <td className="px-3">
                        {row.rank ? (
                          <Badge tone={RANK_TONE[row.rank] || 'neutral'} icon={Star}>
                            {row.rank}
                          </Badge>
                        ) : (
                          <span className="text-xs text-faint">{row.evalLabel}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-line bg-sunken/60 text-xs font-semibold text-muted">
                  <td className="sticky left-0 z-10 bg-sunken px-3 py-2">Trung bình khoa</td>
                  {[avg.assigned, avg.done].map((value, index) => (
                    <td key={index} className={cn('num px-2 text-right', index === 0 && 'border-l border-line')}>
                      {value ?? '—'}
                    </td>
                  ))}
                  <td className="num px-2 text-right">{avg.onTimeRate === null ? '—' : `${avg.onTimeRate}%`}</td>
                  <td className="num px-2 text-right">{avg.overdue ?? '—'}</td>
                  <td className="num px-2 text-right">{avg.suggested ?? '—'}</td>
                  <td className="num border-l border-line px-2 text-right">+{avg.bonus ?? 0}</td>
                  <td className="num px-2 text-right">−{avg.penalty ?? 0}</td>
                  <td className="num px-2 text-right">{fmtSigned(avg.rewardAvg ?? 0)}</td>
                  <td className="num border-l border-line px-2 text-right">{avg.criteria ?? '—'}</td>
                  <td className="num px-2 text-right">{avg.final ?? '—'}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs text-muted">
            Đúng hạn = xong đúng hạn / (đã xong + quá hạn). Gợi ý: xong đúng hạn 100, xong trễ 50, quá hạn 0. TB tháng = (thưởng − phạt) ÷ số tháng của kỳ. Bấm tiêu đề cột để xếp, bấm dòng để mở hồ sơ.
          </p>
        </>
      )}
    </div>
  );
};
