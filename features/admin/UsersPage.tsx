import React, { useMemo, useState } from 'react';
import { Copy, Edit3, HeartPulse, KeyRound, Lock, MoreHorizontal, RefreshCw, Stethoscope, Trash2, Unlock, UserPlus, UsersRound } from 'lucide-react';
import { Role, type User } from '../../types';
import { deleteUser, getUsers, resetUserPassword, saveUser, toggleLockUser, updateUser } from '../../services/dataService';
import { useApp } from '../../context/AppContext';
import { KEYS } from '../../hooks/useData';
import { useAction } from '../../hooks/useAction';
import { useResource } from '../../lib/resource';
import { ROLE_META, isUserActive, normalizeRole, userRoleMeta } from '../../lib/domain';
import { fmtDate } from '../../lib/dates';
import { matchesQuery, toBool } from '../../lib/text';
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  ChipGroup,
  DataTable,
  Dialog,
  Drawer,
  EmptyState,
  ErrorState,
  Field,
  FormGrid,
  Input,
  Menu,
  PageHeader,
  RowActions,
  SearchInput,
  Segmented,
  Switch,
  Toolbar,
  confirmAction,
  showToast,
  type Column,
} from '../../components/ui';

type UserForm = Partial<User> & { password?: string };

const randomPassword = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const bytes = new Uint32Array(8);
  crypto.getRandomValues(bytes);
  return `Kn@${Array.from(bytes, value => alphabet[value % alphabet.length]).join('')}`;
};

