import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AlertCircle, CalendarDays, CheckSquare, ClipboardList, Edit3, Plus, Printer, RefreshCw, Sparkles, Trash2, User as UserIcon } from 'lucide-react';
import type { BriefingTask, DailyBriefing } from '../../types';
import { addBriefing, getBriefingBundle, updateBriefing } from '../../services/dataService';
import { useApp } from '../../context/AppContext';
import { KEYS } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { useInsights } from '../../hooks/useInsights';
import { useResource } from '../../lib/resource';
import { fmtDate, relativeDay, todayKey, toDateKey, weekdayLong } from '../../lib/dates';
import { matchesQuery } from '../../lib/text';
import { printTable } from '../../lib/print';
import { cn } from '../../lib/cn';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Combobox,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FormGrid,
  Input,
  PageHeader,
  Progress,
  SearchInput,
  SkeletonRows,
  Textarea,
  showToast,
} from '../../components/ui';
import { composeBriefing, isTaskOverdue, parseBriefings } from './briefingLogic';

type Bundle = { briefings: DailyBriefing[]; users: Array<{ username: string; fullName: string }> };

const useBriefings = () =>
  useResource<Bundle>(KEYS.briefings, async options => {
    const bundle = await getBriefingBundle(options);
    return { users: bundle.users, briefings: parseBriefings(bundle.briefings, bundle.users) };
  });

const emptyTask = (): Partial<BriefingTask> => ({ taskName: '', assigneeUsername: '', deadline: '', progress: 0 });

