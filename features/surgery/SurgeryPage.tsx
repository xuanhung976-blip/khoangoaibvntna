import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Activity,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Edit3,
  FileSpreadsheet,
  MoreHorizontal,
  PenLine,
  Printer,
  RefreshCw,
  Scissors,
  Undo2,
} from 'lucide-react';
import type { Patient } from '../../types';
import { updatePatient } from '../../services/dataService';
import { KEYS, usePatients } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { getAge, exportToExcel } from '../../utils/exportUtils';
import { getSurgeryServiceLabel } from '../../utils/surgeryStats';
import { addDays, fmtDate, relativeDay, startOfWeek, todayKey, toDateKey, weekdayLong } from '../../lib/dates';
import { treatmentDays } from '../../lib/domain';
import { matchesQuery, shortName } from '../../lib/text';
import { printTable } from '../../lib/print';
import { cn } from '../../lib/cn';
import {
  Badge,
  Button,
  Card,
  DragHandle,
  SortableList,
  DataTable,
  EmptyState,
  ErrorState,
  Input,
  Menu,
  PageHeader,
  RowActions,
  SearchInput,
  Segmented,
  SkeletonRows,
  Tabs,
  Toolbar,
  confirmAction,
  showToast,
  type Column,
} from '../../components/ui';
import { ApprovalDrawer } from './ApprovalDrawer';
import { ConfirmSurgeryDialog } from './ConfirmSurgeryDialog';
import { byOrder, moveId } from './scheduleOrder';
import { useScheduleOrder } from './useScheduleOrder';

type Tab = 'pending' | 'schedule';
type Range = 'today' | 'tomorrow' | 'week' | 'past' | 'all' | 'date';


