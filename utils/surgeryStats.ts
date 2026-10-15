import type { Patient } from '../types';
import { parseCalendarDate } from './dateUtils.js';

export const SURGERY_CLASSIFICATION_OPTIONS = [
  { code: 'DAC_BIET', label: 'Đặc biệt' },
  { code: 'LOAI_I', label: 'Loại I' },
  { code: 'LOAI_II', label: 'Loại II' },
  { code: 'LOAI_III', label: 'Loại III' },
] as const;

export const SURGERY_SERVICE_OPTIONS = [
  { code: 'K_GIAP', label: 'K giáp' },
  { code: 'BASEDOW', label: 'Basedow' },
  { code: 'TOETVA', label: 'TOETVA' },
  { code: 'CAT_1_THUY', label: 'Cắt 1 thùy' },
  { code: 'CAT_2_THUY', label: 'Cắt 2 thùy' },
  { code: 'RFA', label: 'RFA giáp' },
  { code: 'ETS', label: 'ETS đốt hạch giao cảm' },
  { code: 'PT_KHAC', label: 'PT khác' },
] as const;

export type SurgeryClassificationCode = typeof SURGERY_CLASSIFICATION_OPTIONS[number]['code'];
export type SurgeryServiceCode = typeof SURGERY_SERVICE_OPTIONS[number]['code'];
export type SurgeryGroup = 'TOETVA' | 'KGiap' | 'LanhTinh' | 'Basedow' | 'ETS' | 'Other';

export type SurgeryStats = {
  sourceRecords: number;
  total: number;
  totalSurgeries: number;
  totalProcedures: number;
  excludedProcedures: number;
  incompleteRecords: number;
  invalidDateRecords: number;
  groups: Record<SurgeryGroup, number>;
  classifications: Record<'Đặc biệt' | 'Loại I' | 'Loại II' | 'Loại III', number>;
  incompletePatientIds: string[];
};

const fold = (value: unknown) =>
  String(value || '')
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toUpperCase();

const classificationByCode = new Map<string, SurgeryClassificationCode>([
  ['DAC_BIET', 'DAC_BIET'],
  ['LOAI_I', 'LOAI_I'],
  ['LOAI_II', 'LOAI_II'],
  ['LOAI_III', 'LOAI_III'],
  ['DAC BIET', 'DAC_BIET'],
  ['LOAI I', 'LOAI_I'],
  ['LOAI II', 'LOAI_II'],
  ['LOAI III', 'LOAI_III'],
]);

const serviceByCode = new Map<string, SurgeryServiceCode>([
  ['K_GIAP', 'K_GIAP'],
  ['BASEDOW', 'BASEDOW'],
  ['TOETVA', 'TOETVA'],
  ['CAT_1_THUY', 'CAT_1_THUY'],
  ['CAT_2_THUY', 'CAT_2_THUY'],
  ['RFA', 'RFA'],
  ['ETS', 'ETS'],
  ['PT_KHAC', 'PT_KHAC'],
  ['K GIAP', 'K_GIAP'],
  ['MO K TUYEN GIAP', 'K_GIAP'],
  ['K TUYEN GIAP', 'K_GIAP'],
  ['UNG THU TUYEN GIAP', 'K_GIAP'],
  ['CAT 1 THUY', 'CAT_1_THUY'],
  ['CAT 1 THUY TUYEN GIAP', 'CAT_1_THUY'],
  ['CAT 2 THUY', 'CAT_2_THUY'],
  ['CAT TOAN BO TUYEN GIAP', 'CAT_2_THUY'],
  ['RFA GIAP', 'RFA'],
  ['PTNS DOT HACH GIAO CAM', 'ETS'],
  ['DOT HACH GIAO CAM', 'ETS'],
  ['ETS DOT HACH GIAO CAM', 'ETS'],
  ['PT KHAC', 'PT_KHAC'],
]);

export const toSurgeryClassificationCode = (value: unknown): SurgeryClassificationCode | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;

  // Giá trị "Đặc biệt (ĐB)" đang nằm trong nhóm dữ liệu cần duyệt thủ công.
  // Không tự hợp thức hóa để giữ nguyên số chính thức 65 ca của tháng 08/2026.
  if (fold(raw) === 'DAC BIET DB') return null;
  return classificationByCode.get(raw) || classificationByCode.get(fold(raw)) || null;
};

export const getSurgeryClassificationLabel = (value: unknown): string => {
  const code = toSurgeryClassificationCode(value);
  return SURGERY_CLASSIFICATION_OPTIONS.find(option => option.code === code)?.label || String(value || '');
};

export const toSurgeryServiceCode = (value: unknown): SurgeryServiceCode | null => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const normalized = fold(raw);
  const exact = serviceByCode.get(raw) || serviceByCode.get(normalized);
  if (exact) return exact;
  if (normalized.includes('RFA')) return 'RFA';
  if (normalized.includes('DOT SONG CAO TAN')) return 'RFA';
  if (normalized.includes('TOETVA')) return 'TOETVA';
  if (normalized.includes('BASEDOW')) return 'BASEDOW';
  if (normalized.includes('DOT HACH') || normalized === 'ETS') return 'ETS';
  if (normalized.includes('K GIAP') || normalized.includes('UNG THU TUYEN GIAP')) return 'K_GIAP';
  if (normalized.includes('CAT 1 THUY')) return 'CAT_1_THUY';
  if (normalized.includes('CAT 2 THUY') || normalized.includes('CAT TOAN BO')) return 'CAT_2_THUY';
  return null;
};

