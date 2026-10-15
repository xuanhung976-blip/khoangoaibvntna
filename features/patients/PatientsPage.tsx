import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BedDouble,
  Edit3,
  FileSpreadsheet,
  LayoutGrid,
  List,
  LogOut,
  MoreHorizontal,
  Printer,
  RefreshCw,
  Scissors,
  Star,
  Stethoscope,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { Patient, VipPatient } from '../../types';
import { deletePatient, removeVipPatient } from '../../services/dataService';
import { useApp } from '../../context/AppContext';
import { KEYS, usePatients, useVipPatients } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { getAge, exportToExcel } from '../../utils/exportUtils';
import { isRfaProcedure, needsSurgeryClassification } from '../../utils/surgeryStats';
import { fmtDate, fmtDayMonth, fmtMonth, getVietnamMonthKey, parseCalendarDate, todayKey, toDateKey } from '../../lib/dates';
import { TOTAL_BEDS, roomKey, sortRooms, statusMeta, treatmentDays } from '../../lib/domain';
import { matchesQuery, shortName } from '../../lib/text';
import { printTable } from '../../lib/print';
import { cn } from '../../lib/cn';
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  Menu,
  Meter,
  PageHeader,
  RowActions,
  SearchInput,
  Segmented,
  Select,
  Tabs,
  Toolbar,
  confirmAction,
  showToast,
  type Column,
} from '../../components/ui';
import { ConfirmSurgeryDialog } from '../surgery/ConfirmSurgeryDialog';
import { VipDialog } from '../vip/VipDialog';
import { BedMap } from './BedMap';
import { DischargeDialog } from './DischargeDialog';
import { PatientDetail } from './PatientDetail';
import { PatientForm } from './PatientForm';
import { surgeryRecordLabel } from './patientLogic';

type StatusFilter = 'All' | 'CanPhanLoai' | Patient['status'];

const STATUS_TITLES: Record<string, string> = {
  All: 'ĐANG ĐIỀU TRỊ',
  ChoMo: 'CHỜ MỔ',
  DaDuyet: 'ĐÃ DUYỆT MỔ',
  DaMo: 'HẬU PHẪU',
  DieuTri: 'ĐIỀU TRỊ NỘI KHOA',
  CanPhanLoai: 'CẦN HOÀN THIỆN PHÂN LOẠI',
  RaVien: 'ĐÃ RA VIỆN',
};

