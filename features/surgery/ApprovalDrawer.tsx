import React, { useEffect, useMemo, useState } from 'react';
import { History, Users2, Wand2 } from 'lucide-react';
import type { Patient } from '../../types';
import { saveSurgeryOrder, updatePatient } from '../../services/dataService';
import { insertIntoDay, orderChanges } from './scheduleOrder';
import { useApp } from '../../context/AppContext';
import { KEYS, usePersonnel } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { getAge } from '../../utils/exportUtils';
import {
  SURGERY_CLASSIFICATION_OPTIONS,
  SURGERY_SERVICE_OPTIONS,
  toSurgeryClassificationCode,
  toSurgeryServiceCode,
} from '../../utils/surgeryStats';
import { addDays, fmtDate, todayKey, toDateKey, weekdayShort } from '../../lib/dates';
import { readPref, writePref } from '../../lib/prefs';
import { cn } from '../../lib/cn';
import { Button, Callout, ChipGroup, Combobox, Drawer, Field, FormGrid, FormSection, Input, Select, Textarea, namesToOptions } from '../../components/ui';

type Team = Pick<Patient, 'surgeon' | 'assistantSurgeon1' | 'assistantSurgeon2' | 'assistantSurgeon3' | 'anesthetist' | 'anesthetistAssistant' | 'scrubNurse'>;
type ApprovalForm = Team & Pick<Patient, 'surgeryDate' | 'surgeryOrder' | 'surgeryMethod' | 'surgeryService' | 'surgeryType' | 'approvalNote'>;

const LAST_TEAM_KEY = 'kn_last_surgery_team';

const METHOD_SUGGESTIONS: Record<string, string[]> = {
  TOETVA: ['TOETVA cắt thùy tuyến giáp', 'TOETVA cắt toàn bộ tuyến giáp'],
  K_GIAP: ['Cắt toàn bộ tuyến giáp + nạo vét hạch cổ trung tâm', 'Cắt toàn bộ tuyến giáp + nạo vét hạch cổ bên'],
  BASEDOW: ['Cắt gần toàn bộ tuyến giáp', 'Cắt toàn bộ tuyến giáp'],
  CAT_1_THUY: ['Cắt 1 thùy tuyến giáp', 'Cắt 1 thùy + eo tuyến giáp'],
  CAT_2_THUY: ['Cắt toàn bộ tuyến giáp'],
  RFA: ['Đốt sóng cao tần (RFA) nhân tuyến giáp'],
  ETS: ['Phẫu thuật nội soi đốt hạch giao cảm ngực 2 bên'],
};

