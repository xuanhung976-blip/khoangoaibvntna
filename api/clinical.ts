import { createClient } from '@supabase/supabase-js';
import { createHash, randomUUID } from 'node:crypto';
import type { Patient } from '../types';
import { getVietnamMonthKey } from '../utils/dateUtils.js';
import { calculateSurgeryStats } from '../utils/surgeryStats.js';
import {
  createClinicalSessionProof,
  verifyClinicalSessionProof,
  type ClinicalSessionActor,
} from '../utils/serverSessionProof.js';

type ClinicalRequest = {
  action?: string;
  args?: any[];
  sessionToken?: string;
};

type SessionActor = ClinicalSessionActor;

const SURGERY_APPROVAL_COLUMNS = [
  'id', 'name', 'dob', 'gender', 'room', 'bed', 'admission_date', 'diagnosis', 'status',
  'surgery_date', 'surgery_method', 'surgery_order', 'surgeon',
  'assistant_surgeon_1', 'assistant_surgeon_2', 'assistant_surgeon_3',
  'anesthetist', 'anesthetist_assistant', 'scrub_nurse', 'approval_date', 'approval_note',
  'surgery_service', 'surgery_type', 'surgery_classification', 'intervention_type',
].join(',');

const SESSION_VALIDATION_CACHE_MS = 30_000;
const validatedSessionCache = new Map<string, { actor: SessionActor; expiresAt: number }>();
const sessionValidationInFlight = new Map<string, Promise<SessionActor>>();

const appendServerTiming = (res: any, name: string, durationMs: number) => {
  const value = `${name};dur=${Math.max(0, Math.round(durationMs))}`;
  const current = res.getHeader?.('Server-Timing');
  res.setHeader('Server-Timing', current ? `${current}, ${value}` : value);
};

const json = (res: any, status: number, payload: any) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('Vary', 'Authorization, X-Clinical-Session-Proof');
  if (res.__requestStartedAt) {
    appendServerTiming(res, 'total', Date.now() - res.__requestStartedAt);
  }
  return res.status(status).json(payload);
};

const patientToRow = (patient: Partial<Patient>) => {
  const fields: Array<[keyof Patient, string]> = [
    ['id', 'id'], ['name', 'name'], ['dob', 'dob'], ['gender', 'gender'],
    ['phoneNumber', 'phone_number'], ['address', 'address'], ['cccd', 'cccd'],
    ['bhytCode', 'bhyt_code'], ['room', 'room'], ['bed', 'bed'],
    ['admissionDate', 'admission_date'], ['dischargeDate', 'discharge_date'],
    ['diagnosis', 'diagnosis'], ['status', 'status'], ['treatmentType', 'treatment_type'],
    ['treatingDoctor', 'treating_doctor'], ['notes', 'notes'],
    ['surgeryDate', 'surgery_date'], ['surgeryMethod', 'surgery_method'],
    ['surgeryOrder', 'surgery_order'], ['surgeon', 'surgeon'],
    ['assistantSurgeon1', 'assistant_surgeon_1'], ['assistantSurgeon2', 'assistant_surgeon_2'],
    ['assistantSurgeon3', 'assistant_surgeon_3'], ['anesthetist', 'anesthetist'],
    ['anesthetistAssistant', 'anesthetist_assistant'], ['scrubNurse', 'scrub_nurse'],
    ['approvalDate', 'approval_date'], ['approvalNote', 'approval_note'],
    ['actualSurgeryDate', 'actual_surgery_date'],
    ['surgeryClassification', 'surgery_classification'],
    ['interventionType', 'intervention_type'], ['activityType', 'activity_type'],
    ['surgeryService', 'surgery_service'], ['surgeryType', 'surgery_type'],
  ];
  const row: Record<string, any> = {};
  for (const [property, column] of fields) {
    if (patient[property] !== undefined) row[column] = patient[property];
  }
  return row;
};

