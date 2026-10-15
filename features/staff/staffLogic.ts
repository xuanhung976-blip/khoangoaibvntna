import { STAFF_EVALUATION_TYPES, STAFF_TASK_PRIORITIES, STAFF_TASK_STATUSES, type StaffEvaluation, type StaffTask } from '../../types';
import { toDateKey } from '../../lib/dates';
import { clamp, toNumber } from '../../lib/text';

const pct = (value: unknown) => clamp(toNumber(value), 0, 100);

export const normalizeStatus = (status: unknown): StaffTask['trangThai'] =>
  STAFF_TASK_STATUSES.includes(String(status || '') as StaffTask['trangThai']) ? (String(status) as StaffTask['trangThai']) : 'Chưa làm';

export const normalizePriority = (priority: unknown): StaffTask['mucDoUuTien'] =>
  STAFF_TASK_PRIORITIES.includes(String(priority || '') as StaffTask['mucDoUuTien']) ? (String(priority) as StaffTask['mucDoUuTien']) : 'Trung bình';

export const normalizeTask = (task: Partial<StaffTask> & Record<string, any>): StaffTask => ({
  id: String(task.id || ''),
  userId: String(task.userId || task.username || task.assigneeUsername || ''),
  tieuDe: String(task.tieuDe || task.title || ''),
  noiDung: String(task.noiDung || task.description || ''),
  nguoiGiao: String(task.nguoiGiao || ''),
  ngayGiao: toDateKey(task.ngayGiao) || String(task.ngayGiao || ''),
  hanHoanThanh: toDateKey(task.hanHoanThanh || task.dueDate || task.due_date) || String(task.hanHoanThanh || ''),
  mucDoUuTien: normalizePriority(task.mucDoUuTien),
  trangThai: normalizeStatus(task.trangThai || task.status),
  tienDo: pct(task.tienDo),
  ketQua: String(task.ketQua || ''),
  ghiChu: String(task.ghiChu || ''),
  sourceType: String(task.sourceType || ''),
  sourceId: String(task.sourceId || ''),
  sourceTaskId: String(task.sourceTaskId || ''),
  sourceTaskIndex: task.sourceTaskIndex ?? '',
  assigneeUsername: String(task.assigneeUsername || task.userId || task.username || ''),
  assigneeName: String(task.assigneeName || ''),
  sourceDate: String(task.sourceDate || ''),
  sourceLabel: String(task.sourceLabel || ''),
  syncStatus: String(task.syncStatus || ''),
  syncedAt: String(task.syncedAt || ''),
  ngayHoanThanh: toDateKey(task.ngayHoanThanh) || '',
});

export const isBriefingTask = (task: Partial<StaffTask>) => ['GIAO_BAN', 'daily_briefing', 'giao_ban'].includes(String(task.sourceType || ''));

export const isDone = (task: StaffTask) => task.trangThai === 'Hoàn thành' || toNumber(task.tienDo) >= 100;
export const isOverdue = (task: StaffTask, today: string) => !isDone(task) && task.trangThai !== 'Tạm dừng' && Boolean(task.hanHoanThanh) && task.hanHoanThanh < today;

/**
 * Việc đã xong có đúng hạn không. Việc không có hạn, hoặc việc cũ chưa ghi ngày hoàn thành,
 * được coi là đúng hạn (không đủ căn cứ để tính trễ).
 */
export const finishedOnTime = (task: StaffTask) => !task.hanHoanThanh || !task.ngayHoanThanh || task.ngayHoanThanh <= task.hanHoanThanh;

/** Ghi ngày hoàn thành lúc việc vừa xong, giữ nguyên nếu đã xong từ trước, xoá khi mở lại. */
export const withCompletionDate = (next: StaffTask, previous: Partial<StaffTask> | null | undefined, today: string): StaffTask => {
  if (!isDone(next)) return { ...next, ngayHoanThanh: '' };
  const before = previous ? normalizeTask(previous) : null;
  const kept = before && isDone(before) ? before.ngayHoanThanh : '';
  return { ...next, ngayHoanThanh: kept || next.ngayHoanThanh || today };
};

/* ---------------- Đánh giá ---------------- */

export type StaffGroup = 'BS' | 'DD' | 'KHAC';
export type CriterionKey = 'diemHoanThanhCongViec' | 'diemChuyenMon' | 'diemThaiDo' | 'diemKyLuat' | 'diemPhoiHop' | 'diemSangKien';
export type Criterion = { key: CriterionKey; label: string; weight: number; hint?: string };
export type EvalCriteriaSet = StaffGroup | 'LEGACY';

