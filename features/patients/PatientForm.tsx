import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ClipboardList, Contact, Scissors, Stethoscope } from 'lucide-react';
import type { Patient, User } from '../../types';
import { addPatient, updatePatient } from '../../services/dataService';
import { KEYS, useDoctors } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { getAge } from '../../utils/exportUtils';
import { detectDuplicates, getMatchTypeLabel } from '../../utils/duplicateDetection';
import {
  SURGERY_CLASSIFICATION_OPTIONS,
  SURGERY_SERVICE_OPTIONS,
  toSurgeryClassificationCode,
  toSurgeryServiceCode,
} from '../../utils/surgeryStats';
import { fmtDate, todayKey } from '../../lib/dates';
import { PATIENT_STATUS } from '../../lib/domain';
import { cn } from '../../lib/cn';
import {
  Button,
  Callout,
  ChipGroup,
  Combobox,
  Drawer,
  Field,
  FormGrid,
  FormSection,
  Input,
  Select,
  Textarea,
  namesToOptions,
  showToast,
} from '../../components/ui';
import { preparePatient, type PatientField } from './patientLogic';

type Props = {
  open: boolean;
  /** Hồ sơ đang sửa; undefined = tiếp nhận mới. */
  patient?: Patient | null;
  patients: Patient[];
  user: User;
  /** Cuộn tới phần phẫu thuật khi mở (ví dụ từ nút "Cần phân loại"). */
  focusSection?: 'surgery';
  supportsIdentity: boolean;
  onClose: () => void;
  onSaved: (patient: Patient) => void;
};

const blank = (user: User): Partial<Patient> => ({
  id: '',
  name: '',
  gender: 'Nam',
  dob: '',
  phoneNumber: '',
  room: '',
  bed: '',
  treatmentType: 'Ngoai',
  status: 'ChoMo',
  admissionDate: todayKey(),
  diagnosis: '',
  notes: '',
  treatingDoctor: user.nhomChuyenMon === 'BS' ? user.fullName : '',
});

