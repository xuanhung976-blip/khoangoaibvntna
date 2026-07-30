import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  ClipboardCheck,
  Edit2,
  Loader2,
  Plus,
  Star,
  Trash2,
  UserCheck,
} from 'lucide-react';
import {
  STAFF_EVALUATION_TYPES,
  STAFF_TASK_PRIORITIES,
  STAFF_TASK_STATUSES,
  StaffEvaluation,
  StaffTask,
  User,
} from '../types';
import {
  addStaffEvaluation,
  addStaffTask,
  deleteStaffEvaluation,
  deleteStaffTask,
  getStaffEvaluations,
  getStaffTasks,
  getUsers,
  updateStaffEvaluation,
  updateStaffTask,
  writeActionLog,
} from '../services/dataService';
import { Modal } from '../components/Modal';
import { showToast } from '../components/Toast';

type StaffPerformanceProps = {
  currentUser: User;
};

type TabKey = 'tasks' | 'evaluations';

const today = () => new Date().toISOString().split('T')[0];

const toBool = (value: unknown) =>
  value === true || value === 'TRUE' || value === 'true' || value === '1' || value === 1;

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clampPercent = (value: unknown) => Math.max(0, Math.min(100, toNumber(value)));
const clampScore = (value: unknown) => Math.max(0, Math.min(100, toNumber(value)));
const isBriefingTask = (task: Partial<StaffTask>) =>
  ['GIAO_BAN', 'daily_briefing'].includes(String(task.sourceType || ''));

const normalizeStatus = (status: unknown): StaffTask['trangThai'] => {
  const value = String(status || '');
  return STAFF_TASK_STATUSES.includes(value as StaffTask['trangThai'])
    ? (value as StaffTask['trangThai'])
    : 'Chưa làm';
};

const normalizePriority = (priority: unknown): StaffTask['mucDoUuTien'] => {
  const value = String(priority || '');
  return STAFF_TASK_PRIORITIES.includes(value as StaffTask['mucDoUuTien'])
    ? (value as StaffTask['mucDoUuTien'])
    : 'Trung bình';
};

const normalizeEvaluationType = (type: unknown) => {
  const value = String(type || '');
  return STAFF_EVALUATION_TYPES.includes(value as 'Quý' | 'Năm') ? value : 'Quý';
};

const normalizeTask = (task: Partial<StaffTask>): StaffTask => ({
  id: String(task.id || ''),
  userId: String(task.userId || (task as any).username || (task as any).assigneeUsername || ''),
  tieuDe: String(task.tieuDe || (task as any).title || ''),
  noiDung: String(task.noiDung || (task as any).description || ''),
  nguoiGiao: String(task.nguoiGiao || ''),
  ngayGiao: String(task.ngayGiao || ''),
  hanHoanThanh: String(task.hanHoanThanh || (task as any).dueDate || (task as any).due_date || ''),
  mucDoUuTien: normalizePriority(task.mucDoUuTien),
  trangThai: normalizeStatus(task.trangThai || (task as any).status),
  tienDo: clampPercent(task.tienDo),
  ketQua: String(task.ketQua || ''),
  ghiChu: String(task.ghiChu || ''),
  sourceType: String(task.sourceType || ''),
  sourceId: String(task.sourceId || ''),
  sourceTaskId: String(task.sourceTaskId || ''),
  sourceTaskIndex: task.sourceTaskIndex ?? '',
  assigneeUsername: String(task.assigneeUsername || task.userId || (task as any).username || ''),
  assigneeName: String(task.assigneeName || ''),
  sourceDate: String(task.sourceDate || ''),
  sourceLabel: String(task.sourceLabel || ''),
  syncStatus: String(task.syncStatus || ''),
  syncedAt: String(task.syncedAt || ''),
});

const calcScore = (item: Partial<StaffEvaluation>) => {
  const scores = [
    item.diemHoanThanhCongViec,
    item.diemThaiDo,
    item.diemKyLuat,
    item.diemPhoiHop,
    item.diemSangKien,
  ].map(clampScore);
  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
};

const rankFromScore = (score: number) => {
  if (score >= 90) return 'Xuất sắc';
  if (score >= 80) return 'Tốt';
  if (score >= 65) return 'Khá';
  if (score >= 50) return 'Trung bình';
  return 'Cần cải thiện';
};

