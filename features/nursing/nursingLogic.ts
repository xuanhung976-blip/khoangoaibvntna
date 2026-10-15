import type { NursingTask } from '../../types';
import { toDateKey } from '../../lib/dates';
import { fold } from '../../lib/text';

export const SHIFTS = ['Sáng', 'Chiều', 'Đêm'] as const;
export type Shift = (typeof SHIFTS)[number];

export const STATUSES = ['Chưa làm', 'Đang làm', 'Hoàn thành'] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ['Thường', 'Ưu tiên', 'Khẩn'] as const;

export const DEFAULT_TEMPLATES: Record<Shift, string[]> = {
  Sáng: [
    'Nhận bàn giao ca đêm',
    'Đo dấu hiệu sinh tồn toàn khoa',
    'Thực hiện y lệnh thuốc buổi sáng',
    'Chuẩn bị bệnh nhân mổ (nhịn ăn, vệ sinh, hồ sơ)',
    'Thay băng, chăm sóc vết mổ',
    'Vệ sinh buồng bệnh',
  ],
  Chiều: ['Theo dõi bệnh nhân hậu phẫu', 'Thực hiện y lệnh thuốc buổi chiều', 'Tư vấn, giáo dục sức khoẻ', 'Kiểm tra cơ số thuốc tủ trực', 'Bàn giao ca chiều'],
  Đêm: ['Theo dõi bệnh nhân nặng / hậu phẫu', 'Thực hiện y lệnh thuốc buổi tối', 'Kiểm tra trang thiết bị cấp cứu', 'Bàn giao ca đêm'],
};

/** Chuẩn hoá ca về 1 trong 3 giá trị (dữ liệu cũ có thể ghi "Ca sáng", "sang"...). */
export const normalizeShift = (value: unknown): Shift => {
  const folded = fold(value);
  if (folded.includes('chieu')) return 'Chiều';
  if (folded.includes('dem') || folded.includes('toi')) return 'Đêm';
  return 'Sáng';
};

export const normalizeStatus = (value: unknown): Status => {
  const folded = fold(value);
  if (folded.includes('hoan thanh') || folded === 'done') return 'Hoàn thành';
  if (folded.includes('dang')) return 'Đang làm';
  return 'Chưa làm';
};

export const nextStatus = (status: unknown): Status => {
  const current = normalizeStatus(status);
  return current === 'Chưa làm' ? 'Đang làm' : current === 'Đang làm' ? 'Hoàn thành' : 'Chưa làm';
};

export const normalizeTask = (task: NursingTask): NursingTask => ({
  ...task,
  id: String(task.id || ''),
  date: toDateKey(task.date) || String(task.date || ''),
  shift: normalizeShift(task.shift),
  status: normalizeStatus(task.status),
  task: String(task.task || ''),
  priority: task.priority || 'Thường',
});

const PRIORITY_RANK: Record<string, number> = { Khẩn: 0, 'Ưu tiên': 1, Thường: 2 };
const STATUS_RANK: Record<Status, number> = { 'Đang làm': 0, 'Chưa làm': 1, 'Hoàn thành': 2 };

export const sortTasks = (tasks: NursingTask[]) =>
  [...tasks].sort(
    (a, b) =>
      STATUS_RANK[normalizeStatus(a.status)] - STATUS_RANK[normalizeStatus(b.status)] ||
      (PRIORITY_RANK[a.priority || 'Thường'] ?? 2) - (PRIORITY_RANK[b.priority || 'Thường'] ?? 2) ||
      a.task.localeCompare(b.task, 'vi'),
  );

/** Tạo danh sách việc để sao chép sang ngày mới (bỏ trùng nội dung đã có trong ngày đích). */
export const buildCopy = (source: NursingTask[], targetDate: string, existing: NursingTask[]): Partial<NursingTask>[] => {
  const seen = new Set(existing.map(task => `${normalizeShift(task.shift)}|${fold(task.task)}`));
  return source
    .filter(task => !seen.has(`${normalizeShift(task.shift)}|${fold(task.task)}`))
    .map(task => ({
      date: targetDate,
      shift: normalizeShift(task.shift),
      task: task.task,
      status: 'Chưa làm',
      priority: task.priority || 'Thường',
      assignee: task.assignee || '',
      note: '',
    }));
};

export const progressOf = (tasks: NursingTask[]) => {
  const done = tasks.filter(task => normalizeStatus(task.status) === 'Hoàn thành').length;
  return { done, total: tasks.length, pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
};
