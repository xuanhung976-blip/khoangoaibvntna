import React from 'react';
import { Menu, LogOut, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface TopbarProps {
  user: User;
  onSidebarToggle: () => void;
  onLogout: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ user, onSidebarToggle, onLogout }) => {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6">
      <div className="flex items-center gap-4">
        <button
          onClick={onSidebarToggle}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold text-slate-800 hidden sm:block">
            Hệ thống Quản lý
        </h1>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                <UserIcon className="h-5 w-5" />
            </div>
            <div className="hidden md:block text-sm">
                <p className="font-medium text-slate-700">{user.fullName}</p>
            </div>
        </div>
        <button 
            onClick={onLogout}
            className="rounded-md p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
            title="Đăng xuất"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
};