const normalizeEvaluation = (evaluation: Partial<StaffEvaluation>): StaffEvaluation => {
  const normalized = {
    id: String(evaluation.id || ''),
    userId: String(evaluation.userId || ''),
    loaiDanhGia: normalizeEvaluationType(evaluation.loaiDanhGia),
    quy: String(evaluation.quy || ''),
    nam: evaluation.nam || new Date().getFullYear(),
    diemHoanThanhCongViec: clampScore(evaluation.diemHoanThanhCongViec),
    diemThaiDo: clampScore(evaluation.diemThaiDo),
    diemKyLuat: clampScore(evaluation.diemKyLuat),
    diemPhoiHop: clampScore(evaluation.diemPhoiHop),
    diemSangKien: clampScore(evaluation.diemSangKien),
    diemTong: clampScore(evaluation.diemTong),
    xepLoai: String(evaluation.xepLoai || ''),
    nhanXet: String(evaluation.nhanXet || ''),
    nguoiDanhGia: String(evaluation.nguoiDanhGia || ''),
    ngayDanhGia: String(evaluation.ngayDanhGia || ''),
  };
  const score = normalized.diemTong || calcScore(normalized);
  return {
    ...normalized,
    diemTong: score,
    xepLoai: normalized.xepLoai || rankFromScore(score),
  };
};

