import { Patient } from '../types';

// ============================================================
// THUẬT TOÁN PHÁT HIỆN BỆNH NHÂN TRÙNG — 4 CẤP ĐỘ
// (Dùng các trường đã có, không cần thêm trường mới)
// ============================================================
// Cấp 1: Số điện thoại trùng (Độ tin cậy: CAO)
// Cấp 2: Họ tên đầy đủ + Ngày sinh đầy đủ (Độ tin cậy: CAO)
// Cấp 3: Họ tên đầy đủ + Năm sinh (Độ tin cậy: TRUNG BÌNH)
// Cấp 4: Họ tên đầy đủ + Giới tính (Độ tin cậy: THẤP)

export type MatchType = 'PHONE' | 'NAME_DOB' | 'NAME_YEAR' | 'NAME_GENDER';
export type MatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface DuplicateMatch {
  patient: Patient;
  matchType: MatchType;
  confidence: MatchConfidence;
  detail: string;
}

/** Chuẩn hóa họ tên: bỏ dấu, lowercase, trim */
const normalizeName = (s?: string): string =>
  (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');

/** Chuẩn hóa số điện thoại: chỉ giữ chữ số */
const normalizePhone = (s?: string): string =>
  (s || '').replace(/\D/g, '').trim();

/** Trích xuất năm sinh từ dob (YYYY-MM-DD, YYYY, hoặc số tuổi) */
const extractYear = (dob?: string): string => {
  if (!dob) return '';
  const s = String(dob).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 4);
  if (/^\d{4}$/.test(s)) return s;
  if (/^\d{1,3}$/.test(s)) {
    const age = parseInt(s, 10);
    return String(new Date().getFullYear() - age);
  }
  return s.slice(0, 4);
};

/**
 * Phát hiện bệnh nhân trùng.
 * @param candidate        Dữ liệu bệnh nhân đang nhập
 * @param existingPatients Danh sách bệnh nhân hiện có
 * @param excludeId        ID bệnh nhân đang sửa (để bỏ qua chính nó)
 */
export function detectDuplicates(
  candidate: Partial<Patient>,
  existingPatients: Patient[],
  excludeId?: string
): DuplicateMatch[] {
  const results: DuplicateMatch[] = [];

  const candName  = normalizeName(candidate.name);
  const candPhone = normalizePhone(candidate.phoneNumber);
  const candYear  = extractYear(candidate.dob);
  const candDob   = (candidate.dob || '').trim();

  for (const p of existingPatients) {
    if (excludeId && p.id === excludeId) continue;
    if (!p.id) continue;

    const pPhone = normalizePhone(p.phoneNumber);
    const pName  = normalizeName(p.name);
    const pYear  = extractYear(p.dob);
    const pDob   = (p.dob || '').trim();

    // ── Tiêu chí 1: Trùng SĐT (≥9 chữ số) ─────────────────────────
    if (candPhone.length >= 9 && pPhone.length >= 9 && candPhone === pPhone) {
      results.push({
        patient: p,
        matchType: 'PHONE',
        confidence: 'HIGH',
        detail: `Trùng số điện thoại: ${candidate.phoneNumber}`,
      });
      continue;
    }

    // Các tiêu chí dưới đây yêu cầu họ tên phải khớp
    if (!candName || !pName || candName !== pName) continue;

    // ── Tiêu chí 2: Trùng Họ tên + Ngày sinh đầy đủ ────────────────
    if (candDob.length >= 8 && pDob.length >= 8 && candDob === pDob) {
      results.push({
        patient: p,
        matchType: 'NAME_DOB',
        confidence: 'HIGH',
        detail: `Trùng họ tên "${p.name}" + ngày sinh ${p.dob}`,
      });
      continue;
    }

    // ── Tiêu chí 3: Trùng Họ tên + Năm sinh ────────────────────────
    if (candYear.length === 4 && pYear.length === 4 && candYear === pYear) {
      results.push({
        patient: p,
        matchType: 'NAME_YEAR',
        confidence: 'MEDIUM',
        detail: `Trùng họ tên "${p.name}" + năm sinh ${pYear}`,
      });
      continue;
    }

    // ── Tiêu chí 4: Trùng Họ tên + Giới tính ───────────────────────
    if (candidate.gender && p.gender && candidate.gender === p.gender) {
      results.push({
        patient: p,
        matchType: 'NAME_GENDER',
        confidence: 'LOW',
        detail: `Trùng họ tên "${p.name}" + giới tính ${p.gender}`,
      });
    }
  }

  // Sắp xếp theo độ tin cậy: HIGH → MEDIUM → LOW
  const order: Record<MatchConfidence, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  return results.sort((a, b) => order[a.confidence] - order[b.confidence]);
}

/** Label hiển thị cho loại match */
export const getMatchTypeLabel = (matchType: MatchType): string => {
  const map: Record<MatchType, string> = {
    PHONE:       'Số điện thoại',
    NAME_DOB:    'Họ tên + Ngày sinh',
    NAME_YEAR:   'Họ tên + Năm sinh',
    NAME_GENDER: 'Họ tên + Giới tính',
  };
  return map[matchType] || matchType;
};
