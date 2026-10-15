import { describe, expect, it } from 'vitest';
import type { DailyOnCall, NursingTask, Patient, StaffTask } from '../types';
import { fold, matchesQuery, initials, safeUrl } from '../lib/text';
import { addDays, diffDays, fmtDate, monthGrid, startOfWeek, toDateKey } from '../lib/dates';
import { preparePatient } from './patients/patientLogic';
import { computeSummary, nextMaintenanceKey, type InsightInput } from './dashboard/insights';
import { buildCopy, nextStatus, normalizeShift, progressOf } from './nursing/nursingLogic';
import { suggestRoster, countDuties } from './shifts/shiftsLogic';
import { casesInMonth, countBy } from './surgery/statsLogic';
import { calculateSurgeryStats } from '../utils/surgeryStats';
import { parseBriefings, composeBriefing } from './briefing/briefingLogic';
import { presetForTopic } from './research/researchLogic';

const patient = (overrides: Partial<Patient>): Patient => ({
  id: 'BN1',
  name: 'Nguyễn Văn A',
  dob: '1980',
  gender: 'Nam',
  room: '201',
  bed: '1',
  treatmentType: 'Ngoai',
  status: 'ChoMo',
  diagnosis: 'Bướu giáp',
  admissionDate: '2026-10-10',
  ...overrides,
});

const emptyInput = (): InsightInput => ({
  patients: [],
  vips: [],
  staffTasks: [],
  medicines: [],
  equipment: [],
  improvements: [],
  evaluations5S: [],
  shifts: [],
  meetings: [],
  research: [],
  nursingTasks: [],
});

describe('lib/text', () => {
  it('tìm kiếm không phân biệt dấu và theo từng từ', () => {
    expect(fold('Đặng Thị Hồng')).toBe('dang thi hong');
    expect(matchesQuery('ng van a', 'Nguyễn Văn An')).toBe(true);
    expect(matchesQuery('tuyen giap', 'K tuyến giáp thể nhú')).toBe(true);
    expect(matchesQuery('basedow', 'Bướu giáp nhân')).toBe(false);
  });

  it('tạo chữ viết tắt avatar và lọc link an toàn', () => {
    expect(initials('BS. Nguyễn Văn An')).toBe('NA');
    expect(safeUrl('javascript:alert(1)')).toBe('');
    expect(safeUrl('https://example.com/a')).toBe('https://example.com/a');
  });
});

describe('lib/dates', () => {
  it('chuẩn hoá & cộng trừ ngày theo lịch', () => {
    expect(toDateKey('05/09/2026')).toBe('2026-09-05');
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
    expect(diffDays('2026-10-01', '2026-10-14')).toBe(13);
    expect(startOfWeek('2026-10-14')).toBe('2026-10-12');
    expect(fmtDate('2026-10-14')).toBe('14/10/2026');
  });

  it('lịch tháng bắt đầu từ thứ Hai và đủ tuần', () => {
    const cells = monthGrid('2026-10');
    expect(cells[0].key).toBe('2026-09-28');
    expect(cells.length % 7).toBe(0);
    expect(cells.filter(cell => cell.inMonth)).toHaveLength(31);
  });
});

