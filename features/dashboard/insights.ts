import type {
  DailyOnCall,
  MedicalEquipment,
  Medicine,
  NursingTask,
  Patient,
  ResearchTopic,
  ScientificMeeting,
  StaffTask,
  VipPatient,
  Evaluation5S,
  Improvement5S,
} from '../../types';
import { addDays, addMonths, diffDays, fmtDate, toDateKey } from '../../lib/dates';
import { TOTAL_BEDS, isActivePatient, isDoneStatus, treatmentDays } from '../../lib/domain';
import { fold, toNumber } from '../../lib/text';
import { calculateSurgeryStats, needsSurgeryClassification, type SurgeryStats } from '../../utils/surgeryStats';

export type InsightSeverity = 'critical' | 'warning' | 'info';

export type Insight = {
  id: string;
  severity: InsightSeverity;
  title: string;
  detail?: string;
  module: string;
  link: string;
  date?: string;
  assignee?: string;
  /** Điểm ưu tiên để sắp xếp (cao hơn = quan trọng hơn). */
  score: number;
};

export type InsightInput = {
  patients: Patient[];
  vips: VipPatient[];
  staffTasks: StaffTask[];
  medicines: Medicine[];
  equipment: MedicalEquipment[];
  improvements: Improvement5S[];
  evaluations5S: Evaluation5S[];
  shifts: DailyOnCall[];
  meetings: ScientificMeeting[];
  research: ResearchTopic[];
  nursingTasks: NursingTask[];
};

export type MonthPoint = { monthKey: string; surgeries: number; procedures: number };

export type Summary = {
  today: string;
  active: Patient[];
  waiting: Patient[];
  approved: Patient[];
  postOp: Patient[];
  internal: Patient[];
  surgeryToday: Patient[];
  surgeryTomorrow: Patient[];
  overdueSchedule: Patient[];
  admittedToday: Patient[];
  dischargedToday: Patient[];
  operatedToday: Patient[];
  needsClassification: Patient[];
  occupancy: { used: number; total: number; ratio: number };
  month: SurgeryStats;
  trend: MonthPoint[];
  todayShift?: DailyOnCall;
  tomorrowShift?: DailyOnCall;
  openTasks: StaffTask[];
  overdueTasks: StaffTask[];
  nursing: { total: number; done: number; pending: number };
  upcomingMeetings: ScientificMeeting[];
  insights: Insight[];
  badges: Record<string, number>;
};

const BASE: Record<InsightSeverity, number> = { critical: 300, warning: 200, info: 100 };

const isBadCondition = (condition: unknown) => {
  const value = fold(condition);
  return ['broken', 'repairing', 'hong', 'sua', 'bao tri', 'khong hoat dong'].some(token => value.includes(token));
};

export const nextMaintenanceKey = (item: Pick<MedicalEquipment, 'lastMaintenanceDate' | 'maintenanceCycle'>): string => {
  const last = toDateKey(item.lastMaintenanceDate);
  const cycle = toNumber(item.maintenanceCycle);
  if (!last || cycle <= 0) return '';
  const [y, m, d] = last.split('-').map(Number);
  const target = new Date(y, m - 1 + cycle, d, 12);
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
};

export const isTaskDone = (task: Partial<StaffTask>) => isDoneStatus(task.trangThai, task.tienDo);
export const isTaskPaused = (task: Partial<StaffTask>) => fold(task.trangThai).includes('tam dung') || fold(task.syncStatus) === 'orphaned';

