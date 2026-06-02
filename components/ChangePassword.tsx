import React, { useState } from 'react';
import { Loader2, Lock } from 'lucide-react';
import { User, APP_LOGO_URL } from '../types';
import { changeMyPassword } from '../services/dataService';

type ChangePasswordProps = {
  user: User;
  onChanged: () => void;
  onLogout: () => void;
};

export const ChangePassword: React.FC<ChangePasswordProps> = ({ user, onChanged, onLogout }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    if (!currentPassword || !newPassword || !confirmPassword) return 'Vui lòng nhập đủ thông tin';
    if (newPassword.length < 6) return 'Mật khẩu mới phải có ít nhất 6 ký tự';
    if (newPassword === '123456') return 'Không được dùng mật khẩu mặc định 123456';
    if (newPassword.toLowerCase() === user.username.toLowerCase()) return 'Mật khẩu không được trùng username';
    if (newPassword !== confirmPassword) return 'Hai lần nhập mật khẩu mới không khớp';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    try {
      await changeMyPassword(currentPassword, newPassword);
      onChanged();
    } catch (err: any) {
      setError(err?.message || 'Không đổi được mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center">
          <div className="mx-auto w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg overflow-hidden border-4 border-blue-400/30">
            <img src={APP_LOGO_URL} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-bold text-white">Đổi mật khẩu</h1>
          <p className="text-blue-100 mt-2 text-sm">{user.fullName || user.username}</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">{error}</div>}

            {[
              ['Mật khẩu hiện tại', currentPassword, setCurrentPassword],
              ['Mật khẩu mới', newPassword, setNewPassword],
              ['Nhập lại mật khẩu mới', confirmPassword, setConfirmPassword],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="block">
                <span className="block text-sm font-medium text-slate-700 mb-1">{label as string}</span>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                  <input
                    type="password"
                    value={value as string}
                    onChange={(e) => (setter as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </label>
            ))}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex justify-center items-center gap-2"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
            </button>
            <button type="button" onClick={onLogout} className="w-full text-sm text-slate-500 hover:text-slate-700">
              Đăng xuất
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