describe('preparePatient', () => {
  it('bắt buộc các trường cơ bản', () => {
    const result = preparePatient({ id: '', name: 'A' }, undefined, false, '2026-10-14');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.field).toBe('id');
  });

  it('có ngày mổ thực tế ⇒ hậu phẫu + suy ra loại hoạt động', () => {
    const result = preparePatient(patient({ actualSurgeryDate: '2026-10-12', surgeryService: 'TOETVA', surgeryType: 'LOAI_I' }), undefined, false, '2026-10-14');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.status).toBe('DaMo');
      expect(result.payload.activityType).toBe('Phẫu thuật');
    }
  });

  it('chặn lưu khi đã mổ mà chưa phân loại (trừ RFA)', () => {
    const missing = preparePatient(patient({ actualSurgeryDate: '2026-10-12', surgeryService: 'TOETVA' }), undefined, false, '2026-10-14');
    expect(missing.ok).toBe(false);
    const rfa = preparePatient(patient({ actualSurgeryDate: '2026-10-12', surgeryService: 'RFA' }), undefined, false, '2026-10-14');
    expect(rfa.ok).toBe(true);
    if (rfa.ok) expect(rfa.payload.activityType).toBe('Thủ thuật');
  });

  it('ra viện tự điền ngày và không cho trước ngày nhập viện', () => {
    const ok = preparePatient(patient({ status: 'RaVien' }), patient({}), true, '2026-10-14');
    expect(ok.ok && ok.payload.dischargeDate).toBe('2026-10-14');
    const bad = preparePatient(patient({ status: 'RaVien', dischargeDate: '2026-10-01' }), patient({}), true, '2026-10-14');
    expect(bad.ok).toBe(false);
  });

  it('cho phép xoá ngày mổ nhập nhầm khi sửa hồ sơ', () => {
    const previous = patient({ actualSurgeryDate: '2026-10-12', surgeryService: 'RFA' });
    const result = preparePatient({ ...previous, actualSurgeryDate: '' }, previous, true, '2026-10-14');
    expect(result.ok && result.payload.actualSurgeryDate).toBe('');
  });
});

describe('computeSummary', () => {
  it('ưu tiên ca mổ hôm nay & cảnh báo lịch quá ngày', () => {
    const input = emptyInput();
    input.patients = [
      patient({ id: 'A', status: 'DaDuyet', surgeryDate: '2026-10-14', surgeryOrder: 2 }),
      patient({ id: 'B', status: 'DaDuyet', surgeryDate: '2026-10-14', surgeryOrder: 1 }),
      patient({ id: 'C', status: 'DaDuyet', surgeryDate: '2026-10-10' }),
      patient({ id: 'D', status: 'ChoMo', admissionDate: '2026-10-01' }),
    ];
    const summary = computeSummary(input, '2026-10-14');
    expect(summary.surgeryToday.map(item => item.id)).toEqual(['B', 'A']);
    expect(summary.overdueSchedule.map(item => item.id)).toEqual(['C']);
    expect(summary.insights[0].severity).toBe('critical');
    expect(summary.insights.some(item => item.id === 'waiting-D' && item.severity === 'warning')).toBe(true);
    expect(summary.badges['/surgery-approval']).toBe(2);
  });

  it('nhận diện việc quá hạn, thuốc hết hạn và thiếu lịch trực', () => {
    const input = emptyInput();
    input.staffTasks = [{ id: 'T1', userId: 'a', tieuDe: 'Báo cáo', nguoiGiao: '', ngayGiao: '', hanHoanThanh: '2026-10-01', mucDoUuTien: 'Cao', trangThai: 'Đang làm', tienDo: 40 } as StaffTask];
    input.medicines = [{ id: 'M1', name: 'Cefazolin', quantity: 3, unit: 'Lọ', expiryDate: '2026-10-01' }];
    const summary = computeSummary(input, '2026-10-14');
    expect(summary.overdueTasks).toHaveLength(1);
    const ids = summary.insights.map(item => item.id);
    expect(ids).toContain('med-exp-M1');
    expect(ids).toContain('no-shift');
    expect(ids).toContain('med-low');
  });

  it('tính hạn kiểm định thiết bị theo chu kỳ tháng', () => {
    expect(nextMaintenanceKey({ lastMaintenanceDate: '2026-01-31', maintenanceCycle: 1 })).toBe('2026-03-03');
    expect(nextMaintenanceKey({ lastMaintenanceDate: '2026-04-15', maintenanceCycle: 6 })).toBe('2026-10-15');
  });
});

