import { describe, expect, it } from 'vitest';
import type { Patient } from '../types';
import { getVietnamDateKey, getVietnamMonthKey, parseCalendarDate } from './dateUtils';
import { calculateSurgeryStats, needsSurgeryClassification, toSurgeryClassificationCode, toSurgeryServiceCode } from './surgeryStats';

const patient = (id: string, patch: Partial<Patient>): Patient => ({
  id,
  name: `BN ${id}`,
  dob: '1990-01-01',
  gender: 'Nam',
  room: '1',
  bed: '1',
  treatmentType: 'Ngoai',
  status: 'DaMo',
  diagnosis: 'Test',
  admissionDate: '2026-08-01',
  actualSurgeryDate: '2026-08-10',
  ...patch,
});

describe('calculateSurgeryStats', () => {
  it('tái hiện chuẩn 65 phẫu thuật, 11 RFA và 25 hồ sơ chờ hoàn thiện', () => {
    const records: Patient[] = [];
    for (let index = 0; index < 20; index++) records.push(patient(`db-${index}`, { surgeryType: 'Đặc biệt', surgeryService: 'K giáp' }));
    for (let index = 0; index < 39; index++) records.push(patient(`i-${index}`, { surgeryType: 'Loại I', surgeryService: index % 2 ? 'ETS đốt hạch giao cảm' : 'Basedow' }));
    for (let index = 0; index < 6; index++) records.push(patient(`ii-${index}`, { surgeryType: 'Loại II', surgeryService: 'PT khác' }));
    for (let index = 0; index < 11; index++) records.push(patient(`rfa-${index}`, { surgeryType: 'Đặc biệt', surgeryService: 'RFA giáp' }));
    for (let index = 0; index < 17; index++) records.push(patient(`missing-${index}`, { surgeryType: '', surgeryService: 'Cắt 1 thùy' }));
    for (let index = 0; index < 8; index++) records.push(patient(`legacy-${index}`, { surgeryType: 'Đặc biệt (ĐB)', surgeryService: 'K giáp' }));

    const stats = calculateSurgeryStats(records, '2026-08');
    expect(stats.sourceRecords).toBe(101);
    expect(stats.totalSurgeries).toBe(65);
    expect(stats.totalProcedures).toBe(11);
    expect(stats.incompleteRecords).toBe(25);
    expect(stats.total).toBe(76);
    expect(Object.values(stats.groups).reduce((sum, value) => sum + value, 0)).toBe(65);
    expect(Object.values(stats.classifications).reduce((sum, value) => sum + value, 0)).toBe(65);
    expect(stats.classifications).toEqual({ 'Đặc biệt': 20, 'Loại I': 39, 'Loại II': 6, 'Loại III': 0 });
  });

  it('chỉ dùng ngày mổ thực tế, không dùng ngày dự kiến', () => {
    const stats = calculateSurgeryStats([
      patient('planned', { actualSurgeryDate: '', surgeryDate: '2026-08-10', surgeryType: 'Loại I' }),
    ], '2026-08');
    expect(stats.sourceRecords).toBe(0);
    expect(stats.totalSurgeries).toBe(0);
  });

  it('chỉ tính đốt sóng cao tần trong nhóm thủ thuật và gắn cờ hồ sơ phẫu thuật thiếu phân loại', () => {
    const rfa = patient('rfa-vi', {
      activityType: 'Thủ thuật',
      surgeryService: '',
      surgeryMethod: 'Đốt sóng cao tần điều trị u tuyến giáp',
      surgeryType: '',
    });
    const laser = patient('laser', {
      activityType: 'Thủ thuật',
      surgeryService: 'PT khác',
      surgeryMethod: 'Điều trị suy tĩnh mạch bằng Laser nội mạch',
      surgeryType: '',
    });
    const incomplete = patient('incomplete', {
      activityType: 'Phẫu thuật',
      surgeryService: 'Cắt 1 thùy',
      surgeryType: '',
    });
    const internalMedicine = patient('internal', {
      treatmentType: 'Noi',
      status: 'DieuTri',
      activityType: undefined,
      surgeryService: '',
      surgeryMethod: '',
      surgeryType: '',
    });
    const stats = calculateSurgeryStats([rfa, laser, incomplete, internalMedicine], '2026-08');
    expect(stats.totalProcedures).toBe(1);
    expect(stats.excludedProcedures).toBe(1);
    expect(stats.incompleteRecords).toBe(1);
    expect(needsSurgeryClassification(rfa)).toBe(false);
    expect(needsSurgeryClassification(laser)).toBe(false);
    expect(needsSurgeryClassification(incomplete)).toBe(true);
    expect(needsSurgeryClassification(internalMedicine)).toBe(false);
    expect(needsSurgeryClassification({ ...internalMedicine, status: 'RaVien' })).toBe(false);
    expect(needsSurgeryClassification(
      { ...internalMedicine, treatmentType: 'Ngoai', status: 'RaVien' },
      { treatmentType: 'Ngoai', status: 'DieuTri' },
    )).toBe(false);
    expect(stats.sourceRecords).toBe(3);
  });

  it('hỗ trợ mã canonical và nhãn legacy hợp lệ nhưng không tự nhận Đặc biệt (ĐB)', () => {
    expect(toSurgeryClassificationCode('DAC_BIET')).toBe('DAC_BIET');
    expect(toSurgeryClassificationCode('Đặc biệt')).toBe('DAC_BIET');
    expect(toSurgeryClassificationCode('Đặc biệt (ĐB)')).toBeNull();
    expect(toSurgeryServiceCode('RFA giáp')).toBe('RFA');
    expect(toSurgeryServiceCode('ETS')).toBe('ETS');
  });
});

describe('Vietnam business dates', () => {
  it('đổi ngày theo múi giờ Việt Nam thay vì UTC', () => {
    const instant = new Date('2026-08-31T18:00:00.000Z');
    expect(getVietnamDateKey(instant)).toBe('2026-09-01');
    expect(getVietnamMonthKey(instant)).toBe('2026-09');
  });

  it('parse ngày Việt Nam và từ chối năm bất thường', () => {
    expect(parseCalendarDate('25/08/2026')?.key).toBe('2026-08-25');
    expect(parseCalendarDate('2926-06-01')).toBeNull();
  });
});