export function computeSummary(input: InsightInput, today: string): Summary {
  const insights: Insight[] = [];
  const push = (insight: Omit<Insight, 'score'> & { boost?: number }) => {
    const { boost = 0, ...rest } = insight;
    insights.push({ ...rest, score: BASE[rest.severity] + boost });
  };

  const patients = input.patients;
  const active = patients.filter(isActivePatient);
  const waiting = active.filter(patient => patient.status === 'ChoMo');
  const approved = active.filter(patient => patient.status === 'DaDuyet');
  const postOp = active.filter(patient => patient.status === 'DaMo');
  const internal = active.filter(patient => patient.status === 'DieuTri');
  const tomorrow = addDays(today, 1);
  const bySchedule = (a: Patient, b: Patient) => (a.surgeryOrder || 99) - (b.surgeryOrder || 99);
  const surgeryToday = approved.filter(patient => toDateKey(patient.surgeryDate) === today).sort(bySchedule);
  const surgeryTomorrow = approved.filter(patient => toDateKey(patient.surgeryDate) === tomorrow).sort(bySchedule);
  const overdueSchedule = approved.filter(patient => {
    const key = toDateKey(patient.surgeryDate);
    return key !== '' && key < today;
  });
  const admittedToday = patients.filter(patient => toDateKey(patient.admissionDate) === today);
  const dischargedToday = patients.filter(patient => patient.status === 'RaVien' && toDateKey(patient.dischargeDate) === today);
  const operatedToday = patients.filter(patient => toDateKey(patient.actualSurgeryDate) === today);
  const needsClassification = patients.filter(patient => needsSurgeryClassification(patient));

  const month = calculateSurgeryStats(patients, today.slice(0, 7));
  const trend: MonthPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const monthKey = addMonths(today.slice(0, 7), -i);
    const stats = i === 0 ? month : calculateSurgeryStats(patients, monthKey);
    trend.push({ monthKey, surgeries: stats.totalSurgeries, procedures: stats.totalProcedures });
  }

  const occupancy = { used: active.length, total: TOTAL_BEDS, ratio: active.length / TOTAL_BEDS };

  /* --- Lâm sàng --- */
  surgeryToday.forEach((patient, index) =>
    push({
      id: `surgery-today-${patient.id}`,
      severity: 'critical',
      title: `Ca ${index + 1}: ${patient.name}`,
      detail: [patient.surgeryMethod || patient.diagnosis, patient.surgeon && `PTV ${patient.surgeon}`].filter(Boolean).join(' · '),
      module: 'Mổ hôm nay',
      link: `/surgery-approval?tab=schedule&date=${today}`,
      date: today,
      boost: 20 - index,
    }),
  );

  overdueSchedule.slice(0, 6).forEach(patient =>
    push({
      id: `schedule-overdue-${patient.id}`,
      severity: 'warning',
      title: `${patient.name} đã quá ngày mổ dự kiến`,
      detail: `Lịch ${fmtDate(patient.surgeryDate)} — xác nhận đã mổ hoặc dời lịch`,
      module: 'Lịch mổ',
      link: `/surgery-approval?tab=schedule&focus=${encodeURIComponent(patient.id)}`,
      date: toDateKey(patient.surgeryDate),
      boost: 40,
    }),
  );

  waiting
    .map(patient => ({ patient, days: treatmentDays(patient) ?? 0 }))
    .filter(item => item.days >= 3)
    .sort((a, b) => b.days - a.days)
    .slice(0, 5)
    .forEach(({ patient, days }) =>
      push({
        id: `waiting-${patient.id}`,
        severity: days >= 7 ? 'warning' : 'info',
        title: `${patient.name} chờ duyệt mổ ${days} ngày`,
        detail: patient.diagnosis,
        module: 'Duyệt mổ',
        link: `/surgery-approval?approve=${encodeURIComponent(patient.id)}`,
        boost: Math.min(days, 30),
      }),
    );

  if (needsClassification.length > 0) {
    push({
      id: 'needs-classification',
      severity: 'warning',
      title: `${needsClassification.length} hồ sơ đã mổ chưa phân loại PT`,
      detail: 'Không được cộng vào thống kê chính thức cho tới khi bổ sung loại phẫu thuật',
      module: 'Hồ sơ',
      link: '/clinical?status=CanPhanLoai&month=all',
      boost: Math.min(needsClassification.length, 30),
    });
  }

  if (occupancy.ratio >= 0.9) {
    push({
      id: 'beds',
      severity: occupancy.ratio >= 1 ? 'critical' : 'warning',
      title: `Công suất giường ${Math.round(occupancy.ratio * 100)}% (${occupancy.used}/${occupancy.total})`,
      detail: 'Cân nhắc kế hoạch ra viện / điều phối giường',
      module: 'Giường bệnh',
      link: '/clinical?view=beds',
    });
  }

  input.vips
    .filter(vip => vip.priority === 'Cao')
    .slice(0, 4)
    .forEach(vip =>
      push({
        id: `vip-${vip.id}`,
        severity: 'info',
        title: `${vip.name || vip.patientId} — cần lưu ý`,
        detail: [vip.room && `P.${vip.room}${vip.bed ? `/${vip.bed}` : ''}`, vip.reason].filter(Boolean).join(' · '),
        module: 'BN lưu ý',
        link: '/vip-patients',
        boost: 15,
      }),
    );

  /* --- Công việc --- */
  const openTasks = input.staffTasks.filter(task => !isTaskDone(task) && !isTaskPaused(task));
  const overdueTasks = openTasks
    .filter(task => {
      const due = toDateKey(task.hanHoanThanh);
      return due !== '' && due < today;
    })
    .sort((a, b) => String(a.hanHoanThanh).localeCompare(String(b.hanHoanThanh)));

  overdueTasks.slice(0, 5).forEach(task => {
    const late = diffDays(toDateKey(task.hanHoanThanh), today);
    push({
      id: `task-${task.id}`,
      severity: late > 7 || task.mucDoUuTien === 'Khẩn' ? 'critical' : 'warning',
      title: task.tieuDe || 'Công việc quá hạn',
      detail: `Quá hạn ${late} ngày${task.sourceLabel ? ` · ${task.sourceLabel}` : ''}`,
      module: 'Công việc',
      link: `/staff-performance?task=${encodeURIComponent(task.id)}`,
      assignee: task.assigneeName || task.userId,
      date: toDateKey(task.hanHoanThanh),
      boost: Math.min(late, 30),
    });
  });
  if (overdueTasks.length > 5) {
    push({
      id: 'tasks-more',
      severity: 'warning',
      title: `Còn ${overdueTasks.length - 5} công việc quá hạn khác`,
      module: 'Công việc',
      link: '/staff-performance?filter=overdue',
    });
  }

  /* --- Lịch trực & điều dưỡng --- */
  const todayShift = input.shifts.find(shift => toDateKey(shift.date) === today);
  const tomorrowShift = input.shifts.find(shift => toDateKey(shift.date) === tomorrow);
  if (!todayShift || !todayShift.doctor) {
    push({ id: 'no-shift', severity: 'warning', title: 'Chưa phân lịch trực hôm nay', module: 'Lịch trực', link: `/shifts?date=${today}`, boost: 30 });
  }
  if (!tomorrowShift || !tomorrowShift.doctor) {
    push({ id: 'no-shift-tomorrow', severity: 'info', title: 'Chưa có lịch trực ngày mai', module: 'Lịch trực', link: `/shifts?date=${tomorrow}` });
  }

  const nursingToday = input.nursingTasks.filter(task => toDateKey(task.date) === today);
  const nursingDone = nursingToday.filter(task => isDoneStatus(task.status)).length;
  const nursing = { total: nursingToday.length, done: nursingDone, pending: nursingToday.length - nursingDone };
  const urgentNursing = nursingToday.filter(task => !isDoneStatus(task.status) && task.priority === 'Khẩn');
  urgentNursing.slice(0, 3).forEach(task =>
    push({
      id: `nursing-${task.id}`,
      severity: 'critical',
      title: task.task,
      detail: `Ca ${task.shift}${task.assignee ? ` · ${task.assignee}` : ''}`,
      module: 'Điều dưỡng',
      link: '/nursing-tasks',
      assignee: task.assignee,
    }),
  );
  if (nursing.pending > urgentNursing.length) {
    push({
      id: 'nursing-pending',
      severity: 'info',
      title: `${nursing.pending} việc điều dưỡng hôm nay chưa xong`,
      detail: `${nursing.done}/${nursing.total} đã hoàn thành`,
      module: 'Điều dưỡng',
      link: '/nursing-tasks',
    });
  }

  /* --- Kho & thiết bị --- */
  input.medicines.forEach(medicine => {
    const expiry = toDateKey(medicine.expiryDate);
    if (!expiry) return;
    const left = diffDays(today, expiry);
    if (left < 0) {
      push({ id: `med-exp-${medicine.id}`, severity: 'critical', title: `${medicine.name} đã hết hạn`, detail: `HSD ${fmtDate(expiry)} · còn ${medicine.quantity} ${medicine.unit || ''}`, module: 'Kho thuốc', link: '/inventory?filter=expired', date: expiry, boost: 10 });
    } else if (left <= 30) {
      push({ id: `med-soon-${medicine.id}`, severity: 'warning', title: `${medicine.name} cận hạn (${left} ngày)`, detail: `HSD ${fmtDate(expiry)}`, module: 'Kho thuốc', link: '/inventory?filter=expiring', date: expiry, boost: 30 - left });
    }
  });
  const lowStock = input.medicines.filter(medicine => toNumber(medicine.quantity) < 10);
  if (lowStock.length) {
    push({ id: 'med-low', severity: 'info', title: `${lowStock.length} thuốc/vật tư sắp hết`, detail: lowStock.slice(0, 3).map(item => item.name).join(', '), module: 'Kho thuốc', link: '/inventory?filter=low' });
  }

  input.equipment.forEach(item => {
    if (isBadCondition(item.condition)) {
      push({ id: `eq-bad-${item.id}`, severity: fold(item.condition).includes('broken') || fold(item.condition).includes('hong') ? 'critical' : 'warning', title: `${item.name} ${fold(item.condition).includes('repair') ? 'đang sửa' : 'hỏng'}`, detail: item.code, module: 'Thiết bị', link: '/inventory?tab=equipment', assignee: item.inCharge });
      return;
    }
    const next = nextMaintenanceKey(item);
    if (!next) return;
    const left = diffDays(today, next);
    if (left < 0) push({ id: `eq-due-${item.id}`, severity: 'warning', title: `${item.name} quá hạn kiểm định`, detail: `Hạn ${fmtDate(next)}`, module: 'Thiết bị', link: '/inventory?tab=equipment', assignee: item.inCharge, boost: 20 });
    else if (left <= 14) push({ id: `eq-soon-${item.id}`, severity: 'info', title: `${item.name} sắp tới hạn kiểm định`, detail: `${left} ngày nữa · ${fmtDate(next)}`, module: 'Thiết bị', link: '/inventory?tab=equipment', assignee: item.inCharge });
  });

  const openImprovements = input.improvements.filter(item => !['HoanThanh', 'Hoàn thành'].includes(String(item.status)));
  if (openImprovements.length) {
    push({ id: '5s-open', severity: 'info', title: `${openImprovements.length} đề xuất cải tiến 5S đang mở`, module: '5S', link: '/5s?tab=improvements' });
  }

  /* --- Khoa học --- */
  const upcomingMeetings = input.meetings
    .filter(meeting => {
      const key = toDateKey(meeting.time);
      return key !== '' && key >= today && diffDays(today, key) <= 14;
    })
    .sort((a, b) => String(a.time).localeCompare(String(b.time)));
  upcomingMeetings.slice(0, 2).forEach(meeting => {
    const key = toDateKey(meeting.time);
    push({ id: `meeting-${meeting.id}`, severity: 'info', title: `SHKH: ${meeting.topic}`, detail: `${fmtDate(key)}${meeting.presenter ? ` · ${meeting.presenter}` : ''}`, module: 'Khoa học', link: '/science-meetings', date: key, boost: 14 - diffDays(today, key) });
  });

  input.research.forEach(topic => {
    const deadline = toDateKey(topic.deadline);
    if (!deadline || toNumber(topic.progress) >= 100) return;
    const left = diffDays(today, deadline);
    if (left < 0) push({ id: `research-${topic.id}`, severity: 'warning', title: `Đề tài quá hạn: ${topic.topic}`, detail: `Hạn ${fmtDate(deadline)} · tiến độ ${toNumber(topic.progress)}%`, module: 'NCKH', link: '/research', assignee: topic.author });
    else if (left <= 21) push({ id: `research-${topic.id}`, severity: 'info', title: `Đề tài sắp tới hạn: ${topic.topic}`, detail: `${left} ngày nữa · tiến độ ${toNumber(topic.progress)}%`, module: 'NCKH', link: '/research', assignee: topic.author });
  });

  insights.sort((a, b) => b.score - a.score);

  const expiredOrBroken =
    input.medicines.filter(medicine => {
      const key = toDateKey(medicine.expiryDate);
      return key !== '' && key < today;
    }).length + input.equipment.filter(item => isBadCondition(item.condition)).length;

  return {
    today,
    active,
    waiting,
    approved,
    postOp,
    internal,
    surgeryToday,
    surgeryTomorrow,
    overdueSchedule,
    admittedToday,
    dischargedToday,
    operatedToday,
    needsClassification,
    occupancy,
    month,
    trend,
    todayShift,
    tomorrowShift,
    openTasks,
    overdueTasks,
    nursing,
    upcomingMeetings,
    insights,
    badges: {
      '/surgery-approval': waiting.length + overdueSchedule.length,
      '/clinical': needsClassification.length,
      '/staff-performance': overdueTasks.length,
      '/nursing-tasks': nursing.pending,
      '/inventory': expiredOrBroken,
      '/shifts': todayShift?.doctor ? 0 : 1,
    },
  };
}
