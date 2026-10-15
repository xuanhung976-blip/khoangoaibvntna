import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  BedDouble,
  CheckCircle2,
  Circle,
  Edit3,
  LogOut,
  Phone,
  Scissors,
  Star,
  StarOff,
  Stethoscope,
  Trash2,
} from 'lucide-react';
import type { Patient, VipPatient } from '../../types';
import { getAge } from '../../utils/exportUtils';
import { getSurgeryClassificationLabel, getSurgeryServiceLabel, needsSurgeryClassification } from '../../utils/surgeryStats';
import { fmtDate } from '../../lib/dates';
import { statusMeta, treatmentDays } from '../../lib/domain';
import { cn } from '../../lib/cn';
import { Badge, Button, Callout, Drawer, KeyValue } from '../../components/ui';

type Props = {
  patient: Patient | null;
  vip?: VipPatient;
  onClose: () => void;
  onEdit: (patient: Patient, section?: 'surgery') => void;
  onDischarge: (patient: Patient) => void;
  onConfirmSurgery: (patient: Patient) => void;
  onAddVip: (patient: Patient) => void;
  onRemoveVip: (vip: VipPatient) => void;
  onDelete: (patient: Patient) => void;
};

type Step = { label: string; date?: string; done: boolean; detail?: string };

const Timeline: React.FC<{ steps: Step[] }> = ({ steps }) => (
  <ol className="relative space-y-4">
    {steps.map((step, index) => (
      <li key={step.label} className="relative flex gap-3">
        {index < steps.length - 1 && <span className={cn('absolute left-[9px] top-6 h-[calc(100%-4px)] w-px', step.done ? 'bg-primary/40' : 'bg-line')} />}
        {step.done ? <CheckCircle2 className="relative h-5 w-5 shrink-0 text-primary" /> : <Circle className="relative h-5 w-5 shrink-0 text-faint" />}
        <div className="min-w-0 pb-0.5">
          <p className={cn('text-sm font-medium', step.done ? 'text-fg' : 'text-muted')}>{step.label}</p>
          <p className="text-xs text-muted">
            {step.date ? fmtDate(step.date) : step.done ? '' : 'Chưa thực hiện'}
            {step.detail && ` · ${step.detail}`}
          </p>
        </div>
      </li>
    ))}
  </ol>
);

