import type { NursingTask } from '../../types';
import { toDateKey, todayKey } from '../../lib/dates';
import { fold } from '../../lib/text';

export const SHIFTS = ['Sáng', 'Chiều', 'Đêm'] as const;
export type Shift = (typeof SHIFTS)[number];

export const STATUSES = ['Chưa làm', 'Đang làm', 'Hoàn thành'] as const;
export type Status = (typeof STATUSES)[number];

export const PRIORITIES = ['Thường', 'Ưu tiên', 'Khẩn'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const NURSING_GROUPS = [
  'Nhóm Chăm sóc Buồng bệnh',
  'Nhóm Y lệnh thuốc & Dịch truyền',
  'Nhóm Chuẩn bị & Phòng mổ',
  'Nhóm Hành chính & Bệnh án',
  'Nhóm Kíp trực hôm nay',
  'Chung toàn khoa',
] as const;
export type NursingGroup = (typeof NURSING_GROUPS)[number];

export const TASK_CATEGORIES = [
  'Chăm sóc buồng bệnh & Thay băng',
  'Y lệnh thuốc & Tiêm truyền',
  'Chuẩn bị bệnh nhân mổ',
  'Theo dõi sinh hiệu & Hậu phẫu',
  'Tủ thuốc & Trang thiết bị',
  'Hành chính & Hồ sơ',
  'Khác',
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

/** Mẫu công việc điều dưỡng chuẩn hoá theo chuyên môn khoa Ngoại */
export const DEFAULT_CLINICAL_TEMPLATES: Record<string, string[]> = {
  'Chăm sóc buồng bệnh & Thay băng': [
    'Đo dấu hiệu sinh tồn toàn khoa',
    'Thay băng, kiểm tra vết mổ và dẫn lưu buồng bệnh',
    'Chăm sóc vệ sinh cá nhân cho BN nặng / phẫu thuật lớn',
    'Kiểm tra và nhắc nhở vệ sinh buồng bệnh',
  ],
  'Y lệnh thuốc & Tiêm truyền': [
    'Thực hiện y lệnh thuốc tiêm & truyền dịch buổi sáng',
    'Thực hiện y lệnh thuốc buổi chiều & tối',
    'Theo dõi tốc độ truyền dịch và phản ứng sau tiêm truyền',
    'Tổng hợp và lĩnh thuốc / dịch truyền ngày hôm sau',
  ],
  'Chuẩn bị bệnh nhân mổ': [
    'Chuẩn bị BN mổ: kiểm tra nhịn ăn, vệ sinh vùng mổ, vòng tay định danh',
    'Hoàn thiện hồ sơ bệnh án duyệt mổ và đối chiếu an toàn',
    'Bàn giao người bệnh an toàn sang phòng mổ',
    'Đón người bệnh từ phòng hồi tỉnh về buồng hậu phẫu',
  ],
  'Theo dõi sinh hiệu & Hậu phẫu': [
    'Theo dõi sát mạch, huyết áp, SpO2 BN hậu phẫu 24h đầu',
    'Theo dõi tê bì chân tay, triệu chứng hạ calci sau mổ tuyến giáp',
    'Theo dõi màu sắc và số lượng dịch dẫn lưu vết mổ',
    'Phát hiện sớm dấu hiệu chảy máu tụ vùng cổ / khàn tiếng',
  ],
  'Tủ thuốc & Trang thiết bị': [
    'Kiểm kê cơ số thuốc cấp cứu & hạn sử dụng hộp chống sốc',
    'Kiểm tra bình oxy, máy hút đờm, máy monitor theo dõi',
    'Bàn giao và đối chiếu tủ thuốc trực',
  ],
  'Hành chính & Hồ sơ': [
    'Hoàn thiện thủ tục hồ sơ bệnh án BN ra viện / chuyển viện',
    'Tư vấn, hướng dẫn chế độ ăn và chăm sóc sau ra viện',
    'Giao ban và bàn giao công việc tồn giữa các ca trực',
  ],
};

/** Mẫu cũ theo ca để tương thích ngược */
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

/** Nhận diện người nhận có phải là Nhóm/Tổ hay không */
export const isGroupAssignee = (assignee?: string): boolean => {
  if (!assignee) return false;
  const f = fold(assignee);
  return f.startsWith('nhom') || f.startsWith('to ') || f.startsWith('kip') || f.startsWith('chung');
};

/** Chuẩn hoá ca về 1 trong 3 giá trị (giữ để tương thích dữ liệu cũ) */
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

export const isTaskOverdue = (task: NursingTask, currentTime?: string): boolean => {
  if (normalizeStatus(task.status) === 'Hoàn thành') return false;
  const today = todayKey();
  const deadlineDate = task.hanThucHien || task.date;
  if (!deadlineDate) return false;
  if (deadlineDate < today) return true;
  if (deadlineDate === today && task.gioHen) {
    const now = currentTime || new Date().toTimeString().slice(0, 5);
    if (now > task.gioHen) return true;
  }
  return false;
};

export const normalizeTask = (task: NursingTask): NursingTask => ({
  ...task,
  id: String(task.id || ''),
  date: toDateKey(task.date) || String(task.date || ''),
  task: String(task.task || ''),
  status: normalizeStatus(task.status),
  priority: task.priority || 'Thường',
  assignee: task.assignee ? String(task.assignee).trim() : '',
  assigneeType: task.assigneeType || (isGroupAssignee(task.assignee) ? 'group' : 'individual'),
  group: task.group ? String(task.group).trim() : isGroupAssignee(task.assignee) ? String(task.assignee).trim() : undefined,
  ngayGiao: toDateKey(task.ngayGiao) || toDateKey(task.date) || undefined,
  hanThucHien: toDateKey(task.hanThucHien) || undefined,
  gioHen: task.gioHen ? String(task.gioHen).trim() : undefined,
  room: task.room ? String(task.room).trim() : undefined,
  category: task.category ? String(task.category).trim() : undefined,
  shift: task.shift ? normalizeShift(task.shift) : undefined,
});

const PRIORITY_RANK: Record<string, number> = { Khẩn: 0, 'Ưu tiên': 1, Thường: 2 };
const STATUS_RANK: Record<Status, number> = { 'Đang làm': 0, 'Chưa làm': 1, 'Hoàn thành': 2 };

export const sortTasks = (tasks: NursingTask[]) =>
  [...tasks].sort(
    (a, b) =>
      STATUS_RANK[normalizeStatus(a.status)] - STATUS_RANK[normalizeStatus(b.status)] ||
      (PRIORITY_RANK[a.priority || 'Thường'] ?? 2) - (PRIORITY_RANK[b.priority || 'Thường'] ?? 2) ||
      (a.gioHen || '99:99').localeCompare(b.gioHen || '99:99') ||
      a.task.localeCompare(b.task, 'vi'),
  );

/** Tạo danh sách việc để sao chép sang ngày mới (tương thích logic.test.ts) */
export const buildCopy = (source: NursingTask[], targetDate: string, existing: NursingTask[]): Partial<NursingTask>[] => {
  const seen = new Set(existing.map(task => `${task.shift ? normalizeShift(task.shift) : ''}|${fold(task.task)}`));
  return source
    .filter(task => !seen.has(`${task.shift ? normalizeShift(task.shift) : ''}|${fold(task.task)}`))
    .map(task => ({
      date: targetDate,
      shift: task.shift ? normalizeShift(task.shift) : undefined,
      task: task.task,
      status: 'Chưa làm',
      priority: task.priority || 'Thường',
      assignee: task.assignee || '',
      group: task.group || '',
      ngayGiao: targetDate,
      hanThucHien: targetDate,
      gioHen: task.gioHen || '',
      room: task.room || '',
      category: task.category || '',
      note: '',
    }));
};

/** Tạo danh sách việc chưa hoàn thành từ hôm trước để chuyển giao sang hôm nay */
export const buildRolloverUnfinished = (source: NursingTask[], targetDate: string, existing: NursingTask[]): Partial<NursingTask>[] => {
  const seen = new Set(existing.map(task => fold(task.task)));
  return source
    .filter(task => normalizeStatus(task.status) !== 'Hoàn thành' && !seen.has(fold(task.task)))
    .map(task => ({
      date: targetDate,
      task: task.task,
      status: 'Chưa làm',
      priority: task.priority || 'Thường',
      assignee: task.assignee || '',
      group: task.group || '',
      ngayGiao: targetDate,
      hanThucHien: targetDate,
      gioHen: task.gioHen || '',
      room: task.room || '',
      category: task.category || '',
      note: task.note ? `[Bàn giao từ ${task.date}] ${task.note}` : `[Bàn giao từ ${task.date}]`,
    }));
};

export const progressOf = (tasks: NursingTask[]) => {
  const done = tasks.filter(task => normalizeStatus(task.status) === 'Hoàn thành').length;
  const urgent = tasks.filter(task => task.priority === 'Khẩn' && normalizeStatus(task.status) !== 'Hoàn thành').length;
  const priority = tasks.filter(task => task.priority === 'Ưu tiên' && normalizeStatus(task.status) !== 'Hoàn thành').length;
  const overdue = tasks.filter(task => isTaskOverdue(task)).length;
  return {
    done,
    total: tasks.length,
    pct: tasks.length ? Math.round((done / tasks.length) * 100) : 0,
    urgent,
    priority,
    overdue,
  };
};
