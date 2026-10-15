import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Award, CheckCircle2, ClipboardCheck, ClipboardList, Edit3, LayoutDashboard, MoreHorizontal, Plus, RefreshCw, Trash2, UserRound } from 'lucide-react';
import { STAFF_TASK_PRIORITIES, STAFF_TASK_STATUSES, type StaffEvaluation, type StaffTask } from '../../types';
import {
  addStaffEvaluation,
  addStaffTask,
  deleteStaffEvaluation,
  deleteStaffTask,
  getStaffEvaluations,
  getStaffTasks,
  updateStaffEvaluation,
  updateStaffTask,
} from '../../services/dataService';
import { useApp } from '../../context/AppContext';
import { KEYS, useDirectory } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { mutateCache, useResource } from '../../lib/resource';
import { fmtDate, relativeDay, todayKey, addDays } from '../../lib/dates';
import { PRIORITY_TONE, isAdminAccount } from '../../lib/domain';
import { matchesQuery } from '../../lib/text';
import { cn } from '../../lib/cn';
import {
  Avatar,
  Badge,
  Button,
  Card,
  ChipGroup,
  Combobox,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FormGrid,
  Input,
  Menu,
  PageHeader,
  Progress,
  SearchInput,
  Segmented,
  Select,
  SkeletonRows,
  Tabs,
  Textarea,
  Toolbar,
  confirmAction,
  showToast,
} from '../../components/ui';
import {
  EVAL_STATUS,
  calcScore,
  criteriaOf,
  guessGroup,
  isBriefingTask,
  isDone,
  isOverdue,
  isPendingEvaluation,
  normalizeEvaluation,
  normalizeTask,
  parseSelfAssessment,
  periodLabel,
  periodRange,
  periodStats,
  rankFromScore,
  samePeriod,
  summarizeStaff,
  validateEvaluation,
  withCompletionDate,
} from './staffLogic';
import { StaffOverview, StaffPersonDrawer } from './StaffOverview';
import { AcknowledgeDialog, EvaluationDialog, EvaluationsTab, SelfAssessmentDialog } from './StaffEvaluations';

type Tab = 'overview' | 'mine' | 'all' | 'evaluations';
type Filter = 'open' | 'overdue' | 'done' | 'all';

const STATUS_TONE: Record<string, 'neutral' | 'info' | 'success' | 'warning'> = {
  'Chưa làm': 'neutral',
  'Đang làm': 'info',
  'Hoàn thành': 'success',
  'Tạm dừng': 'warning',
};

