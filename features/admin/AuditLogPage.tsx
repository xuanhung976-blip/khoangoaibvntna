import React, { useMemo, useState } from 'react';
import { ChevronDown, History, RefreshCw, XCircle } from 'lucide-react';
import type { AuditLog } from '../../types';
import { getRecentAuditLogs } from '../../services/dataService';
import { KEYS } from '../../hooks/useData';
import { useResource } from '../../lib/resource';
import { fmtDateTime } from '../../lib/dates';
import { matchesQuery } from '../../lib/text';
import { cn } from '../../lib/cn';
import { Avatar, Badge, Button, Card, EmptyState, ErrorState, PageHeader, SearchInput, Select, SkeletonRows, Toolbar } from '../../components/ui';

const ACTION_META: Record<string, { label: string; tone: 'success' | 'info' | 'danger' | 'warning' | 'violet' | 'neutral' }> = {
  create: { label: 'Tạo mới', tone: 'success' },
  update: { label: 'Cập nhật', tone: 'info' },
  delete: { label: 'Xoá', tone: 'danger' },
  approve: { label: 'Duyệt mổ', tone: 'violet' },
  reset_password: { label: 'Đặt lại MK', tone: 'warning' },
  activate: { label: 'Mở khoá', tone: 'success' },
  deactivate: { label: 'Khoá', tone: 'warning' },
  change_progress_status: { label: 'Cập nhật tiến độ', tone: 'info' },
  batch_upsert: { label: 'Cập nhật hàng loạt', tone: 'info' },
  batch_create: { label: 'Tạo hàng loạt', tone: 'success' },
  view: { label: 'Xem', tone: 'neutral' },
  login: { label: 'Đăng nhập', tone: 'neutral' },
};

const MODULE_LABELS: Record<string, string> = {
  patients: 'Bệnh nhân',
  clinical: 'Bệnh nhân',
  surgery: 'Phẫu thuật',
  users: 'Người dùng',
  permissions: 'Phân quyền',
  briefing: 'Giao ban',
  staff_tasks: 'Công việc',
  staff_evaluations: 'Đánh giá NV',
  staff_rewards: 'Thưởng/phạt NV',
  inventory: 'Kho',
  '5s': '5S',
  research: 'NCKH',
  meetings: 'SHKH',
  nursing: 'Lịch trực',
  nursing_tasks: 'Điều dưỡng',
  new_techniques: 'Kỹ thuật mới',
  communication: 'Truyền thông',
  config: 'Cấu hình',
};

const parseChanges = (json?: string): Array<{ field: string; before: unknown; after: unknown }> => {
  if (!json) return [];
  try {
    const value = JSON.parse(json);
    return Object.entries(value || {}).map(([field, change]: [string, any]) => ({ field, before: change?.before, after: change?.after }));
  } catch {
    return [];
  }
};

const show = (value: unknown) => {
  const text = value === undefined || value === null || value === '' ? '∅' : typeof value === 'object' ? JSON.stringify(value) : String(value);
  return text.length > 160 ? `${text.slice(0, 160)}…` : text;
};

