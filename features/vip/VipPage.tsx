import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, Plus, RefreshCw, Star, StarOff, Trash2 } from 'lucide-react';
import type { VipPatient } from '../../types';
import { removeVipPatient } from '../../services/dataService';
import { KEYS, usePatients, useVipPatients } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { fmtDate } from '../../lib/dates';
import { statusMeta, treatmentDays } from '../../lib/domain';
import { matchesQuery } from '../../lib/text';
import { cn } from '../../lib/cn';
import { Badge, Button, Callout, Card, ChipGroup, EmptyState, ErrorState, PageHeader, SearchInput, SkeletonRows, confirmAction } from '../../components/ui';
import { VipDialog } from './VipDialog';

const PRIORITY_STYLE: Record<string, { tone: 'danger' | 'warning' | 'info'; ring: string }> = {
  Cao: { tone: 'danger', ring: 'before:bg-rose-500' },
  'Trung bình': { tone: 'warning', ring: 'before:bg-amber-500' },
  Thấp: { tone: 'info', ring: 'before:bg-sky-500' },
};

const PRIORITY_ORDER: Record<string, number> = { Cao: 0, 'Trung bình': 1, Thấp: 2 };

export const VipPage: React.FC = () => {
  const navigate = useNavigate();
  const { data, loading, error, validating, reload } = useVipPatients();
  const { data: patients } = usePatients();
  const { run, pending } = useAction();
  const [search, setSearch] = useState('');
  const [priority, setPriority] = useState<'all' | 'Cao' | 'Trung bình' | 'Thấp'>('all');
  const [adding, setAdding] = useState(false);

  const patientMap = useMemo(() => new Map((patients || []).map(patient => [patient.id, patient])), [patients]);

  const items = useMemo(
    () =>
      (data || [])
        .map(vip => ({ vip, patient: patientMap.get(String(vip.patientId).trim()) }))
        .filter(({ vip, patient }) => (priority === 'all' || vip.priority === priority) && matchesQuery(search, vip.name, vip.patientId, vip.reason, patient?.diagnosis))
        .sort((a, b) => (PRIORITY_ORDER[a.vip.priority] ?? 9) - (PRIORITY_ORDER[b.vip.priority] ?? 9)),
    [data, patientMap, priority, search],
  );

  const stale = useMemo(() => (data || []).filter(vip => patientMap.get(String(vip.patientId).trim())?.status === 'RaVien'), [data, patientMap]);

  const remove = async (vip: VipPatient) => {
    const ok = await confirmAction({ title: `Bỏ lưu ý cho ${vip.name || vip.patientId}?`, confirmText: 'Bỏ lưu ý', tone: 'primary' });
    if (!ok) return;
    await run(`remove-${vip.id}`, () => removeVipPatient(vip.id), { success: 'Đã bỏ lưu ý', invalidate: [KEYS.vip] });
  };

  const cleanup = async () => {
    const ok = await confirmAction({
      title: `Gỡ ${stale.length} bệnh nhân đã ra viện khỏi danh sách?`,
      message: stale.map(vip => vip.name || vip.patientId).join(', '),
      confirmText: 'Dọn dẹp',
      tone: 'primary',
    });
    if (!ok) return;
    await run('cleanup', () => Promise.all(stale.map(vip => removeVipPatient(vip.id))), { success: 'Đã dọn danh sách lưu ý', invalidate: [KEYS.vip] });
  };

  const counts = useMemo(() => {
    const result: Record<string, number> = { Cao: 0, 'Trung bình': 0, Thấp: 0 };
    (data || []).forEach(vip => (result[vip.priority] = (result[vip.priority] || 0) + 1));
    return result;
  }, [data]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Bệnh nhân cần lưu ý"
        icon={Star}
        description="Bệnh nhân đặc biệt cần quan tâm chăm sóc, hiển thị ưu tiên ở mọi danh sách"
        actions={
          <>
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={() => reload()} aria-label="Làm mới" />
            <Button variant="primary" icon={Plus} onClick={() => setAdding(true)}>
              Thêm bệnh nhân
            </Button>
          </>
        }
      />

      {stale.length > 0 && (
        <Callout
          tone="info"
          title={`${stale.length} bệnh nhân đã ra viện vẫn còn trong danh sách`}
          action={
            <Button size="sm" icon={Trash2} loading={pending === 'cleanup'} onClick={cleanup}>
              Dọn dẹp
            </Button>
          }
        >
          Gỡ họ ra để danh sách chỉ còn bệnh nhân đang điều trị.
        </Callout>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, mã BN, lý do…" className="sm:w-80" />
        <ChipGroup
          value={priority}
          onChange={setPriority}
          options={[
            { value: 'all', label: `Tất cả · ${data?.length || 0}` },
            { value: 'Cao', label: `Cao · ${counts.Cao}` },
            { value: 'Trung bình', label: `Trung bình · ${counts['Trung bình']}` },
            { value: 'Thấp', label: `Thấp · ${counts['Thấp']}` },
          ]}
        />
      </div>

      {error && !data ? (
        <Card>
          <ErrorState error={error} onRetry={() => reload()} />
        </Card>
      ) : loading ? (
        <Card>
          <SkeletonRows rows={4} />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={StarOff} title={search || priority !== 'all' ? 'Không có bệnh nhân phù hợp' : 'Chưa có bệnh nhân cần lưu ý'} action={<Button icon={Plus} onClick={() => setAdding(true)}>Thêm bệnh nhân</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map(({ vip, patient }) => {
            const style = PRIORITY_STYLE[vip.priority] || PRIORITY_STYLE['Thấp'];
            const meta = patient ? statusMeta(patient.status) : null;
            const days = patient ? treatmentDays(patient) : null;
            return (
              <div
                key={vip.id}
                className={cn(
                  'card relative flex flex-col overflow-hidden p-4 before:absolute before:inset-y-0 before:left-0 before:w-1',
                  style.ring,
                  patient?.status === 'RaVien' && 'opacity-70',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <button className="min-w-0 text-left" onClick={() => navigate(`/clinical?id=${encodeURIComponent(vip.patientId)}`)}>
                    <p className="flex items-center gap-1.5 font-semibold text-fg hover:text-primary">
                      <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                      <span className="truncate">{vip.name || patient?.name || vip.patientId}</span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      <span className="font-mono">{vip.patientId}</span>
                      {(vip.room || patient?.room) && (
                        <span className="ml-2 inline-flex items-center gap-1">
                          <BedDouble className="h-3 w-3" /> {vip.room || patient?.room}
                          {(vip.bed || patient?.bed) && `/${vip.bed || patient?.bed}`}
                        </span>
                      )}
                    </p>
                  </button>
                  <Badge tone={style.tone} solid>
                    {vip.priority}
                  </Badge>
                </div>
                <p className="mt-3 flex-1 rounded-xl bg-sunken px-3 py-2 text-sm text-fg">{vip.reason}</p>
                {patient?.diagnosis && <p className="mt-2 line-clamp-2 text-xs text-muted">{patient.diagnosis}</p>}
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3">
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
                    {meta && <Badge tone={meta.tone}>{meta.short}</Badge>}
                    {days !== null && patient?.status !== 'RaVien' && <span>N{days}</span>}
                    {(vip as any).createdAt && <span>· từ {fmtDate((vip as any).createdAt)}</span>}
                  </div>
                  <Button size="sm" variant="ghost" icon={StarOff} loading={pending === `remove-${vip.id}`} onClick={() => remove(vip)}>
                    Bỏ
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <VipDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  );
};
