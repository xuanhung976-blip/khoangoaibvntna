import React, { useMemo, useState } from 'react';
import { Edit3, ExternalLink, Megaphone, MoreHorizontal, Plus, RefreshCw, Trash2 } from 'lucide-react';
import type { CommunicationContent } from '../../types';
import { addCommunication, deleteCommunication, getCommunication, updateCommunication } from '../../services/dataService';
import { useApp } from '../../context/AppContext';
import { KEYS } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../lib/resource';
import { fmtDate, fmtMonth, relativeDay, todayKey, toDateKey } from '../../lib/dates';
import { matchesQuery, safeUrl } from '../../lib/text';
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
  SearchInput,
  Segmented,
  SkeletonRows,
  Textarea,
  confirmAction,
  showToast,
} from '../../components/ui';

type Status = CommunicationContent['status'];
const STATUS_META: Record<Status, { label: string; tone: 'neutral' | 'info' | 'success' }> = {
  Nhap: { label: 'Nháp', tone: 'neutral' },
  Duyet: { label: 'Đã duyệt', tone: 'info' },
  DaDang: { label: 'Đã đăng', tone: 'success' },
};
const PLATFORMS: CommunicationContent['platform'][] = ['Facebook', 'Website', 'Zalo', 'Báo chí'];
const PLATFORM_TONE: Record<string, 'info' | 'primary' | 'violet' | 'warning'> = { Facebook: 'info', Website: 'primary', Zalo: 'violet', 'Báo chí': 'warning' };