export const GROUP_LABEL: Record<StaffGroup, string> = { BS: 'Bác sĩ', DD: 'Điều dưỡng', KHAC: 'Khác' };

/** Bộ tiêu chí + trọng số (%) theo nhóm. Sửa ở đây nếu khoa đổi quy chế chấm điểm. */
export const CRITERIA_SETS: Record<EvalCriteriaSet, Criterion[]> = {
  BS: [
    { key: 'diemHoanThanhCongViec', label: 'Hoàn thành công việc', weight: 30, hint: 'Khối lượng, tiến độ, đúng hạn việc được giao' },
    { key: 'diemChuyenMon', label: 'Chuyên môn, chất lượng điều trị', weight: 25, hint: 'Phẫu thuật/thủ thuật, hồ sơ bệnh án, sai sót chuyên môn' },
    { key: 'diemThaiDo', label: 'Y đức, thái độ phục vụ', weight: 15, hint: 'Giao tiếp, phản ánh của người bệnh' },
    { key: 'diemKyLuat', label: 'Kỷ luật, nội quy', weight: 10, hint: 'Giờ giấc, trực, quy chế chuyên môn' },
    { key: 'diemPhoiHop', label: 'Phối hợp nhóm', weight: 10 },
    { key: 'diemSangKien', label: 'Sáng kiến, NCKH, đào tạo', weight: 10 },
  ],
  DD: [
    { key: 'diemHoanThanhCongViec', label: 'Hoàn thành công việc', weight: 30, hint: 'Khối lượng, tiến độ, đúng hạn việc được giao' },
    { key: 'diemChuyenMon', label: 'Kỹ thuật & chăm sóc người bệnh', weight: 25, hint: 'Thực hiện y lệnh, kỹ thuật điều dưỡng, hồ sơ chăm sóc' },
    { key: 'diemThaiDo', label: 'Y đức, thái độ phục vụ', weight: 15, hint: 'Giao tiếp, phản ánh của người bệnh' },
    { key: 'diemKyLuat', label: 'Kỷ luật, nội quy', weight: 15, hint: 'Giờ giấc, trực, kiểm soát nhiễm khuẩn' },
    { key: 'diemPhoiHop', label: 'Phối hợp nhóm', weight: 10 },
    { key: 'diemSangKien', label: 'Sáng kiến, cải tiến', weight: 5 },
  ],
  KHAC: [
    { key: 'diemHoanThanhCongViec', label: 'Hoàn thành công việc', weight: 35, hint: 'Khối lượng, tiến độ, đúng hạn việc được giao' },
    { key: 'diemThaiDo', label: 'Thái độ phục vụ', weight: 20 },
    { key: 'diemKyLuat', label: 'Kỷ luật, nội quy', weight: 20 },
    { key: 'diemPhoiHop', label: 'Phối hợp nhóm', weight: 15 },
    { key: 'diemSangKien', label: 'Sáng kiến, cải tiến', weight: 10 },
  ],
  /** Bản đánh giá tạo trước khi có bộ tiêu chí theo nhóm. */
  LEGACY: [
    { key: 'diemHoanThanhCongViec', label: 'Hoàn thành công việc', weight: 20 },
    { key: 'diemThaiDo', label: 'Thái độ phục vụ', weight: 20 },
    { key: 'diemKyLuat', label: 'Kỷ luật, nội quy', weight: 20 },
    { key: 'diemPhoiHop', label: 'Phối hợp nhóm', weight: 20 },
    { key: 'diemSangKien', label: 'Sáng kiến, cải tiến', weight: 20 },
  ],
};

export const criteriaSetOf = (item: Partial<StaffEvaluation>): EvalCriteriaSet =>
  item.nhomDanhGia && item.nhomDanhGia in CRITERIA_SETS ? (item.nhomDanhGia as EvalCriteriaSet) : 'LEGACY';
export const criteriaOf = (item: Partial<StaffEvaluation>) => CRITERIA_SETS[criteriaSetOf(item)];

export const isScored = (value: unknown) => value !== undefined && value !== null && value !== '';
export const missingCriteria = (item: Partial<StaffEvaluation>) => criteriaOf(item).filter(criterion => !isScored(item[criterion.key]));

/** Điểm tổng = trung bình có trọng số các tiêu chí đã chấm. */
export const calcScore = (item: Partial<StaffEvaluation>) => {
  const scored = criteriaOf(item).filter(criterion => isScored(item[criterion.key]));
  const weight = scored.reduce((sum, criterion) => sum + criterion.weight, 0);
  if (!weight) return 0;
  return Math.round(scored.reduce((sum, criterion) => sum + pct(item[criterion.key]) * criterion.weight, 0) / weight);
};

