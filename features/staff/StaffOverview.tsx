import React, { useMemo, useState } from 'react';
import { AlertTriangle, Award, BarChart3, CheckCircle2, ClipboardList, Clock, LayoutGrid, List, PieChart, Plus, Star, Timer, TrendingUp, UsersRound } from 'lucide-react';
import type { StaffEvaluation, StaffTask } from '../../types';
import { addDays, fmtDate, relativeDay, startOfWeek, toDateKey } from '../../lib/dates';
import { compactName, matchesQuery } from '../../lib/text';
import { cn } from '../../lib/cn';
import type { Tone } from '../../lib/domain';
import {
  Avatar,
  Badge,
  BarList,
  Button,
  ChartLegend,
  ColumnChart,
  DataTable,
  Drawer,
  EmptyState,
  Progress,
  SearchInput,
  Segmented,
  Select,
  SkeletonRows,
  ProportionBar,
  SectionCard,
  StackedBarList,
  StatCard,
  Toolbar,
  type Column,
  type StackSeries,
} from '../../components/ui';
import { RANK_TONE, byPeriodDesc, isDone, isOverdue, type StaffGroup, type StaffSummary } from './staffLogic';
import { EvaluationCard } from './StaffEvaluations';

const LOAD_META: Record<StaffSummary['load'], { label: string; tone: Tone; stripe: string }> = {
  over: { label: 'Cần chú ý', tone: 'danger', stripe: 'before:bg-rose-500' },
  busy: { label: 'Đang bận', tone: 'warning', stripe: 'before:bg-amber-500' },
  ok: { label: 'Bình thường', tone: 'success', stripe: 'before:bg-emerald-500' },
  idle: { label: 'Chưa có việc', tone: 'neutral', stripe: 'before:bg-slate-300 dark:before:bg-slate-600' },
};

const GROUP_LABEL: Record<StaffGroup, string> = { BS: 'Bác sĩ', DD: 'Điều dưỡng', KHAC: 'Khác' };
const LOAD_RANK: Record<StaffSummary['load'], number> = { over: 0, busy: 1, ok: 2, idle: 3 };

type Sort = 'attention' | 'open' | 'score' | 'name';

const STATUS_SERIES: StackSeries[] = [
  { key: 'overdue', label: 'Quá hạn', className: 'bg-rose-500' },
  { key: 'active', label: 'Đang làm (còn hạn)', className: 'bg-sky-500' },
  { key: 'done', label: 'Hoàn thành', className: 'bg-emerald-500' },
];

const WEEKS = 8;

