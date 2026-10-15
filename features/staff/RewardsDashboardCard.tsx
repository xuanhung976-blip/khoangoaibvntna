import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gift } from 'lucide-react';
import type { StaffReward } from '../../types';
import { getStaffRewards } from '../../services/dataService';
import { KEYS, useDirectory } from '../../hooks/useData';
import { useResource } from '../../lib/resource';
import { fmtDayMonth, todayKey } from '../../lib/dates';
import { cn } from '../../lib/cn';
import { Avatar, Button, EmptyState, SectionCard, Skeleton } from '../../components/ui';
import { fmtSigned, normalizeReward } from './staffLogic';

/** Thưởng / phạt tháng hiện tại của cả khoa — cho trưởng khoa trên trang Tổng quan. */
export const RewardsDashboardCard: React.FC = () => {
  const navigate = useNavigate();
  const today = todayKey();
  const monthFrom = `${today.slice(0, 7)}-01`;
  const { data, loading } = useResource<StaffReward[]>(KEYS.staffRewards, async options => ((await getStaffRewards(options)) || []).map(normalizeReward));
  const { users } = useDirectory();

  const view = useMemo(() => {
    const staff = new Set(users.map(user => user.username));
    const month = (data || []).filter(reward => staff.has(reward.userId) && reward.ngay >= monthFrom && reward.ngay <= today);
    const byPerson = new Map<string, { bonus: number; penalty: number }>();
    month.forEach(reward => {
      const entry = byPerson.get(reward.userId) || { bonus: 0, penalty: 0 };
      if (reward.loai === 'Phạt') entry.penalty += Number(reward.diem);
      else entry.bonus += Number(reward.diem);
      byPerson.set(reward.userId, entry);
    });
    const people = [...byPerson.entries()]
      .map(([username, totals]) => ({ username, fullName: users.find(user => user.username === username)?.fullName || username, ...totals, net: totals.bonus - totals.penalty }))
      .sort((a, b) => a.net - b.net);
    return {
      bonus: people.reduce((sum, person) => sum + person.bonus, 0),
      penalty: people.reduce((sum, person) => sum + person.penalty, 0),
      people,
      recent: [...month].sort((a, b) => b.ngay.localeCompare(a.ngay)).slice(0, 4),
    };
  }, [data, users, monthFrom, today]);
  const nameOf = (username: string) => users.find(user => user.username === username)?.fullName || username;

  return (
    <SectionCard
      title={`Thưởng / phạt T${Number(today.slice(5, 7))}`}
      description="Cộng trừ vào đánh giá quý theo TB tháng"
      icon={Gift}
      iconTone="success"
      actions={
        <Button size="sm" variant="ghost" onClick={() => navigate('/staff-performance?tab=rewards')}>
          Xem bảng
        </Button>
      }
      bodyClassName="p-4"
    >
      {loading && !data ? (
        <Skeleton className="h-32 w-full" />
      ) : view.people.length === 0 ? (
        <EmptyState compact icon={Gift} title="Tháng này chưa ghi thưởng / phạt" />
      ) : (
        <div className="space-y-4">
          <div className="flex items-baseline gap-4">
            <span className="num text-2xl font-semibold text-blue-600 dark:text-blue-400">+{view.bonus}</span>
            <span className="num text-2xl font-semibold text-rose-600 dark:text-rose-400">−{view.penalty}</span>
            <span className="text-xs text-muted">{view.people.length} người có phát sinh</span>
          </div>
          <ul className="space-y-1.5">
            {view.people.slice(0, 5).map(person => (
              <li key={person.username} className="flex items-center gap-2.5 text-sm">
                <Avatar name={person.fullName} size="xs" />
                <span className="min-w-0 flex-1 truncate text-fg">{person.fullName}</span>
                <span className="num text-xs text-blue-600 dark:text-blue-400">+{person.bonus}</span>
                <span className="num text-xs text-rose-600 dark:text-rose-400">−{person.penalty}</span>
                <span className={cn('num w-8 text-right text-xs font-semibold', person.net < 0 ? 'text-rose-600' : person.net > 0 ? 'text-blue-600' : 'text-faint')}>{fmtSigned(person.net)}</span>
              </li>
            ))}
          </ul>
          <div className="border-t border-line pt-3">
            <p className="mb-1.5 text-xs font-medium text-muted">Gần đây</p>
            <ul className="space-y-1">
              {view.recent.map(reward => (
                <li key={reward.id} className="flex items-center gap-2 text-xs">
                  <span className="num w-10 shrink-0 text-faint">{fmtDayMonth(reward.ngay)}</span>
                  <span className={cn('num w-7 shrink-0 font-semibold', reward.loai === 'Phạt' ? 'text-rose-600' : 'text-blue-600')}>
                    {reward.loai === 'Phạt' ? '−' : '+'}
                    {reward.diem}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-fg">
                    {nameOf(reward.userId)} · <span className="text-muted">{reward.lyDo}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </SectionCard>
  );
};
