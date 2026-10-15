import React, { useEffect, useMemo, useState } from 'react';
import { RefreshCw, RotateCcw, Save, ShieldCheck } from 'lucide-react';
import { MODULE_NAMES, Role, type RolePermission } from '../../types';
import { getPermissions, saveRolePermissions, setPermissionEnforcement } from '../../services/dataService';
import { ACCESS_KEY, useAccess } from '../../hooks/useAccess';
import { KEYS } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../lib/resource';
import { ROLE_META, normalizeRole } from '../../lib/domain';
import { toBool } from '../../lib/text';
import { cn } from '../../lib/cn';
import { Badge, Button, Card, ErrorState, PageHeader, SkeletonRows, Switch, confirmAction } from '../../components/ui';

type Action = 'canView' | 'canAdd' | 'canEdit' | 'canDelete';
const ACTIONS: Array<{ key: Action; label: string }> = [
  { key: 'canView', label: 'Xem' },
  { key: 'canAdd', label: 'Thêm' },
  { key: 'canEdit', label: 'Sửa' },
  { key: 'canDelete', label: 'Xoá' },
];
const ROLES = [Role.HEAD_NURSE, Role.STAFF];

/** Quyền mặc định khi chưa cấu hình — khớp với fallbackCanPerform_ trong GAS. */
const HEAD_NURSE_MODULES = ['clinical', 'surgery', 'vip', 'briefing', 'inventory', '5s', 'shifts', 'dieu_duong', 'staff_performance', 'research', 'meetings', 'technique', 'comms'];
const STAFF_MODULES = HEAD_NURSE_MODULES.filter(module => module !== 'surgery');
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const fallback = (role: Role, module: string, _action: Action): boolean =>
  (role === Role.HEAD_NURSE ? HEAD_NURSE_MODULES : STAFF_MODULES).includes(module);

const keyOf = (role: string, module: string) => `${role}|${module}`;

