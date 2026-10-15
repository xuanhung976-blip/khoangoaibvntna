import React, { useMemo, useState } from 'react';
import { BookOpen, Calendar, Database, Edit3, FileSpreadsheet, MoreHorizontal, Plus, RefreshCw, Trash2, User as UserIcon } from 'lucide-react';
import type { ResearchTopic } from '../../types';
import { addResearchTopic, deleteResearchTopic, getResearchTopics, updateResearchTopic } from '../../services/dataService';
import { KEYS } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../lib/resource';
import { diffDays, fmtDate, todayKey, toDateKey } from '../../lib/dates';
import { matchesQuery, toNumber } from '../../lib/text';
import { exportToExcel } from '../../utils/exportUtils';
import {
  Badge,
  Button,
  Card,
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
  Segmented,
  SkeletonRows,
  Textarea,
  confirmAction,
  showToast,
} from '../../components/ui';
import { SampleExplorer } from './SampleExplorer';

type Filter = 'all' | 'active' | 'overdue' | 'done';

const statusOf = (topic: ResearchTopic, today: string): Exclude<Filter, 'all'> => {
  if (toNumber(topic.progress) >= 100) return 'done';
  const deadline = toDateKey(topic.deadline);
  return deadline && deadline < today ? 'overdue' : 'active';
};

const STATUS_META = {
  active: { label: 'Đang thực hiện', tone: 'info' as const },
  overdue: { label: 'Quá hạn', tone: 'danger' as const },
  done: { label: 'Hoàn thành', tone: 'success' as const },
};