export const StaffPage: React.FC = () => {
  const { user, chief } = useApp();
  const manager = chief || String(user.role) === 'DIEU_DUONG_TRUONG';
  const defaultTab: Tab = manager ? 'overview' : 'mine';
  const [params, setParams] = useSearchParams();
  const today = todayKey();
  const tasksRes = useResource<StaffTask[]>(KEYS.staffTasks, async options => ((await getStaffTasks(options)) || []).map(normalizeTask));
  const evalRes = useResource<StaffEvaluation[]>(KEYS.staffEvaluations, async options => ((await getStaffEvaluations(options)) || []).map(normalizeEvaluation));
  const { users } = useDirectory();
  const { run, pending } = useAction();

  const tab = (params.get('tab') as Tab) || defaultTab;
  const [viewingPerson, setViewingPerson] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>(params.get('filter') === 'overdue' ? 'overdue' : 'open');
  const [person, setPerson] = useState('');
  const [search, setSearch] = useState('');
  const [editingTask, setEditingTask] = useState<Partial<StaffTask> | null>(null);
  const [evalPerson, setEvalPerson] = useState('');
  const [editingEval, setEditingEval] = useState<Partial<StaffEvaluation> | null>(null);
  const [evalErrors, setEvalErrors] = useState<string[]>([]);
  const [selfDraft, setSelfDraft] = useState<Partial<StaffEvaluation> | null>(null);
  const [selfErrors, setSelfErrors] = useState<string[]>([]);
  const [acknowledging, setAcknowledging] = useState<StaffEvaluation | null>(null);

  const tasks = useMemo(() => tasksRes.data || [], [tasksRes.data]);
  const evaluations = useMemo(() => evalRes.data || [], [evalRes.data]);
  const nameOf = (username: string) => users.find(item => item.username === username)?.fullName || username;
  const userOptions = useMemo(() => users.map(item => ({ value: item.username, label: item.fullName || item.username, keywords: item.username })), [users]);

  const setTab = (value: Tab) => {
    const next = new URLSearchParams(params);
    if (value === defaultTab) next.delete('tab');
    else next.set('tab', value);
    next.delete('filter');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    const id = params.get('task');
    if (!id || !tasks.length) return;
    const target = tasks.find(task => task.id === id);
    if (target) setEditingTask(target);
    const next = new URLSearchParams(params);
    next.delete('task');
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, tasks.length]);

  useEffect(() => {
    if (params.get('filter') === 'overdue' && tab !== 'all' && manager) setTab('all');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mine = (task: StaffTask) => task.userId === user.username || task.assigneeUsername === user.username;
  const scope = tab === 'mine' ? tasks.filter(mine) : tasks;
  const counts = {
    open: scope.filter(task => !isDone(task)).length,
    overdue: scope.filter(task => isOverdue(task, today)).length,
    done: scope.filter(isDone).length,
    all: scope.length,
  };

  const visibleTasks = useMemo(
    () =>
      scope
        .filter(task => (filter === 'open' ? !isDone(task) : filter === 'overdue' ? isOverdue(task, today) : filter === 'done' ? isDone(task) : true))
        .filter(task => tab !== 'all' || !person || task.userId === person || task.assigneeUsername === person)
        .filter(task => matchesQuery(search, task.tieuDe, task.noiDung, task.assigneeName, nameOf(task.userId), task.sourceLabel))
        .sort((a, b) => {
          const overdueDiff = Number(isOverdue(b, today)) - Number(isOverdue(a, today));
          if (overdueDiff) return overdueDiff;
          return (a.hanHoanThanh || '9999').localeCompare(b.hanHoanThanh || '9999');
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scope, filter, person, search, tab, today, users],
  );

  const saveTask = async () => {
    if (!editingTask) return;
    if (!String(editingTask.tieuDe || '').trim()) return showToast('Công việc cần có tiêu đề', 'warning');
    if (!editingTask.userId) return showToast('Chọn người được giao', 'warning');
    const payload = withCompletionDate(
      normalizeTask({
        ...editingTask,
        assigneeUsername: editingTask.userId,
        assigneeName: nameOf(editingTask.userId),
        noiDung: editingTask.noiDung || editingTask.tieuDe,
        trangThai: Number(editingTask.tienDo) >= 100 ? 'Hoàn thành' : editingTask.trangThai,
      }),
      editingTask.id ? tasks.find(task => task.id === editingTask.id) : null,
      today,
    );
    const result = await run('save-task', () => (payload.id ? updateStaffTask(payload.id, payload) : addStaffTask(payload)), {
      success: payload.id ? 'Đã cập nhật công việc' : 'Đã giao việc',
      invalidate: [KEYS.staffTasks, KEYS.ops],
    });
    if (result !== undefined) setEditingTask(null);
  };

  const quickDone = async (task: StaffTask) => {
    const next = withCompletionDate({ ...task, trangThai: 'Hoàn thành', tienDo: 100 }, task, today);
    mutateCache<StaffTask[]>(KEYS.staffTasks, current => (current || []).map(item => (item.id === task.id ? next : item)));
    await run(`done-${task.id}`, () => updateStaffTask(task.id, next), { success: 'Đã hoàn thành', invalidate: [KEYS.ops] });
  };

  const removeTask = async (task: StaffTask) => {
    const ok = await confirmAction({ title: 'Xoá công việc?', message: task.tieuDe, confirmText: 'Xoá' });
    if (!ok) return;
    const result = await run('delete-task', () => deleteStaffTask(task.id), { success: 'Đã xoá công việc', invalidate: [KEYS.staffTasks, KEYS.ops] });
    if (result !== undefined) setEditingTask(null);
  };

  /* -------- Đánh giá -------- */
  /** Kỳ mặc định: quý hiện tại, riêng tháng đầu quý thì là quý vừa kết thúc (thời điểm khoa thường chấm). */
  const currentPeriod = useMemo<Partial<StaffEvaluation>>(() => {
    const month = Number(today.slice(5, 7));
    let year = Number(today.slice(0, 4));
    let quarter = Math.ceil(month / 3);
    if ((month - 1) % 3 === 0) {
      quarter -= 1;
      if (quarter === 0) {
        quarter = 4;
        year -= 1;
      }
    }
    return { loaiDanhGia: 'Quý', quy: `Q${quarter}`, nam: year };
  }, [today]);

  const selectedEvalUser = evalPerson || users[0]?.username || '';
  const tasksOf = (username = '') => tasks.filter(task => task.userId === username || task.assigneeUsername === username);
  const blankScores: Partial<StaffEvaluation> = { diemHoanThanhCongViec: '', diemChuyenMon: '', diemThaiDo: '', diemKyLuat: '', diemPhoiHop: '', diemSangKien: '' };

  const openEvaluation = (evaluation: StaffEvaluation) => {
    setEvalErrors([]);
    setEditingEval(isPendingEvaluation(evaluation) ? { ...evaluation, ...blankScores } : evaluation);
  };

  const startEvaluation = (username: string) => {
    const existing = evaluations.find(item => samePeriod(item, { ...currentPeriod, userId: username }));
    if (existing) return openEvaluation(existing);
    setEvalErrors([]);
    setEditingEval({ userId: username, ...currentPeriod, nhomDanhGia: guessGroup(username, nameOf(username)), ...blankScores, nhanXet: '' });
  };

  const saveEvaluation = async () => {
    if (!editingEval) return;
    const stats = periodStats(tasksOf(editingEval.userId), periodRange(editingEval), today);
    const errors = validateEvaluation(editingEval, stats.suggested);
    if (evaluations.some(item => item.id !== editingEval.id && samePeriod(item, editingEval))) errors.push(`Kỳ ${periodLabel(editingEval)} đã có bản đánh giá`);
    setEvalErrors(errors);
    if (errors.length) return showToast(errors[0], 'warning');
    const used = new Set(criteriaOf(editingEval).map(criterion => criterion.key));
    const scores = Object.fromEntries(Object.keys(blankScores).map(key => [key, used.has(key as never) ? editingEval[key as keyof StaffEvaluation] : '']));
    const previous = editingEval.id ? evaluations.find(item => item.id === editingEval.id) : undefined;
    // Giữ trạng thái "đã xác nhận" chỉ khi điểm và nhận xét không đổi; đổi thì nhân viên xác nhận lại.
    const keepAck =
      previous?.trangThai === EVAL_STATUS.acknowledged &&
      criteriaOf(previous).every(criterion => Number(previous[criterion.key]) === Number(editingEval[criterion.key])) &&
      previous.nhanXet === editingEval.nhanXet;
    const score = calcScore(editingEval);
    const payload = normalizeEvaluation({
      ...editingEval,
      ...scores,
      diemTong: score,
      xepLoai: rankFromScore(score),
      diemGoiY: stats.suggested ?? '',
      soLieuJson: JSON.stringify(stats),
      trangThai: keepAck ? EVAL_STATUS.acknowledged : EVAL_STATUS.evaluated,
      ngayXacNhan: keepAck ? previous?.ngayXacNhan : '',
      nguoiDanhGia: user.fullName || user.username,
      ngayDanhGia: today,
    });
    const result = await run('save-eval', () => (payload.id ? updateStaffEvaluation(payload.id, payload) : addStaffEvaluation(payload)), {
      success: 'Đã lưu đánh giá',
      invalidate: [KEYS.staffEvaluations],
    });
    if (result !== undefined) setEditingEval(null);
  };

  const removeEvaluation = async (evaluation: StaffEvaluation) => {
    const ok = await confirmAction({ title: 'Xoá bản đánh giá này?', message: `${nameOf(evaluation.userId)} · ${periodLabel(evaluation)}`, confirmText: 'Xoá' });
    if (!ok) return;
    await run('delete-eval', () => deleteStaffEvaluation(evaluation.id), { success: 'Đã xoá', invalidate: [KEYS.staffEvaluations] });
  };

  const openSelfAssessment = (evaluation: StaffEvaluation) => {
    setSelfErrors([]);
    setSelfDraft(evaluation);
  };

  const startSelfAssessment = () => {
    const existing = evaluations.find(item => samePeriod(item, { ...currentPeriod, userId: user.username }));
    if (existing && !isPendingEvaluation(existing)) return showToast(`Kỳ ${periodLabel(existing)} đã được đánh giá`, 'info');
    if (existing) return openSelfAssessment(existing);
    setSelfErrors([]);
    setSelfDraft({ userId: user.username, ...currentPeriod, nhomDanhGia: guessGroup(user.username, user.fullName || ''), trangThai: EVAL_STATUS.pending, tuDanhGiaJson: '' });
  };

  const saveSelfAssessment = async () => {
    if (!selfDraft) return;
    const self = parseSelfAssessment(selfDraft);
    const missing = criteriaOf(selfDraft).filter(criterion => self?.scores[criterion.key] === undefined);
    const errors = missing.length ? [`Chưa chấm: ${missing.map(criterion => criterion.label).join(', ')}`] : [];
    if (evaluations.some(item => item.id !== selfDraft.id && samePeriod(item, selfDraft))) errors.push(`Kỳ ${periodLabel(selfDraft)} đã có bản đánh giá`);
    setSelfErrors(errors);
    if (errors.length || !self) return showToast(errors[0] || 'Chưa chấm tiêu chí nào', 'warning');
    const payload = normalizeEvaluation({
      ...selfDraft,
      ...blankScores,
      trangThai: EVAL_STATUS.pending,
      tuDanhGiaJson: JSON.stringify({ ...self, ngay: today }),
      nguoiDanhGia: '',
      ngayDanhGia: today,
    });
    const result = await run('save-self', () => (payload.id ? updateStaffEvaluation(payload.id, payload) : addStaffEvaluation(payload)), {
      success: 'Đã gửi tự đánh giá',
      invalidate: [KEYS.staffEvaluations],
    });
    if (result !== undefined) setSelfDraft(null);
  };

  const acknowledgeEvaluation = async (comment: string) => {
    if (!acknowledging) return;
    const payload = { ...acknowledging, trangThai: EVAL_STATUS.acknowledged, ngayXacNhan: today, yKienNhanVien: comment };
    const result = await run('ack-eval', () => updateStaffEvaluation(acknowledging.id, payload), { success: 'Đã xác nhận kết quả', invalidate: [KEYS.staffEvaluations] });
    if (result !== undefined) setAcknowledging(null);
  };

  // Số liệu toàn khoa chỉ tính nhân sự: bỏ việc giao cho tài khoản quản trị.
  const staffTasks = useMemo(() => tasks.filter(task => !isAdminAccount({ username: task.assigneeUsername || task.userId })), [tasks]);
  const overview = useMemo(() => summarizeStaff(users, staffTasks, evaluations, today), [users, staffTasks, evaluations, today]);
  const viewedSummary = viewingPerson ? overview.people.find(item => item.username === viewingPerson) || null : null;

  const newTask = (forUser?: string): Partial<StaffTask> => ({
    userId: forUser || (tab === 'mine' ? user.username : person || ''),
    tieuDe: '',
    noiDung: '',
    nguoiGiao: user.fullName || user.username,
    ngayGiao: today,
    hanHoanThanh: addDays(today, 3),
    mucDoUuTien: 'Trung bình',
    trangThai: 'Chưa làm',
    tienDo: 0,
  });

  const loading = tab === 'evaluations' ? evalRes.loading : tasksRes.loading;
  const overviewLoading = tasksRes.loading || (!users.length && !tasksRes.error);
  const activeError = tab === 'evaluations' ? evalRes.error : tasksRes.error;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Công việc & đánh giá"
        icon={ClipboardCheck}
        description="Theo dõi việc được giao (kể cả từ giao ban) và đánh giá nhân viên định kỳ"
        actions={
          <>
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={tasksRes.validating || evalRes.validating} onClick={() => (tab === 'evaluations' ? evalRes.reload() : tasksRes.reload())} aria-label="Làm mới" />
            {tab === 'evaluations' ? (
              manager ? (
                <Button variant="primary" icon={Plus} disabled={!selectedEvalUser} onClick={() => startEvaluation(selectedEvalUser)}>
                  Đánh giá {periodLabel(currentPeriod)}
                </Button>
              ) : (
                <Button variant="primary" icon={Award} onClick={startSelfAssessment}>
                  Tự đánh giá
                </Button>
              )
            ) : (
              <Button variant="primary" icon={Plus} onClick={() => setEditingTask(newTask())}>
                Giao việc
              </Button>
            )}
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="px-3 pt-1 sm:px-4">
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            items={[
              ...(manager ? [{ value: 'overview' as Tab, label: 'Tổng quan', icon: LayoutDashboard, count: overview.people.filter(item => item.load === 'over').length, countTone: 'danger' as const }] : []),
              { value: 'mine', label: 'Việc của tôi', icon: UserRound, count: tasks.filter(task => mine(task) && !isDone(task)).length, countTone: 'primary' },
              { value: 'all', label: 'Toàn khoa', icon: ClipboardList, count: tasks.filter(task => isOverdue(task, today)).length, countTone: 'danger' },
              { value: 'evaluations', label: 'Đánh giá', icon: Award },
            ]}
          />
        </div>

        {activeError && !(tab === 'evaluations' ? evalRes.data : tasksRes.data) ? (
          <ErrorState error={activeError} onRetry={() => (tab === 'evaluations' ? evalRes.reload() : tasksRes.reload())} />
        ) : tab === 'overview' ? (
          <StaffOverview
            people={overview.people}
            tasks={staffTasks}
            today={today}
            unassignedCount={overview.unassigned.length}
            loading={overviewLoading}
            onOpen={setViewingPerson}
            onAssign={username => setEditingTask(newTask(username))}
          />
        ) : tab !== 'evaluations' ? (
          <>
            <Toolbar>
              <SearchInput value={search} onChange={setSearch} placeholder="Tìm công việc…" className="sm:w-72" />
              <Segmented<Filter>
                size="sm"
                value={filter}
                onChange={setFilter}
                items={[
                  { value: 'open', label: 'Đang mở', count: counts.open },
                  { value: 'overdue', label: 'Quá hạn', count: counts.overdue },
                  { value: 'done', label: 'Hoàn thành', count: counts.done },
                  { value: 'all', label: 'Tất cả', count: counts.all },
                ]}
              />
              {tab === 'all' && <Combobox value={person} onChange={setPerson} options={userOptions} placeholder="Lọc theo người" className="sm:w-56" />}
            </Toolbar>
            {loading ? (
              <SkeletonRows />
            ) : visibleTasks.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title={filter === 'overdue' ? 'Không có việc quá hạn' : tab === 'mine' ? 'Bạn không có việc nào trong mục này' : 'Không có công việc phù hợp'}
                description={tab === 'mine' && filter === 'open' ? 'Việc được giao trong sổ giao ban cũng sẽ hiện ở đây.' : undefined}
              />
            ) : (
              <ul className="divide-y divide-line">
                {visibleTasks.map(task => {
                  const overdue = isOverdue(task, today);
                  const done = isDone(task);
                  return (
                    <li key={task.id} className="group flex items-start gap-3 px-4 py-3 hover:bg-sunken/60 sm:px-5">
                      <button
                        onClick={() => !done && quickDone(task)}
                        className={cn('mt-0.5 shrink-0 rounded-full transition-transform active:scale-90', done ? 'cursor-default text-emerald-500' : 'text-faint hover:text-emerald-500')}
                        title={done ? 'Đã hoàn thành' : 'Đánh dấu hoàn thành'}
                        aria-label="Hoàn thành"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <button onClick={() => setEditingTask(task)} className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className={cn('text-sm font-medium', done ? 'text-muted line-through' : 'text-fg')}>{task.tieuDe || '(Không tiêu đề)'}</p>
                          {isBriefingTask(task) && <Badge tone="primary">Giao ban {task.sourceDate ? fmtDate(task.sourceDate).slice(0, 5) : ''}</Badge>}
                          {task.mucDoUuTien !== 'Trung bình' && <Badge tone={PRIORITY_TONE[task.mucDoUuTien] || 'neutral'}>{task.mucDoUuTien}</Badge>}
                        </div>
                        {task.noiDung && task.noiDung !== task.tieuDe && <p className="mt-0.5 line-clamp-1 text-xs text-muted">{task.noiDung}</p>}
                        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          {tab === 'all' && (
                            <span className="inline-flex items-center gap-1.5">
                              <Avatar name={task.assigneeName || nameOf(task.userId)} size="xs" /> {task.assigneeName || nameOf(task.userId)}
                            </span>
                          )}
                          {task.hanHoanThanh && (
                            <span className={cn(overdue && 'font-semibold text-rose-600 dark:text-rose-400')}>
                              Hạn {fmtDate(task.hanHoanThanh)} · {relativeDay(task.hanHoanThanh)}
                            </span>
                          )}
                          <Badge tone={STATUS_TONE[task.trangThai] || 'neutral'}>{task.trangThai}</Badge>
                          <Progress value={Number(task.tienDo)} className="w-24" />
                        </div>
                      </button>
                      <Menu
                        className="opacity-100 md:opacity-0 md:group-hover:opacity-100"
                        trigger={({ toggle }) => <Button size="sm" variant="ghost" iconOnly icon={MoreHorizontal} onClick={toggle} aria-label="Thao tác" />}
                        items={[
                          { label: 'Mở / cập nhật', icon: Edit3, onSelect: () => setEditingTask(task) },
                          ...(!done ? [{ label: 'Đánh dấu hoàn thành', icon: CheckCircle2, onSelect: () => quickDone(task) }] : []),
                          'divider' as const,
                          { label: 'Xoá', icon: Trash2, danger: true, onSelect: () => removeTask(task) },
                        ]}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : (
          <EvaluationsTab
            manager={manager}
            me={user.username}
            users={users}
            evaluations={evaluations}
            currentPeriod={currentPeriod}
            selected={selectedEvalUser}
            onSelect={setEvalPerson}
            loading={loading}
            onEvaluate={startEvaluation}
            onEdit={openEvaluation}
            onDelete={removeEvaluation}
            onSelfAssess={startSelfAssessment}
            onEditSelf={openSelfAssessment}
            onAcknowledge={setAcknowledging}
          />
        )}
      </Card>

      {viewedSummary && !editingTask && !editingEval && (
        <StaffPersonDrawer
          person={viewedSummary}
          evaluations={evaluations}
          today={today}
          onClose={() => setViewingPerson(null)}
          onOpenTask={task => setEditingTask(task)}
          onComplete={quickDone}
          onAssign={username => setEditingTask(newTask(username))}
          onEvaluate={manager ? startEvaluation : undefined}
        />
      )}

      {/* Drawer công việc */}
      <Drawer
        open={Boolean(editingTask)}
        onClose={() => setEditingTask(null)}
        persistent
        title={editingTask?.id ? 'Cập nhật công việc' : 'Giao việc mới'}
        subtitle={editingTask && isBriefingTask(editingTask) ? `Từ giao ban ${fmtDate(editingTask.sourceDate)}` : undefined}
        footer={
          <>
            {editingTask?.id && (
              <Button variant="danger-soft" icon={Trash2} className="mr-auto" onClick={() => removeTask(editingTask as StaffTask)}>
                Xoá
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEditingTask(null)}>
              Huỷ
            </Button>
            <Button variant="primary" loading={pending === 'save-task'} onClick={saveTask}>
              Lưu
            </Button>
          </>
        }
      >
        {editingTask && (
          <div className="space-y-4">
            <Field label="Tiêu đề" required>
              <Input value={editingTask.tieuDe || ''} onChange={event => setEditingTask({ ...editingTask, tieuDe: event.target.value })} />
            </Field>
            <Field label="Nội dung chi tiết">
              <Textarea value={editingTask.noiDung || ''} onChange={event => setEditingTask({ ...editingTask, noiDung: event.target.value })} rows={3} />
            </Field>
            <FormGrid>
              <Field label="Người được giao" required>
                <Combobox value={editingTask.userId || ''} onChange={value => setEditingTask({ ...editingTask, userId: value })} options={userOptions} placeholder="Chọn nhân viên" />
              </Field>
              <Field label="Người giao">
                <Input value={editingTask.nguoiGiao || ''} onChange={event => setEditingTask({ ...editingTask, nguoiGiao: event.target.value })} />
              </Field>
              <Field label="Ngày giao">
                <Input type="date" value={editingTask.ngayGiao || ''} onChange={event => setEditingTask({ ...editingTask, ngayGiao: event.target.value })} />
              </Field>
              <Field label="Hạn hoàn thành">
                <Input type="date" value={editingTask.hanHoanThanh || ''} onChange={event => setEditingTask({ ...editingTask, hanHoanThanh: event.target.value })} />
              </Field>
            </FormGrid>
            <Field label="Mức ưu tiên">
              <ChipGroup
                value={(editingTask.mucDoUuTien || 'Trung bình') as StaffTask['mucDoUuTien']}
                onChange={value => setEditingTask({ ...editingTask, mucDoUuTien: value })}
                options={STAFF_TASK_PRIORITIES.map(value => ({ value, label: value }))}
              />
            </Field>
            <FormGrid>
              <Field label="Trạng thái">
                <Select value={editingTask.trangThai || 'Chưa làm'} onChange={event => setEditingTask({ ...editingTask, trangThai: event.target.value as StaffTask['trangThai'] })} options={[...STAFF_TASK_STATUSES]} />
              </Field>
              <Field label={`Tiến độ: ${Number(editingTask.tienDo) || 0}%`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={10}
                  value={Number(editingTask.tienDo) || 0}
                  onChange={event => {
                    const value = Number(event.target.value);
                    setEditingTask({ ...editingTask, tienDo: value, trangThai: value >= 100 ? 'Hoàn thành' : value > 0 && editingTask.trangThai === 'Chưa làm' ? 'Đang làm' : editingTask.trangThai });
                  }}
                  className="mt-2 w-full accent-[rgb(var(--primary))]"
                />
              </Field>
            </FormGrid>
            <Field label="Kết quả">
              <Textarea value={editingTask.ketQua || ''} onChange={event => setEditingTask({ ...editingTask, ketQua: event.target.value })} rows={2} />
            </Field>
            <Field label="Ghi chú">
              <Input value={editingTask.ghiChu || ''} onChange={event => setEditingTask({ ...editingTask, ghiChu: event.target.value })} />
            </Field>
          </div>
        )}
      </Drawer>

      <EvaluationDialog
        draft={editingEval}
        onChange={setEditingEval}
        onClose={() => setEditingEval(null)}
        onSave={saveEvaluation}
        saving={pending === 'save-eval'}
        personName={nameOf(editingEval?.userId || '')}
        tasks={tasksOf(editingEval?.userId)}
        evaluations={evaluations}
        today={today}
        errors={evalErrors}
        onOpenExisting={openEvaluation}
      />
      <SelfAssessmentDialog
        draft={selfDraft}
        onChange={setSelfDraft}
        onClose={() => setSelfDraft(null)}
        onSave={saveSelfAssessment}
        saving={pending === 'save-self'}
        tasks={tasksOf(user.username)}
        evaluations={evaluations}
        today={today}
        errors={selfErrors}
      />
      <AcknowledgeDialog key={acknowledging?.id || 'none'} evaluation={acknowledging} onClose={() => setAcknowledging(null)} onConfirm={acknowledgeEvaluation} saving={pending === 'ack-eval'} />
    </div>
  );
};
