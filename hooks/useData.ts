import { useMemo } from 'react';
import {
  getDashboardOperationsData,
  getDoctorsList,
  getPatients,
  getPersonnelLists,
  getStaffDirectory,
  getVipPatients,
  type DashboardOperationsData,
} from '../services/dataService';
import type { Patient, VipPatient } from '../types';
import { isAdminAccount, normalizePatients } from '../lib/domain';
import { useResource } from '../lib/resource';

/* Khóa cache dùng chung. Sau khi ghi dữ liệu gọi invalidate(KEYS.x). */
export const KEYS = {
  patients: 'patients',
  vip: 'vip',
  ops: 'ops',
  personnel: 'personnel',
  directory: 'directory',
  doctors: 'doctors',
  medicines: 'medicines',
  equipment: 'equipment',
  research: 'research',
  meetings: 'meetings',
  briefings: 'briefings',
  techniques: 'techniques',
  comms: 'comms',
  zones: 'zones',
  evaluations5s: 'evaluations5s',
  improvements: 'improvements',
  shifts: 'shifts',
  nursing: 'nursing',
  staffTasks: 'staffTasks',
  staffEvaluations: 'staffEvaluations',
  staffRewards: 'staffRewards',
  users: 'users',
  permissions: 'permissions',
  configs: 'configs',
  audit: 'audit',
} as const;

export const usePatients = () =>
  useResource<Patient[]>(KEYS.patients, async options => normalizePatients(await getPatients(options)));

export const useVipPatients = () =>
  useResource<VipPatient[]>(KEYS.vip, async options => {
    const data = await getVipPatients(options);
    return Array.isArray(data) ? data : [];
  });

export const useOperations = () =>
  useResource<DashboardOperationsData>(KEYS.ops, options => getDashboardOperationsData(options?.bypassCache ? options : undefined), { staleMs: 60_000 });

export const usePersonnel = () => {
  const resource = useResource(KEYS.personnel, options => getPersonnelLists(options), { staleMs: 5 * 60_000 });
  return {
    ...resource,
    doctors: resource.data?.doctors || [],
    nurses: resource.data?.nurses || [],
  };
};

export const useDirectory = () => {
  const resource = useResource(KEYS.directory, options => getStaffDirectory(options), { staleMs: 5 * 60_000 });
  // Tài khoản quản trị không phải nhân sự khoa: không đếm, không giao việc, không đánh giá.
  const users = useMemo(() => (resource.data || []).filter(user => !isAdminAccount(user)), [resource.data]);
  return { ...resource, users };
};

export const useDoctors = () => {
  const resource = useResource<Array<{ id: string; fullName: string }>>(
    KEYS.doctors,
    async options => {
      const list = await getDoctorsList(options);
      return Array.isArray(list) ? list : [];
    },
    { staleMs: 5 * 60_000 },
  );
  return { ...resource, doctors: resource.data || [] };
};

/** Tập id bệnh nhân đang được đánh dấu lưu ý. */
export const useVipIds = () => {
  const { data } = useVipPatients();
  return useMemo(() => new Set((data || []).map(item => String(item.patientId).trim())), [data]);
};