export const ResearchPage: React.FC = () => {
  const { data, loading, error, validating, reload } = useResource<ResearchTopic[]>(KEYS.research, async options => (await getResearchTopics(options)) || []);
  const { run, pending } = useAction();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [editing, setEditing] = useState<Partial<ResearchTopic> | null>(null);
  const [exploring, setExploring] = useState<ResearchTopic | null>(null);
  const today = todayKey();

  const topics = useMemo(() => (data || []).filter(Boolean), [data]);
  const counts = useMemo(() => {
    const result = { all: topics.length, active: 0, overdue: 0, done: 0 };
    topics.forEach(topic => result[statusOf(topic, today)]++);
    return result;
  }, [topics, today]);
  const items = useMemo(
    () =>
      topics
        .filter(topic => (filter === 'all' || statusOf(topic, today) === filter) && matchesQuery(search, topic.topic, topic.author, topic.notes))
        .sort((a, b) => (toDateKey(a.deadline) || '9999').localeCompare(toDateKey(b.deadline) || '9999')),
    [topics, filter, search, today],
  );

  const save = async () => {
    if (!editing?.topic?.trim()) return showToast('Nhập tên đề tài', 'warning');
    const payload = { ...editing, topic: editing.topic.trim(), progress: toNumber(editing.progress) };
    const result = await run('save', () => (payload.id ? updateResearchTopic(payload.id, payload) : addResearchTopic(payload as ResearchTopic)), {
      success: 'Đã lưu đề tài',
      invalidate: [KEYS.research, KEYS.ops],
    });
    if (result !== undefined) setEditing(null);
  };

  const remove = async (topic: ResearchTopic) => {
    const ok = await confirmAction({ title: 'Xoá đề tài này?', message: topic.topic, confirmText: 'Xoá' });
    if (!ok) return;
    await run('delete', () => deleteResearchTopic(topic.id), { success: 'Đã xoá đề tài', invalidate: [KEYS.research, KEYS.ops] });
    setEditing(null);
  };

  const exportTopics = () => {
    if (!topics.length) return showToast('Chưa có đề tài để xuất', 'warning');
    exportToExcel({
      fileName: 'Danh_sach_de_tai_NCKH',
      sheetName: 'Đề tài NCKH',
      title: 'DANH SÁCH ĐỀ TÀI NGHIÊN CỨU KHOA HỌC',
      subtitle: `Tổng số: ${topics.length} đề tài · Ngày xuất ${fmtDate(today)}`,
      headers: ['STT', 'Tên đề tài', 'Chủ nhiệm', 'Bắt đầu', 'Hạn nghiệm thu', 'Tiến độ', 'Trạng thái', 'Ghi chú'],
      rows: topics.map((topic, index) => [
        index + 1,
        topic.topic,
        topic.author,
        fmtDate(topic.startDate, ''),
        fmtDate(topic.deadline, ''),
        `${toNumber(topic.progress)}%`,
        STATUS_META[statusOf(topic, today)].label,
        topic.notes || '',
      ]),
      signers: ['NGƯỜI LẬP', 'TRƯỞNG KHOA'],
    });
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Đề tài nghiên cứu khoa học"
        icon={BookOpen}
        description="Quản lý tiến độ đề tài và trích xuất mẫu nghiên cứu từ dữ liệu lâm sàng"
        actions={
          <>
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={() => reload()} aria-label="Làm mới" />
            <Button icon={FileSpreadsheet} onClick={exportTopics} className="hidden sm:inline-flex">
              Excel
            </Button>
            <Button variant="primary" icon={Plus} onClick={() => setEditing({ startDate: today, progress: 0 })}>
              Thêm đề tài
            </Button>
          </>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm đề tài, chủ nhiệm…" className="sm:w-80" />
        <Segmented
          value={filter}
          onChange={setFilter}
          items={[
            { value: 'all', label: 'Tất cả', count: counts.all },
            { value: 'active', label: 'Đang làm', count: counts.active },
            { value: 'overdue', label: 'Quá hạn', count: counts.overdue },
            { value: 'done', label: 'Hoàn thành', count: counts.done },
          ]}
        />
      </div>

      {error && !data ? (
        <Card>
          <ErrorState error={error} onRetry={() => reload()} />
        </Card>
      ) : loading ? (
        <Card>
          <SkeletonRows />
        </Card>
      ) : items.length === 0 ? (
        <Card>
          <EmptyState icon={BookOpen} title="Không có đề tài phù hợp" action={<Button icon={Plus} onClick={() => setEditing({ startDate: today, progress: 0 })}>Thêm đề tài</Button>} />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {items.map(topic => {
            const status = statusOf(topic, today);
            const deadline = toDateKey(topic.deadline);
            const left = deadline ? diffDays(today, deadline) : null;
            return (
              <div key={topic.id} className="card flex flex-col p-4">
                <div className="flex items-start gap-2">
                  <button onClick={() => setEditing(topic)} className="min-w-0 flex-1 text-left">
                    <p className="font-semibold leading-snug text-fg hover:text-primary">{topic.topic}</p>
                  </button>
                  <Badge tone={STATUS_META[status].tone}>{STATUS_META[status].label}</Badge>
                  <Menu
                    trigger={({ toggle }) => <Button size="xs" variant="ghost" iconOnly icon={MoreHorizontal} onClick={toggle} aria-label="Thao tác" />}
                    items={[
                      { label: 'Sửa', icon: Edit3, onSelect: () => setEditing(topic) },
                      { label: 'Trích xuất mẫu', icon: Database, onSelect: () => setExploring(topic) },
                      'divider',
                      { label: 'Xoá', icon: Trash2, danger: true, onSelect: () => remove(topic) },
                    ]}
                  />
                </div>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
                  {topic.author && (
                    <span className="inline-flex items-center gap-1">
                      <UserIcon className="h-3 w-3" /> {topic.author}
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> {fmtDate(topic.startDate)} → {fmtDate(topic.deadline)}
                  </span>
                  {left !== null && status !== 'done' && (
                    <span className={left < 0 ? 'font-semibold text-rose-600' : left <= 30 ? 'font-semibold text-amber-600' : ''}>{left < 0 ? `Quá hạn ${-left} ngày` : `Còn ${left} ngày`}</span>
                  )}
                </div>
                <Progress value={toNumber(topic.progress)} className="mt-3" size="md" showLabel />
                {topic.notes && <p className="mt-2 line-clamp-2 text-xs text-muted">{topic.notes}</p>}
                <div className="mt-3 flex justify-end border-t border-line pt-3">
                  <Button size="sm" variant="soft" icon={Database} onClick={() => setExploring(topic)}>
                    Trích xuất mẫu nghiên cứu
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        persistent
        title={editing?.id ? 'Cập nhật đề tài' : 'Đề tài mới'}
        footer={
          <>
            {editing?.id && (
              <Button variant="danger-soft" icon={Trash2} className="mr-auto" onClick={() => remove(editing as ResearchTopic)}>
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
            <Field label="Tên đề tài" required>
              <Textarea value={editing.topic || ''} onChange={event => setEditing({ ...editing, topic: event.target.value })} rows={3} />
            </Field>
            <Field label="Chủ nhiệm đề tài">
              <Input value={editing.author || ''} onChange={event => setEditing({ ...editing, author: event.target.value })} />
            </Field>
            <FormGrid>
              <Field label="Ngày bắt đầu">
                <Input type="date" value={toDateKey(editing.startDate) || ''} onChange={event => setEditing({ ...editing, startDate: event.target.value })} />
              </Field>
              <Field label="Hạn nghiệm thu">
                <Input type="date" value={toDateKey(editing.deadline) || ''} onChange={event => setEditing({ ...editing, deadline: event.target.value })} />
              </Field>
            </FormGrid>
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
            <Field label="Ghi chú">
              <Textarea value={editing.notes || ''} onChange={event => setEditing({ ...editing, notes: event.target.value })} rows={3} />
            </Field>
          </div>
        )}
      </Drawer>

      <SampleExplorer topic={exploring} onClose={() => setExploring(null)} />
    </div>
  );
};