const deleteErrorMessage = (error: any) => {
  const text = `${error?.code || ''} ${error?.message || ''}`;
  if (text.includes('CANNOT_DELETE_SELF')) return 'Không thể xoá tài khoản đang đăng nhập.';
  if (text.includes('CANNOT_DELETE_LAST_TRUONG_KHOA')) return 'Không thể xoá trưởng khoa cuối cùng.';
  return undefined;
};

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useApp();
  const { data, loading, error, validating, reload } = useResource<User[]>(KEYS.users, async options =>
    ((await getUsers(options)) || []).map(item => ({ ...item, active: toBool(item.active), canDeletePatient: toBool(item.canDeletePatient) })),
  );
  const { run, pending } = useAction();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'locked'>('all');
  const [editing, setEditing] = useState<{ form: UserForm; original?: string } | null>(null);
  const [tempPassword, setTempPassword] = useState<{ username: string; password: string } | null>(null);

  const users = useMemo(() => data || [], [data]);
  const rows = useMemo(
    () =>
      users
        .filter(item => (status === 'all' ? true : status === 'active' ? isUserActive(item) : !isUserActive(item)))
        .filter(item => matchesQuery(search, item.fullName, item.username))
        .sort((a, b) => a.fullName.localeCompare(b.fullName, 'vi')),
    [users, status, search],
  );

  const save = async () => {
    if (!editing) return;
    const { form, original } = editing;
    const username = String(form.username || '').trim();
    const fullName = String(form.fullName || '').trim();
    const password = String(form.password || '').trim();
    if (!username || !fullName) return showToast('Nhập tên đăng nhập và họ tên', 'warning');
    if (!/^[a-zA-Z0-9._-]{3,}$/.test(username)) return showToast('Tên đăng nhập chỉ gồm chữ, số, dấu chấm/gạch (≥ 3 ký tự)', 'warning');
    if (users.some(item => item.username.toLowerCase() === username.toLowerCase() && item.username.toLowerCase() !== (original || '').toLowerCase())) {
      return showToast(`Tên đăng nhập "${username}" đã tồn tại`, 'warning');
    }
    if (!original && password.length < 6) return showToast('Mật khẩu ban đầu cần ít nhất 6 ký tự', 'warning');
    const payload: UserForm = {
      username,
      fullName,
      role: form.role || Role.STAFF,
      nhomChuyenMon: form.nhomChuyenMon || 'BS',
      active: toBool(form.active),
      canDeletePatient: toBool(form.canDeletePatient),
    };
    if (password) payload.password = password;
    const result = await run('save', () => (original ? updateUser(original, payload) : saveUser({ ...(payload as User), password, createdAt: new Date().toISOString() })), {
      success: original ? 'Đã cập nhật người dùng' : `Đã tạo tài khoản ${username}`,
      invalidate: [KEYS.users, KEYS.directory, KEYS.personnel, KEYS.doctors],
    });
    if (result !== undefined) setEditing(null);
  };

  const toggleLock = async (item: User) => {
    if (normalizeRole(item.role) === Role.CHIEF) return showToast('Không khoá tài khoản Trưởng khoa', 'warning');
    const next = !isUserActive(item);
    if (!(await confirmAction({ title: `${next ? 'Mở khoá' : 'Khoá'} tài khoản ${item.username}?`, tone: next ? 'primary' : 'danger', confirmText: next ? 'Mở khoá' : 'Khoá' }))) return;
    await run(`lock-${item.username}`, () => toggleLockUser(item.username, next), { success: next ? 'Đã mở khoá' : 'Đã khoá tài khoản', invalidate: [KEYS.users, KEYS.directory, KEYS.personnel] });
  };

  const resetPassword = async (item: User) => {
    if (!(await confirmAction({ title: `Đặt lại mật khẩu cho ${item.fullName}?`, message: 'Hệ thống tạo mật khẩu tạm; người dùng phải đổi mật khẩu ở lần đăng nhập kế tiếp.', tone: 'primary', confirmText: 'Đặt lại' }))) return;
    const password = randomPassword();
    const result = await run(`reset-${item.username}`, () => resetUserPassword(item.username, password), { invalidate: [KEYS.users] });
    if (result !== undefined) setTempPassword({ username: item.username, password });
  };

  const remove = async (item: User) => {
    if (item.username.toLowerCase() === currentUser.username.toLowerCase()) return showToast('Không thể xoá tài khoản đang đăng nhập', 'warning');
    if (!(await confirmAction({ title: `Xoá tài khoản ${item.username}?`, message: 'Tài khoản bị xoá khỏi hệ thống. Cân nhắc dùng "Khoá" nếu chỉ muốn tạm ngừng.', confirmText: 'Xoá tài khoản' }))) return;
    try {
      await deleteUser(item.username);
      showToast('Đã xoá người dùng', 'success');
      reload();
    } catch (err) {
      showToast(deleteErrorMessage(err) || (err as Error)?.message || 'Không xoá được người dùng', 'error');
    }
  };

  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'Người dùng',
      sort: item => item.fullName,
      cell: item => (
        <div className="flex items-center gap-3">
          <Avatar name={item.fullName} size="sm" />
          <div>
            <p className="font-medium text-fg">{item.fullName}</p>
            <p className="font-mono text-xs text-muted">@{item.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Vai trò',
      sort: item => normalizeRole(item.role),
      cell: item => {
        const meta = userRoleMeta(item);
        return <Badge tone={meta.tone}>{meta.label}</Badge>;
      },
    },
    {
      key: 'group',
      header: 'Nhóm',
      hideBelow: 'md',
      cell: item =>
        item.nhomChuyenMon === 'DD' ? (
          <span className="inline-flex items-center gap-1 text-sm text-muted">
            <HeartPulse className="h-3.5 w-3.5 text-rose-500" /> Điều dưỡng
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm text-muted">
            <Stethoscope className="h-3.5 w-3.5 text-primary" /> Bác sĩ
          </span>
        ),
    },
    {
      key: 'status',
      header: 'Trạng thái',
      cell: item => (
        <div className="flex flex-wrap gap-1">
          {isUserActive(item) ? <Badge tone="success" dot>Hoạt động</Badge> : <Badge tone="danger" dot>Đã khoá</Badge>}
          {toBool(item.mustChangePassword) && <Badge tone="warning">Chờ đổi MK</Badge>}
          {toBool(item.canDeletePatient) && <Badge tone="violet">Được xoá BN</Badge>}
        </div>
      ),
    },
    { key: 'created', header: 'Ngày tạo', hideBelow: 'lg', cell: item => <span className="num text-sm text-muted">{fmtDate(item.createdAt)}</span> },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: item => (
        <RowActions>
          <Button size="sm" variant="ghost" iconOnly icon={Edit3} onClick={() => setEditing({ form: { ...item, password: '' }, original: item.username })} aria-label="Sửa" />
          <Menu
            trigger={({ toggle }) => <Button size="sm" variant="ghost" iconOnly icon={MoreHorizontal} onClick={toggle} aria-label="Thao tác" />}
            items={[
              { label: 'Đặt lại mật khẩu', icon: KeyRound, onSelect: () => resetPassword(item) },
              { label: isUserActive(item) ? 'Khoá tài khoản' : 'Mở khoá', icon: isUserActive(item) ? Lock : Unlock, onSelect: () => toggleLock(item) },
              'divider',
              { label: 'Xoá tài khoản', icon: Trash2, danger: true, onSelect: () => remove(item) },
            ]}
          />
        </RowActions>
      ),
    },
  ];

  const form = editing?.form;
  const setForm = (patch: Partial<UserForm>) => setEditing(current => (current ? { ...current, form: { ...current.form, ...patch } } : current));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Người dùng"
        icon={UsersRound}
        description={`${users.filter(isUserActive).length} tài khoản đang hoạt động`}
        actions={
          <>
            <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={() => reload()} aria-label="Làm mới" />
            <Button
              variant="primary"
              icon={UserPlus}
              onClick={() => setEditing({ form: { username: '', fullName: '', password: randomPassword(), role: Role.STAFF, nhomChuyenMon: 'BS', active: true, canDeletePatient: false } })}
            >
              Thêm người dùng
            </Button>
          </>
        }
      />
      <Card className="overflow-hidden">
        <Toolbar>
          <SearchInput value={search} onChange={setSearch} placeholder="Tìm tên, tên đăng nhập…" className="sm:w-72" />
          <Segmented
            size="sm"
            value={status}
            onChange={setStatus}
            items={[
              { value: 'all', label: 'Tất cả', count: users.length },
              { value: 'active', label: 'Hoạt động', count: users.filter(isUserActive).length },
              { value: 'locked', label: 'Đã khoá', count: users.filter(item => !isUserActive(item)).length },
            ]}
          />
        </Toolbar>
        {error && !data ? (
          <ErrorState error={error} onRetry={() => reload()} />
        ) : (
          <DataTable
            rows={rows}
            columns={columns}
            rowKey={item => item.username}
            loading={loading}
            onRowClick={item => setEditing({ form: { ...item, password: '' }, original: item.username })}
            empty={<EmptyState icon={UsersRound} title="Không có người dùng phù hợp" />}
            mobileCard={item => (
              <div className="flex items-center gap-3">
                <Avatar name={item.fullName} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-fg">{item.fullName}</p>
                  <p className="text-xs text-muted">
                    @{item.username} · {userRoleMeta(item).label}
                  </p>
                </div>
                {!isUserActive(item) && <Badge tone="danger">Khoá</Badge>}
              </div>
            )}
          />
        )}
      </Card>

      <Drawer
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        persistent
        title={editing?.original ? `Sửa tài khoản @${editing.original}` : 'Thêm người dùng'}
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
        {form && (
          <div className="space-y-5">
            <FormGrid>
              <Field label="Tên đăng nhập" required hint="Không dấu, không khoảng trắng">
                <Input value={form.username || ''} disabled={Boolean(editing?.original)} onChange={event => setForm({ username: event.target.value.trim() })} className="font-mono" autoCapitalize="none" />
              </Field>
              <Field label="Họ và tên" required>
                <Input value={form.fullName || ''} onChange={event => setForm({ fullName: event.target.value })} />
              </Field>
            </FormGrid>
            <Field label="Vai trò">
              <ChipGroup value={normalizeRole(form.role)} onChange={value => setForm({ role: value })} options={Object.entries(ROLE_META).map(([value, meta]) => ({ value: value as Role, label: meta.label }))} />
            </Field>
            <Field label="Nhóm chuyên môn" hint="Dùng để lọc danh sách bác sĩ / điều dưỡng khi phân công">
              <ChipGroup
                value={(form.nhomChuyenMon || 'BS') as 'BS' | 'DD'}
                onChange={value => setForm({ nhomChuyenMon: value })}
                options={[
                  { value: 'BS', label: 'Bác sĩ' },
                  { value: 'DD', label: 'Điều dưỡng' },
                ]}
              />
            </Field>
            <Field
              label={editing?.original ? 'Đặt mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu ban đầu'}
              required={!editing?.original}
              hint="Người dùng sẽ được yêu cầu đổi mật khẩu khi đăng nhập"
              action={
                <button type="button" onClick={() => setForm({ password: randomPassword() })} className="text-xs font-medium text-primary hover:underline">
                  Tạo ngẫu nhiên
                </button>
              }
            >
              <Input value={form.password || ''} onChange={event => setForm({ password: event.target.value })} className="font-mono" autoComplete="new-password" />
            </Field>
            <div className="space-y-3 rounded-2xl border border-line p-4">
              <Switch checked={toBool(form.active)} onChange={value => setForm({ active: value })} label="Cho phép đăng nhập" description="Tắt để khoá tạm thời tài khoản" />
              <Switch checked={toBool(form.canDeletePatient)} onChange={value => setForm({ canDeletePatient: value })} label="Được xoá hồ sơ bệnh nhân" description="Trưởng khoa luôn có quyền này" />
            </div>
          </div>
        )}
      </Drawer>

      <Dialog
        open={Boolean(tempPassword)}
        onClose={() => setTempPassword(null)}
        size="sm"
        title="Mật khẩu tạm thời"
        footer={
          <Button variant="primary" onClick={() => setTempPassword(null)}>
            Đã ghi lại
          </Button>
        }
      >
        {tempPassword && (
          <div className="space-y-3">
            <Callout tone="warning">Mật khẩu chỉ hiển thị một lần. Hãy gửi trực tiếp cho người dùng @{tempPassword.username}.</Callout>
            <div className="flex items-center gap-2 rounded-xl border border-line bg-sunken px-3 py-2.5">
              <code className="flex-1 font-mono text-base font-semibold text-fg">{tempPassword.password}</code>
              <Button
                size="sm"
                icon={Copy}
                onClick={() => {
                  navigator.clipboard?.writeText(tempPassword.password).then(
                    () => showToast('Đã sao chép', 'success'),
                    () => showToast('Không sao chép được, hãy chép thủ công', 'warning'),
                  );
                }}
              >
                Sao chép
              </Button>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
};