export const PatientDetail: React.FC<Props> = ({ patient, vip, onClose, onEdit, onDischarge, onConfirmSurgery, onAddVip, onRemoveVip, onDelete }) => {
  const navigate = useNavigate();
  if (!patient) return null;
  const meta = statusMeta(patient.status);
  const days = treatmentDays(patient);
  const age = getAge(patient.dob);
  const active = patient.status !== 'RaVien';
  const incomplete = needsSurgeryClassification(patient);
  const hasSurgery = Boolean(patient.surgeryDate || patient.actualSurgeryDate || patient.surgeon);
  const team = [
    ['Phẫu thuật viên', patient.surgeon],
    ['Phụ mổ', [patient.assistantSurgeon1, patient.assistantSurgeon2, patient.assistantSurgeon3].filter(Boolean).join(', ')],
    ['Gây mê', patient.anesthetist],
    ['Phụ mê', patient.anesthetistAssistant],
    ['ĐD dụng cụ', patient.scrubNurse],
  ].filter(([, value]) => value);

  const steps: Step[] = [
    { label: 'Nhập viện', date: patient.admissionDate, done: true, detail: patient.room ? `Buồng ${patient.room}${patient.bed ? ` · giường ${patient.bed}` : ''}` : undefined },
  ];
  if (patient.treatmentType !== 'Noi' && patient.status !== 'DieuTri') {
    steps.push({ label: 'Duyệt mổ', date: patient.approvalDate, done: Boolean(patient.approvalDate) || ['DaDuyet', 'DaMo'].includes(patient.status) || Boolean(patient.actualSurgeryDate), detail: patient.surgeryDate ? `Lịch ${fmtDate(patient.surgeryDate)}${patient.surgeryOrder ? `, ca ${patient.surgeryOrder}` : ''}` : undefined });
    steps.push({ label: 'Phẫu thuật', date: patient.actualSurgeryDate, done: Boolean(patient.actualSurgeryDate), detail: patient.surgeryMethod || undefined });
  }
  steps.push({ label: 'Ra viện', date: patient.dischargeDate, done: patient.status === 'RaVien', detail: days !== null && patient.status === 'RaVien' ? `${days} ngày điều trị` : undefined });

  return (
    <Drawer
      open
      onClose={onClose}
      size="md"
      title={
        <span className="flex items-center gap-2">
          {patient.name}
          {vip && <Star className="h-4 w-4 fill-amber-400 text-amber-400" />}
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono">{patient.id}</span>
          <span>·</span>
          <span>
            {age !== '' ? `${age} tuổi · ` : ''}
            {patient.gender}
          </span>
          <Badge tone={meta.tone} dot>
            {meta.label}
          </Badge>
        </span>
      }
      footer={
        <>
          <Button variant="danger-soft" icon={Trash2} onClick={() => onDelete(patient)} className="mr-auto">
            Xoá
          </Button>
          <Button icon={Edit3} onClick={() => onEdit(patient)}>
            Sửa hồ sơ
          </Button>
          {active && (
            <Button variant="primary" icon={LogOut} onClick={() => onDischarge(patient)}>
              Ra viện
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-6">
        {/* Thao tác nhanh theo trạng thái */}
        <div className="flex flex-wrap gap-2">
          {patient.status === 'ChoMo' && (
            <Button size="sm" variant="soft" icon={Activity} onClick={() => navigate(`/surgery-approval?approve=${encodeURIComponent(patient.id)}`)}>
              Duyệt mổ
            </Button>
          )}
          {patient.status === 'DaDuyet' && (
            <Button size="sm" variant="soft" icon={Scissors} onClick={() => onConfirmSurgery(patient)}>
              Xác nhận đã mổ
            </Button>
          )}
          {active &&
            (vip ? (
              <Button size="sm" variant="outline" icon={StarOff} onClick={() => onRemoveVip(vip)}>
                Bỏ lưu ý
              </Button>
            ) : (
              <Button size="sm" variant="outline" icon={Star} onClick={() => onAddVip(patient)}>
                Đánh dấu cần lưu ý
              </Button>
            ))}
          {patient.phoneNumber && (
            <a href={`tel:${patient.phoneNumber}`} className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[13px] font-medium text-fg hover:bg-sunken">
              <Phone className="h-4 w-4" /> Gọi {patient.phoneNumber}
            </a>
          )}
        </div>

        {incomplete && (
          <Callout
            tone="warning"
            title="Chưa phân loại phẫu thuật"
            action={
              <Button size="sm" onClick={() => onEdit(patient, 'surgery')}>
                Bổ sung
              </Button>
            }
          >
            Ca này chưa được tính vào thống kê chính thức.
          </Callout>
        )}

        {vip && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-3 text-sm">
            <p className="flex items-center gap-1.5 font-medium text-fg">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" /> Cần lưu ý · mức {vip.priority}
            </p>
            <p className="mt-0.5 text-muted">{vip.reason}</p>
          </div>
        )}

        <section>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
            <Stethoscope className="h-4 w-4 text-primary" /> Lâm sàng
          </h3>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <KeyValue className="col-span-2" label="Chẩn đoán" value={patient.diagnosis} />
            <KeyValue label="Bác sĩ điều trị" value={patient.treatingDoctor} />
            <KeyValue label="Phân loại" value={patient.treatmentType === 'Noi' ? 'Nội khoa' : 'Ngoại khoa'} />
            <KeyValue
              label="Buồng / giường"
              value={
                patient.room ? (
                  <span className="inline-flex items-center gap-1">
                    <BedDouble className="h-3.5 w-3.5 text-faint" /> {patient.room}
                    {patient.bed ? ` / ${patient.bed}` : ''}
                  </span>
                ) : undefined
              }
            />
            <KeyValue label="Số ngày điều trị" value={days !== null ? `${days} ngày` : undefined} />
            {patient.notes && <KeyValue className="col-span-2" label="Diễn biến / ghi chú" value={<span className="whitespace-pre-line font-normal">{patient.notes}</span>} />}
          </dl>
        </section>

        {(patient.cccd || patient.bhytCode || patient.address) && (
          <section>
            <h3 className="mb-3 text-sm font-semibold text-fg">Hành chính</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <KeyValue label="CCCD" value={patient.cccd} mono />
              <KeyValue label="Thẻ BHYT" value={patient.bhytCode} mono />
              <KeyValue className="col-span-2" label="Địa chỉ" value={patient.address} />
            </dl>
          </section>
        )}

        {hasSurgery && (
          <section>
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
              <Scissors className="h-4 w-4 text-violet-500" /> Phẫu thuật
            </h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <KeyValue label="Ngày mổ dự kiến" value={patient.surgeryDate ? `${fmtDate(patient.surgeryDate)}${patient.surgeryOrder ? ` · ca ${patient.surgeryOrder}` : ''}` : undefined} />
              <KeyValue label="Ngày mổ thực tế" value={patient.actualSurgeryDate ? fmtDate(patient.actualSurgeryDate) : undefined} />
              <KeyValue label="Dịch vụ" value={getSurgeryServiceLabel(patient.surgeryService || patient.interventionType)} />
              <KeyValue label="Loại PT" value={getSurgeryClassificationLabel(patient.surgeryType || patient.surgeryClassification)} />
              <KeyValue className="col-span-2" label="Phương pháp" value={patient.surgeryMethod} />
              {team.map(([label, value]) => (
                <KeyValue key={label} label={label} value={value} />
              ))}
              {patient.approvalNote && <KeyValue className="col-span-2" label="Ghi chú duyệt mổ" value={patient.approvalNote} />}
            </dl>
          </section>
        )}

        <section>
          <h3 className="mb-3 text-sm font-semibold text-fg">Hành trình điều trị</h3>
          <Timeline steps={steps} />
        </section>
      </div>
    </Drawer>
  );
};
