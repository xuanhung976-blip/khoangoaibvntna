import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { useInsights } from '../../hooks/useInsights';
import { readPref, writePref } from '../../lib/prefs';
import { Dialog, showToast } from '../ui';
import { PasswordForm } from '../auth/PasswordForm';
import { CommandPalette } from './CommandPalette';
import { MobileNav } from './MobileNav';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const COLLAPSE_KEY = 'kn_sidebar_collapsed';

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, passwordOpen, setPasswordOpen } = useApp();
  const [collapsed, setCollapsed] = useState(() => readPref(COLLAPSE_KEY, false));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const { summary } = useInsights();

  useEffect(() => {
    setMobileOpen(false);
    window.scrollTo({ top: 0 });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={() =>
          setCollapsed(value => {
            writePref(COLLAPSE_KEY, !value);
            return !value;
          })
        }
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
        badges={summary.badges}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMobileNav={() => setMobileOpen(true)} insights={summary.insights} />
        <main className="mx-auto w-full max-w-[1480px] flex-1 px-3 pb-24 pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-10">{children}</main>
      </div>
      <MobileNav onOpenMenu={() => setMobileOpen(true)} badges={summary.badges} />
      <CommandPalette />
      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} title="Đổi mật khẩu" description="Mật khẩu mới có hiệu lực ngay cho lần đăng nhập sau." size="sm">
        <PasswordForm
          user={user}
          onDone={() => {
            setPasswordOpen(false);
            showToast('Đã đổi mật khẩu', 'success');
          }}
        />
      </Dialog>
    </div>
  );
};
