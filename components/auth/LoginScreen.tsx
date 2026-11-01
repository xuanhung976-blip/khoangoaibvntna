import React, { useState } from 'react';
import { Activity, CalendarClock, Eye, EyeOff, HeartPulse, Loader2, Lock, ShieldCheck, User as UserIcon } from 'lucide-react';
import { APP_LOGO_URL, type User } from '../../types';
import { loginUser } from '../../services/dataService';
import { ApiClientError } from '../../services/apiClient';
import { readPref, writePref } from '../../lib/prefs';

const LAST_USER_KEY = 'kn_last_username';

function loginErrorMessage(err: any) {
  const code = err instanceof ApiClientError ? err.code : err?.code;
  const message = typeof err === 'string' ? err : err?.message || '';
  if (code === 'RPC_ROUTE_MISSING') return 'Không kết nối được máy chủ. Khi chạy local hãy dùng "vercel dev" thay vì "npm run preview".';
  if (code === 'RPC_NETWORK_ERROR' || message === 'Failed to fetch') return 'Không kết nối được máy chủ. Vui lòng kiểm tra mạng.';
  if (code === 'RPC_CONFIG_ERROR') return 'Máy chủ chưa cấu hình GAS_API_URL.';
  if (code === 'RPC_FETCH_FAILED') return 'Máy chủ không kết nối được Google Apps Script.';
  if (code === 'RPC_BAD_RESPONSE') return 'Google Apps Script trả về phản hồi không hợp lệ.';
  if (message.includes('INVALID_CREDENTIALS') || message.includes('Invalid credentials')) return 'Tên đăng nhập hoặc mật khẩu không đúng.';
  if (message.includes('ACCOUNT_LOCKED') || message.toLowerCase().includes('khóa') || message.toLowerCase().includes('locked')) return 'Tài khoản đang bị khoá. Vui lòng liên hệ Trưởng khoa.';
  if (message.includes('AUTH_REQUIRED') || message.includes('SESSION_EXPIRED')) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  return message || 'Đăng nhập thất bại';
}

const FEATURES = [
  { icon: Activity, title: 'Duyệt & xếp lịch mổ', text: 'Phân công ê-kíp, xếp ca, in lịch trong vài giây' },
  { icon: HeartPulse, title: 'Công tác điều dưỡng', text: 'Phân công cá nhân / nhóm & theo dõi tiến độ' },
  { icon: CalendarClock, title: 'Lịch trực thông minh', text: 'Gợi ý phân trực cân bằng giữa các nhân viên' },
];

export const LoginScreen: React.FC<{ onLogin: (user: User) => void }> = ({ onLogin }) => {
  const [username, setUsername] = useState(() => readPref<string>(LAST_USER_KEY, ''));
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('Vui lòng nhập tên đăng nhập và mật khẩu.');
      return;
    }
    setLoading(true);
    try {
      const user = await loginUser(username.trim(), password);
      if (!user) {
        setError('Đăng nhập thất bại.');
        return;
      }
      writePref(LAST_USER_KEY, username.trim());
      onLogin(user);
    } catch (err) {
      setError(loginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const onKey = (event: React.KeyboardEvent<HTMLInputElement>) => setCapsLock(event.getModifierState?.('CapsLock') || false);

  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Panel thương hiệu */}
      <div className="relative hidden w-[46%] max-w-[640px] overflow-hidden bg-gradient-to-br from-teal-800 via-teal-700 to-cyan-800 p-12 text-white lg:flex lg:flex-col">
        <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 -left-16 h-96 w-96 rounded-full bg-cyan-300/20 blur-3xl" />
        <div className="relative flex items-center gap-3">
          <img src={APP_LOGO_URL} alt="" referrerPolicy="no-referrer" className="h-12 w-12 rounded-2xl bg-white object-cover p-0.5" />
          <div>
            <p className="text-sm font-medium text-teal-100">Bệnh viện Nội tiết Nghệ An</p>
            <p className="text-lg font-semibold">Khoa Ngoại Tổng Hợp</p>
          </div>
        </div>
        <div className="relative mt-auto">
          <h1 className="text-[34px] font-semibold leading-tight tracking-tight">
            Điều hành khoa
            <br />
            gọn gàng, chủ động.
          </h1>
          <p className="mt-3 max-w-md text-teal-100/90">Một nơi cho bệnh nhân, lịch mổ, giao ban, lịch trực và mọi việc cần xử lý trong ngày.</p>
          <ul className="mt-10 space-y-5">
            {FEATURES.map(feature => (
              <li key={feature.title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                  <feature.icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-medium">{feature.title}</span>
                  <span className="block text-sm text-teal-100/80">{feature.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative mt-12 text-xs text-teal-100/70">© {new Date().getFullYear()} Khoa Ngoại Tổng Hợp · Chỉ dành cho nhân viên y tế được cấp quyền</p>
      </div>

      {/* Form đăng nhập */}
      <div className="flex flex-1 items-center justify-center p-5 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <img src={APP_LOGO_URL} alt="" referrerPolicy="no-referrer" className="h-16 w-16 rounded-2xl bg-white object-cover ring-1 ring-line" />
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted">Bệnh viện Nội tiết Nghệ An</p>
            <p className="text-lg font-semibold text-fg">Khoa Ngoại Tổng Hợp</p>
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-fg">Đăng nhập</h2>
          <p className="mt-1 text-sm text-muted">Dùng tài khoản do khoa cấp để tiếp tục.</p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            {error && (
              <div role="alert" className="rounded-xl border border-rose-500/25 bg-rose-500/5 px-3.5 py-3 text-sm text-rose-700 dark:text-rose-300">
                {error}
              </div>
            )}
            <div>
              <label className="label" htmlFor="login-username">
                Tên đăng nhập
              </label>
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input
                  id="login-username"
                  value={username}
                  onChange={event => setUsername(event.target.value)}
                  autoFocus={!username}
                  autoComplete="username"
                  autoCapitalize="none"
                  className="input h-11 pl-10"
                  placeholder="vd: bs.an"
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="login-password">
                Mật khẩu
              </label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
                <input
                  id="login-password"
                  type={show ? 'text' : 'password'}
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  onKeyUp={onKey}
                  onKeyDown={onKey}
                  autoFocus={Boolean(username)}
                  autoComplete="current-password"
                  className="input h-11 pl-10 pr-11"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShow(value => !value)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-faint hover:text-fg"
                  aria-label={show ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {capsLock && <p className="mt-1.5 text-xs font-medium text-amber-600">Caps Lock đang bật</p>}
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[15px] font-medium text-primary-fg shadow-sm shadow-primary/30 transition-colors hover:bg-primary-strong disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? 'Đang xác thực…' : 'Đăng nhập'}
            </button>
          </form>
          <p className="mt-8 flex items-center justify-center gap-1.5 text-xs text-faint">
            <ShieldCheck className="h-3.5 w-3.5" /> Phiên đăng nhập được mã hoá và tự hết hạn
          </p>
        </div>
      </div>
    </div>
  );
};
