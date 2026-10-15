import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  Copy,
  Edit3,
  HeartPulse,
  ListChecks,
  Moon,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Sun,
  Sunset,
  Trash2,
} from 'lucide-react';
import type { NursingTask } from '../../types';
import { addNursingTask, batchAddNursingTasks, deleteNursingTask, getNursingTasks, updateNursingTask } from '../../services/dataService';
import { KEYS, useOperations, usePersonnel } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { mutateCache, useResource } from '../../lib/resource';
import { addDays, fmtDate, relativeDay, startOfWeek, todayKey, toDateKey, weekdayLong, weekdayShort } from '../../lib/dates';
import { readPref, writePref } from '../../lib/prefs';
import { cn } from '../../lib/cn';
import { useApp } from '../../context/AppContext';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  ChipGroup,
  Combobox,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  FormGrid,
  Input,
  Menu,
  PageHeader,
  Progress,
  Segmented,
  Select,
  Skeleton,
  Textarea,
  confirmAction,
  namesToOptions,
  showToast,
} from '../../components/ui';
import {
  DEFAULT_TEMPLATES,
  PRIORITIES,
  SHIFTS,
  STATUSES,
  buildCopy,
  nextStatus,
  normalizeShift,
  normalizeStatus,
  normalizeTask,
  progressOf,
  sortTasks,
  type Shift,
} from './nursingLogic';