export const StaffOverview: React.FC<{
  people: StaffSummary[];
  tasks: StaffTask[];
  today: string;
  unassignedCount: number;
  loading: boolean;
  onOpen: (username: string) => void;
  onAssign: (username: string) => void;
}> = ({ people, tasks, today, unassignedCount, loading, onOpen, onAssign }) => {
  const [showAllBars, setShowAllBars] = useState(false);
  const [search, setSearch] = useState('');
  const [group, setGroup] = useState<'all' | StaffGroup>('all');
  const [sort, setSort] = useState<Sort>('attention');
  const [view, setView] = useState<'cards' | 'table'>('cards');

  const totals = useMemo(() => {
    const open = people.reduce((sum, person) => sum + person.open, 0);
    const overdue = people.reduce((sum, person) => sum + person.overdue, 0);
    const scored = people.filter(person => person.latestScore !== null);
    const due = people.filter(person => person.onTime !== null);
    return {
      staff: people.length,
      busy: people.filter(person => person.open > 0).length,
      open,
      overdue,
      overduePeople: people.filter(person => person.overdue > 0).length,
      dueSoon: people.reduce((sum, person) => sum + person.dueSoon, 0),
      onTime: due.length ? Math.round(due.reduce((sum, person) => sum + (person.onTime || 0), 0) / due.length) : null,
      avgScore: scored.length ? Math.round(scored.reduce((sum, person) => sum + (person.latestScore || 0), 0) / scored.length) : null,
      unscored: people.length - scored.length,
    };
  }, [people]);

  const charts = useMemo(() => {
    const bars = people
      .filter(person => person.total > 0)
      .sort((a, b) => b.overdue - a.overdue || b.open - a.open || b.total - a.total)
      .map(person => ({
        key: person.username,
        label: compactName(person.fullName),
        title: person.fullName,
        values: { overdue: person.overdue, active: person.open - person.overdue, done: person.done },
      }));
    const status = bars.reduce(
      (acc, row) => ({ overdue: acc.overdue + row.values.overdue, active: acc.active + row.values.active, done: acc.done + row.values.done }),
      { overdue: 0, active: 0, done: 0 },
    );
    const firstWeek = addDays(startOfWeek(today), -7 * (WEEKS - 1));
    const weekly = Array.from({ length: WEEKS }, (_, index) => {
      const start = addDays(firstWeek, index * 7);
      const end = addDays(start, 6);
      const assigned = tasks.filter(task => {
        const key = toDateKey(task.ngayGiao);
        return key >= start && key <= end;
      });
      return {
        key: start,
        label: fmtDate(start).slice(0, 5),
        value: assigned.length,
        tooltip: `Tuần ${fmtDate(start).slice(0, 5)}–${fmtDate(end).slice(0, 5)}: ${assigned.length} việc được giao, ${assigned.filter(isDone).length} đã xong`,
        highlight: index === WEEKS - 1,
      };
    });
    const scores = people
      .filter(person => person.latestScore !== null)
      .sort((a, b) => (b.latestScore || 0) - (a.latestScore || 0))
      .map(person => ({ key: person.username, label: compactName(person.fullName), value: person.latestScore || 0, hint: `${person.latestRank} · ${person.latestPeriod}` }));
    return { bars, status, weekly, scores };
  }, [people, tasks, today]);

  const groupCounts = useMemo(() => {
    const result: Record<string, number> = { BS: 0, DD: 0, KHAC: 0 };
    people.forEach(person => (result[person.group] += 1));
    return result;
  }, [people]);

  const rows = useMemo(() => {
    const filtered = people.filter(person => (group === 'all' || person.group === group) && matchesQuery(search, person.fullName, person.username));
    return filtered.sort((a, b) => {
      if (sort === 'open') return b.open - a.open || b.overdue - a.overdue;
      if (sort === 'score') return (b.latestScore ?? -1) - (a.latestScore ?? -1);
      if (sort === 'name') return a.fullName.localeCompare(b.fullName, 'vi');
      return LOAD_RANK[a.load] - LOAD_RANK[b.load] || b.overdue - a.overdue || b.open - a.open || a.fullName.localeCompare(b.fullName, 'vi');
    });
  }, [people, group, search, sort]);

  const columns: Column<StaffSummary>[] = [
    {
      key: 'name',
      header: 'Nhân viên',
      sort: person => person.fullName,
      cell: person => (
        <div className="flex items-center gap-3">
          <Avatar name={person.fullName} size="sm" />
          <div>
            <p className="font-medium text-fg">{person.fullName}</p>
            <p className="text-xs text-muted">{GROUP_LABEL[person.group]}</p>
          </div>
        </div>
      ),
    },
    { key: 'load', header: 'Tình trạng', sort: person => LOAD_RANK[person.load], cell: person => <Badge tone={LOAD_META[person.load].tone} dot>{LOAD_META[person.load].label}</Badge> },
    { key: 'open', header: 'Đang mở', align: 'center', sort: person => person.open, cell: person => <span className="num font-semibold text-fg">{person.open}</span> },
    {
      key: 'overdue',
      header: 'Quá hạn',
      align: 'center',
      sort: person => person.overdue,
      cell: person => <span className={cn('num font-semibold', person.overdue ? 'text-rose-600 dark:text-rose-400' : 'text-faint')}>{person.overdue}</span>,
    },
    { key: 'soon', header: 'Sắp đến hạn', align: 'center', hideBelow: 'lg', sort: person => person.dueSoon, cell: person => <span className={cn('num', person.dueSoon ? 'text-amber-600' : 'text-faint')}>{person.dueSoon}</span> },
    { key: 'done', header: 'Hoàn thành', align: 'center', hideBelow: 'md', sort: person => person.done, cell: person => <span className="num text-muted">{person.done}/{person.total}</span> },
    {
      key: 'ontime',
      header: 'Đúng hạn',
      hideBelow: 'lg',
      sort: person => person.onTime ?? -1,
      cell: person => (person.onTime === null ? <span className="text-faint">—</span> : <Progress value={person.onTime} className="w-28" showLabel tone={person.onTime >= 80 ? 'success' : person.onTime >= 50 ? 'warning' : 'danger'} />),
    },
    {
      key: 'score',
      header: 'Đánh giá gần nhất',
      sort: person => person.latestScore ?? -1,
      cell: person =>
        person.latestScore === null ? (
          <span className="text-xs text-faint">Chưa đánh giá</span>
        ) : (
          <Badge tone={RANK_TONE[person.latestRank] || 'neutral'} icon={Star}>
            {person.latestScore} · {person.latestPeriod}
          </Badge>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: person => (
        <div onClick={event => event.stopPropagation()}>
          <Button size="sm" variant="ghost" icon={Plus} onClick={() => onAssign(person.username)}>
            Giao việc
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      {/* Chỉ số toàn khoa */}
      <div className="grid grid-cols-2 gap-3 border-b border-line p-4 lg:grid-cols-5">
        <StatCard label="Nhân sự" value={loading ? '…' : totals.staff} icon={UsersRound} tone="primary" hint={`${totals.busy} người đang có việc`} />
        <StatCard label="Việc đang mở" value={loading ? '…' : totals.open} icon={ClipboardList} tone="info" hint={`${totals.dueSoon} việc đến hạn trong 3 ngày`} />
        <StatCard
          label="Việc quá hạn"
          value={loading ? '…' : totals.overdue}
          icon={AlertTriangle}
          tone={totals.overdue ? 'danger' : 'success'}
          hint={totals.overduePeople ? `${totals.overduePeople} người cần đôn đốc` : 'Không ai trễ hạn'}
          onClick={totals.overdue ? () => setSort('attention') : undefined}
        />
        <StatCard label="Tỷ lệ đúng hạn" value={loading ? '…' : totals.onTime === null ? '—' : `${totals.onTime}%`} icon={Timer} tone="violet" hint="Trên các việc đã đến hạn" />
        <StatCard
          label="Điểm đánh giá TB"
          value={loading ? '…' : totals.avgScore ?? '—'}
          icon={Award}
          tone="success"
          hint={totals.unscored ? `${totals.unscored} người chưa được đánh giá` : 'Theo lần đánh giá gần nhất'}
          className="col-span-2 lg:col-span-1"
        />
      </div>

      {/* Biểu đồ trực quan */}
      {!loading && (
        <div className="grid grid-cols-1 gap-4 border-b border-line bg-sunken/40 p-4 xl:grid-cols-3">
          <SectionCard
            className="xl:col-span-2"
            title="Phân bổ công việc theo nhân viên"
            description="Bấm vào một người để xem chi tiết · rê chuột để xem số liệu"
            icon={BarChart3}
            actions={<ChartLegend series={STATUS_SERIES} className="hidden md:flex" />}
            bodyClassName="p-3 sm:p-4"
          >
            <ChartLegend series={STATUS_SERIES} className="mb-3 md:hidden" />
            <StackedBarList
              rows={showAllBars ? charts.bars : charts.bars.slice(0, 10)}
              series={STATUS_SERIES}
              onSelect={onOpen}
              emptyText="Chưa có công việc nào được giao"
            />
            {charts.bars.length > 10 && (
              <button onClick={() => setShowAllBars(value => !value)} className="mt-2 text-xs font-medium text-primary hover:underline">
                {showAllBars ? 'Thu gọn' : `Xem cả ${charts.bars.length} người`}
              </button>
            )}
          </SectionCard>
          <div className="space-y-4">
            <SectionCard title="Tình trạng công việc toàn khoa" icon={PieChart} bodyClassName="p-4">
              <ProportionBar series={STATUS_SERIES} values={charts.status} />
            </SectionCard>
            <SectionCard title={`Việc được giao ${WEEKS} tuần gần nhất`} icon={TrendingUp} iconTone="info" bodyClassName="p-4">
              <ColumnChart data={charts.weekly} height={120} valueLabel="việc" />
            </SectionCard>
            {charts.scores.length > 0 && (
              <SectionCard title="Điểm đánh giá gần nhất" icon={Award} iconTone="success" bodyClassName="p-4">
                <BarList tone="success" showPercent={false} data={charts.scores.slice(0, 8)} onSelect={onOpen} />
              </SectionCard>
            )}
          </div>
        </div>
      )}

      <Toolbar>
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm nhân viên…" className="sm:w-60" />
        <Segmented<'all' | StaffGroup>
          size="sm"
          value={group}
          onChange={setGroup}
          items={[
            { value: 'all', label: 'Tất cả', count: people.length },
            { value: 'BS', label: 'Bác sĩ', count: groupCounts.BS },
            { value: 'DD', label: 'Điều dưỡng', count: groupCounts.DD },
            ...(groupCounts.KHAC ? [{ value: 'KHAC' as StaffGroup, label: 'Khác', count: groupCounts.KHAC }] : []),
          ]}
        />
        <div className="flex items-center gap-2 sm:ml-auto">
          <Select
            value={sort}
            onChange={event => setSort(event.target.value as Sort)}
            className="h-8 w-44 text-[13px]"
            options={[
              { value: 'attention', label: 'Cần chú ý trước' },
              { value: 'open', label: 'Nhiều việc nhất' },
              { value: 'score', label: 'Điểm đánh giá cao' },
              { value: 'name', label: 'Theo tên' },
            ]}
          />
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            items={[
              { value: 'cards', label: 'Thẻ', icon: LayoutGrid },
              { value: 'table', label: 'Bảng', icon: List },
            ]}
          />
        </div>
      </Toolbar>

      {unassignedCount > 0 && (
        <p className="border-b border-line bg-amber-500/[0.06] px-4 py-2 text-xs text-amber-700 dark:text-amber-300">
          Có {unassignedCount} công việc giao cho tài khoản không còn trong danh bạ (đã khoá/xoá) — xem ở tab Toàn khoa.
        </p>
      )}

      {loading ? (
        <SkeletonRows />
      ) : rows.length === 0 ? (
        <EmptyState icon={UsersRound} title="Không có nhân viên phù hợp" />
      ) : view === 'table' ? (
        <DataTable rows={rows} columns={columns} rowKey={person => person.username} onRowClick={person => onOpen(person.username)} />
      ) : (
        <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
          {rows.map(person => {
            const meta = LOAD_META[person.load];
            return (
              <div
                key={person.username}
                role="button"
                tabIndex={0}
                onClick={() => onOpen(person.username)}
                onKeyDown={event => event.key === 'Enter' && onOpen(person.username)}
                className={cn(
                  'group relative cursor-pointer overflow-hidden rounded-2xl border border-line bg-surface p-4 transition-all before:absolute before:inset-y-0 before:left-0 before:w-1 hover:-translate-y-0.5 hover:shadow-pop',
                  meta.stripe,
                )}
              >
                <div className="flex items-center gap-3">
                  <Avatar name={person.fullName} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-fg group-hover:text-primary">{person.fullName}</p>
                    <p className="text-xs text-muted">{GROUP_LABEL[person.group]}</p>
                  </div>
                  <Badge tone={meta.tone}>{meta.label}</Badge>
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-sunken py-2">
                    <dt className="text-[11px] text-muted">Đang mở</dt>
                    <dd className="num text-lg font-semibold text-fg">{person.open}</dd>
                  </div>
                  <div className={cn('rounded-xl py-2', person.overdue ? 'bg-rose-500/10' : 'bg-sunken')}>
                    <dt className="text-[11px] text-muted">Quá hạn</dt>
                    <dd className={cn('num text-lg font-semibold', person.overdue ? 'text-rose-600 dark:text-rose-400' : 'text-faint')}>{person.overdue}</dd>
                  </div>
                  <div className="rounded-xl bg-sunken py-2">
                    <dt className="text-[11px] text-muted">Hoàn thành</dt>
                    <dd className="num text-lg font-semibold text-fg">{person.done}</dd>
                  </div>
                </dl>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>Tỷ lệ hoàn thành</span>
                    <span>{person.dueSoon > 0 && <span className="mr-2 text-amber-600">{person.dueSoon} sắp đến hạn</span>}{person.total ? `${person.completion}%` : '—'}</span>
                  </div>
                  <Progress value={person.completion} />
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
                  {person.latestScore === null ? (
                    <span className="text-xs text-faint">Chưa đánh giá</span>
                  ) : (
                    <Badge tone={RANK_TONE[person.latestRank] || 'neutral'} icon={Star}>
                      {person.latestRank} · {person.latestScore} ({person.latestPeriod})
                    </Badge>
                  )}
                  <Button
                    size="xs"
                    variant="soft"
                    icon={Plus}
                    onClick={event => {
                      event.stopPropagation();
                      onAssign(person.username);
                    }}
                  >
                    Giao việc
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

/** Hồ sơ công việc của một nhân viên: việc đang mở, đã xong, lịch sử đánh giá. */
export const StaffPersonDrawer: React.FC<{
  person: StaffSummary | null;
  evaluations: StaffEvaluation[];
  today: string;
  onClose: () => void;
  onOpenTask: (task: StaffTask) => void;
  onComplete: (task: StaffTask) => void;
  onAssign: (username: string) => void;
  /** Chỉ trưởng khoa / điều dưỡng trưởng mới có nút đánh giá. */
  onEvaluate?: (username: string) => void;
}> = ({ person, evaluations, today, onClose, onOpenTask, onComplete, onAssign, onEvaluate }) => {
  if (!person) return null;
  const open = person.tasks
    .filter(task => !isDone(task))
    .sort((a, b) => Number(isOverdue(b, today)) - Number(isOverdue(a, today)) || (a.hanHoanThanh || '9999').localeCompare(b.hanHoanThanh || '9999'));
  const done = person.tasks.filter(isDone).sort((a, b) => String(b.hanHoanThanh).localeCompare(String(a.hanHoanThanh))).slice(0, 8);
  const evals = evaluations.filter(item => item.userId === person.username).sort(byPeriodDesc);
  const meta = LOAD_META[person.load];

  const taskRow = (task: StaffTask) => {
    const overdue = isOverdue(task, today);
    const finished = isDone(task);
    return (
      <li key={task.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
        <button
          onClick={() => !finished && onComplete(task)}
          className={cn('mt-0.5 shrink-0', finished ? 'cursor-default text-emerald-500' : 'text-faint hover:text-emerald-500')}
          aria-label="Đánh dấu hoàn thành"
          title={finished ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
        >
          <CheckCircle2 className="h-5 w-5" />
        </button>
        <button onClick={() => onOpenTask(task)} className="min-w-0 flex-1 text-left">
          <p className={cn('text-sm font-medium', finished ? 'text-muted line-through' : 'text-fg')}>{task.tieuDe || '(Không tiêu đề)'}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
            {task.hanHoanThanh && (
              <span className={cn('inline-flex items-center gap-1', overdue && 'font-semibold text-rose-600 dark:text-rose-400')}>
                <Clock className="h-3 w-3" /> {fmtDate(task.hanHoanThanh)} · {relativeDay(task.hanHoanThanh)}
              </span>
            )}
            {task.mucDoUuTien !== 'Trung bình' && <Badge tone={task.mucDoUuTien === 'Khẩn' ? 'danger' : task.mucDoUuTien === 'Cao' ? 'warning' : 'neutral'}>{task.mucDoUuTien}</Badge>}
            {!finished && <Progress value={Number(task.tienDo)} className="w-24" />}
          </div>
        </button>
      </li>
    );
  };

  return (
    <Drawer
      open
      onClose={onClose}
      size="md"
      title={
        <span className="flex items-center gap-2.5">
          <Avatar name={person.fullName} size="sm" /> {person.fullName}
        </span>
      }
      subtitle={
        <span className="flex items-center gap-2">
          {GROUP_LABEL[person.group]} · <Badge tone={meta.tone} dot>{meta.label}</Badge>
        </span>
      }
      footer={
        <>
          {onEvaluate && (
            <Button icon={Award} onClick={() => onEvaluate(person.username)} className="mr-auto">
              Đánh giá
            </Button>
          )}
          <Button variant="primary" icon={Plus} onClick={() => onAssign(person.username)}>
            Giao việc
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <dl className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: 'Đang mở', value: person.open, tone: 'text-fg' },
            { label: 'Quá hạn', value: person.overdue, tone: person.overdue ? 'text-rose-600' : 'text-faint' },
            { label: 'Hoàn thành', value: person.done, tone: 'text-fg' },
            { label: 'Đúng hạn', value: person.onTime === null ? '—' : `${person.onTime}%`, tone: 'text-fg' },
          ].map(item => (
            <div key={item.label} className="rounded-xl bg-sunken py-2.5">
              <dt className="text-[11px] text-muted">{item.label}</dt>
              <dd className={cn('num text-lg font-semibold', item.tone)}>{item.value}</dd>
            </div>
          ))}
        </dl>

        <section>
          <h3 className="mb-2 text-sm font-semibold text-fg">Việc đang thực hiện ({open.length})</h3>
          {open.length ? <ul className="space-y-2">{open.map(taskRow)}</ul> : <EmptyState compact icon={CheckCircle2} title="Không có việc đang mở" />}
        </section>

        {done.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold text-fg">Đã hoàn thành gần đây</h3>
            <ul className="space-y-2">{done.map(taskRow)}</ul>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-sm font-semibold text-fg">Lịch sử đánh giá</h3>
          {evals.length === 0 ? (
            <p className="text-sm text-muted">Chưa có bản đánh giá nào.</p>
          ) : (
            <ul className="space-y-3">
              {evals.map(evaluation => (
                <li key={evaluation.id}>
                  <EvaluationCard evaluation={evaluation} compact />
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Drawer>
  );
};