const rowToPatient = (row: any): Patient => ({
  id: row.id,
  name: row.name,
  dob: row.dob,
  gender: row.gender,
  phoneNumber: row.phone_number,
  address: row.address,
  cccd: row.cccd,
  bhytCode: row.bhyt_code,
  room: row.room,
  bed: row.bed,
  admissionDate: row.admission_date,
  dischargeDate: row.discharge_date,
  diagnosis: row.diagnosis,
  status: row.status,
  treatmentType: row.treatment_type,
  treatingDoctor: row.treating_doctor,
  notes: row.notes,
  surgeryDate: row.surgery_date,
  surgeryMethod: row.surgery_method,
  surgeryOrder: row.surgery_order,
  surgeon: row.surgeon,
  assistantSurgeon1: row.assistant_surgeon_1,
  assistantSurgeon2: row.assistant_surgeon_2,
  assistantSurgeon3: row.assistant_surgeon_3,
  anesthetist: row.anesthetist,
  anesthetistAssistant: row.anesthetist_assistant,
  scrubNurse: row.scrub_nurse,
  approvalDate: row.approval_date,
  approvalNote: row.approval_note,
  actualSurgeryDate: row.actual_surgery_date,
  surgeryClassification: row.surgery_classification,
  interventionType: row.intervention_type,
  activityType: row.activity_type,
  surgeryService: row.surgery_service,
  surgeryType: row.surgery_type,
});

const validateSession = async (sessionToken: string, req: any): Promise<SessionActor> => {
  const gasApiUrl = process.env.GAS_API_URL || process.env.GAS_WEB_APP_URL;
  if (!gasApiUrl) throw Object.assign(new Error('Missing GAS_API_URL'), { status: 500, code: 'CLINICAL_CONFIG_ERROR' });
  if (!sessionToken) throw Object.assign(new Error('AUTH_REQUIRED'), { status: 401, code: 'AUTH_REQUIRED' });

  const sessionKey = createHash('sha256').update(sessionToken).digest('hex');
  const cached = validatedSessionCache.get(sessionKey);
  if (cached && cached.expiresAt > Date.now()) return cached.actor;
  const pending = sessionValidationInFlight.get(sessionKey);
  if (pending) return pending;

  const validationPromise = (async () => {
    const response = await fetch(gasApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        funcName: 'validateSession',
        args: [],
        sessionToken,
        ip: String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim(),
        userAgent: String(req.headers?.['user-agent'] || ''),
      }),
    });
    const text = await response.text();
    let result: any;
    try {
      result = JSON.parse(text);
    } catch {
      throw Object.assign(new Error('GAS returned a non-JSON response'), { status: 502, code: 'SESSION_VALIDATION_FAILED' });
    }
    if (!response.ok || result?.success === false) {
      const code = result?.code || 'SESSION_VALIDATION_FAILED';
      const status = code === 'AUTH_REQUIRED' || code === 'SESSION_EXPIRED' ? 401 : 502;
      throw Object.assign(new Error(result?.error || 'Session validation failed'), { status, code });
    }
    const actor = (result?.data || result) as SessionActor;
    if (validatedSessionCache.size > 200) {
      for (const [key, value] of validatedSessionCache.entries()) {
        if (value.expiresAt <= Date.now()) validatedSessionCache.delete(key);
      }
    }
    validatedSessionCache.set(sessionKey, { actor, expiresAt: Date.now() + SESSION_VALIDATION_CACHE_MS });
    return actor;
  })();

  sessionValidationInFlight.set(sessionKey, validationPromise);
  try {
    return await validationPromise;
  } finally {
    if (sessionValidationInFlight.get(sessionKey) === validationPromise) {
      sessionValidationInFlight.delete(sessionKey);
    }
  }
};

// Quyền theo ma trận phân quyền (chỉ áp dụng khi Trưởng khoa bật kiểm soát quyền chi tiết).
const ACTION_PERMISSIONS: Record<string, [string, string]> = {
  'patients.list': ['clinical', 'view'],
  'patients.surgeryApprovalList': ['surgery', 'view'],
  'patients.add': ['clinical', 'add'],
  'patients.update': ['clinical', 'edit'],
  'patients.delete': ['clinical', 'delete'],
  'vip.list': ['vip', 'view'],
  'vip.add': ['vip', 'add'],
  'vip.delete': ['vip', 'delete'],
  'dashboard.get': ['clinical', 'view'],
};

