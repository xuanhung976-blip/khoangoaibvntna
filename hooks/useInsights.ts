import { useMemo } from 'react';
import { computeSummary, type Summary } from '../features/dashboard/insights';
import { todayKey } from '../lib/dates';
import { useOperations, usePatients, useVipPatients } from './useData';

/** Tổng hợp tình hình khoa (dùng cho bảng điều hành, chuông thông báo, huy hiệu menu). */
export const useInsights = (): {
  summary: Summary;
  loading: boolean;
  validating: boolean;
  error: unknown;
  reload: () => void;
  partial: boolean;
} => {
  const patients = usePatients();
  const vips = useVipPatients();
  const ops = useOperations();
  const today = todayKey();

  const summary = useMemo(
    () =>
      computeSummary(
        {
          patients: patients.data || [],
          vips: vips.data || [],
          staffTasks: ops.data?.staffTasks || [],
          medicines: ops.data?.medicines || [],
          equipment: ops.data?.equipment || [],
          improvements: ops.data?.improvements || [],
          evaluations5S: ops.data?.evaluations5S || [],
          shifts: ops.data?.shifts || [],
          meetings: ops.data?.meetings || [],
          research: ops.data?.research || [],
          nursingTasks: ops.data?.nursingTasks || [],
        },
        today,
      ),
    [patients.data, vips.data, ops.data, today],
  );

  return {
    summary,
    loading: patients.loading || ops.loading,
    validating: patients.validating || ops.validating || vips.validating,
    error: patients.error || ops.error,
    partial: Boolean(patients.error) !== Boolean(ops.error),
    reload: () => {
      patients.reload();
      vips.reload();
      ops.reload();
    },
  };
};
