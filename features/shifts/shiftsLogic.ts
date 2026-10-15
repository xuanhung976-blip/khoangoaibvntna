import type { DailyOnCall } from '../../types';
import { addDays, toDateKey } from '../../lib/dates';

export type Roster = Partial<DailyOnCall> & { date: string };

/** Đếm số buổi trực của mỗi người trong danh sách (bác sĩ + điều dưỡng). */
export const countDuties = (shifts: Array<Partial<DailyOnCall>>) => {
  const counts = new Map<string, number>();
  const add = (name?: string) => {
    const key = String(name || '').trim();
    if (key) counts.set(key, (counts.get(key) || 0) + 1);
  };
  shifts.forEach(shift => {
    add(shift.doctor);
    add(shift.nurse1);
    add(shift.nurse2);
  });
  return counts;
};

/**
 * Gợi ý phân trực cho các ngày còn trống: chọn người có ít buổi trực nhất trong kỳ,
 * tránh trực 2 ngày liên tiếp, không ghi đè ô đã có người.
 */
export function suggestRoster(
  days: Roster[],
  doctors: string[],
  nurses: string[],
  history: Array<Partial<DailyOnCall>>,
): Roster[] {
  const counts = countDuties([...history.filter(item => !days.some(day => day.date === toDateKey(item.date))), ...days]);
  const byDate = new Map<string, Partial<DailyOnCall>>();
  history.forEach(item => byDate.set(toDateKey(item.date), item));

  const pick = (pool: string[], exclude: Set<string>) => {
    const candidates = pool.filter(name => name && !exclude.has(name));
    if (!candidates.length) return '';
    candidates.sort((a, b) => (counts.get(a) || 0) - (counts.get(b) || 0) || pool.indexOf(a) - pool.indexOf(b));
    const chosen = candidates[0];
    counts.set(chosen, (counts.get(chosen) || 0) + 1);
    return chosen;
  };

  const result: Roster[] = [];
  days.forEach((day, index) => {
    const previous = index > 0 ? result[index - 1] : byDate.get(addDays(day.date, -1));
    const yesterday = new Set([previous?.doctor, previous?.nurse1, previous?.nurse2].filter(Boolean) as string[]);
    const next: Roster = { ...day };
    const taken = new Set([next.doctor, next.nurse1, next.nurse2].filter(Boolean) as string[]);
    if (!next.doctor) {
      next.doctor = pick(doctors, new Set([...yesterday, ...taken])) || pick(doctors, taken);
      if (next.doctor) taken.add(next.doctor);
    }
    if (!next.nurse1) {
      next.nurse1 = pick(nurses, new Set([...yesterday, ...taken])) || pick(nurses, taken);
      if (next.nurse1) taken.add(next.nurse1);
    }
    if (!next.nurse2 && nurses.length > 1) {
      next.nurse2 = pick(nurses, new Set([...yesterday, ...taken])) || pick(nurses, taken);
    }
    result.push(next);
  });
  return result;
}

/** Ghép lịch đã lưu theo ngày (ngày trống trả về bản ghi rỗng). */
export const rosterFor = (days: string[], shifts: DailyOnCall[]): Roster[] =>
  days.map(date => {
    const existing = shifts.find(shift => toDateKey(shift.date) === date);
    return existing ? { ...existing, date } : { date, doctor: '', nurse1: '', nurse2: '', note: '' };
  });

export const isOnDuty = (shift: Partial<DailyOnCall> | undefined, name: string) =>
  Boolean(shift && name && [shift.doctor, shift.nurse1, shift.nurse2].some(value => String(value || '').trim() === name.trim()));