export const ApprovalDrawer: React.FC<{ patient: Patient | null; patients: Patient[]; onClose: () => void }> = ({ patient, patients, onClose }) => {
  const { user } = useApp();
  const { doctors, nurses, loading: personnelLoading } = usePersonnel();
  const { run, pending } = useAction();
  const [form, setForm] = useState<ApprovalForm>({});
  const [error, setError] = useState('');
  const lastTeam = readPref<Team | null>(`${LAST_TEAM_KEY}:${user.username}`, null);
  const isNew = patient?.status === 'ChoMo';

  const nextOrderFor = (date: string, excludeId?: string) => {
    const sameDay = patients.filter(item => item.status === 'DaDuyet' && toDateKey(item.surgeryDate) === date && item.id !== excludeId);
    return Math.max(0, ...sameDay.map(item => Number(item.surgeryOrder) || 0)) + 1;
  };

  useEffect(() => {
    if (!patient) return;
    const date = toDateKey(patient.surgeryDate) || addDays(todayKey(), 1);
    setForm({
      surgeryDate: date,
      surgeryOrder: patient.surgeryOrder || nextOrderFor(date, patient.id),
      surgeryMethod: patient.surgeryMethod || '',
      surgeryService: toSurgeryServiceCode(patient.surgeryService || patient.interventionType) || '',
      surgeryType: toSurgeryClassificationCode(patient.surgeryType || patient.surgeryClassification) || '',
      surgeon: patient.surgeon || '',
      assistantSurgeon1: patient.assistantSurgeon1 || '',
      assistantSurgeon2: patient.assistantSurgeon2 || '',
      assistantSurgeon3: patient.assistantSurgeon3 || '',
      anesthetist: patient.anesthetist || '',
      anesthetistAssistant: patient.anesthetistAssistant || '',
      scrubNurse: patient.scrubNurse || '',
      approvalNote: patient.approvalNote || '',
    });
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient?.id]);

  const set = <K extends keyof ApprovalForm>(key: K, value: ApprovalForm[K]) => {
    setForm(current => ({ ...current, [key]: value }));
    setError('');
  };

  const isRfa = form.surgeryService === 'RFA';
  const doctorOptions = useMemo(() => namesToOptions(doctors), [doctors]);
  const nurseOptions = useMemo(() => namesToOptions(nurses), [nurses]);

  // Số ca đã xếp trong ngày & số ca của từng PTV/gây mê trong ngày đó.
  const dayLoad = useMemo(() => {
    const date = form.surgeryDate || '';
    const cases = patients.filter(item => item.status === 'DaDuyet' && toDateKey(item.surgeryDate) === date && item.id !== patient?.id);
    const count = (name?: string, field: keyof Patient = 'surgeon') => (name ? cases.filter(item => item[field] === name).length : 0);
    return { total: cases.length, surgeon: count(form.surgeon), anesthetist: count(form.anesthetist, 'anesthetist') };
  }, [patients, form.surgeryDate, form.surgeon, form.anesthetist, patient?.id]);

  const validate = () => {
    if (!form.surgeryDate) return 'Vui lòng chọn ngày mổ dự kiến.';
    if (!form.surgeryService) return 'Vui lòng chọn dịch vụ phẫu thuật.';
    if (!isRfa && !form.surgeryType) return 'Vui lòng chọn loại phẫu thuật.';
    if (!String(form.surgeryMethod || '').trim()) return 'Vui lòng nhập phương pháp phẫu thuật.';
    if (!form.surgeon) return 'Vui lòng chọn bác sĩ mổ chính.';
    if (!form.anesthetist) return 'Vui lòng chọn bác sĩ gây mê.';
    if (!form.scrubNurse) return 'Vui lòng chọn điều dưỡng dụng cụ.';
    return '';
  };

  const submit = async () => {
    if (!patient) return;
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    const approvalDate = isNew || !patient.approvalDate ? new Date().toISOString() : patient.approvalDate;
    // Chèn vào vị trí đã chọn: các ca từ vị trí đó trở đi lùi xuống, không để trùng số.
    const date = String(form.surgeryDate || '');
    const sameDay = patients.filter(item => item.status === 'DaDuyet' && toDateKey(item.surgeryDate) === date && item.id !== patient.id);
    const orderedIds = insertIntoDay([...sameDay, { ...patient, surgeryOrder: form.surgeryOrder }], patient.id, Number(form.surgeryOrder) || sameDay.length + 1);
    const ownOrder = orderedIds.indexOf(patient.id) + 1;
    const result = await run(
      'approve',
      async () => {
        await updatePatient(patient.id, {
          ...form,
          surgeryMethod: String(form.surgeryMethod || '').trim(),
          surgeryType: isRfa ? '' : form.surgeryType,
          activityType: isRfa ? 'Thủ thuật' : 'Phẫu thuật',
          surgeryOrder: ownOrder,
          status: 'DaDuyet',
          approvalDate,
        });
        await saveSurgeryOrder(orderChanges(sameDay, orderedIds).filter(change => change.id !== patient.id));
        return true;
      },
      { success: isNew ? `Đã duyệt mổ cho ${patient.name}` : `Đã cập nhật lịch mổ của ${patient.name}`, invalidate: [KEYS.patients] },
    );
    if (result !== undefined) {
      writePref(`${LAST_TEAM_KEY}:${user.username}`, {
        surgeon: form.surgeon,
        assistantSurgeon1: form.assistantSurgeon1,
        assistantSurgeon2: form.assistantSurgeon2,
        assistantSurgeon3: form.assistantSurgeon3,
        anesthetist: form.anesthetist,
        anesthetistAssistant: form.anesthetistAssistant,
        scrubNurse: form.scrubNurse,
      });
      onClose();
    }
  };

  if (!patient) return null;
  const today = todayKey();
  const dateChoices = [0, 1, 2, 3].map(offset => addDays(today, offset));
  const suggestions = METHOD_SUGGESTIONS[form.surgeryService || ''] || [];
  const age = getAge(patient.dob);

  const person = (key: keyof Team, label: string, options = doctorOptions, required = false, hint?: React.ReactNode) => (
    <Field label={label} required={required} hint={hint}>
      <Combobox
        value={(form[key] as string) || ''}
        onChange={value => set(key, value)}
        options={options}
        placeholder={personnelLoading ? 'Đang tải danh sách…' : 'Chọn…'}
        allowCustom
      />
    </Field>
  );

  return (
    <Drawer
      open
      onClose={onClose}
      persistent
      size="lg"
      title={isNew ? 'Duyệt mổ & phân công ê-kíp' : 'Cập nhật lịch mổ'}
      subtitle={
        <span>
          <b className="font-medium text-fg">{patient.name}</b> · {patient.id}
          {age !== '' && ` · ${age} tuổi`} · {patient.gender}
        </span>
      }
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" onClick={submit} loading={pending === 'approve'}>
            {isNew ? 'Xác nhận duyệt mổ' : 'Lưu lịch mổ'}
          </Button>
        </>
      }
    >
      <div className="space-y-7">
        <div className="rounded-xl border border-line bg-sunken/60 p-3 text-sm">
          <p className="text-xs text-muted">Chẩn đoán</p>
          <p className="mt-0.5 text-fg">{patient.diagnosis || '—'}</p>
          {patient.notes && <p className="mt-1 text-xs text-muted">Ghi chú: {patient.notes}</p>}
        </div>

        {error && <Callout tone="danger">{error}</Callout>}

        <FormSection title="Lịch mổ" icon={History}>
          <Field label="Ngày mổ dự kiến" required hint={dayLoad.total ? `Ngày này đã có ${dayLoad.total} ca được xếp` : 'Chưa có ca nào trong ngày này'}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <ChipGroup
                size="sm"
                value={form.surgeryDate || ''}
                onChange={value => setForm(current => ({ ...current, surgeryDate: value, surgeryOrder: nextOrderFor(value, patient.id) }))}
                options={dateChoices.map((date, index) => ({ value: date, label: index === 0 ? 'Hôm nay' : index === 1 ? 'Ngày mai' : `${weekdayShort(date)} ${fmtDate(date).slice(0, 5)}` }))}
              />
              <Input
                type="date"
                value={form.surgeryDate || ''}
                onChange={event => setForm(current => ({ ...current, surgeryDate: event.target.value, surgeryOrder: nextOrderFor(event.target.value, patient.id) }))}
                className="sm:w-44"
              />
            </div>
          </Field>
          <FormGrid cols={3}>
            <Field
              label="Thứ tự ca"
              hint={
                Number(form.surgeryOrder) <= dayLoad.total ? (
                  <span className="text-amber-700 dark:text-amber-300">Chèn vào ca {form.surgeryOrder} — các ca từ đó lùi xuống 1 bậc</span>
                ) : (
                  'Mặc định là ca tiếp theo của ngày'
                )
              }
            >
              <Input type="number" min={1} max={dayLoad.total + 1} value={form.surgeryOrder || 1} onChange={event => set('surgeryOrder', Math.min(dayLoad.total + 1, Number(event.target.value) || 1))} className="font-semibold" />
            </Field>
            <Field label="Dịch vụ phẫu thuật" required>
              <Select
                value={form.surgeryService || ''}
                placeholder="— Chọn —"
                onChange={event => setForm(current => ({ ...current, surgeryService: event.target.value, surgeryType: event.target.value === 'RFA' ? '' : current.surgeryType }))}
                options={SURGERY_SERVICE_OPTIONS.map(option => ({ value: option.code, label: option.label }))}
              />
            </Field>
            <Field label="Loại phẫu thuật" required={!isRfa}>
              <Select
                value={isRfa ? '' : form.surgeryType || ''}
                disabled={isRfa}
                placeholder={isRfa ? 'Không áp dụng (RFA)' : '— Chọn —'}
                onChange={event => set('surgeryType', event.target.value)}
                options={SURGERY_CLASSIFICATION_OPTIONS.map(option => ({ value: option.code, label: option.label }))}
              />
            </Field>
          </FormGrid>
          <Field label="Phương pháp phẫu thuật (dự kiến)" required>
            <Input value={form.surgeryMethod || ''} onChange={event => set('surgeryMethod', event.target.value)} placeholder="VD: TOETVA cắt toàn bộ tuyến giáp" />
            {suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestions.map(text => (
                  <button
                    key={text}
                    type="button"
                    onClick={() => set('surgeryMethod', text)}
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-xs',
                      form.surgeryMethod === text ? 'border-primary bg-primary-soft text-primary' : 'border-dashed border-line text-muted hover:border-primary hover:text-primary',
                    )}
                  >
                    {text}
                  </button>
                ))}
              </div>
            )}
          </Field>
        </FormSection>

        <FormSection
          title="Ê-kíp phẫu thuật"
          icon={Users2}
          description={
            lastTeam?.surgeon && !form.surgeon ? (
              <button type="button" onClick={() => setForm(current => ({ ...current, ...lastTeam }))} className="mt-1 inline-flex items-center gap-1 font-medium text-primary hover:underline">
                <Wand2 className="h-3.5 w-3.5" /> Dùng ê-kíp lần trước ({lastTeam.surgeon})
              </button>
            ) : undefined
          }
        >
          <FormGrid>
            {person('surgeon', 'Phẫu thuật viên chính', doctorOptions, true, dayLoad.surgeon ? <span className={dayLoad.surgeon >= 4 ? 'text-amber-600' : ''}>Đã có {dayLoad.surgeon} ca khác trong ngày</span> : undefined)}
            {person('assistantSurgeon1', 'Phụ mổ 1')}
            {person('assistantSurgeon2', 'Phụ mổ 2')}
            {person('assistantSurgeon3', 'Phụ mổ 3')}
            {person('anesthetist', 'Bác sĩ gây mê', doctorOptions, true, dayLoad.anesthetist ? `Đã có ${dayLoad.anesthetist} ca khác trong ngày` : undefined)}
            {person('anesthetistAssistant', 'Phụ mê', nurseOptions)}
            {person('scrubNurse', 'Điều dưỡng dụng cụ', nurseOptions, true)}
          </FormGrid>
          <Field label="Ghi chú cho kíp mổ">
            <Textarea value={form.approvalNote || ''} onChange={event => set('approvalNote', event.target.value)} rows={2} placeholder="Lưu ý đặc biệt…" />
          </Field>
        </FormSection>
      </div>
    </Drawer>
  );
};
