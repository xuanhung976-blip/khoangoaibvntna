import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
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
type SummaryTone = 'blue' | 'amber' | 'violet' | 'indigo' | 'red' | 'emerald' | 'orange' | 'cyan';

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

const normalizeText = (value: unknown) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const parseFlexibleDate = (value: unknown) => {
  if (!value) return null;
  const raw = String(value).trim();
  if (!raw) return null;

  const ddmmyyyy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (ddmmyyyy) {
    const [, d, m, y] = ddmmyyyy;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const yyyymmdd = raw.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (yyyymmdd) {
    const [, y, m, d] = yyyymmdd;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw.includes('T') ? raw : `${raw}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const parseDate = parseFlexibleDate;

const daysBetween = (from: Date, to: Date) =>
  Math.round((to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24));

const toNumber = (value: unknown) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const text = (...values: unknown[]) =>
  values.map(value => String(value || '').trim()).find(Boolean) || '';

const lowerText = (value: unknown) => String(value || '').toLowerCase();

const pickField = (record: unknown, fields: string[]) => {
  const item = (record || {}) as Record<string, unknown>;
  for (const field of fields) {
    const value = item[field];
    if (value !== undefined && value !== null && String(value).trim()) return value;
  }
  return '';
};

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

const isActivePatientV2 = (patient: Partial<Patient>) => {
  const status = normalizeText(pickField(patient, ['status', 'trangThai', 'TrangThai']));
  return !['ravien', 'ra vien', 'xuat vien', 'discharged', 'da xuat vien'].some(token =>
    status.includes(normalizeText(token))
  );
};

const isWaitingForSurgeryV2 = (patient: Partial<Patient>) => {
  const status = normalizeText(
    text(
      pickField(patient, ['status', 'trangThai', 'TrangThai']),
      pickField(patient, ['surgeryStatus', 'trangThaiMo', 'TrangThaiMo', 'approvalStatus', 'phauThuatStatus'])
    )
  );

  return [
    'chomo',
    'cho mo',
    'cho_mo',
    'pending surgery',
    'pending_surgery',
    'waiting surgery',
    'waiting_surgery',
    'choduyet',
    'cho duyet',
  ].some(token => status.includes(normalizeText(token)));
};

const getSurgeryDateValue = (patient: Partial<Patient>) =>
  pickField(patient, [
    'surgeryDate',
    'actualSurgeryDate',
    'ngayMo',
    'operationDate',
    'scheduledDate',
    'ngayPhauThuat',
    'NgayMo',
    'NgayPhauThuat',
  ]);

const isSurgeryTodayV2 = (patient: Partial<Patient>, todayKey: string) =>
  isToday(getSurgeryDateValue(patient), todayKey);

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

const severityBorderClass = (severity: AlertSeverity) => {
  if (severity === 'danger') return 'border-l-red-400';
  if (severity === 'warning') return 'border-l-amber-400';
  return 'border-l-blue-400';
};

const summaryToneClass = (tone: SummaryTone) => {
  const classes: Record<SummaryTone, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100',
  };
  return classes[tone];
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
    const activePatients = data.patients.filter(isActivePatientV2);

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

    const waitingSurgeryPatients = activePatients.filter(isWaitingForSurgeryV2);
    const surgeryToday = activePatients.filter(patient => isSurgeryTodayV2(patient, todayKey));
    [...surgeryToday.slice(0, 4), ...waitingSurgeryPatients.slice(0, 4)]
      .filter((patient, index, list) => {
        const key = patient.id || patient.patientId || `${patient.name}-${patient.room}-${patient.bed}`;
        return list.findIndex(item => (item.id || item.patientId || `${item.name}-${item.room}-${item.bed}`) === key) === index;
      })
      .slice(0, 6)
      .forEach(patient => {
        alerts.push({
          id: `surgery-${patient.id || patient.patientId}-${getSurgeryDateValue(patient) || patient.status}`,
          type: 'surgery',
          title: patient.name || 'Bệnh nhân phẫu thuật',
          description: `${patient.room || '-'} / ${patient.bed || '-'} · ${text(patient.diagnosis, patient.surgeryMethod)}`,
          severity: isSurgeryTodayV2(patient, todayKey) ? 'danger' : 'warning',
          section: 'today',
          module: 'Phẫu thuật',
          entityId: patient.id,
          assigneeName: text(patient.surgeon, patient.treatingDoctor),
          date: String(getSurgeryDateValue(patient) || ''),
          link: '/surgery-approval',
          badge: isSurgeryTodayV2(patient, todayKey) ? 'Mổ hôm nay' : 'Chờ mổ',
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

    const todayShift = data.shifts.find(shift => isToday(shift.date, todayKey));
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
        activePatients: activePatients.length,
        overdueTasks: overdueTasks.length,
        briefingTasks: briefingTasks.length,
        vipPatients: data.vipPatients.length,
        waitingSurgery: waitingSurgeryPatients.length,
        surgeryToday: surgeryToday.length,
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

  const SummaryCard = ({
    title,
    value,
    icon: Icon,
    tone,
    link,
  }: {
    title: string;
    value: number | string;
    icon: React.ElementType;
    tone: SummaryTone;
    link: string;
  }) => (
    <button
      onClick={() => navigate(link)}
      className="group bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all text-left overflow-hidden relative min-h-[112px]"
    >
      <div className="flex h-full items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-500 leading-snug">{title}</p>
          <p className="mt-2 text-3xl font-bold tracking-normal text-slate-900">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl border ${summaryToneClass(tone)} group-hover:scale-105 transition-transform shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </button>
  );

  const AlertRow = ({ alert }: { alert: DashboardAlert }) => (
    <button
      onClick={() => navigate(alert.link)}
      className={`w-full text-left p-3 rounded-lg border border-l-4 border-slate-100 ${severityBorderClass(alert.severity)} hover:border-blue-200 hover:bg-blue-50/40 transition-colors`}
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
              className="h-12 w-12 rounded-full bg-white shadow-sm border border-slate-100 object-cover"
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
            className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadDashboard}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Thử lại
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <SummaryCard title="Tổng bệnh nhân" value={dashboard.counts.activePatients} icon={Users} tone="blue" link="/clinical" />
        <SummaryCard title="Chờ mổ" value={dashboard.counts.waitingSurgery} icon={Activity} tone="amber" link="/surgery-approval" />
        <SummaryCard title="Mổ hôm nay" value={dashboard.counts.surgeryToday} icon={Stethoscope} tone="violet" link="/surgery-approval" />
        <SummaryCard title="BN cần lưu ý" value={dashboard.counts.vipPatients} icon={ShieldAlert} tone="indigo" link="/vip-patients" />
        <SummaryCard title="Việc quá hạn" value={dashboard.counts.overdueTasks} icon={AlertTriangle} tone="red" link="/staff-performance" />
        <SummaryCard title="Giao ban chưa xong" value={dashboard.counts.briefingTasks} icon={ClipboardCheck} tone="emerald" link="/staff-performance" />
        <SummaryCard title="Thuốc cận hạn" value={dashboard.counts.medicines} icon={Package} tone="orange" link="/inventory" />
        <SummaryCard title="Máy cần xử lý" value={dashboard.counts.equipment} icon={Wrench} tone="cyan" link="/inventory" />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-blue-600" /> Trực hôm nay
          </h2>
          <button onClick={() => navigate('/shifts')} className="text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors">
            Xem lịch
          </button>
        </div>
        {dashboard.todayShift ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Bác sĩ trực</p>
              <div className="flex items-center gap-2 font-semibold text-slate-800"><Stethoscope className="h-4 w-4 text-amber-600" /> {dashboard.todayShift.doctor || '---'}</div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Điều dưỡng 1</p>
              <div className="flex items-center gap-2 font-semibold text-slate-800"><HeartPulse className="h-4 w-4 text-rose-600" /> {dashboard.todayShift.nurse1 || '---'}</div>
            </div>
            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <p className="text-xs font-bold uppercase text-slate-400 mb-1">Điều dưỡng 2</p>
              <div className="flex items-center gap-2 font-semibold text-slate-800"><HeartPulse className="h-4 w-4 text-rose-600" /> {dashboard.todayShift.nurse2 || '---'}</div>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
            Chưa có lịch trực hôm nay.
          </div>
        )}
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