export const PatientForm: React.FC<Props> = ({ open, patient, patients, user, focusSection, supportsIdentity, onClose, onSaved }) => {
  const editing = Boolean(patient);
  const [form, setForm] = useState<Partial<Patient>>(() => (patient ? { ...patient } : blank(user)));
  const [errors, setErrors] = useState<Partial<Record<PatientField, string>>>({});
  const [ackDuplicate, setAckDuplicate] = useState(false);
  const { run, pending } = useAction();
  const { doctors } = useDoctors();
  const surgeryRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(patient ? { ...patient } : blank(user));
    setErrors({});
    setAckDuplicate(false);
    if (focusSection === 'surgery') window.setTimeout(() => surgeryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, patient?.id]);

  const set = <K extends keyof Patient>(key: K, value: Patient[K] | undefined) => {
    setForm(current => ({ ...current, [key]: value }));
    if (errors[key as PatientField]) setErrors(current => ({ ...current, [key]: undefined }));
  };

  const idTaken = useMemo(() => {
    if (editing) return false;
    const id = String(form.id || '').trim().toLowerCase();
    return Boolean(id) && patients.some(item => item.id.toLowerCase() === id);
  }, [form.id, patients, editing]);

  const duplicates = useMemo(() => {
    if (editing || !String(form.name || '').trim()) return [];
    return detectDuplicates(form, patients).slice(0, 3);
  }, [form.name, form.dob, form.phoneNumber, form.gender, patients, editing]); // eslint-disable-line react-hooks/exhaustive-deps

  const previous = useMemo(() => (patient ? patients.find(item => item.id === patient.id) || patient : undefined), [patient, patients]);
  const age = getAge(form.dob);
  const isRfa = toSurgeryServiceCode(form.surgeryService || form.interventionType) === 'RFA';
  const doctorOptions = useMemo(() => namesToOptions([...doctors.map(doctor => doctor.fullName), form.treatingDoctor || '']), [doctors, form.treatingDoctor]);

  const submit = async (event?: React.FormEvent) => {
    event?.preventDefault();
    if (idTaken) {
      setErrors({ id: `Mã "${form.id}" đã tồn tại` });
      return;
    }
    const prepared = preparePatient(form, previous, editing);
    if (!prepared.ok) {
      setErrors({ [prepared.field]: prepared.error });
      showToast(prepared.error, 'warning');
      if (prepared.field === 'surgeryType') surgeryRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (duplicates.length && !ackDuplicate) {
      setAckDuplicate(true);
      showToast('Có hồ sơ có thể trùng — kiểm tra lại rồi bấm Lưu lần nữa', 'warning');
      return;
    }
    const payload = prepared.payload;
    const result = await run(
      'save',
      () => (editing ? updatePatient(payload.id, payload) : addPatient(payload)),
      {
        success: editing ? (payload.status === 'RaVien' && previous?.status !== 'RaVien' ? `${payload.name} đã ra viện` : 'Đã cập nhật hồ sơ') : `Đã tiếp nhận ${payload.name}`,
        invalidate: [KEYS.patients, KEYS.vip],
      },
    );
    if (result !== undefined) onSaved(payload);
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      persistent
      size="lg"
      title={editing ? `Cập nhật hồ sơ: ${patient?.name}` : 'Tiếp nhận bệnh nhân'}
      subtitle={editing ? `Mã BN ${patient?.id}` : 'Các trường có dấu * là bắt buộc'}
      footer={
        <>
          <span className="mr-auto hidden text-xs text-faint sm:block">Ctrl + Enter để lưu</span>
          <Button variant="ghost" onClick={onClose}>
            Đóng
          </Button>
          <Button variant="primary" onClick={() => submit()} loading={pending === 'save'}>
            {editing ? 'Lưu thay đổi' : ackDuplicate && duplicates.length ? 'Vẫn tiếp nhận' : 'Tiếp nhận'}
          </Button>
        </>
      }
    >
      <form
        ref={formRef}
        onSubmit={submit}
        onKeyDown={event => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) submit();
        }}
        className="space-y-8"
      >
        <FormSection title="Hành chính" icon={Contact}>
          <FormGrid>
            <Field label="Mã bệnh nhân" required error={errors.id || (idTaken ? `Mã "${form.id}" đã có trong hệ thống` : undefined)}>
              <Input
                value={form.id || ''}
                disabled={editing}
                onChange={event => set('id', event.target.value)}
                placeholder="VD: 26001234"
                className="font-mono"
                invalid={Boolean(errors.id || idTaken)}
              />
            </Field>
            <Field label="Họ và tên" required error={errors.name}>
              <Input value={form.name || ''} onChange={event => set('name', event.target.value)} placeholder="Nguyễn Văn A" invalid={Boolean(errors.name)} />
            </Field>
            <Field label="Năm sinh / ngày sinh / tuổi" hint={age !== '' ? `≈ ${age} tuổi` : 'VD: 1985, 15/08/1985 hoặc 45'}>
              <Input value={form.dob || ''} onChange={event => set('dob', event.target.value)} />
            </Field>
            <Field label="Giới tính" required error={errors.gender}>
              <ChipGroup
                value={(form.gender || '') as 'Nam' | 'Nữ'}
                onChange={value => set('gender', value)}
                options={[
                  { value: 'Nam', label: 'Nam' },
                  { value: 'Nữ', label: 'Nữ' },
                ]}
              />
            </Field>
            <Field label="Số điện thoại">
              <Input type="tel" inputMode="tel" value={form.phoneNumber || ''} onChange={event => set('phoneNumber', event.target.value)} />
            </Field>
            {supportsIdentity && (
              <Field label="Số CCCD">
                <Input inputMode="numeric" value={form.cccd || ''} onChange={event => set('cccd', event.target.value)} />
              </Field>
            )}
            {supportsIdentity && (
              <Field label="Mã thẻ BHYT">
                <Input value={form.bhytCode || ''} onChange={event => set('bhytCode', event.target.value.toUpperCase())} className="font-mono" />
              </Field>
            )}
            {supportsIdentity && (
              <Field label="Địa chỉ" className="sm:col-span-2">
                <Input value={form.address || ''} onChange={event => set('address', event.target.value)} />
              </Field>
            )}
          </FormGrid>

          {duplicates.length > 0 && (
            <Callout tone={ackDuplicate ? 'danger' : 'warning'} icon={AlertTriangle} title="Có thể trùng với hồ sơ đã có">
              <ul className="mt-1 space-y-0.5">
                {duplicates.map(match => (
                  <li key={match.patient.id}>
                    <b className="text-fg">{match.patient.name}</b> ({match.patient.id}, {PATIENT_STATUS[match.patient.status]?.short || match.patient.status}) — {getMatchTypeLabel(match.matchType)}: {match.detail}
                  </li>
                ))}
              </ul>
            </Callout>
          )}
        </FormSection>

        <FormSection title="Điều trị" icon={Stethoscope}>
          <FormGrid cols={4}>
            <Field label="Buồng">
              <Input value={form.room || ''} onChange={event => set('room', event.target.value)} placeholder="VD: 201" />
            </Field>
            <Field label="Giường">
              <Input value={form.bed || ''} onChange={event => set('bed', event.target.value)} placeholder="VD: 3" />
            </Field>
            <Field label="Ngày nhập viện">
              <Input type="date" value={form.admissionDate || ''} onChange={event => set('admissionDate', event.target.value)} />
            </Field>
            <Field label="Ngày ra viện" error={errors.dischargeDate}>
              <Input type="date" value={form.dischargeDate || ''} onChange={event => set('dischargeDate', event.target.value)} />
            </Field>
          </FormGrid>
          <FormGrid>
            <Field label="Phân loại" required error={errors.treatmentType}>
              <ChipGroup
                value={(form.treatmentType || '') as 'Ngoai' | 'Noi'}
                onChange={value => set('treatmentType', value)}
                options={[
                  { value: 'Ngoai', label: 'Ngoại khoa' },
                  { value: 'Noi', label: 'Nội khoa' },
                ]}
              />
            </Field>
            <Field label="Trạng thái">
              <Select
                value={form.status || 'ChoMo'}
                onChange={event => {
                  const status = event.target.value as Patient['status'];
                  setForm(current => ({ ...current, status, dischargeDate: status === 'RaVien' && !current.dischargeDate ? todayKey() : current.dischargeDate }));
                }}
                options={Object.entries(PATIENT_STATUS).map(([value, meta]) => ({ value, label: meta.label }))}
              />
            </Field>
            <Field label="Bác sĩ điều trị" className="sm:col-span-2">
              <Combobox value={form.treatingDoctor || ''} onChange={value => set('treatingDoctor', value)} options={doctorOptions} placeholder="Chọn hoặc gõ tên bác sĩ" allowCustom />
            </Field>
            <Field label="Chẩn đoán" required error={errors.diagnosis} className="sm:col-span-2">
              <Textarea value={form.diagnosis || ''} onChange={event => set('diagnosis', event.target.value)} rows={2} placeholder="Chẩn đoán y khoa…" />
            </Field>
            <Field label="Diễn biến / ghi chú" className="sm:col-span-2">
              <Textarea value={form.notes || ''} onChange={event => set('notes', event.target.value)} rows={2} />
            </Field>
          </FormGrid>
        </FormSection>

        <div ref={surgeryRef} className={cn('scroll-mt-4 rounded-2xl border p-4', errors.surgeryType ? 'border-amber-500/50 bg-amber-500/[0.04]' : 'border-line bg-sunken/40')}>
          <FormSection title="Phẫu thuật (hậu kiểm)" description="Nhập sau khi đã mổ — dùng cho báo cáo thống kê" icon={Scissors}>
            {(form.surgeryDate || form.surgeon) && (
              <p className="flex items-center gap-1.5 text-xs text-muted">
                <ClipboardList className="h-3.5 w-3.5" /> Lịch duyệt: {fmtDate(form.surgeryDate)}
                {form.surgeryOrder ? ` · Ca ${form.surgeryOrder}` : ''}
                {form.surgeon ? ` · PTV ${form.surgeon}` : ''}
              </p>
            )}
            <FormGrid>
              <Field
                label="Ngày mổ thực tế"
                action={
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                    onClick={() => setForm(current => ({ ...current, actualSurgeryDate: todayKey(), status: current.status === 'RaVien' ? 'RaVien' : 'DaMo' }))}
                  >
                    Hôm nay
                  </button>
                }
                hint="Có ngày mổ ⇒ tự chuyển trạng thái Hậu phẫu"
              >
                <Input
                  type="date"
                  value={form.actualSurgeryDate || ''}
                  max={todayKey()}
                  onChange={event => {
                    const value = event.target.value;
                    setForm(current => ({ ...current, actualSurgeryDate: value, status: value && current.status !== 'RaVien' ? 'DaMo' : current.status }));
                  }}
                />
              </Field>
              <Field label="Cách thức phẫu thuật">
                <Input value={form.surgeryMethod || ''} onChange={event => set('surgeryMethod', event.target.value)} placeholder="VD: TOETVA cắt toàn bộ tuyến giáp" />
              </Field>
              <Field label="Dịch vụ phẫu thuật">
                <Select
                  value={toSurgeryServiceCode(form.surgeryService || form.interventionType) || ''}
                  placeholder="— Chọn dịch vụ —"
                  onChange={event => set('surgeryService', event.target.value)}
                  options={SURGERY_SERVICE_OPTIONS.map(option => ({ value: option.code, label: option.label }))}
                />
              </Field>
              <Field label="Loại phẫu thuật" error={errors.surgeryType} hint={isRfa ? 'RFA được tính là thủ thuật, không cần phân loại' : undefined}>
                <Select
                  value={toSurgeryClassificationCode(form.surgeryType || form.surgeryClassification) || ''}
                  placeholder="— Chọn loại —"
                  onChange={event => set('surgeryType', event.target.value)}
                  options={SURGERY_CLASSIFICATION_OPTIONS.map(option => ({ value: option.code, label: option.label }))}
                />
              </Field>
            </FormGrid>
          </FormSection>
        </div>
        <button type="submit" className="hidden" aria-hidden />
      </form>
    </Drawer>
  );
};