const taskBadge = (status: string) => {
  switch (normalizeStatus(status)) {
    case 'Hoàn thành':
      return 'bg-emerald-100 text-emerald-700';
    case 'Đang làm':
      return 'bg-blue-100 text-blue-700';
    case 'Tạm dừng':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

const priorityBadge = (priority: string) => {
  switch (normalizePriority(priority)) {
    case 'Khẩn':
      return 'bg-red-100 text-red-700';
    case 'Cao':
      return 'bg-orange-100 text-orange-700';
    case 'Trung bình':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
};

export const StaffPerformance: React.FC<StaffPerformanceProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [tasks, setTasks] = useState<StaffTask[]>([]);
  const [evaluations, setEvaluations] = useState<StaffEvaluation[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [activeTab, setActiveTab] = useState<TabKey>('tasks');
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [evaluationModalOpen, setEvaluationModalOpen] = useState(false);
  const [taskForm, setTaskForm] = useState<Partial<StaffTask>>({});
  const [evaluationForm, setEvaluationForm] = useState<Partial<StaffEvaluation>>({});

  useEffect(() => {
    loadData();
  }, []);

  const canAdd = true;
  const canEdit = true;
  const canDelete = true;

  const loadData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [usersData, taskData, evaluationData] = await Promise.all([
        getUsers(),
        getStaffTasks(),
        getStaffEvaluations(),
      ]);

      const safeUsers = Array.isArray(usersData) ? usersData : [];
      const safeTasks = Array.isArray(taskData) ? taskData.map(normalizeTask) : [];
      const safeEvaluations = Array.isArray(evaluationData) ? evaluationData.map(normalizeEvaluation) : [];

      setUsers(safeUsers);
      setTasks(safeTasks);
      setEvaluations(safeEvaluations);
      setSelectedUserId((current) => {
        if (safeUsers.some((user) => user.username === current)) return current;
        return safeUsers[0]?.username || '';
      });
    } catch {
      setLoadError('Không tải được dữ liệu Công việc & Đánh giá.');
      showToast('Lỗi tải dữ liệu công việc & đánh giá', 'error');
    } finally {
      setLoading(false);
    }
  };

  const selectedUser = users.find((user) => user.username === selectedUserId) || null;
  const selectedTasks = useMemo(
    () => tasks.filter((task) => task.userId === selectedUserId || task.assigneeUsername === selectedUserId),
    [tasks, selectedUserId],
  );
  const selectedEvaluations = useMemo(
    () => evaluations.filter((evaluation) => evaluation.userId === selectedUserId),
    [evaluations, selectedUserId],
  );

  const avgProgress = selectedTasks.length
    ? Math.round(selectedTasks.reduce((sum, task) => sum + clampPercent(task.tienDo), 0) / selectedTasks.length)
    : 0;
  const notStartedTasks = selectedTasks.filter((task) => task.trangThai === 'Chưa làm').length;
  const inProgressTasks = selectedTasks.filter((task) => task.trangThai === 'Đang làm').length;
  const completedTasks = selectedTasks.filter((task) => task.trangThai === 'Hoàn thành').length;
  const avgEvaluationScore = selectedEvaluations.length
    ? Math.round(selectedEvaluations.reduce((sum, item) => sum + toNumber(item.diemTong), 0) / selectedEvaluations.length)
    : 0;
  const latestEvaluation = [...selectedEvaluations].sort(
    (a, b) => String(b.ngayDanhGia || '').localeCompare(String(a.ngayDanhGia || '')),
  )[0];

  const openTaskModal = (task?: StaffTask) => {
    if ((!task && !canAdd) || (task && !canEdit) || !selectedUser) return;
    setTaskForm(task ? { ...task } : {
      userId: selectedUser.username,
      tieuDe: '',
      noiDung: '',
      nguoiGiao: currentUser.fullName || currentUser.username,
      ngayGiao: today(),
      hanHoanThanh: today(),
      mucDoUuTien: 'Trung bình',
      trangThai: 'Chưa làm',
      tienDo: 0,
      ketQua: '',
      ghiChu: '',
    });
    setTaskModalOpen(true);
  };

  const openEvaluationModal = (evaluation?: StaffEvaluation) => {
    if ((!evaluation && !canAdd) || (evaluation && !canEdit) || !selectedUser) return;
    setEvaluationForm(evaluation ? { ...evaluation } : {
      userId: selectedUser.username,
      loaiDanhGia: 'Quý',
      quy: `Q${Math.floor(new Date().getMonth() / 3) + 1}`,
      nam: new Date().getFullYear(),
      diemHoanThanhCongViec: 80,
      diemThaiDo: 80,
      diemKyLuat: 80,
      diemPhoiHop: 80,
      diemSangKien: 80,
      diemTong: 80,
      xepLoai: 'Tốt',
      nhanXet: '',
      nguoiDanhGia: currentUser.fullName || currentUser.username,
      ngayDanhGia: today(),
    });
    setEvaluationModalOpen(true);
  };

  const validateTask = (task: Partial<StaffTask>) => {
    if (!String(task.tieuDe || '').trim()) return 'Công việc phải có tiêu đề.';
    if (!String(task.noiDung || '').trim()) return 'Công việc phải có nội dung.';
    if (!STAFF_TASK_STATUSES.includes(normalizeStatus(task.trangThai))) return 'Trạng thái công việc không hợp lệ.';
    const progress = Number(task.tienDo);
    if (!Number.isFinite(progress) || progress < 0 || progress > 100) return 'Tiến độ phải nằm trong 0-100.';
    return '';
  };

  const validateEvaluation = (evaluation: Partial<StaffEvaluation>) => {
    const scores = [
      evaluation.diemHoanThanhCongViec,
      evaluation.diemThaiDo,
      evaluation.diemKyLuat,
      evaluation.diemPhoiHop,
      evaluation.diemSangKien,
    ];
    const hasScore = scores.some((score) => String(score ?? '').trim() !== '');
    const hasComment = String(evaluation.nhanXet || '').trim() !== '';
    if (!hasScore && !hasComment) return 'Đánh giá phải có điểm hoặc nhận xét.';
    if (scores.some((score) => !Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > 100)) {
      return 'Điểm đánh giá phải nằm trong 0-100.';
    }
    return '';
  };

  const saveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateTask(taskForm);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload = normalizeTask({
        ...taskForm,
        userId: selectedUserId,
        tienDo: clampPercent(taskForm.tienDo),
      });
      if (payload.id) {
        await updateStaffTask(payload.id, payload);
        writeActionLog('update', 'CongViec_NhanVien', { id: payload.id, userId: payload.userId }).catch(() => undefined);
      } else {
        await addStaffTask(payload);
        writeActionLog('create', 'CongViec_NhanVien', { userId: payload.userId, tieuDe: payload.tieuDe }).catch(() => undefined);
      }
      showToast('Đã lưu công việc', 'success');
      setTaskModalOpen(false);
      await loadData();
    } catch {
      showToast('Lỗi lưu công việc', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const saveEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validateEvaluation(evaluationForm);
    if (validationError) {
      showToast(validationError, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const score = calcScore(evaluationForm);
      const payload = normalizeEvaluation({
        ...evaluationForm,
        userId: selectedUserId,
        diemTong: score,
        xepLoai: rankFromScore(score),
      });
      if (payload.id) {
        await updateStaffEvaluation(payload.id, payload);
        writeActionLog('update', 'DanhGia_NhanVien', { id: payload.id, userId: payload.userId }).catch(() => undefined);
      } else {
        await addStaffEvaluation(payload);
        writeActionLog('create', 'DanhGia_NhanVien', { userId: payload.userId, diemTong: payload.diemTong }).catch(() => undefined);
      }
      showToast('Đã lưu đánh giá', 'success');
      setEvaluationModalOpen(false);
      await loadData();
    } catch {
      showToast('Lỗi lưu đánh giá', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const removeTask = async (task: StaffTask) => {
    if (!canDelete || !confirm(`Xóa công việc "${task.tieuDe}"?`)) return;
    try {
      await deleteStaffTask(task.id);
      writeActionLog('delete', 'CongViec_NhanVien', { id: task.id, userId: task.userId }).catch(() => undefined);
      showToast('Đã xóa công việc', 'success');
      await loadData();
    } catch {
      showToast('Lỗi xóa công việc', 'error');
    }
  };

  const removeEvaluation = async (evaluation: StaffEvaluation) => {
    if (!canDelete || !confirm('Xóa đánh giá này?')) return;
    try {
      await deleteStaffEvaluation(evaluation.id);
      writeActionLog('delete', 'DanhGia_NhanVien', { id: evaluation.id, userId: evaluation.userId }).catch(() => undefined);
      showToast('Đã xóa đánh giá', 'success');
      await loadData();
    } catch {
      showToast('Lỗi xóa đánh giá', 'error');
    }
  };

  const scorePreview = calcScore(evaluationForm);


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardCheck className="h-6 w-6 text-blue-600" />
          Công việc & Đánh giá
        </h2>
        <p className="text-sm text-slate-500">Giao việc, theo dõi tiến độ và đánh giá nhân viên theo quý/năm</p>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-100 text-red-700 rounded-lg p-4 text-sm">
          {loadError}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <aside className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 text-sm font-semibold text-slate-700">
            Nhân viên
          </div>
          <div className="max-h-[calc(100vh-220px)] overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-6 text-center text-slate-500"><Loader2 className="h-5 w-5 animate-spin mx-auto" /></div>
            ) : users.length === 0 ? (
              <div className="p-6 text-center text-slate-500">Chưa có nhân viên trong sheet Users</div>
            ) : users.map((user) => {
              const userTasks = tasks.filter((task) => task.userId === user.username || task.assigneeUsername === user.username);
              const userProgress = userTasks.length
                ? Math.round(userTasks.reduce((sum, task) => sum + clampPercent(task.tienDo), 0) / userTasks.length)
                : 0;

              return (
                <button
                  key={user.username}
                  onClick={() => setSelectedUserId(user.username)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 ${selectedUserId === user.username ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-slate-800">{user.fullName || user.username}</div>
                      <div className="text-xs text-slate-500 font-mono">@{user.username}</div>
                    </div>
                    <span className="text-xs font-bold text-blue-700">{userProgress}%</span>
                  </div>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500" style={{ width: `${userProgress}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  {selectedUser?.fullName || 'Chưa chọn nhân viên'}
                </h3>
                <p className="text-sm text-slate-500 font-mono">@{selectedUser?.username || '-'}</p>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
                <div className="bg-slate-50 rounded-lg px-3 py-3">
                  <div className="text-xl font-bold text-slate-800">{selectedTasks.length}</div>
                  <div className="text-xs text-slate-500">Tổng việc</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-3">
                  <div className="text-xl font-bold text-slate-700">{notStartedTasks}</div>
                  <div className="text-xs text-slate-500">Chưa bắt đầu</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-3">
                  <div className="text-xl font-bold text-blue-700">{inProgressTasks}</div>
                  <div className="text-xs text-slate-500">Đang làm</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-3">
                  <div className="text-xl font-bold text-emerald-700">{completedTasks}</div>
                  <div className="text-xs text-slate-500">Hoàn thành</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-3">
                  <div className="text-xl font-bold text-blue-700">{avgProgress}%</div>
                  <div className="text-xs text-slate-500">TB tiến độ</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-3">
                  <div className="text-xl font-bold text-purple-700">{avgEvaluationScore || '-'}</div>
                  <div className="text-xs text-slate-500">TB đánh giá</div>
                </div>
                <div className="bg-slate-50 rounded-lg px-3 py-3">
                  <div className="text-sm font-bold text-slate-800">{latestEvaluation?.xepLoai || '-'}</div>
                  <div className="text-xs text-slate-500">Xếp loại mới</div>
                </div>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>Tiến độ trung bình</span>
                <span>{avgProgress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: `${avgProgress}%` }} />
              </div>
            </div>
          </div>

          <div className="border-b border-slate-200">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('tasks')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'tasks' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Công việc
              </button>
              <button
                onClick={() => setActiveTab('evaluations')}
                className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'evaluations' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
              >
                Đánh giá
              </button>
            </div>
          </div>

          {activeTab === 'tasks' ? (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Công việc được giao</h3>
                {canAdd && selectedUser && (
                  <button onClick={() => openTaskModal()} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700">
                    <Plus className="h-4 w-4" /> Giao việc
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {selectedTasks.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">Chưa có công việc</div>
                ) : selectedTasks.map((task) => (
                  <div key={task.id} className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-800">{task.tieuDe || '(Không tiêu đề)'}</h4>
                          {isBriefingTask(task) && <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700">Từ giao ban</span>}
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${taskBadge(task.trangThai)}`}>{task.trangThai}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityBadge(task.mucDoUuTien)}`}>{task.mucDoUuTien}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{task.noiDung || '-'}</p>
                        <div className="text-xs text-slate-500 mt-2">
                          Giao: {task.ngayGiao || '-'} · Hạn: {task.hanHoanThanh || '-'} · Người giao: {task.nguoiGiao || '-'}
                        </div>
                      </div>
                      {(canEdit || canDelete) && (
                        <div className="flex gap-2">
                          {canEdit && <button onClick={() => openTaskModal(task)} className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50"><Edit2 className="h-4 w-4" /></button>}
                          {canDelete && <button onClick={() => removeTask(task)} className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      )}
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Tiến độ</span><span>{clampPercent(task.tienDo)}%</span></div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500" style={{ width: `${clampPercent(task.tienDo)}%` }} />
                      </div>
                    </div>
                    {(task.ketQua || task.ghiChu) && (
                      <div className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                        {task.ketQua && <p><span className="font-medium">Kết quả:</span> {task.ketQua}</p>}
                        {task.ghiChu && <p><span className="font-medium">Ghi chú:</span> {task.ghiChu}</p>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Đánh giá nhân viên</h3>
                {canAdd && selectedUser && (
                  <button onClick={() => openEvaluationModal()} className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700">
                    <Plus className="h-4 w-4" /> Thêm đánh giá
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100">
                {selectedEvaluations.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">Chưa có đánh giá</div>
                ) : selectedEvaluations.map((evaluation) => (
                  <div key={evaluation.id} className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-slate-800">{evaluation.loaiDanhGia} {evaluation.quy || ''} / {evaluation.nam}</h4>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-700">{evaluation.diemTong} điểm</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{evaluation.xepLoai}</span>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{evaluation.nhanXet || '-'}</p>
                        <div className="text-xs text-slate-500 mt-2">
                          Người đánh giá: {evaluation.nguoiDanhGia || '-'} · Ngày: {evaluation.ngayDanhGia || '-'}
                        </div>
                      </div>
                      {(canEdit || canDelete) && (
                        <div className="flex gap-2">
                          {canEdit && <button onClick={() => openEvaluationModal(evaluation)} className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-blue-600 hover:bg-blue-50"><Edit2 className="h-4 w-4" /></button>}
                          {canDelete && <button onClick={() => removeEvaluation(evaluation)} className="p-1.5 rounded border border-slate-200 text-slate-500 hover:text-red-600 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button>}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-3 text-center text-xs">
                      <div className="bg-slate-50 rounded p-2"><div className="font-bold">{evaluation.diemHoanThanhCongViec}</div><div className="text-slate-500">Công việc</div></div>
                      <div className="bg-slate-50 rounded p-2"><div className="font-bold">{evaluation.diemThaiDo}</div><div className="text-slate-500">Thái độ</div></div>
                      <div className="bg-slate-50 rounded p-2"><div className="font-bold">{evaluation.diemKyLuat}</div><div className="text-slate-500">Kỷ luật</div></div>
                      <div className="bg-slate-50 rounded p-2"><div className="font-bold">{evaluation.diemPhoiHop}</div><div className="text-slate-500">Phối hợp</div></div>
                      <div className="bg-slate-50 rounded p-2"><div className="font-bold">{evaluation.diemSangKien}</div><div className="text-slate-500">Sáng kiến</div></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      <Modal isOpen={taskModalOpen} onClose={() => setTaskModalOpen(false)} title={taskForm.id ? 'Sửa công việc' : 'Giao việc'}>
        <form onSubmit={saveTask} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          <div>
            <label className="block text-sm font-medium mb-1">Tiêu đề</label>
            <input className="w-full border rounded px-3 py-2" value={taskForm.tieuDe || ''} onChange={(e) => setTaskForm({ ...taskForm, tieuDe: e.target.value })} required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nội dung</label>
            <textarea className="w-full border rounded px-3 py-2 min-h-[90px]" value={taskForm.noiDung || ''} onChange={(e) => setTaskForm({ ...taskForm, noiDung: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Hạn hoàn thành</label>
              <input type="date" className="w-full border rounded px-3 py-2" value={taskForm.hanHoanThanh || today()} onChange={(e) => setTaskForm({ ...taskForm, hanHoanThanh: e.target.value })} required />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Ưu tiên</label>
              <select className="w-full border rounded px-3 py-2" value={taskForm.mucDoUuTien || 'Trung bình'} onChange={(e) => setTaskForm({ ...taskForm, mucDoUuTien: normalizePriority(e.target.value) })}>
                {STAFF_TASK_PRIORITIES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Trạng thái</label>
              <select className="w-full border rounded px-3 py-2" value={taskForm.trangThai || 'Chưa làm'} onChange={(e) => setTaskForm({ ...taskForm, trangThai: normalizeStatus(e.target.value) })}>
                {STAFF_TASK_STATUSES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Tiến độ (%)</label>
              <input type="number" min={0} max={100} className="w-full border rounded px-3 py-2" value={taskForm.tienDo ?? 0} onChange={(e) => setTaskForm({ ...taskForm, tienDo: Number(e.target.value) })} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Kết quả</label>
            <input className="w-full border rounded px-3 py-2" value={taskForm.ketQua || ''} onChange={(e) => setTaskForm({ ...taskForm, ketQua: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú</label>
            <textarea className="w-full border rounded px-3 py-2" value={taskForm.ghiChu || ''} onChange={(e) => setTaskForm({ ...taskForm, ghiChu: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setTaskModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Hủy</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Lưu
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={evaluationModalOpen} onClose={() => setEvaluationModalOpen(false)} title={evaluationForm.id ? 'Sửa đánh giá' : 'Thêm đánh giá'}>
        <form onSubmit={saveEvaluation} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Loại</label>
              <select className="w-full border rounded px-3 py-2" value={evaluationForm.loaiDanhGia || 'Quý'} onChange={(e) => setEvaluationForm({ ...evaluationForm, loaiDanhGia: normalizeEvaluationType(e.target.value) })}>
                {STAFF_EVALUATION_TYPES.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Quý</label>
              <select className="w-full border rounded px-3 py-2" value={evaluationForm.quy || 'Q1'} onChange={(e) => setEvaluationForm({ ...evaluationForm, quy: e.target.value })}>
                <option>Q1</option>
                <option>Q2</option>
                <option>Q3</option>
                <option>Q4</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Năm</label>
              <input type="number" className="w-full border rounded px-3 py-2" value={evaluationForm.nam || new Date().getFullYear()} onChange={(e) => setEvaluationForm({ ...evaluationForm, nam: Number(e.target.value) })} />
            </div>
          </div>
          {[
            ['diemHoanThanhCongViec', 'Hoàn thành công việc'],
            ['diemThaiDo', 'Thái độ'],
            ['diemKyLuat', 'Kỷ luật'],
            ['diemPhoiHop', 'Phối hợp'],
            ['diemSangKien', 'Sáng kiến'],
          ].map(([key, label]) => (
            <div key={key}>
              <label className="block text-sm font-medium mb-1">{label}</label>
              <input type="number" min={0} max={100} className="w-full border rounded px-3 py-2" value={(evaluationForm as any)[key] ?? 80} onChange={(e) => setEvaluationForm({ ...evaluationForm, [key]: Number(e.target.value) })} />
            </div>
          ))}
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-700 font-medium">
              <BarChart3 className="h-4 w-4" /> Điểm tổng tự tính
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-blue-800">{scorePreview}</span>
              <span className="px-2 py-0.5 rounded-full bg-white text-blue-700 text-xs font-bold">{rankFromScore(scorePreview)}</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Nhận xét</label>
            <textarea className="w-full border rounded px-3 py-2 min-h-[90px]" value={evaluationForm.nhanXet || ''} onChange={(e) => setEvaluationForm({ ...evaluationForm, nhanXet: e.target.value })} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setEvaluationModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Hủy</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} <Star className="h-4 w-4" /> Lưu
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