const requireMatrixPermission = (actor: SessionActor, action: string, args: any[]) => {
  if (!actor.permissionsEnforced || actor.role === 'TRUONG_KHOA') return;
  let required = ACTION_PERMISSIONS[action];
  if (!required) return;
  // Duyệt mổ (chuyển sang Đã duyệt / sửa ê-kíp, thứ tự ca) tính theo quyền Phẫu thuật.
  const patch = args?.[1] || {};
  if (action === 'patients.update' && (patch.status === 'DaDuyet' || (Object.keys(patch).length === 1 && 'surgeryOrder' in patch))) {
    required = ['surgery', 'edit'];
  }
  if ((actor.denied || []).includes(`${required[0]}:${required[1]}`)) {
    throw Object.assign(new Error('PERMISSION_DENIED: Bạn không có quyền thực hiện thao tác này.'), { status: 403, code: 'PERMISSION_DENIED' });
  }
};

const requireMutationPermission = (actor: SessionActor, action: string) => {
  if (actor.mustChangePassword) {
    throw Object.assign(new Error('PASSWORD_CHANGE_REQUIRED'), { status: 403, code: 'PASSWORD_CHANGE_REQUIRED' });
  }
  if (action === 'patients.delete' && actor.role !== 'TRUONG_KHOA' && !actor.canDeletePatient) {
    throw Object.assign(new Error('PERMISSION_DENIED'), { status: 403, code: 'PERMISSION_DENIED' });
  }
};

