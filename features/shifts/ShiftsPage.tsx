import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  CalendarClock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Save,
  Stethoscope,
  Trash2,
  UserCheck,
  Wand2,
} from 'lucide-react';
import type { DailyOnCall } from '../../types';
import { batchSaveDailyOnCall, deleteDailyOnCall, getDailyOnCall, saveDailyOnCall } from '../../services/dataService';
import { KEYS, usePersonnel } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { useApp } from '../../context/AppContext';
import { useResource } from '../../lib/resource';
import { addDays, addMonths, fmtDate, fmtMonth, isWeekend, monthGrid, startOfWeek, todayKey, toDateKey, weekdayLong, weekdayShort } from '../../lib/dates';
import { compactName, shortName } from '../../lib/text';
import { printTable } from '../../lib/print';
import { exportToExcel } from '../../utils/exportUtils';
import { cn } from '../../lib/cn';
import {
  Avatar,
  BarList,
  Button,
  Card,
  Combobox,
  Dialog,
  ErrorState,
  Field,
  FormGrid,
  Input,
  PageHeader,
  SectionCard,
  Segmented,
  Select,
  SkeletonRows,
  Switch,
  confirmAction,
  namesToOptions,
  showToast,
} from '../../components/ui';
import { countDuties, isOnDuty, rosterFor, suggestRoster, type Roster } from './shiftsLogic';

const useShifts = () =>
  useResource<DailyOnCall[]>(KEYS.shifts, async options => {
    const data = await getDailyOnCall(options);
    return (Array.isArray(data) ? data : []).map(item => ({ ...item, date: toDateKey(item.date) || item.date }));
  });

