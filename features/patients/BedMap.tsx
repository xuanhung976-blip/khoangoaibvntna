import React, { useMemo, useState } from 'react';
import { BedDouble, Clock, Scissors, Star, UserX, Users } from 'lucide-react';
import type { Patient } from '../../types';
import { PATIENT_STATUS, TOTAL_BEDS, statusMeta, treatmentDays, type PatientStatus } from '../../lib/domain';
import { addDays, todayKey, toDateKey } from '../../lib/dates';
import { compactName } from '../../lib/text';
import { cn } from '../../lib/cn';
import { Meter, TONE_BAR, TONE_DOT } from '../../components/ui';
import { buildBedLayout } from './bedLayout';

const LONG_STAY_DAYS = 14;
const ACTIVE_STATUSES: PatientStatus[] = ['ChoMo', 'DaDuyet', 'DaMo', 'DieuTri'];

type Flag = 'vip' | 'long' | 'surgery' | 'unassigned' | 'shared';

/** Sơ đồ buồng bệnh dạng bảng tổng quan: công suất, trạng thái, giường trống, cờ cần chú ý. */
export const BedMap: React.FC<{ patients: Patient[]; vipIds: Set<string>; onOpen: (patient: Patient) => void }> = ({
  patients,
  vipIds,
  onOpen,
}) => {
  const today = todayKey();
  const tomorrow = addDays(today, 1);
  const [focus, setFocus] = useState<PatientStatus | Flag | null>(null);

  const layout = useMemo(() => buildBedLayout(patients), [patients]);

  const sharedIds = useMemo(
    () => new Set(layout.rooms.flatMap(room => room.slots.filter(slot => slot.patients.length > 1).flatMap(slot => slot.patients.map(patient => patient.id)))),
    [layout],
  );

  const surgerySoon = (patient: Patient) => patient.status === 'DaDuyet' && [today, tomorrow].includes(toDateKey(patient.surgeryDate));
  const longStay = (patient: Patient) => (treatmentDays(patient) ?? 0) > LONG_STAY_DAYS;

  const stats = useMemo(() => {
    const byStatus = Object.fromEntries(ACTIVE_STATUSES.map(status => [status, patients.filter(patient => patient.status === status).length])) as Record<PatientStatus, number>;
    return {
      byStatus,
      vip: patients.filter(patient => vipIds.has(patient.id)).length,
      long: patients.filter(longStay).length,
      surgery: patients.filter(surgerySoon).length,
      unassigned: layout.unassigned.length,
      usedBeds: layout.rooms.reduce((sum, room) => sum + room.usedBeds, 0) + layout.unassigned.length,
      sharedBeds: layout.rooms.reduce((sum, room) => sum + room.shared, 0),
      sharedPatients: sharedIds.size,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patients, layout, vipIds, today, sharedIds]);

  const matches = (patient: Patient) => {
    if (!focus) return true;
    if (focus === 'vip') return vipIds.has(patient.id);
    if (focus === 'long') return longStay(patient);
    if (focus === 'surgery') return surgerySoon(patient);
    if (focus === 'unassigned') return !patient.room;
    if (focus === 'shared') return sharedIds.has(patient.id);
    return patient.status === focus;
  };

  const toggle = (value: PatientStatus | Flag) => setFocus(current => (current === value ? null : value));
  const used = patients.length;

  const flags = (patient: Patient) => (
    <span className="flex items-center gap-0.5">
      {vipIds.has(patient.id) && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
      {surgerySoon(patient) && <Scissors className="h-3.5 w-3.5 text-violet-500" />}
    </span>
  );

  const daysLabel = (patient: Patient) => {
    const days = treatmentDays(patient);
    if (days === null) return null;
    return (
      <span className={cn('num flex items-center gap-0.5', longStay(patient) ? 'font-semibold text-amber-600' : 'text-faint')}>
        {longStay(patient) && <Clock className="h-3 w-3" />}N{days}
      </span>
    );
  };

  /** Ô giường có một bệnh nhân. */
  const tile = (patient: Patient, bedLabel: string) => {
    const meta = statusMeta(patient.status);
    return (
      <button
        key={patient.id}
        onClick={() => onOpen(patient)}
        className={cn(
          'group relative overflow-hidden rounded-xl border border-line bg-surface p-2.5 pl-3.5 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-card',
          !matches(patient) && 'opacity-30',
        )}
      >
        <span className={cn('absolute inset-y-0 left-0 w-1', TONE_BAR[meta.tone])} />
        <div className="flex items-center justify-between gap-1 text-[11px] text-muted">
          <span className="flex items-center gap-1">
            <BedDouble className="h-3.5 w-3.5" /> G.{bedLabel}
          </span>
          {flags(patient)}
        </div>
        <p className="mt-1 truncate text-[13px] font-semibold text-fg group-hover:text-primary" title={patient.name}>
          {compactName(patient.name)}
        </p>
        <div className="mt-0.5 flex items-center justify-between gap-1 text-[11px]">
          <span className="truncate text-muted">{meta.short}</span>
          {daysLabel(patient)}
        </div>
      </button>
    );
  };

  /** Giường nằm ghép: một ô chung, liệt kê tất cả bệnh nhân trong giường. */
  const sharedBed = (bedLabel: string, occupants: Patient[]) => {
    const dim = !occupants.some(matches);
    return (
      <div key={`shared-${bedLabel}`} className={cn('col-span-2 rounded-xl border-2 border-orange-400/70 bg-orange-500/[0.05] p-2', dim && 'opacity-30')}>
        <div className="mb-1.5 flex items-center justify-between px-1 text-[11px]">
          <span className="flex items-center gap-1 text-muted">
            <BedDouble className="h-3.5 w-3.5" /> G.{bedLabel}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-orange-500 px-2 py-0.5 font-semibold text-white">
            <Users className="h-3 w-3" /> Nằm ghép {occupants.length}
          </span>
        </div>
        <div className="space-y-1">
          {occupants.map(patient => {
            const meta = statusMeta(patient.status);
            return (
              <button
                key={patient.id}
                onClick={() => onOpen(patient)}
                className={cn('group relative flex w-full items-center gap-2 overflow-hidden rounded-lg bg-surface py-1.5 pl-3 pr-2 text-left hover:shadow-card', !matches(patient) && 'opacity-40')}
              >
                <span className={cn('absolute inset-y-0 left-0 w-1', TONE_BAR[meta.tone])} />
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-fg group-hover:text-primary" title={patient.name}>
                  {compactName(patient.name)}
                </span>
                <span className="shrink-0 text-[11px] text-muted">{meta.short}</span>
                {flags(patient)}
                <span className="shrink-0 text-[11px]">{daysLabel(patient)}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  if (!patients.length && !layout.rooms.length) return <p className="p-8 text-center text-sm text-muted">Không có bệnh nhân đang điều trị.</p>;

  const chip = (value: PatientStatus | Flag, label: React.ReactNode, count: number, dot?: string, icon?: React.ReactNode) => (
    <button
      key={value}
      onClick={() => toggle(value)}
      disabled={!count}
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors disabled:opacity-40',
        focus === value ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-faint',
      )}
    >
      {dot && <span className={cn('h-2.5 w-2.5 rounded-full', dot)} />}
      {icon}
      <span className="text-xs text-muted">{label}</span>
      <span className="num text-sm font-semibold text-fg">{count}</span>
    </button>
  );

  return (
    <div className="space-y-4 p-4">
      {/* Tổng quan */}
      <div className="grid grid-cols-1 gap-4 rounded-2xl border border-line bg-sunken/40 p-4 lg:grid-cols-[minmax(220px,280px)_1fr]">
        <div>
          <p className="text-xs text-muted">Công suất giường (kế hoạch {TOTAL_BEDS} giường)</p>
          <p className="num mt-0.5 text-3xl font-semibold text-fg">
            {used}
            <span className="text-lg font-normal text-muted"> BN / {TOTAL_BEDS}</span>
            <span className={cn('ml-2 text-base font-semibold', used > TOTAL_BEDS ? 'text-rose-600' : 'text-muted')}>
              {Math.round((used / TOTAL_BEDS) * 100)}%
            </span>
          </p>
          <Meter className="mt-2" value={used} max={TOTAL_BEDS} />
          <p className="mt-1.5 text-xs text-muted">
            {used > TOTAL_BEDS ? (
              <span className="font-medium text-rose-600">Vượt {used - TOTAL_BEDS} BN so với giường kế hoạch</span>
            ) : (
              <>Còn trống {TOTAL_BEDS - used} giường</>
            )}
            {` · ${stats.usedBeds} giường đang dùng`}
            {stats.sharedBeds > 0 && ` · ${stats.sharedBeds} giường nằm ghép`}
          </p>
        </div>
        <div className="space-y-2">
          <p className="text-xs text-muted">Bấm để làm nổi bật trên sơ đồ</p>
          <div className="flex flex-wrap gap-2">
            {ACTIVE_STATUSES.map(status => chip(status, PATIENT_STATUS[status].short, stats.byStatus[status] || 0, TONE_DOT[PATIENT_STATUS[status].tone]))}
          </div>
          <div className="flex flex-wrap gap-2">
            {chip('surgery', 'Mổ hôm nay / mai', stats.surgery, undefined, <Scissors className="h-3.5 w-3.5 text-violet-500" />)}
            {chip('vip', 'Cần lưu ý', stats.vip, undefined, <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
            {chip('long', `Nằm > ${LONG_STAY_DAYS} ngày`, stats.long, undefined, <Clock className="h-3.5 w-3.5 text-amber-600" />)}
            {chip('shared', `Nằm ghép (${stats.sharedBeds} giường)`, stats.sharedPatients, undefined, <Users className="h-3.5 w-3.5 text-orange-500" />)}
            {chip('unassigned', 'Chưa xếp giường', stats.unassigned, undefined, <UserX className="h-3.5 w-3.5 text-muted" />)}
          </div>
        </div>
      </div>

      {/* Các buồng */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {layout.rooms.map(room => {
          return (
            <div key={room.room} className="rounded-2xl border border-line bg-sunken/40 p-3">
              <div className="mb-2.5 px-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-fg">Buồng {room.room}</p>
                  <span className="num text-xs font-medium text-muted">
                    {room.usedBeds} giường · {room.occupied} BN
                    {room.shared > 0 && <span className="ml-1 text-orange-600">· {room.shared} ghép</span>}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {room.slots.map(slot => (slot.patients.length > 1 ? sharedBed(slot.bed, slot.patients) : tile(slot.patients[0], slot.bed)))}
              </div>
            </div>
          );
        })}
        {layout.unassigned.length > 0 && (
          <div className="rounded-2xl border border-dashed border-amber-500/50 bg-amber-500/[0.04] p-3">
            <div className="mb-2.5 flex items-center justify-between px-1">
              <p className="text-sm font-semibold text-fg">Chưa xếp buồng / giường</p>
              <span className="num text-xs text-muted">{layout.unassigned.length} BN</span>
            </div>
            <div className="grid grid-cols-2 gap-2">{layout.unassigned.map(patient => tile(patient, '—'))}</div>
          </div>
        )}
      </div>
    </div>
  );
};
