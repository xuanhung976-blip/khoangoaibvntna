import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
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
  Plus,
  RefreshCw,
  ShieldAlert,
  Stethoscope,
  Users,
  Wrench,
  Zap,
  TrendingUp,
  FileText,
  Clock,
  Sparkles,
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
type SummaryTone = 'blue' | 'amber' | 'violet' | 'rose' | 'red' | 'emerald' | 'orange' | 'cyan';

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
  if (severity === 'danger') return 'bg-red-50 text-red-700 border-red-200 font-bold';
  if (severity === 'warning') return 'bg-amber-50 text-amber-700 border-amber-200 font-semibold';
  return 'bg-blue-50 text-blue-700 border-blue-200 font-medium';
};

const severityBorderClass = (severity: AlertSeverity) => {
  if (severity === 'danger') return 'border-l-red-500 bg-red-50/20';
  if (severity === 'warning') return 'border-l-amber-500 bg-amber-50/20';
  return 'border-l-blue-500 bg-blue-50/10';
};

const summaryToneClass = (tone: SummaryTone) => {
  const classes: Record<SummaryTone, string> = {
    blue: 'bg-blue-50 text-blue-700 border-blue-100 group-hover:bg-blue-600 group-hover:text-white',
    amber: 'bg-amber-50 text-amber-700 border-amber-100 group-hover:bg-amber-500 group-hover:text-white',
    violet: 'bg-violet-50 text-violet-700 border-violet-100 group-hover:bg-violet-600 group-hover:text-white',
    rose: 'bg-rose-50 text-rose-700 border-rose-100 group-hover:bg-rose-600 group-hover:text-white',
    red: 'bg-red-50 text-red-700 border-red-100 group-hover:bg-red-600 group-hover:text-white',
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white',
    orange: 'bg-orange-50 text-orange-700 border-orange-100 group-hover:bg-orange-600 group-hover:text-white',
    cyan: 'bg-cyan-50 text-cyan-700 border-cyan-100 group-hover:bg-cyan-600 group-hover:text-white',
  };
  return classes[tone];
};

