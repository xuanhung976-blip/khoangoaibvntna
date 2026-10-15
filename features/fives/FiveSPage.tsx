import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ClipboardList, Edit3, Lightbulb, MapPin, MoreHorizontal, Plus, RefreshCw, Sparkles, Star, Trash2 } from 'lucide-react';
import type { Evaluation5S, Improvement5S, Zone5S } from '../../types';
import {
  addEvaluation,
  addImprovement,
  addZone,
  deleteGenericData,
  deleteImprovement,
  deleteZone,
  getEvaluations,
  getImprovements,
  getZones,
  updateImprovement,
  updateZone,
} from '../../services/dataService';
import { useApp } from '../../context/AppContext';
import { KEYS } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../lib/resource';
import { diffDays, fmtDate, relativeDay, todayKey, toDateKey } from '../../lib/dates';
import { matchesQuery, toNumber } from '../../lib/text';
import { cn } from '../../lib/cn';
import {
  Badge,
  Button,
  Card,
  ChipGroup,
  Dialog,
  EmptyState,
  ErrorState,
  Field,
  FormGrid,
  Input,
  Menu,
  PageHeader,
  Select,
  SkeletonRows,
  Sparkline,
  Tabs,
  Textarea,
  confirmAction,
  showToast,
} from '../../components/ui';

type Tab = 'zones' | 'evaluations' | 'improvements';
const CRITERIA = ['Sàng lọc', 'Sắp xếp', 'Sạch sẽ', 'Săn sóc', 'Sẵn sàng'];
const IMP_COLUMNS: Array<{ status: Improvement5S['status']; label: string; dot: string }> = [
  { status: 'DeXuat', label: 'Đề xuất', dot: 'bg-slate-400' },
  { status: 'DangLam', label: 'Đang làm', dot: 'bg-sky-500' },
  { status: 'HoanThanh', label: 'Hoàn thành', dot: 'bg-emerald-500' },
];

const scoreTone = (score: number) => (score >= 90 ? 'success' : score >= 70 ? 'warning' : 'danger');

