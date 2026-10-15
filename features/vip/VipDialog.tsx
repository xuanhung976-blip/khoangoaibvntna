import React, { useEffect, useMemo, useState } from 'react';
import { Star } from 'lucide-react';
import type { Patient } from '../../types';
import { addVipPatient } from '../../services/dataService';
import { KEYS, usePatients, useVipIds } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { statusMeta } from '../../lib/domain';
import { Badge, Button, ChipGroup, Combobox, Dialog, Field, Textarea } from '../../components/ui';

const REASON_SUGGESTIONS = ['Người nhà cán bộ', 'Dị ứng thuốc', 'Bệnh nền nặng', 'Cao tuổi, nguy cơ cao', 'Theo dõi sát sau mổ', 'Khiếu nại / cần hỗ trợ'];

type Priority = 'Cao' | 'Trung bình' | 'Thấp';

/** Thêm bệnh nhân vào danh sách cần lưu ý. Có thể truyền sẵn bệnh nhân từ trang chi tiết. */
export const VipDialog: React.FC<{ open: boolean; patient?: Patient | null; onClose: () => void }> = ({ open, patient, onClose }) => {
  const { data: patients } = usePatients();
  const vipIds = useVipIds();
  const { run, pending } = useAction();
  const [patientId, setPatientId] = useState('');
  const [priority, setPriority] = useState<Priority>('Cao');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open) {
      setPatientId(patient?.id || '');
      setPriority('Cao');
      setReason('');
    }
  }, [open, patient]);

  const options = useMemo(
    () =>
      (patients || [])
        .filter(item => item.status !== 'RaVien' && !vipIds.has(item.id))
        .map(item => ({
          value: item.id,
          label: item.name,
          description: [item.id, item.room && `P.${item.room}${item.bed ? `/${item.bed}` : ''}`, item.diagnosis].filter(Boolean).join(' · '),
          keywords: `${item.id} ${item.phoneNumber || ''}`,
          meta: <Badge tone={statusMeta(item.status).tone}>{statusMeta(item.status).short}</Badge>,
        })),
    [patients, vipIds],
  );

  const submit = async () => {
    if (!patientId || !reason.trim()) return;
    const result = await run('add-vip', () => addVipPatient(patientId, priority, reason.trim()), {
      success: 'Đã thêm vào danh sách cần lưu ý',
      invalidate: [KEYS.vip],
    });
    if (result !== undefined) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Đánh dấu bệnh nhân cần lưu ý"
      icon={
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
          <Star className="h-4 w-4" />
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={submit} loading={pending === 'add-vip'} disabled={!patientId || !reason.trim()}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Bệnh nhân" required hint={patient ? undefined : 'Chỉ hiển thị bệnh nhân đang điều trị, chưa có trong danh sách.'}>
          {patient ? (
            <div className="rounded-xl border border-line bg-sunken px-3 py-2.5 text-sm">
              <span className="font-medium text-fg">{patient.name}</span> <span className="text-muted">· {patient.id}</span>
            </div>
          ) : (
            <Combobox value={patientId} onChange={value => setPatientId(value)} options={options} placeholder="Gõ tên hoặc mã bệnh nhân…" />
          )}
        </Field>
        <Field label="Mức độ ưu tiên">
          <ChipGroup<Priority>
            value={priority}
            onChange={setPriority}
            options={[
              { value: 'Cao', label: 'Cao', activeClass: 'border-rose-500 bg-rose-500 text-white' },
              { value: 'Trung bình', label: 'Trung bình', activeClass: 'border-amber-500 bg-amber-500 text-white' },
              { value: 'Thấp', label: 'Thấp', activeClass: 'border-sky-500 bg-sky-500 text-white' },
            ]}
          />
        </Field>
        <Field label="Lý do / yêu cầu" required>
          <Textarea value={reason} onChange={event => setReason(event.target.value)} rows={3} placeholder="VD: Dị ứng kháng sinh nhóm beta-lactam…" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REASON_SUGGESTIONS.map(text => (
              <button
                key={text}
                type="button"
                onClick={() => setReason(current => (current ? `${current}; ${text}` : text))}
                className="rounded-full border border-dashed border-line px-2.5 py-0.5 text-xs text-muted hover:border-primary hover:text-primary"
              >
                + {text}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </Dialog>
  );
};
