import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertOctagon,
  ArrowRight,
  BedDouble,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  HeartPulse,
  LogIn,
  LogOut,
  Presentation,
  RefreshCw,
  Scissors,
  Stethoscope,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useInsights } from '../../hooks/useInsights';
import { cn } from '../../lib/cn';
import { fmtDate, fmtDayMonth, fmtMonth, greeting, longToday, relativeDay, toDateKey } from '../../lib/dates';
import { shortName } from '../../lib/text';
import {
  Avatar,
  Badge,
  Button,
  Callout,
  Card,
  ColumnChart,
  EmptyState,
  Meter,
  Progress,
  SectionCard,
  Segmented,
  Skeleton,
  Sparkline,
  StatCard,
} from '../../components/ui';
import type { InsightSeverity } from './insights';
import { RewardsDashboardCard } from '../staff/RewardsDashboardCard';

const SEVERITY_STYLE: Record<InsightSeverity, { dot: string; badge: 'danger' | 'warning' | 'info'; label: string }> = {
  critical: { dot: 'bg-rose-500', badge: 'danger', label: 'Khẩn' },
  warning: { dot: 'bg-amber-500', badge: 'warning', label: 'Cần xử lý' },
  info: { dot: 'bg-sky-500', badge: 'info', label: 'Theo dõi' },
};

