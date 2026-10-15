import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Gift, Minus, Plus, Trash2 } from 'lucide-react';
import type { StaffReward } from '../../types';
import { fmtDate } from '../../lib/dates';
import { matchesQuery } from '../../lib/text';
import { cn } from '../../lib/cn';
import { Avatar, Badge, Button, Combobox, Dialog, Drawer, EmptyState, Field, FormGrid, Input, SearchInput, Segmented, SkeletonRows, Textarea, Toolbar } from '../../components/ui';
import { REWARD_CAP, REWARD_PRESETS, fmtSigned, rewardMonths, rewardPeriod, rewardsOf, type RewardTotals } from './staffLogic';

const QUARTERS = [1, 2, 3, 4];
const pad = (value: number) => String(value).padStart(2, '0');
const monthRange = (year: number, month: number) => ({ from: `${year}-${pad(month)}-01`, to: `${year}-${pad(month)}-${new Date(year, month, 0).getDate()}` });

const SignedValue: React.FC<{ value: number; className?: string; title?: string }> = ({ value, className, title }) => (
  <span
    title={title}
    className={cn(
      'num font-semibold',
      value > 0 ? 'text-blue-600 dark:text-blue-400' : value < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-faint',
      className,
    )}
  >
    {fmtSigned(value)}
  </span>
);

/** Ô một tháng: hai dòng thưởng / phạt. */
const MonthCell: React.FC<{ totals: RewardTotals; onClick: () => void }> = ({ totals, onClick }) => (
  <button
    onClick={onClick}
    className="flex h-11 w-full flex-col items-center justify-center rounded-lg text-[11px] leading-tight hover:bg-sunken"
    title={totals.count ? `${totals.count} lần · thưởng ${totals.bonus}, phạt ${totals.penalty}` : 'Chưa có — bấm để ghi'}
  >
    {totals.count ? (
      <>
        <span className={cn('num', totals.bonus ? 'font-semibold text-blue-600 dark:text-blue-400' : 'text-faint')}>+{totals.bonus}</span>
        <span className={cn('num', totals.penalty ? 'font-semibold text-rose-600 dark:text-rose-400' : 'text-faint')}>−{totals.penalty}</span>
      </>
    ) : (
      <span className="text-faint">·</span>
    )}
  </button>
);

export type RewardScope = { username: string; from: string; to: string; label: string };

/* ---------------- Bảng 12 tháng ---------------- */

