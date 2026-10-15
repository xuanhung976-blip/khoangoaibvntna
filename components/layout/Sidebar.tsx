import React from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronsLeft, ChevronsRight, X } from 'lucide-react';
import { APP_LOGO_URL } from '../../types';
import { cn } from '../../lib/cn';
import { useApp } from '../../context/AppContext';
import { useAccess } from '../../hooks/useAccess';
import { CountPill } from '../ui';
import { NAV_GROUPS } from './nav';

type Props = {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
  badges: Record<string, number>;
};

const BADGE_TONE: Record<string, 'danger' | 'warning' | 'primary'> = {
  '/surgery-approval': 'warning',
  '/clinical': 'warning',
  '/staff-performance': 'danger',
  '/inventory': 'danger',
  '/nursing-tasks': 'primary',
  '/shifts': 'warning',
};

export const Sidebar: React.FC<Props> = ({ collapsed, onToggleCollapsed, mobileOpen, onCloseMobile, badges }) => {
  const { chief } = useApp();
  const { can } = useAccess();

  const content = (isMobile: boolean) => {
    const compact = collapsed && !isMobile;
    return (
      <div className="flex h-full flex-col">
        <div className={cn('flex h-16 shrink-0 items-center gap-3 px-4', compact && 'justify-center px-0')}>
          <img src={APP_LOGO_URL} alt="" referrerPolicy="no-referrer" className="h-9 w-9 shrink-0 rounded-xl bg-white object-cover ring-1 ring-line" />
          {!compact && (
            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-[15px] font-semibold text-fg">Khoa Ngoại TH</p>
              <p className="truncate text-[11px] text-muted">BV Nội tiết Nghệ An</p>
            </div>
          )}
          {isMobile && (
            <button onClick={onCloseMobile} className="rounded-lg p-1.5 text-muted hover:bg-sunken" aria-label="Đóng menu">
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        <nav className="scrollbar-thin flex-1 space-y-5 overflow-y-auto px-3 pb-4 pt-1">
          {NAV_GROUPS.map(group => {
            const items = group.items.filter(item => (!item.chiefOnly || chief) && can(item.module));
            if (!items.length) return null;
            return (
              <div key={group.title}>
                {!compact ? (
                  <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-wider text-faint">{group.title}</p>
                ) : (
                  <div className="mx-auto mb-2 h-px w-6 bg-line" />
                )}
                <ul className="space-y-0.5">
                  {items.map(item => {
                    const badge = badges[item.path] || 0;
                    return (
                      <li key={item.path}>
                        <NavLink
                          to={item.path}
                          end={item.path === '/'}
                          onClick={isMobile ? onCloseMobile : undefined}
                          title={compact ? item.label : undefined}
                          className={({ isActive }) =>
                            cn(
                              'group relative flex items-center gap-3 rounded-xl text-sm font-medium transition-colors',
                              compact ? 'h-10 justify-center' : 'px-2.5 py-2',
                              isActive ? 'bg-primary-soft text-primary' : 'text-muted hover:bg-sunken hover:text-fg',
                            )
                          }
                        >
                          {({ isActive }) => (
                            <>
                              {isActive && !compact && <span className="absolute -left-3 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-primary" />}
                              <item.icon className="h-[18px] w-[18px] shrink-0" />
                              {!compact && <span className="flex-1 truncate">{item.label}</span>}
                              {!compact && <CountPill value={badge} tone={BADGE_TONE[item.path] || 'primary'} />}
                              {compact && badge > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-surface" />}
                            </>
                          )}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>

        {!isMobile && (
          <div className="border-t border-line p-3">
            <button
              onClick={onToggleCollapsed}
              className={cn('flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-[13px] text-muted hover:bg-sunken hover:text-fg', compact && 'justify-center px-0')}
              title={compact ? 'Mở rộng menu' : 'Thu gọn menu'}
            >
              {compact ? <ChevronsRight className="h-4 w-4" /> : <ChevronsLeft className="h-4 w-4" />}
              {!compact && 'Thu gọn'}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 border-r border-line bg-surface transition-[width] duration-200 lg:block',
          collapsed ? 'w-[72px]' : 'w-64',
        )}
      >
        {content(false)}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-[55] lg:hidden">
          <div className="absolute inset-0 animate-fade-in bg-slate-950/40" onClick={onCloseMobile} />
          <aside className="relative h-full w-72 max-w-[85vw] animate-slide-up bg-surface shadow-pop">{content(true)}</aside>
        </div>
      )}
    </>
  );
};