export const DashboardPage: React.FC = () => {
  const { user, chief } = useApp();
  const manager = chief || String(user.role) === 'DIEU_DUONG_TRUONG';
  const navigate = useNavigate();
  const { summary, loading, validating, error, reload } = useInsights();
  const [filter, setFilter] = useState<'all' | InsightSeverity>('all');

  const insights = useMemo(
    () => (filter === 'all' ? summary.insights : summary.insights.filter(item => item.severity === filter)),
    [summary.insights, filter],
  );
  const counts = useMemo(
    () => ({
      critical: summary.insights.filter(item => item.severity === 'critical').length,
      warning: summary.insights.filter(item => item.severity === 'warning').length,
      info: summary.insights.filter(item => item.severity === 'info').length,
    }),
    [summary.insights],
  );

  const firstName = shortName(user.fullName || user.username).split(' ').slice(-1)[0];
  const month = summary.month;
  const trendData = summary.trend.map(point => ({
    key: point.monthKey,
    label: `T${Number(point.monthKey.slice(5))}`,
    value: point.surgeries,
    tooltip: `${point.surgeries} phẫu thuật · ${point.procedures} RFA`,
    highlight: point.monthKey === summary.today.slice(0, 7),
  }));

  return (
    <div className="space-y-6">
      {/* Lời chào + thao tác nhanh */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm text-muted">{longToday()}</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-fg sm:text-[26px]">
            {greeting()}, {firstName} <span className="inline-block">👋</span>
          </h1>
          <p className="mt-1 text-sm text-muted">
            {loading ? (
              'Đang tổng hợp tình hình khoa…'
            ) : counts.critical + counts.warning > 0 ? (
              <>
                Có <b className="text-fg">{counts.critical + counts.warning}</b> việc cần xử lý
                {counts.critical > 0 && (
                  <>
                    , trong đó <b className="text-rose-600 dark:text-rose-400">{counts.critical} việc khẩn</b>
                  </>
                )}
                .
              </>
            ) : (
              'Mọi thứ đang trong tầm kiểm soát.'
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" icon={UserPlus} onClick={() => navigate('/clinical?new=1')}>
            Tiếp nhận BN
          </Button>
          <Button icon={Stethoscope} onClick={() => navigate('/surgery-approval')}>
            Duyệt mổ
          </Button>
          <Button icon={ClipboardList} onClick={() => navigate('/daily-briefing?new=1')} className="hidden sm:inline-flex">
            Giao ban
          </Button>
          <Button variant="ghost" iconOnly icon={RefreshCw} loading={validating} onClick={reload} title="Làm mới dữ liệu" aria-label="Làm mới" />
        </div>
      </div>

      {Boolean(error) && (
        <Callout tone="danger" title="Một phần dữ liệu chưa tải được" action={<Button size="sm" icon={RefreshCw} onClick={reload}>Thử lại</Button>}>
          Số liệu hiển thị có thể chưa đầy đủ. Kiểm tra kết nối hoặc phiên đăng nhập.
        </Callout>
      )}

      {/* Biến động hôm nay */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
          <p className="flex items-center gap-2 text-sm font-semibold text-fg">
            <HeartPulse className="h-4 w-4 text-primary" /> Biến động hôm nay
          </p>
          <span className="text-xs text-muted">
            Nội trú {summary.active.length}
            {summary.admittedToday.length - summary.dischargedToday.length !== 0 && (
              <span className={summary.admittedToday.length > summary.dischargedToday.length ? 'text-amber-600' : 'text-emerald-600'}>
                {' '}
                ({summary.admittedToday.length - summary.dischargedToday.length > 0 ? '+' : ''}
                {summary.admittedToday.length - summary.dischargedToday.length} so với đầu ngày)
              </span>
            )}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4 xl:grid-cols-7">
          {[
            { label: 'Nhập viện', value: summary.admittedToday.length, icon: LogIn, tone: 'text-sky-600 dark:text-sky-400', link: '/clinical' },
            { label: 'Ra viện', value: summary.dischargedToday.length, icon: LogOut, tone: 'text-emerald-600 dark:text-emerald-400', link: '/clinical?status=RaVien' },
            {
              label: 'Mổ hôm nay',
              value: `${summary.operatedToday.length}/${summary.operatedToday.length + summary.surgeryToday.length}`,
              sub: summary.surgeryToday.length ? `còn ${summary.surgeryToday.length} ca chờ` : summary.operatedToday.length ? 'đã xong' : 'không có ca',
              icon: Scissors,
              tone: 'text-violet-600 dark:text-violet-400',
              link: `/surgery-approval?tab=schedule&date=${summary.today}`,
            },
            { label: 'Hậu phẫu', value: summary.postOp.length, icon: Activity, tone: 'text-fg', link: '/clinical?status=DaMo' },
            { label: 'Nội khoa', value: summary.internal.length, icon: Stethoscope, tone: 'text-fg', link: '/clinical?status=DieuTri' },
            { label: 'Chờ duyệt mổ', value: summary.waiting.length, icon: ClipboardList, tone: summary.waiting.length ? 'text-amber-600 dark:text-amber-400' : 'text-fg', link: '/surgery-approval' },
            {
              label: 'Việc điều dưỡng',
              value: `${summary.nursing.done}/${summary.nursing.total}`,
              progress: summary.nursing.total ? (summary.nursing.done / summary.nursing.total) * 100 : 0,
              icon: HeartPulse,
              tone: 'text-fg',
              link: '/nursing-tasks',
            },
          ].map(item => (
            <button key={item.label} onClick={() => navigate(item.link)} className="bg-surface px-4 py-3 text-left transition-colors last:col-span-2 hover:bg-sunken xl:last:col-span-1">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <item.icon className="h-3.5 w-3.5" /> {item.label}
              </span>
              <span className={`num mt-0.5 block text-2xl font-semibold ${item.tone}`}>{loading ? '…' : item.value}</span>
              {'progress' in item ? (
                <Progress className="mt-1.5" value={item.progress as number} />
              ) : 'sub' in item ? (
                <span className="text-[11px] text-muted">{item.sub as string}</span>
              ) : null}
            </button>
          ))}
        </div>
      </Card>

      {summary.overdueSchedule.length > 0 && (
        <Callout
          tone="warning"
          title={`${summary.overdueSchedule.length} ca đã qua ngày mổ dự kiến nhưng chưa xác nhận`}
          action={
            <Button size="sm" onClick={() => navigate('/surgery-approval?tab=schedule&date=past')}>
              Xử lý
            </Button>
          }
        >
          Ví dụ: {summary.overdueSchedule.slice(0, 3).map(patient => `${patient.name} (${fmtDate(patient.surgeryDate)})`).join(', ')}
        </Callout>
      )}

      {/* Chỉ số chính */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          label="Bệnh nhân nội trú"
          value={loading ? <Skeleton className="h-8 w-14" /> : summary.active.length}
          icon={BedDouble}
          tone="primary"
          onClick={() => navigate('/clinical')}
          hint={`${summary.occupancy.used}/${summary.occupancy.total} giường`}
          footer={<Meter className="mt-3" value={summary.occupancy.used} max={summary.occupancy.total} />}
        />
        <StatCard
          label={`PT ${fmtMonth(summary.today.slice(0, 7)).toLowerCase()}`}
          value={loading ? <Skeleton className="h-8 w-14" /> : month.totalSurgeries}
          icon={TrendingUp}
          tone="success"
          onClick={() => navigate('/surgery-stats')}
          hint={`${month.totalProcedures} RFA${month.incompleteRecords ? ` · ${month.incompleteRecords} chờ phân loại` : ''}`}
          footer={
            <div className="mt-2">
              <Sparkline values={summary.trend.map(point => point.surgeries)} width={120} height={26} />
            </div>
          }
        />
        <StatCard
          label="Việc quá hạn"
          value={loading ? <Skeleton className="h-8 w-14" /> : summary.overdueTasks.length}
          icon={AlertOctagon}
          tone={summary.overdueTasks.length ? 'danger' : 'success'}
          onClick={() => navigate('/staff-performance?filter=overdue')}
          hint={`${summary.openTasks.length} việc đang mở`}
        />
        <StatCard
          label="Hồ sơ chờ phân loại PT"
          value={loading ? <Skeleton className="h-8 w-14" /> : summary.needsClassification.length}
          icon={ClipboardList}
          tone={summary.needsClassification.length ? 'warning' : 'success'}
          onClick={() => navigate('/clinical?status=CanPhanLoai&month=all')}
          hint="Chưa được tính vào thống kê"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Việc cần xử lý */}
        <SectionCard
          className="xl:col-span-2"
          title="Việc cần xử lý"
          description="Tự động tổng hợp và xếp theo mức độ ưu tiên"
          icon={AlertOctagon}
          iconTone="danger"
          actions={
            <Segmented
              size="sm"
              value={filter}
              onChange={setFilter}
              items={[
                { value: 'all', label: 'Tất cả', count: summary.insights.length },
                { value: 'critical', label: 'Khẩn', count: counts.critical },
                { value: 'warning', label: 'Cần xử lý', count: counts.warning },
                { value: 'info', label: 'Theo dõi', count: counts.info },
              ]}
            />
          }
        >
          {loading ? (
            <div className="space-y-3 p-5">
              {[0, 1, 2, 3].map(index => (
                <Skeleton key={index} className="h-12 w-full" />
              ))}
            </div>
          ) : insights.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Không có việc nào trong mục này" description="Hệ thống sẽ tự cập nhật khi có thay đổi." />
          ) : (
            <ul className="divide-y divide-line">
              {insights.slice(0, 14).map(item => {
                const style = SEVERITY_STYLE[item.severity];
                return (
                  <li key={item.id}>
                    <button onClick={() => navigate(item.link)} className="group flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-sunken/70 sm:px-5">
                      <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4', style.dot, item.severity === 'critical' ? 'ring-rose-500/15' : item.severity === 'warning' ? 'ring-amber-500/15' : 'ring-sky-500/15')} />
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-sm font-medium text-fg">{item.title}</span>
                          <Badge tone={style.badge}>{item.module}</Badge>
                        </span>
                        {(item.detail || item.assignee) && (
                          <span className="mt-0.5 block text-xs text-muted">
                            {item.detail}
                            {item.assignee && <span className="text-faint"> · Phụ trách: {item.assignee}</span>}
                          </span>
                        )}
                      </span>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                    </button>
                  </li>
                );
              })}
              {insights.length > 14 && <li className="px-5 py-3 text-center text-xs text-muted">… và {insights.length - 14} mục khác</li>}
            </ul>
          )}
        </SectionCard>

        <div className="space-y-6">
          {/* Kíp trực */}
          <SectionCard
            title="Kíp trực hôm nay"
            icon={CalendarClock}
            actions={
              <Button size="sm" variant="ghost" onClick={() => navigate('/shifts')}>
                Lịch trực
              </Button>
            }
          >
            {summary.todayShift?.doctor ? (
              <ul className="space-y-3 p-4">
                {[
                  { role: 'Bác sĩ trực', name: summary.todayShift.doctor },
                  { role: 'Điều dưỡng 1', name: summary.todayShift.nurse1 },
                  { role: 'Điều dưỡng 2', name: summary.todayShift.nurse2 },
                ]
                  .filter(item => item.name)
                  .map(item => (
                    <li key={item.role} className="flex items-center gap-3">
                      <Avatar name={item.name} size="sm" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-fg">{item.name}</p>
                        <p className="text-xs text-muted">{item.role}</p>
                      </div>
                    </li>
                  ))}
                {summary.todayShift.note && <li className="rounded-lg bg-sunken px-3 py-2 text-xs text-muted">{summary.todayShift.note}</li>}
                <li className="border-t border-line pt-3 text-xs text-muted">
                  Ngày mai:{' '}
                  {summary.tomorrowShift?.doctor ? (
                    <span className="font-medium text-fg">{summary.tomorrowShift.doctor}</span>
                  ) : (
                    <span className="font-medium text-amber-600">chưa phân công</span>
                  )}
                </li>
              </ul>
            ) : (
              <EmptyState
                compact
                icon={CalendarClock}
                title="Chưa có lịch trực hôm nay"
                action={
                  <Button size="sm" variant="primary" onClick={() => navigate(`/shifts?date=${summary.today}`)}>
                    Phân trực ngay
                  </Button>
                }
              />
            )}
          </SectionCard>

          {/* Lịch mổ hôm nay */}
          <SectionCard
            title="Lịch mổ hôm nay"
            icon={Scissors}
            iconTone="violet"
            actions={
              <Button size="sm" variant="ghost" onClick={() => navigate(`/surgery-approval?tab=schedule&date=${summary.today}`)}>
                Chi tiết
              </Button>
            }
          >
            {summary.surgeryToday.length === 0 ? (
              <EmptyState compact icon={Scissors} title="Không có ca mổ nào hôm nay" />
            ) : (
              <ol className="divide-y divide-line">
                {summary.surgeryToday.map((patient, index) => (
                  <li key={patient.id}>
                    <button onClick={() => navigate(`/clinical?id=${encodeURIComponent(patient.id)}`)} className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-sunken/70">
                      <span className="num flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-xs font-semibold text-violet-700 dark:text-violet-300">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-fg">{patient.name}</span>
                        <span className="block truncate text-xs text-muted">
                          {patient.surgeryMethod || patient.diagnosis}
                          {patient.surgeon && ` · ${patient.surgeon}`}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            )}
          </SectionCard>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <SectionCard
          className="lg:col-span-2"
          title="Phẫu thuật 6 tháng gần nhất"
          description="Số ca phẫu thuật đã đủ điều kiện thống kê (không gồm RFA)"
          icon={TrendingUp}
          iconTone="success"
          actions={
            <Button size="sm" variant="ghost" onClick={() => navigate('/surgery-stats')}>
              Thống kê
            </Button>
          }
          bodyClassName="p-4 sm:p-5"
        >
          {loading ? <Skeleton className="h-44 w-full" /> : <ColumnChart data={trendData} height={176} valueLabel="ca phẫu thuật" onSelect={key => navigate(`/surgery-stats?month=${key}`)} />}
        </SectionCard>

        <div className="space-y-6">
        {manager && <RewardsDashboardCard />}
        <SectionCard title="Sắp tới" description="Sinh hoạt khoa học trong 14 ngày" icon={Presentation} bodyClassName="p-4">
          {summary.upcomingMeetings.length === 0 ? (
            <EmptyState compact icon={Presentation} title="Chưa có lịch sinh hoạt khoa học" />
          ) : (
            <ul className="space-y-3">
              {summary.upcomingMeetings.slice(0, 4).map(meeting => (
                <li key={meeting.id}>
                  <button onClick={() => navigate('/science-meetings')} className="flex w-full items-start gap-2.5 text-left text-sm">
                    <span className="num mt-0.5 shrink-0 rounded-md bg-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-primary">{fmtDayMonth(meeting.time)}</span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-fg hover:text-primary">{meeting.topic}</span>
                      <span className="text-xs text-muted">
                        {relativeDay(toDateKey(meeting.time))}
                        {meeting.presenter && ` · ${meeting.presenter}`}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        </div>
      </div>

    </div>
  );
};
