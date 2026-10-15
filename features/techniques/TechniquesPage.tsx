import React, { useMemo, useState } from 'react';
import { Calendar, Lightbulb, MoreHorizontal, Plus, RefreshCw, Trash2, Edit3, Wand2, User as UserIcon } from 'lucide-react';
import type { NewTechnique } from '../../types';
import { addTechnique, deleteTechnique, getTechniques, updateTechnique } from '../../services/dataService';
import { KEYS, usePatients } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../lib/resource';
import { fmtDate, todayKey } from '../../lib/dates';
import { fold, matchesQuery, toNumber } from '../../lib/text';
import { cn } from '../../lib/cn';
import {
  Badge,
  Button,
  Card,
  ChipGroup,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FormGrid,
  Input,
  Menu,
  PageHeader,
  Progress,
  SearchInput,
  SkeletonRows,
  Textarea,
  confirmAction,
  showToast,
} from '../../components/ui';

type Status = NewTechnique['status'];

const COLUMNS: Array<{ status: Status; label: string; tone: 'neutral' | 'info' | 'success'; dot: string }> = [
  { status: 'DeXuat', label: 'Đề xuất', tone: 'neutral', dot: 'bg-slate-400' },
  { status: 'DangTrienKhai', label: 'Đang triển khai', tone: 'info', dot: 'bg-sky-500' },
  { status: 'HoanThanh', label: 'Hoàn thành', tone: 'success', dot: 'bg-emerald-500' },
];

const normalize = (item: NewTechnique): NewTechnique => ({
  ...item,
  status: (['DeXuat', 'DangTrienKhai', 'HoanThanh'] as Status[]).includes(item.status) ? item.status : 'DeXuat',
  progress: toNumber(item.progress),
  count: toNumber(item.count),
});