export const CommunicationPage: React.FC = () => {
  const { user } = useApp();
  const { data, loading, error, validating, reload } = useResource<CommunicationContent[]>(KEYS.comms, async options => (await getCommunication(options)) || []);
  const { run, pending } = useAction();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | Status>('all');
  const [editing, setEditing] = useState<Partial<CommunicationContent> | null>(null);

  const items = useMemo(
    () =>
      (data || [])
        .filter(item => (status === 'all' || item.status === status) && matchesQuery(search, item.title, item.content, item.leader, item.platform))
        .sort((a, b) => toDateKey(b.publishDate).localeCompare(toDateKey(a.publishDate))),
    [data, search, status],
  );

  const groups = useMemo(() => {
    const map = new Map<string, CommunicationContent[]>();
    items.forEach(item => {
      const key = toDateKey(item.publishDate).slice(0, 7) || 'none';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });
    return Array.from(map.entries());
  }, [items]);

  const counts = useMemo(() => {
    const result: Record<string, number> = { Nhap: 0, Duyet: 0, DaDang: 0 };
    (data || []).forEach(item => (result[item.status] = (result[item.status] || 0) + 1));
    return result;
  }, [data]);

  const save = async () => {
    if (!editing?.title?.trim()) return showToast('Nhập tiêu đề bài viết', 'warning');
    const payload = { ...editing, title: editing.title.trim() };
    const result = await run('save', () => (payload.id ? updateCommunication(payload.id, payload) : addCommunication(payload as CommunicationContent)), {
      success: 'Đã lưu nội dung',
      invalidate: [KEYS.comms],
    });
    if (result !== undefined) setEditing(null);
  };

  const remove = async (item: CommunicationContent) => {
    const ok = await confirmAction({ title: `Xoá "${item.title}"?`, confirmText: 'Xoá' });
    if (!ok) return;
    await run('delete', () => deleteCommunication(item.id), { success: 'Đã xoá', invalidate: [KEYS.comms] });
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Truyền thông"
        icon={Megaphone}
        description="Kế hoạch nội dung & bài đăng trên các kênh của khoa"
        actions={
          <>
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={() => reload()} aria-label="Làm mới" />
            <Button variant="primary" icon={Plus} onClick={() => setEditing({ status: 'Nhap', platform: 'Facebook', publishDate: todayKey(), leader: user.fullName })}>
              Thêm nội dung
            </Button>
          </>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm tiêu đề, nội dung…" className="sm:w-80" />
        <Segmented
          value={status}
          onChange={setStatus}
          items={[
            { value: 'all', label: 'Tất cả', count: data?.length || 0 },
            { value: 'Nhap', label: 'Nháp', count: counts.Nhap },
            { value: 'Duyet', label: 'Đã duyệt', count: counts.Duyet },
            { value: 'DaDang', label: 'Đã đăng', count: counts.DaDang },
          ]}
        />
      </div>

      <Card className="overflow-hidden">
        {error && !data ? (
          <ErrorState error={error} onRetry={() => reload()} />
        ) : loading ? (
          <SkeletonRows />
        ) : groups.length === 0 ? (
          <EmptyState icon={Megaphone} title="Chưa có nội dung truyền thông" />
        ) : (
          groups.map(([month, list]) => (
            <section key={month}>
              <p className="border-b border-line bg-sunken/60 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted">{month === 'none' ? 'Chưa có ngày đăng' : fmtMonth(month)}</p>
              <ul className="divide-y divide-line">
                {list.map(item => {
                  const meta = STATUS_META[item.status] || STATUS_META.Nhap;
                  return (
                    <li key={item.id} className="group flex items-start gap-4 px-4 py-3 hover:bg-sunken/60 sm:px-5">
                      <div className="w-14 shrink-0 text-center">
                        <p className="num text-lg font-semibold leading-tight text-fg">{toDateKey(item.publishDate).slice(8, 10) || '—'}</p>
                        <p className="text-[11px] text-muted">{relativeDay(item.publishDate)}</p>
                      </div>
                      <button onClick={() => setEditing(item)} className="min-w-0 flex-1 text-left">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-fg group-hover:text-primary">{item.title}</p>
                          <Badge tone={PLATFORM_TONE[item.platform] || 'neutral'}>{item.platform}</Badge>
                          <Badge tone={meta.tone} dot>
                            {meta.label}
                          </Badge>
                        </div>
                        {item.content && <p className="mt-0.5 line-clamp-2 text-sm text-muted">{item.content}</p>}
                        <p className="mt-1 text-xs text-faint">
                          {item.leader && `Phụ trách: ${item.leader} · `}
                          {fmtDate(item.publishDate)}
                        </p>
                      </button>
                      <div className="flex items-center gap-1">
                        {safeUrl(item.link) && (
                          <a href={safeUrl(item.link)} target="_blank" rel="noreferrer noopener" className="rounded-lg p-1.5 text-muted hover:bg-sunken hover:text-primary" title="Mở bài viết">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                        <Menu
                          trigger={({ toggle }) => <Button size="sm" variant="ghost" iconOnly icon={MoreHorizontal} onClick={toggle} aria-label="Thao tác" />}
                          items={[
                            { label: 'Sửa', icon: Edit3, onSelect: () => setEditing(item) },
                            ...(Object.keys(STATUS_META) as Status[])
                              .filter(value => value !== item.status)
                              .map(value => ({
                                label: `Chuyển: ${STATUS_META[value].label}`,
                                onSelect: () => run(`status-${item.id}`, () => updateCommunication(item.id, { status: value }), { success: 'Đã cập nhật', invalidate: [KEYS.comms] }),
                              })),
                            'divider' as const,
                            { label: 'Xoá', icon: Trash2, danger: true, onSelect: () => remove(item) },
                          ]}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </Card>

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        persistent
        title={editing?.id ? 'Sửa nội dung' : 'Nội dung truyền thông mới'}
        footer={
          <>
            {editing?.id && (
              <Button variant="danger-soft" icon={Trash2} className="mr-auto" onClick={() => remove(editing as CommunicationContent)}>
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
            <Field label="Tiêu đề" required>
              <Input value={editing.title || ''} onChange={event => setEditing({ ...editing, title: event.target.value })} />
            </Field>
            <Field label="Kênh">
              <ChipGroup value={(editing.platform || 'Facebook') as CommunicationContent['platform']} onChange={value => setEditing({ ...editing, platform: value })} options={PLATFORMS.map(value => ({ value, label: value }))} />
            </Field>
            <FormGrid>
              <Field label="Ngày đăng">
                <Input type="date" value={toDateKey(editing.publishDate) || ''} onChange={event => setEditing({ ...editing, publishDate: event.target.value })} />
              </Field>
              <Field label="Người phụ trách">
                <Input value={editing.leader || ''} onChange={event => setEditing({ ...editing, leader: event.target.value })} />
              </Field>
            </FormGrid>
            <Field label="Trạng thái">
              <ChipGroup value={(editing.status || 'Nhap') as Status} onChange={value => setEditing({ ...editing, status: value })} options={(Object.keys(STATUS_META) as Status[]).map(value => ({ value, label: STATUS_META[value].label }))} />
            </Field>
            <Field label="Nội dung / tóm tắt">
              <Textarea value={editing.content || ''} onChange={event => setEditing({ ...editing, content: event.target.value })} rows={5} />
            </Field>
            <Field label="Liên kết bài viết">
              <Input type="url" value={editing.link || ''} onChange={event => setEditing({ ...editing, link: event.target.value })} placeholder="https://…" />
            </Field>
          </div>
        )}
      </Drawer>
    </div>
  );
};