/** Thang 4 mức theo đánh giá, xếp loại viên chức (NĐ 90/2020, sửa đổi bởi NĐ 48/2023). Ngưỡng điểm do khoa quy định. */
export const RANKS = [
  { min: 90, label: 'Hoàn thành xuất sắc' },
  { min: 70, label: 'Hoàn thành tốt' },
  { min: 50, label: 'Hoàn thành' },
  { min: 0, label: 'Không hoàn thành' },
] as const;

export const rankFromScore = (score: number): string => (RANKS.find(rank => score >= rank.min) || RANKS[RANKS.length - 1]).label;
export const isExtremeRank = (rank: string) => rank === RANKS[0].label || rank === RANKS[RANKS.length - 1].label;

export const EVAL_STATUS = {
  pending: 'Chờ trưởng khoa',
  evaluated: 'Đã đánh giá',
  acknowledged: 'Đã xác nhận',
} as const;

export const isPendingEvaluation = (item: Partial<StaffEvaluation>) => item.trangThai === EVAL_STATUS.pending;

export type SelfAssessment = { scores: Partial<Record<CriterionKey, number>>; nhanXet: string; ngay: string };

const parseJson = <T,>(value: unknown): T | null => {
  if (!value) return null;
  if (typeof value === 'object') return value as T;
  try {
    return JSON.parse(String(value)) as T;
  } catch {
    return null;
  }
};

const toJsonText = (value: unknown) => (typeof value === 'string' ? value : value ? JSON.stringify(value) : '');

export const parseSelfAssessment = (item: Partial<StaffEvaluation>): SelfAssessment | null => {
  const parsed = parseJson<SelfAssessment>(item.tuDanhGiaJson);
  return parsed && parsed.scores ? { scores: parsed.scores, nhanXet: String(parsed.nhanXet || ''), ngay: String(parsed.ngay || '') } : null;
};

export const parsePeriodSnapshot = (item: Partial<StaffEvaluation>) => parseJson<PeriodStats>(item.soLieuJson);

export const normalizeEvaluation = (evaluation: Partial<StaffEvaluation>): StaffEvaluation => {
  const base = {
    id: String(evaluation.id || ''),
    userId: String(evaluation.userId || ''),
    loaiDanhGia: STAFF_EVALUATION_TYPES.includes(String(evaluation.loaiDanhGia) as 'Quý') ? String(evaluation.loaiDanhGia) : 'Quý',
    quy: String(evaluation.quy || ''),
    nam: toNumber(evaluation.nam) || new Date().getFullYear(),
    diemHoanThanhCongViec: pct(evaluation.diemHoanThanhCongViec),
    diemChuyenMon: isScored(evaluation.diemChuyenMon) ? pct(evaluation.diemChuyenMon) : '',
    diemThaiDo: pct(evaluation.diemThaiDo),
    diemKyLuat: pct(evaluation.diemKyLuat),
    diemPhoiHop: pct(evaluation.diemPhoiHop),
    diemSangKien: pct(evaluation.diemSangKien),
    diemTong: pct(evaluation.diemTong),
    xepLoai: String(evaluation.xepLoai || ''),
    nhanXet: String(evaluation.nhanXet || ''),
    nguoiDanhGia: String(evaluation.nguoiDanhGia || ''),
    ngayDanhGia: toDateKey(evaluation.ngayDanhGia) || String(evaluation.ngayDanhGia || ''),
    nhomDanhGia: String(evaluation.nhomDanhGia || ''),
    diemGoiY: isScored(evaluation.diemGoiY) ? pct(evaluation.diemGoiY) : '',
    soLieuJson: toJsonText(evaluation.soLieuJson),
    tuDanhGiaJson: toJsonText(evaluation.tuDanhGiaJson),
    trangThai: String(evaluation.trangThai || EVAL_STATUS.evaluated),
    ngayXacNhan: toDateKey(evaluation.ngayXacNhan) || String(evaluation.ngayXacNhan || ''),
    yKienNhanVien: String(evaluation.yKienNhanVien || ''),
  };
  if (isPendingEvaluation(base)) return { ...base, diemTong: 0, xepLoai: '' };
  const score = toNumber(base.diemTong) || calcScore(base);
  return { ...base, diemTong: score, xepLoai: base.xepLoai || rankFromScore(score) };
};

