import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  HeartPulse,
  Loader2,
  Package,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  User,
  Users,
  Wrench,
} from 'lucide-react';
import {
  getDailyOnCall,
  getEquipment,
  getEvaluations,
  getImprovements,
  getMedicines,
  getPatients,
  getStaffTasks,
  getVipPatients,
} from '../services/dataService';
import {
  APP_LOGO_URL,
  DailyOnCall,
  Evaluation5S,
  Improvement5S,
  MedicalEquipment,
  Medicine,
  Patient,
  StaffTask,
  VipPatient,
} from '../types';

type AlertSeverity = 'info' | 'warning' | 'danger';
type AlertSection = 'urgent' | 'today' | 'inventory' | 'operations';

type DashboardAlert = {
  id: string;
  type: 'overdue_task' | 'briefing_task' | 'important_patient' | 'surgery' | 'medicine_expiry' | 'equipment' | 'five_s' | 'shift';
  title: string;
  description?: string;
  severity: AlertSeverity;
  section: AlertSection;
  module?: string;
  entityId?: string;
  assigneeName?: string;
  date?: string;
  dueDate?: string;
  link: string;
  badge?: string;
};

type DashboardData = {
  patients: Patient[];
  vipPatients: VipPatient[];
  staffTasks: StaffTask[];
  medicines: Medicine[];
  equipment: MedicalEquipment[];
  improvements: Improvement5S[];
  evaluations5S: Evaluation5S[];
  shifts: DailyOnCall[];
};

const emptyData: DashboardData = {
  patients: [],
  vipPatients: [],
  staffTasks: [],
  medicines: [],
  equipment: [],
  improvements: [],
  evaluations5S: [],
  shifts: [],
};

const todayDate = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

const formatDateKey = (date: Date) => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const parseDate = (value: unknown) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;
  const date = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const daysBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const text = (...values: unknown[]) =>
  values.map(value => String(value || '').trim()).find(Boolean) || '';

const lowerText = (value: unknown) => String(value || '').toLowerCase();

const isDoneTask = (task: Partial<StaffTask>) => {
  const status = lowerText(task.trangThai);
  return toNumber(task.tienDo) >= 100 || status.includes('hoàn') || status.includes('hoÃ') || status.includes('done');
};

const isPausedTask = (task: Partial<StaffTask>) => {
  const status = lowerText(task.trangThai);
  const syncStatus = lowerText(task.syncStatus);
  return status.includes('tạm') || status.includes('tam') || status.includes('táº') || syncStatus === 'orphaned';
};

const isBriefingTask = (task: Partial<StaffTask>) =>
  ['daily_briefing', 'giao_ban'].includes(lowerText(task.sourceType));

const isWaitingSurgery = (patient: Partial<Patient>) => {
  const status = lowerText(patient.status);
  return status.includes('chomo') || status.includes('cho') || status.includes('chờ') || status.includes('pending');
};

const isToday = (value: unknown, todayKey: string) => {
  const date = parseDate(value);
  return date ? formatDateKey(date) === todayKey : false;
};

const isBadEquipmentCondition = (equipment: Partial<MedicalEquipment>) => {
  const condition = lowerText(equipment.condition);
  return ['broken', 'repairing', 'hỏng', 'hong', 'sửa', 'sua', 'bảo trì', 'bao tri', 'không hoạt động'].some(token =>
    condition.includes(token)
  );
};

const priorityClass = (severity: AlertSeverity) => {
  if (severity === 'danger') return 'bg-red-50 text-red-700 border-red-200';
  if (severity === 'warning') return 'bg-amber-50 text-amber-700 border-amber-200';
  return 'bg-blue-50 text-blue-700 border-blue-200';
};

const summaryCardClass = (severity: AlertSeverity) => {
  if (severity === 'danger') return 'bg-red-500';
  if (severity === 'warning') return 'bg-amber-500';
  return 'bg-blue-500';
};

