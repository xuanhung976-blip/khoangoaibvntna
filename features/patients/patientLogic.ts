import type { Patient } from '../../types';
import { toDateKey, todayKey } from '../../lib/dates';
import {
  isInternalMedicineWorkflow,
  isRfaProcedure,
  needsSurgeryClassification,
  toSurgeryClassificationCode,
  getSurgeryClassificationLabel,
} from '../../utils/surgeryStats';

export type PatientField =
  | 'id'
  | 'name'
  | 'gender'
  | 'treatmentType'
  | 'diagnosis'
  | 'surgeryType'
  | 'dischargeDate';

export type PrepareResult = { ok: true; payload: Patient } | { ok: false; error: string; field: PatientField };

const OPTIONAL_TEXT_FIELDS: Array<keyof Patient> = ['phoneNumber', 'cccd', 'bhytCode', 'address', 'notes', 'treatingDoctor', 'room', 'bed', 'dob'];

/**
 * Chuẩn hoá & kiểm tra hồ sơ trước khi lưu. Giữ nguyên quy tắc nghiệp vụ của phiên bản trước:
 * - Có ngày mổ thực tế ⇒ trạng thái Hậu phẫu (trừ khi đã ra viện), suy ra loại hoạt động (RFA = thủ thuật).
 * - Hồ sơ phẫu thuật có ngày mổ thực tế bắt buộc có loại phẫu thuật (trừ RFA / nội khoa).
 * - Bệnh nhân nội khoa luôn lưu treatmentType = 'Noi'.
 */
export function preparePatient(current: Partial<Patient>, previous: Patient | undefined, isEditing: boolean, today = todayKey()): PrepareResult {
  const id = String(current.id || '').trim();
  const name = String(current.name || '').trim().replace(/\s+/g, ' ');
  const diagnosis = String(current.diagnosis || '').trim();

  if (!id) return { ok: false, error: 'Vui lòng nhập mã bệnh nhân.', field: 'id' };
  if (!name) return { ok: false, error: 'Vui lòng nhập họ tên.', field: 'name' };
  if (!current.gender) return { ok: false, error: 'Vui lòng chọn giới tính.', field: 'gender' };
  if (!current.treatmentType) return { ok: false, error: 'Vui lòng chọn phân loại Nội / Ngoại khoa.', field: 'treatmentType' };
  if (!diagnosis) return { ok: false, error: 'Vui lòng nhập chẩn đoán.', field: 'diagnosis' };

  const actualDate = String(current.actualSurgeryDate || '').trim();
  const validation = { ...current, treatmentType: current.treatmentType, status: current.status || 'ChoMo' } as Patient;
  const internal = isInternalMedicineWorkflow(validation, previous);

  if (needsSurgeryClassification(validation, previous)) {
    return { ok: false, error: 'Hồ sơ đã có ngày mổ thực tế — vui lòng chọn loại phẫu thuật.', field: 'surgeryType' };
  }

  const activityType = actualDate && !internal ? (isRfaProcedure(current as Patient) ? 'Thủ thuật' : 'Phẫu thuật') : current.activityType;
  const status: Patient['status'] = actualDate && current.status !== 'RaVien' ? 'DaMo' : current.status || 'ChoMo';

  const payload: Patient = {
    ...(current as Patient),
    id,
    name,
    diagnosis,
    activityType,
    treatmentType: internal ? 'Noi' : current.treatmentType,
    status,
    admissionDate: current.admissionDate || today,
  };

  // Cho phép xoá ngày mổ nhập nhầm khi sửa hồ sơ; hồ sơ mới thì bỏ trường rỗng.
  if (actualDate) payload.actualSurgeryDate = actualDate;
  else if (isEditing && previous?.actualSurgeryDate) payload.actualSurgeryDate = '';
  else delete payload.actualSurgeryDate;

  if (status === 'RaVien') {
    payload.dischargeDate = current.dischargeDate || today;
    const admission = toDateKey(payload.admissionDate);
    const discharge = toDateKey(payload.dischargeDate);
    if (admission && discharge && discharge < admission) {
      return { ok: false, error: 'Ngày ra viện không được trước ngày nhập viện.', field: 'dischargeDate' };
    }
  }

  if (!isEditing) {
    for (const key of OPTIONAL_TEXT_FIELDS) {
      if (payload[key] === '' || payload[key] === undefined) delete payload[key];
    }
  }

  return { ok: true, payload };
}

/** Nhãn ngắn mô tả hồ sơ phẫu thuật/thủ thuật cho bảng & xuất Excel. */
export const surgeryRecordLabel = (patient: Patient): string => {
  if (needsSurgeryClassification(patient)) return 'Cần phân loại';
  if (isRfaProcedure(patient)) return 'RFA';
  if (patient.activityType === 'Thủ thuật') return 'Thủ thuật khác';
  const code = toSurgeryClassificationCode(patient.surgeryType || patient.surgeryClassification);
  return code ? getSurgeryClassificationLabel(code) : '';
};