export const RANK_TONE: Record<string, 'success' | 'primary' | 'info' | 'warning' | 'danger'> = {
  'Hoàn thành xuất sắc': 'success',
  'Hoàn thành tốt': 'primary',
  'Hoàn thành': 'info',
  'Không hoàn thành': 'danger',
  // Thang cũ — giữ để hiển thị các bản đánh giá đã lưu trước đây.
  'Xuất sắc': 'success',
  Tốt: 'primary',
  Khá: 'info',
  'Trung bình': 'warning',
  'Cần cải thiện': 'danger',
};

/* ---------------- Kỳ đánh giá ---------------- */

export const periodRange = (item: Pick<Partial<StaffEvaluation>, 'loaiDanhGia' | 'quy' | 'nam'>) => {
  const year = toNumber(item.nam) || new Date().getFullYear();
  if (item.loaiDanhGia === 'Năm') return { from: `${year}-01-01`, to: `${year}-12-31` };
  const quarter = clamp(toNumber(String(item.quy || '').replace(/\D/g, '')) || 1, 1, 4);
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = startMonth + 2;
  const lastDay = new Date(year, endMonth, 0).getDate();
  return { from: `${year}-${String(startMonth).padStart(2, '0')}-01`, to: `${year}-${String(endMonth).padStart(2, '0')}-${lastDay}` };
};

/** Số để sắp xếp kỳ: bản năm xếp sau Q4 cùng năm. */
export const periodOrder = (item: Partial<StaffEvaluation>) =>
  (toNumber(item.nam) || 0) * 10 + (item.loaiDanhGia === 'Năm' ? 5 : toNumber(String(item.quy || '').replace(/\D/g, '')) || 0);

export const periodLabel = (item: Partial<StaffEvaluation>) => (item.loaiDanhGia === 'Năm' ? `Năm ${item.nam}` : `${item.quy}/${item.nam}`);

export const samePeriod = (a: Partial<StaffEvaluation>, b: Partial<StaffEvaluation>) =>
  a.userId === b.userId && a.loaiDanhGia === b.loaiDanhGia && String(a.nam) === String(b.nam) && (a.loaiDanhGia === 'Năm' || a.quy === b.quy);

export const byPeriodDesc = (a: StaffEvaluation, b: StaffEvaluation) =>
  periodOrder(b) - periodOrder(a) || String(b.ngayDanhGia).localeCompare(String(a.ngayDanhGia));

export type PeriodStats = {
  from: string;
  to: string;
  total: number;
  /** Việc đã xong hoặc đã quá hạn — căn cứ để chấm. */
  assessed: number;
  done: number;
  onTime: number;
  late: number;
  overdue: number;
  open: number;
  /** Điểm gợi ý (0-100): xong đúng hạn = 100, xong trễ = 50, quá hạn chưa xong = 0. null nếu chưa có việc để chấm. */
  suggested: number | null;
};

/** Việc thuộc kỳ theo hạn hoàn thành, không có hạn thì theo ngày giao. */
export const taskPeriodDate = (task: StaffTask) => task.hanHoanThanh || task.ngayGiao || '';

export const periodStats = (tasks: StaffTask[], period: { from: string; to: string }, today: string): PeriodStats => {
  const inPeriod = tasks.filter(task => {
    const date = taskPeriodDate(task);
    return date >= period.from && date <= period.to;
  });
  const done = inPeriod.filter(isDone);
  const onTime = done.filter(finishedOnTime).length;
  const overdue = inPeriod.filter(task => isOverdue(task, today)).length;
  const assessed = done.length + overdue;
  return {
    from: period.from,
    to: period.to,
    total: inPeriod.length,
    assessed,
    done: done.length,
    onTime,
    late: done.length - onTime,
    overdue,
    open: inPeriod.length - done.length,
    suggested: assessed ? Math.round((onTime * 100 + (done.length - onTime) * 50) / assessed) : null,
  };
};

/** Chênh lệch tối đa giữa điểm chấm và điểm gợi ý trước khi bắt buộc ghi lý do. */
export const SUGGESTION_TOLERANCE = 15;

/** Các lỗi cần sửa trước khi trưởng khoa lưu bản đánh giá. */
export const validateEvaluation = (item: Partial<StaffEvaluation>, suggested: number | null): string[] => {
  const missing = missingCriteria(item);
  if (missing.length) return [`Chưa chấm: ${missing.map(criterion => criterion.label).join(', ')}`];
  if (String(item.nhanXet || '').trim()) return [];
  const errors: string[] = [];
  const rank = rankFromScore(calcScore(item));
  if (isExtremeRank(rank)) errors.push(`Xếp loại "${rank}" cần có nhận xét làm căn cứ`);
  const gap = suggested === null ? 0 : Math.abs(pct(item.diemHoanThanhCongViec) - suggested);
  if (gap >= SUGGESTION_TOLERANCE) errors.push(`Điểm "Hoàn thành công việc" lệch ${gap} điểm so với số liệu (${suggested}), cần ghi lý do vào nhận xét`);
  return errors;
};