export const RewardsTab: React.FC<{
  manager: boolean;
  me: string;
  users: Array<{ username: string; fullName: string }>;
  rewards: StaffReward[];
  loading: boolean;
  year: number;
  onYearChange: (year: number) => void;
  onOpen: (scope: RewardScope) => void;
}> = ({ manager, me, users, rewards, loading, year, onYearChange, onOpen }) => {
  const [search, setSearch] = useState('');
  const people = useMemo(
    () =>
      (manager ? users : users.filter(user => user.username === me))
        .filter(user => matchesQuery(search, user.fullName, user.username))
        .map(user => ({
          ...user,
          months: rewardMonths(rewards, user.username, year),
          quarters: QUARTERS.map(quarter => rewardPeriod(rewards, user.username, { loaiDanhGia: 'Quý', quy: `Q${quarter}`, nam: year })),
          yearly: rewardPeriod(rewards, user.username, { loaiDanhGia: 'Năm', nam: year }),
        })),
    [manager, users, me, rewards, year, search],
  );
  const nameOf = (username: string) => users.find(user => user.username === username)?.fullName || username;

  return (
    <>
      <Toolbar>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" iconOnly icon={ChevronLeft} onClick={() => onYearChange(year - 1)} aria-label="Năm trước" />
          <span className="num w-14 text-center text-sm font-semibold text-fg">{year}</span>
          <Button size="sm" variant="ghost" iconOnly icon={ChevronRight} onClick={() => onYearChange(year + 1)} aria-label="Năm sau" />
        </div>
        {manager && <SearchInput value={search} onChange={setSearch} placeholder="Tìm nhân viên…" className="sm:w-64" />}
        <p className="text-xs text-muted sm:ml-auto">
          Điểm quý / năm = TB (thưởng − phạt) mỗi tháng, chia đủ 3 / 12 tháng · cộng trừ vào đánh giá, tối đa ±{REWARD_CAP}
        </p>
      </Toolbar>
      {loading ? (
        <SkeletonRows />
      ) : people.length === 0 ? (
        <EmptyState icon={Gift} title="Không có nhân viên phù hợp" />
      ) : (
        <div className="scrollbar-thin overflow-x-auto">
          <table className="w-full min-w-[1100px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-line text-xs text-muted">
                <th className="sticky left-0 z-10 bg-surface px-4 py-2 text-left font-medium">Nhân viên</th>
                {QUARTERS.map(quarter => (
                  <React.Fragment key={quarter}>
                    {[1, 2, 3].map(offset => (
                      <th key={offset} className="w-12 px-0.5 py-2 text-center font-medium">
                        T{(quarter - 1) * 3 + offset}
                      </th>
                    ))}
                    <th className="w-14 bg-sunken/60 px-1 py-2 text-center font-semibold text-fg">Q{quarter}</th>
                  </React.Fragment>
                ))}
                <th className="w-16 bg-primary-soft px-2 py-2 text-center font-semibold text-fg">Năm</th>
              </tr>
            </thead>
            <tbody>
              {people.map(person => (
                <tr key={person.username} className="border-b border-line last:border-0">
                  <td className="sticky left-0 z-10 bg-surface px-4 py-1.5">
                    <button
                      className="flex items-center gap-2 text-left"
                      onClick={() => onOpen({ username: person.username, from: `${year}-01-01`, to: `${year}-12-31`, label: `Năm ${year}` })}
                    >
                      <Avatar name={person.fullName} size="xs" />
                      <span className="max-w-[180px] truncate font-medium text-fg">{person.fullName}</span>
                    </button>
                  </td>
                  {QUARTERS.map(quarter => (
                    <React.Fragment key={quarter}>
                      {[1, 2, 3].map(offset => {
                        const month = (quarter - 1) * 3 + offset;
                        return (
                          <td key={offset} className="px-0.5 py-1">
                            <MonthCell
                              totals={person.months[month - 1]}
                              onClick={() => onOpen({ username: person.username, ...monthRange(year, month), label: `Tháng ${month}/${year}` })}
                            />
                          </td>
                        );
                      })}
                      <td className="bg-sunken/60 px-1 text-center">
                        <SignedValue
                          value={person.quarters[quarter - 1].applied}
                          title={`TB tháng ${person.quarters[quarter - 1].average} (thưởng ${person.quarters[quarter - 1].bonus}, phạt ${person.quarters[quarter - 1].penalty})`}
                        />
                      </td>
                    </React.Fragment>
                  ))}
                  <td className="bg-primary-soft px-2 text-center">
                    <SignedValue value={person.yearly.applied} title={`TB tháng ${person.yearly.average}`} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {!manager && !loading && rewardsOf(rewards, me, `${year}-01-01`, `${year}-12-31`).length === 0 && (
        <p className="px-5 pb-5 text-sm text-muted">{nameOf(me)} chưa có lần thưởng / phạt nào trong năm {year}.</p>
      )}
    </>
  );
};

/* ---------------- Chi tiết một người trong một khoảng ---------------- */

export const RewardDrawer: React.FC<{
  scope: RewardScope | null;
  name: string;
  rewards: StaffReward[];
  manager: boolean;
  onClose: () => void;
  onAdd: (username: string, date: string) => void;
  onDelete: (reward: StaffReward) => void;
  today: string;
}> = ({ scope, name, rewards, manager, onClose, onAdd, onDelete, today }) => {
  if (!scope) return null;
  const list = rewardsOf(rewards, scope.username, scope.from, scope.to).sort((a, b) => b.ngay.localeCompare(a.ngay));
  const bonus = list.filter(item => item.loai === 'Thưởng').reduce((sum, item) => sum + Number(item.diem), 0);
  const penalty = list.filter(item => item.loai === 'Phạt').reduce((sum, item) => sum + Number(item.diem), 0);
  const defaultDate = today >= scope.from && today <= scope.to ? today : scope.from;
  return (
    <Drawer
      open
      onClose={onClose}
      size="md"
      title={
        <span className="flex items-center gap-2.5">
          <Avatar name={name} size="sm" /> {name}
        </span>
      }
      subtitle={`Thưởng / phạt · ${scope.label}`}
      footer={
        manager ? (
          <Button variant="primary" icon={Plus} onClick={() => onAdd(scope.username, defaultDate)}>
            Ghi thưởng / phạt
          </Button>
        ) : undefined
      }
    >
      <div className="space-y-4">
        <dl className="grid grid-cols-3 gap-2 text-center">
          {[
            { label: 'Thưởng', value: `+${bonus}`, tone: 'text-blue-600 dark:text-blue-400' },
            { label: 'Phạt', value: `−${penalty}`, tone: 'text-rose-600 dark:text-rose-400' },
            { label: 'Cộng dồn', value: fmtSigned(bonus - penalty), tone: 'text-fg' },
          ].map(item => (
            <div key={item.label} className="rounded-xl bg-sunken py-2.5">
              <dt className="text-[11px] text-muted">{item.label}</dt>
              <dd className={cn('num text-lg font-semibold', item.tone)}>{item.value}</dd>
            </div>
          ))}
        </dl>
        {list.length === 0 ? (
          <EmptyState compact icon={Gift} title="Chưa có lần thưởng / phạt nào" />
        ) : (
          <ul className="space-y-2">
            {list.map(item => (
              <li key={item.id} className="flex items-start gap-3 rounded-xl border border-line p-3">
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                    item.loai === 'Thưởng' ? 'bg-blue-50 text-blue-600 dark:bg-blue-500/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10',
                  )}
                >
                  {item.loai === 'Thưởng' ? <Plus className="h-4 w-4" /> : <Minus className="h-4 w-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone={item.loai === 'Thưởng' ? 'success' : 'danger'}>
                      {item.loai} {item.diem}
                    </Badge>
                    <span className="text-xs text-muted">{fmtDate(item.ngay)}</span>
                  </div>
                  <p className="mt-1 whitespace-pre-line text-sm text-fg">{item.lyDo}</p>
                  <p className="mt-0.5 text-xs text-faint">Ghi bởi {item.nguoiGhi || '—'}</p>
                </div>
                {manager && <Button size="xs" variant="ghost" iconOnly icon={Trash2} onClick={() => onDelete(item)} aria-label="Xoá" />}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Drawer>
  );
};

/* ---------------- Ghi một lần thưởng / phạt ---------------- */

export const RewardDialog: React.FC<{
  draft: Partial<StaffReward> | null;
  onChange: (draft: Partial<StaffReward>) => void;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  userOptions: Array<{ value: string; label: string; keywords?: string }>;
}> = ({ draft, onChange, onClose, onSave, saving, userOptions }) => {
  if (!draft) return null;
  const type = draft.loai === 'Phạt' ? 'Phạt' : 'Thưởng';
  const patch = (value: Partial<StaffReward>) => onChange({ ...draft, ...value });
  return (
    <Dialog
      open
      persistent
      onClose={onClose}
      title="Ghi thưởng / phạt"
      description="Điểm theo thang tháng; kỳ quý / năm lấy trung bình."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="primary" loading={saving} onClick={onSave}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FormGrid>
          <Field label="Nhân viên" required>
            <Combobox value={draft.userId || ''} onChange={value => patch({ userId: value })} options={userOptions} placeholder="Chọn nhân viên" />
          </Field>
          <Field label="Ngày" required>
            <Input type="date" value={draft.ngay || ''} onChange={event => patch({ ngay: event.target.value })} />
          </Field>
        </FormGrid>
        <Field label="Loại">
          <Segmented<StaffReward['loai']>
            value={type}
            onChange={value => patch({ loai: value })}
            items={[
              { value: 'Thưởng', label: 'Thưởng', icon: Plus },
              { value: 'Phạt', label: 'Phạt', icon: Minus },
            ]}
          />
        </Field>
        <Field label="Chọn nhanh">
          <div className="flex flex-wrap gap-2">
            {REWARD_PRESETS[type].map(preset => (
              <button
                key={preset.lyDo}
                onClick={() => patch({ diem: preset.diem, lyDo: preset.lyDo })}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs',
                  draft.lyDo === preset.lyDo ? 'border-primary bg-primary-soft text-fg' : 'border-line text-muted hover:bg-sunken',
                )}
              >
                {type === 'Thưởng' ? '+' : '−'}
                {preset.diem} · {preset.lyDo}
              </button>
            ))}
          </div>
        </Field>
        <FormGrid>
          <Field label="Số điểm" required>
            <Input type="number" min={1} max={20} value={draft.diem ?? ''} onChange={event => patch({ diem: event.target.value === '' ? '' : Math.abs(Number(event.target.value)) })} />
          </Field>
        </FormGrid>
        <Field label="Lý do" required hint="Ghi rõ sự việc để nhân viên và trưởng khoa đối chiếu khi đánh giá.">
          <Textarea value={draft.lyDo || ''} onChange={event => patch({ lyDo: event.target.value })} rows={3} />
        </Field>
      </div>
    </Dialog>
  );
};
