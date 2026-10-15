import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { APP_LOGO_URL, type User } from '../../types';
import { Button } from '../ui';
import { PasswordForm } from './PasswordForm';

/** Màn hình bắt buộc đổi mật khẩu khi tài khoản mới tạo hoặc vừa được reset. */
export const ForcePasswordChange: React.FC<{ user: User; onChanged: () => void; onLogout: () => void }> = ({ user, onChanged, onLogout }) => (
  <div className="flex min-h-screen items-center justify-center bg-canvas p-4">
    <div className="card w-full max-w-md p-6 sm:p-8">
      <div className="flex items-center gap-3">
        <img src={APP_LOGO_URL} alt="" referrerPolicy="no-referrer" className="h-11 w-11 rounded-xl bg-white object-cover ring-1 ring-line" />
        <div>
          <p className="text-xs text-muted">Xin chào</p>
          <p className="font-semibold text-fg">{user.fullName || user.username}</p>
        </div>
      </div>
      <div className="mt-6 flex gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] p-3.5">
        <ShieldAlert className="h-5 w-5 shrink-0 text-amber-500" />
        <p className="text-sm text-fg">Vì an toàn, bạn cần đặt mật khẩu mới trước khi sử dụng hệ thống.</p>
      </div>
      <div className="mt-6">
        <PasswordForm
          user={user}
          onDone={onChanged}
          submitLabel="Lưu mật khẩu mới"
          footer={
            <Button variant="ghost" onClick={onLogout}>
              Đăng xuất
            </Button>
          }
        />
      </div>
    </div>
  </div>
);
