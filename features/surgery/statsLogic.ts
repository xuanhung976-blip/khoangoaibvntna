import type { Patient } from '../../types';
import { parseCalendarDate } from '../../lib/dates';
import { isInternalMedicinePatient, isRfaProcedure, toSurgeryClassificationCode } from '../../utils/surgeryStats';

/**
 * Danh sách ca được tính trong tháng — cùng quy tắc với calculateSurgeryStats
 * (RFA = thủ thuật; nội khoa và thủ thuật khác bị loại; phẫu thuật phải có phân loại).
 */
export const casesInMonth = (patients: Patient[], monthKey: string | 'ALL') => {
  const surgeries: Patient[] = [];
  const procedures: Patient[] = [];
  const incomplete: Patient[] = [];
  for (const patient of patients) {
    if (!patient.actualSurgeryDate) continue;
    const date = parseCalendarDate(patient.actualSurgeryDate);
    if (!date) continue;
    if (monthKey !== 'ALL' && date.monthKey !== monthKey) continue;
    if (isRfaProcedure(patient)) {
      procedures.push(patient);
      continue;
    }
    if (isInternalMedicinePatient(patient)) continue;
    if (patient.activityType === 'Thủ thuật') continue;
    if (!toSurgeryClassificationCode(patient.surgeryType || patient.surgeryClassification)) {
      incomplete.push(patient);
      continue;
    }
    surgeries.push(patient);
  }
  return { surgeries, procedures, incomplete };
};

/** Đếm số ca theo người (PTV chính), sắp giảm dần. */
export const countBy = (patients: Patient[], pick: (patient: Patient) => string | undefined) => {
  const map = new Map<string, number>();
  patients.forEach(patient => {
    const key = String(pick(patient) || '').trim();
    if (!key) return;
    map.set(key, (map.get(key) || 0) + 1);
  });
  return Array.from(map.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'vi'));
};
