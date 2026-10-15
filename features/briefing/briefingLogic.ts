import type { BriefingTask, DailyBriefing } from '../../types';
import type { Summary } from '../dashboard/insights';
import { addDays, fmtDate, toDateKey, weekdayLong } from '../../lib/dates';
import { getAge } from '../../utils/exportUtils';

type DirectoryUser = { username: string; fullName: string };

/** Chuẩn hoá bản ghi giao ban từ sheet (công việc lưu dạng JSON trong cột CongViecJson). */
export const parseBriefings = (raw: unknown[], users: DirectoryUser[]): DailyBriefing[] => {
  const resolve = (value?: string) => users.find(user => user.username === value || user.fullName === value);
  return (raw || [])
    .filter(Boolean)
    .map((item: any) => {
      let tasks: BriefingTask[] = [];
      if (item.congViecJson) {
        try {
          const parsed = JSON.parse(item.congViecJson);
          if (Array.isArray(parsed)) tasks = parsed;
        } catch {
          /* dữ liệu hỏng: bỏ qua phần công việc */
        }
      } else if (Array.isArray(item.tasks)) {
        tasks = item.tasks;
      }
      const normalized = tasks.map((task, index) => {
        const user = resolve(task.assigneeUsername || task.assignee);
        return {
          ...task,
          id: task.id || `T${index + 1}`,
          progress: Number(task.progress) || 0,
          assigneeUsername: task.assigneeUsername || user?.username || '',
          assigneeName: task.assigneeName || user?.fullName || task.assignee || '',
        };
      });
      return { ...item, date: toDateKey(item.date) || item.date, content: String(item.content || ''), host: String(item.host || ''), tasks: normalized } as DailyBriefing;
    })
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
};

export const isTaskOverdue = (task: BriefingTask, today: string) => {
  const deadline = toDateKey(task.deadline);
  return Boolean(deadline) && deadline < today && Number(task.progress) < 100;
};

/** Soạn sẵn nội dung giao ban từ số liệu hiện có. Người dùng chỉnh sửa trước khi lưu. */
export const composeBriefing = (summary: Summary, date: string): string => {
  const yesterday = addDays(date, -1);
  const operatedYesterday = summary.active
    .concat(summary.dischargedToday)
    .filter(patient => toDateKey(patient.actualSurgeryDate) === yesterday);
  const lines: string[] = [];
  lines.push(`I. TÌNH HÌNH BỆNH NHÂN — ${weekdayLong(date)}, ${fmtDate(date)}`);
  lines.push(
    `- Tổng số BN đang điều trị: ${summary.active.length} (chờ mổ ${summary.waiting.length}, đã duyệt ${summary.approved.length}, hậu phẫu ${summary.postOp.length}, nội khoa ${summary.internal.length}).`,
  );
  lines.push(`- Công suất giường: ${summary.occupancy.used}/${summary.occupancy.total}.`);
  lines.push(`- Vào viện hôm nay: ${summary.admittedToday.length} · Ra viện hôm nay: ${summary.dischargedToday.length}.`);
  if (operatedYesterday.length) lines.push(`- Phẫu thuật ngày ${fmtDate(yesterday)}: ${operatedYesterday.length} ca.`);
  if (summary.surgeryToday.length) {
    lines.push(`- Lịch mổ hôm nay: ${summary.surgeryToday.length} ca`);
    summary.surgeryToday.forEach((patient, index) => {
      const age = getAge(patient.dob);
      lines.push(
        `   ${index + 1}. ${patient.name}${age !== '' ? ` (${age}T)` : ''} — ${patient.surgeryMethod || patient.diagnosis}${patient.surgeon ? ` — PTV ${patient.surgeon}` : ''}`,
      );
    });
  } else {
    lines.push('- Lịch mổ hôm nay: không có ca.');
  }
  if (summary.overdueSchedule.length) lines.push(`- Lưu ý: ${summary.overdueSchedule.length} ca đã qua ngày mổ dự kiến nhưng chưa xác nhận.`);

  lines.push('');
  lines.push('II. CÔNG TÁC TRỰC & ĐIỀU HÀNH');
  if (summary.todayShift?.doctor) {
    lines.push(`- Kíp trực hôm nay: BS ${summary.todayShift.doctor}${[summary.todayShift.nurse1, summary.todayShift.nurse2].filter(Boolean).length ? `; ĐD ${[summary.todayShift.nurse1, summary.todayShift.nurse2].filter(Boolean).join(', ')}` : ''}.`);
  }
  if (summary.overdueTasks.length) lines.push(`- Công việc quá hạn: ${summary.overdueTasks.length} việc cần đôn đốc.`);
  if (summary.needsClassification.length) lines.push(`- Hồ sơ đã mổ chưa phân loại PT: ${summary.needsClassification.length}.`);
  lines.push('');
  lines.push('III. Ý KIẾN CHỈ ĐẠO');
  lines.push('- ');
  return lines.join('\n');
};