export default async function handler(req: any, res: any) {
  res.__requestStartedAt = Date.now();
  if (req.method !== 'POST') return json(res, 405, { success: false, code: 'METHOD_NOT_ALLOWED' });

  try {
    const body: ClinicalRequest = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const action = String(body.action || '');
    const args = Array.isArray(body.args) ? body.args : [];
    const bearer = String(req.headers?.authorization || '');
    const sessionToken = body.sessionToken || (bearer.toLowerCase().startsWith('bearer ') ? bearer.slice(7).trim() : '');
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw Object.assign(new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY'), {
        status: 500,
        code: 'CLINICAL_CONFIG_ERROR',
      });
    }
    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (action === 'health') {
      const { error } = await db.from('patients').select('id').limit(1);
      if (error) throw error;
      return json(res, 200, { success: true, data: { database: 'ok' } });
    }

    const proofSecret = process.env.CLINICAL_SESSION_SECRET || serviceRoleKey;
    const proofHeader = Array.isArray(req.headers?.['x-clinical-session-proof'])
      ? req.headers['x-clinical-session-proof'][0]
      : String(req.headers?.['x-clinical-session-proof'] || '');
    const authStartedAt = Date.now();
    let actor = verifyClinicalSessionProof(proofHeader, sessionToken, proofSecret);
    const usedProof = Boolean(actor);
    if (!actor) {
      actor = await validateSession(sessionToken, req);
      const refreshedProof = createClinicalSessionProof(sessionToken, actor, proofSecret);
      if (refreshedProof) res.setHeader('X-Clinical-Session-Proof', refreshedProof);
    }
    appendServerTiming(res, usedProof ? 'auth_proof' : 'auth_gas', Date.now() - authStartedAt);
    requireMutationPermission(actor, action);
    requireMatrixPermission(actor, action, args);

    if (action === 'patients.surgeryApprovalList') {
      const { data, error } = await db
        .from('patients')
        .select(SURGERY_APPROVAL_COLUMNS)
        .in('status', ['ChoMo', 'DaDuyet'])
        .order('surgery_date', { ascending: true, nullsFirst: false });
      if (error) throw error;
      return json(res, 200, { success: true, data: (data || []).map(rowToPatient) });
    }
    if (action === 'patients.list') {
      // Dùng * để tương thích các project chưa chạy đủ schema patch tùy chọn.
      const { data, error } = await db.from('patients').select('*').order('admission_date', { ascending: false });
      if (error) throw error;
      return json(res, 200, { success: true, data: (data || []).map(rowToPatient) });
    }
    if (action === 'patients.add') {
      const row = patientToRow(args[0] || {});
      if (!row.id) row.id = `BN_${Date.now()}`;
      const { data, error } = await db.from('patients').insert([row]).select().single();
      if (error) throw error;
      return json(res, 200, { success: true, data: rowToPatient(data) });
    }
    if (action === 'patients.update') {
      const id = String(args[0] || '').trim();
      if (!id) return json(res, 400, { success: false, code: 'PATIENT_ID_REQUIRED' });
      const row = patientToRow(args[1] || {});
      delete row.id;
      row.updated_at = new Date().toISOString();
      const { data, error } = await db.from('patients').update(row).eq('id', id).select().single();
      if (error) throw error;
      return json(res, 200, { success: true, data: rowToPatient(data) });
    }
    if (action === 'patients.delete') {
      const id = String(args[0] || '').trim();
      if (!id) return json(res, 400, { success: false, code: 'PATIENT_ID_REQUIRED' });
      const { error } = await db.from('patients').delete().eq('id', id);
      if (error) throw error;
      return json(res, 200, { success: true, data: { success: true } });
    }
    if (action === 'vip.list') {
      const { data, error } = await db
        .from('vip_patients')
        .select('id, patient_id, priority, reason, created_at, patients(id, name, room, bed, diagnosis)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      const rows = (data || []).map((row: any) => ({
        id: row.id,
        patientId: row.patient_id,
        priority: row.priority,
        reason: row.reason,
        createdAt: row.created_at,
        name: row.patients?.name || '',
        room: row.patients?.room || '',
        bed: row.patients?.bed || '',
        diagnosis: row.patients?.diagnosis || '',
      }));
      return json(res, 200, { success: true, data: rows });
    }
    if (action === 'vip.add') {
      const patientId = String(args[0] || '').trim();
      const priority = String(args[1] || '').trim();
      const reason = String(args[2] || '').trim();
      if (!patientId) return json(res, 400, { success: false, code: 'PATIENT_ID_REQUIRED', error: 'Vui lòng chọn bệnh nhân' });
      if (!reason) return json(res, 400, { success: false, code: 'VIP_REASON_REQUIRED', error: 'Vui lòng nhập lý do lưu ý' });

      const id = `VIP_${Date.now()}_${randomUUID().slice(0, 8)}`;
      const { data, error } = await db
        .from('vip_patients')
        .insert([{ id, patient_id: patientId, priority: priority || 'Cao', reason }])
        .select()
        .single();
      if (error) throw error;
      return json(res, 200, { success: true, data });
    }
    if (action === 'vip.delete') {
      const { error } = await db.from('vip_patients').delete().eq('id', args[0]);
      if (error) throw error;
      return json(res, 200, { success: true, data: { success: true } });
    }
    if (action === 'dashboard.get') {
      const [patientsResult, vipResult] = await Promise.all([
        db.from('patients').select('*'),
        db.from('vip_patients').select('id'),
      ]);
      if (patientsResult.error) throw patientsResult.error;
      if (vipResult.error) throw vipResult.error;
      const patients = (patientsResult.data || []).map(rowToPatient);
      const stats = calculateSurgeryStats(patients, getVietnamMonthKey());
      return json(res, 200, {
        success: true,
        data: {
          clinical: {
            total: patients.filter(patient => patient.status !== 'RaVien').length,
            waitingSurgery: patients.filter(patient => patient.status === 'ChoMo').length,
            vip: vipResult.data?.length || 0,
            discharged: patients.filter(patient => patient.status === 'RaVien').length,
          },
          surgery: {
            monthTotal: stats.totalSurgeries,
            approved: patients.filter(patient => patient.status === 'DaDuyet').length,
          },
          science: { ongoing: 0, meetingsMonth: 0 },
          admin: { briefingToday: null, overdueTasks: 0 },
          inventory: { medsNearExpiry: 0, equipOverdue: 0 },
          onCall: { doctor: '---', nurse1: '---', nurse2: '---' },
          deadlines: [],
        },
      });
    }

    return json(res, 400, { success: false, code: 'UNKNOWN_CLINICAL_ACTION' });
  } catch (error: any) {
    console.error('[CLINICAL API]', error?.code || error?.message || String(error));
    return json(res, error?.status || 500, {
      success: false,
      code: error?.code || 'CLINICAL_API_ERROR',
      error: error?.message || 'Clinical API failed',
    });
  }
}