export const ShiftsPage: React.FC = () => {
  const { user } = useApp();
  const [params, setParams] = useSearchParams();
  const { data, loading, error, validating, reload } = useShifts();
  const { doctors, nurses } = usePersonnel();
  const { run, pending } = useAction();
  const today = todayKey();

  const view = params.get('view') === 'week' ? 'week' : 'month';
  const focusDate = toDateKey(params.get('date')) || today;
  const month = focusDate.slice(0, 7);
  const weekStart = startOfWeek(focusDate);
  const [mineOnly, setMineOnly] = useState(false);
  const [editingDay, setEditingDay] = useState<Roster | null>(null);
  const [week, setWeek] = useState<Roster[]>([]);
  const [dirty, setDirty] = useState(false);

  const shifts = useMemo(() => data || [], [data]);
  const byDate = useMemo(() => new Map(shifts.map(shift => [toDateKey(shift.date), shift])), [shifts]);
  const myName = user.fullName || '';

  const setParam = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    Object.entries(updates).forEach(([key, value]) => (value ? next.set(key, value) : next.delete(key)));
    setParams(next, { replace: true });
  };

  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, index) => addDays(weekStart, index)), [weekStart]);

  // Nạp lại bảng tuần khi đổi tuần, hoặc khi dữ liệu mới về mà người dùng chưa sửa dở.
  const loadedWeek = useRef('');
  useEffect(() => {
    if (loadedWeek.current === weekStart && dirty) return;
    loadedWeek.current = weekStart;
    setWeek(rosterFor(weekDays, shifts));
    setDirty(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekDays, shifts]);

  // ?date=YYYY-MM-DD từ bảng điều hành: lần đầu mở trang, nếu ngày đó chưa có lịch thì mở luôn hộp phân trực.
  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current || !data) return;
    deepLinkHandled.current = true;
    const requested = toDateKey(params.get('date'));
    if (requested && view === 'month' && !byDate.get(requested)?.doctor) setEditingDay(rosterFor([requested], shifts)[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  const monthShifts = useMemo(() => shifts.filter(shift => toDateKey(shift.date).startsWith(month)), [shifts, month]);
  const dutyCounts = useMemo(() => countDuties(monthShifts), [monthShifts]);
  const myCount = dutyCounts.get(myName) || 0;
  const myNext = useMemo(
    () => shifts.filter(shift => toDateKey(shift.date) >= today && isOnDuty(shift, myName)).sort((a, b) => toDateKey(a.date).localeCompare(toDateKey(b.date)))[0],
    [shifts, today, myName],
  );

  const doctorOptions = useMemo(() => namesToOptions(doctors), [doctors]);
  const nurseOptions = useMemo(() => namesToOptions(nurses), [nurses]);

  const saveDay = async () => {
    if (!editingDay?.doctor) return showToast('Vui lòng chọn bác sĩ trực', 'warning');
    const result = await run('save-day', () => saveDailyOnCall(editingDay as DailyOnCall), { success: `Đã lưu lịch trực ${fmtDate(editingDay.date)}`, invalidate: [KEYS.shifts, KEYS.ops] });
    if (result !== undefined) setEditingDay(null);
  };

  const deleteDay = async () => {
    if (!editingDay?.id) return;
    const ok = await confirmAction({ title: `Xoá lịch trực ngày ${fmtDate(editingDay.date)}?`, confirmText: 'Xoá' });
    if (!ok) return;
    const result = await run('delete-day', () => deleteDailyOnCall(editingDay.id!), { success: 'Đã xoá lịch trực', invalidate: [KEYS.shifts, KEYS.ops] });
    if (result !== undefined) setEditingDay(null);
  };

  const saveWeek = async () => {
    const payload = week.filter(day => day.doctor || day.nurse1 || day.nurse2 || day.note);
    if (!payload.length) return showToast('Tuần này chưa có dữ liệu để lưu', 'info');
    const result = await run('save-week', () => batchSaveDailyOnCall(payload), { success: 'Đã lưu lịch trực tuần', invalidate: [KEYS.shifts, KEYS.ops] });
    if (result !== undefined) setDirty(false);
  };

  const autoFill = () => {
    if (!doctors.length && !nurses.length) return showToast('Chưa tải được danh sách nhân sự', 'warning');
    const history = shifts.filter(shift => toDateKey(shift.date).slice(0, 7) === weekStart.slice(0, 7) || toDateKey(shift.date) === addDays(weekStart, -1));
    const suggested = suggestRoster(week, doctors, nurses, history);
    const filled = suggested.filter((day, index) => day.doctor !== week[index].doctor || day.nurse1 !== week[index].nurse1 || day.nurse2 !== week[index].nurse2).length;
    setWeek(suggested);
    setDirty(true);
    showToast(filled ? `Đã gợi ý ${filled} ngày — kiểm tra rồi bấm Lưu tuần` : 'Tuần này đã kín lịch', filled ? 'success' : 'info');
  };

  const exportMonth = () => {
    const days = monthGrid(month).filter(cell => cell.inMonth).map(cell => cell.key);
    exportToExcel({
      fileName: `Lich_truc_${month}.xlsx`,
      sheetName: 'Lịch trực',
      title: `LỊCH TRỰC ${fmtMonth(month).toUpperCase()}`,
      subtitle: `Khoa Ngoại Tổng Hợp · xuất ngày ${fmtDate(today)}`,
      headers: ['Ngày', 'Thứ', 'Bác sĩ trực', 'Điều dưỡng 1', 'Điều dưỡng 2', 'Ghi chú'],
      rows: days.map(day => {
        const shift = byDate.get(day);
        return [fmtDate(day), weekdayLong(day), shift?.doctor || '', shift?.nurse1 || '', shift?.nurse2 || '', shift?.note || ''];
      }),
      signers: ['NGƯỜI LẬP', 'TRƯỞNG KHOA'],
      creatorName: user.fullName,
    });
  };

  const printMonth = () => {
    const days = monthGrid(month).filter(cell => cell.inMonth).map(cell => cell.key);
    const ok = printTable({
      title: `Lịch trực ${fmtMonth(month).toLowerCase()}`,
      landscape: false,
      columns: [
        { label: 'Ngày', width: '13%', align: 'center' },
        { label: 'Thứ', width: '11%', align: 'center' },
        { label: 'Bác sĩ trực', width: '24%' },
        { label: 'Điều dưỡng 1', width: '21%' },
        { label: 'Điều dưỡng 2', width: '21%' },
        { label: 'Ghi chú', width: '10%' },
      ],
      rows: days.map(day => {
        const shift = byDate.get(day);
        return [fmtDate(day), weekdayShort(day), shift?.doctor, shift?.nurse1, shift?.nurse2, shift?.note];
      }),
      signers: ['NGƯỜI LẬP', 'TRƯỞNG KHOA'],
    });
    if (!ok) showToast('Trình duyệt chặn cửa sổ in — hãy cho phép popup', 'error');
  };

  const cells = monthGrid(month);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Lịch trực"
        icon={CalendarClock}
        description="Phân trực bác sĩ & điều dưỡng 24h"
        actions={
          <>
            <Segmented
              value={view}
              onChange={value => setParam({ view: value === 'week' ? 'week' : null })}
              items={[
                { value: 'month', label: 'Tháng', icon: CalendarDays },
                { value: 'week', label: 'Sửa theo tuần', icon: Save },
              ]}
            />
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={() => reload()} aria-label="Làm mới" />
            <Button icon={FileSpreadsheet} onClick={exportMonth} className="hidden sm:inline-flex">
              Excel
            </Button>
            <Button icon={Printer} onClick={printMonth} className="hidden sm:inline-flex">
              In
            </Button>
          </>
        }
      />

      {myName && (
        <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
          <Avatar name={myName} />
          <div className="flex-1 text-sm">
            <p className="font-medium text-fg">Lịch trực của bạn</p>
            <p className="text-muted">
              {myCount} buổi trong {fmtMonth(month).toLowerCase()}
              {myNext ? ` · buổi kế tiếp: ${weekdayLong(toDateKey(myNext.date))}, ${fmtDate(myNext.date)}` : ' · chưa có lịch sắp tới'}
            </p>
          </div>
          <Switch checked={mineOnly} onChange={setMineOnly} label="Chỉ làm nổi bật ngày tôi trực" />
        </Card>
      )}

      {error && !data ? (
        <Card>
          <ErrorState error={error} onRetry={() => reload()} />
        </Card>
      ) : view === 'month' ? (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_300px]">
          <Card className="overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" iconOnly icon={ChevronLeft} onClick={() => setParam({ date: `${addMonths(month, -1)}-01` })} aria-label="Tháng trước" />
                <p className="min-w-[130px] text-center font-semibold text-fg">{fmtMonth(month)}</p>
                <Button size="sm" variant="ghost" iconOnly icon={ChevronRight} onClick={() => setParam({ date: `${addMonths(month, 1)}-01` })} aria-label="Tháng sau" />
              </div>
              {month !== today.slice(0, 7) && (
                <Button size="sm" variant="soft" onClick={() => setParam({ date: null })}>
                  Tháng này
                </Button>
              )}
            </div>
            {loading ? (
              <SkeletonRows />
            ) : (
              <div className="p-2 sm:p-3">
                <div className="grid grid-cols-7 gap-1 pb-1 text-center text-[11px] font-semibold uppercase text-faint">
                  {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
                    <span key={day}>{day}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {cells.map(cell => {
                    const shift = byDate.get(cell.key);
                    const mine = isOnDuty(shift, myName);
                    const empty = !shift?.doctor;
                    return (
                      <button
                        key={cell.key}
                        onClick={() => setEditingDay(rosterFor([cell.key], shifts)[0])}
                        className={cn(
                          'flex min-h-[64px] flex-col rounded-xl border p-1.5 text-left transition-colors sm:min-h-[92px] sm:p-2',
                          cell.inMonth ? 'bg-surface' : 'bg-sunken/50 opacity-60',
                          cell.key === today ? 'border-primary ring-2 ring-primary/20' : 'border-line hover:border-primary/40',
                          mine && 'bg-primary-soft',
                          mineOnly && !mine && 'opacity-40',
                        )}
                      >
                        <span className={cn('num text-xs font-semibold', isWeekend(cell.key) ? 'text-rose-500' : 'text-muted', cell.key === today && 'text-primary')}>
                          {Number(cell.key.slice(8))}
                        </span>
                        {shift?.doctor ? (
                          <span className="mt-0.5 hidden min-w-0 space-y-0.5 sm:block">
                            <span className="flex items-center gap-1 truncate text-[11.5px] font-medium text-fg">
                              <Stethoscope className="h-3 w-3 shrink-0 text-primary" />
                              <span className="truncate">{compactName(shift.doctor)}</span>
                            </span>
                            {[shift.nurse1, shift.nurse2].filter(Boolean).map(name => (
                              <span key={name} className="block truncate pl-4 text-[11px] text-muted">
                                {compactName(name)}
                              </span>
                            ))}
                          </span>
                        ) : (
                          cell.inMonth &&
                          cell.key >= today && <span className="mt-auto hidden text-[11px] font-medium text-amber-600 sm:block">Chưa phân</span>
                        )}
                        {/* Mobile: chấm trạng thái */}
                        <span className={cn('mt-auto h-1.5 w-1.5 rounded-full sm:hidden', empty ? (cell.key >= today && cell.inMonth ? 'bg-amber-500' : 'bg-transparent') : mine ? 'bg-primary' : 'bg-emerald-500')} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </Card>

          <SectionCard title="Số buổi trực trong tháng" description="Giúp phân trực công bằng" icon={UserCheck} bodyClassName="p-4">
            {dutyCounts.size ? (
              <BarList
                showPercent={false}
                data={Array.from(dutyCounts.entries())
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, count]) => ({ key: name, label: shortName(name), value: count }))}
              />
            ) : (
              <p className="py-6 text-center text-sm text-muted">Chưa có lịch trực trong tháng.</p>
            )}
          </SectionCard>
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-2 border-b border-line px-4 py-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-1">
              <Button size="sm" variant="ghost" iconOnly icon={ChevronLeft} onClick={() => setParam({ date: addDays(weekStart, -7) })} aria-label="Tuần trước" />
              <p className="min-w-[190px] text-center text-sm font-semibold text-fg">
                Tuần {fmtDate(weekStart).slice(0, 5)} – {fmtDate(addDays(weekStart, 6))}
              </p>
              <Button size="sm" variant="ghost" iconOnly icon={ChevronRight} onClick={() => setParam({ date: addDays(weekStart, 7) })} aria-label="Tuần sau" />
            </div>
            <div className="flex gap-2 sm:ml-auto">
              <Button size="sm" icon={Wand2} onClick={autoFill} title="Điền các ô trống bằng người có ít buổi trực nhất, tránh trực 2 ngày liền">
                Gợi ý phân trực
              </Button>
              <Button size="sm" variant="primary" icon={Save} loading={pending === 'save-week'} disabled={!dirty} onClick={saveWeek}>
                Lưu tuần
              </Button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="bg-sunken/70 text-xs text-muted">
                  <th className="w-32 px-4 py-2.5 text-left font-semibold">Ngày</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Bác sĩ trực</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Điều dưỡng 1</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Điều dưỡng 2</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Ghi chú</th>
                </tr>
              </thead>
              <tbody>
                {week.map((day, index) => {
                  const update = (field: keyof Roster, value: string) => {
                    setWeek(current => current.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
                    setDirty(true);
                  };
                  return (
                    <tr key={day.date} className={cn('border-t border-line', day.date === today && 'bg-primary-soft/40')}>
                      <td className="px-4 py-2">
                        <p className={cn('font-medium', isWeekend(day.date) ? 'text-rose-500' : 'text-fg')}>{weekdayShort(day.date)}</p>
                        <p className="num text-xs text-muted">{fmtDate(day.date).slice(0, 5)}</p>
                      </td>
                      <td className="px-3 py-2">
                        <Select value={day.doctor || ''} onChange={event => update('doctor', event.target.value)} placeholder="—" options={namesToOptions([...doctors, day.doctor || '']).map(option => option.value)} className="h-9" />
                      </td>
                      <td className="px-3 py-2">
                        <Select value={day.nurse1 || ''} onChange={event => update('nurse1', event.target.value)} placeholder="—" options={namesToOptions([...nurses, day.nurse1 || '']).map(option => option.value)} className="h-9" />
                      </td>
                      <td className="px-3 py-2">
                        <Select value={day.nurse2 || ''} onChange={event => update('nurse2', event.target.value)} placeholder="—" options={namesToOptions([...nurses, day.nurse2 || '']).map(option => option.value)} className="h-9" />
                      </td>
                      <td className="px-3 py-2">
                        <Input value={day.note || ''} onChange={event => update('note', event.target.value)} className="h-9" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {dirty && <p className="border-t border-line bg-amber-500/[0.06] px-4 py-2 text-xs text-amber-700 dark:text-amber-300">Có thay đổi chưa lưu.</p>}
        </Card>
      )}

      <Dialog
        open={Boolean(editingDay)}
        onClose={() => setEditingDay(null)}
        title={editingDay ? `Lịch trực ${weekdayLong(editingDay.date).toLowerCase()}, ${fmtDate(editingDay.date)}` : ''}
        footer={
          <>
            {editingDay?.id && (
              <Button variant="danger-soft" icon={Trash2} className="mr-auto" loading={pending === 'delete-day'} onClick={deleteDay}>
                Xoá
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEditingDay(null)}>
              Huỷ
            </Button>
            <Button variant="primary" loading={pending === 'save-day'} onClick={saveDay}>
              Lưu
            </Button>
          </>
        }
      >
        {editingDay && (
          <div className="space-y-4">
            <Field label="Bác sĩ trực" required>
              <Combobox value={editingDay.doctor || ''} onChange={value => setEditingDay({ ...editingDay, doctor: value })} options={doctorOptions} allowCustom placeholder="Chọn bác sĩ" />
            </Field>
            <FormGrid>
              <Field label="Điều dưỡng 1">
                <Combobox value={editingDay.nurse1 || ''} onChange={value => setEditingDay({ ...editingDay, nurse1: value })} options={nurseOptions} allowCustom placeholder="Chọn điều dưỡng" />
              </Field>
              <Field label="Điều dưỡng 2">
                <Combobox value={editingDay.nurse2 || ''} onChange={value => setEditingDay({ ...editingDay, nurse2: value })} options={nurseOptions} allowCustom placeholder="Chọn điều dưỡng" />
              </Field>
            </FormGrid>
            <Field label="Ghi chú">
              <Input value={editingDay.note || ''} onChange={event => setEditingDay({ ...editingDay, note: event.target.value })} />
            </Field>
            {editingDay.doctor && (dutyCounts.get(editingDay.doctor) || 0) > 0 && (
              <p className="text-xs text-muted">
                {editingDay.doctor} đã có {dutyCounts.get(editingDay.doctor)} buổi trực trong {fmtMonth(month).toLowerCase()}.
              </p>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
};
