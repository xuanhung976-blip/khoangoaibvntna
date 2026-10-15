import type { Patient } from '../../types';

/** Sắp ca trong ngày: theo surgeryOrder, trùng số thì theo mã BN để ổn định. */
export const byOrder = (a: Patient, b: Patient) => (Number(a.surgeryOrder) || 99) - (Number(b.surgeryOrder) || 99) || a.id.localeCompare(b.id);

/** Di chuyển `id` tới vị trí `toIndex` (0-based) trong danh sách id. */
export const moveId = (ids: string[], id: string, toIndex: number): string[] => {
  const from = ids.indexOf(id);
  if (from < 0) return ids;
  const next = ids.filter(item => item !== id);
  next.splice(Math.max(0, Math.min(next.length, toIndex)), 0, id);
  return next;
};

/** Những ca cần ghi lại số thứ tự để khớp thứ tự `orderedIds` (đánh số 1..n). */
export const orderChanges = (patients: Patient[], orderedIds: string[]): Array<{ id: string; order: number }> =>
  orderedIds
    .map((id, index) => ({ id, order: index + 1 }))
    .filter(change => Number(patients.find(patient => patient.id === change.id)?.surgeryOrder) !== change.order);

/**
 * Thứ tự mới của một ngày khi đặt ca `id` vào vị trí `position` (1-based):
 * các ca từ vị trí đó trở đi lùi xuống một bậc thay vì bị trùng số.
 */
export const insertIntoDay = (dayPatients: Patient[], id: string, position: number): string[] => {
  const others = dayPatients.filter(patient => patient.id !== id).sort(byOrder).map(patient => patient.id);
  const index = Math.max(0, Math.min(others.length, Math.round(position) - 1));
  others.splice(index, 0, id);
  return others;
};