export const getSurgeryServiceLabel = (value: unknown): string => {
  const code = toSurgeryServiceCode(value);
  return SURGERY_SERVICE_OPTIONS.find(option => option.code === code)?.label || String(value || '');
};

export const isRfaProcedure = (patient: Pick<Patient, 'surgeryService' | 'interventionType' | 'surgeryMethod'>): boolean => {
  const primaryService = toSurgeryServiceCode(patient.surgeryService);
  const legacyService = toSurgeryServiceCode(patient.interventionType);
  if (primaryService === 'RFA' || legacyService === 'RFA') return true;
  const method = fold(patient.surgeryMethod);
  return method.includes('RFA') || method.includes('DOT SONG CAO TAN');
};

export const isInternalMedicinePatient = (patient: Pick<Patient, 'treatmentType' | 'status'>): boolean =>
  patient.treatmentType === 'Noi' || patient.status === 'DieuTri';

export const isInternalMedicineWorkflow = (
  patient: Pick<Patient, 'treatmentType' | 'status'>,
  previousPatient?: Pick<Patient, 'treatmentType' | 'status'>,
): boolean =>
  isInternalMedicinePatient(patient) || (
    patient.status === 'RaVien' &&
    Boolean(previousPatient && isInternalMedicinePatient(previousPatient))
  );

export const needsSurgeryClassification = (
  patient: Pick<Patient, 'actualSurgeryDate' | 'activityType' | 'surgeryService' | 'interventionType' | 'surgeryMethod' | 'surgeryType' | 'surgeryClassification' | 'treatmentType' | 'status'>,
  previousPatient?: Pick<Patient, 'treatmentType' | 'status'>,
): boolean => {
  if (!patient.actualSurgeryDate || !parseCalendarDate(patient.actualSurgeryDate)) return false;
  if (isInternalMedicineWorkflow(patient, previousPatient)) return false;
  if (isRfaProcedure(patient)) return false;
  if (patient.activityType === 'Thủ thuật') return false;
  return !toSurgeryClassificationCode(patient.surgeryType || patient.surgeryClassification);
};

const getClassificationLabel = (code: SurgeryClassificationCode) =>
  SURGERY_CLASSIFICATION_OPTIONS.find(option => option.code === code)!.label as keyof SurgeryStats['classifications'];

const getGroup = (service: SurgeryServiceCode | null): SurgeryGroup => {
  if (service === 'TOETVA') return 'TOETVA';
  if (service === 'K_GIAP') return 'KGiap';
  if (service === 'BASEDOW') return 'Basedow';
  if (service === 'ETS') return 'ETS';
  if (service === 'CAT_1_THUY' || service === 'CAT_2_THUY') return 'LanhTinh';
  return 'Other';
};

export const calculateSurgeryStats = (patients: Patient[], monthKey: string | 'ALL'): SurgeryStats => {
  const result: SurgeryStats = {
    sourceRecords: 0,
    total: 0,
    totalSurgeries: 0,
    totalProcedures: 0,
    excludedProcedures: 0,
    incompleteRecords: 0,
    invalidDateRecords: 0,
    groups: { TOETVA: 0, KGiap: 0, LanhTinh: 0, Basedow: 0, ETS: 0, Other: 0 },
    classifications: { 'Đặc biệt': 0, 'Loại I': 0, 'Loại II': 0, 'Loại III': 0 },
    incompletePatientIds: [],
  };

  for (const patient of patients) {
    if (!patient.actualSurgeryDate) continue;
    const date = parseCalendarDate(patient.actualSurgeryDate);
    if (!date) {
      result.invalidDateRecords += 1;
      continue;
    }
    if (monthKey !== 'ALL' && date.monthKey !== monthKey) continue;

    const primaryService = toSurgeryServiceCode(patient.surgeryService);
    const legacyService = toSurgeryServiceCode(patient.interventionType);
    const service = primaryService || legacyService;
    if (isRfaProcedure(patient)) {
      result.sourceRecords += 1;
      result.totalProcedures += 1;
      result.total += 1;
      continue;
    }

    // Hồ sơ điều trị nội khoa không phải hồ sơ phẫu thuật và không được đưa
    // vào nhóm cần hoàn thiện phân loại, kể cả dữ liệu cũ có ngày mổ bị gán nhầm.
    if (isInternalMedicinePatient(patient)) continue;

    result.sourceRecords += 1;

    // Theo sổ đối chiếu, chỉ RFA được tính vào thủ thuật. Các thủ thuật khác
    // vẫn giữ nguyên trong hồ sơ nhưng không cộng vào thống kê phẫu thuật/RFA.
    if (patient.activityType === 'Thủ thuật') {
      result.excludedProcedures += 1;
      continue;
    }

    const classification = toSurgeryClassificationCode(patient.surgeryType || patient.surgeryClassification);
    if (!classification) {
      result.incompleteRecords += 1;
      result.incompletePatientIds.push(patient.id);
      continue;
    }

    result.totalSurgeries += 1;
    result.total += 1;
    result.groups[getGroup(service)] += 1;
    result.classifications[getClassificationLabel(classification)] += 1;
  }

  return result;
};
