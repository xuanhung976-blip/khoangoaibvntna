import { getVietnamDateKey, parseCalendarDate } from '../utils/dateUtils';

export { getVietnamDateKey, getVietnamMonthKey, parseCalendarDate } from '../utils/dateUtils';

const WEEKDAYS_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
const WEEKDAYS_LONG = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export const todayKey = () => getVietnamDateKey();

/** Giờ hiện tại theo giờ Việt Nam, dạng HH:mm. */
export const nowTimeKey = (date = new Date()): string =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date);

/** Chuẩn hoá mọi dạng ngày (yyyy-mm-dd, dd/mm/yyyy, ISO) về khóa yyyy-mm-dd; trả về '' nếu không hợp lệ. */
export const toDateKey = (value: unknown): string => {
  const parsed = parseCalendarDate(value);
  if (parsed) return parsed.key;
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? '' : getVietnamDateKey(date);
};

/** Tạo Date ở 12h trưa theo khóa ngày để tránh lệch múi giờ khi cộng trừ ngày. */
export const keyToDate = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
};

export const dateToKey = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export const addDays = (key: string, days: number): string => {
  const date = keyToDate(key);
  date.setDate(date.getDate() + days);
  return dateToKey(date);
};

export const addMonths = (monthKey: string, months: number): string => {
  const [y, m] = monthKey.split('-').map(Number);
  const date = new Date(y, m - 1 + months, 1, 12);
  return dateToKey(date).slice(0, 7);
};

/** Số ngày từ a tới b (b - a), theo lịch. */
export const diffDays = (fromKey: string, toKey: string): number => {
  if (!fromKey || !toKey) return 0;
  return Math.round((keyToDate(toKey).getTime() - keyToDate(fromKey).getTime()) / 86_400_000);
};

export const startOfWeek = (key: string): string => {
  const date = keyToDate(key);
  const day = date.getDay();
  return addDays(key, day === 0 ? -6 : 1 - day);
};

export const weekdayShort = (key: string) => WEEKDAYS_SHORT[keyToDate(key).getDay()];
export const weekdayLong = (key: string) => WEEKDAYS_LONG[keyToDate(key).getDay()];
export const isWeekend = (key: string) => {
  const day = keyToDate(key).getDay();
  return day === 0 || day === 6;
};

/** dd/mm/yyyy */
export const fmtDate = (value: unknown, fallback = '—'): string => {
  const key = toDateKey(value);
  if (!key) return fallback;
  const [y, m, d] = key.split('-');
  return `${d}/${m}/${y}`;
};

/** dd/mm */
export const fmtDayMonth = (value: unknown, fallback = '—'): string => {
  const key = toDateKey(value);
  if (!key) return fallback;
  const [, m, d] = key.split('-');
  return `${d}/${m}`;
};

export const fmtMonth = (monthKey: string): string => {
  const [y, m] = monthKey.split('-');
  return `Tháng ${Number(m)}/${y}`;
};

export const fmtDateTime = (value: unknown, fallback = '—'): string => {
  const raw = String(value ?? '').trim();
  if (!raw) return fallback;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return fmtDate(raw, fallback);
  const hasTime = /T\d{2}:\d{2}|\s\d{1,2}:\d{2}/.test(raw);
  const datePart = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  if (!hasTime) return datePart;
  const timePart = new Intl.DateTimeFormat('vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return `${timePart} · ${datePart}`;
};

/** Mô tả tương đối: "Hôm nay", "Ngày mai", "3 ngày nữa", "Quá 2 ngày". */
export const relativeDay = (value: unknown, base = todayKey()): string => {
  const key = toDateKey(value);
  if (!key) return '';
  const diff = diffDays(base, key);
  if (diff === 0) return 'Hôm nay';
  if (diff === 1) return 'Ngày mai';
  if (diff === -1) return 'Hôm qua';
  if (diff > 1) return `${diff} ngày nữa`;
  return `${Math.abs(diff)} ngày trước`;
};

/** Danh sách các ô ngày cho lịch tháng (bắt đầu thứ Hai), gồm ngày tháng trước/sau để đủ tuần. */
export const monthGrid = (monthKey: string): Array<{ key: string; inMonth: boolean }> => {
  const first = `${monthKey}-01`;
  const start = startOfWeek(first);
  const cells: Array<{ key: string; inMonth: boolean }> = [];
  let cursor = start;
  for (let i = 0; i < 42; i++) {
    cells.push({ key: cursor, inMonth: cursor.startsWith(monthKey) });
    cursor = addDays(cursor, 1);
  }
  // Bỏ hàng cuối nếu hoàn toàn thuộc tháng sau.
  while (cells.length > 35 && cells.slice(-7).every(cell => !cell.inMonth)) cells.splice(-7, 7);
  return cells;
};

export const greeting = (date = new Date()): string => {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Ho_Chi_Minh', hour: '2-digit', hour12: false }).format(date),
  );
  if (hour < 11) return 'Chào buổi sáng';
  if (hour < 14) return 'Chào buổi trưa';
  if (hour < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

export const longToday = (): string => {
  const key = todayKey();
  return `${weekdayLong(key)}, ${fmtDate(key)}`;
};
