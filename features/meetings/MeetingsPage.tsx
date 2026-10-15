import React, { useMemo, useState } from 'react';
import { CalendarPlus, Clock, Edit3, ExternalLink, MapPin, MoreHorizontal, Plus, Presentation, RefreshCw, Trash2, User as UserIcon } from 'lucide-react';
import type { ScientificMeeting } from '../../types';
import { addScientificMeeting, deleteScientificMeeting, getScientificMeetings, updateScientificMeeting } from '../../services/dataService';
import { KEYS } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../lib/resource';
import { fmtDateTime, relativeDay, todayKey, toDateKey, weekdayLong, fmtDate } from '../../lib/dates';
import { matchesQuery, safeUrl } from '../../lib/text';
import { cn } from '../../lib/cn';
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
  SearchInput,
  Segmented,
  SkeletonRows,
  Textarea,
  confirmAction,
  showToast,
} from '../../components/ui';

const findLink = (text?: string) => safeUrl(String(text || '').match(/https?:\/\/\S+/)?.[0]);

/** Tải tệp .ics để thêm buổi sinh hoạt vào lịch cá nhân (Google/Outlook/iPhone). */
const downloadIcs = (meeting: ScientificMeeting) => {
  const raw = String(meeting.time || '');
  const start = new Date(raw.includes('T') ? raw : `${raw}T07:30`);
  if (Number.isNaN(start.getTime())) return showToast('Thời gian buổi sinh hoạt không hợp lệ', 'warning');
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const stamp = (date: Date) => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const escape = (value: unknown) => String(value || '').replace(/[,;\\]/g, match => `\\${match}`).replace(/\n/g, '\\n');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Khoa Ngoai TH//SHKH//VI',
    'BEGIN:VEVENT',
    `UID:${meeting.id}@khoangoai`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(`SHKH: ${meeting.topic}`)}`,
    `LOCATION:${escape(meeting.location)}`,
    `DESCRIPTION:${escape([meeting.presenter && `Trình bày: ${meeting.presenter}`, meeting.notes].filter(Boolean).join('\n'))}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `SHKH_${toDateKey(meeting.time) || 'lich'}.ics`;
  anchor.click();
  URL.revokeObjectURL(url);
};

