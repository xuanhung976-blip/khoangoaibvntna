import { useCallback, useEffect, useRef, useState } from 'react';
import type { Patient } from '../../types';
import { saveSurgeryOrder } from '../../services/dataService';
import { KEYS } from '../../hooks/useData';
import { invalidate, mutateCache } from '../../lib/resource';
import { toDateKey } from '../../lib/dates';
import { errorMessage, showToast } from '../../components/ui/Toast';
import { byOrder } from './scheduleOrder';

const SAVE_DELAY_MS = 700;

/**
 * Sắp xếp ca mổ theo ngày:
 * - Giao diện đổi ngay (cập nhật lạc quan vào cache bệnh nhân).
 * - Các lần kéo liên tiếp trong cùng ngày được gộp và lưu một lần sau ~0,7 giây.
 * - Các lần lưu chạy nối tiếp nhau nên không lần nào bị bỏ sót.
 * - Mỗi thao tác có thể Hoàn tác.
 */
export function useScheduleOrder(approved: Patient[]) {
  const [savingDates, setSavingDates] = useState<string[]>([]);
  const approvedRef = useRef(approved);
  approvedRef.current = approved;
  /** Thứ tự đã lưu trên máy chủ, chụp lại trước lần sửa đầu tiên của mỗi ca. */
  const persisted = useRef(new Map<string, number>());
  const timers = useRef(new Map<string, number>());
  const latest = useRef(new Map<string, string[]>());
  const queue = useRef<Promise<void>>(Promise.resolve());

  const markSaving = (date: string, saving: boolean) =>
    setSavingDates(current => (saving ? (current.includes(date) ? current : [...current, date]) : current.filter(item => item !== date)));

  const dayIds = useCallback(
    (date: string) =>
      approvedRef.current
        .filter(patient => toDateKey(patient.surgeryDate) === date)
        .sort(byOrder)
        .map(patient => patient.id),
    [],
  );

  const flush = useCallback((date: string) => {
    const orderedIds = latest.current.get(date);
    latest.current.delete(date);
    timers.current.delete(date);
    if (!orderedIds) return;
    queue.current = queue.current.then(async () => {
      const changes = orderedIds
        .map((id, index) => ({ id, order: index + 1 }))
        .filter(change => persisted.current.get(change.id) !== change.order);
      try {
        await saveSurgeryOrder(changes);
      } catch (error) {
        showToast(errorMessage(error, 'Không lưu được thứ tự ca mổ'), 'error', 'Đã tải lại lịch từ máy chủ.');
        invalidate(KEYS.patients);
      } finally {
        orderedIds.forEach(id => persisted.current.delete(id));
        if (!latest.current.has(date)) markSaving(date, false);
      }
    });
  }, []);

  const applyOrder = useCallback(
    (date: string, orderedIds: string[], message?: string) => {
      if (!date || date === 'none') return;
      const previous = dayIds(date);
      if (previous.join('|') === orderedIds.join('|') && !orderedIds.some((id, index) => Number(approvedRef.current.find(p => p.id === id)?.surgeryOrder) !== index + 1)) return;
      approvedRef.current
        .filter(patient => toDateKey(patient.surgeryDate) === date)
        .forEach(patient => {
          if (!persisted.current.has(patient.id)) persisted.current.set(patient.id, Number(patient.surgeryOrder) || 0);
        });
      mutateCache<Patient[]>(KEYS.patients, current =>
        (current || []).map(patient => {
          const index = orderedIds.indexOf(patient.id);
          return index >= 0 ? { ...patient, surgeryOrder: index + 1 } : patient;
        }),
      );
      latest.current.set(date, orderedIds);
      markSaving(date, true);
      window.clearTimeout(timers.current.get(date));
      timers.current.set(date, window.setTimeout(() => flush(date), SAVE_DELAY_MS));
      if (message) showToast(message, 'success', undefined, { label: 'Hoàn tác', onClick: () => applyOrder(date, previous) });
    },
    [dayIds, flush],
  );

  // Rời trang khi còn thay đổi chưa lưu: lưu ngay thay vì bỏ.
  useEffect(
    () => () => {
      Array.from(timers.current.keys()).forEach(date => {
        window.clearTimeout(timers.current.get(date));
        flush(date);
      });
    },
    [flush],
  );

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (latest.current.size) event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  return { applyOrder, dayIds, savingDates };
}