describe('nursing', () => {
  it('chuẩn hoá ca & chu kỳ trạng thái', () => {
    expect(normalizeShift('ca chiều')).toBe('Chiều');
    expect(normalizeShift('Dem')).toBe('Đêm');
    expect(nextStatus('Chưa làm')).toBe('Đang làm');
    expect(nextStatus('Hoàn thành')).toBe('Chưa làm');
  });

  it('sao chép việc hôm trước không tạo trùng', () => {
    const source = [
      { id: '1', date: '2026-10-13', shift: 'Sáng', task: 'Bàn giao ca', status: 'Hoàn thành' },
      { id: '2', date: '2026-10-13', shift: 'Đêm', task: 'Kiểm tra thuốc', status: 'Chưa làm', assignee: 'ĐD Lan' },
    ] as NursingTask[];
    const existing = [{ id: '3', date: '2026-10-14', shift: 'Sáng', task: 'bàn giao ca', status: 'Chưa làm' }] as NursingTask[];
    const copy = buildCopy(source, '2026-10-14', existing);
    expect(copy).toHaveLength(1);
    expect(copy[0]).toMatchObject({ date: '2026-10-14', shift: 'Đêm', status: 'Chưa làm', assignee: 'ĐD Lan' });
    expect(progressOf(source).pct).toBe(50);
  });
});

describe('suggestRoster', () => {
  it('chia đều và tránh trực 2 ngày liền, không ghi đè ô có sẵn', () => {
    const days = [
      { date: '2026-10-12', doctor: 'BS An' },
      { date: '2026-10-13' },
      { date: '2026-10-14' },
      { date: '2026-10-15' },
    ];
    const roster = suggestRoster(days, ['BS An', 'BS Bình', 'BS Chi'], ['ĐD 1', 'ĐD 2', 'ĐD 3', 'ĐD 4'], []);
    expect(roster[0].doctor).toBe('BS An');
    roster.forEach((day, index) => {
      expect(day.doctor).toBeTruthy();
      expect(day.nurse1).not.toBe(day.nurse2);
      if (index > 0) expect(day.doctor).not.toBe(roster[index - 1].doctor);
    });
    const counts = countDuties(roster as DailyOnCall[]);
    const doctorCounts = ['BS An', 'BS Bình', 'BS Chi'].map(name => counts.get(name) || 0);
    expect(Math.max(...doctorCounts) - Math.min(...doctorCounts)).toBeLessThanOrEqual(1);
  });
});

describe('statsLogic', () => {
  it('danh sách ca khớp với số liệu thống kê chính thức', () => {
    const patients = [
      patient({ id: '1', actualSurgeryDate: '2026-10-02', surgeryService: 'TOETVA', surgeryType: 'LOAI_I', surgeon: 'BS An' }),
      patient({ id: '2', actualSurgeryDate: '2026-10-03', surgeryService: 'RFA', surgeon: 'BS An' }),
      patient({ id: '3', actualSurgeryDate: '2026-10-04', surgeryService: 'K_GIAP' }),
      patient({ id: '4', actualSurgeryDate: '2026-10-05', treatmentType: 'Noi', status: 'DieuTri' }),
      patient({ id: '5', actualSurgeryDate: '2026-09-05', surgeryService: 'BASEDOW', surgeryType: 'LOAI_II', surgeon: 'BS Bình' }),
    ];
    const cases = casesInMonth(patients, '2026-10');
    const stats = calculateSurgeryStats(patients, '2026-10');
    expect(cases.surgeries).toHaveLength(stats.totalSurgeries);
    expect(cases.procedures).toHaveLength(stats.totalProcedures);
    expect(cases.incomplete).toHaveLength(stats.incompleteRecords);
    expect(countBy([...cases.surgeries, ...cases.procedures], item => item.surgeon)).toEqual([{ name: 'BS An', count: 2 }]);
  });
});

describe('briefing', () => {
  it('đọc công việc từ JSON và nối người dùng', () => {
    const [briefing] = parseBriefings(
      [{ id: 'G1', date: '2026-10-14', host: 'BS An', content: 'Nội dung', congViecJson: JSON.stringify([{ taskName: 'Việc 1', assignee: 'Trần B', deadline: '2026-10-20', progress: 0 }]) }],
      [{ username: 'tranb', fullName: 'Trần B' }],
    );
    expect(briefing.tasks[0]).toMatchObject({ id: 'T1', assigneeUsername: 'tranb', assigneeName: 'Trần B' });
  });

  it('soạn nội dung giao ban có số liệu', () => {
    const input = emptyInput();
    input.patients = [patient({ id: 'A', status: 'DaDuyet', surgeryDate: '2026-10-14', surgeryMethod: 'TOETVA', surgeon: 'BS An' })];
    const text = composeBriefing(computeSummary(input, '2026-10-14'), '2026-10-14');
    expect(text).toContain('Tổng số BN đang điều trị: 1');
    expect(text).toContain('TOETVA — PTV BS An');
  });
});