const SHIFT_META: Record<Shift, { icon: React.ElementType; tone: string; hours: string }> = {
  Sáng: { icon: Sun, tone: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', hours: '7h – 11h30' },
  Chiều: { icon: Sunset, tone: 'bg-orange-500/10 text-orange-600 dark:text-orange-400', hours: '13h30 – 17h' },
  Đêm: { icon: Moon, tone: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400', hours: '17h – 7h' },
};

const TEMPLATE_KEY = 'kn_nursing_templates';

const useNursingRange = (from: string, to: string) =>
  useResource<NursingTask[]>(`${KEYS.nursing}:${from}:${to}`, async options => (await getNursingTasks(from, to, options)).map(normalizeTask));

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const value = normalizeStatus(status);
  if (value === 'Hoàn thành') return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (value === 'Đang làm') return <CircleDot className="h-5 w-5 text-sky-500" />;
  return <Circle className="h-5 w-5 text-faint" />;
};

export const NursingPage: React.FC = () => {
  const { user } = useApp();
  const [params, setParams] = useSearchParams();
  const today = todayKey();
  const date = toDateKey(params.get('date')) || today;
  const view = params.get('view') === 'week' ? 'week' : 'day';
  const weekStart = startOfWeek(date);

  const dayRes = useNursingRange(date, date);
  const weekRes = useNursingRange(view === 'week' ? weekStart : date, view === 'week' ? addDays(weekStart, 6) : date);
  const prevRes = useNursingRange(addDays(date, -1), addDays(date, -1));
  const { nurses } = usePersonnel();
  const { data: ops } = useOperations();
  const { run, pending } = useAction();

  const [editing, setEditing] = useState<Partial<NursingTask> | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [quickText, setQuickText] = useState<Record<Shift, string>>({ Sáng: '', Chiều: '', Đêm: '' });

  const cacheKey = `${KEYS.nursing}:${date}:${date}`;
  const tasks = useMemo(() => dayRes.data || [], [dayRes.data]);
  const byShift = useMemo(() => {
    const map: Record<Shift, NursingTask[]> = { Sáng: [], Chiều: [], Đêm: [] };
    tasks.forEach(task => map[normalizeShift(task.shift)].push(task));
    (Object.keys(map) as Shift[]).forEach(key => (map[key] = sortTasks(map[key])));
    return map;
  }, [tasks]);
  const progress = progressOf(tasks);

  const onCall = useMemo(() => (ops?.shifts || []).find(shift => toDateKey(shift.date) === date), [ops, date]);
  const assigneeOptions = useMemo(() => {
    const preferred = [onCall?.nurse1, onCall?.nurse2].filter(Boolean) as string[];
    return [
      ...preferred.map(name => ({ value: name, label: name, description: 'Trực hôm nay' })),
      ...namesToOptions(nurses).filter(option => !preferred.includes(option.value)),
    ];
  }, [nurses, onCall]);

  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing({ date, shift: 'Sáng', status: 'Chưa làm', priority: 'Thường' });
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const setParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setParams(next, { replace: true });
  };

  const refreshAll = [KEYS.nursing, KEYS.ops];

  const cycle = async (task: NursingTask) => {
    const status = nextStatus(task.status);
    mutateCache<NursingTask[]>(cacheKey, current => (current || []).map(item => (item.id === task.id ? { ...item, status } : item)));
    await run(`status-${task.id}`, () => updateNursingTask(task.id, { status }), { error: 'Không cập nhật được trạng thái', invalidate: [KEYS.ops] });
  };

  const quickAdd = async (shift: Shift) => {
    const text = quickText[shift].trim();
    if (!text) return;
    setQuickText(current => ({ ...current, [shift]: '' }));
    await run(`quick-${shift}`, () => addNursingTask({ date, shift, task: text, status: 'Chưa làm', priority: 'Thường' }), { invalidate: refreshAll });
  };

  const save = async () => {
    if (!editing?.task?.trim()) return showToast('Vui lòng nhập nội dung công việc', 'warning');
    const payload = { ...editing, task: editing.task.trim(), date: editing.date || date };
    const result = await run('save', () => (payload.id ? updateNursingTask(payload.id, payload) : addNursingTask(payload)), {
      success: payload.id ? 'Đã cập nhật công việc' : 'Đã thêm công việc',
      invalidate: refreshAll,
    });
    if (result !== undefined) setEditing(null);
  };

  const remove = async (task: NursingTask) => {
    const ok = await confirmAction({ title: 'Xoá công việc này?', message: task.task, confirmText: 'Xoá' });
    if (!ok) return;
    mutateCache<NursingTask[]>(cacheKey, current => (current || []).filter(item => item.id !== task.id));
    await run(`delete-${task.id}`, () => deleteNursingTask(task.id), { success: 'Đã xoá', invalidate: refreshAll });
  };

  const copyYesterday = async () => {
    const source = prevRes.data || [];
    if (!source.length) return showToast(`Ngày ${fmtDate(addDays(date, -1))} không có việc nào để sao chép`, 'info');
    const items = buildCopy(source, date, tasks);
    if (!items.length) return showToast('Các việc của hôm trước đã có sẵn trong ngày này', 'info');
    await run('copy', () => batchAddNursingTasks(items), { success: `Đã sao chép ${items.length} việc từ hôm trước`, invalidate: refreshAll });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Công tác điều dưỡng"
        icon={HeartPulse}
        description="Phân việc và theo dõi tiến độ theo ca Sáng – Chiều – Đêm"
        actions={
          <>
            <Segmented
              value={view}
              onChange={value => setParam({ view: value === 'week' ? 'week' : null })}
              items={[
                { value: 'day', label: 'Ngày', icon: ListChecks },
                { value: 'week', label: 'Tuần', icon: CalendarRange },
              ]}
            />
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={dayRes.validating} onClick={() => dayRes.reload()} aria-label="Làm mới" />
            <Button variant="primary" icon={Plus} onClick={() => setEditing({ date, shift: 'Sáng', status: 'Chưa làm', priority: 'Thường' })}>
              Thêm việc
            </Button>
          </>
        }
      />

      {/* Điều hướng ngày */}
      <Card className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center sm:px-4">
        <div className="flex flex-wrap items-center gap-1">
          <Button size="sm" variant="ghost" iconOnly icon={ChevronLeft} onClick={() => setParam({ date: addDays(date, view === 'week' ? -7 : -1) })} aria-label="Trước" />
          <div className="min-w-[180px] text-center">
            <p className="text-sm font-semibold text-fg">
              {view === 'week' ? `Tuần ${fmtDate(weekStart).slice(0, 5)} – ${fmtDate(addDays(weekStart, 6))}` : `${weekdayLong(date)}, ${fmtDate(date)}`}
            </p>
            {view === 'day' && <p className="text-xs text-muted">{relativeDay(date)}</p>}
          </div>
          <Button size="sm" variant="ghost" iconOnly icon={ChevronRight} onClick={() => setParam({ date: addDays(date, view === 'week' ? 7 : 1) })} aria-label="Sau" />
          {date !== today && (
            <Button size="sm" variant="soft" onClick={() => setParam({ date: null })}>
              Hôm nay
            </Button>
          )}
          <Input type="date" value={date} onChange={event => setParam({ date: event.target.value || null })} className="ml-1 h-8 w-36 text-[13px]" />
        </div>
        {view === 'day' && (
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
            <div className="flex min-w-[200px] items-center gap-3">
              <span className="text-xs text-muted">Hoàn thành</span>
              <Progress value={progress.pct} className="flex-1" showLabel />
            </div>
            <div className="flex gap-2">
              <Button size="sm" icon={ListChecks} onClick={() => setTemplatesOpen(true)}>
                Việc thường quy
              </Button>
              <Button size="sm" icon={Copy} loading={pending === 'copy'} onClick={copyYesterday}>
                Chép hôm trước
              </Button>
            </div>
          </div>
        )}
      </Card>

      {onCall && view === 'day' && (
        <p className="flex flex-wrap items-center gap-2 px-1 text-sm text-muted">
          Kíp trực: <b className="font-medium text-fg">{onCall.doctor}</b>
          {[onCall.nurse1, onCall.nurse2].filter(Boolean).map(name => (
            <span key={name} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2 py-0.5 ring-1 ring-line">
              <Avatar name={name} size="xs" /> {name}
            </span>
          ))}
        </p>
      )}

      {view === 'week' ? (
        <WeekView weekStart={weekStart} tasks={weekRes.data || []} loading={weekRes.loading} onOpenDay={day => setParam({ date: day, view: null })} />
      ) : dayRes.error && !dayRes.data ? (
        <Card>
          <ErrorState error={dayRes.error} onRetry={() => dayRes.reload()} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {SHIFTS.map(shift => {
            const meta = SHIFT_META[shift];
            const list = byShift[shift];
            const shiftProgress = progressOf(list);
            return (
              <Card key={shift} className="flex flex-col">
                <div className="flex items-center gap-3 border-b border-line px-4 py-3">
                  <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', meta.tone)}>
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold text-fg">Ca {shift.toLowerCase()}</p>
                    <p className="text-xs text-muted">{meta.hours}</p>
                  </div>
                  <span className="num text-sm font-semibold text-fg">
                    {shiftProgress.done}/{shiftProgress.total}
                  </span>
                </div>
                <div className="flex-1 p-2">
                  {dayRes.loading ? (
                    <div className="space-y-2 p-2">
                      <Skeleton className="h-10" />
                      <Skeleton className="h-10" />
                    </div>
                  ) : list.length === 0 ? (
                    <EmptyState compact icon={ListChecks} title="Chưa có việc" description="Thêm nhanh ở ô bên dưới" />
                  ) : (
                    <ul className="space-y-1">
                      {list.map(task => {
                        const done = normalizeStatus(task.status) === 'Hoàn thành';
                        return (
                          <li key={task.id} className="group flex items-start gap-2.5 rounded-xl px-2 py-2 hover:bg-sunken/70">
                            <button
                              onClick={() => cycle(task)}
                              className="mt-0.5 shrink-0 rounded-full transition-transform active:scale-90"
                              title={`${normalizeStatus(task.status)} — bấm để chuyển trạng thái`}
                              aria-label="Đổi trạng thái"
                            >
                              <StatusIcon status={task.status} />
                            </button>
                            <div className="min-w-0 flex-1">
                              <p className={cn('text-sm', done ? 'text-muted line-through' : 'text-fg')}>{task.task}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                {task.priority && task.priority !== 'Thường' && <Badge tone={task.priority === 'Khẩn' ? 'danger' : 'warning'}>{task.priority}</Badge>}
                                {normalizeStatus(task.status) === 'Đang làm' && <Badge tone="info">Đang làm</Badge>}
                                {task.assignee && (
                                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                                    <Avatar name={task.assignee} size="xs" /> {task.assignee}
                                  </span>
                                )}
                              </div>
                              {task.note && <p className="mt-1 text-xs text-muted">{task.note}</p>}
                            </div>
                            <Menu
                              className="opacity-100 md:opacity-0 md:group-hover:opacity-100"
                              trigger={({ toggle }) => <Button size="xs" variant="ghost" iconOnly icon={MoreHorizontal} onClick={toggle} aria-label="Thao tác" />}
                              items={[
                                { label: 'Sửa', icon: Edit3, onSelect: () => setEditing(task) },
                                ...STATUSES.filter(status => status !== normalizeStatus(task.status)).map(status => ({
                                  label: `Đánh dấu: ${status}`,
                                  icon: status === 'Hoàn thành' ? CheckCircle2 : status === 'Đang làm' ? CircleDot : Circle,
                                  onSelect: () => {
                                    mutateCache<NursingTask[]>(cacheKey, current => (current || []).map(item => (item.id === task.id ? { ...item, status } : item)));
                                    run(`status-${task.id}`, () => updateNursingTask(task.id, { status }), { invalidate: [KEYS.ops] });
                                  },
                                })),
                                'divider' as const,
                                { label: 'Xoá', icon: Trash2, danger: true, onSelect: () => remove(task) },
                              ]}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
                <form
                  className="flex items-center gap-2 border-t border-line p-2.5"
                  onSubmit={event => {
                    event.preventDefault();
                    quickAdd(shift);
                  }}
                >
                  <Input
                    value={quickText[shift]}
                    onChange={event => setQuickText(current => ({ ...current, [shift]: event.target.value }))}
                    placeholder={`Thêm nhanh việc ca ${shift.toLowerCase()}…`}
                    className="h-9"
                  />
                  <Button type="submit" size="md" iconOnly icon={Plus} variant="soft" loading={pending === `quick-${shift}`} aria-label="Thêm" />
                </form>
              </Card>
            );
          })}
        </div>
      )}

      {/* Sửa / thêm việc */}
      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Sửa công việc' : 'Thêm công việc điều dưỡng'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Huỷ
            </Button>
            <Button variant="primary" loading={pending === 'save'} onClick={save}>
              Lưu
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Nội dung công việc" required>
              <Textarea value={editing.task || ''} onChange={event => setEditing({ ...editing, task: event.target.value })} rows={2} placeholder="VD: Thay băng BN giường 3 buồng 201" />
            </Field>
            <FormGrid>
              <Field label="Ngày">
                <Input type="date" value={editing.date || date} onChange={event => setEditing({ ...editing, date: event.target.value })} />
              </Field>
              <Field label="Ca">
                <ChipGroup value={normalizeShift(editing.shift)} onChange={value => setEditing({ ...editing, shift: value })} options={SHIFTS.map(value => ({ value, label: value }))} />
              </Field>
              <Field label="Người thực hiện">
                <Combobox value={editing.assignee || ''} onChange={value => setEditing({ ...editing, assignee: value })} options={assigneeOptions} placeholder="Chọn điều dưỡng" allowCustom />
              </Field>
              <Field label="Trạng thái">
                <Select value={normalizeStatus(editing.status)} onChange={event => setEditing({ ...editing, status: event.target.value })} options={[...STATUSES]} />
              </Field>
            </FormGrid>
            <Field label="Mức ưu tiên">
              <ChipGroup
                value={(editing.priority as string) || 'Thường'}
                onChange={value => setEditing({ ...editing, priority: value })}
                options={PRIORITIES.map(value => ({
                  value,
                  label: value,
                  activeClass: value === 'Khẩn' ? 'border-rose-500 bg-rose-500 text-white' : value === 'Ưu tiên' ? 'border-amber-500 bg-amber-500 text-white' : undefined,
                }))}
              />
            </Field>
            <Field label="Ghi chú">
              <Input value={editing.note || ''} onChange={event => setEditing({ ...editing, note: event.target.value })} />
            </Field>
          </div>
        )}
      </Dialog>

      <TemplatesDialog
        open={templatesOpen}
        username={user.username}
        existing={tasks}
        loading={pending === 'templates'}
        onClose={() => setTemplatesOpen(false)}
        onApply={async items => {
          const payload = items.map(item => ({ date, shift: item.shift, task: item.task, status: 'Chưa làm', priority: 'Thường' }));
          const result = await run('templates', () => batchAddNursingTasks(payload), { success: `Đã thêm ${payload.length} việc thường quy`, invalidate: refreshAll });
          if (result !== undefined) setTemplatesOpen(false);
        }}
      />
    </div>
  );
};

/* ---------------- Xem theo tuần ---------------- */

const WeekView: React.FC<{ weekStart: string; tasks: NursingTask[]; loading: boolean; onOpenDay: (date: string) => void }> = ({ weekStart, tasks, loading, onOpenDay }) => {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line bg-sunken/70 text-xs text-muted">
            <th className="px-4 py-2.5 text-left font-semibold">Ngày</th>
            {SHIFTS.map(shift => (
              <th key={shift} className="px-4 py-2.5 text-left font-semibold">
                Ca {shift.toLowerCase()}
              </th>
            ))}
            <th className="px-4 py-2.5 text-right font-semibold">Tổng</th>
          </tr>
        </thead>
        <tbody>
          {days.map(day => {
            const dayTasks = tasks.filter(task => task.date === day);
            const total = progressOf(dayTasks);
            return (
              <tr key={day} onClick={() => onOpenDay(day)} className={cn('cursor-pointer border-b border-line/60 hover:bg-sunken/60', day === today && 'bg-primary-soft/50')}>
                <td className="px-4 py-3">
                  <p className="font-medium text-fg">
                    {weekdayShort(day)} · {fmtDate(day).slice(0, 5)}
                  </p>
                  {day === today && <p className="text-xs text-primary">Hôm nay</p>}
                </td>
                {SHIFTS.map(shift => {
                  const list = dayTasks.filter(task => normalizeShift(task.shift) === shift);
                  const result = progressOf(list);
                  return (
                    <td key={shift} className="px-4 py-3">
                      {loading ? (
                        <Skeleton className="h-4 w-20" />
                      ) : list.length ? (
                        <div className="w-28">
                          <p className="num text-xs text-muted">
                            {result.done}/{result.total} việc
                          </p>
                          <Progress value={result.pct} className="mt-1" />
                        </div>
                      ) : (
                        <span className="text-xs text-faint">—</span>
                      )}
                    </td>
                  );
                })}
                <td className="num px-4 py-3 text-right font-semibold text-fg">{total.total ? `${total.pct}%` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

/* ---------------- Việc thường quy ---------------- */

const TemplatesDialog: React.FC<{
  open: boolean;
  username: string;
  existing: NursingTask[];
  loading: boolean;
  onClose: () => void;
  onApply: (items: Array<{ shift: Shift; task: string }>) => void;
}> = ({ open, username, existing, loading, onClose, onApply }) => {
  const storageKey = `${TEMPLATE_KEY}:${username}`;
  const [templates, setTemplates] = useState<Record<Shift, string[]>>(DEFAULT_TEMPLATES);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [newText, setNewText] = useState<Record<Shift, string>>({ Sáng: '', Chiều: '', Đêm: '' });
  const initialised = useRef(false);

  useEffect(() => {
    if (!open) {
      initialised.current = false;
      return;
    }
    if (initialised.current) return;
    initialised.current = true;
    const saved = readPref<Record<Shift, string[]>>(storageKey, DEFAULT_TEMPLATES);
    setTemplates(saved);
    const existingKeys = new Set(existing.map(task => `${normalizeShift(task.shift)}|${task.task.trim().toLowerCase()}`));
    const next = new Set<string>();
    SHIFTS.forEach(shift => (saved[shift] || []).forEach(text => !existingKeys.has(`${shift}|${text.trim().toLowerCase()}`) && next.add(`${shift}|${text}`)));
    setSelected(next);
  }, [open, existing, storageKey]);

  const persist = (next: Record<Shift, string[]>) => {
    setTemplates(next);
    writePref(storageKey, next);
  };

  const toggle = (key: string) =>
    setSelected(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const items = Array.from(selected).map(key => {
    const [shift, ...rest] = key.split('|');
    return { shift: shift as Shift, task: rest.join('|') };
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="Thêm việc thường quy"
      description="Chọn các việc cần thêm cho ngày đang xem. Danh sách mẫu được lưu riêng cho tài khoản của bạn."
      footer={
        <>
          <Button variant="ghost" onClick={() => persist(DEFAULT_TEMPLATES)} className="mr-auto">
            Khôi phục mẫu gốc
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" disabled={!items.length} loading={loading} onClick={() => onApply(items)}>
            Thêm {items.length} việc
          </Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {SHIFTS.map(shift => (
          <div key={shift}>
            <p className="mb-2 text-sm font-semibold text-fg">Ca {shift.toLowerCase()}</p>
            <ul className="space-y-1.5">
              {(templates[shift] || []).map(text => (
                <li key={text} className="group flex items-start gap-2">
                  <Checkbox checked={selected.has(`${shift}|${text}`)} onChange={() => toggle(`${shift}|${text}`)} label={<span className="text-[13px] text-fg">{text}</span>} className="flex-1 items-start" />
                  <button
                    onClick={() => persist({ ...templates, [shift]: templates[shift].filter(item => item !== text) })}
                    className="rounded p-0.5 text-faint opacity-0 hover:text-rose-500 group-hover:opacity-100"
                    aria-label="Xoá khỏi mẫu"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <form
              className="mt-2 flex gap-1.5"
              onSubmit={event => {
                event.preventDefault();
                const text = newText[shift].trim();
                if (!text) return;
                persist({ ...templates, [shift]: [...(templates[shift] || []), text] });
                setSelected(current => new Set(current).add(`${shift}|${text}`));
                setNewText(current => ({ ...current, [shift]: '' }));
              }}
            >
              <Input value={newText[shift]} onChange={event => setNewText(current => ({ ...current, [shift]: event.target.value }))} placeholder="Thêm mẫu…" className="h-8 text-[13px]" />
              <Button type="submit" size="sm" iconOnly icon={Plus} variant="soft" aria-label="Thêm mẫu" />
            </form>
          </div>
        ))}
      </div>
    </Dialog>
  );
};