const loadList = async <T,>(loader: () => Promise<T[]>): Promise<T[]> => {
  try {
    const data = await loader();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[Dashboard] load failed:', err);
    return [];
  }
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('app_user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const loadDashboard = async () => {
    setRefreshing(true);
    setError('');
    try {
      const [
        patients,
        vipPatients,
        staffTasks,
        medicines,
        equipment,
        improvements,
        evaluations5S,
        shifts,
      ] = await Promise.all([
        loadList<Patient>(getPatients),
        loadList<VipPatient>(getVipPatients),
        loadList<StaffTask>(getStaffTasks),
        loadList<Medicine>(getMedicines),
        loadList<MedicalEquipment>(getEquipment),
        loadList<Improvement5S>(getImprovements),
        loadList<Evaluation5S>(getEvaluations),
        loadList<DailyOnCall>(getDailyOnCall),
      ]);

      setData({ patients, vipPatients, staffTasks, medicines, equipment, improvements, evaluations5S, shifts });
    } catch (err) {
      console.error('[Dashboard] load failed:', err);
      setError('Không tải được dữ liệu dashboard. Vui lòng kiểm tra phiên đăng nhập hoặc kết nối API.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const dashboard = useMemo(() => {
    const today = todayDate();
    const todayKey = formatDateKey(today);
    const alerts: DashboardAlert[] = [];

    const activeTasks = data.staffTasks.filter(task => !isDoneTask(task) && !isPausedTask(task));
    const overdueTasks = activeTasks
      .filter(task => {
        const dueDate = parseDate(task.hanHoanThanh);
        return dueDate ? dueDate < today : false;
      })
      .sort((a, b) => String(a.hanHoanThanh || '').localeCompare(String(b.hanHoanThanh || '')));

    overdueTasks.slice(0, 5).forEach(task => {
      alerts.push({
        id: `overdue-${task.id}`,
        type: 'overdue_task',
        title: task.tieuDe || 'Công việc quá hạn',
        description: text(task.noiDung, task.ghiChu),
        severity: 'danger',
        section: 'urgent',
        module: 'Công việc',
        entityId: task.id,
        assigneeName: text(task.assigneeName, task.userId),
        dueDate: String(task.hanHoanThanh || ''),
        link: '/staff-performance',
        badge: isBriefingTask(task) ? 'Từ giao ban' : undefined,
      });
    });

    const briefingTasks = activeTasks
      .filter(task => isBriefingTask(task) && lowerText(task.syncStatus || 'active') !== 'orphaned')
      .sort((a, b) => String(b.sourceDate || b.ngayGiao || '').localeCompare(String(a.sourceDate || a.ngayGiao || '')));

    briefingTasks.slice(0, 5).forEach(task => {
      alerts.push({
        id: `briefing-${task.id}`,
        type: 'briefing_task',
        title: task.tieuDe || 'Việc giao ban chưa hoàn thành',
        description: text(task.noiDung, task.sourceLabel),
        severity: 'warning',
        section: 'urgent',
        module: 'Giao ban',
        entityId: task.id,
        assigneeName: text(task.assigneeName, task.userId),
        date: String(task.sourceDate || task.ngayGiao || ''),
        dueDate: String(task.hanHoanThanh || ''),
        link: '/staff-performance',
        badge: 'Từ giao ban',
      });
    });

    data.vipPatients.slice(0, 5).forEach(patient => {
      alerts.push({
        id: `vip-${patient.id || patient.patientId}`,
        type: 'important_patient',
        title: patient.name || `BN ${patient.patientId}`,
        description: `${patient.room || '-'} / ${patient.bed || '-'}${patient.reason ? ` · ${patient.reason}` : ''}`,
        severity: patient.priority === 'Cao' ? 'danger' : 'warning',
        section: 'today',
        module: 'BN lưu ý',
        entityId: patient.patientId,
        link: '/vip-patients',
        badge: patient.priority,
      });
    });

    const waitingSurgeryPatients = data.patients.filter(isWaitingSurgery);
    const surgeryToday = data.patients.filter(patient => isToday(patient.surgeryDate || patient.actualSurgeryDate, todayKey));
    [...waitingSurgeryPatients.slice(0, 3), ...surgeryToday.slice(0, 3)].forEach(patient => {
      alerts.push({
        id: `surgery-${patient.id}-${patient.surgeryDate || patient.actualSurgeryDate || patient.status}`,
        type: 'surgery',
        title: patient.name || 'Bệnh nhân phẫu thuật',
        description: `${patient.room || '-'} / ${patient.bed || '-'} · ${patient.diagnosis || ''}`,
        severity: isToday(patient.surgeryDate || patient.actualSurgeryDate, todayKey) ? 'danger' : 'warning',
        section: 'today',
        module: 'Phẫu thuật',
        entityId: patient.id,
        assigneeName: text(patient.surgeon, patient.treatingDoctor),
        date: String(patient.surgeryDate || patient.actualSurgeryDate || ''),
        link: '/surgery-approval',
        badge: isToday(patient.surgeryDate || patient.actualSurgeryDate, todayKey) ? 'Mổ hôm nay' : 'Chờ mổ',
      });
    });

    const expiringMedicines = data.medicines
      .map(medicine => {
        const expiryDate = parseDate(medicine.expiryDate);
        return { medicine, expiryDate, daysLeft: expiryDate ? daysBetween(today, expiryDate) : 9999 };
      })
      .filter(item => item.expiryDate && item.daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    expiringMedicines.slice(0, 5).forEach(({ medicine, daysLeft }) => {
      alerts.push({
        id: `medicine-${medicine.id}`,
        type: 'medicine_expiry',
        title: medicine.name || 'Thuốc cận hạn',
        description: `${medicine.quantity || 0} ${medicine.unit || ''}${medicine.notes ? ` · ${medicine.notes}` : ''}`,
        severity: daysLeft < 0 ? 'danger' : 'warning',
        section: 'inventory',
        module: 'Kho thuốc',
        entityId: medicine.id,
        dueDate: medicine.expiryDate,
        link: '/inventory',
        badge: daysLeft < 0 ? 'Đã hết hạn' : `${daysLeft} ngày`,
      });
    });

    const equipmentAlerts = data.equipment
      .map(item => {
        const lastDate = parseDate(item.lastMaintenanceDate);
        const nextDate = lastDate ? new Date(lastDate) : null;
        if (nextDate && item.maintenanceCycle) nextDate.setMonth(nextDate.getMonth() + toNumber(item.maintenanceCycle));
        return { item, nextDate, daysLeft: nextDate ? daysBetween(today, nextDate) : 9999 };
      })
      .filter(({ item, daysLeft }) => isBadEquipmentCondition(item) || daysLeft <= 30)
      .sort((a, b) => a.daysLeft - b.daysLeft);

    equipmentAlerts.slice(0, 5).forEach(({ item, nextDate, daysLeft }) => {
      alerts.push({
        id: `equipment-${item.id}`,
        type: 'equipment',
        title: item.name || 'Thiết bị cần xử lý',
        description: `${item.code || ''}${item.notes ? ` · ${item.notes}` : ''}`,
        severity: isBadEquipmentCondition(item) || daysLeft < 0 ? 'danger' : 'warning',
        section: 'inventory',
        module: 'Thiết bị',
        entityId: item.id,
        assigneeName: item.inCharge,
        dueDate: nextDate ? formatDateKey(nextDate) : '',
        link: '/inventory',
        badge: item.condition || (daysLeft <= 30 ? 'Bảo trì' : undefined),
      });
    });

    const lowFiveS = data.evaluations5S.filter(item => toNumber(item.score) > 0 && toNumber(item.score) < 70);
    const openFiveS = data.improvements.filter(item => !['HoanThanh', 'Hoàn thành', 'hoan thanh'].includes(String(item.status || '')));
    [...openFiveS.slice(0, 3), ...lowFiveS.slice(0, 3)].forEach((item: any) => {
      alerts.push({
        id: `five-s-${item.id}`,
        type: 'five_s',
        title: item.content || item.zoneId || '5S cần xử lý',
        description: item.comments || item.result || item.status || '',
        severity: toNumber(item.score) > 0 && toNumber(item.score) < 60 ? 'danger' : 'warning',
        section: 'operations',
        module: '5S',
        entityId: item.id,
        assigneeName: item.proposer || item.assessor,
        date: item.date,
        link: '/5s',
        badge: item.score ? `${item.score} điểm` : item.status,
      });
    });

    const todayShift = data.shifts.find(shift => String(shift.date || '') === todayKey);
    if (todayShift) {
      alerts.push({
        id: `shift-${todayShift.id || todayKey}`,
        type: 'shift',
        title: 'Lịch trực hôm nay',
        description: `BS: ${todayShift.doctor || '-'} · ĐD: ${[todayShift.nurse1, todayShift.nurse2].filter(Boolean).join(', ') || '-'}`,
        severity: 'info',
        section: 'operations',
        module: 'Lịch trực',
        date: todayKey,
        link: '/shifts',
      });
    }

    const surgeryTodayCount = surgeryToday.length;

    return {
      todayKey,
      todayShift,
      alerts,
      overdueTasks,
      briefingTasks,
      waitingSurgeryPatients,
      surgeryToday,
      expiringMedicines,
      equipmentAlerts,
      openFiveS,
      lowFiveS,
      counts: {
        overdueTasks: overdueTasks.length,
        briefingTasks: briefingTasks.length,
        vipPatients: data.vipPatients.length,
        surgery: waitingSurgeryPatients.length + surgeryTodayCount,
        medicines: expiringMedicines.length,
        equipment: equipmentAlerts.length,
      },
    };
  }, [data]);

  const sections: Array<{ key: AlertSection; title: string; icon: React.ElementType }> = [
    { key: 'urgent', title: 'Cần xử lý ngay', icon: AlertTriangle },
    { key: 'today', title: 'Theo dõi trong ngày', icon: CalendarDays },
    { key: 'inventory', title: 'Cảnh báo vật tư/thiết bị', icon: Package },
    { key: 'operations', title: '5S & vận hành', icon: ClipboardCheck },
  ];

  const SummaryCard = ({ title, value, icon: Icon, severity, link }: { title: string; value: number | string; icon: React.ElementType; severity: AlertSeverity; link: string }) => (
    <button
      onClick={() => navigate(link)}
      className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md transition-all text-left overflow-hidden relative"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
        </div>
        <div className={`p-2.5 rounded-lg ${summaryCardClass(severity)} text-white`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );

  const AlertRow = ({ alert }: { alert: DashboardAlert }) => (
    <button
      onClick={() => navigate(alert.link)}
      className="w-full text-left p-3 rounded-lg border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${priorityClass(alert.severity)}`}>
              {alert.module || alert.type}
            </span>
            {alert.badge && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs font-medium">{alert.badge}</span>}
          </div>
          <p className="mt-2 font-semibold text-slate-800 truncate">{alert.title}</p>
          {alert.description && <p className="mt-1 text-sm text-slate-500 line-clamp-2">{alert.description}</p>}
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-400">
            {alert.assigneeName && <span>Phụ trách: {alert.assigneeName}</span>}
            {alert.dueDate && <span>Hạn: {alert.dueDate}</span>}
            {alert.date && <span>Ngày: {alert.date}</span>}
          </div>
        </div>
        <ArrowRight className="h-4 w-4 text-slate-300 mt-1 shrink-0" />
      </div>
    </button>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <img
              src={APP_LOGO_URL}
              alt=""
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-full bg-white shadow-sm border border-slate-100 object-cover"
            />
            <div>
              <p className="text-sm font-medium text-slate-500">Xin chào {currentUser?.fullName || currentUser?.username || 'bạn'}</p>
              <h1 className="text-xl sm:text-2xl font-bold text-blue-800">Dashboard trực ban khoa</h1>
              <p className="text-sm text-slate-500">{new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
            </div>
          </div>
          <button
            onClick={loadDashboard}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
          <ShieldAlert className="h-5 w-5" />
          {error}
        </div>
      )}

      <div className="bg-gradient-to-r from-blue-600 to-cyan-700 rounded-xl shadow-sm p-5 text-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <CalendarDays className="h-5 w-5" /> Trực hôm nay
          </h2>
          <button onClick={() => navigate('/shifts')} className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-colors">
            Xem lịch
          </button>
        </div>
        {dashboard.todayShift ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white/10 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-blue-100 uppercase mb-1">Bác sĩ trực</p>
              <div className="flex items-center gap-2 font-semibold"><Stethoscope className="h-5 w-5 text-yellow-200" /> {dashboard.todayShift.doctor || '---'}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-blue-100 uppercase mb-1">Điều dưỡng 1</p>
              <div className="flex items-center gap-2 font-semibold"><HeartPulse className="h-5 w-5 text-pink-200" /> {dashboard.todayShift.nurse1 || '---'}</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3 border border-white/10">
              <p className="text-xs text-blue-100 uppercase mb-1">Điều dưỡng 2</p>
              <div className="flex items-center gap-2 font-semibold"><HeartPulse className="h-5 w-5 text-pink-200" /> {dashboard.todayShift.nurse2 || '---'}</div>
            </div>
          </div>
        ) : (
          <div className="bg-white/10 rounded-lg p-4 border border-white/10 text-sm">Chưa có dữ liệu lịch trực hôm nay.</div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
        <SummaryCard title="Việc quá hạn" value={dashboard.counts.overdueTasks} icon={AlertTriangle} severity={dashboard.counts.overdueTasks ? 'danger' : 'info'} link="/staff-performance" />
        <SummaryCard title="Việc giao ban chưa xong" value={dashboard.counts.briefingTasks} icon={ClipboardCheck} severity={dashboard.counts.briefingTasks ? 'warning' : 'info'} link="/staff-performance" />
        <SummaryCard title="BN cần lưu ý" value={dashboard.counts.vipPatients} icon={Users} severity={dashboard.counts.vipPatients ? 'warning' : 'info'} link="/vip-patients" />
        <SummaryCard title="Chờ mổ / mổ hôm nay" value={dashboard.counts.surgery} icon={Activity} severity={dashboard.counts.surgery ? 'warning' : 'info'} link="/surgery-approval" />
        <SummaryCard title="Thuốc cận hạn" value={dashboard.counts.medicines} icon={Package} severity={dashboard.counts.medicines ? 'danger' : 'info'} link="/inventory" />
        <SummaryCard title="Máy cần xử lý" value={dashboard.counts.equipment} icon={Wrench} severity={dashboard.counts.equipment ? 'warning' : 'info'} link="/inventory" />
      </div>

      {dashboard.alerts.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-500">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500" />
          Hôm nay chưa có cảnh báo cần xử lý.
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {sections.map(section => {
            const sectionAlerts = dashboard.alerts.filter(alert => alert.section === section.key);
            const Icon = section.icon;
            return (
              <div key={section.key} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Icon className="h-5 w-5 text-blue-600" />
                    {section.title}
                  </h3>
                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-full">{sectionAlerts.length}</span>
                </div>
                <div className="p-3 space-y-2">
                  {sectionAlerts.length === 0 ? (
                    <div className="p-6 text-center text-sm text-slate-400">Chưa có cảnh báo.</div>
                  ) : (
                    sectionAlerts.map(alert => <AlertRow key={alert.id} alert={alert} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