describe('research preset', () => {
  it('gợi ý từ khoá theo tên đề tài', () => {
    expect(presetForTopic('Đánh giá kết quả phẫu thuật TOETVA')?.keyword).toBe('TOETVA');
    expect(presetForTopic('Điều trị tăng tiết mồ hôi tay bằng cắt hạch giao cảm')?.keyword).toBe('giao cảm');
    expect(presetForTopic('Quản lý chất lượng')).toBeNull();
  });
});

describe('getAge', () => {
  it('tính tuổi cho người sinh trước 1971 nhưng vẫn bỏ ngày 0 (1970-01-01)', async () => {
    const { getAge } = await import('../utils/exportUtils');
    const year = new Date().getFullYear();
    expect(getAge('1957')).toBe(year - 1957);
    expect(getAge('15/08/1948')).toBe(year - 1948);
    expect(getAge('1970-01-01')).toBe('');
    expect(getAge('45')).toBe(45);
  });
});

describe('summarizeStaff', () => {
  it('tổng hợp tải việc, quá hạn, tỷ lệ đúng hạn và điểm đánh giá gần nhất', async () => {
    const { summarizeStaff, normalizeTask, normalizeEvaluation } = await import('./staff/staffLogic');
    const users = [
      { username: 'bs.a', fullName: 'BS. Nguyễn A' },
      { username: 'dd.b', fullName: 'ĐD. Trần B' },
      { username: 'idle', fullName: 'Lê C' },
    ];
    const tasks = [
      normalizeTask({ id: '1', userId: 'bs.a', tieuDe: 'x', hanHoanThanh: '2026-10-10', trangThai: 'Đang làm', tienDo: 50 }),
      normalizeTask({ id: '2', userId: 'bs.a', tieuDe: 'y', hanHoanThanh: '2026-10-15', trangThai: 'Chưa làm' }),
      normalizeTask({ id: '3', userId: 'bs.a', tieuDe: 'z', hanHoanThanh: '2026-10-01', trangThai: 'Hoàn thành', tienDo: 100 }),
      normalizeTask({ id: '4', userId: 'dd.b', tieuDe: 'w', hanHoanThanh: '2026-10-20', trangThai: 'Chưa làm' }),
      normalizeTask({ id: '5', userId: 'ghost', tieuDe: 'v' }),
    ];
    const evaluations = [
      normalizeEvaluation({ id: 'e1', userId: 'dd.b', loaiDanhGia: 'Quý', quy: 'Q2', nam: 2026, diemTong: 70, ngayDanhGia: '2026-07-01' }),
      normalizeEvaluation({ id: 'e2', userId: 'dd.b', loaiDanhGia: 'Quý', quy: 'Q3', nam: 2026, diemTong: 88, ngayDanhGia: '2026-10-01' }),
    ];
    const { people, unassigned } = summarizeStaff(users, tasks, evaluations, '2026-10-14');
    const a = people.find(p => p.username === 'bs.a')!;
    expect(a).toMatchObject({ group: 'BS', open: 2, overdue: 1, dueSoon: 1, done: 1, completion: 33, onTime: 50, load: 'over' });
    const b = people.find(p => p.username === 'dd.b')!;
    expect(b).toMatchObject({ group: 'DD', open: 1, overdue: 0, latestScore: 88, latestPeriod: 'Q3/2026', load: 'ok' });
    expect(people.find(p => p.username === 'idle')!.load).toBe('idle');
    expect(unassigned.map(t => t.id)).toEqual(['5']);
  });

  it('việc xong sau hạn bị tính là trễ, ngày hoàn thành được ghi và xoá đúng lúc', async () => {
    const { normalizeTask, finishedOnTime, withCompletionDate } = await import('./staff/staffLogic');
    const late = normalizeTask({ id: '1', hanHoanThanh: '2026-10-01', trangThai: 'Hoàn thành', ngayHoanThanh: '2026-10-05' });
    expect(finishedOnTime(late)).toBe(false);
    // Việc cũ chưa có ngày hoàn thành: không đủ căn cứ, coi như đúng hạn.
    expect(finishedOnTime(normalizeTask({ id: '2', hanHoanThanh: '2026-10-01', trangThai: 'Hoàn thành' }))).toBe(true);
    const open = normalizeTask({ id: '3', trangThai: 'Đang làm' });
    const done = withCompletionDate({ ...open, trangThai: 'Hoàn thành', tienDo: 100 }, open, '2026-10-14');
    expect(done.ngayHoanThanh).toBe('2026-10-14');
    expect(withCompletionDate({ ...done, ketQua: 'sửa ghi chú' }, done, '2026-10-20').ngayHoanThanh).toBe('2026-10-14');
    expect(withCompletionDate({ ...done, trangThai: 'Đang làm', tienDo: 50 }, done, '2026-10-20').ngayHoanThanh).toBe('');
  });

  it('gợi ý điểm hoàn thành công việc theo số liệu của kỳ', async () => {
    const { normalizeTask, periodRange, periodStats } = await import('./staff/staffLogic');
    expect(periodRange({ loaiDanhGia: 'Quý', quy: 'Q3', nam: 2026 })).toEqual({ from: '2026-07-01', to: '2026-09-30' });
    expect(periodRange({ loaiDanhGia: 'Năm', nam: 2026 })).toEqual({ from: '2026-01-01', to: '2026-12-31' });
    const tasks = [
      normalizeTask({ id: '1', userId: 'a', hanHoanThanh: '2026-08-01', trangThai: 'Hoàn thành', ngayHoanThanh: '2026-07-30' }),
      normalizeTask({ id: '2', userId: 'a', hanHoanThanh: '2026-08-10', trangThai: 'Hoàn thành', ngayHoanThanh: '2026-08-15' }),
      normalizeTask({ id: '3', userId: 'a', hanHoanThanh: '2026-09-01', trangThai: 'Đang làm' }),
      normalizeTask({ id: '4', userId: 'a', hanHoanThanh: '2026-09-20', trangThai: 'Tạm dừng' }),
      normalizeTask({ id: '5', userId: 'a', hanHoanThanh: '2026-11-01', trangThai: 'Hoàn thành' }),
    ];
    const stats = periodStats(tasks, periodRange({ loaiDanhGia: 'Quý', quy: 'Q3', nam: 2026 }), '2026-10-14');
    expect(stats).toMatchObject({ total: 4, assessed: 3, onTime: 1, late: 1, overdue: 1, suggested: 50 });
    expect(periodStats([], periodRange({ loaiDanhGia: 'Quý', quy: 'Q3', nam: 2026 }), '2026-10-14').suggested).toBeNull();
  });

  it('chấm điểm có trọng số theo nhóm, giữ bộ tiêu chí cũ, bắt buộc căn cứ', async () => {
    const { calcScore, rankFromScore, normalizeEvaluation, validateEvaluation, missingCriteria } = await import('./staff/staffLogic');
    const bs = { nhomDanhGia: 'BS', diemHoanThanhCongViec: 100, diemChuyenMon: 80, diemThaiDo: 80, diemKyLuat: 80, diemPhoiHop: 80, diemSangKien: 80 };
    expect(calcScore(bs)).toBe(86);
    expect(rankFromScore(86)).toBe('Hoàn thành tốt');
    expect(rankFromScore(90)).toBe('Hoàn thành xuất sắc');
    expect(rankFromScore(49)).toBe('Không hoàn thành');
    // Bản cũ không có nhóm: 5 tiêu chí, trọng số đều, không có "chuyên môn".
    expect(calcScore({ diemHoanThanhCongViec: 90, diemThaiDo: 80, diemKyLuat: 70, diemPhoiHop: 60, diemSangKien: 50 })).toBe(70);
    expect(missingCriteria({ nhomDanhGia: 'KHAC', diemHoanThanhCongViec: 50 }).map(c => c.key)).toEqual(['diemThaiDo', 'diemKyLuat', 'diemPhoiHop', 'diemSangKien']);
    expect(validateEvaluation({ nhomDanhGia: 'BS' }, null)[0]).toMatch(/Chưa chấm/);
    expect(validateEvaluation(bs, 95)).toEqual([]);
    expect(validateEvaluation(bs, 60)[0]).toMatch(/lệch 40/);
    expect(validateEvaluation({ ...bs, nhanXet: 'Có lý do' }, 60)).toEqual([]);
    expect(validateEvaluation({ ...bs, diemChuyenMon: 100, diemThaiDo: 100, diemKyLuat: 100 }, 100)[0]).toMatch(/xuất sắc/);
    // Bản tự đánh giá chưa được chấm không có điểm tổng / xếp loại.
    expect(normalizeEvaluation({ id: 's', userId: 'a', trangThai: 'Chờ trưởng khoa', diemTong: 80 })).toMatchObject({ diemTong: 0, xepLoai: '' });
  });

  it('điểm gần nhất theo kỳ, bỏ qua bản tự đánh giá đang chờ', async () => {
    const { summarizeStaff, normalizeEvaluation } = await import('./staff/staffLogic');
    const evaluations = [
      normalizeEvaluation({ id: '1', userId: 'a', loaiDanhGia: 'Quý', quy: 'Q3', nam: 2026, diemTong: 80, ngayDanhGia: '2026-09-01' }),
      // Chấm bù Q2 sau Q3 — ngày đánh giá mới hơn nhưng kỳ cũ hơn.
      normalizeEvaluation({ id: '2', userId: 'a', loaiDanhGia: 'Quý', quy: 'Q2', nam: 2026, diemTong: 60, ngayDanhGia: '2026-10-01' }),
      normalizeEvaluation({ id: '3', userId: 'a', loaiDanhGia: 'Quý', quy: 'Q4', nam: 2026, trangThai: 'Chờ trưởng khoa', ngayDanhGia: '2026-10-10' }),
    ];
    const [person] = summarizeStaff([{ username: 'a', fullName: 'A' }], [], evaluations, '2026-10-14').people;
    expect(person).toMatchObject({ latestScore: 80, latestPeriod: 'Q3/2026' });
  });
});