export const PermissionsPage: React.FC = () => {
  const { data, loading, error, validating, reload } = useResource<RolePermission[]>(KEYS.permissions, async options => (await getPermissions(options)) || []);
  const { run, pending } = useAction();
  const [matrix, setMatrix] = useState<Map<string, RolePermission>>(new Map());
  const [dirty, setDirty] = useState(false);

  const stored = useMemo(() => {
    const map = new Map<string, RolePermission>();
    (data || []).forEach(item => {
      const role = normalizeRole(item.role);
      map.set(keyOf(role, String(item.module)), { ...item, role, canView: toBool(item.canView), canAdd: toBool(item.canAdd), canEdit: toBool(item.canEdit), canDelete: toBool(item.canDelete) });
    });
    return map;
  }, [data]);

  useEffect(() => {
    if (!dirty) setMatrix(new Map(stored));
  }, [stored, dirty]);

  const valueOf = (role: Role, module: string, action: Action) => {
    const entry = matrix.get(keyOf(role, module));
    return entry ? Boolean(entry[action]) : fallback(role, module, action);
  };

  const toggle = (role: Role, module: string, action: Action) => {
    setMatrix(current => {
      const next = new Map(current);
      const existing = next.get(keyOf(role, module)) || {
        role,
        module,
        canView: fallback(role, module, 'canView'),
        canAdd: fallback(role, module, 'canAdd'),
        canEdit: fallback(role, module, 'canEdit'),
        canDelete: fallback(role, module, 'canDelete'),
      };
      next.set(keyOf(role, module), { ...existing, [action]: !valueOf(role, module, action) });
      return next;
    });
    setDirty(true);
  };

  const { enforced } = useAccess();

  const toggleEnforcement = async (next: boolean) => {
    if (dirty) return showToastDirty();
    const ok = await confirmAction(
      next
        ? {
            title: 'Bật kiểm soát quyền chi tiết?',
            message:
              'Máy chủ sẽ chặn mọi thao tác xem/thêm/sửa/xoá không được tick trong bảng (áp dụng cho mọi người trừ Trưởng khoa, có hiệu lực trong khoảng 1–2 phút). Module không được xem sẽ bị ẩn khỏi menu. Hãy kiểm tra kỹ bảng trước khi bật.',
            confirmText: 'Bật kiểm soát',
            tone: 'primary',
          }
        : { title: 'Tắt kiểm soát quyền chi tiết?', message: 'Mọi người sẽ dùng được tất cả module (trừ chức năng quản trị).', confirmText: 'Tắt' },
    );
    if (!ok) return;
    await run('enforce', () => setPermissionEnforcement(next), {
      success: next ? 'Đã bật kiểm soát quyền chi tiết' : 'Đã tắt kiểm soát quyền chi tiết',
      invalidate: [ACCESS_KEY],
    });
  };

  const showToastDirty = () => confirmAction({ title: 'Hãy lưu hoặc huỷ thay đổi trong bảng trước', confirmText: 'Đã hiểu', tone: 'primary' });

  const save = async () => {
    const payload = Array.from(matrix.values()).filter(item => ROLES.includes(item.role));
    const result = await run('save', () => saveRolePermissions(payload), { success: 'Đã lưu ma trận phân quyền', invalidate: [KEYS.permissions, ACCESS_KEY] });
    if (result !== undefined) setDirty(false);
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Phân quyền"
        icon={ShieldCheck}
        description="Ma trận quyền theo vai trò và chức năng. Trưởng khoa luôn có toàn quyền."
        actions={
          <>
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={() => reload()} aria-label="Làm mới" />
            {dirty && (
              <Button
                icon={RotateCcw}
                onClick={() => {
                  setMatrix(new Map(stored));
                  setDirty(false);
                }}
              >
                Huỷ thay đổi
              </Button>
            )}
            <Button variant="primary" icon={Save} disabled={!dirty} loading={pending === 'save'} onClick={save}>
              Lưu phân quyền
            </Button>
          </>
        }
      />

      <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-fg">Kiểm soát quyền chi tiết</p>
            <Badge tone={enforced ? 'success' : 'neutral'} dot>
              {enforced ? 'Đang bật — bảng bên dưới đang được áp dụng' : 'Đang tắt — bảng chỉ được lưu, chưa chặn'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted">
            Khi bật, máy chủ (Google Sheets và cơ sở dữ liệu bệnh nhân) kiểm tra từng thao tác theo bảng; module không có quyền "Xem" bị ẩn khỏi menu. Trưởng khoa luôn
            có toàn quyền; các chức năng quản trị luôn chỉ dành cho Trưởng khoa.
          </p>
        </div>
        <Switch checked={enforced} onChange={toggleEnforcement} disabled={pending === 'enforce'} label={enforced ? 'Bật' : 'Tắt'} />
      </Card>

      <Card className="overflow-hidden">
        {error && !data ? (
          <ErrorState error={error} onRetry={() => reload()} />
        ) : loading ? (
          <SkeletonRows />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b border-line bg-sunken/70 text-xs text-muted">
                  <th rowSpan={2} className="px-4 py-2 text-left font-semibold">
                    Chức năng
                  </th>
                  {ROLES.map(role => (
                    <th key={role} colSpan={4} className="border-l border-line px-4 py-2 text-center font-semibold">
                      <Badge tone={ROLE_META[role].tone}>{ROLE_META[role].label}</Badge>
                    </th>
                  ))}
                </tr>
                <tr className="border-b border-line bg-sunken/70 text-[11px] text-muted">
                  {ROLES.map(role => ACTIONS.map((action, index) => <th key={`${role}-${action.key}`} className={cn('px-2 py-1.5 text-center font-medium', index === 0 && 'border-l border-line')}>{action.label}</th>))}
                </tr>
              </thead>
              <tbody>
                {MODULE_NAMES.map(module => (
                  <tr key={module.id} className="border-b border-line/60 hover:bg-sunken/40">
                    <td className="px-4 py-2.5 font-medium text-fg">{module.label}</td>
                    {ROLES.map(role =>
                      ACTIONS.map((action, index) => {
                        const configured = matrix.has(keyOf(role, module.id));
                        const checked = valueOf(role, module.id, action.key);
                        return (
                          <td key={`${role}-${action.key}`} className={cn('px-2 py-2.5 text-center', index === 0 && 'border-l border-line')}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggle(role, module.id, action.key)}
                              className={cn('h-4 w-4 cursor-pointer rounded accent-[rgb(var(--primary))]', !configured && 'opacity-50')}
                              aria-label={`${ROLE_META[role].label} — ${module.label} — ${action.label}`}
                              title={configured ? undefined : 'Đang dùng quyền mặc định'}
                            />
                          </td>
                        );
                      }),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
};
