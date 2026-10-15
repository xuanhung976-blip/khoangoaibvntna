import { Patient, Role, User } from '../types';
import { diffDays, todayKey, toDateKey } from './dates';
import { fold, toBool } from './text';

export type Tone = 'neutral' | 'primary' | 'info' | 'success' | 'warning' | 'danger' | 'violet';

/* ---------------- Vai trò ---------------- */

export const normalizeRole = (role: unknown): Role => {
  const value = String(role || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_');
  if (value === 'ADMIN' || value === 'TRUONGKHOA') return Role.CHIEF;
  return value as Role;
};

export const isChief = (user?: Pick<User, 'role'> | null) => normalizeRole(user?.role) === Role.CHIEF;

export const ROLE_META: Record<string, { label: string; tone: Tone }> = {
  [Role.CHIEF]: { label: 'Trưởng khoa', tone: 'violet' },
  [Role.HEAD_NURSE]: { label: 'Điều dưỡng trưởng', tone: 'info' },
  [Role.STAFF]: { label: 'Nhân viên', tone: 'neutral' },
};

export const roleLabel = (role: unknown) => ROLE_META[normalizeRole(role)]?.label || String(role || '—');

/** Tài khoản quản trị (username "admin" hoặc vai trò gốc ADMIN): quyền như Trưởng khoa, chỉ khác nhãn hiển thị. */
const ADMIN_META = { label: 'Quản trị viên', tone: 'violet' as Tone };
export const isAdminAccount = (user?: { username?: string; role?: unknown } | null) =>
  String(user?.username || '').trim().toLowerCase() === 'admin' || String(user?.role || '').trim().toUpperCase() === 'ADMIN';

/** Nhãn + màu vai trò để hiển thị cho một tài khoản cụ thể. */
export const userRoleMeta = (user: { username?: string; role?: unknown }) =>
  isAdminAccount(user) ? ADMIN_META : ROLE_META[normalizeRole(user.role)] || { label: String(user.role || '—'), tone: 'neutral' as Tone };

export const isUserActive = (user: Pick<User, 'active'>) => toBool(user.active);

/* ---------------- Bệnh nhân ---------------- */

export type PatientStatus = Patient['status'];

export const PATIENT_STATUS: Record<PatientStatus, { label: string; tone: Tone; short: string }> = {
  ChoMo: { label: 'Chờ mổ', short: 'Chờ mổ', tone: 'warning' },
  DaDuyet: { label: 'Đã duyệt mổ', short: 'Đã duyệt', tone: 'info' },
  DaMo: { label: 'Hậu phẫu', short: 'Hậu phẫu', tone: 'violet' },
  DieuTri: { label: 'Điều trị nội khoa', short: 'Nội khoa', tone: 'primary' },
  RaVien: { label: 'Đã ra viện', short: 'Ra viện', tone: 'neutral' },
};

export const statusMeta = (status: unknown) =>
  PATIENT_STATUS[status as PatientStatus] || { label: String(status || '—'), short: String(status || '—'), tone: 'neutral' as Tone };

export const TOTAL_BEDS = 27;

export const isActivePatient = (patient: Pick<Patient, 'status'>) => patient.status !== 'RaVien';

/** Số ngày điều trị: tới hôm nay, hoặc tới ngày ra viện. */
export const treatmentDays = (patient: Pick<Patient, 'admissionDate' | 'dischargeDate' | 'status'>): number | null => {
  const start = toDateKey(patient.admissionDate);
  if (!start) return null;
  const end = patient.status === 'RaVien' ? toDateKey(patient.dischargeDate) : todayKey();
  if (!end) return null;
  return Math.max(0, diffDays(start, end));
};

export const normalizePatients = (raw: unknown): Patient[] => {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const result: Patient[] = [];
  for (const item of raw as Patient[]) {
    if (!item || !item.id) continue;
    const id = String(item.id).trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    result.push({ ...item, id, name: String(item.name || ''), diagnosis: String(item.diagnosis || '') });
  }
  return result;
};

export const roomKey = (value: unknown) => String(value ?? '').trim();

export const sortRooms = (rooms: string[]) => [...rooms].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

/* ---------------- Công việc ---------------- */

export const isDoneStatus = (status: unknown, progress?: unknown) => {
  const value = fold(status);
  return Number(progress) >= 100 || value.includes('hoan thanh') || value === 'done' || value === 'hoanthanh';
};

export const PRIORITY_TONE: Record<string, Tone> = {
  Khẩn: 'danger',
  Cao: 'warning',
  'Trung bình': 'info',
  Thấp: 'neutral',
};
