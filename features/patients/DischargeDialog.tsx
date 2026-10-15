import React, { useEffect, useState } from 'react';
import { LogOut } from 'lucide-react';
import type { Patient } from '../../types';
import { updatePatient } from '../../services/dataService';
import { KEYS } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { fmtDate, toDateKey, todayKey } from '../../lib/dates';
import { treatmentDays } from '../../lib/domain';
import { needsSurgeryClassification } from '../../utils/surgeryStats';
import { Button, Callout, Dialog, Field, Input, Textarea } from '../../components/ui';

/** Cho bệnh nhân ra viện nhanh, kèm kiểm tra hồ sơ phẫu thuật chưa hoàn thiện. */
export const DischargeDialog: React.FC<{ patient: Patient | null; onClose: () => void; onDone?: () => void }> = ({ patient, onClose, onDone }) => {
  const { run, pending } = useAction();
  const [date, setDate] = useState(todayKey());
  const [note, setNote] = useState('');

  useEffect(() => {
    if (patient) {
      setDate(todayKey());
      setNote(patient.notes || '');
    }
  }, [patient]);

  if (!patient) return null;
  const admission = toDateKey(patient.admissionDate);
  const invalid = Boolean(admission && date < admission);
  const incomplete = needsSurgeryClassification(patient);
  const days = treatmentDays({ ...patient, status: 'RaVien', dischargeDate: date });

  const submit = async () => {
    if (invalid) return;
    const result = await run(
      'discharge',
      () => updatePatient(patient.id, { status: 'RaVien', dischargeDate: date, notes: note }),
      { success: `${patient.name} đã ra viện`, invalidate: [KEYS.patients, KEYS.vip] },
    );
    if (result !== undefined) {
      onDone?.();
      onClose();
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Cho bệnh nhân ra viện"
      description={`${patient.name} · nhập viện ${fmtDate(patient.admissionDate)}`}
      icon={
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <LogOut className="h-4 w-4" />
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={submit} loading={pending === 'discharge'} disabled={invalid}>
            Xác nhận ra viện
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {incomplete && (
          <Callout tone="warning" title="Hồ sơ phẫu thuật chưa phân loại">
            Nên bổ sung loại phẫu thuật để ca này được tính vào thống kê.
          </Callout>
        )}
        <Field label="Ngày ra viện" required error={invalid ? 'Ngày ra viện trước ngày nhập viện' : undefined} hint={days !== null && !invalid ? `Tổng ${days} ngày điều trị` : undefined}>
          <Input type="date" value={date} onChange={event => setDate(event.target.value)} invalid={invalid} />
        </Field>
        <Field label="Ghi chú / diễn biến">
          <Textarea value={note} onChange={event => setNote(event.target.value)} rows={3} />
        </Field>
      </div>
    </Dialog>
  );
};
