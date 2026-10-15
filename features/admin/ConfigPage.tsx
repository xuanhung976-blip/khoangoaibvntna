import React, { useMemo, useState } from 'react';
import { Edit3, Plus, RefreshCw, Settings2, Trash2 } from 'lucide-react';
import type { SystemConfig } from '../../types';
import { addConfig, deleteConfig, getConfigs, saveConfig } from '../../services/dataService';
import { KEYS } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../lib/resource';
import { matchesQuery } from '../../lib/text';
import { Button, Card, DataTable, Dialog, EmptyState, ErrorState, Field, Input, PageHeader, RowActions, SearchInput, Textarea, Toolbar, confirmAction, showToast, type Column } from '../../components/ui';

export const ConfigPage: React.FC = () => {
  const { data, loading, error, validating, reload } = useResource<SystemConfig[]>(KEYS.configs, async options => ((await getConfigs(options)) || []).filter(item => item && item.key));
  const { run, pending } = useAction();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<{ form: Partial<SystemConfig>; isNew: boolean } | null>(null);

  const rows = useMemo(() => (data || []).filter(item => matchesQuery(search, item.key, item.value, item.description)), [data, search]);

  const save = async () => {
    if (!editing) return;
    const key = String(editing.form.key || '').trim().toUpperCase().replace(/[^A-Z0-9_]/g, '_');
    const value = String(editing.form.value ?? '');
    if (!key || !value.trim()) return showToast('Nhập mã và giá trị cấu hình', 'warning');
    if (editing.isNew && (data || []).some(item => item.key === key)) return showToast(`Mã "${key}" đã tồn tại`, 'warning');
    const payload: SystemConfig = { key, value, description: editing.form.description || '' };
    const result = await run('save', () => (editing.isNew ? addConfig(payload) : saveConfig(payload)), { success: 'Đã lưu cấu hình', invalidate: [KEYS.configs] });
    if (result !== undefined) setEditing(null);
  };

  const remove = async (item: SystemConfig) => {
    if (!(await confirmAction({ title: `Xoá cấu hình ${item.key}?`, message: 'Chức năng đang dùng mã này có thể hoạt động sai.', confirmText: 'Xoá' }))) return;
    await run('delete', () => deleteConfig(item.key), { success: 'Đã xoá cấu hình', invalidate: [KEYS.configs] });
  };

  const columns: Column<SystemConfig>[] = [
    { key: 'key', header: 'Mã', sort: item => item.key, cell: item => <span className="font-mono text-[13px] font-semibold text-fg">{item.key}</span> },
    { key: 'value', header: 'Giá trị', cell: item => <span className="line-clamp-2 whitespace-pre-line text-sm text-primary">{item.value}</span> },
    { key: 'description', header: 'Mô tả', hideBelow: 'md', cell: item => <span className="text-sm text-muted">{item.description}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: item => (
        <RowActions>
          <Button size="sm" variant="ghost" iconOnly icon={Edit3} onClick={() => setEditing({ form: { ...item }, isNew: false })} aria-label="Sửa" />
          <Button size="sm" variant="danger-soft" iconOnly icon={Trash2} onClick={() => remove(item)} aria-label="Xoá" />
        </RowActions>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cấu hình hệ thống"
        icon={Settings2}
        description="Các tham số dùng chung (lưu ở sheet Config)"
        actions={
          <>
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={() => reload()} aria-label="Làm mới" />
            <Button variant="primary" icon={Plus} onClick={() => setEditing({ form: { key: '', value: '', description: '' }, isNew: true })}>
              Thêm cấu hình
            </Button>
          </>
        }
      />
      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm mã, giá trị…" className="sm:w-72" />
        </Toolbar>
        {error && !data ? (
          <ErrorState error={error} onRetry={() => reload()} />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={item => item.key}
            loading={loading}
            onRowClick={item => setEditing({ form: { ...item }, isNew: false })}
            empty={<EmptyState icon={Settings2} title="Chưa có cấu hình nào" />}
          />
        )}
      </Card>
      <Dialog
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title={editing?.isNew ? 'Thêm cấu hình' : `Sửa ${editing?.form.key}`}
        footer={
          <>
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
            <Field label="Mã (KEY)" required hint="Viết hoa, không dấu, nối bằng gạch dưới — VD: TEN_KHOA">
              <Input
                value={editing.form.key || ''}
                disabled={!editing.isNew}
                onChange={event => setEditing({ ...editing, form: { ...editing.form, key: event.target.value.toUpperCase() } })}
                className="font-mono"
              />
            </Field>
            <Field label="Giá trị" required>
              <Textarea value={editing.form.value || ''} onChange={event => setEditing({ ...editing, form: { ...editing.form, value: event.target.value } })} rows={3} />
            </Field>
            <Field label="Mô tả">
              <Input value={editing.form.description || ''} onChange={event => setEditing({ ...editing, form: { ...editing.form, description: event.target.value } })} />
            </Field>
          </div>
        )}
      </Dialog>
    </div>
  );
};
