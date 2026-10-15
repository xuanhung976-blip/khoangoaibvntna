import React from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, HeartPulse, LayoutDashboard, Menu, Stethoscope } from 'lucide-react';
import { cn } from '../../lib/cn';
import { useAccess } from '../../hooks/useAccess';
import { findNavItem } from './nav';

const ITEMS = [
  { path: '/', label: 'Tổng quan', icon: LayoutDashboard },
  { path: '/clinical', label: 'Bệnh nhân', icon: Stethoscope },
  { path: '/surgery-approval', label: 'Lịch mổ', icon: Activity },
  { path: '/nursing-tasks', label: 'Điều dưỡng', icon: HeartPulse },
];

/** Thanh điều hướng dưới cùng cho điện thoại. */
export const MobileNav: React.FC<{ onOpenMenu: () => void; badges: Record<string, number> }> = ({ onOpenMenu, badges }) => {
  const { can } = useAccess();
  const items = ITEMS.filter(item => can(findNavItem(item.path)?.module));
  return (
  <nav className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden">
    <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))` }}>
      {items.map(item => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === '/'}
          className={({ isActive }) => cn('relative flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium', isActive ? 'text-primary' : 'text-muted')}
        >
          <span className="relative">
            <item.icon className="h-5 w-5" />
            {(badges[item.path] || 0) > 0 && <span className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-surface" />}
          </span>
          {item.label}
        </NavLink>
      ))}
      <button onClick={onOpenMenu} className="flex flex-col items-center gap-0.5 py-2 text-[10.5px] font-medium text-muted">
        <Menu className="h-5 w-5" />
        Thêm
      </button>
    </div>
  </nav>
  );
};
