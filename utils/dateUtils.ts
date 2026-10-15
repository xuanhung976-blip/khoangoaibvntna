export const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

const vietnamDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: VIETNAM_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export type CalendarDate = {
  year: number;
  month: number;
  day: number;
  key: string;
  monthKey: string;
};

export const getVietnamDateKey = (date = new Date()): string => {
  const parts = vietnamDateFormatter.formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

export const getVietnamMonthKey = (date = new Date()): string =>
  getVietnamDateKey(date).slice(0, 7);

const isRealDate = (year: number, month: number, day: number) => {
  if (year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const value = new Date(Date.UTC(year, month - 1, day));
  return value.getUTCFullYear() === year && value.getUTCMonth() === month - 1 && value.getUTCDate() === day;
};

export const parseCalendarDate = (value: unknown): CalendarDate | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:T|\s|$)/);
  const vietnamese = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})(?:\s|$)/);

  let year: number;
  let month: number;
  let day: number;

  if (iso) {
    year = Number(iso[1]);
    month = Number(iso[2]);
    day = Number(iso[3]);
  } else if (vietnamese) {
    day = Number(vietnamese[1]);
    month = Number(vietnamese[2]);
    year = Number(vietnamese[3]);
  } else {
    return null;
  }

  if (!isRealDate(year, month, day)) return null;
  const monthText = String(month).padStart(2, '0');
  const dayText = String(day).padStart(2, '0');
  return {
    year,
    month,
    day,
    key: `${year}-${monthText}-${dayText}`,
    monthKey: `${year}-${monthText}`,
  };
};

