import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Bell, CheckCircle2, KeyRound, Loader2, LogOut, Menu as MenuIcon, Monitor, Moon, Search, Sun } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { getGasSyncStatus } from '../../services/dataService';
import { cn } from '../../lib/cn';
import { userRoleMeta } from '../../lib/domain';
import type { Insight } from '../../features/dashboard/insights';
import { Avatar, Badge, Menu } from '../ui';
import { findNavItem } from './nav';

const SEVERITY_TONE = { critical: 'danger', warning: 'warning', info: 'info' } as const;

const NotificationCenter: React.FC<{ insights: Insight[] }> = ({ insights }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const urgent = insights.filter(item => item.severity !== 'info').length;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(value => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-sunken hover:text-fg"
        aria-label={`Thông báo (${insights.length})`}
      >
        <Bell className="h-[18px] w-[18px]" />
        {urgent > 0 && (
          <span className="num absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-semibold text-white ring-2 ring-surface">
            {urgent > 9 ? '9+' : urgent}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-[64]" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-3 top-16 z-[65] animate-scale-in overflow-hidden rounded-2xl border border-line bg-surface shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-11 sm:w-[400px]">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="text-sm font-semibold text-fg">Cần chú ý</p>
              <span className="text-xs text-muted">{insights.length} mục</span>
            </div>
            <ul className="scrollbar-thin max-h-[60vh] overflow-y-auto p-1.5">
              {insights.length === 0 ? (
                <li className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-muted">
                  <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                  Không có việc gì cần xử lý. Tuyệt vời!
                </li>
              ) : (
                insights.slice(0, 20).map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        setOpen(false);
                        navigate(item.link);
                      }}
                      className="flex w-full gap-3 rounded-xl px-2.5 py-2.5 text-left hover:bg-sunken"
                    >
                      <span
                        className={cn(
                          'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                          item.severity === 'critical' ? 'bg-rose-500' : item.severity === 'warning' ? 'bg-amber-500' : 'bg-sky-500',
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-fg">{item.title}</span>
                        {item.detail && <span className="block truncate text-xs text-muted">{item.detail}</span>}
                      </span>
                      <Badge tone={SEVERITY_TONE[item.severity]} className="shrink-0 self-start">
                        {item.module}
                      </Badge>
                    </button>
                  </li>
                ))
              )}
            </ul>
            <button
              onClick={() => {
                setOpen(false);
                navigate('/');
              }}
              className="w-full border-t border-line px-4 py-2.5 text-center text-sm font-medium text-primary hover:bg-sunken"
            >
              Mở Trung tâm điều hành
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const SyncStatus: React.FC = () => {
  const [status, setStatus] = useState(getGasSyncStatus());
  useEffect(() => {
    const handler = (event: Event) => setStatus((event as CustomEvent<ReturnType<typeof getGasSyncStatus>>).detail || getGasSyncStatus());
    window.addEventListener('gas_sync_status', handler);
    return () => window.removeEventListener('gas_sync_status', handler);
  }, []);
  if (status.pending > 0)
    return (
      <span className="hidden items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-700 dark:text-amber-300 md:flex" title="Dữ liệu chính đã lưu; đang đồng bộ bản sao sang Google Sheets">
        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đồng bộ {status.pending}
      </span>
    );
  if (status.failed > 0)
    return (
      <span className="hidden items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-700 dark:text-rose-300 md:flex" title="Một số bản ghi chưa đồng bộ được sang Google Sheets; dữ liệu chính vẫn an toàn">
        <AlertTriangle className="h-3.5 w-3.5" /> Lỗi đồng bộ {status.failed}
      </span>
    );
  return null;
};

export const Topbar: React.FC<{ onOpenMobileNav: () => void; insights: Insight[] }> = ({ onOpenMobileNav, insights }) => {
  const { user, theme, setTheme, logout, setCommandOpen, setPasswordOpen } = useApp();
  const location = useLocation();
  const page = findNavItem(location.pathname);
  const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

  const ThemeIcon = theme === 'dark' ? Moon : theme === 'light' ? Sun : Monitor;

  return (
    <header className="no-print sticky top-0 z-40 flex h-16 items-center gap-2 border-b border-line bg-surface/85 px-3 backdrop-blur-md sm:px-5">
      <button onClick={onOpenMobileNav} className="rounded-xl p-2 text-muted hover:bg-sunken hover:text-fg lg:hidden" aria-label="Mở menu">
        <MenuIcon className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1 lg:flex-none">
        <p className="truncate text-[15px] font-semibold text-fg lg:hidden">{page?.label || 'Khoa Ngoại TH'}</p>
      </div>

      <button
        onClick={() => setCommandOpen(true)}
        className="ml-auto hidden h-9 w-full max-w-md items-center gap-2.5 rounded-xl border border-line bg-sunken px-3 text-sm text-faint transition-colors hover:border-faint/60 hover:text-muted sm:flex lg:ml-0"
      >
        <Search className="h-4 w-4" />
        <span className="flex-1 text-left">Tìm bệnh nhân, chức năng, thao tác…</span>
        <kbd className="rounded-md border border-line bg-surface px-1.5 font-mono text-[10px] text-muted">{isMac ? '⌘' : 'Ctrl'} K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <button onClick={() => setCommandOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-sunken sm:hidden" aria-label="Tìm kiếm">
          <Search className="h-[18px] w-[18px]" />
        </button>
        <SyncStatus />
        <button
          onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-muted hover:bg-sunken hover:text-fg"
          title={`Giao diện: ${theme === 'light' ? 'Sáng' : theme === 'dark' ? 'Tối' : 'Theo hệ thống'}`}
          aria-label="Đổi giao diện sáng/tối"
        >
          <ThemeIcon className="h-[18px] w-[18px]" />
        </button>
        <NotificationCenter insights={insights} />
        <Menu
          width="w-64"
          trigger={({ toggle }) => (
            <button onClick={toggle} className="ml-1 flex items-center gap-2 rounded-xl p-1 pr-1 hover:bg-sunken sm:pr-2.5">
              <Avatar name={user.fullName || user.username} size="sm" />
              <span className="hidden text-left leading-tight md:block">
                <span className="block max-w-[160px] truncate text-[13px] font-semibold text-fg">{user.fullName || user.username}</span>
                <span className="block text-[11px] text-muted">{userRoleMeta(user).label}</span>
              </span>
            </button>
          )}
          header={
            <div className="mb-1 border-b border-line px-2.5 pb-2.5 pt-1.5">
              <p className="truncate text-sm font-semibold text-fg">{user.fullName}</p>
              <p className="truncate text-xs text-muted">
                @{user.username} · {userRoleMeta(user).label}
              </p>
            </div>
          }
          items={[
            { label: 'Đổi mật khẩu', icon: KeyRound, onSelect: () => setPasswordOpen(true) },
            { label: 'Giao diện sáng', icon: Sun, onSelect: () => setTheme('light'), hint: theme === 'light' ? '✓' : undefined },
            { label: 'Giao diện tối', icon: Moon, onSelect: () => setTheme('dark'), hint: theme === 'dark' ? '✓' : undefined },
            { label: 'Theo hệ thống', icon: Monitor, onSelect: () => setTheme('system'), hint: theme === 'system' ? '✓' : undefined },
            'divider',
            { label: 'Đăng xuất', icon: LogOut, onSelect: logout, danger: true },
          ]}
        />
      </div>
    </header>
  );
};
