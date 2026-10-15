import React, { useEffect, useMemo, useState } from 'react';
import { Database, FileSpreadsheet, Filter, RotateCcw, Sparkles } from 'lucide-react';
import type { Patient, ResearchTopic } from '../../types';
import { usePatients } from '../../hooks/useData';
import { exportToExcel, getAge } from '../../utils/exportUtils';
import { SURGERY_SERVICE_OPTIONS, getSurgeryClassificationLabel, getSurgeryServiceLabel, isRfaProcedure, toSurgeryServiceCode } from '../../utils/surgeryStats';
import { fmtDate, toDateKey } from '../../lib/dates';
import { PATIENT_STATUS } from '../../lib/domain';
import { fold, matchesQuery } from '../../lib/text';
import { Badge, Button, Callout, Drawer, Field, FormGrid, Input, Select, StatCard, showToast } from '../../components/ui';
import { presetForTopic } from './researchLogic';

type Filters = { status: string; service: string; activity: string; surgeon: string; method: string; from: string; to: string; keyword: string };

const EMPTY: Filters = { status: '', service: '', activity: '', surgeon: '', method: '', from: '', to: '', keyword: '' };

const matchesFilters = (patient: Patient, filters: Filters) => {
  if (filters.status === 'operated') {
    if (!patient.actualSurgeryDate) return false;
  } else if (filters.status && patient.status !== filters.status) return false;
  if (filters.service && toSurgeryServiceCode(patient.surgeryService || patient.interventionType) !== filters.service) return false;
  if (filters.activity === 'surgery' && (isRfaProcedure(patient) || patient.activityType === 'Thủ thuật' || !patient.actualSurgeryDate)) return false;
  if (filters.activity === 'procedure' && !(isRfaProcedure(patient) || patient.activityType === 'Thủ thuật')) return false;
  if (filters.surgeon && patient.surgeon !== filters.surgeon) return false;
  if (filters.method && !fold(patient.surgeryMethod).includes(fold(filters.method))) return false;
  if (filters.from || filters.to) {
    const date = toDateKey(patient.actualSurgeryDate);
    if (!date) return false;
    if (filters.from && date < filters.from) return false;
    if (filters.to && date > filters.to) return false;
  }
  if (filters.keyword && !matchesQuery(filters.keyword, patient.name, patient.id, patient.diagnosis, patient.surgeryMethod, patient.surgeryService, patient.interventionType, patient.notes)) return false;
  return true;
};