export const SurgeryPage: React.FC = () => {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, validating, reload } = usePatients();
  const { run } = useAction();
  const patients = data || [];
  const today = todayKey();

  const tab: Tab = params.get('tab') === 'schedule' ? 'schedule' : 'pending';
  const dateParam = params.get('date') || '';
  const range: Range =
    dateParam === 'past' ? 'past' : dateParam === 'all' ? 'all' : dateParam === 'week' ? 'week' : dateParam === today ? 'today' : dateParam === addDays(today, 1) ? 'tomorrow' : dateParam ? 'date' : 'all';
  const [search, setSearch] = useState('');
  const [approving, setApproving] = useState<Patient | null>(null);
  const [confirming, setConfirming] = useState<Patient | null>(null);

  const setParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setParams(next, { replace: true });
  };

  // ?approve=<id> mở ngay form duyệt mổ (từ trang bệnh nhân / bảng điều hành).
  useEffect(() => {
    const id = params.get('approve');
    if (!id || !patients.length) return;
    const target = patients.find(patient => patient.id === id);
    if (target) setApproving(target);
    setParam({ approve: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, patients.length]);

  const pending = useMemo(
    () =>
      patients
        .filter(patient => patient.status === 'ChoMo' && matchesQuery(search, patient.name, patient.id, patient.diagnosis))
        .sort((a, b) => toDateKey(a.admissionDate).localeCompare(toDateKey(b.admissionDate))),
    [patients, search],
  );

  const approvedAll = useMemo(() => patients.filter(patient => patient.status === 'DaDuyet'), [patients]);
  const pastCount = approvedAll.filter(patient => {
    const key = toDateKey(patient.surgeryDate);
    return key !== '' && key < today;
  }).length;

  const scheduleGroups = useMemo(() => {
    const weekStart = startOfWeek(today);
    const weekEnd = addDays(weekStart, 6);
    const inRange = (key: string) => {
      if (range === 'all') return true;
      if (range === 'past') return key !== '' && key < today;
      if (range === 'week') return key >= weekStart && key <= weekEnd;
      return key === dateParam;
    };
    const filtered = approvedAll.filter(patient => inRange(toDateKey(patient.surgeryDate)) && matchesQuery(search, patient.name, patient.id, patient.diagnosis, patient.surgeon));
    const map = new Map<string, Patient[]>();
    filtered.forEach(patient => {
      const key = toDateKey(patient.surgeryDate) || 'none';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(patient);
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => (a === 'none' ? 1 : b === 'none' ? -1 : a.localeCompare(b)))
      .map(([date, items]) => ({ date, items: items.sort(byOrder) }));
  }, [approvedAll, range, dateParam, search, today]);

  const { applyOrder, dayIds, savingDates } = useScheduleOrder(approvedAll);

  /** Chuyển ca `patient` tới vị trí `toIndex` (0-based) trong lịch của ngày đó. */
  const moveTo = (patient: Patient, toIndex: number) => {
    const date = toDateKey(patient.surgeryDate);
    if (!date) return showToast('Ca này chưa có ngày mổ', 'warning');
    const ids = moveId(dayIds(date), patient.id, toIndex);
    if (ids.indexOf(patient.id) === dayIds(date).indexOf(patient.id)) return;
    applyOrder(date, ids, `${patient.name} → Ca ${ids.indexOf(patient.id) + 1}`);
  };

  /** Lịch có thứ tự ca trùng / nhảy cóc (dữ liệu cũ) ⇒ cần đánh số lại 1..n. */
  const needsRenumber = (items: Patient[]) => items.some((item, index) => Number(item.surgeryOrder) !== index + 1);

  const renumber = (date: string) => applyOrder(date, dayIds(date), `Đã đánh số lại các ca ngày ${fmtDate(date)}`);

  const unapprove = async (patient: Patient) => {
    const ok = await confirmAction({
      title: `Huỷ duyệt mổ cho ${patient.name}?`,
      message: 'Bệnh nhân sẽ quay lại danh sách chờ duyệt. Thông tin ê-kíp vẫn được giữ để duyệt lại nhanh.',
      confirmText: 'Huỷ duyệt',
    });
    if (!ok) return;
    await run('unapprove', () => updatePatient(patient.id, { status: 'ChoMo' }), { success: 'Đã chuyển về chờ duyệt', invalidate: [KEYS.patients] });
  };

  const dayRows = (date: string) => approvedAll.filter(patient => toDateKey(patient.surgeryDate) === date).sort(byOrder);

  const exportDay = (date: string) => {
    const list = dayRows(date);
    if (!list.length) return showToast(`Không có ca mổ ngày ${fmtDate(date)}`, 'info');
    exportToExcel({
      fileName: `Lich_phau_thuat_${date}.xlsx`,
      sheetName: 'Lịch phẫu thuật',
      title: 'DANH SÁCH PHẪU THUẬT TRONG NGÀY',
      subtitle: `${weekdayLong(date)}, ngày ${fmtDate(date)} · Tổng số ${list.length} ca`,
      headers: ['Ca', 'Họ tên BN / Tuổi / GT', 'Mã BN', 'Chẩn đoán', 'Phương pháp phẫu thuật', 'PTV chính', 'Phụ mổ', 'Gây mê / Phụ mê', 'ĐD dụng cụ', 'Ghi chú'],
      rows: list.map((patient, index) => [
        `Ca ${index + 1}`,
        `${patient.name} (${getAge(patient.dob) || '?'}T - ${patient.gender || ''})`,
        patient.id,
        patient.diagnosis || '',
        patient.surgeryMethod || '',
        patient.surgeon || '',
        [patient.assistantSurgeon1, patient.assistantSurgeon2, patient.assistantSurgeon3].filter(Boolean).join(', '),
        [patient.anesthetist, patient.anesthetistAssistant && `Phụ: ${patient.anesthetistAssistant}`].filter(Boolean).join(' - '),
        patient.scrubNurse || '',
        patient.approvalNote || '',
      ]),
      signers: ['PHỤ TRÁCH PHÒNG MỔ', 'LÃNH ĐẠO KHOA'],
    });
    showToast('Đã xuất lịch mổ', 'success');
  };

  const printDay = (date: string) => {
    const list = dayRows(date);
    if (!list.length) return showToast(`Không có ca mổ ngày ${fmtDate(date)}`, 'info');
    const ok = printTable({
      title: 'Danh sách phẫu thuật trong ngày',
      subtitle: `${weekdayLong(date)}, ngày ${fmtDate(date)} · Tổng số ${list.length} ca`,
      columns: [
        { label: 'Ca', width: '5%', align: 'center' },
        { label: 'Họ tên / Tuổi', width: '16%' },
        { label: 'Mã BN', width: '8%', align: 'center' },
        { label: 'Chẩn đoán', width: '19%' },
        { label: 'Phương pháp PT', width: '17%' },
        { label: 'PTV chính', width: '10%' },
        { label: 'Phụ mổ', width: '10%' },
        { label: 'Gây mê / Phụ mê', width: '10%' },
        { label: 'ĐD dụng cụ', width: '8%' },
      ],
      rows: list.map((patient, index) => [
        `Ca ${index + 1}`,
        `${patient.name} (${getAge(patient.dob) || '?'}T, ${patient.gender || ''})`,
        patient.id,
        patient.diagnosis,
        patient.surgeryMethod,
        patient.surgeon,
        [patient.assistantSurgeon1, patient.assistantSurgeon2, patient.assistantSurgeon3].filter(Boolean).join(', '),
        [patient.anesthetist, patient.anesthetistAssistant].filter(Boolean).join(' / '),
        patient.scrubNurse,
      ]),
      signers: ['PHỤ TRÁCH PHÒNG MỔ', 'LÃNH ĐẠO KHOA'],
    });
    if (!ok) showToast('Trình duyệt chặn cửa sổ in — hãy cho phép popup', 'error');
  };

  const pendingColumns: Column<Patient>[] = [
    {
      key: 'name',
      header: 'Bệnh nhân',
      sort: patient => patient.name,
      cell: patient => (
        <div>
          <p className="font-medium text-fg">{patient.name}</p>
          <p className="text-xs text-muted">
            <span className="font-mono">{patient.id}</span> · {getAge(patient.dob) || '?'}t · {patient.gender}
            {patient.room && ` · P.${patient.room}`}
          </p>
        </div>
      ),
    },
    { key: 'diagnosis', header: 'Chẩn đoán', hideBelow: 'md', cell: patient => <p className="line-clamp-2 max-w-sm text-[13px] text-muted">{patient.diagnosis}</p> },
    {
      key: 'wait',
      header: 'Chờ',
      align: 'center',
      sort: patient => treatmentDays(patient) ?? 0,
      cell: patient => {
        const days = treatmentDays(patient) ?? 0;
        return <Badge tone={days >= 7 ? 'danger' : days >= 3 ? 'warning' : 'neutral'}>{days} ngày</Badge>;
      },
    },
    { key: 'doctor', header: 'BS điều trị', hideBelow: 'lg', cell: patient => <span className="text-[13px] text-muted">{shortName(patient.treatingDoctor) || '—'}</span> },
    {
      key: 'action',
      header: '',
      align: 'right',
      cell: patient => (
        <div onClick={event => event.stopPropagation()}>
          <Button size="sm" variant="primary" icon={PenLine} onClick={() => setApproving(patient)}>
            Duyệt
          </Button>
        </div>
      ),
    },
  ];

  const rangeLabel = (date: string) => {
    if (date === 'none') return 'Chưa có ngày mổ';
    const relative = relativeDay(date);
    return `${weekdayLong(date)}, ${fmtDate(date)}${['Hôm nay', 'Ngày mai', 'Hôm qua'].includes(relative) ? ` · ${relative}` : ''}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Duyệt & lịch mổ"
        icon={Activity}
        description="Duyệt mổ, phân công ê-kíp, xếp thứ tự ca và xác nhận sau mổ"
        actions={
          <>
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={() => reload()} aria-label="Làm mới" />
            <Button icon={Printer} onClick={() => printDay(range === 'tomorrow' ? addDays(today, 1) : range === 'date' ? dateParam : today)}>
              In lịch {range === 'tomorrow' ? 'ngày mai' : range === 'date' ? fmtDate(dateParam).slice(0, 5) : 'hôm nay'}
            </Button>
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="px-3 pt-1 sm:px-4">
          <Tabs<Tab>
            value={tab}
            onChange={value => setParam({ tab: value === 'pending' ? null : value })}
            items={[
              { value: 'pending', label: 'Chờ duyệt', icon: Clock, count: patients.filter(patient => patient.status === 'ChoMo').length, countTone: 'warning' },
              { value: 'schedule', label: 'Lịch mổ', icon: CalendarDays, count: approvedAll.length },
            ]}
          />
        </div>
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder={tab === 'pending' ? 'Tìm bệnh nhân chờ duyệt…' : 'Tìm bệnh nhân, PTV…'} className="sm:w-72" />
          {tab === 'schedule' && (
            <div className="flex flex-wrap items-center gap-2">
              <Segmented<Range>
                size="sm"
                value={range}
                onChange={value =>
                  setParam({
                    date: value === 'today' ? today : value === 'tomorrow' ? addDays(today, 1) : value === 'all' ? null : value === 'date' ? dateParam || today : value,
                  })
                }
                items={[
                  { value: 'all', label: 'Tất cả' },
                  { value: 'today', label: 'Hôm nay' },
                  { value: 'tomorrow', label: 'Ngày mai' },
                  { value: 'week', label: 'Tuần này' },
                  ...(pastCount ? [{ value: 'past' as Range, label: 'Quá ngày', count: pastCount }] : []),
                ]}
              />
              <Input type="date" value={range === 'date' || range === 'today' || range === 'tomorrow' ? dateParam : ''} onChange={event => setParam({ date: event.target.value || null })} className="h-8 w-40 text-[13px]" />
            </div>
          )}
        </Toolbar>

        {error && !data ? (
          <ErrorState error={error} onRetry={() => reload()} />
        ) : tab === 'pending' ? (
          <DataTable
            rows={pending}
            columns={pendingColumns}
            rowKey={patient => patient.id}
            loading={loading}
            onRowClick={patient => setApproving(patient)}
            empty={<EmptyState icon={ClipboardCheck} title={search ? 'Không tìm thấy bệnh nhân' : 'Không có bệnh nhân chờ duyệt mổ'} description="Bệnh nhân mới tiếp nhận ở trạng thái Chờ mổ sẽ xuất hiện tại đây." />}
            mobileCard={patient => {
              const days = treatmentDays(patient) ?? 0;
              return (
                <div className="flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-fg">{patient.name}</p>
                    <p className="line-clamp-1 text-xs text-muted">{patient.diagnosis}</p>
                  </div>
                  <Badge tone={days >= 7 ? 'danger' : days >= 3 ? 'warning' : 'neutral'}>{days} ngày</Badge>
                </div>
              );
            }}
          />
        ) : loading ? (
          <SkeletonRows />
        ) : scheduleGroups.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="Không có ca mổ nào trong khoảng này"
            action={
              <Button variant="soft" onClick={() => setParam({ tab: null })}>
                Xem bệnh nhân chờ duyệt
              </Button>
            }
          />
        ) : (
          <div className="divide-y divide-line">
            {scheduleGroups.map(group => (
              <section key={group.date}>
                <div className={cn('flex flex-wrap items-center gap-2 px-4 py-2.5', group.date !== 'none' && group.date < today ? 'bg-amber-500/[0.06]' : 'bg-sunken/60')}>
                  <CalendarDays className="h-4 w-4 text-muted" />
                  <p className="text-sm font-semibold text-fg">{rangeLabel(group.date)}</p>
                  <Badge tone={group.date === today ? 'primary' : 'neutral'}>{group.items.length} ca</Badge>
                  {savingDates.includes(group.date) && <span className="text-xs text-muted">Đang lưu thứ tự…</span>}
                  {group.date !== 'none' && group.date < today && <Badge tone="warning">Quá ngày — cần xác nhận</Badge>}
                  {group.date !== 'none' && group.date >= today && needsRenumber(group.items) && (
                    <button onClick={() => renumber(group.date)} className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-700 hover:bg-amber-500/25 dark:text-amber-300" title="Thứ tự ca đang trùng hoặc nhảy số — bấm để đánh số lại 1, 2, 3…">
                      Thứ tự ca bị trùng · Đánh số lại
                    </button>
                  )}
                  {group.date !== 'none' && (
                    <div className="ml-auto flex gap-1">
                      <Button size="xs" variant="ghost" icon={FileSpreadsheet} onClick={() => exportDay(group.date)}>
                        Excel
                      </Button>
                      <Button size="xs" variant="ghost" icon={Printer} onClick={() => printDay(group.date)}>
                        In
                      </Button>
                    </div>
                  )}
                </div>
                <SortableList
                  items={group.items}
                  getKey={patient => patient.id}
                  disabled={group.date === 'none' || Boolean(search)}
                  onReorder={(from, to) => moveTo(group.items[from], dayIds(group.date).indexOf(group.items[to].id))}
                  renderItem={(patient, index, handle, dragging) => (
                    <div className={cn('group flex flex-col gap-3 border-t border-line/70 px-4 py-3 sm:flex-row sm:items-center', params.get('focus') === patient.id && 'bg-primary-soft/50', dragging && 'border-transparent')}>
                      <div className="flex items-center gap-2 sm:w-[38%]">
                        <DragHandle {...handle} />
                        <Menu
                          align="left"
                          width="w-40"
                          up={group.items.length > 3 && index >= group.items.length - 2}
                          trigger={({ toggle }) => (
                            <button
                              onClick={toggle}
                              disabled={group.date === 'none'}
                              className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-sm font-semibold text-violet-700 transition-colors hover:bg-violet-500/20 dark:text-violet-300"
                              title="Bấm để chọn nhanh vị trí ca"
                            >
                              {index + 1}
                            </button>
                          )}
                          header={<p className="px-2.5 pb-1 pt-1.5 text-xs font-medium text-muted">Chuyển tới…</p>}
                          items={group.items.map((_, position) => ({
                            label: `Ca ${position + 1}${position === index ? ' (hiện tại)' : ''}`,
                            disabled: position === index,
                            onSelect: () => moveTo(patient, dayIds(group.date).indexOf(group.items[position].id)),
                          }))}
                        />
                        <button onClick={() => navigate(`/clinical?id=${encodeURIComponent(patient.id)}`)} className="min-w-0 text-left">
                          <p className="truncate font-medium text-fg hover:text-primary">{patient.name}</p>
                          <p className="text-xs text-muted">
                            <span className="font-mono">{patient.id}</span> · {getAge(patient.dob) || '?'}t · {patient.gender}
                          </p>
                          <p className="line-clamp-1 text-xs text-muted">{patient.diagnosis}</p>
                        </button>
                      </div>
                      <div className="min-w-0 flex-1 pl-12 sm:pl-0">
                        <p className="line-clamp-1 text-sm text-fg">{patient.surgeryMethod || '—'}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          {patient.surgeryService && <Badge tone="violet">{getSurgeryServiceLabel(patient.surgeryService)}</Badge>}
                          <span>
                            PTV: <b className="font-medium text-fg">{patient.surgeon || '—'}</b>
                          </span>
                          <span>Gây mê: {patient.anesthetist || '—'}</span>
                          {patient.scrubNurse && <span>DC: {patient.scrubNurse}</span>}
                        </div>
                        {patient.approvalNote && <p className="mt-1 text-xs italic text-amber-700 dark:text-amber-300">“{patient.approvalNote}”</p>}
                      </div>
                      <RowActions className="pl-12 sm:pl-0 md:opacity-100">
                        {group.date !== 'none' && group.date <= today && (
                          <Button size="sm" variant="soft" icon={Scissors} onClick={() => setConfirming(patient)}>
                            Đã mổ
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" iconOnly icon={Edit3} onClick={() => setApproving(patient)} aria-label="Sửa lịch mổ" title="Sửa lịch / ê-kíp" />
                        <Menu
                          trigger={({ toggle }) => <Button size="sm" variant="ghost" iconOnly icon={MoreHorizontal} onClick={toggle} aria-label="Thao tác khác" />}
                          items={[
                            { label: 'Xác nhận đã mổ', icon: Scissors, onSelect: () => setConfirming(patient) },
                            { label: 'Huỷ duyệt (về chờ duyệt)', icon: Undo2, onSelect: () => unapprove(patient), danger: true },
                          ]}
                        />
                      </RowActions>
                    </div>
                  )}
                />
              </section>
            ))}
          </div>
        )}
      </Card>

      {approving && <ApprovalDrawer patient={approving} patients={patients} onClose={() => setApproving(null)} />}
      <ConfirmSurgeryDialog patient={confirming} onClose={() => setConfirming(null)} />
    </div>
  );
};
