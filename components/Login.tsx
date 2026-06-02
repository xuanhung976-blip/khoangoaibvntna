
import React, { useState } from 'react';
import { User, Role, APP_LOGO_URL } from '../types';
import { Lock, User as UserIcon, Loader2 } from 'lucide-react';
import { loginUser } from '../services/dataService';
import { ApiClientError } from '../services/apiClient';

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
        setError('Vui lÃ²ng nháº­p tÃªn Ä‘Äƒng nháº­p vÃ  máº­t kháº©u');
        return;
    }

    setLoading(true);

    try {
        // Call actual backend API
        const user = await loginUser(username, password);
        
        if (user) {
            onLogin(user);
        } else {
            setError('ÄÄƒng nháº­p tháº¥t báº¡i');
        }
    } catch (err: any) {
        console.error('[LOGIN ERROR]', {
            username,
            code: err?.code,
            status: err?.status,
            message: err?.message || String(err),
        });
        setError(getLoginErrorMessage(err));
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
                <h1 className="text-2xl font-bold text-white">Khoa Ngoáº¡i Tá»•ng Há»£p</h1>
                <p className="text-blue-100 mt-2 text-sm font-medium uppercase tracking-wide">Bá»‡nh viá»‡n Ná»™i tiáº¿t Nghá»‡ An</p>
            </div>
        </div>

        <div className="p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                        <span>âš ï¸</span> {error}
                    </div>
                )}
                
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">TÃªn Ä‘Äƒng nháº­p</label>
                    <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="Nháº­p username..."
                            autoFocus
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Máº­t kháº©u</label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            placeholder="â€¢â€¢â€¢â€¢â€¢â€¢"
                        />
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-600 text-white py-2.5 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-400 flex justify-center items-center gap-2"
                >
                    {loading && <Loader2 className="h-5 w-5 animate-spin" />}
                    {loading ? 'Äang xÃ¡c thá»±c...' : 'ÄÄƒng nháº­p'}
                </button>
            </form>
            
            <div className="mt-6 text-center text-xs text-slate-400">
                Há»‡ thá»‘ng chá»‰ dÃ nh cho nhÃ¢n viÃªn y táº¿ Ä‘Æ°á»£c cáº¥p quyá»n.
            </div>
        </div>
      </div>
    </div>
  );
};
function getLoginErrorMessage(err: any) {
    const code = err instanceof ApiClientError ? err.code : err?.code;
    const message = typeof err === 'string' ? err : (err?.message || '');

    if (code === 'RPC_ROUTE_MISSING') {
        return 'Không tìm thấy API /api/rpc. Khi test local, hãy chạy bằng vercel dev thay vì npm run preview.';
    }
    if (code === 'RPC_NETWORK_ERROR' || message === 'Failed to fetch') {
        return 'Không kết nối được máy chủ. Vui lòng kiểm tra API/Vercel/GAS.';
    }
    if (code === 'RPC_CONFIG_ERROR') {
        return 'Máy chủ chưa cấu hình GAS_API_URL.';
    }
    if (code === 'RPC_FETCH_FAILED') {
        return 'Proxy không kết nối được Google Apps Script. Vui lòng kiểm tra GAS deploy/API URL.';
    }
    if (code === 'RPC_BAD_RESPONSE') {
        return 'Google Apps Script trả về phản hồi không hợp lệ. Vui lòng kiểm tra deploy Web App.';
    }
    if (message.includes('INVALID_CREDENTIALS') || message.includes('Invalid credentials')) {
        return 'Tên đăng nhập hoặc mật khẩu không đúng.';
    }
    if (message.includes('AUTH_REQUIRED') || message.includes('SESSION_EXPIRED')) {
        return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
    }
    if (message.includes('ScriptError')) {
        return 'Lỗi hệ thống backend. Vui lòng kiểm tra Google Apps Script.';
    }
    return message || 'Lỗi kết nối server';
}