describe('scheduleOrder', () => {
  it('di chuyển, chèn ca và chỉ ghi các ca đổi số', async () => {
    const { moveId, insertIntoDay, orderChanges } = await import('./surgery/scheduleOrder');
    expect(moveId(['a', 'b', 'c', 'd'], 'a', 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveId(['a', 'b', 'c'], 'c', 0)).toEqual(['c', 'a', 'b']);
    const day = [patient({ id: 'A', surgeryOrder: 1 }), patient({ id: 'B', surgeryOrder: 2 }), patient({ id: 'C', surgeryOrder: 2 })];
    // Chèn N vào ca 2: B, C lùi xuống; trùng số cũ (B, C cùng là 2) được chuẩn hoá.
    const ids = insertIntoDay([...day, patient({ id: 'N' })], 'N', 2);
    expect(ids).toEqual(['A', 'N', 'B', 'C']);
    expect(orderChanges(day, ids)).toEqual([
      { id: 'N', order: 2 },
      { id: 'B', order: 3 },
      { id: 'C', order: 4 },
    ]);
  });
});

describe('buildBedLayout', () => {
  it('chỉ hiện giường đang có người, nhận diện nằm ghép', async () => {
    const { buildBedLayout } = await import('./patients/bedLayout');
    const active = [
      patient({ id: 'a', room: '201', bed: 'K19.003' }),
      patient({ id: 'b', room: '201', bed: '03' }),
      patient({ id: 'e', room: '201', bed: 'K19.H012' }),
      patient({ id: 'f', room: '201', bed: 'H5' }),
      patient({ id: 'c', room: '202', bed: '2' }),
      patient({ id: 'd', room: '', bed: '' }),
    ];
    const { rooms, unassigned } = buildBedLayout(active);
    const r201 = rooms.find(room => room.room === '201')!;
    expect(r201).toMatchObject({ occupied: 4, usedBeds: 3, shared: 1 });
    expect(r201.slots.map(slot => slot.bed)).toEqual(['3', '5', '12']);
    expect(rooms.map(room => room.room)).toEqual(['201', '202']);
    expect(unassigned.map(p => p.id)).toEqual(['d']);
  });
});