export const AuditLogPage: React.FC = () => {
  const [limit, setLimit] = useState(300);
  const { data, loading, error, validating, reload } = useResource<AuditLog[]>(`${KEYS.audit}:${limit}`, () => getRecentAuditLogs(limit), { staleMs: 15_000 });
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');
  const [onlyFailed, setOnlyFailed] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const logs = useMemo(() => data || [], [data]);
  const modules = useMemo(() => Array.from(new Set(logs.map(item => item.module).filter(Boolean))).sort(), [logs]);
  const actions = useMemo(() => Array.from(new Set(logs.map(item => item.action).filter(Boolean))).sort(), [logs]);
  const rows = useMemo(
    () =>
      logs.filter(
        item =>
          (!module || item.module === module) &&
          (!action || item.action === action) &&
          (!onlyFailed || item.status === 'failed') &&
          matchesQuery(search, item.actorName, item.actorUsername, item.entityLabel, item.entityId, item.errorMessage),
      ),
    [logs, module, action, onlyFailed, search],
  );

  return (
    <div className="space-y-5">
      <PageHeader
        title="Nhật ký hoạt động"
        icon={History}
        description="Mọi thao tác thêm / sửa / xoá được ghi lại tự động — chỉ Trưởng khoa xem được"
        actions={
          <>
            <Select value={String(limit)} onChange={event => setLimit(Number(event.target.value))} className="h-9 w-40" options={['100', '300', '1000'].map(value => ({ value, label: `${value} bản ghi gần nhất` }))} />
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={() => reload()} aria-label="Làm mới" />
          </>
        }
      />
      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm người thao tác, đối tượng…" className="sm:w-72" />
          <Select value={module} onChange={event => setModule(event.target.value)} placeholder="Mọi phân hệ" className="h-9 sm:w-44" options={modules.map(value => ({ value, label: MODULE_LABELS[value] || value }))} />
          <Select value={action} onChange={event => setAction(event.target.value)} placeholder="Mọi thao tác" className="h-9 sm:w-44" options={actions.map(value => ({ value, label: ACTION_META[value]?.label || value }))} />
          <Button size="sm" variant={onlyFailed ? 'soft' : 'ghost'} icon={XCircle} onClick={() => setOnlyFailed(value => !value)}>
            Chỉ lỗi / bị từ chối
          </Button>
        </Toolbar>
        {error && !data ? (
          <ErrorState error={error} onRetry={() => reload()} />
        ) : loading ? (
          <SkeletonRows />
        ) : rows.length === 0 ? (
          <EmptyState icon={History} title="Không có bản ghi phù hợp" />
        ) : (
          <ul className="divide-y divide-line">
            {rows.map(item => {
              const meta = ACTION_META[item.action] || { label: item.action, tone: 'neutral' as const };
              const changes = parseChanges(item.changesJson);
              const open = expanded === item.id;
              return (
                <li key={item.id}>
                  <button onClick={() => setExpanded(open ? null : item.id)} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-sunken/60 sm:px-5">
                    <Avatar name={item.actorName || item.actorUsername || '?'} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                        <span className="font-medium text-fg">{item.actorName || item.actorUsername || 'Hệ thống'}</span>
                        <Badge tone={meta.tone}>{meta.label}</Badge>
                        <span className="text-muted">{MODULE_LABELS[item.module] || item.module}</span>
                        {item.status === 'failed' && <Badge tone="danger">Thất bại</Badge>}
                      </div>
                      <p className="mt-0.5 truncate text-sm text-fg">{item.entityLabel || item.entityId || '—'}</p>
                      <p className="text-xs text-faint">
                        {fmtDateTime(item.timestamp)}
                        {changes.length > 0 && ` · ${changes.length} trường thay đổi`}
                        {item.ip && ` · ${item.ip}`}
                      </p>
                    </div>
                    {(changes.length > 0 || item.errorMessage) && <ChevronDown className={cn('mt-1 h-4 w-4 shrink-0 text-faint transition-transform', open && 'rotate-180')} />}
                  </button>
                  {open && (
                    <div className="space-y-2 bg-sunken/40 px-4 pb-4 pl-[60px] sm:px-5 sm:pl-[64px]">
                      {item.errorMessage && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">{item.errorMessage}</p>}
                      {changes.length > 0 && (
                        <div className="overflow-x-auto rounded-xl border border-line bg-surface">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="border-b border-line text-muted">
                                <th className="px-3 py-1.5 text-left font-semibold">Trường</th>
                                <th className="px-3 py-1.5 text-left font-semibold">Trước</th>
                                <th className="px-3 py-1.5 text-left font-semibold">Sau</th>
                              </tr>
                            </thead>
                            <tbody>
                              {changes.map(change => (
                                <tr key={change.field} className="border-b border-line/60 last:border-0">
                                  <td className="px-3 py-1.5 font-mono text-muted">{change.field}</td>
                                  <td className="px-3 py-1.5 text-rose-600 line-through decoration-rose-300 dark:text-rose-400">{show(change.before)}</td>
                                  <td className="px-3 py-1.5 text-emerald-700 dark:text-emerald-300">{show(change.after)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
};
