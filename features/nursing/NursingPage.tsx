import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CalendarRange,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Circle,
  CircleDot,
  Copy,
  Edit3,
  Flame,
  HeartPulse,
  Kanban,
  ListChecks,
  Megaphone,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react';
import { Role, type NursingTask } from '../../types';
import { addNursingTask, batchAddNursingTasks, deleteNursingTask, getNursingTasks, updateNursingTask } from '../../services/dataService';
import { KEYS, useOperations, usePersonnel } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { mutateCache, useResource } from '../../lib/resource';
import { addDays, fmtDate, relativeDay, startOfWeek, todayKey, toDateKey, weekdayLong, weekdayShort } from '../../lib/dates';
import { readPref, writePref } from '../../lib/prefs';
import { fold, matchesQuery } from '../../lib/text';
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
  showToast,
} from '../../components/ui';
import {
  DEFAULT_CLINICAL_TEMPLATES,
  NURSING_GROUPS,
  PRIORITIES,
  STATUSES,
  TASK_CATEGORIES,
  buildCopy,
  buildRolloverUnfinished,
  isGroupAssignee,
  isTaskOverdue,
  nextStatus,
  normalizeStatus,
  normalizeTask,
  progressOf,
  sortTasks,
  type Status,
} from './nursingLogic';

const TEMPLATE_KEY = 'kn_nursing_templates_v2';
const DIRECTIVE_PREFIX = 'kn_nursing_directive';

const useNursingRange = (from: string, to: string) =>
  useResource<NursingTask[]>(`${KEYS.nursing}:${from}:${to}`, async options => (await getNursingTasks(from, to, options)).map(normalizeTask));

const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
  const value = normalizeStatus(status);
  if (value === 'Hoàn thành') return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
  if (value === 'Đang làm') return <CircleDot className="h-5 w-5 text-sky-500" />;
  return <Circle className="h-5 w-5 text-faint hover:text-primary transition-colors" />;
};

type ViewMode = 'members' | 'groups' | 'status' | 'week';