export const TechniquesPage: React.FC = () => {
  const { data, loading, error, validating, reload } = useResource<NewTechnique[]>(KEYS.techniques, async options => ((await getTechniques(options)) || []).map(normalize));
  const { data: patients } = usePatients();
  const { run, pending } = useAction();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<NewTechnique> | null>(null);

  const items = useMemo(() => (data || []).filter(item => matchesQuery(search, item.name, item.leader, item.description)), [data, search]);

  /** Đếm số ca có phương pháp phẫu thuật chứa tên kỹ thuật (gợi ý cập nhật số ca). */
  const autoCount = (name?: string) => {
    const key = fold(name);
    if (key.length < 3) return 0;
    return (patients || []).filter(patient => patient.actualSurgeryDate && fold(patient.surgeryMethod).includes(key)).length;
  };

  const save = async () => {
    if (!editing?.name?.trim()) return showToast('Nhập tên kỹ thuật', 'warning');
    const payload = { ...editing, name: editing.name.trim(), progress: editing.status === 'HoanThanh' ? 100 : toNumber(editing.progress) };
    const result = await run('save', () => (payload.id ? updateTechnique(payload.id, payload) : addTechnique(payload as NewTechnique)), {
      success: 'Đã lưu kỹ thuật',
      invalidate: [KEYS.techniques],
    });
    if (result !== undefined) setEditing(null);
  };

  const move = (item: NewTechnique, status: Status) =>
    run(`move-${item.id}`, () => updateTechnique(item.id, { status, progress: status === 'HoanThanh' ? 100 : item.progress }), {
      success: `Đã chuyển sang "${COLUMNS.find(col => col.status === status)?.label}"`,
      invalidate: [KEYS.techniques],
    });

  const remove = async (item: NewTechnique) => {
    const ok = await confirmAction({ title: `Xoá kỹ thuật "${item.name}"?`, confirmText: 'Xoá' });
    if (!ok) return;
    await run('delete', () => deleteTechnique(item.id), { success: 'Đã xoá', invalidate: [KEYS.techniques] });
    setEditing(null);
  };

  const suggested = autoCount(editing?.name);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kỹ thuật mới"
        icon={Lightbulb}
        description="Theo dõi đề xuất, triển khai và kết quả kỹ thuật mới của khoa"
        actions={
          <>
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={() => reload()} aria-label="Làm mới" />
            <Button variant="primary" icon={Plus} onClick={() => setEditing({ status: 'DeXuat', startDate: todayKey(), progress: 0, count: 0 })}>
              Thêm kỹ thuật
            </Button>
          </>
        }
      />
      <SearchInput value={search} onChange={setSearch} placeholder="Tìm kỹ thuật, người phụ trách…" className="sm:w-80" />

      {error && !data ? (
        <Card>
          <ErrorState error={error} onRetry={() => reload()} />
        </Card>
      ) : loading ? (
        <Card>
          <SkeletonRows />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {COLUMNS.map(column => {
            const list = items.filter(item => item.status === column.status);
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
                  <ul className="space-y-2.5">
                    {list.map(item => (
                      <li key={item.id} className="card group p-3.5">
                        <div className="flex items-start gap-2">
                          <button onClick={() => setEditing(item)} className="min-w-0 flex-1 text-left">
                            <p className="font-medium text-fg group-hover:text-primary">{item.name}</p>
                            {item.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted">{item.description}</p>}
                          </button>
                          <Menu
                            trigger={({ toggle }) => <Button size="xs" variant="ghost" iconOnly icon={MoreHorizontal} onClick={toggle} aria-label="Thao tác" />}
                            items={[
                              { label: 'Sửa', icon: Edit3, onSelect: () => setEditing(item) },
                              ...COLUMNS.filter(col => col.status !== item.status).map(col => ({ label: `Chuyển: ${col.label}`, onSelect: () => move(item, col.status) })),
                              'divider' as const,
                              { label: 'Xoá', icon: Trash2, danger: true, onSelect: () => remove(item) },
                            ]}
                          />
                        </div>
                        <Progress value={item.progress} className="mt-3" showLabel />
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                          {item.leader && (
                            <span className="inline-flex items-center gap-1">
                              <UserIcon className="h-3 w-3" /> {item.leader}
                            </span>
                          )}
                          {item.startDate && (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" /> {fmtDate(item.startDate)}
                            </span>
                          )}
                          <Badge tone="violet">{item.count} ca</Badge>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        persistent
        title={editing?.id ? 'Cập nhật kỹ thuật' : 'Thêm kỹ thuật mới'}
        footer={
          <>
            {editing?.id && (
              <Button variant="danger-soft" icon={Trash2} className="mr-auto" onClick={() => remove(editing as NewTechnique)}>
                Xoá
              </Button>
            )}
            <Button variant="ghost" onClick={() => setEditing(null)}>
              Huỷ
            </Button>
            <Button variant="primary" loading={pending === 'save'} onClick={save}>
              Lưu
            </Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            <Field label="Tên kỹ thuật" required>
              <Input value={editing.name || ''} onChange={event => setEditing({ ...editing, name: event.target.value })} placeholder="VD: TOETVA" />
            </Field>
            <FormGrid>
              <Field label="Người phụ trách">
                <Input value={editing.leader || ''} onChange={event => setEditing({ ...editing, leader: event.target.value })} />
              </Field>
              <Field label="Ngày bắt đầu">
                <Input type="date" value={editing.startDate || ''} onChange={event => setEditing({ ...editing, startDate: event.target.value })} />
              </Field>
            </FormGrid>
            <Field label="Trạng thái">
              <ChipGroup value={(editing.status || 'DeXuat') as Status} onChange={value => setEditing({ ...editing, status: value })} options={COLUMNS.map(col => ({ value: col.status, label: col.label }))} />
            </Field>
            <FormGrid>
              <Field label={`Tiến độ: ${toNumber(editing.progress)}%`}>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={toNumber(editing.progress)}
                  onChange={event => setEditing({ ...editing, progress: Number(event.target.value) })}
                  className="mt-2 w-full accent-[rgb(var(--primary))]"
                />
              </Field>
              <Field
                label="Số ca đã thực hiện"
                hint={
                  suggested > 0 && suggested !== toNumber(editing.count) ? (
                    <button type="button" onClick={() => setEditing({ ...editing, count: suggested })} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                      <Wand2 className="h-3 w-3" /> Hồ sơ phẫu thuật ghi nhận {suggested} ca — cập nhật
                    </button>
                  ) : undefined
                }
              >
                <Input type="number" min={0} value={toNumber(editing.count)} onChange={event => setEditing({ ...editing, count: Number(event.target.value) })} />
              </Field>
            </FormGrid>
            <Field label="Mô tả">
              <Textarea value={editing.description || ''} onChange={event => setEditing({ ...editing, description: event.target.value })} rows={3} />
            </Field>
            <Field label="Kết quả đạt được">
              <Textarea value={editing.results || ''} onChange={event => setEditing({ ...editing, results: event.target.value })} rows={3} />
            </Field>
          </div>
        )}
      </Drawer>
    </div>
  );
};