export const BriefingPage: React.FC = () => {
  const { user } = useApp();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, validating, reload } = useBriefings();
  const { summary } = useInsights();
  const { run, pending } = useAction();
  const today = todayKey();
  const [search, setSearch] = useState('');
  const [viewing, setViewing] = useState<DailyBriefing | null>(null);
  const [editing, setEditing] = useState<Partial<DailyBriefing> | null>(null);
  const [newTask, setNewTask] = useState<Partial<BriefingTask>>(emptyTask());

  const briefings = data?.briefings || [];
  const users = data?.users || [];
  const userOptions = useMemo(() => users.map(item => ({ value: item.username, label: item.fullName || item.username, keywords: item.username })), [users]);
  const todayBriefing = briefings.find(item => toDateKey(item.date) === today);

  const filtered = useMemo(
    () => briefings.filter(item => matchesQuery(search, item.content, item.host, fmtDate(item.date), ...(item.tasks || []).map(task => `${task.taskName} ${task.assigneeName}`))),
    [briefings, search],
  );

  const openNew = () => {
    if (todayBriefing) {
      setEditing({ ...todayBriefing });
      showToast('Hôm nay đã có sổ giao ban — mở để bổ sung', 'info');
    } else {
      setEditing({ date: today, host: summary.todayShift?.doctor || user.fullName, content: '', tasks: [] });
    }
    setNewTask(emptyTask());
  };

  useEffect(() => {
    if (params.get('new') === '1' && data) {
      openNew();
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, data]);

  const addTask = () => {
    if (!editing) return;
    if (!String(newTask.taskName || '').trim()) return showToast('Nhập tên việc cần làm', 'warning');
    if (!newTask.assigneeUsername) return showToast('Chọn người thực hiện', 'warning');
    const assignee = users.find(item => item.username === newTask.assigneeUsername);
    const task: BriefingTask = {
      id: `T${Date.now()}`,
      taskName: String(newTask.taskName).trim(),
      assignee: assignee?.fullName || newTask.assigneeUsername,
      assigneeUsername: newTask.assigneeUsername,
      assigneeName: assignee?.fullName || newTask.assigneeUsername,
      deadline: newTask.deadline || '',
      progress: 0,
    };
    setEditing({ ...editing, tasks: [...(editing.tasks || []), task] });
    setNewTask(emptyTask());
  };

  const save = async () => {
    if (!editing?.date || !String(editing.content || '').trim()) return showToast('Vui lòng nhập ngày và nội dung giao ban', 'warning');
    if ((editing.tasks || []).some(task => !String(task.taskName || '').trim() || !task.assigneeUsername)) {
      return showToast('Mỗi công việc cần có tên việc và người thực hiện', 'warning');
    }
    if (String(newTask.taskName || '').trim()) return showToast('Bạn có việc đang nhập dở — bấm "Thêm" hoặc xoá trước khi lưu', 'warning');
    const payload = { ...editing, content: String(editing.content).trim(), tasks: editing.tasks || [] } as DailyBriefing;
    const result = await run('save', () => (payload.id ? updateBriefing(payload.id, payload) : addBriefing(payload)), {
      success: payload.id ? 'Đã cập nhật giao ban' : 'Đã lưu sổ giao ban',
      invalidate: [KEYS.briefings, KEYS.ops, KEYS.staffTasks],
    });
    if (result !== undefined) setEditing(null);
  };

  const print = (briefing: DailyBriefing) => {
    const ok = printTable({
      title: 'Sổ giao ban khoa',
      subtitle: `${weekdayLong(toDateKey(briefing.date))}, ngày ${fmtDate(briefing.date)} · Chủ trì: ${briefing.host || '—'}`,
      intro: briefing.content,
      columns: (briefing.tasks || []).length
        ? [
            { label: 'STT', width: '6%', align: 'center' },
            { label: 'Công việc được giao', width: '50%' },
            { label: 'Người thực hiện', width: '20%' },
            { label: 'Hạn', width: '12%', align: 'center' },
            { label: 'Tiến độ', width: '12%', align: 'center' },
          ]
        : [],
      rows: (briefing.tasks || []).map((task, index) => [index + 1, task.taskName, task.assigneeName || task.assignee, task.deadline ? fmtDate(task.deadline) : '', `${task.progress || 0}%`]),
      signers: ['THƯ KÝ', 'CHỦ TRÌ GIAO BAN'],
      signerName: briefing.host,
      landscape: false,
    });
    if (!ok) showToast('Trình duyệt chặn cửa sổ in — hãy cho phép popup', 'error');
  };

  const taskSummary = (briefing: DailyBriefing) => {
    const tasks = briefing.tasks || [];
    return {
      total: tasks.length,
      done: tasks.filter(task => Number(task.progress) >= 100).length,
      overdue: tasks.filter(task => isTaskOverdue(task, today)).length,
    };
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Giao ban"
        icon={ClipboardList}
        description="Sổ giao ban hàng ngày & phân công việc — việc được giao tự đồng bộ sang Công việc & Đánh giá"
        actions={
          <>
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={() => reload()} aria-label="Làm mới" />
            <Button variant="primary" icon={todayBriefing ? Edit3 : Plus} onClick={openNew}>
              {todayBriefing ? 'Bổ sung giao ban hôm nay' : 'Ghi giao ban hôm nay'}
            </Button>
          </>
        }
      />

      {!loading && !todayBriefing && (
        <Card className="flex flex-col gap-4 border-dashed p-5 sm:flex-row sm:items-center">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <p className="font-medium text-fg">Chưa có sổ giao ban hôm nay</p>
            <p className="text-sm text-muted">
              Hệ thống có thể soạn sẵn phần số liệu: {summary.active.length} BN đang điều trị, {summary.surgeryToday.length} ca mổ hôm nay, {summary.overdueTasks.length} việc quá hạn…
            </p>
          </div>
          <Button
            variant="primary"
            icon={Sparkles}
            onClick={() => {
              setEditing({ date: today, host: summary.todayShift?.doctor || user.fullName, content: composeBriefing(summary, today), tasks: [] });
              setNewTask(emptyTask());
            }}
          >
            Soạn tự động
          </Button>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-line p-3 sm:px-4">
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm trong sổ giao ban, việc được giao…" className="sm:w-96" />
          <span className="ml-auto hidden text-sm text-muted sm:block">{briefings.length} buổi giao ban</span>
        </div>
        {error && !data ? (
          <ErrorState error={error} onRetry={() => reload()} />
        ) : loading ? (
          <SkeletonRows />
        ) : filtered.length === 0 ? (
          <EmptyState icon={ClipboardList} title={search ? 'Không tìm thấy nội dung phù hợp' : 'Chưa có sổ giao ban'} />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map(item => {
              const stats = taskSummary(item);
              const key = toDateKey(item.date);
              return (
                <li key={item.id}>
                  <button onClick={() => setViewing(item)} className="group flex w-full gap-4 px-4 py-4 text-left hover:bg-sunken/60 sm:px-5">
                    <div className={cn('flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl', key === today ? 'bg-primary text-primary-fg' : 'bg-sunken text-fg ring-1 ring-line')}>
                      <span className="num text-lg font-semibold leading-none">{key.slice(8, 10)}</span>
                      <span className={cn('mt-0.5 text-[10px]', key === today ? 'text-primary-fg/80' : 'text-muted')}>Th{Number(key.slice(5, 7))}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="font-medium text-fg">{weekdayLong(key)}</span>
                        <span>· {relativeDay(key)}</span>
                        {item.host && (
                          <span className="inline-flex items-center gap-1">
                            · <UserIcon className="h-3 w-3" /> {item.host}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-fg">{item.content}</p>
                      {stats.total > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge tone={stats.done === stats.total ? 'success' : 'neutral'} icon={CheckSquare}>
                            {stats.done}/{stats.total} việc xong
                          </Badge>
                          {stats.overdue > 0 && (
                            <Badge tone="danger" icon={AlertCircle}>
                              {stats.overdue} quá hạn
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* Xem chi tiết */}
      {viewing && (
        <Drawer
          open
          onClose={() => setViewing(null)}
          size="md"
          title={`Giao ban ${fmtDate(viewing.date)}`}
          subtitle={`${weekdayLong(toDateKey(viewing.date))} · Chủ trì: ${viewing.host || '—'}`}
          footer={
            <>
              <Button icon={Printer} onClick={() => print(viewing)} className="mr-auto">
                In sổ
              </Button>
              <Button
                variant="primary"
                icon={Edit3}
                onClick={() => {
                  setEditing({ ...viewing });
                  setNewTask(emptyTask());
                  setViewing(null);
                }}
              >
                Chỉnh sửa
              </Button>
            </>
          }
        >
          <div className="space-y-6">
            <div className="whitespace-pre-line rounded-xl border border-line bg-sunken/60 p-4 text-sm leading-relaxed text-fg">{viewing.content}</div>
            {(viewing.tasks || []).length > 0 && (
              <section>
                <h3 className="mb-3 text-sm font-semibold text-fg">Phân công công việc</h3>
                <ul className="space-y-2">
                  {(viewing.tasks || []).map(task => {
                    const overdue = isTaskOverdue(task, today);
                    return (
                      <li key={task.id} className="rounded-xl border border-line p-3">
                        <div className="flex items-start justify-between gap-3">
                          <p className={cn('text-sm font-medium', Number(task.progress) >= 100 ? 'text-muted line-through' : 'text-fg')}>{task.taskName}</p>
                          {overdue ? <Badge tone="danger">Quá hạn</Badge> : Number(task.progress) >= 100 ? <Badge tone="success">Xong</Badge> : null}
                        </div>
                        <div className="mt-2 flex items-center gap-3 text-xs text-muted">
                          <span className="inline-flex items-center gap-1.5">
                            <Avatar name={task.assigneeName || task.assignee} size="xs" /> {task.assigneeName || task.assignee}
                          </span>
                          {task.deadline && <span>Hạn {fmtDate(task.deadline)}</span>}
                          <Progress value={Number(task.progress) || 0} className="ml-auto w-28" showLabel />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
          </div>
        </Drawer>
      )}

      {/* Soạn / sửa */}
      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        persistent
        size="lg"
        title={editing?.id ? `Sửa giao ban ${fmtDate(editing.date)}` : 'Ghi sổ giao ban'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Huỷ
            </Button>
            <Button variant="primary" loading={pending === 'save'} onClick={save}>
              Lưu giao ban
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-6">
            <FormGrid>
              <Field label="Ngày giao ban" required>
                <Input type="date" value={toDateKey(editing.date) || ''} onChange={event => setEditing({ ...editing, date: event.target.value })} />
              </Field>
              <Field label="Người chủ trì">
                <Input value={editing.host || ''} onChange={event => setEditing({ ...editing, host: event.target.value })} />
              </Field>
            </FormGrid>
            <Field
              label="Nội dung / sự vụ"
              required
              action={
                <button
                  type="button"
                  onClick={() => {
                    const auto = composeBriefing(summary, toDateKey(editing.date) || today);
                    setEditing({ ...editing, content: editing.content?.trim() ? `${editing.content.trim()}\n\n${auto}` : auto });
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Chèn số liệu tự động
                </button>
              }
            >
              <Textarea value={editing.content || ''} onChange={event => setEditing({ ...editing, content: event.target.value })} rows={12} className="font-[inherit] text-[13.5px]" />
            </Field>

            <section>
              <h3 className="mb-1 text-sm font-semibold text-fg">Phân công công việc</h3>
              <p className="mb-3 text-xs text-muted">Mỗi việc sẽ xuất hiện trong mục Công việc của người được giao.</p>
              <ul className="space-y-2">
                {(editing.tasks || []).map(task => (
                  <li key={task.id} className="rounded-xl border border-line p-3">
                    <div className="flex items-start gap-2">
                      <Input value={task.taskName} onChange={event => setEditing({ ...editing, tasks: (editing.tasks || []).map(item => (item.id === task.id ? { ...item, taskName: event.target.value } : item)) })} className="h-9 flex-1" />
                      <Button size="md" variant="danger-soft" iconOnly icon={Trash2} onClick={() => setEditing({ ...editing, tasks: (editing.tasks || []).filter(item => item.id !== task.id) })} aria-label="Xoá việc" />
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
                      <span className="inline-flex items-center gap-1.5">
                        <Avatar name={task.assigneeName || task.assignee} size="xs" /> {task.assigneeName || task.assignee}
                      </span>
                      <Input
                        type="date"
                        value={toDateKey(task.deadline) || ''}
                        onChange={event => setEditing({ ...editing, tasks: (editing.tasks || []).map(item => (item.id === task.id ? { ...item, deadline: event.target.value } : item)) })}
                        className="h-8 w-36 text-xs"
                      />
                      <label className="ml-auto flex items-center gap-2">
                        Tiến độ
                        <input
                          type="range"
                          min={0}
                          max={100}
                          step={10}
                          value={Number(task.progress) || 0}
                          onChange={event => setEditing({ ...editing, tasks: (editing.tasks || []).map(item => (item.id === task.id ? { ...item, progress: Number(event.target.value) } : item)) })}
                          className="w-24 accent-[rgb(var(--primary))]"
                        />
                        <span className="num w-9 text-right font-medium text-fg">{Number(task.progress) || 0}%</span>
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-3 rounded-xl border border-dashed border-primary/40 bg-primary-soft/40 p-3">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_200px_150px_auto]">
                  <Input
                    value={newTask.taskName || ''}
                    onChange={event => setNewTask({ ...newTask, taskName: event.target.value })}
                    placeholder="Việc cần làm…"
                    className="h-9"
                    onKeyDown={event => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        addTask();
                      }
                    }}
                  />
                  <Combobox value={newTask.assigneeUsername || ''} onChange={value => setNewTask({ ...newTask, assigneeUsername: value })} options={userOptions} placeholder="Người thực hiện" />
                  <Input type="date" value={newTask.deadline || ''} onChange={event => setNewTask({ ...newTask, deadline: event.target.value })} className="h-9" />
                  <Button variant="primary" icon={Plus} onClick={addTask}>
                    Thêm
                  </Button>
                </div>
              </div>
            </section>
            {editing.id && (
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <CalendarDays className="h-3.5 w-3.5" /> Đang sửa giao ban ngày {fmtDate(editing.date)}.
              </p>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};