const getSessionCache = <T,>(key: string, fallback: T): T => {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const loadList = async <T,>(loader: (options?: any) => Promise<T[]>, options?: any): Promise<T[]> => {
  try {
    const data = await loader(options);
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[Dashboard] load failed:', err);
    return [];
  }
};

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const initialCache = getSessionCache<DashboardData | null>('cache_dashboard_data', null);
  const [data, setData] = useState<DashboardData>(initialCache || emptyData);
  const [loading, setLoading] = useState(!initialCache);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const isFetchingRef = useRef(false);

  const currentUser = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('app_user') || 'null');
    } catch {
      return null;
    }
  }, []);

  const loadDashboard = useCallback(async (options?: { bypassCache?: boolean }) => {
    if (isFetchingRef.current) return;
    isFetchingRef.current = true;

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
        loadList<Patient>(getPatients, options),
        loadList<VipPatient>(getVipPatients, options),
        loadList<StaffTask>(getStaffTasks, options),
        loadList<Medicine>(getMedicines, options),
        loadList<MedicalEquipment>(getEquipment, options),
        loadList<Improvement5S>(getImprovements, options),
        loadList<Evaluation5S>(getEvaluations, options),
        loadList<DailyOnCall>(getDailyOnCall, options),
      ]);

      const newData = { patients, vipPatients, staffTasks, medicines, equipment, improvements, evaluations5S, shifts };
      setData(newData);
      try {
        sessionStorage.setItem('cache_dashboard_data', JSON.stringify(newData));
      } catch { /* storage fallback */ }
    } catch (err) {
      console.error('[Dashboard] load failed:', err);
      setError('Không tải được dữ liệu dashboard. Vui lòng kiểm tra phiên đăng nhập hoặc kết nối API.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      isFetchingRef.current = false;
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const dashboard = useMemo(() => {
    const today = todayDate();
    const todayKey = formatDateKey(today);
    const alerts: DashboardAlert[] = [];

    const safePatients = Array.isArray(data?.patients) ? data.patients : [];
    const safeVipPatients = Array.isArray(data?.vipPatients) ? data.vipPatients : [];
    const safeStaffTasks = Array.isArray(data?.staffTasks) ? data.staffTasks : [];
    const safeMedicines = Array.isArray(data?.medicines) ? data.medicines : [];
    const safeEquipment = Array.isArray(data?.equipment) ? data.equipment : [];
    const safeImprovements = Array.isArray(data?.improvements) ? data.improvements : [];
    const safeEvaluations5S = Array.isArray(data?.evaluations5S) ? data.evaluations5S : [];
    const safeShifts = Array.isArray(data?.shifts) ? data.shifts : [];

    const activePatients = safePatients.filter(isActivePatientV2);

    const activeTasks = safeStaffTasks.filter(task => !isDoneTask(task) && !isPausedTask(task));
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

    safeVipPatients.slice(0, 5).forEach(patient => {
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

    const expiringMedicines = safeMedicines
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

    const equipmentAlerts = safeEquipment
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

    const lowFiveS = safeEvaluations5S.filter(item => toNumber(item.score) > 0 && toNumber(item.score) < 70);
    const openFiveS = safeImprovements.filter(item => !['HoanThanh', 'Hoàn thành', 'hoan thanh'].includes(String(item.status || '')));
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

    const todayShift = safeShifts.find(shift => isToday(shift.date, todayKey));
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

    // Computed totals for surgery ratio chart
    const totalSurgeryCount = safePatients.filter(p => p.status === 'ChoMo' || p.status === 'DaDuyet' || p.status === 'DaMo').length || 1;
    const pendingSurgeryRatio = Math.round((waitingSurgeryPatients.length / totalSurgeryCount) * 100);
    const completedTasksCount = safeStaffTasks.filter(isDoneTask).length;
    const taskCompletionRatio = safeStaffTasks.length ? Math.round((completedTasksCount / safeStaffTasks.length) * 100) : 100;

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
      taskCompletionRatio,
      pendingSurgeryRatio,
      counts: {
        activePatients: activePatients.length,
        overdueTasks: overdueTasks.length,
        briefingTasks: briefingTasks.length,
        vipPatients: safeVipPatients.length,
        waitingSurgery: waitingSurgeryPatients.length,
        surgeryToday: surgeryToday.length,
        medicines: expiringMedicines.length,
        equipment: equipmentAlerts.length,
      },
    };
  }, [data]);

  const sections: Array<{ key: AlertSection; title: string; icon: React.ElementType; colorClass: string }> = [
    { key: 'urgent', title: 'Cần xử lý ngay', icon: AlertTriangle, colorClass: 'text-red-600 bg-red-50 border-red-100' },
    { key: 'today', title: 'Theo dõi trong ngày', icon: CalendarDays, colorClass: 'text-blue-600 bg-blue-50 border-blue-100' },
    { key: 'inventory', title: 'Cảnh báo vật tư & thiết bị', icon: Package, colorClass: 'text-amber-600 bg-amber-50 border-amber-100' },
    { key: 'operations', title: '5S & Vận hành', icon: ClipboardCheck, colorClass: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
  ];

  const SummaryCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    tone,
    link,
  }: {
    title: string;
    value: number | string;
    subtitle?: string;
    icon: React.ElementType;
    tone: SummaryTone;
    link: string;
  }) => (
    <button
      onClick={() => navigate(link)}
      className="group bg-white p-4 rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-1 transition-all text-left overflow-hidden relative min-h-[110px] flex flex-col justify-between"
    >
      <div className="flex items-start justify-between gap-3 w-full">
        <div className="min-w-0">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</p>
          <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl border ${summaryToneClass(tone)} transition-all shrink-0`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      {subtitle && (
        <p className="mt-2 text-xs font-medium text-slate-400 group-hover:text-blue-600 transition-colors flex items-center gap-1">
          {subtitle} <ArrowRight className="h-3 w-3 inline group-hover:translate-x-0.5 transition-transform" />
        </p>
      )}
    </button>
  );

  const AlertRow = ({ alert }: { alert: DashboardAlert }) => (
    <button
      onClick={() => navigate(alert.link)}
      className={`w-full text-left p-3.5 rounded-xl border border-l-4 border-slate-200 ${severityBorderClass(alert.severity)} hover:border-blue-300 hover:bg-blue-50/50 transition-all`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${priorityClass(alert.severity)}`}>
              {alert.module || alert.type}
            </span>
            {alert.badge && (
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200">
                {alert.badge}
              </span>
            )}
          </div>
          <p className="mt-2 font-bold text-slate-800 text-sm">{alert.title}</p>
          {alert.description && <p className="mt-1 text-xs text-slate-600 line-clamp-2">{alert.description}</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400 font-medium">
            {alert.assigneeName && <span>👤 Phụ trách: <strong className="text-slate-600">{alert.assigneeName}</strong></span>}
            {alert.dueDate && <span>⏰ Hạn: <strong className="text-slate-600">{alert.dueDate}</strong></span>}
            {alert.date && <span>📅 Ngày: <strong className="text-slate-600">{alert.date}</strong></span>}
          </div>
        </div>
        <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0 mt-1">
          <ArrowRight className="h-4 w-4" />
        </div>
      </div>
    </button>
  );

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-80 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        <p className="text-sm font-medium text-slate-500">Đang tải dữ liệu dashboard khoa...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── TOP HEADER WITH LIVE BADGE & QUICK ACTIONS ── */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-5 rounded-2xl shadow-md text-white overflow-hidden relative">
        <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none">
          <Stethoscope className="h-64 w-64 text-white" />
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <img
              src={APP_LOGO_URL}
              alt="Logo Khoa Ngoại"
              referrerPolicy="no-referrer"
              className="h-14 w-14 rounded-full bg-white p-0.5 shadow-md border-2 border-blue-400 object-cover shrink-0"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-300">Bệnh viện Nội tiết Nghệ An · Khoa Ngoại Tổng Hợp</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span> Supabase Live
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black mt-0.5 text-white">
                Xin chào, {currentUser?.fullName || currentUser?.username || 'Bác sĩ/Điều dưỡng'} 👋
              </h1>
              <p className="text-xs text-blue-200 mt-1 flex items-center gap-2">
                <Clock className="h-3.5 w-3.5" />
                {new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => loadDashboard({ bypassCache: true })}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/15 transition-all disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Làm mới
            </button>
          </div>
        </div>

        {/* QUICK SHORTCUT BUTTONS */}
        <div className="mt-5 pt-4 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-2.5 relative z-10">
          <button
            onClick={() => navigate('/clinical')}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white transition-all text-left group"
          >
            <div className="p-1.5 rounded-lg bg-blue-500/30 group-hover:bg-blue-500 text-blue-200 transition-colors">
              <Plus className="h-4 w-4" />
            </div>
            <span>Thêm bệnh nhân</span>
          </button>

          <button
            onClick={() => navigate('/surgery-approval')}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white transition-all text-left group"
          >
            <div className="p-1.5 rounded-lg bg-amber-500/30 group-hover:bg-amber-500 text-amber-200 transition-colors">
              <Stethoscope className="h-4 w-4" />
            </div>
            <span>Duyệt lịch mổ</span>
          </button>

          <button
            onClick={() => navigate('/briefing')}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white transition-all text-left group"
          >
            <div className="p-1.5 rounded-lg bg-emerald-500/30 group-hover:bg-emerald-500 text-emerald-200 transition-colors">
              <ClipboardCheck className="h-4 w-4" />
            </div>
            <span>Sổ Giao ban</span>
          </button>

          <button
            onClick={() => navigate('/shifts')}
            className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white transition-all text-left group"
          >
            <div className="p-1.5 rounded-lg bg-violet-500/30 group-hover:bg-violet-500 text-violet-200 transition-colors">
              <CalendarDays className="h-4 w-4" />
            </div>
            <span>Phân ca trực</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            onClick={() => loadDashboard({ bypassCache: true })}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60 shadow-sm"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Thử lại
          </button>
        </div>
      )}

      {/* ── TODAY'S SHIFT HERO CARD ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 overflow-hidden relative">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-700 border border-blue-100">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Kíp Trực Hôm Nay</h2>
              <p className="text-xs text-slate-500">Thông tin bác sĩ & điều dưỡng ca trực 24h</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping"></span> Đang trực
            </span>
            <button
              onClick={() => navigate('/shifts')}
              className="text-xs font-bold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors border border-blue-100"
            >
              Xem sổ trực ➔
            </button>
          </div>
        </div>

        {dashboard.todayShift ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-amber-200/60 bg-amber-50/40 p-4 transition-all hover:border-amber-300">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 mb-1 flex items-center gap-1.5">
                <Stethoscope className="h-3.5 w-3.5" /> Bác sĩ trực chính
              </p>
              <p className="text-base font-extrabold text-slate-900">{dashboard.todayShift.doctor || 'Chưa phân công'}</p>
              <p className="text-xs text-slate-500 mt-1">Phụ trách chuyên môn ca trực</p>
            </div>

            <div className="rounded-xl border border-blue-200/60 bg-blue-50/40 p-4 transition-all hover:border-blue-300">
              <p className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-1 flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5 text-blue-600" /> Điều dưỡng ca 1
              </p>
              <p className="text-base font-extrabold text-slate-900">{dashboard.todayShift.nurse1 || 'Chưa phân công'}</p>
              <p className="text-xs text-slate-500 mt-1">Phụ trách theo dõi bệnh nhân</p>
            </div>

            <div className="rounded-xl border border-violet-200/60 bg-violet-50/40 p-4 transition-all hover:border-violet-300">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-700 mb-1 flex items-center gap-1.5">
                <HeartPulse className="h-3.5 w-3.5 text-violet-600" /> Điều dưỡng ca 2
              </p>
              <p className="text-base font-extrabold text-slate-900">{dashboard.todayShift.nurse2 || 'Chưa phân công'}</p>
              <p className="text-xs text-slate-500 mt-1">Phụ trách thuốc & vật tư</p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/70 p-5 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
            <CalendarDays className="h-8 w-8 text-slate-400" />
            <p className="font-semibold text-slate-700">Chưa có lịch trực nào được nhập cho ngày hôm nay.</p>
            <button
              onClick={() => navigate('/shifts')}
              className="mt-1 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 shadow-sm"
            >
              + Tạo phân ca trực mới
            </button>
          </div>
        )}
      </div>

      {/* ── 8 RESTRUCTURED STAT CARDS (2 CATEGORIZED SECTIONS) ── */}
      <div>
        {/* Section 1: Lâm sàng & Phẫu thuật */}
        <div className="mb-2 flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-blue-600" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Chuyên môn Lâm sàng & Phẫu thuật</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <SummaryCard title="Tổng bệnh nhân" value={dashboard.counts.activePatients} icon={Users} tone="blue" link="/clinical" subtitle="Xem danh sách bệnh nhân" />
          <SummaryCard title="Bệnh nhân Chờ mổ" value={dashboard.counts.waitingSurgery} icon={Activity} tone="amber" link="/surgery-approval" subtitle="Xem lịch mổ chờ duyệt" />
          <SummaryCard title="Mổ hôm nay" value={dashboard.counts.surgeryToday} icon={Stethoscope} tone="violet" link="/surgery-approval" subtitle="Danh sách ca mổ hôm nay" />
          <SummaryCard title="BN cần lưu ý (VIP)" value={dashboard.counts.vipPatients} icon={ShieldAlert} tone="rose" link="/vip-patients" subtitle="Phòng VIP & Lưu ý" />
        </div>

        {/* Section 2: Quản trị & Kho vận */}
        <div className="mb-2 flex items-center gap-2">
          <Zap className="h-4 w-4 text-amber-600" />
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500">Hành chính, Giao ban & Kho vận</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <SummaryCard title="Công việc quá hạn" value={dashboard.counts.overdueTasks} icon={AlertTriangle} tone="red" link="/staff-performance" subtitle="Cần xử lý gấp" />
          <SummaryCard title="Giao ban chưa xong" value={dashboard.counts.briefingTasks} icon={ClipboardCheck} tone="emerald" link="/staff-performance" subtitle="Theo dõi tiến độ giao ban" />
          <SummaryCard title="Thuốc cận hạn (<= 30 ngày)" value={dashboard.counts.medicines} icon={Package} tone="orange" link="/inventory" subtitle="Kiểm tra kho dược" />
          <SummaryCard title="Thiết bị 5S cần xử lý" value={dashboard.counts.equipment} icon={Wrench} tone="cyan" link="/inventory" subtitle="Bảo trì máy móc" />
        </div>
      </div>

      {/* ── VISUAL ANALYTICS (2 MINI PROGRESS BARS / RATIO CHARTS) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Progress Bar 1: Surgery Status Ratio */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-blue-600" /> Tiến độ Phẫu thuật Khoa
            </h3>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              {dashboard.counts.surgeryToday} ca mổ hôm nay
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Tỷ lệ Ca mổ chờ thực hiện</span>
                <span className="font-bold text-amber-600">{dashboard.pendingSurgeryRatio}%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, dashboard.pendingSurgeryRatio)}%` }}
                ></div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Đang chờ duyệt mổ: <strong className="text-slate-800 font-bold">{dashboard.counts.waitingSurgery} BN</strong></span>
              <span>Tổng BN phẫu thuật: <strong className="text-slate-800 font-bold">{dashboard.counts.surgeryToday + dashboard.counts.waitingSurgery} BN</strong></span>
            </div>
          </div>
        </div>

        {/* Progress Bar 2: Task Completion Rate */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-emerald-600" /> Tỷ lệ Hoàn thành Nhiệm vụ Giao ban
            </h3>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              {dashboard.taskCompletionRatio}% Hoàn thành
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1">
                <span>Tiến độ thực hiện nhiệm vụ khoa</span>
                <span className="font-bold text-emerald-600">{dashboard.taskCompletionRatio}%</span>
              </div>
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, dashboard.taskCompletionRatio)}%` }}
                ></div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span>Việc quá hạn: <strong className="text-red-600 font-bold">{dashboard.counts.overdueTasks} việc</strong></span>
              <span>Giao ban chờ làm: <strong className="text-slate-800 font-bold">{dashboard.counts.briefingTasks} việc</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* ── ALERTS GRID (CATEGORIZED SECTIONS) ── */}
      {dashboard.alerts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-500 shadow-sm">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-emerald-500 animate-bounce" />
          <h3 className="text-base font-bold text-slate-800">Tất cả đều ổn định!</h3>
          <p className="text-xs text-slate-400 mt-1">Hôm nay không có cảnh báo quá hạn hoặc khẩn cấp nào cần xử lý.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {sections.map(section => {
            const sectionAlerts = dashboard.alerts.filter(alert => alert.section === section.key);
            const Icon = section.icon;
            return (
              <div key={section.key} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${section.colorClass}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {section.title}
                  </h3>
                  <span className="text-xs font-extrabold bg-slate-200 text-slate-700 px-2.5 py-1 rounded-full">
                    {sectionAlerts.length}
                  </span>
                </div>
                <div className="p-3.5 space-y-2.5">
                  {sectionAlerts.length === 0 ? (
                    <div className="p-6 text-center text-xs font-medium text-slate-400">Không có cảnh báo trong mục này.</div>
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
