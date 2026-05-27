
import React, { useState } from 'react';
import { User, Role, APP_LOGO_URL } from '../types';
import { Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { loginUser } from '../services/dataService';

interface LoginProps {
  onLogin: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
        setError('Vui lòng nhập tên đăng nhập và mật khẩu');
        return;
    }

    setLoading(true);

    try {
        // Call actual backend API
        const user = await loginUser(username, password);
        
        if (user) {
            onLogin(user);
        } else {
            setError('Đăng nhập thất bại');
        }
    } catch (err: any) {
        console.error("Login error:", err);
        // Handle specific error messages from backend if available
        const msg = typeof err === 'string' ? err : (err.message || 'Lỗi kết nối server');
        setError(msg.includes('ScriptError') ? 'Lỗi hệ thống backend' : msg);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-blue-600 p-8 text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/medical-icons.png')]"></div>
            
            <div className="relative z-10">
                <div className="mx-auto w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg overflow-hidden border-4 border-blue-400/30">
                    <img 
                        src={APP_LOGO_URL} 
                        alt="" 
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                    />
                </div>
                <h1 className="text-2xl font-bold text-white">Khoa Ngoại Tổng Hợp</h1>
                <p className="text-blue-100 mt-2 text-sm font-medium uppercase tracking-wide">Bệnh viện Nội tiết Nghệ An</p>
            </div>
        </div>

        <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                        <span>⚠️</span> {error}
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Tên đăng nhập</label>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Nhập username..."
                            autoFocus
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Mật khẩu</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="••••••"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex justify-center items-center gap-2"
                >
                    {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                    {loading ? 'Đang xác thực...' : 'Đăng nhập'}
                </button>
            </form>
            
            <div className="mt-6 text-center text-xs text-slate-400">
                Hệ thống chỉ dành cho nhân viên y tế được cấp quyền.
            </div>
        </div>
      </div>
    </div>
  );
};