export const NursingPage: React.FC = () => {
  const { user } = useApp();
  const [params, setParams] = useSearchParams();
  const today = todayKey();
  const date = toDateKey(params.get('date')) || today;
  const view = (params.get('view') as ViewMode) || 'members';
  const weekStart = startOfWeek(date);

  const isHeadNurse = user.role === Role.HEAD_NURSE || String(user.role) === 'DIEU_DUONG_TRUONG';
  const isChief = user.role === Role.CHIEF || String(user.role) === 'TRUONG_KHOA';
  const isManager = isHeadNurse || isChief;

  const dayRes = useNursingRange(date, date);
  const prevRes = useNursingRange(addDays(date, -1), addDays(date, -1));
  const weekRes = useNursingRange(view === 'week' ? weekStart : date, view === 'week' ? addDays(weekStart, 6) : date);

  const { nurses } = usePersonnel();
  const { data: ops } = useOperations();
  const { run, pending } = useAction();

  const [editing, setEditing] = useState<Partial<NursingTask> | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [reassigningTask, setReassigningTask] = useState<NursingTask | null>(null);
  const [reassignTarget, setReassignTarget] = useState('');

  // Quick search & filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMember, setFilterMember] = useState<'all' | 'mine' | string>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'urgent'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unfinished' | 'done'>('all');

  // Quick inline task input per member or group
  const [quickAddTexts, setQuickAddTexts] = useState<Record<string, string>>({});

  // Head nurse directives for the day
  const directiveKey = `${DIRECTIVE_PREFIX}:${date}`;
  const [directive, setDirective] = useState<string>(() => readPref<string>(directiveKey, ''));
  const [editingDirective, setEditingDirective] = useState(false);
  const [directiveDraft, setDirectiveDraft] = useState('');

  useEffect(() => {
    setDirective(readPref<string>(directiveKey, ''));
  }, [directiveKey]);

  const saveDirective = (text: string) => {
    writePref(directiveKey, text);
    setDirective(text);
    setEditingDirective(false);
    showToast('Đã lưu lưu ý chỉ đạo của ĐD trưởng', 'success');
  };

  const cacheKey = `${KEYS.nursing}:${date}:${date}`;
  const tasks = useMemo(() => dayRes.data || [], [dayRes.data]);
  const progress = useMemo(() => progressOf(tasks), [tasks]);

  // On-call shifts
  const onCall = useMemo(() => (ops?.shifts || []).find(shift => toDateKey(shift.date) === date), [ops, date]);
  const onCallNurses = useMemo(() => [onCall?.nurse1, onCall?.nurse2].filter(Boolean) as string[], [onCall]);

  // Combine nurses list
  const activeNursesList = useMemo(() => {
    return Array.from(new Set(nurses || [])).sort((a, b) => a.localeCompare(b, 'vi'));
  }, [nurses]);

  // Options for assignees (nurses + groups)
  const assigneeOptions = useMemo(() => {
    const list: Array<{ value: string; label: string; description?: string }> = [];
    if (onCallNurses.length) {
      onCallNurses.forEach(name => list.push({ value: name, label: name, description: 'Trực hôm nay' }));
    }
    activeNursesList
      .filter(name => !onCallNurses.includes(name))
      .forEach(name => list.push({ value: name, label: name, description: 'Điều dưỡng khoa' }));
    NURSING_GROUPS.forEach(group => list.push({ value: group, label: group, description: 'Nhóm / Tổ' }));
    return list;
  }, [activeNursesList, onCallNurses]);

  // Unfinished tasks from yesterday
  const unfinishedYesterday = useMemo(() => {
    const yesterdayTasks = prevRes.data || [];
    return yesterdayTasks.filter(task => normalizeStatus(task.status) !== 'Hoàn thành');
  }, [prevRes.data]);

  // Filter tasks based on current criteria
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      if (searchQuery.trim()) {
        const query = searchQuery.trim();
        const matches =
          matchesQuery(query, task.task) ||
          matchesQuery(query, task.assignee || '') ||
          matchesQuery(query, task.room || '') ||
          matchesQuery(query, task.category || '') ||
          matchesQuery(query, task.note || '');
        if (!matches) return false;
      }
      if (filterPriority === 'urgent' && task.priority !== 'Khẩn' && task.priority !== 'Ưu tiên') {
        return false;
      }
      if (filterStatus === 'unfinished' && normalizeStatus(task.status) === 'Hoàn thành') {
        return false;
      }
      if (filterStatus === 'done' && normalizeStatus(task.status) !== 'Hoàn thành') {
        return false;
      }
      if (filterMember === 'mine') {
        const userClean = fold(user.fullName);
        const taskAssignee = fold(task.assignee || '');
        if (!taskAssignee.includes(userClean) && !isGroupAssignee(task.assignee)) return false;
      } else if (filterMember !== 'all') {
        if ((task.assignee || '').trim() !== filterMember.trim()) return false;
      }
      return true;
    });
  }, [tasks, searchQuery, filterPriority, filterStatus, filterMember, user.fullName]);

  // Grouped tasks by individual nurse
  const tasksByNurse = useMemo(() => {
    const map = new Map<string, NursingTask[]>();
    activeNursesList.forEach(nurse => map.set(nurse, []));
    const groupTasks: NursingTask[] = [];
    const unassignedTasks: NursingTask[] = [];

    filteredTasks.forEach(task => {
      const assignee = (task.assignee || '').trim();
      if (!assignee) {
        unassignedTasks.push(task);
      } else if (isGroupAssignee(assignee)) {
        groupTasks.push(task);
      } else {
        const existing = map.get(assignee);
        if (existing) {
          existing.push(task);
        } else {
          // If nurse not in active list yet, add dynamically
          map.set(assignee, [task]);
        }
      }
    });

    // Sort tasks in each bucket
    map.forEach((list, key) => map.set(key, sortTasks(list)));
    return {
      nurses: map,
      groupTasks: sortTasks(groupTasks),
      unassignedTasks: sortTasks(unassignedTasks),
    };
  }, [activeNursesList, filteredTasks]);

  // Grouped tasks by nursing group
  const tasksByGroup = useMemo(() => {
    const map = new Map<string, NursingTask[]>();
    NURSING_GROUPS.forEach(g => map.set(g, []));
    const otherTasks: NursingTask[] = [];

    filteredTasks.forEach(task => {
      const groupName = (task.group || (isGroupAssignee(task.assignee) ? task.assignee : '') || '').trim();
      if (groupName && map.has(groupName)) {
        map.get(groupName)!.push(task);
      } else if (groupName && isGroupAssignee(groupName)) {
        if (!map.has(groupName)) map.set(groupName, []);
        map.get(groupName)!.push(task);
      } else {
        otherTasks.push(task);
      }
    });

    map.forEach((list, key) => map.set(key, sortTasks(list)));
    return {
      groups: map,
      individualOrUnassigned: sortTasks(otherTasks),
    };
  }, [filteredTasks]);

  // Grouped tasks by status
  const tasksByStatus = useMemo(() => {
    const map: Record<Status, NursingTask[]> = { 'Chưa làm': [], 'Đang làm': [], 'Hoàn thành': [] };
    filteredTasks.forEach(task => {
      map[normalizeStatus(task.status)].push(task);
    });
    STATUSES.forEach(status => {
      map[status] = sortTasks(map[status]);
    });
    return map;
  }, [filteredTasks]);

  useEffect(() => {
    if (params.get('new') === '1') {
      setEditing({ date, status: 'Chưa làm', priority: 'Thường', assignee: isHeadNurse ? '' : user.fullName });
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
  }, [params, date, isHeadNurse, user.fullName, setParams]);

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

  const setTaskStatus = async (task: NursingTask, status: Status) => {
    mutateCache<NursingTask[]>(cacheKey, current => (current || []).map(item => (item.id === task.id ? { ...item, status } : item)));
    await run(`status-${task.id}`, () => updateNursingTask(task.id, { status }), { invalidate: [KEYS.ops] });
  };

  const quickAdd = async (target: string, isGroupTarget = false) => {
    const text = (quickAddTexts[target] || '').trim();
    if (!text) return;
    setQuickAddTexts(current => ({ ...current, [target]: '' }));
    const isGrp = isGroupTarget || isGroupAssignee(target);
    await run(
      `quick-${target}`,
      () =>
        addNursingTask({
          date,
          ngayGiao: date,
          hanThucHien: date,
          task: text,
          status: 'Chưa làm',
          priority: 'Thường',
          group: isGrp ? target : undefined,
          assignee: target,
          assigneeType: isGrp ? 'group' : 'individual',
        }),
      { invalidate: refreshAll },
    );
  };

  const save = async () => {
    if (!editing?.task?.trim()) return showToast('Vui lòng nhập nội dung công việc', 'warning');
    const groupVal = (editing.group || '').trim();
    const assigneeVal = (editing.assignee || '').trim();
    const effectiveAssignee = assigneeVal || groupVal;
    const isGroup = isGroupAssignee(effectiveAssignee) || (!assigneeVal && !!groupVal);

    const payload = {
      ...editing,
      task: editing.task.trim(),
      date: editing.date || date,
      group: groupVal || undefined,
      assignee: effectiveAssignee,
      assigneeType: isGroup ? 'group' : 'individual',
      ngayGiao: editing.ngayGiao || editing.date || date,
      hanThucHien: editing.hanThucHien || editing.date || date,
      gioHen: (editing.gioHen || '').trim() || undefined,
      room: (editing.room || '').trim() || undefined,
      category: (editing.category || '').trim() || undefined,
    };
    const result = await run('save', () => (payload.id ? updateNursingTask(payload.id, payload) : addNursingTask(payload)), {
      success: payload.id ? 'Đã cập nhật công việc' : 'Đã giao việc thành công',
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

  const executeReassign = async () => {
    if (!reassigningTask || !reassignTarget) return;
    const task = reassigningTask;
    const target = reassignTarget.trim();
    setReassigningTask(null);
    mutateCache<NursingTask[]>(cacheKey, current =>
      (current || []).map(item => (item.id === task.id ? { ...item, assignee: target, assigneeType: isGroupAssignee(target) ? 'group' : 'individual' } : item)),
    );
    await run(`reassign-${task.id}`, () => updateNursingTask(task.id, { assignee: target, assigneeType: isGroupAssignee(target) ? 'group' : 'individual' }), {
      success: `Đã phân công lại cho ${target}`,
      invalidate: refreshAll,
    });
  };

  const copyYesterdayAll = async () => {
    const source = prevRes.data || [];
    if (!source.length) return showToast(`Ngày ${fmtDate(addDays(date, -1))} không có việc nào để sao chép`, 'info');
    const items = buildCopy(source, date, tasks);
    if (!items.length) return showToast('Các việc của hôm trước đã có sẵn trong ngày này', 'info');
    await run('copy', () => batchAddNursingTasks(items), { success: `Đã sao chép ${items.length} việc từ hôm trước`, invalidate: refreshAll });
  };

  const rolloverUnfinished = async () => {
    if (!unfinishedYesterday.length) return showToast('Hôm trước không có việc nào tồn đọng', 'info');
    const items = buildRolloverUnfinished(unfinishedYesterday, date, tasks);
    if (!items.length) return showToast('Các việc chưa hoàn thành đã được chuyển sang ngày hôm nay rồi', 'info');
    await run('rollover', () => batchAddNursingTasks(items), {
      success: `Đã bàn giao ${items.length} việc chưa hoàn thành sang hôm nay`,
      invalidate: refreshAll,
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Công tác điều dưỡng"
        icon={HeartPulse}
        description="ĐD trưởng phân việc cá nhân & nhóm, giám sát khối lượng và tiến độ toàn khoa"
        actions={
          <>
            <Segmented
              value={view}
              onChange={value => setParam({ view: value === 'members' ? null : value })}
              items={[
                { value: 'members', label: 'Cá nhân', icon: Users },
                { value: 'groups', label: 'Nhóm / Tổ', icon: Boxes },
                { value: 'status', label: 'Tiến độ', icon: Kanban },
                { value: 'week', label: 'Theo tuần', icon: CalendarRange },
              ]}
            />
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={dayRes.validating} onClick={() => dayRes.reload()} aria-label="Làm mới" />
            <Button
              variant="primary"
              icon={Plus}
              onClick={() => setEditing({ date, status: 'Chưa làm', priority: 'Thường', assignee: isHeadNurse ? '' : user.fullName })}
            >
              Giao việc mới
            </Button>
          </>
        }
      />

      {/* Thanh điều hướng ngày & Thống kê tải công việc */}
      <Card className="flex flex-col gap-3 p-3 lg:flex-row lg:items-center sm:px-4">
        <div className="flex flex-wrap items-center gap-1">
          <Button size="sm" variant="ghost" iconOnly icon={ChevronLeft} onClick={() => setParam({ date: addDays(date, view === 'week' ? -7 : -1) })} aria-label="Trước" />
          <div className="min-w-[180px] text-center">
            <p className="text-sm font-semibold text-fg">
              {view === 'week' ? `Tuần ${fmtDate(weekStart).slice(0, 5)} – ${fmtDate(addDays(weekStart, 6))}` : `${weekdayLong(date)}, ${fmtDate(date)}`}
            </p>
            {view !== 'week' && <p className="text-xs text-muted">{relativeDay(date)}</p>}
          </div>
          <Button size="sm" variant="ghost" iconOnly icon={ChevronRight} onClick={() => setParam({ date: addDays(date, view === 'week' ? 7 : 1) })} aria-label="Sau" />
          {date !== today && (
            <Button size="sm" variant="soft" onClick={() => setParam({ date: null })}>
              Hôm nay
            </Button>
          )}
          <Input type="date" value={date} onChange={event => setParam({ date: event.target.value || null })} className="ml-1 h-8 w-36 text-[13px]" />
        </div>

        {view !== 'week' && (
          <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center lg:justify-end">
            <div className="flex min-w-[220px] items-center gap-3">
              <div className="flex flex-col text-right">
                <span className="text-xs font-semibold text-fg">
                  {progress.done}/{progress.total} việc
                </span>
                <span className="text-[11px] text-muted">Hoàn thành {progress.pct}%</span>
              </div>
              <Progress value={progress.pct} className="flex-1 min-w-[100px]" />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={ListChecks} onClick={() => setTemplatesOpen(true)}>
                Việc thường quy
              </Button>
              <Button size="sm" icon={Copy} loading={pending === 'copy'} onClick={copyYesterdayAll} title="Sao chép toàn bộ việc hôm trước sang hôm nay">
                Chép hôm trước
              </Button>
              <Button size="sm" variant="ghost" icon={Printer} onClick={() => setPrintOpen(true)} title="In bảng phân công điều dưỡng trong ngày">
                In phiếu
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Thông báo kíp trực & Bàn giao việc tồn */}
      {view !== 'week' && (
        <div className="space-y-3">
          {/* Kíp trực hôm nay */}
          {onCall && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface/60 px-3 py-2 border border-line text-sm text-muted">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Kíp trực hôm nay:</span>
                <span className="font-medium text-fg">BS. {onCall.doctor}</span>
                {onCallNurses.map(name => (
                  <span key={name} className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 ring-1 ring-line text-xs font-medium text-fg">
                    <Avatar name={name} size="xs" /> {name}
                  </span>
                ))}
              </div>
              {isManager && onCallNurses.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="xs"
                    variant="soft"
                    icon={Plus}
                    onClick={() => setEditing({ date, assignee: 'Nhóm Kíp trực hôm nay', priority: 'Ưu tiên', status: 'Chưa làm' })}
                  >
                    Giao cho Kíp trực
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Banner bàn giao việc tồn hôm trước */}
          {unfinishedYesterday.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2.5">
                <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span className="text-sm font-medium">
                  Hôm qua ({fmtDate(addDays(date, -1))}) còn <b>{unfinishedYesterday.length} công việc chưa hoàn thành</b>. Bạn có muốn bàn giao sang hôm nay không?
                </span>
              </div>
              <Button size="sm" variant="primary" loading={pending === 'rollover'} icon={ArrowRight} onClick={rolloverUnfinished}>
                Bàn giao sang hôm nay
              </Button>
            </div>
          )}

          {/* Chỉ đạo & Lưu ý của ĐD Trưởng trong ngày */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 transition-all">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-primary shrink-0" />
                <p className="text-xs font-bold uppercase tracking-wider text-primary">Chỉ đạo & Lưu ý của Điều dưỡng trưởng trong ngày</p>
              </div>
              {isManager && !editingDirective && (
                <button
                  onClick={() => {
                    setDirectiveDraft(directive);
                    setEditingDirective(true);
                  }}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {directive ? 'Sửa lưu ý' : '+ Thêm lưu ý'}
                </button>
              )}
            </div>

            {editingDirective ? (
              <div className="mt-2.5 space-y-2">
                <Textarea
                  value={directiveDraft}
                  onChange={e => setDirectiveDraft(e.target.value)}
                  rows={2}
                  placeholder="VD: Kiểm tra hạn dùng tủ thuốc trực; Theo dõi sát hạ calci BN buồng 202..."
                  className="text-sm"
                />
                <div className="flex justify-end gap-2">
                  <Button size="xs" variant="ghost" onClick={() => setEditingDirective(false)}>
                    Huỷ
                  </Button>
                  <Button size="xs" variant="primary" onClick={() => saveDirective(directiveDraft)}>
                    Lưu chỉ đạo
                  </Button>
                </div>
              </div>
            ) : directive ? (
              <p className="mt-1.5 text-sm text-fg leading-relaxed whitespace-pre-line">{directive}</p>
            ) : (
              <p className="mt-1 text-xs text-muted italic">Chưa có chỉ đạo đặc biệt cho ngày này.</p>
            )}
          </div>

          {/* Thanh công cụ lọc & tìm kiếm */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-1.5">
              <ChipGroup
                value={filterMember}
                onChange={val => setFilterMember(val)}
                options={[
                  { value: 'all', label: `Tất cả (${tasks.length})` },
                  { value: 'mine', label: 'Việc của tôi' },
                  ...activeNursesList.map(name => ({ value: name, label: name.replace('ĐD. ', '') })),
                ]}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px]">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted pointer-events-none" />
                <Input
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Tìm việc, buồng, tên..."
                  className="h-8 pl-8 text-xs"
                />
              </div>

              <ChipGroup
                value={filterStatus}
                onChange={val => setFilterStatus(val as any)}
                options={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'unfinished', label: 'Chưa xong' },
                  { value: 'done', label: 'Đã xong' },
                ]}
              />

              {progress.urgent > 0 && (
                <button
                  onClick={() => setFilterPriority(current => (current === 'urgent' ? 'all' : 'urgent'))}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors',
                    filterPriority === 'urgent'
                      ? 'bg-rose-500 text-white shadow-sm'
                      : 'bg-rose-500/10 text-rose-600 hover:bg-rose-500/20 dark:text-rose-400',
                  )}
                >
                  <Flame className="h-3 w-3" /> {progress.urgent} việc khẩn
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      {view === 'week' ? (
        <WeekView weekStart={weekStart} tasks={weekRes.data || []} loading={weekRes.loading} onOpenDay={day => setParam({ date: day, view: null })} />
      ) : dayRes.error && !dayRes.data ? (
        <Card>
          <ErrorState error={dayRes.error} onRetry={() => dayRes.reload()} />
        </Card>
      ) : view === 'members' ? (
        /* =================== VIEW 1: THEO CÁ NHÂN =================== */
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {/* Cột từng điều dưỡng trong khoa */}
            {Array.from(tasksByNurse.nurses.entries()).map(([nurseName, nurseTasks]) => {
              const nurseProgress = progressOf(nurseTasks);
              const isOnDuty = onCallNurses.includes(nurseName);
              const isCurrentUser = fold(user.fullName) === fold(nurseName);
              const isHead = nurseName.includes('Lan') || nurseName.includes('Trưởng');

              return (
                <Card key={nurseName} className={cn('flex flex-col transition-all', isCurrentUser && 'ring-2 ring-primary/40')}>
                  {/* Header thẻ điều dưỡng */}
                  <div className="flex items-center gap-3 border-b border-line px-4 py-3 bg-sunken/40">
                    <Avatar name={nurseName} size="sm" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="font-semibold text-fg text-sm truncate">{nurseName}</p>
                        {isCurrentUser && <Badge tone="info">Bạn</Badge>}
                        {isOnDuty && <Badge tone="warning">Trực</Badge>}
                        {isHead && <Badge tone="success">ĐD Trưởng</Badge>}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted">
                          {nurseProgress.done}/{nurseProgress.total} việc
                        </span>
                        <Progress value={nurseProgress.pct} className="w-16 h-1.5" />
                      </div>
                    </div>
                    <Button
                      size="xs"
                      variant="soft"
                      iconOnly
                      icon={Plus}
                      onClick={() => setEditing({ date, assignee: nurseName, priority: 'Thường', status: 'Chưa làm' })}
                      aria-label={`Giao việc cho ${nurseName}`}
                      title={`Giao việc cho ${nurseName}`}
                    />
                  </div>

                  {/* Danh sách việc */}
                  <div className="flex-1 p-2 min-h-[140px]">
                    {dayRes.loading ? (
                      <div className="space-y-2 p-2">
                        <Skeleton className="h-10" />
                        <Skeleton className="h-10" />
                      </div>
                    ) : nurseTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center text-muted">
                        <UserCheck className="h-8 w-8 text-faint mb-1.5 opacity-60" />
                        <p className="text-xs">Chưa giao việc cho điều dưỡng này</p>
                      </div>
                    ) : (
                      <ul className="space-y-1">
                        {nurseTasks.map(task => (
                          <TaskItem
                            key={task.id}
                            task={task}
                            onCycle={cycle}
                            onEdit={t => setEditing(t)}
                            onRemove={remove}
                            onReassign={t => {
                              setReassigningTask(t);
                              setReassignTarget(t.assignee || '');
                            }}
                            onSetStatus={setTaskStatus}
                          />
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Ô giao việc nhanh */}
                  <form
                    className="flex items-center gap-2 border-t border-line p-2.5 bg-surface/50"
                    onSubmit={e => {
                      e.preventDefault();
                      quickAdd(nurseName);
                    }}
                  >
                    <Input
                      value={quickAddTexts[nurseName] || ''}
                      onChange={e => setQuickAddTexts(curr => ({ ...curr, [nurseName]: e.target.value }))}
                      placeholder={`Giao việc nhanh cho ${nurseName.replace('ĐD. ', '')}…`}
                      className="h-8 text-xs"
                    />
                    <Button type="submit" size="sm" iconOnly icon={Plus} variant="soft" loading={pending === `quick-${nurseName}`} aria-label="Giao việc" />
                  </form>
                </Card>
              );
            })}

            {/* Cột Nhóm / Tổ chuyên môn */}
            <Card className="flex flex-col border-dashed border-line">
              <div className="flex items-center gap-3 border-b border-line px-4 py-3 bg-sunken/40">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                  <Boxes className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-fg text-sm">Việc giao cho Nhóm / Tổ</p>
                  <p className="text-xs text-muted">{tasksByNurse.groupTasks.length} việc chung toàn khoa / tổ</p>
                </div>
                <Button
                  size="xs"
                  variant="soft"
                  iconOnly
                  icon={Plus}
                  onClick={() => setEditing({ date, assignee: 'Nhóm Chăm sóc Buồng bệnh', priority: 'Thường', status: 'Chưa làm' })}
                  title="Giao việc cho Nhóm"
                />
              </div>

              <div className="flex-1 p-2 min-h-[140px]">
                {tasksByNurse.groupTasks.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center text-muted">
                    <Boxes className="h-8 w-8 text-faint mb-1.5 opacity-60" />
                    <p className="text-xs">Chưa có công việc nào giao cho nhóm</p>
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {tasksByNurse.groupTasks.map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onCycle={cycle}
                        onEdit={t => setEditing(t)}
                        onRemove={remove}
                        onReassign={t => {
                          setReassigningTask(t);
                          setReassignTarget(t.assignee || '');
                        }}
                        onSetStatus={setTaskStatus}
                      />
                    ))}
                  </ul>
                )}
              </div>

              <form
                className="flex items-center gap-2 border-t border-line p-2.5 bg-surface/50"
                onSubmit={e => {
                  e.preventDefault();
                  quickAdd('Chung toàn khoa');
                }}
              >
                <Input
                  value={quickAddTexts['Chung toàn khoa'] || ''}
                  onChange={e => setQuickAddTexts(curr => ({ ...curr, ['Chung toàn khoa']: e.target.value }))}
                  placeholder="Giao việc nhanh cho toàn khoa…"
                  className="h-8 text-xs"
                />
                <Button type="submit" size="sm" iconOnly icon={Plus} variant="soft" loading={pending === 'quick-Chung toàn khoa'} aria-label="Giao việc" />
              </form>
            </Card>

            {/* Cột Việc Chưa phân công (nếu có) */}
            {tasksByNurse.unassignedTasks.length > 0 && (
              <Card className="flex flex-col border-rose-500/30 bg-rose-500/5">
                <div className="flex items-center gap-3 border-b border-rose-500/20 px-4 py-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-rose-700 dark:text-rose-400 text-sm">Chưa phân công ({tasksByNurse.unassignedTasks.length})</p>
                    <p className="text-xs text-rose-600/80 dark:text-rose-400/80">Cần ĐD trưởng gán người thực hiện</p>
                  </div>
                </div>

                <div className="flex-1 p-2">
                  <ul className="space-y-1">
                    {tasksByNurse.unassignedTasks.map(task => (
                      <TaskItem
                        key={task.id}
                        task={task}
                        onCycle={cycle}
                        onEdit={t => setEditing(t)}
                        onRemove={remove}
                        onReassign={t => {
                          setReassigningTask(t);
                          setReassignTarget(t.assignee || '');
                        }}
                        onSetStatus={setTaskStatus}
                      />
                    ))}
                  </ul>
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : view === 'groups' ? (
        /* =================== VIEW 2: THEO NHÓM / TỔ CHUYÊN MÔN =================== */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from(tasksByGroup.groups.entries()).map(([groupName, groupTasks]) => {
            const groupProg = progressOf(groupTasks);
            return (
              <Card key={groupName} className="flex flex-col">
                <div className="flex items-center gap-3 border-b border-line px-4 py-3 bg-sunken/40">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Boxes className="h-4 w-4" />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-fg text-sm truncate">{groupName}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-muted">
                        {groupProg.done}/{groupProg.total} việc
                      </span>
                      <Progress value={groupProg.pct} className="w-16 h-1.5" />
                    </div>
                  </div>
                  <Button
                    size="xs"
                    variant="soft"
                    iconOnly
                    icon={Plus}
                    onClick={() => setEditing({ date, assignee: groupName, priority: 'Thường', status: 'Chưa làm' })}
                    title={`Giao việc cho ${groupName}`}
                  />
                </div>

                <div className="flex-1 p-2 min-h-[140px]">
                  {groupTasks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center text-muted">
                      <Boxes className="h-7 w-7 text-faint mb-1 opacity-50" />
                      <p className="text-xs">Chưa có việc cho nhóm này</p>
                    </div>
                  ) : (
                    <ul className="space-y-1">
                      {groupTasks.map(task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onCycle={cycle}
                          onEdit={t => setEditing(t)}
                          onRemove={remove}
                          onReassign={t => {
                            setReassigningTask(t);
                            setReassignTarget(t.assignee || '');
                          }}
                          onSetStatus={setTaskStatus}
                        />
                      ))}
                    </ul>
                  )}
                </div>

                <form
                  className="flex items-center gap-2 border-t border-line p-2.5 bg-surface/50"
                  onSubmit={e => {
                    e.preventDefault();
                    quickAdd(groupName);
                  }}
                >
                  <Input
                    value={quickAddTexts[groupName] || ''}
                    onChange={e => setQuickAddTexts(curr => ({ ...curr, [groupName]: e.target.value }))}
                    placeholder={`Giao việc nhanh cho ${groupName}…`}
                    className="h-8 text-xs"
                  />
                  <Button type="submit" size="sm" iconOnly icon={Plus} variant="soft" loading={pending === `quick-${groupName}`} aria-label="Giao việc" />
                </form>
              </Card>
            );
          })}
        </div>
      ) : (
        /* =================== VIEW 3: BẢNG TIẾN ĐỘ / KANBAN =================== */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {STATUSES.map(status => {
            const list = tasksByStatus[status];
            const isDone = status === 'Hoàn thành';
            const isInProg = status === 'Đang làm';

            return (
              <Card key={status} className="flex flex-col">
                <div
                  className={cn(
                    'flex items-center justify-between border-b border-line px-4 py-3',
                    isDone ? 'bg-emerald-500/10' : isInProg ? 'bg-sky-500/10' : 'bg-sunken/50',
                  )}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
                        isDone ? 'bg-emerald-500 text-white' : isInProg ? 'bg-sky-500 text-white' : 'bg-muted/30 text-fg',
                      )}
                    >
                      {list.length}
                    </span>
                    <p className="font-semibold text-fg text-sm">{status}</p>
                  </div>
                  {status === 'Chưa làm' && (
                    <Button size="xs" variant="soft" icon={Plus} onClick={() => setEditing({ date, status: 'Chưa làm', priority: 'Thường' })}>
                      Thêm
                    </Button>
                  )}
                </div>

                <div className="flex-1 p-2 min-h-[200px]">
                  {list.length === 0 ? (
                    <EmptyState compact icon={ListChecks} title="Không có việc" description={`Chưa có việc nào ở trạng thái ${status.toLowerCase()}`} />
                  ) : (
                    <ul className="space-y-1.5">
                      {list.map(task => (
                        <TaskItem
                          key={task.id}
                          task={task}
                          onCycle={cycle}
                          onEdit={t => setEditing(t)}
                          onRemove={remove}
                          onReassign={t => {
                            setReassigningTask(t);
                            setReassignTarget(t.assignee || '');
                          }}
                          onSetStatus={setTaskStatus}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* =================== MODAL: THÊM / SỬA CÔNG VIỆC =================== */}
      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.id ? 'Sửa công việc điều dưỡng' : 'Giao việc điều dưỡng'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Huỷ
            </Button>
            <Button variant="primary" loading={pending === 'save'} onClick={save}>
              {editing?.id ? 'Lưu thay đổi' : 'Giao việc'}
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Nội dung công việc" required>
              <Textarea
                value={editing.task || ''}
                onChange={event => setEditing({ ...editing, task: event.target.value })}
                rows={2}
                placeholder="VD: Thay băng & kiểm tra ống dẫn lưu BN buồng 202; Thực hiện y lệnh thuốc tiêm..."
              />
            </Field>

            {/* Phân công theo nhóm & cá nhân */}
            <div className="rounded-xl border border-line bg-sunken/40 p-3 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">Phân công thực hiện</p>
              <FormGrid>
                <Field label="Nhóm điều dưỡng phụ trách">
                  <Select
                    value={editing.group || ''}
                    onChange={event => {
                      const grp = event.target.value;
                      setEditing({
                        ...editing,
                        group: grp,
                        assignee: editing.assignee || grp,
                      });
                    }}
                    options={[
                      { value: '', label: '(Không chọn nhóm cụ thể)' },
                      ...NURSING_GROUPS.map(g => ({ value: g, label: g })),
                    ]}
                  />
                </Field>

                <Field label="Điều dưỡng thực hiện (Cá nhân)">
                  <Combobox
                    value={editing.assignee && !isGroupAssignee(editing.assignee) ? editing.assignee : ''}
                    onChange={value => setEditing({ ...editing, assignee: value })}
                    options={[
                      { value: '', label: '(Chưa chỉ định cá nhân / Cả nhóm thực hiện)' },
                      ...activeNursesList.map(name => ({
                        value: name,
                        label: name,
                        description: onCallNurses.includes(name) ? 'Trực hôm nay' : undefined,
                      })),
                    ]}
                    placeholder="Chọn điều dưỡng phụ trách..."
                    allowCustom
                  />
                </Field>
              </FormGrid>
            </div>

            {/* Thời gian: Ngày giao & Ngày thực hiện & Hạn thực hiện */}
            <div className="rounded-xl border border-line bg-sunken/40 p-3 space-y-3">
              <p className="text-xs font-bold uppercase tracking-wider text-muted">Thời gian & Hạn thực hiện</p>
              <FormGrid>
                <Field label="Ngày giao việc">
                  <Input
                    type="date"
                    value={editing.ngayGiao || todayKey()}
                    onChange={event => setEditing({ ...editing, ngayGiao: event.target.value })}
                  />
                </Field>

                <Field label="Ngày thực hiện">
                  <Input
                    type="date"
                    value={editing.date || date}
                    onChange={event => setEditing({ ...editing, date: event.target.value })}
                  />
                </Field>

                <Field label="Hạn thực hiện (Ngày)">
                  <Input
                    type="date"
                    value={editing.hanThucHien || editing.date || date}
                    onChange={event => setEditing({ ...editing, hanThucHien: event.target.value })}
                  />
                </Field>

                <Field label="Khung giờ hoàn thành">
                  <div className="space-y-1.5">
                    <Input
                      type="time"
                      value={editing.gioHen || ''}
                      onChange={event => setEditing({ ...editing, gioHen: event.target.value })}
                      placeholder="HH:mm"
                    />
                    <div className="flex flex-wrap items-center gap-1">
                      {['08:00', '09:30', '11:30', '14:00', '16:30', '20:00'].map(t => (
                        <button
                          type="button"
                          key={t}
                          onClick={() => setEditing({ ...editing, gioHen: t })}
                          className={cn(
                            'rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors',
                            editing.gioHen === t ? 'bg-primary text-white shadow-xs' : 'bg-surface ring-1 ring-line text-muted hover:text-fg',
                          )}
                        >
                          {t}
                        </button>
                      ))}
                      {editing.gioHen && (
                        <button
                          type="button"
                          onClick={() => setEditing({ ...editing, gioHen: '' })}
                          className="text-[10px] text-rose-500 hover:underline px-1"
                        >
                          Xoá
                        </button>
                      )}
                    </div>
                  </div>
                </Field>
              </FormGrid>
            </div>

            <FormGrid>
              <Field label="Buồng bệnh (nếu có)">
                <Input
                  value={editing.room || ''}
                  onChange={event => setEditing({ ...editing, room: event.target.value })}
                  placeholder="VD: 201, 202, Hậu phẫu..."
                />
              </Field>

              <Field label="Chuyên mục công việc">
                <Select
                  value={editing.category || ''}
                  onChange={event => setEditing({ ...editing, category: event.target.value })}
                  options={[{ value: '', label: 'Chung' }, ...TASK_CATEGORIES.map(c => ({ value: c, label: c }))]}
                />
              </Field>

              <Field label="Trạng thái">
                <Select
                  value={normalizeStatus(editing.status)}
                  onChange={event => setEditing({ ...editing, status: event.target.value })}
                  options={[...STATUSES]}
                />
              </Field>
            </FormGrid>

            <Field label="Mức độ ưu tiên">
              <ChipGroup
                value={(editing.priority as string) || 'Thường'}
                onChange={value => setEditing({ ...editing, priority: value })}
                options={PRIORITIES.map(value => ({
                  value,
                  label: value,
                  activeClass:
                    value === 'Khẩn'
                      ? 'border-rose-500 bg-rose-500 text-white'
                      : value === 'Ưu tiên'
                        ? 'border-amber-500 bg-amber-500 text-white'
                        : undefined,
                }))}
              />
            </Field>

            <Field label="Ghi chú chi tiết">
              <Input
                value={editing.note || ''}
                onChange={event => setEditing({ ...editing, note: event.target.value })}
                placeholder="Lưu ý đặc biệt, thuốc cần dùng..."
              />
            </Field>
          </div>
        )}
      </Dialog>

      {/* =================== MODAL: CHUYỂN VIỆC (REASSIGN) =================== */}
      <Dialog
        open={Boolean(reassigningTask)}
        onClose={() => setReassigningTask(null)}
        title="Chuyển công việc cho người khác"
        footer={
          <>
            <Button variant="ghost" onClick={() => setReassigningTask(null)}>
              Huỷ
            </Button>
            <Button variant="primary" onClick={executeReassign}>
              Xác nhận chuyển
            </Button>
          </>
        }
      >
        {reassigningTask && (
          <div className="space-y-4">
            <div className="rounded-xl bg-sunken/60 p-3 text-sm">
              <p className="font-semibold text-fg">{reassigningTask.task}</p>
              <p className="text-xs text-muted mt-1">Đang phân công: {reassigningTask.assignee || 'Chưa phân công'}</p>
            </div>
            <Field label="Chuyển việc này cho" required>
              <Combobox
                value={reassignTarget}
                onChange={val => setReassignTarget(val)}
                options={assigneeOptions}
                placeholder="Chọn cá nhân hoặc nhóm nhận việc..."
                allowCustom
              />
            </Field>
          </div>
        )}
      </Dialog>

      {/* =================== MODAL: VIỆC THƯỜNG QUY =================== */}
      <TemplatesDialog
        open={templatesOpen}
        username={user.username}
        existing={tasks}
        activeNurses={activeNursesList}
        loading={pending === 'templates'}
        onClose={() => setTemplatesOpen(false)}
        onApply={async (items, targetAssignee) => {
          const payload = items.map(taskName => ({
            date,
            task: taskName,
            status: 'Chưa làm',
            priority: 'Thường',
            assignee: targetAssignee || '',
            assigneeType: targetAssignee ? (isGroupAssignee(targetAssignee) ? 'group' : 'individual') : undefined,
          }));
          const result = await run('templates', () => batchAddNursingTasks(payload), {
            success: `Đã thêm ${payload.length} việc thường quy`,
            invalidate: refreshAll,
          });
          if (result !== undefined) setTemplatesOpen(false);
        }}
      />

      {/* =================== MODAL: IN PHIẾU PHÂN CÔNG =================== */}
      <PrintHandoverDialog
        open={printOpen}
        onClose={() => setPrintOpen(false)}
        date={date}
        tasks={tasks}
        onCall={onCall}
        activeNurses={activeNursesList}
      />
    </div>
  );
};

/* ---------------- COMPONENT: MỘT MỤC CÔNG VIỆC (TASK ITEM) ---------------- */

const TaskItem: React.FC<{
  task: NursingTask;
  onCycle: (task: NursingTask) => void;
  onEdit: (task: NursingTask) => void;
  onRemove: (task: NursingTask) => void;
  onReassign: (task: NursingTask) => void;
  onSetStatus: (task: NursingTask, status: Status) => void;
}> = ({ task, onCycle, onEdit, onRemove, onReassign, onSetStatus }) => {
  const status = normalizeStatus(task.status);
  const done = status === 'Hoàn thành';
  const isGroup = isGroupAssignee(task.assignee);
  const overdue = isTaskOverdue(task);

  return (
    <li className="group flex items-start gap-2.5 rounded-xl px-2.5 py-2 hover:bg-sunken/70 transition-colors border border-transparent hover:border-line/40">
      <button
        onClick={() => onCycle(task)}
        className="mt-0.5 shrink-0 rounded-full transition-transform active:scale-90"
        title={`${status} — bấm để đổi trạng thái`}
        aria-label="Đổi trạng thái"
      >
        <StatusIcon status={task.status} />
      </button>

      <div className="min-w-0 flex-1">
        <p className={cn('text-sm leading-snug break-words', done ? 'text-muted line-through' : 'text-fg font-medium')}>
          {task.task}
        </p>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {task.priority && task.priority !== 'Thường' && (
            <Badge tone={task.priority === 'Khẩn' ? 'danger' : 'warning'}>
              {task.priority === 'Khẩn' ? '🔥 Khẩn' : '⭐ Ưu tiên'}
            </Badge>
          )}

          {status === 'Đang làm' && <Badge tone="info">Đang làm</Badge>}

          {overdue && <Badge tone="danger">⚠️ Quá hạn</Badge>}

          {task.gioHen && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-semibold px-1.5 py-0.5 rounded',
                overdue ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-primary/10 text-primary',
              )}
            >
              ⏰ Hạn: {task.gioHen}
            </span>
          )}

          {task.hanThucHien && task.hanThucHien !== task.date && (
            <span className="text-[11px] text-muted">
              📅 Hạn: {fmtDate(task.hanThucHien).slice(0, 5)}
            </span>
          )}

          {task.room && (
            <span className="inline-flex items-center gap-1 rounded bg-surface px-1.5 py-0.5 ring-1 ring-line text-[11px] font-medium text-muted">
              P.{task.room}
            </span>
          )}

          {task.group && (
            <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
              👥 {task.group}
            </span>
          )}

          {task.assignee && task.assignee !== task.group && (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-md font-medium',
                isGroup ? 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300' : 'bg-surface ring-1 ring-line text-muted',
              )}
            >
              {!isGroup && <Avatar name={task.assignee} size="xs" />}
              {task.assignee}
            </span>
          )}

          {task.ngayGiao && task.ngayGiao !== task.date && (
            <span className="text-[10px] text-muted hidden sm:inline-block">Giao: {fmtDate(task.ngayGiao).slice(0, 5)}</span>
          )}

          {task.category && (
            <span className="text-[11px] text-muted hidden sm:inline-block">· {task.category}</span>
          )}
        </div>

        {task.note && <p className="mt-1 text-xs text-muted leading-tight">{task.note}</p>}
      </div>

      <Menu
        className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
        trigger={({ toggle }) => <Button size="xs" variant="ghost" iconOnly icon={MoreHorizontal} onClick={toggle} aria-label="Thao tác" />}
        items={[
          { label: 'Sửa việc', icon: Edit3, onSelect: () => onEdit(task) },
          { label: 'Chuyển cho người khác', icon: ArrowRight, onSelect: () => onReassign(task) },
          ...STATUSES.filter(s => s !== status).map(s => ({
            label: `Đánh dấu: ${s}`,
            icon: s === 'Hoàn thành' ? CheckCircle2 : s === 'Đang làm' ? CircleDot : Circle,
            onSelect: () => onSetStatus(task, s),
          })),
          'divider' as const,
          { label: 'Xoá việc', icon: Trash2, danger: true, onSelect: () => onRemove(task) },
        ]}
      />
    </li>
  );
};

/* ---------------- COMPONENT: XEM THEO TUẦN ---------------- */

const WeekView: React.FC<{ weekStart: string; tasks: NursingTask[]; loading: boolean; onOpenDay: (date: string) => void }> = ({
  weekStart,
  tasks,
  loading,
  onOpenDay,
}) => {
  const today = todayKey();
  const days = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));

  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-line bg-sunken/70 text-xs text-muted">
            <th className="px-4 py-2.5 text-left font-semibold">Ngày</th>
            <th className="px-4 py-2.5 text-left font-semibold">Tiến độ hoàn thành</th>
            <th className="px-4 py-2.5 text-left font-semibold">Tổng số việc</th>
            <th className="px-4 py-2.5 text-left font-semibold">Việc ưu tiên / Khẩn</th>
            <th className="px-4 py-2.5 text-right font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {days.map(day => {
            const dayTasks = tasks.filter(task => task.date === day);
            const total = progressOf(dayTasks);
            return (
              <tr
                key={day}
                onClick={() => onOpenDay(day)}
                className={cn('cursor-pointer border-b border-line/60 hover:bg-sunken/60 transition-colors', day === today && 'bg-primary-soft/50')}
              >
                <td className="px-4 py-3">
                  <p className="font-semibold text-fg">
                    {weekdayShort(day)} · {fmtDate(day).slice(0, 5)}
                  </p>
                  {day === today && <span className="text-xs font-medium text-primary">Hôm nay</span>}
                </td>
                <td className="px-4 py-3">
                  {loading ? (
                    <Skeleton className="h-4 w-28" />
                  ) : dayTasks.length ? (
                    <div className="w-36">
                      <p className="num text-xs text-muted">
                        {total.done}/{total.total} việc ({total.pct}%)
                      </p>
                      <Progress value={total.pct} className="mt-1" />
                    </div>
                  ) : (
                    <span className="text-xs text-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-fg">{dayTasks.length ? `${dayTasks.length} việc` : '—'}</td>
                <td className="px-4 py-3">
                  {total.urgent > 0 ? (
                    <Badge tone="danger">🔥 {total.urgent} khẩn</Badge>
                  ) : total.priority > 0 ? (
                    <Badge tone="warning">⭐ {total.priority} ưu tiên</Badge>
                  ) : (
                    <span className="text-xs text-faint">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button size="xs" variant="ghost">
                    Xem chi tiết →
                  </Button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

/* ---------------- COMPONENT: VIỆC THƯỜNG QUY CHUYÊN KHOA ---------------- */

const TemplatesDialog: React.FC<{
  open: boolean;
  username: string;
  existing: NursingTask[];
  activeNurses: string[];
  loading: boolean;
  onClose: () => void;
  onApply: (items: string[], targetAssignee: string) => void;
}> = ({ open, username, existing, activeNurses, loading, onClose, onApply }) => {
  const storageKey = `${TEMPLATE_KEY}:${username}`;
  const [templates, setTemplates] = useState<Record<string, string[]>>(DEFAULT_CLINICAL_TEMPLATES);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetAssignee, setTargetAssignee] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>(TASK_CATEGORIES[0]);
  const [newText, setNewText] = useState('');
  const initialised = useRef(false);

  useEffect(() => {
    if (!open) {
      initialised.current = false;
      return;
    }
    if (initialised.current) return;
    initialised.current = true;
    const saved = readPref<Record<string, string[]>>(storageKey, DEFAULT_CLINICAL_TEMPLATES);
    setTemplates(saved);

    const existingTasksFolded = new Set(existing.map(task => fold(task.task)));
    const next = new Set<string>();
    Object.values(saved).forEach(list => {
      (list || []).forEach(text => {
        if (!existingTasksFolded.has(fold(text))) next.add(text);
      });
    });
    setSelected(next);
  }, [open, existing, storageKey]);

  const persist = (next: Record<string, string[]>) => {
    setTemplates(next);
    writePref(storageKey, next);
  };

  const toggle = (text: string) =>
    setSelected(current => {
      const next = new Set(current);
      if (next.has(text)) next.delete(text);
      else next.add(text);
      return next;
    });

  const categories = Object.keys(templates);
  const currentList = templates[activeCategory] || [];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="xl"
      title="Thêm việc thường quy điều dưỡng"
      description="Chọn các việc quy chuẩn y tế cần tạo cho ngày hôm nay và gán ngay cho cá nhân hoặc nhóm."
      footer={
        <>
          <Button variant="ghost" onClick={() => persist(DEFAULT_CLINICAL_TEMPLATES)} className="mr-auto">
            Khôi phục mẫu gốc
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" disabled={!selected.size} loading={loading} onClick={() => onApply(Array.from(selected), targetAssignee)}>
            Thêm {selected.size} việc
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Phân công cho ai khi thêm */}
        <div className="rounded-xl border border-line bg-sunken/40 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-fg">Phân công ngay cho</p>
            <p className="text-xs text-muted">Người hoặc Nhóm sẽ nhận các công việc được chọn</p>
          </div>
          <div className="min-w-[240px]">
            <Combobox
              value={targetAssignee}
              onChange={val => setTargetAssignee(val)}
              options={[
                { value: '', label: 'Để trống (Chưa phân công)' },
                ...NURSING_GROUPS.map(g => ({ value: g, label: g, description: 'Nhóm / Tổ' })),
                ...activeNurses.map(n => ({ value: n, label: n, description: 'Cá nhân' })),
              ]}
              placeholder="Chọn người hoặc nhóm..."
              allowCustom
            />
          </div>
        </div>

        {/* Danh mục & danh sách việc */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">Chuyên mục</p>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  'w-full text-left rounded-xl px-3 py-2 text-xs font-medium transition-colors',
                  activeCategory === cat ? 'bg-primary text-white font-semibold shadow-sm' : 'hover:bg-sunken text-fg',
                )}
              >
                {cat} ({(templates[cat] || []).length})
              </button>
            ))}
          </div>

          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-fg">{activeCategory}</p>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => {
                  const allSelected = currentList.every(t => selected.has(t));
                  setSelected(current => {
                    const next = new Set(current);
                    currentList.forEach(t => (allSelected ? next.delete(t) : next.add(t)));
                    return next;
                  });
                }}
              >
                {currentList.every(t => selected.has(t)) ? 'Bỏ chọn tất cả' : 'Chọn tất cả mục này'}
              </Button>
            </div>

            <ul className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
              {currentList.map(text => (
                <li key={text} className="group flex items-start gap-2 rounded-lg p-1.5 hover:bg-sunken/60">
                  <Checkbox checked={selected.has(text)} onChange={() => toggle(text)} label={<span className="text-xs text-fg">{text}</span>} className="flex-1 items-start" />
                  <button
                    onClick={() => persist({ ...templates, [activeCategory]: currentList.filter(item => item !== text) })}
                    className="rounded p-0.5 text-faint opacity-0 hover:text-rose-500 group-hover:opacity-100 transition-opacity"
                    aria-label="Xoá khỏi mẫu"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>

            <form
              className="flex gap-1.5 pt-2 border-t border-line"
              onSubmit={e => {
                e.preventDefault();
                const trimmed = newText.trim();
                if (!trimmed) return;
                persist({ ...templates, [activeCategory]: [...currentList, trimmed] });
                setSelected(current => new Set(current).add(trimmed));
                setNewText('');
              }}
            >
              <Input value={newText} onChange={e => setNewText(e.target.value)} placeholder={`Thêm mẫu vào "${activeCategory}"…`} className="h-8 text-xs" />
              <Button type="submit" size="sm" iconOnly icon={Plus} variant="soft" aria-label="Thêm mẫu" />
            </form>
          </div>
        </div>
      </div>
    </Dialog>
  );
};

/* ---------------- COMPONENT: IN PHIẾU BÀN GIAO & PHÂN CÔNG ---------------- */

const PrintHandoverDialog: React.FC<{
  open: boolean;
  onClose: () => void;
  date: string;
  tasks: NursingTask[];
  onCall: any;
  activeNurses: string[];
}> = ({ open, onClose, date, tasks, onCall, activeNurses }) => {
  const triggerPrint = () => {
    window.print();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      size="lg"
      title="In bảng phân công công tác điều dưỡng"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          <Button variant="primary" icon={Printer} onClick={triggerPrint}>
            In bảng phân công
          </Button>
        </>
      }
    >
      <div id="print-nursing-sheet" className="p-4 bg-white text-black space-y-4 font-sans text-xs">
        <div className="flex justify-between items-start border-b pb-3">
          <div>
            <p className="font-bold uppercase text-sm">BỆNH VIỆN · KHOA NGOẠI TỔNG HỢP</p>
            <p className="text-[11px] text-gray-600">Hệ thống quản lý công tác điều dưỡng</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-sm uppercase">PHIẾU PHÂN CÔNG CÔNG TÁC ĐIỀU DƯỠNG</p>
            <p className="font-semibold text-gray-700">Ngày: {fmtDate(date)}</p>
          </div>
        </div>

        {onCall && (
          <div className="text-xs bg-gray-50 p-2 rounded border border-gray-200">
            <p>
              <b>Kíp trực:</b> BS. {onCall.doctor} — ĐD trực: {[onCall.nurse1, onCall.nurse2].filter(Boolean).join(', ')}
            </p>
            {activeNurses.length > 0 && (
              <p className="text-[11px] text-gray-500 mt-0.5">
                <b>Nhân lực ĐD:</b> {activeNurses.join(', ')}
              </p>
            )}
          </div>
        )}

        <table className="w-full border-collapse border border-gray-300 text-left text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-300 p-1.5 w-8 text-center">STT</th>
              <th className="border border-gray-300 p-1.5">Nội dung công việc</th>
              <th className="border border-gray-300 p-1.5 w-36">Nhóm / Người nhận</th>
              <th className="border border-gray-300 p-1.5 w-20 text-center">Hạn</th>
              <th className="border border-gray-300 p-1.5 w-14 text-center">Buồng</th>
              <th className="border border-gray-300 p-1.5 w-16 text-center">Ưu tiên</th>
              <th className="border border-gray-300 p-1.5 w-20 text-center">Ký nhận</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length === 0 ? (
              <tr>
                <td colSpan={7} className="border border-gray-300 p-4 text-center text-gray-500">
                  Chưa có công việc nào trong ngày
                </td>
              </tr>
            ) : (
              tasks.map((task, idx) => (
                <tr key={task.id}>
                  <td className="border border-gray-300 p-1.5 text-center">{idx + 1}</td>
                  <td className="border border-gray-300 p-1.5">
                    <p className="font-medium">{task.task}</p>
                    {task.note && <p className="text-[10px] text-gray-500">{task.note}</p>}
                  </td>
                  <td className="border border-gray-300 p-1.5 font-medium">
                    {task.group && task.group !== task.assignee && (
                      <span className="block text-[10px] text-gray-500 font-normal">{task.group}</span>
                    )}
                    {task.assignee || task.group || '—'}
                  </td>
                  <td className="border border-gray-300 p-1.5 text-center font-medium">
                    {task.gioHen || (task.hanThucHien && task.hanThucHien !== task.date ? fmtDate(task.hanThucHien).slice(0, 5) : 'Trong ngày')}
                  </td>
                  <td className="border border-gray-300 p-1.5 text-center">{task.room || '—'}</td>
                  <td className="border border-gray-300 p-1.5 text-center font-semibold">
                    {task.priority || 'Thường'}
                  </td>
                  <td className="border border-gray-300 p-1.5 text-center">
                    {normalizeStatus(task.status) === 'Hoàn thành' ? 'Đã xong' : ''}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="grid grid-cols-2 pt-6 text-center">
          <div>
            <p className="font-bold">ĐẠI DIỆN KÍP TRỰC</p>
            <p className="text-[10px] text-gray-500">(Ký và ghi rõ họ tên)</p>
          </div>
          <div>
            <p className="font-bold">ĐIỀU DƯỠNG TRƯỞNG KHOA</p>
            <p className="text-[10px] text-gray-500">(Ký và ghi rõ họ tên)</p>
          </div>
        </div>
      </div>
    </Dialog>
  );
};
