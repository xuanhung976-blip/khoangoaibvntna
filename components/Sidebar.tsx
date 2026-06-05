import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Stethoscope,
  CheckCircle,
  AlertOctagon,
  BarChart3,
  BookOpen,
  Users2,
  CalendarDays,
  ClipboardCheck,
  Lightbulb,
  Megaphone,
  FlaskConical,
  Archive,
  HeartPulse,
  Clock,
  UserCog,
  X,
} from 'lucide-react';
import { Role, APP_LOGO_URL } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: Role;
}

const MENU_GROUPS = [
  {
    title: 'Tổng quan',
    items: [{ label: 'Dashboard', icon: LayoutDashboard, path: '/', roles: [] }],
  },
  {
    title: 'I. Chuyên môn',
    items: [
      { label: 'Quản lý Bệnh nhân', icon: Stethoscope, path: '/clinical', roles: [] },
      { label: 'Duyệt mổ', icon: CheckCircle, path: '/surgery-approval', roles: [] },
      { label: 'BN cần lưu ý', icon: AlertOctagon, path: '/vip-patients', roles: [] },
      { label: 'Thống kê phẫu thuật', icon: BarChart3, path: '/surgery-stats', roles: [] },
    ],
  },
  {
    title: 'II. Phát triển Khoa học',
    items: [
      { label: 'Đề tài nghiên cứu', icon: BookOpen, path: '/research', roles: [] },
      { label: 'Sinh hoạt khoa học', icon: Users2, path: '/science-meetings', roles: [] },
    ],
  },
  {
    title: 'III. Hành chính - Điều hành',
    items: [
      { label: 'Giao ban hàng ngày', icon: CalendarDays, path: '/daily-briefing', roles: [] },
      { label: 'Công việc & Đánh giá', icon: ClipboardCheck, path: '/staff-performance', roles: [] },
      { label: 'Kỹ thuật mới', icon: Lightbulb, path: '/new-techniques', roles: [] },
      { label: 'Truyền thông khoa', icon: Megaphone, path: '/communication', roles: [] },
    ],
  },
  {
    title: 'IV. Hành chính & Dược',
    items: [
      { label: 'Dược & Vật tư', icon: FlaskConical, path: '/inventory', roles: [] },
      { label: '5S & Thiết bị', icon: Archive, path: '/5s', roles: [] },
    ],
  },
  {
    title: 'V. Điều dưỡng',
    items: [
      { label: 'Công tác điều dưỡng', icon: HeartPulse, path: '/nursing-tasks', roles: [] },
      { label: 'Phân ca trực', icon: Clock, path: '/shifts', roles: [] },
    ],
  },
  {
    title: 'VII. Admin',
    items: [
      { label: 'Quản lý người dùng', icon: UserCog, path: '/users', roles: [Role.CHIEF] },
    ],
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, userRole }) => {
  const location = useLocation();

  const getNavClasses = (path: string) => {
    const isActive = path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

    return `flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;
  };

  const hasPermission = (allowedRoles: Role[]) => {
    if (allowedRoles.length === 0) return true;
    const normalizedRole = String(userRole).toUpperCase() === 'ADMIN' ? Role.CHIEF : userRole;
    return allowedRoles.includes(normalizedRole);
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform bg-white border-r border-slate-200 transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-6">
          <div className="flex items-center gap-3 font-bold text-blue-700 text-lg">
            <img
              src={APP_LOGO_URL}
              alt=""
              referrerPolicy="no-referrer"
              className="h-10 w-10 rounded-full object-cover bg-white shadow-sm border border-slate-200"
            />
            <span>Khoa Ngoại TH</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-500">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex flex-col p-4 overflow-y-auto h-[calc(100vh-4rem)]">
          {MENU_GROUPS.map((group, groupIdx) => {
            const visibleItems = group.items.filter((item) => hasPermission(item.roles));
            if (visibleItems.length === 0) return null;

            return (
              <div key={groupIdx} className="mb-6">
                <div className="px-3 mb-2 text-xs font-bold uppercase text-slate-400 tracking-wider">
                  {group.title}
                </div>
                <div className="space-y-1">
                  {visibleItems.map((item, itemIdx) => (
                    <Link key={itemIdx} to={item.path} className={getNavClasses(item.path)}>
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </aside>
    </>
  );
};
