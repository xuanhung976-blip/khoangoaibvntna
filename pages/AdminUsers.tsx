import React, { useEffect, useMemo, useState } from 'react';
import {
  Edit2,
  HeartPulse,
  KeyRound,
  Loader2,
  Lock,
  Search,
  ShieldCheck,
  Stethoscope,
  Trash2,
  Unlock,
  User as UserIcon,
  UserPlus,
} from 'lucide-react';
import { User, Role } from '../types';
import {
  deleteUser,
  getUsers,
  resetUserPassword,
  saveUser,
  toggleLockUser,
  updateUser,
} from '../services/dataService';
import { showToast } from '../components/Toast';
import { Modal } from '../components/Modal';
import { AdminPermissions } from './AdminPermissions';

type AdminUsersProps = {
  currentUser: User;
};

type UserForm = Partial<User> & { password?: string };

const blankUser = (): UserForm => ({
  username: '',
  password: '',
  fullName: '',
  role: Role.STAFF,
  nhomChuyenMon: 'BS',
  active: true,
  canDeletePatient: false,
});

const toBool = (value: unknown) =>
  value === true || value === 'TRUE' || value === 'true' || value === '1' || value === 1;

export const AdminUsers: React.FC<AdminUsersProps> = ({ currentUser }) => {
  const [activeTab, setActiveTab] = useState<'accounts' | 'permissions'>('accounts');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUsername, setEditingUsername] = useState<string | null>(null);
  const [formUser, setFormUser] = useState<UserForm>(blankUser());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getUsers();
      setUsers(data.map((u: User) => ({
        ...u,
        active: toBool(u.active),
        canDeletePatient: toBool(u.canDeletePatient),
      })));
    } catch {
      showToast('Lỗi tải danh sách người dùng', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.fullName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q),
    );
  }, [search, users]);

  const openAddModal = () => {
    setEditingUsername(null);
    setFormUser(blankUser());
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUsername(user.username);
    setFormUser({
      ...user,
      password: '',
      active: toBool(user.active),
      canDeletePatient: toBool(user.canDeletePatient),
    });
    setIsModalOpen(true);
  };

  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const username = (formUser.username || '').trim();
    const fullName = (formUser.fullName || '').trim();
    const password = (formUser.password || '').trim();

    if (!username || !fullName) {
      showToast('Vui lòng nhập username và họ tên', 'error');
      return;
    }

    const duplicate = users.some(
      (u) =>
        u.username.toLowerCase() === username.toLowerCase() &&
        u.username.toLowerCase() !== (editingUsername || '').toLowerCase(),
    );
    if (duplicate) {
      showToast(`Username "${username}" đã tồn tại`, 'error');
      return;
    }

    if (!editingUsername && !password) {
      showToast('Vui lòng nhập mật khẩu ban đầu', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const payload: UserForm = {
        username,
        fullName,
        role: formUser.role || Role.STAFF,
        nhomChuyenMon: formUser.nhomChuyenMon || 'BS',
        active: toBool(formUser.active),
        canDeletePatient: toBool(formUser.canDeletePatient),
      };

      if (password) payload.password = password;

      if (editingUsername) {
        await updateUser(editingUsername, payload);
        showToast('Đã cập nhật người dùng', 'success');
      } else {
        await saveUser({
          ...(payload as User),
          password,
          createdAt: new Date().toISOString(),
        });
        showToast('Đã thêm người dùng', 'success');
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Lỗi lưu người dùng', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLock = async (user: User) => {
    if (user.role === Role.CHIEF) {
      showToast('Không khóa tài khoản trưởng khoa', 'error');
      return;
    }

    const newStatus = !toBool(user.active);
    if (!confirm(`${newStatus ? 'Mở khóa' : 'Khóa'} tài khoản ${user.username}?`)) return;

    try {
      await toggleLockUser(user.username, newStatus);
      showToast(`Đã ${newStatus ? 'mở khóa' : 'khóa'} tài khoản`, 'success');
      await loadData();
    } catch {
      showToast('Lỗi cập nhật trạng thái', 'error');
    }
  };

  const handleResetPwd = async (user: User) => {
    if (!confirm(`Reset mật khẩu của ${user.username} về 123456?`)) return;
    try {
      await resetUserPassword(user.username);
      showToast('Đã reset mật khẩu về 123456', 'success');
    } catch {
      showToast('Lỗi reset mật khẩu', 'error');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.username.toLowerCase() === currentUser.username.toLowerCase()) {
      showToast('Không thể xóa user đang đăng nhập', 'error');
      return;
    }

    const remainingChiefs = users.filter(
      (u) =>
        u.role === Role.CHIEF &&
        u.username.toLowerCase() !== user.username.toLowerCase(),
    );
    if (user.role === Role.CHIEF && remainingChiefs.length === 0) {
      showToast('Không thể xóa TRUONG_KHOA cuối cùng', 'error');
      return;
    }

    if (!confirm(`Xóa user ${user.username}? Dữ liệu sẽ bị xóa khỏi sheet Users.`)) return;

    try {
      await deleteUser(user.username);
      showToast('Đã xóa người dùng', 'success');
      await loadData();
    } catch {
      showToast('Lỗi xóa người dùng', 'error');
    }
  };

  const RoleBadge = ({ role }: { role: Role }) => {
    switch (role) {
      case Role.CHIEF:
        return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-bold">Trưởng khoa</span>;
      case Role.HEAD_NURSE:
        return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold">ĐD trưởng</span>;
      default:
        return <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded-full text-xs font-medium">Nhân viên</span>;
    }
  };

  const MedicalRoleDisplay = ({ role }: { role?: string }) => {
    if (role === 'BS') return <span className="flex items-center gap-1 text-blue-700 font-medium"><Stethoscope className="h-3 w-3" /> Bác sĩ</span>;
    if (role === 'DD') return <span className="flex items-center gap-1 text-green-700 font-medium"><HeartPulse className="h-3 w-3" /> Điều dưỡng</span>;
    return <span className="text-slate-400">-</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <UserIcon className="h-6 w-6 text-blue-600" />
            Quản lý người dùng
          </h2>
          <p className="text-sm text-slate-500">Tài khoản nhân sự và phân quyền truy cập</p>
        </div>
        {activeTab === 'accounts' && (
          <button onClick={openAddModal} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 shadow-sm">
            <UserPlus className="h-4 w-4" /> Thêm user
          </button>
        )}
      </div>

      <div className="border-b border-slate-200">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('accounts')}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${activeTab === 'accounts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Tài khoản
          </button>
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 text-sm font-medium border-b-2 flex items-center gap-2 ${activeTab === 'permissions' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            <ShieldCheck className="h-4 w-4" /> Phân quyền
          </button>
        </div>
      </div>

      {activeTab === 'permissions' ? (
        <AdminPermissions />
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-300"
                placeholder="Tìm theo tên hoặc username..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-xs">
                <tr>
                  <th className="px-6 py-3">Nhân viên</th>
                  <th className="px-6 py-3">Vai trò</th>
                  <th className="px-6 py-3">Nhóm</th>
                  <th className="px-6 py-3">Xóa bệnh nhân</th>
                  <th className="px-6 py-3">Trạng thái</th>
                  <th className="px-6 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-blue-500" /></td></tr>
                ) : filtered.map((user) => (
                  <tr key={user.username} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{user.fullName}</div>
                      <div className="text-xs text-slate-500 font-mono">@{user.username}</div>
                    </td>
                    <td className="px-6 py-4"><RoleBadge role={user.role} /></td>
                    <td className="px-6 py-4"><MedicalRoleDisplay role={user.nhomChuyenMon} /></td>
                    <td className="px-6 py-4 text-slate-600">{toBool(user.canDeletePatient) ? 'Có' : 'Không'}</td>
                    <td className="px-6 py-4">
                      {toBool(user.active) ? (
                        <span className="text-green-600 flex items-center gap-1 text-xs font-bold"><Unlock className="h-3 w-3" /> Hoạt động</span>
                      ) : (
                        <span className="text-red-600 flex items-center gap-1 text-xs font-bold"><Lock className="h-3 w-3" /> Đã khóa</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => openEditModal(user)} className="p-1.5 text-slate-500 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 rounded border border-slate-200" title="Sửa user">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleResetPwd(user)} className="p-1.5 text-slate-500 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 rounded border border-slate-200" title="Reset mật khẩu về 123456">
                          <KeyRound className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleToggleLock(user)} className={`p-1.5 rounded border border-slate-200 ${toBool(user.active) ? 'text-red-500 hover:bg-red-50' : 'text-green-500 hover:bg-green-50'}`} title={toBool(user.active) ? 'Khóa tài khoản' : 'Mở khóa'}>
                          {toBool(user.active) ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                        </button>
                        <button onClick={() => handleDeleteUser(user)} className="p-1.5 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50 rounded border border-slate-200" title="Xóa user">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingUsername ? 'Sửa user' : 'Thêm user'}>
        <form onSubmit={handleSubmitUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Họ và tên</label>
            <input className="w-full border rounded px-3 py-2" value={formUser.fullName || ''} onChange={(e) => setFormUser({ ...formUser, fullName: e.target.value })} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Username</label>
              <input className="w-full border rounded px-3 py-2 bg-slate-50 font-mono" value={formUser.username || ''} onChange={(e) => setFormUser({ ...formUser, username: e.target.value })} required readOnly={!!editingUsername} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Mật khẩu</label>
              <input className="w-full border rounded px-3 py-2" type="password" value={formUser.password || ''} onChange={(e) => setFormUser({ ...formUser, password: e.target.value })} required={!editingUsername} placeholder={editingUsername ? 'Để trống nếu không đổi' : 'Nhập mật khẩu'} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Vai trò</label>
              <select className="w-full border rounded px-3 py-2" value={formUser.role} onChange={(e) => setFormUser({ ...formUser, role: e.target.value as Role })}>
                <option value={Role.STAFF}>Nhân viên</option>
                <option value={Role.HEAD_NURSE}>Điều dưỡng trưởng</option>
                <option value={Role.CHIEF}>Trưởng khoa</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Nhóm chuyên môn</label>
              <select className="w-full border rounded px-3 py-2" value={formUser.nhomChuyenMon || 'BS'} onChange={(e) => setFormUser({ ...formUser, nhomChuyenMon: e.target.value as 'BS' | 'DD' })}>
                <option value="BS">Bác sĩ (BS)</option>
                <option value="DD">Điều dưỡng (DD)</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={toBool(formUser.active)} onChange={(e) => setFormUser({ ...formUser, active: e.target.checked })} className="h-4 w-4 accent-blue-600" />
              Active
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={toBool(formUser.canDeletePatient)} onChange={(e) => setFormUser({ ...formUser, canDeletePatient: e.target.checked })} className="h-4 w-4 accent-red-500" />
              Can delete patient
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-100 rounded">Hủy</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded flex items-center gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />} Lưu
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
