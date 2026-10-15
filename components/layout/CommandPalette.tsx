import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarPlus,
  ClipboardPlus,
  CornerDownLeft,
  HeartPulse,
  KeyRound,
  LogOut,
  Moon,
  Printer,
  Search,
  Stethoscope,
  Sun,
  UserPlus,
  type LucideIcon,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { usePatients } from '../../hooks/useData';
import { useAccess } from '../../hooks/useAccess';
import { cn } from '../../lib/cn';
import { statusMeta } from '../../lib/domain';
import { fold, relevance } from '../../lib/text';
import { todayKey } from '../../lib/dates';
import { Badge, Portal, scrollListTo } from '../ui';
import { ALL_NAV_ITEMS } from './nav';

type CommandItem = {
  id: string;
  group: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  keywords?: string;
  meta?: React.ReactNode;
  run: () => void;
};

export const CommandPalette: React.FC = () => {
  const { commandOpen, setCommandOpen, chief, dark, setTheme, logout, setPasswordOpen } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const { data: patients } = usePatients();
  const { can } = useAccess();

  // Phím tắt toàn cục: Ctrl/⌘+K hoặc "/" khi không gõ trong ô nhập.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const typing = ['INPUT', 'TEXTAREA', 'SELECT'].includes(target?.tagName) || target?.isContentEditable;
      if ((event.key === 'k' || event.key === 'K') && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        setCommandOpen(!commandOpen);
      } else if (event.key === '/' && !typing && !commandOpen) {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commandOpen, setCommandOpen]);

  useEffect(() => {
    if (commandOpen) {
      setQuery('');
      setActive(0);
      window.setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [commandOpen]);

  const go = (path: string) => () => navigate(path);

  const items = useMemo<CommandItem[]>(() => {
    const actions: CommandItem[] = [
      { id: 'a-new-patient', group: 'Thao tác nhanh', label: 'Tiếp nhận bệnh nhân mới', icon: UserPlus, keywords: 'them benh nhan nhap vien', run: go('/clinical?new=1') },
      { id: 'a-approve', group: 'Thao tác nhanh', label: 'Duyệt mổ bệnh nhân chờ', icon: Stethoscope, keywords: 'duyet mo', run: go('/surgery-approval') },
      { id: 'a-schedule-today', group: 'Thao tác nhanh', label: 'Xem / in lịch mổ hôm nay', icon: Printer, keywords: 'lich mo in hom nay', run: go(`/surgery-approval?tab=schedule&date=${todayKey()}`) },
      { id: 'a-briefing', group: 'Thao tác nhanh', label: 'Ghi sổ giao ban hôm nay', icon: ClipboardPlus, keywords: 'giao ban moi', run: go('/daily-briefing?new=1') },
      { id: 'a-nursing', group: 'Thao tác nhanh', label: 'Thêm việc điều dưỡng', icon: HeartPulse, keywords: 'dieu duong viec ca', run: go('/nursing-tasks?new=1') },
      { id: 'a-shifts', group: 'Thao tác nhanh', label: 'Phân lịch trực tuần', icon: CalendarPlus, keywords: 'lich truc tuan', run: go('/shifts?view=week') },
      { id: 'a-password', group: 'Tài khoản', label: 'Đổi mật khẩu', icon: KeyRound, keywords: 'mat khau', run: () => setPasswordOpen(true) },
      { id: 'a-theme', group: 'Tài khoản', label: dark ? 'Chuyển giao diện sáng' : 'Chuyển giao diện tối', icon: dark ? Sun : Moon, keywords: 'giao dien sang toi dark mode', run: () => setTheme(dark ? 'light' : 'dark') },
      { id: 'a-logout', group: 'Tài khoản', label: 'Đăng xuất', icon: LogOut, keywords: 'dang xuat thoat', run: logout },
    ];
    const pages: CommandItem[] = ALL_NAV_ITEMS.filter(item => (!item.chiefOnly || chief) && can(item.module)).map(item => ({
      id: `p-${item.path}`,
      group: 'Đi tới',
      label: item.label,
      description: item.description,
      icon: item.icon,
      keywords: item.keywords,
      run: go(item.path),
    }));
    return [...actions, ...pages];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chief, dark, can]);

  const results = useMemo(() => {
    const q = query.trim();
    const scored = items
      .map(item => ({ item, score: relevance(q, item.label, item.keywords, item.description) }))
      .filter(entry => entry.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(entry => entry.item);

    let patientItems: CommandItem[] = [];
    if (q.length >= 2 && patients?.length) {
      const fq = fold(q);
      patientItems = patients
        .map(patient => ({
          patient,
          score:
            relevance(q, patient.name, patient.id, patient.phoneNumber) +
            (fold(patient.diagnosis).includes(fq) ? 10 : 0) +
            (patient.status !== 'RaVien' ? 15 : 0),
        }))
        .filter(entry => entry.score > 15)
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(({ patient }) => {
          const meta = statusMeta(patient.status);
          return {
            id: `bn-${patient.id}`,
            group: 'Bệnh nhân',
            label: patient.name,
            description: [patient.id, patient.room && `P.${patient.room}${patient.bed ? `/${patient.bed}` : ''}`, patient.diagnosis].filter(Boolean).join(' · '),
            icon: Stethoscope,
            meta: <Badge tone={meta.tone}>{meta.short}</Badge>,
            run: go(`/clinical?id=${encodeURIComponent(patient.id)}`),
          };
        });
    }
    const merged = q ? [...patientItems, ...scored] : scored;
    return merged.slice(0, 40);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, query, patients]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    scrollListTo(listRef.current, active);
  }, [active]);

  if (!commandOpen) return null;

  const run = (item?: CommandItem) => {
    if (!item) return;
    setCommandOpen(false);
    item.run();
  };

  const groups: Array<{ name: string; entries: Array<{ item: CommandItem; index: number }> }> = [];
  results.forEach((item, index) => {
    let group = groups.find(entry => entry.name === item.group);
    if (!group) {
      group = { name: item.group, entries: [] };
      groups.push(group);
    }
    group.entries.push({ item, index });
  });

  return (
    <Portal>
      <div className="fixed inset-0 z-[90] flex items-start justify-center p-3 pt-[10vh]">
        <div className="absolute inset-0 animate-fade-in bg-slate-950/40 backdrop-blur-[2px]" onClick={() => setCommandOpen(false)} />
        <div className="relative w-full max-w-xl animate-scale-in overflow-hidden rounded-2xl border border-line bg-surface shadow-pop" role="dialog" aria-label="Bảng lệnh">
          <div className="flex items-center gap-3 border-b border-line px-4">
            <Search className="h-5 w-5 text-faint" />
            <input
              ref={inputRef}
              value={query}
              onChange={event => setQuery(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'ArrowDown') {
                  event.preventDefault();
                  setActive(index => Math.min(results.length - 1, index + 1));
                } else if (event.key === 'ArrowUp') {
                  event.preventDefault();
                  setActive(index => Math.max(0, index - 1));
                } else if (event.key === 'Enter') {
                  event.preventDefault();
                  run(results[active]);
                } else if (event.key === 'Escape') {
                  setCommandOpen(false);
                }
              }}
              placeholder="Gõ tên bệnh nhân, mã BN, chức năng…"
              className="h-14 flex-1 bg-transparent text-[15px] text-fg outline-none placeholder:text-faint"
            />
            <kbd className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-faint">Esc</kbd>
          </div>
          <div ref={listRef} className="scrollbar-thin max-h-[60vh] overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted">Không tìm thấy “{query}”.</p>
            ) : (
              groups.map(group => (
                <div key={group.name} className="mb-1">
                  <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-faint">{group.name}</p>
                  {group.entries.map(({ item, index }) => (
                    <button
                      key={item.id}
                      data-index={index}
                      onMouseMove={() => setActive(index)}
                      onClick={() => run(item)}
                      className={cn('flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left', index === active ? 'bg-sunken' : '')}
                    >
                      <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', index === active ? 'bg-primary text-primary-fg' : 'bg-sunken text-muted ring-1 ring-line')}>
                        <item.icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">{item.label}</span>
                        {item.description && <span className="block truncate text-xs text-muted">{item.description}</span>}
                      </span>
                      {item.meta}
                      {index === active ? <CornerDownLeft className="h-4 w-4 text-faint" /> : <ArrowRight className="h-4 w-4 text-transparent" />}
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
          <div className="flex items-center gap-4 border-t border-line bg-sunken/60 px-4 py-2 text-[11px] text-faint">
            <span>↑↓ di chuyển</span>
            <span>↵ chọn</span>
            <span className="ml-auto">Mẹo: nhấn “/” ở bất cứ đâu để tìm nhanh</span>
          </div>
        </div>
      </div>
    </Portal>
  );
};