/* ---------------- Tổng quan toàn khoa ---------------- */

/** Suy nhóm chuyên môn từ danh xưng / tên đăng nhập (danh bạ không trả về nhóm). */
export const guessGroup = (username: string, fullName: string): StaffGroup => {
  const name = fullName.trim().toLowerCase();
  const user = username.trim().toLowerCase();
  if (/^(bs|ths|ts|pgs|bsck)/.test(name) || user.startsWith('bs')) return 'BS';
  if (/^(đd|dd|đdt|ddt|cn)/.test(name) || user.startsWith('dd')) return 'DD';
  return 'KHAC';
};

export type StaffSummary = {
  username: string;
  fullName: string;
  group: StaffGroup;
  open: number;
  overdue: number;
  dueSoon: number;
  done: number;
  doneRecent: number;
  total: number;
  /** Tỷ lệ việc hoàn thành / tổng việc đã giao (0-100). */
  completion: number;
  /** Tỷ lệ xong đúng hạn trên các việc đã xong hoặc đã quá hạn (0-100), null nếu chưa có việc nào như vậy. */
  onTime: number | null;
  avgProgress: number;
  latestScore: number | null;
  latestRank: string;
  latestPeriod: string;
  /** Mức tải: 'over' nếu có việc quá hạn hoặc ≥ 5 việc mở; 'busy' 3-4; 'ok'; 'idle' không có việc mở. */
  load: 'over' | 'busy' | 'ok' | 'idle';
  tasks: StaffTask[];
};

const DUE_SOON_DAYS = 3;

export const summarizeStaff = (
  users: Array<{ username: string; fullName: string }>,
  tasks: StaffTask[],
  evaluations: StaffEvaluation[],
  today: string,
): { people: StaffSummary[]; unassigned: StaffTask[] } => {
  const soon = (() => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() + DUE_SOON_DAYS);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  })();
  const recentFrom = (() => {
    const date = new Date(`${today}T12:00:00`);
    date.setDate(date.getDate() - 30);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  })();
  const known = new Set(users.map(user => user.username));

  const people = users.map(user => {
    const mine = tasks.filter(task => task.userId === user.username || task.assigneeUsername === user.username);
    const open = mine.filter(task => !isDone(task));
    const overdue = mine.filter(task => isOverdue(task, today));
    const done = mine.filter(isDone);
    const doneOnTime = done.filter(finishedOnTime).length;
    const assessed = done.length + overdue.length;
    const latest = evaluations
      .filter(evaluation => evaluation.userId === user.username && !isPendingEvaluation(evaluation))
      .sort(byPeriodDesc)[0];
    const openActive = open.filter(task => task.trangThai !== 'Tạm dừng').length;
    return {
      username: user.username,
      fullName: user.fullName || user.username,
      group: guessGroup(user.username, user.fullName || ''),
      open: open.length,
      overdue: overdue.length,
      dueSoon: open.filter(task => task.hanHoanThanh && task.hanHoanThanh >= today && task.hanHoanThanh <= soon).length,
      done: done.length,
      doneRecent: done.filter(task => (task.ngayHoanThanh || task.ngayGiao || '') >= recentFrom || (task.hanHoanThanh || '') >= recentFrom).length,
      total: mine.length,
      completion: mine.length ? Math.round((done.length / mine.length) * 100) : 0,
      onTime: assessed ? Math.round((doneOnTime / assessed) * 100) : null,
      avgProgress: open.length ? Math.round(open.reduce((sum, task) => sum + toNumber(task.tienDo), 0) / open.length) : 0,
      latestScore: latest ? toNumber(latest.diemTong) : null,
      latestRank: latest?.xepLoai || '',
      latestPeriod: latest ? periodLabel(latest) : '',
      load: overdue.length > 0 || openActive >= 5 ? 'over' : openActive >= 3 ? 'busy' : openActive > 0 ? 'ok' : 'idle',
      tasks: mine,
    } as StaffSummary;
  });

  return { people, unassigned: tasks.filter(task => !known.has(task.userId) && !known.has(task.assigneeUsername || '')) };
};