export const FiveSPage: React.FC = () => {
  const { user } = useApp();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as Tab) || 'zones';
  const zonesRes = useResource<Zone5S[]>(KEYS.zones, async options => (await getZones(options)) || []);
  const evalRes = useResource<Evaluation5S[]>(KEYS.evaluations5s, async options => (await getEvaluations(options)) || []);
  const impRes = useResource<Improvement5S[]>(KEYS.improvements, async options => (await getImprovements(options)) || []);
  const { run, pending } = useAction();
  const [search, setSearch] = useState('');
  const [editingZone, setEditingZone] = useState<Partial<Zone5S> | null>(null);
  const [evaluating, setEvaluating] = useState<{ zoneId: string; date: string; scores: number[]; comments: string } | null>(null);
  const [editingImp, setEditingImp] = useState<Partial<Improvement5S> | null>(null);
  const today = todayKey();

  const zones = useMemo(() => zonesRes.data || [], [zonesRes.data]);
  const evaluations = useMemo(() => [...(evalRes.data || [])].sort((a, b) => toDateKey(b.date).localeCompare(toDateKey(a.date))), [evalRes.data]);
  const improvements = impRes.data || [];
  const zoneName = (id: string) => zones.find(zone => zone.id === id)?.name || id;

  const zoneStats = useMemo(() => {
    const map = new Map<string, { latest?: Evaluation5S; history: number[] }>();
    zones.forEach(zone => {
      const list = evaluations.filter(item => item.zoneId === zone.id);
      map.set(zone.id, { latest: list[0], history: list.slice(0, 8).map(item => toNumber(item.score)).reverse() });
    });
    return map;
  }, [zones, evaluations]);

  const setTab = (value: Tab) => {
    const next = new URLSearchParams(params);
    if (value === 'zones') next.delete('tab');
    else next.set('tab', value);
    setParams(next, { replace: true });
  };

  const saveZone = async () => {
    if (!editingZone?.name?.trim()) return showToast('Nhập tên khu vực', 'warning');
    const payload = { ...editingZone, name: editingZone.name.trim(), type: editingZone.type || 'Khu vực chung' };
    const result = await run('save-zone', () => (payload.id ? updateZone(payload.id, payload) : addZone(payload as Zone5S)), { success: 'Đã lưu khu vực', invalidate: [KEYS.zones] });
    if (result !== undefined) setEditingZone(null);
  };

  const saveEvaluation = async () => {
    if (!evaluating?.zoneId) return showToast('Chọn khu vực', 'warning');
    const score = evaluating.scores.reduce((sum, value) => sum + value, 0);
    const breakdown = `[${CRITERIA.map((label, index) => `${label} ${evaluating.scores[index]}`).join(' · ')}]`;
    const result = await run(
      'save-eval',
      async () => {
        await addEvaluation({ zoneId: evaluating.zoneId, date: evaluating.date, score, assessor: user.fullName, comments: [breakdown, evaluating.comments.trim()].filter(Boolean).join(' ') } as Evaluation5S);
        // Cập nhật điểm & ngày kiểm tra gần nhất cho khu vực (phiên bản cũ bỏ sót bước này).
        const latest = zoneStats.get(evaluating.zoneId)?.latest;
        if (!latest || toDateKey(latest.date) <= evaluating.date) await updateZone(evaluating.zoneId, { currentScore: score, lastCheckDate: evaluating.date });
      },
      { success: `Đã chấm ${score} điểm cho ${zoneName(evaluating.zoneId)}`, invalidate: [KEYS.evaluations5s, KEYS.zones, KEYS.ops] },
    );
    if (result !== undefined) setEvaluating(null);
  };

  const saveImprovement = async () => {
    if (!editingImp?.content?.trim()) return showToast('Nhập nội dung cải tiến', 'warning');
    const payload = { ...editingImp, content: editingImp.content.trim() };
    const result = await run('save-imp', () => (payload.id ? updateImprovement(payload.id, payload) : addImprovement(payload as Improvement5S)), {
      success: 'Đã lưu đề xuất',
      invalidate: [KEYS.improvements, KEYS.ops],
    });
    if (result !== undefined) setEditingImp(null);
  };

  const confirmDelete = async (title: string, action: () => Promise<unknown>, keys: string[]) => {
    if (!(await confirmAction({ title, confirmText: 'Xoá' }))) return;
    await run('delete', action, { success: 'Đã xoá', invalidate: keys });
  };

  const startEvaluation = (zoneId = '') => setEvaluating({ zoneId, date: today, scores: [18, 18, 18, 18, 18], comments: '' });

  const loading = zonesRes.loading || (tab === 'evaluations' && evalRes.loading) || (tab === 'improvements' && impRes.loading);
  const error = zonesRes.error || evalRes.error || impRes.error;

  return (
    <div className="space-y-5">
      <PageHeader
        title="5S"
        icon={Sparkles}
        description="Sàng lọc · Sắp xếp · Sạch sẽ · Săn sóc · Sẵn sàng"
        actions={
          <>
            <Button
              variant="ghost"
              iconOnly
              icon={RefreshCw}
              loading={zonesRes.validating || evalRes.validating || impRes.validating}
              onClick={() => {
                zonesRes.reload();
                evalRes.reload();
                impRes.reload();
              }}
              aria-label="Làm mới"
            />
            {tab === 'improvements' ? (
              <Button variant="primary" icon={Plus} onClick={() => setEditingImp({ status: 'DeXuat', proposer: user.fullName })}>
                Đề xuất cải tiến
              </Button>
            ) : tab === 'evaluations' ? (
              <Button variant="primary" icon={Star} onClick={() => startEvaluation()}>
                Chấm điểm
              </Button>
            ) : (
              <Button variant="primary" icon={Plus} onClick={() => setEditingZone({ type: 'Buồng bệnh' })}>
                Thêm khu vực
              </Button>
            )}
          </>
        }
      />

      <Card className="overflow-hidden">
        <div className="px-3 pt-1 sm:px-4">
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'zones', label: 'Khu vực', icon: MapPin, count: zones.length },
              { value: 'evaluations', label: 'Lịch sử chấm điểm', icon: ClipboardList, count: evaluations.length },
              { value: 'improvements', label: 'Cải tiến', icon: Lightbulb, count: improvements.filter(item => item.status !== 'HoanThanh').length, countTone: 'primary' },
            ]}
          />
        </div>
        {tab === 'zones' && (
          <div className="border-b border-line p-3 sm:px-4">
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Tìm khu vực, người phụ trách…" className="h-9 sm:w-72" />
          </div>
        )}

        {error && !zonesRes.data ? (
          <ErrorState error={error} onRetry={() => zonesRes.reload()} />
        ) : loading ? (
          <SkeletonRows />
        ) : tab === 'zones' ? (
          zones.length === 0 ? (
            <EmptyState icon={MapPin} title="Chưa có khu vực 5S" action={<Button icon={Plus} onClick={() => setEditingZone({ type: 'Buồng bệnh' })}>Thêm khu vực</Button>} />
          ) : (
            <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
              {zones
                .filter(zone => matchesQuery(search, zone.name, zone.pic, zone.type))
                .map(zone => {
                  const stats = zoneStats.get(zone.id);
                  const score = stats?.latest ? toNumber(stats.latest.score) : toNumber(zone.currentScore);
                  const lastDate = stats?.latest ? toDateKey(stats.latest.date) : toDateKey(zone.lastCheckDate);
                  const stale = !lastDate || diffDays(lastDate, today) > 30;
                  return (
                    <div key={zone.id} className="rounded-2xl border border-line p-4">
                      <div className="flex items-start gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-fg">{zone.name}</p>
                          <p className="text-xs text-muted">
                            {zone.type}
                            {zone.pic && ` · ${zone.pic}`}
                          </p>
                        </div>
                        <Menu
                          trigger={({ toggle }) => <Button size="xs" variant="ghost" iconOnly icon={MoreHorizontal} onClick={toggle} aria-label="Thao tác" />}
                          items={[
                            { label: 'Sửa', icon: Edit3, onSelect: () => setEditingZone(zone) },
                            { label: 'Xoá', icon: Trash2, danger: true, onSelect: () => confirmDelete(`Xoá khu vực ${zone.name}?`, () => deleteZone(zone.id), [KEYS.zones]) },
                          ]}
                        />
                      </div>
                      <div className="mt-4 flex items-end justify-between gap-3">
                        <div>
                          <p className={cn('num text-3xl font-semibold', score ? (scoreTone(score) === 'success' ? 'text-emerald-600' : scoreTone(score) === 'warning' ? 'text-amber-600' : 'text-rose-600') : 'text-faint')}>
                            {score || '—'}
                          </p>
                          <p className={cn('text-xs', stale ? 'text-amber-600' : 'text-muted')}>{lastDate ? `Chấm ${relativeDay(lastDate).toLowerCase()}` : 'Chưa chấm điểm'}</p>
                        </div>
                        {stats && stats.history.length > 1 && <Sparkline values={stats.history} width={100} height={32} />}
                      </div>
                      <Button size="sm" variant="soft" icon={Star} className="mt-4 w-full" onClick={() => startEvaluation(zone.id)}>
                        Chấm điểm
                      </Button>
                    </div>
                  );
                })}
            </div>
          )
        ) : tab === 'evaluations' ? (
          evaluations.length === 0 ? (
            <EmptyState icon={ClipboardList} title="Chưa có lượt chấm điểm" />
          ) : (
            <ul className="divide-y divide-line">
              {evaluations.map(item => (
                <li key={item.id} className="group flex items-start gap-4 px-4 py-3 sm:px-5">
                  <Badge tone={scoreTone(toNumber(item.score))} solid className="num mt-0.5 w-12 justify-center text-sm">
                    {toNumber(item.score)}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-fg">{zoneName(item.zoneId)}</p>
                    <p className="text-xs text-muted">
                      {fmtDate(item.date)} · {item.assessor || '—'}
                    </p>
                    {item.comments && <p className="mt-1 text-sm text-muted">{item.comments}</p>}
                  </div>
                  <Button
                    size="sm"
                    variant="danger-soft"
                    iconOnly
                    icon={Trash2}
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100"
                    onClick={() => confirmDelete('Xoá lượt chấm điểm này?', () => deleteGenericData('DanhGia_5S', item.id), [KEYS.evaluations5s, KEYS.ops])}
                    aria-label="Xoá"
                  />
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
            {IMP_COLUMNS.map(column => {
              const list = improvements.filter(item => (item.status || 'DeXuat') === column.status);
              return (
                <div key={column.status} className="rounded-2xl border border-line bg-sunken/50 p-3">
                  <div className="mb-3 flex items-center gap-2 px-1">
                    <span className={cn('h-2 w-2 rounded-full', column.dot)} />
                    <p className="text-sm font-semibold text-fg">{column.label}</p>
                    <span className="num ml-auto text-xs text-muted">{list.length}</span>
                  </div>
                  {list.length === 0 ? (
                    <EmptyState compact icon={Lightbulb} title="Trống" />
                  ) : (
                    <ul className="space-y-2">
                      {list.map(item => (
                        <li key={item.id} className="card p-3">
                          <div className="flex items-start gap-2">
                            <button onClick={() => setEditingImp(item)} className="min-w-0 flex-1 text-left text-sm text-fg hover:text-primary">
                              {item.content}
                            </button>
                            <Menu
                              trigger={({ toggle }) => <Button size="xs" variant="ghost" iconOnly icon={MoreHorizontal} onClick={toggle} aria-label="Thao tác" />}
                              items={[
                                { label: 'Sửa', icon: Edit3, onSelect: () => setEditingImp(item) },
                                ...IMP_COLUMNS.filter(col => col.status !== item.status).map(col => ({
                                  label: `Chuyển: ${col.label}`,
                                  onSelect: () => run(`imp-${item.id}`, () => updateImprovement(item.id, { status: col.status }), { success: 'Đã cập nhật', invalidate: [KEYS.improvements, KEYS.ops] }),
                                })),
                                'divider' as const,
                                { label: 'Xoá', icon: Trash2, danger: true, onSelect: () => confirmDelete('Xoá đề xuất này?', () => deleteImprovement(item.id), [KEYS.improvements, KEYS.ops]) },
                              ]}
                            />
                          </div>
                          <p className="mt-1.5 text-xs text-muted">
                            {zoneName(item.zoneId) || 'Chung'}
                            {item.proposer && ` · ${item.proposer}`}
                          </p>
                          {item.result && <p className="mt-1 rounded-lg bg-emerald-500/5 px-2 py-1 text-xs text-emerald-700 dark:text-emerald-300">Kết quả: {item.result}</p>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Khu vực */}
      <Dialog
        open={Boolean(editingZone)}
        onClose={() => setEditingZone(null)}
        title={editingZone?.id ? 'Sửa khu vực' : 'Thêm khu vực 5S'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingZone(null)}>
              Huỷ
            </Button>
            <Button variant="primary" loading={pending === 'save-zone'} onClick={saveZone}>
              Lưu
            </Button>
          </>
        }
      >
        {editingZone && (
          <div className="space-y-4">
            <Field label="Tên khu vực" required>
              <Input value={editingZone.name || ''} onChange={event => setEditingZone({ ...editingZone, name: event.target.value })} placeholder="VD: Buồng 201" />
            </Field>
            <FormGrid>
              <Field label="Loại khu vực">
                <Input value={editingZone.type || ''} onChange={event => setEditingZone({ ...editingZone, type: event.target.value })} list="kn-zone-types" />
                <datalist id="kn-zone-types">
                  {['Buồng bệnh', 'Phòng thủ thuật', 'Phòng hành chính', 'Kho', 'Hành lang', 'Nhà vệ sinh'].map(value => (
                    <option key={value} value={value} />
                  ))}
                </datalist>
              </Field>
              <Field label="Người phụ trách">
                <Input value={editingZone.pic || ''} onChange={event => setEditingZone({ ...editingZone, pic: event.target.value })} />
              </Field>
            </FormGrid>
            <Field label="Ghi chú">
              <Textarea value={editingZone.notes || ''} onChange={event => setEditingZone({ ...editingZone, notes: event.target.value })} rows={2} />
            </Field>
          </div>
        )}
      </Dialog>

      {/* Chấm điểm */}
      <Dialog
        open={Boolean(evaluating)}
        onClose={() => setEvaluating(null)}
        title="Chấm điểm 5S"
        description="Mỗi tiêu chí tối đa 20 điểm — tổng 100"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEvaluating(null)}>
              Huỷ
            </Button>
            <Button variant="primary" loading={pending === 'save-eval'} onClick={saveEvaluation}>
              Lưu điểm
            </Button>
          </>
        }
      >
        {evaluating && (
          <div className="space-y-4">
            <FormGrid>
              <Field label="Khu vực" required>
                <Select value={evaluating.zoneId} onChange={event => setEvaluating({ ...evaluating, zoneId: event.target.value })} placeholder="— Chọn —" options={zones.map(zone => ({ value: zone.id, label: zone.name }))} />
              </Field>
              <Field label="Ngày chấm">
                <Input type="date" value={evaluating.date} onChange={event => setEvaluating({ ...evaluating, date: event.target.value })} />
              </Field>
            </FormGrid>
            <div className="space-y-3 rounded-2xl border border-line p-4">
              {CRITERIA.map((label, index) => (
                <label key={label} className="flex items-center gap-3 text-sm">
                  <span className="w-24 shrink-0 text-fg">{label}</span>
                  <input
                    type="range"
                    min={0}
                    max={20}
                    value={evaluating.scores[index]}
                    onChange={event => setEvaluating({ ...evaluating, scores: evaluating.scores.map((value, i) => (i === index ? Number(event.target.value) : value)) })}
                    className="flex-1 accent-[rgb(var(--primary))]"
                  />
                  <span className="num w-8 text-right font-semibold text-fg">{evaluating.scores[index]}</span>
                </label>
              ))}
              <div className="flex items-center justify-between border-t border-line pt-3 text-sm">
                <span className="text-muted">Tổng điểm</span>
                <Badge tone={scoreTone(evaluating.scores.reduce((sum, value) => sum + value, 0))} solid className="num text-sm">
                  {evaluating.scores.reduce((sum, value) => sum + value, 0)}/100
                </Badge>
              </div>
            </div>
            <Field label="Nhận xét">
              <Textarea value={evaluating.comments} onChange={event => setEvaluating({ ...evaluating, comments: event.target.value })} rows={2} />
            </Field>
          </div>
        )}
      </Dialog>

      {/* Cải tiến */}
      <Dialog
        open={Boolean(editingImp)}
        onClose={() => setEditingImp(null)}
        title={editingImp?.id ? 'Sửa đề xuất cải tiến' : 'Đề xuất cải tiến'}
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditingImp(null)}>
              Huỷ
            </Button>
            <Button variant="primary" loading={pending === 'save-imp'} onClick={saveImprovement}>
              Lưu
            </Button>
          </>
        }
      >
        {editingImp && (
          <div className="space-y-4">
            <Field label="Nội dung cải tiến" required>
              <Textarea value={editingImp.content || ''} onChange={event => setEditingImp({ ...editingImp, content: event.target.value })} rows={3} />
            </Field>
            <FormGrid>
              <Field label="Khu vực">
                <Select value={editingImp.zoneId || ''} onChange={event => setEditingImp({ ...editingImp, zoneId: event.target.value })} placeholder="Chung" options={zones.map(zone => ({ value: zone.id, label: zone.name }))} />
              </Field>
              <Field label="Người đề xuất">
                <Input value={editingImp.proposer || ''} onChange={event => setEditingImp({ ...editingImp, proposer: event.target.value })} />
              </Field>
            </FormGrid>
            <Field label="Trạng thái">
              <ChipGroup value={(editingImp.status || 'DeXuat') as Improvement5S['status']} onChange={value => setEditingImp({ ...editingImp, status: value })} options={IMP_COLUMNS.map(col => ({ value: col.status, label: col.label }))} />
            </Field>
            <Field label="Kết quả">
              <Textarea value={editingImp.result || ''} onChange={event => setEditingImp({ ...editingImp, result: event.target.value })} rows={2} />
            </Field>
          </div>
        )}
      </Dialog>
    </div>
  );
};