export const SampleExplorer: React.FC<{ topic: ResearchTopic | null; onClose: () => void }> = ({ topic, onClose }) => {
  const { data: patients } = usePatients();
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [presetNote, setPresetNote] = useState('');

  useEffect(() => {
    if (!topic) return;
    const preset = presetForTopic(topic.topic);
    setFilters({ ...EMPTY, keyword: preset?.keyword || '' });
    setPresetNote(preset ? `Tự động lọc theo đề tài: ${preset.note}` : '');
  }, [topic]);

  const surgeons = useMemo(() => Array.from(new Set((patients || []).map(patient => patient.surgeon).filter(Boolean) as string[])).sort(), [patients]);
  const sample = useMemo(() => (patients || []).filter(patient => matchesFilters(patient, filters)), [patients, filters]);

  const analytics = useMemo(() => {
    const total = sample.length;
    const male = sample.filter(patient => patient.gender === 'Nam').length;
    const ages = sample.map(patient => Number(getAge(patient.dob))).filter(age => Number.isFinite(age) && age > 0);
    return {
      total,
      male,
      female: sample.filter(patient => patient.gender === 'Nữ').length,
      avgAge: ages.length ? (ages.reduce((sum, age) => sum + age, 0) / ages.length).toFixed(1) : '—',
      minAge: ages.length ? Math.min(...ages) : 0,
      maxAge: ages.length ? Math.max(...ages) : 0,
      operated: sample.filter(patient => patient.actualSurgeryDate).length,
    };
  }, [sample]);

  const exportSample = () => {
    if (!topic || !sample.length) return showToast('Không có bệnh nhân phù hợp để xuất', 'warning');
    exportToExcel({
      fileName: `So_lieu_NCKH_${fold(topic.topic).replace(/[^a-z0-9]+/g, '_').slice(0, 40)}`,
      sheetName: 'Số liệu mẫu NCKH',
      title: 'BẢNG SỐ LIỆU LÂM SÀNG NGHIÊN CỨU KHOA HỌC',
      subtitle: `Đề tài: ${topic.topic} · Chủ nhiệm: ${topic.author || '—'} · Cỡ mẫu N = ${sample.length}`,
      headers: ['STT', 'Mã BN', 'Họ và tên', 'Tuổi', 'Giới', 'SĐT', 'Chẩn đoán', 'Dịch vụ PT', 'Phương pháp', 'Loại PT', 'Ngày mổ', 'PTV', 'Phụ mổ 1', 'Gây mê', 'Ngày vào', 'Ngày ra', 'Ghi chú'],
      rows: sample.map((patient, index) => [
        index + 1,
        patient.id,
        patient.name,
        getAge(patient.dob),
        patient.gender || '',
        patient.phoneNumber || '',
        patient.diagnosis || '',
        getSurgeryServiceLabel(patient.surgeryService || patient.interventionType),
        patient.surgeryMethod || '',
        isRfaProcedure(patient) ? 'Thủ thuật' : getSurgeryClassificationLabel(patient.surgeryType || patient.surgeryClassification),
        fmtDate(patient.actualSurgeryDate, ''),
        patient.surgeon || '',
        patient.assistantSurgeon1 || '',
        patient.anesthetist || '',
        fmtDate(patient.admissionDate, ''),
        fmtDate(patient.dischargeDate, ''),
        patient.notes || '',
      ]),
      signers: ['NGƯỜI LẬP BẢNG', 'CHỦ NHIỆM ĐỀ TÀI', 'TRƯỞNG KHOA'],
    });
    showToast(`Đã xuất ${sample.length} bệnh nhân`, 'success');
  };

  const set = (key: keyof Filters, value: string) => setFilters(current => ({ ...current, [key]: value }));

  return (
    <Drawer
      open={Boolean(topic)}
      onClose={onClose}
      size="xl"
      title="Trích xuất mẫu nghiên cứu"
      subtitle={topic?.topic}
      footer={
        <>
          <span className="mr-auto text-xs text-muted">Dữ liệu lấy trực tiếp từ hồ sơ bệnh nhân của khoa</span>
          <Button variant="primary" icon={FileSpreadsheet} onClick={exportSample} disabled={!sample.length}>
            Xuất Excel ({sample.length})
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {presetNote && (
          <Callout tone="primary" icon={Sparkles}>
            {presetNote}
          </Callout>
        )}
        <div className="rounded-2xl border border-line p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-fg">
            <Filter className="h-4 w-4 text-primary" /> Tiêu chí chọn mẫu
            <Button size="xs" variant="ghost" icon={RotateCcw} className="ml-auto" onClick={() => setFilters(EMPTY)}>
              Xoá lọc
            </Button>
          </div>
          <FormGrid cols={4}>
            <Field label="Từ khoá (tên, chẩn đoán, PP mổ…)" className="sm:col-span-2">
              <Input value={filters.keyword} onChange={event => set('keyword', event.target.value)} />
            </Field>
            <Field label="Trạng thái">
              <Select
                value={filters.status}
                onChange={event => set('status', event.target.value)}
                placeholder="Tất cả"
                options={[{ value: 'operated', label: 'Đã phẫu thuật' }, ...Object.entries(PATIENT_STATUS).map(([value, meta]) => ({ value, label: meta.label }))]}
              />
            </Field>
            <Field label="Loại hoạt động">
              <Select
                value={filters.activity}
                onChange={event => set('activity', event.target.value)}
                placeholder="Tất cả"
                options={[
                  { value: 'surgery', label: 'Phẫu thuật' },
                  { value: 'procedure', label: 'Thủ thuật' },
                ]}
              />
            </Field>
            <Field label="Dịch vụ phẫu thuật">
              <Select value={filters.service} onChange={event => set('service', event.target.value)} placeholder="Tất cả" options={SURGERY_SERVICE_OPTIONS.map(option => ({ value: option.code, label: option.label }))} />
            </Field>
            <Field label="Phẫu thuật viên">
              <Select value={filters.surgeon} onChange={event => set('surgeon', event.target.value)} placeholder="Tất cả" options={surgeons} />
            </Field>
            <Field label="Mổ từ ngày">
              <Input type="date" value={filters.from} onChange={event => set('from', event.target.value)} />
            </Field>
            <Field label="Đến ngày">
              <Input type="date" value={filters.to} onChange={event => set('to', event.target.value)} />
            </Field>
            <Field label="Phương pháp chứa" className="sm:col-span-2">
              <Input value={filters.method} onChange={event => set('method', event.target.value)} placeholder="VD: cắt toàn bộ" />
            </Field>
          </FormGrid>
        </div>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Cỡ mẫu N" value={analytics.total} icon={Database} />
          <StatCard label="Nam / Nữ" value={`${analytics.male} / ${analytics.female}`} tone="info" hint={analytics.total ? `${Math.round((analytics.male / analytics.total) * 100)}% nam` : undefined} />
          <StatCard label="Tuổi trung bình" value={analytics.avgAge} tone="violet" hint={analytics.maxAge ? `Từ ${analytics.minAge} đến ${analytics.maxAge}` : undefined} />
          <StatCard label="Đã phẫu thuật" value={analytics.operated} tone="success" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="scrollbar-thin max-h-[420px] overflow-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="sticky top-0 bg-sunken text-xs text-muted">
                <tr>
                  {['#', 'Bệnh nhân', 'Tuổi/Giới', 'Chẩn đoán', 'Phương pháp', 'Ngày mổ'].map(header => (
                    <th key={header} className="border-b border-line px-3 py-2 text-left font-semibold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sample.slice(0, 200).map((patient, index) => (
                  <tr key={patient.id} className="border-b border-line/60">
                    <td className="num px-3 py-2 text-muted">{index + 1}</td>
                    <td className="px-3 py-2">
                      <p className="font-medium text-fg">{patient.name}</p>
                      <p className="font-mono text-xs text-muted">{patient.id}</p>
                    </td>
                    <td className="px-3 py-2 text-muted">
                      {getAge(patient.dob) || '—'} · {patient.gender}
                    </td>
                    <td className="max-w-[240px] px-3 py-2 text-xs text-muted">{patient.diagnosis}</td>
                    <td className="max-w-[220px] px-3 py-2 text-xs text-fg">
                      {patient.surgeryMethod || '—'}
                      {isRfaProcedure(patient) && <Badge tone="violet" className="ml-1">RFA</Badge>}
                    </td>
                    <td className="num whitespace-nowrap px-3 py-2 text-xs text-muted">{fmtDate(patient.actualSurgeryDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {sample.length === 0 && <p className="py-10 text-center text-sm text-muted">Không có bệnh nhân phù hợp tiêu chí.</p>}
          </div>
          {sample.length > 200 && <p className="border-t border-line px-3 py-2 text-center text-xs text-muted">Hiển thị 200/{sample.length} — xuất Excel để lấy đủ dữ liệu.</p>}
        </div>
      </div>
    </Drawer>
  );
};