export const MeetingsPage: React.FC = () => {
  const { data, loading, error, validating, reload } = useResource<ScientificMeeting[]>(KEYS.meetings, async options => (await getScientificMeetings(options)) || []);
  const { run, pending } = useAction();
  const [search, setSearch] = useState('');
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');
  const [editing, setEditing] = useState<Partial<ScientificMeeting> | null>(null);
  const today = todayKey();

  const { upcoming, past } = useMemo(() => {
    const list = (data || []).filter(item => matchesQuery(search, item.topic, item.presenter, item.location, item.notes));
    return {
      upcoming: list.filter(item => toDateKey(item.time) >= today).sort((a, b) => String(a.time).localeCompare(String(b.time))),
      past: list.filter(item => toDateKey(item.time) < today).sort((a, b) => String(b.time).localeCompare(String(a.time))),
    };
  }, [data, search, today]);

  const items = view === 'upcoming' ? upcoming : past;

  const save = async () => {
    if (!editing?.time || !editing.topic?.trim()) return showToast('Nhập thời gian và chủ đề', 'warning');
    const payload = { ...editing, topic: editing.topic.trim() };
    const result = await run('save', () => (payload.id ? updateScientificMeeting(payload.id, payload) : addScientificMeeting(payload as ScientificMeeting)), {
      success: 'Đã lưu lịch sinh hoạt',
      invalidate: [KEYS.meetings, KEYS.ops],
    });
    if (result !== undefined) setEditing(null);
  };

  const remove = async (item: ScientificMeeting) => {
    const ok = await confirmAction({ title: `Xoá buổi "${item.topic}"?`, confirmText: 'Xoá' });
    if (!ok) return;
    await run('delete', () => deleteScientificMeeting(item.id), { success: 'Đã xoá', invalidate: [KEYS.meetings, KEYS.ops] });
    setEditing(null);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sinh hoạt khoa học"
        icon={Presentation}
        description="Lịch sinh hoạt chuyên môn, báo cáo ca bệnh, cập nhật kiến thức"
        actions={
          <>
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={() => reload()} aria-label="Làm mới" />
            <Button variant="primary" icon={Plus} onClick={() => setEditing({ time: `${today}T14:00`, location: 'Phòng giao ban khoa' })}>
              Lên lịch
            </Button>
          </>
        }
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput value={search} onChange={setSearch} placeholder="Tìm chủ đề, người trình bày…" className="sm:w-80" />
        <Segmented
          value={view}
          onChange={setView}
          items={[
            { value: 'upcoming', label: 'Sắp tới', count: upcoming.length },
            { value: 'past', label: 'Đã diễn ra', count: past.length },
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
          <EmptyState
            icon={Presentation}
            title={view === 'upcoming' ? 'Chưa có buổi sinh hoạt sắp tới' : 'Chưa có buổi nào đã diễn ra'}
            action={view === 'upcoming' ? <Button icon={Plus} onClick={() => setEditing({ time: `${today}T14:00` })}>Lên lịch buổi mới</Button> : undefined}
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {items.map((item, index) => {
            const key = toDateKey(item.time);
            const link = findLink(item.notes);
            const next = view === 'upcoming' && index === 0;
            return (
              <div key={item.id} className={cn('card flex gap-4 p-4', next && 'border-primary/40 ring-2 ring-primary/10')}>
                <div className={cn('flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl', next ? 'bg-primary text-primary-fg' : 'bg-sunken text-fg ring-1 ring-line')}>
                  <span className="num text-xl font-semibold leading-none">{key.slice(8, 10) || '—'}</span>
                  <span className={cn('mt-1 text-[11px]', next ? 'text-primary-fg/80' : 'text-muted')}>Th{Number(key.slice(5, 7)) || ''}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start gap-2">
                    <button onClick={() => setEditing(item)} className="min-w-0 flex-1 text-left">
                      <p className="font-semibold text-fg hover:text-primary">{item.topic}</p>
                    </button>
                    <Menu
                      trigger={({ toggle }) => <Button size="xs" variant="ghost" iconOnly icon={MoreHorizontal} onClick={toggle} aria-label="Thao tác" />}
                      items={[
                        { label: 'Sửa', icon: Edit3, onSelect: () => setEditing(item) },
                        { label: 'Thêm vào lịch của tôi', icon: CalendarPlus, onSelect: () => downloadIcs(item) },
                        'divider',
                        { label: 'Xoá', icon: Trash2, danger: true, onSelect: () => remove(item) },
                      ]}
                    />
                  </div>
                  <div className="mt-1.5 space-y-1 text-sm text-muted">
                    <p className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> {weekdayLong(key)}, {fmtDateTime(item.time)}
                      {view === 'upcoming' && <Badge tone={next ? 'primary' : 'neutral'}>{relativeDay(key)}</Badge>}
                    </p>
                    {item.presenter && (
                      <p className="flex items-center gap-1.5">
                        <UserIcon className="h-3.5 w-3.5" /> {item.presenter}
                      </p>
                    )}
                    {item.location && (
                      <p className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" /> {item.location}
                      </p>
                    )}
                  </div>
                  {item.notes && <p className="mt-2 line-clamp-2 text-xs text-muted">{item.notes}</p>}
                  {link && (
                    <a href={link} target="_blank" rel="noreferrer noopener" className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                      <ExternalLink className="h-3 w-3" /> Tài liệu
                    </a>
                  )}
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
        title={editing?.id ? 'Sửa lịch sinh hoạt' : 'Lên lịch sinh hoạt khoa học'}
        subtitle={editing?.time ? `${weekdayLong(toDateKey(editing.time))}, ${fmtDate(editing.time)}` : undefined}
        footer={
          <>
            {editing?.id && (
              <Button variant="danger-soft" icon={Trash2} className="mr-auto" onClick={() => remove(editing as ScientificMeeting)}>
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
            <Field label="Chủ đề" required>
              <Textarea value={editing.topic || ''} onChange={event => setEditing({ ...editing, topic: event.target.value })} rows={2} />
            </Field>
            <FormGrid>
              <Field label="Thời gian" required>
                <Input type="datetime-local" value={String(editing.time || '').slice(0, 16)} onChange={event => setEditing({ ...editing, time: event.target.value })} />
              </Field>
              <Field label="Người trình bày">
                <Input value={editing.presenter || ''} onChange={event => setEditing({ ...editing, presenter: event.target.value })} />
              </Field>
            </FormGrid>
            <Field label="Địa điểm">
              <Input value={editing.location || ''} onChange={event => setEditing({ ...editing, location: event.target.value })} />
            </Field>
            <Field label="Ghi chú / link tài liệu" hint="Dán đường dẫn tài liệu (https://…) để hiển thị nút mở nhanh">
              <Textarea value={editing.notes || ''} onChange={event => setEditing({ ...editing, notes: event.target.value })} rows={3} />
            </Field>
          </div>
        )}
      </Drawer>
    </div>
  );
};
