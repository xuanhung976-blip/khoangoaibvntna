import React, { useEffect, useState } from 'react';
import { Scissors } from 'lucide-react';
import type { Patient } from '../../types';
import { updatePatient } from '../../services/dataService';
import { KEYS } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { todayKey, toDateKey } from '../../lib/dates';
import {
  SURGERY_CLASSIFICATION_OPTIONS,
  SURGERY_SERVICE_OPTIONS,
  toSurgeryClassificationCode,
  toSurgeryServiceCode,
} from '../../utils/surgeryStats';
import { Button, Dialog, Field, FormGrid, Input, Select } from '../../components/ui';

/**
 * Xác nhận ca đã mổ: ghi ngày mổ thực tế, chuyển trạng thái Hậu phẫu.
 * Mặc định lấy ngày mổ dự kiến và phân loại đã chọn lúc duyệt mổ.
 */
export const ConfirmSurgeryDialog: React.FC<{ patient: Patient | null; onClose: () => void; onDone?: () => void }> = ({ patient, onClose, onDone }) => {
  const { run, pending } = useAction();
  const [date, setDate] = useState('');
  const [service, setService] = useState('');
  const [type, setType] = useState('');
  const [method, setMethod] = useState('');

  useEffect(() => {
    if (!patient) return;
    const planned = toDateKey(patient.surgeryDate);
    setDate(planned && planned <= todayKey() ? planned : todayKey());
    setService(toSurgeryServiceCode(patient.surgeryService || patient.interventionType) || '');
    setType(toSurgeryClassificationCode(patient.surgeryType || patient.surgeryClassification) || '');
    setMethod(patient.surgeryMethod || '');
  }, [patient]);

  const isRfa = service === 'RFA';
  const canSubmit = Boolean(date && service && (isRfa || type));

  const submit = async () => {
    if (!patient || !canSubmit) return;
    const result = await run(
      'confirm',
      () =>
        updatePatient(patient.id, {
          status: patient.status === 'RaVien' ? 'RaVien' : 'DaMo',
          actualSurgeryDate: date,
          surgeryService: service,
          surgeryType: isRfa ? '' : type,
          surgeryMethod: method,
          activityType: isRfa ? 'Thủ thuật' : 'Phẫu thuật',
        }),
      { success: `Đã xác nhận mổ cho ${patient.name}`, invalidate: [KEYS.patients] },
    );
    if (result !== undefined) {
      onDone?.();
      onClose();
    }
  };

  return (
    <Dialog
      open={Boolean(patient)}
      onClose={onClose}
      title="Xác nhận đã mổ"
      description={patient ? `${patient.name} · ${patient.id}` : undefined}
      icon={
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
          <Scissors className="h-4 w-4" />
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={submit} loading={pending === 'confirm'} disabled={!canSubmit}>
            Xác nhận
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Ngày mổ thực tế" required hint="Ngày này được dùng để tính thống kê phẫu thuật theo tháng.">
          <Input type="date" value={date} max={todayKey()} onChange={event => setDate(event.target.value)} />
        </Field>
        <FormGrid>
          <Field label="Dịch vụ phẫu thuật" required>
            <Select
              value={service}
              placeholder="— Chọn dịch vụ —"
              onChange={event => {
                setService(event.target.value);
                if (event.target.value === 'RFA') setType('');
              }}
              options={SURGERY_SERVICE_OPTIONS.map(option => ({ value: option.code, label: option.label }))}
            />
          </Field>
          <Field label="Loại phẫu thuật" required={!isRfa} hint={isRfa ? 'RFA được tính là thủ thuật' : undefined}>
            <Select
              value={type}
              disabled={isRfa}
              placeholder={isRfa ? 'Không áp dụng' : '— Chọn loại —'}
              onChange={event => setType(event.target.value)}
              options={SURGERY_CLASSIFICATION_OPTIONS.map(option => ({ value: option.code, label: option.label }))}
            />
          </Field>
        </FormGrid>
        <Field label="Cách thức phẫu thuật (tường trình)">
          <Input value={method} onChange={event => setMethod(event.target.value)} placeholder="VD: TOETVA cắt toàn bộ tuyến giáp" />
        </Field>
      </div>
    </Dialog>
  );
};