export const PatientsPage: React.FC = () => {
  const { user } = useApp();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, validating, reload } = usePatients();
  const { data: vips } = useVipPatients();
  const { run } = useAction();

  const patients = data || [];
  const status = (params.get('status') as StatusFilter) || 'All';
  const view = params.get('view') === 'beds' ? 'beds' : 'list';
  const [search, setSearch] = useState(params.get('q') || '');
  const [room, setRoom] = useState('');
  const [doctor, setDoctor] = useState('');
  const [month, setMonth] = useState(params.get('month') || getVietnamMonthKey());

  const [formState, setFormState] = useState<{ open: boolean; patient?: Patient | null; section?: 'surgery' }>({ open: false });
  const [detailId, setDetailId] = useState<string | null>(params.get('id'));
  const [discharging, setDischarging] = useState<Patient | null>(null);
  const [confirming, setConfirming] = useState<Patient | null>(null);
  const [vipFor, setVipFor] = useState<Patient | null | undefined>(undefined);

  const vipByPatient = useMemo(() => {
    const map = new Map<string, VipPatient>();
    (vips || []).forEach(vip => map.set(String(vip.patientId).trim(), vip));
    return map;
  }, [vips]);

  const supportsIdentity = useMemo(() => patients.some(patient => 'cccd' in patient || 'bhytCode' in patient), [patients]);

  // Liên kết sâu: ?new=1 mở form tiếp nhận, ?id= mở chi tiết.
  useEffect(() => {
    if (params.get('new') === '1') {
      setFormState({ open: true, patient: null });
      const next = new URLSearchParams(params);
      next.delete('new');
      setParams(next, { replace: true });
    }
    const id = params.get('id');
    if (id) setDetailId(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params);
    if (value === null || value === '') next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const closeDetail = () => {
    setDetailId(null);
    if (params.get('id')) setParam('id', null);
  };

  const counts = useMemo(() => {
    const result: Record<string, number> = { All: 0, ChoMo: 0, DaDuyet: 0, DaMo: 0, DieuTri: 0, RaVien: 0, CanPhanLoai: 0 };
    patients.forEach(patient => {
      if (patient.status !== 'RaVien') result.All++;
      result[patient.status] = (result[patient.status] || 0) + 1;
      if (needsSurgeryClassification(patient) && (month === 'all' || parseCalendarDate(patient.actualSurgeryDate)?.monthKey === month)) result.CanPhanLoai++;
    });
    return result;
  }, [patients, month]);

  const scoped = useMemo(() => {
    if (status === 'CanPhanLoai')
      return patients.filter(patient => needsSurgeryClassification(patient) && (month === 'all' || parseCalendarDate(patient.actualSurgeryDate)?.monthKey === month));
    if (status === 'All') return patients.filter(patient => patient.status !== 'RaVien');
    return patients.filter(patient => patient.status === status);
  }, [patients, status, month]);

  const rooms = useMemo(() => sortRooms(Array.from(new Set(scoped.map(patient => roomKey(patient.room)).filter(Boolean)))), [scoped]);
  const doctors = useMemo(() => Array.from(new Set(scoped.map(patient => patient.treatingDoctor).filter(Boolean) as string[])).sort(), [scoped]);

  const rows = useMemo(() => {
    const filtered = scoped.filter(
      patient =>
        (!room || roomKey(patient.room) === room) &&
        (!doctor || patient.treatingDoctor === doctor) &&
        matchesQuery(search, patient.name, patient.id, patient.diagnosis, patient.phoneNumber, patient.treatingDoctor),
    );
    return filtered.sort((a, b) => {
      const vipA = vipByPatient.has(a.id) ? 1 : 0;
      const vipB = vipByPatient.has(b.id) ? 1 : 0;
      if (vipA !== vipB) return vipB - vipA;
      const dateA = status === 'RaVien' ? toDateKey(a.dischargeDate) : toDateKey(a.admissionDate);
      const dateB = status === 'RaVien' ? toDateKey(b.dischargeDate) : toDateKey(b.admissionDate);
      return dateB.localeCompare(dateA);
    });
  }, [scoped, room, doctor, search, vipByPatient, status]);

  const detail = detailId ? patients.find(patient => patient.id === detailId) || null : null;
  const active = counts.All;
  const freeBeds = Math.max(0, TOTAL_BEDS - active);

  const handleDelete = async (patient: Patient) => {
    const ok = await confirmAction({
      title: `Xoá hồ sơ ${patient.name}?`,
      message: 'Hồ sơ sẽ bị xoá vĩnh viễn khỏi hệ thống và không thể khôi phục.',
      confirmText: 'Xoá hồ sơ',
    });
    if (!ok) return;
    const result = await run('delete', () => deletePatient(patient.id), { success: 'Đã xoá hồ sơ', invalidate: [KEYS.patients, KEYS.vip] });
    if (result !== undefined) closeDetail();
  };

  const handleRemoveVip = async (vip: VipPatient) => {
    const ok = await confirmAction({ title: 'Bỏ đánh dấu cần lưu ý?', confirmText: 'Bỏ lưu ý', tone: 'primary' });
    if (!ok) return;
    await run('remove-vip', () => removeVipPatient(vip.id), { success: 'Đã bỏ lưu ý', invalidate: [KEYS.vip] });
  };

  const titleText = status === 'CanPhanLoai' ? `${STATUS_TITLES.CanPhanLoai}${month !== 'all' ? ` ${fmtMonth(month).toUpperCase()}` : ''}` : STATUS_TITLES[status] || '';

  const exportExcel = () => {
    if (!rows.length) return showToast('Không có dữ liệu để xuất', 'warning');
    exportToExcel({
      fileName: `Danh_sach_benh_nhan_${status}_${todayKey()}.xlsx`,
      sheetName: 'DS bệnh nhân',
      title: `DANH SÁCH BỆNH NHÂN ${titleText}`,
      subtitle: `Ngày xuất: ${fmtDate(todayKey())} · Tổng số: ${rows.length} bệnh nhân`,
      headers: ['STT', 'Mã BN', 'Họ và tên', 'Tuổi', 'GT', 'Buồng / giường', 'Ngày vào', 'Chẩn đoán', 'BS điều trị', 'Hồ sơ PT/TT', 'SĐT', 'Ghi chú'],
      rows: rows.map((patient, index) => [
        index + 1,
        patient.id,
        patient.name,
        getAge(patient.dob),
        patient.gender || '',
        `${patient.room || '-'}${patient.bed ? ` / ${patient.bed}` : ''}`,
        fmtDate(patient.admissionDate, ''),
        patient.diagnosis || '',
        shortName(patient.treatingDoctor) || '',
        surgeryRecordLabel(patient),
        patient.phoneNumber || '',
        patient.notes || '',
      ]),
      signers: ['NGƯỜI LẬP BIỂU'],
      creatorName: user.fullName,
    });
    showToast('Đã xuất file Excel', 'success');
  };

  const print = () => {
    if (!rows.length) return showToast('Không có dữ liệu để in', 'warning');
    const ok = printTable({
      title: `Danh sách bệnh nhân ${titleText.toLowerCase()}`,
      subtitle: `Ngày in ${fmtDate(todayKey())} · Tổng số ${rows.length} bệnh nhân`,
      columns: [
        { label: 'STT', width: '4%', align: 'center' },
        { label: 'Mã BN', width: '9%', align: 'center' },
        { label: 'Họ và tên', width: '17%' },
        { label: 'Tuổi', width: '5%', align: 'center' },
        { label: 'GT', width: '5%', align: 'center' },
        { label: 'Buồng/Giường', width: '9%', align: 'center' },
        { label: 'Chẩn đoán', width: '27%' },
        { label: 'BS điều trị', width: '13%' },
        { label: 'SĐT', width: '11%', align: 'center' },
      ],
      rows: rows.map((patient, index) => [
        index + 1,
        patient.id,
        patient.name,
        getAge(patient.dob),
        patient.gender,
        `${patient.room || '-'}${patient.bed ? ` / ${patient.bed}` : ''}`,
        patient.diagnosis,
        shortName(patient.treatingDoctor),
        patient.phoneNumber || '',
      ]),
      signers: ['NGƯỜI LẬP BIỂU'],
      signerName: user.fullName,
    });
    if (!ok) showToast('Trình duyệt chặn cửa sổ in — hãy cho phép popup', 'error');
  };

  const recordBadge = (patient: Patient) => {
    if (needsSurgeryClassification(patient))
      return (
        <button
          onClick={event => {
            event.stopPropagation();
            setFormState({ open: true, patient, section: 'surgery' });
          }}
          className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-500/25 dark:text-amber-300"
          title="Bổ sung loại phẫu thuật"
        >
          <AlertTriangle className="h-3 w-3" /> Cần phân loại
        </button>
      );
    if (isRfaProcedure(patient) && patient.actualSurgeryDate) return <Badge tone="violet">RFA</Badge>;
    const label = surgeryRecordLabel(patient);
    if (label && patient.actualSurgeryDate) return <Badge tone={label === 'Thủ thuật khác' ? 'neutral' : 'success'}>{label}</Badge>;
    return <span className="text-faint">—</span>;
  };

  const columns: Column<Patient>[] = [
    {
      key: 'patient',
      header: 'Bệnh nhân',
      sort: patient => patient.name,
      cell: patient => {
        const age = getAge(patient.dob);
        return (
          <div className="min-w-[180px]">
            <div className="flex items-center gap-1.5">
              <span className="font-medium text-fg group-hover:text-primary">{patient.name}</span>
              {vipByPatient.has(patient.id) && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
            </div>
            <div className="text-xs text-muted">
              <span className="font-mono">{patient.id}</span>
              {age !== '' && ` · ${age}t`}
              {patient.gender && ` · ${patient.gender}`}
            </div>
          </div>
        );
      },
    },
    {
      key: 'room',
      header: 'Buồng',
      sort: patient => `${roomKey(patient.room).padStart(6, '0')}-${String(patient.bed || '').padStart(4, '0')}`,
      cell: patient =>
        patient.room ? (
          <span className="whitespace-nowrap text-sm">
            <span className="font-medium text-fg">{patient.room}</span>
            {patient.bed && <span className="text-muted"> / {patient.bed}</span>}
          </span>
        ) : (
          <span className="text-faint">—</span>
        ),
    },
    {
      key: 'days',
      header: status === 'RaVien' ? 'Ra viện' : 'Ngày ĐT',
      align: 'center',
      sort: patient => (status === 'RaVien' ? toDateKey(patient.dischargeDate) : treatmentDays(patient) ?? -1),
      cell: patient => {
        if (status === 'RaVien') return <span className="num whitespace-nowrap text-muted">{fmtDayMonth(patient.dischargeDate)}</span>;
        const days = treatmentDays(patient);
        return (
          <span className="flex flex-col items-center leading-tight">
            <span className={cn('num font-semibold', days !== null && days > 14 ? 'text-amber-600' : 'text-fg')}>{days ?? '—'}</span>
            <span className="num text-[11px] text-faint">{fmtDayMonth(patient.admissionDate)}</span>
          </span>
        );
      },
    },
    {
      key: 'diagnosis',
      header: 'Chẩn đoán',
      hideBelow: 'md',
      cell: patient => (
        <p className="line-clamp-2 max-w-[300px] text-[13px] text-muted" title={patient.diagnosis}>
          {patient.diagnosis}
        </p>
      ),
    },
    {
      key: 'doctor',
      header: 'BS điều trị',
      hideBelow: 'xl',
      sort: patient => patient.treatingDoctor || '',
      cell: patient => <span className="whitespace-nowrap text-[13px] text-muted">{shortName(patient.treatingDoctor) || '—'}</span>,
    },
    { key: 'record', header: 'Hồ sơ PT', hideBelow: 'lg', cell: recordBadge },
    {
      key: 'status',
      header: 'Trạng thái',
      sort: patient => patient.status,
      cell: patient => {
        const meta = statusMeta(patient.status);
        return (
          <Badge tone={meta.tone} dot>
            {meta.short}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: patient => (
        <RowActions>
          <Button size="sm" variant="ghost" iconOnly icon={Edit3} title="Sửa hồ sơ" aria-label="Sửa hồ sơ" onClick={() => setFormState({ open: true, patient })} />
          <Menu
            trigger={({ toggle }) => <Button size="sm" variant="ghost" iconOnly icon={MoreHorizontal} onClick={toggle} aria-label="Thao tác khác" />}
            items={[
              ...(patient.status === 'DaDuyet' ? [{ label: 'Xác nhận đã mổ', icon: Scissors, onSelect: () => setConfirming(patient) }] : []),
              ...(patient.status !== 'RaVien' ? [{ label: 'Cho ra viện', icon: LogOut, onSelect: () => setDischarging(patient) }] : []),
              ...(patient.status !== 'RaVien' && !vipByPatient.has(patient.id) ? [{ label: 'Đánh dấu cần lưu ý', icon: Star, onSelect: () => setVipFor(patient) }] : []),
              'divider' as const,
              { label: 'Xoá hồ sơ', icon: Trash2, danger: true, onSelect: () => handleDelete(patient) },
            ]}
          />
        </RowActions>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bệnh nhân"
        icon={Stethoscope}
        description={loading ? 'Đang tải danh sách…' : `${active} đang điều trị · ${counts.ChoMo} chờ mổ · ${counts.DaMo} hậu phẫu`}
        actions={
          <>
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={() => reload()} title="Làm mới" aria-label="Làm mới" />
            <Button icon={FileSpreadsheet} onClick={exportExcel} className="hidden sm:inline-flex">
              Excel
            </Button>
            <Button icon={Printer} onClick={print} className="hidden sm:inline-flex">
              In
            </Button>
            <Button variant="primary" icon={UserPlus} onClick={() => setFormState({ open: true, patient: null })}>
              Tiếp nhận
            </Button>
          </>
        }
      />

      {view !== 'beds' && (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card className="col-span-2 flex items-center gap-4 p-4 lg:col-span-1">
          <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', freeBeds <= 2 ? 'bg-rose-500/10 text-rose-600' : 'bg-primary-soft text-primary')}>
            <BedDouble className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between">
              <span className="text-[13px] text-muted">Công suất giường</span>
              <span className="num text-sm font-semibold text-fg">
                {active}/{TOTAL_BEDS}
              </span>
            </div>
            <Meter className="mt-2" value={active} max={TOTAL_BEDS} />
            <p className="mt-1 text-xs text-muted">Còn trống {freeBeds} giường</p>
          </div>
        </Card>
        {[
          { label: 'Chờ mổ', value: counts.ChoMo, filter: 'ChoMo', tone: 'text-amber-600 dark:text-amber-400' },
          { label: 'Hậu phẫu', value: counts.DaMo, filter: 'DaMo', tone: 'text-violet-600 dark:text-violet-400' },
          { label: 'Cần phân loại', value: counts.CanPhanLoai, filter: 'CanPhanLoai', tone: counts.CanPhanLoai ? 'text-rose-600 dark:text-rose-400' : 'text-fg' },
        ].map(item => (
          <button key={item.label} onClick={() => setParam('status', item.filter)} className="card p-4 text-left transition-colors hover:border-primary/30">
            <p className="text-[13px] text-muted">{item.label}</p>
            <p className={cn('num mt-1 text-2xl font-semibold', item.tone)}>{item.value}</p>
          </button>
        ))}
      </div>
      )}

      <Card className="overflow-hidden">
        <div className="px-3 pt-1 sm:px-4">
          <Tabs<StatusFilter>
            value={status}
            onChange={value => setParam('status', value === 'All' ? null : value)}
            items={[
              { value: 'All', label: 'Đang điều trị', count: counts.All },
              { value: 'ChoMo', label: 'Chờ mổ', count: counts.ChoMo },
              { value: 'DaDuyet', label: 'Đã duyệt', count: counts.DaDuyet },
              { value: 'DaMo', label: 'Hậu phẫu', count: counts.DaMo },
              { value: 'DieuTri', label: 'Nội khoa', count: counts.DieuTri },
              { value: 'CanPhanLoai', label: 'Cần phân loại', count: counts.CanPhanLoai, countTone: 'danger' },
              { value: 'RaVien', label: 'Ra viện', count: counts.RaVien },
            ]}
          />
        </div>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, mã BN, chẩn đoán, SĐT…" className="sm:w-80" />
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <Select value={room} onChange={event => setRoom(event.target.value)} className="h-9 sm:w-36" placeholder="Mọi buồng" options={rooms.map(value => ({ value, label: `Buồng ${value}` }))} />
            <Select value={doctor} onChange={event => setDoctor(event.target.value)} className="h-9 sm:w-48" placeholder="Mọi bác sĩ" options={doctors.map(value => ({ value, label: shortName(value) }))} />
          </div>
          {status === 'CanPhanLoai' && (
            <div className="flex items-center gap-2">
              <Input type="month" value={month === 'all' ? '' : month} onChange={event => setMonth(event.target.value || 'all')} className="h-9 w-40" />
              <Button size="sm" variant={month === 'all' ? 'soft' : 'ghost'} onClick={() => setMonth('all')}>
                Mọi tháng
              </Button>
            </div>
          )}
          <div className="flex items-center gap-2 sm:ml-auto">
            {(room || doctor || search) && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setRoom('');
                  setDoctor('');
                  setSearch('');
                }}
              >
                Xoá lọc
              </Button>
            )}
            {status !== 'RaVien' && status !== 'CanPhanLoai' && (
              <Segmented
                size="sm"
                value={view}
                onChange={value => setParam('view', value === 'beds' ? 'beds' : null)}
                items={[
                  { value: 'list', label: 'Danh sách', icon: List },
                  { value: 'beds', label: 'Sơ đồ giường', icon: LayoutGrid },
                ]}
              />
            )}
          </div>
        </Toolbar>

        {error && !data ? (
          <ErrorState error={error} onRetry={() => reload()} />
        ) : view === 'beds' && status !== 'RaVien' && status !== 'CanPhanLoai' ? (
          <BedMap patients={rows} vipIds={new Set(vipByPatient.keys())} onOpen={patient => setDetailId(patient.id)} />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={patient => patient.id}
            loading={loading}
            resetKey={`${status}-${search}-${room}-${doctor}`}
            onRowClick={patient => setDetailId(patient.id)}
            rowClassName={patient => (vipByPatient.has(patient.id) ? 'bg-amber-500/[0.04]' : undefined)}
            empty={
              <EmptyState
                icon={Stethoscope}
                title={search || room || doctor ? 'Không có bệnh nhân phù hợp bộ lọc' : 'Chưa có bệnh nhân trong mục này'}
                action={
                  status === 'All' && !search ? (
                    <Button variant="primary" icon={UserPlus} onClick={() => setFormState({ open: true, patient: null })}>
                      Tiếp nhận bệnh nhân
                    </Button>
                  ) : undefined
                }
              />
            }
            mobileCard={patient => {
              const meta = statusMeta(patient.status);
              const days = treatmentDays(patient);
              return (
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-medium text-fg">{patient.name}</span>
                      {vipByPatient.has(patient.id) && <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" />}
                    </div>
                    <p className="text-xs text-muted">
                      <span className="font-mono">{patient.id}</span>
                      {patient.room && ` · P.${patient.room}${patient.bed ? `/${patient.bed}` : ''}`}
                      {days !== null && status !== 'RaVien' && ` · N${days}`}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-muted">{patient.diagnosis}</p>
                    {needsSurgeryClassification(patient) && <div className="mt-1">{recordBadge(patient)}</div>}
                  </div>
                  <Badge tone={meta.tone}>{meta.short}</Badge>
                </div>
              );
            }}
          />
        )}
      </Card>

      <PatientForm
        open={formState.open}
        patient={formState.patient}
        focusSection={formState.section}
        patients={patients}
        user={user}
        supportsIdentity={supportsIdentity}
        onClose={() => setFormState({ open: false })}
        onSaved={saved => {
          setFormState({ open: false });
          setDetailId(saved.id);
        }}
      />

      {detail && !formState.open && (
        <PatientDetail
          patient={detail}
          vip={vipByPatient.get(detail.id)}
          onClose={closeDetail}
          onEdit={(patient, section) => setFormState({ open: true, patient, section })}
          onDischarge={setDischarging}
          onConfirmSurgery={setConfirming}
          onAddVip={patient => setVipFor(patient)}
          onRemoveVip={handleRemoveVip}
          onDelete={handleDelete}
        />
      )}

      <DischargeDialog patient={discharging} onClose={() => setDischarging(null)} />
      <ConfirmSurgeryDialog patient={confirming} onClose={() => setConfirming(null)} />
      <VipDialog open={vipFor !== undefined} patient={vipFor} onClose={() => setVipFor(undefined)} />
    </div>
  );
};
