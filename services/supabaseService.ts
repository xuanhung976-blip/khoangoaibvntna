/**
 * supabaseService.ts
 * Direct Supabase queries replacing Google Apps Script calls.
 * All functions mirror the exact signatures of dataService.ts for drop-in compatibility.
 *
 * Key design decisions:
 * - Each table has an explicit mapper (patientToRow / rowToPatient) to guarantee
 *   exact column name matching. This avoids bugs from generic camelCase→snake_case
 *   conversion (e.g. assistantSurgeon1 → assistant_surgeon1 vs assistant_surgeon_1).
 * - Unknown/extra fields from the UI object are stripped before sending to Supabase
 *   to prevent "column does not exist" errors.
 */
import { supabase } from './supabaseClient';
import type {
  Patient,
  VipPatient,
  ScientificMeeting,
  DailyBriefing,
  NewTechnique,
  CommunicationContent,
  Zone5S,
  Evaluation5S,
  Improvement5S,
  DailyOnCall,
  User,
  SystemConfig,
  RolePermission,
  StaffEvaluation,
} from '../types';

// ─── DB helper ──────────────────────────────────────────────────────────────
const db = () => supabase!;

const isMissingTableError = (error: any) =>
  Boolean(error && (error.code === 'PGRST205' || String(error.message || '').includes('Could not find the table')));

const check = (error: any, context: string) => {
  if (error) {
    if (isMissingTableError(error)) {
      console.warn(`[Supabase] ${context}: Table not found in DB schema cache.`);
      return;
    }
    throw new Error(`[Supabase] ${context}: ${error.message}`);
  }
};

// ─── Generic snake_case ↔ camelCase helpers (used for simple tables) ─────────
const snakeToCamel = (str: string) =>
  str.replace(/_([a-z0-9])/g, (_, c) => (isNaN(Number(c)) ? c.toUpperCase() : c));

const camelToSnake = (str: string) =>
  str.replace(/[A-Z]/g, c => '_' + c.toLowerCase());

const normRow = (row: any): any => {
  if (!row) return row;
  const out: any = {};
  for (const k of Object.keys(row)) {
    out[snakeToCamel(k)] = row[k];
  }
  return out;
};
const normRows = (rows: any[]): any[] => rows.map(normRow);

/** Generic snake_case writer — strips undefined values */
const toSnakeRow = (obj: any): any => {
  const out: any = {};
  for (const k of Object.keys(obj)) {
    if (obj[k] !== undefined) out[camelToSnake(k)] = obj[k];
  }
  return out;
};

// =========================================================
// RUNTIME COLUMN AVAILABILITY CACHE
// Some columns may not exist yet (schema migration pending).
// We probe once, cache the result, and skip missing columns.
// =========================================================

/** Columns confirmed to exist in the patients table */
let _patientColumnsChecked = false;
const _availablePatientCols = new Set<string>([
  // Core columns — always present (from original schema)
  'id', 'name', 'dob', 'gender', 'phone_number', 'address',
  'room', 'bed', 'admission_date', 'discharge_date', 'diagnosis',
  'status', 'treatment_type', 'treating_doctor', 'notes',
  'surgery_date', 'surgery_method', 'surgery_order',
  'surgeon', 'assistant_surgeon_1', 'assistant_surgeon_2', 'assistant_surgeon_3',
  'anesthetist', 'anesthetist_assistant', 'scrub_nurse',
  'approval_date', 'approval_note',
  'created_at', 'updated_at',
]);

/** Probe optional columns at runtime (once per session) using a single select('*') to prevent 400 Bad Request network errors */
async function ensurePatientColumns(): Promise<void> {
  if (_patientColumnsChecked) return;
  _patientColumnsChecked = true;
  try {
    const { data } = await db().from('patients').select('*').limit(1);
    if (data && data.length > 0 && data[0]) {
      const keys = Object.keys(data[0]);
      [
        'actual_surgery_date',
        'surgery_classification',
        'intervention_type',
        'activity_type',
      ].forEach(col => {
        if (keys.includes(col)) _availablePatientCols.add(col);
      });
    }
  } catch {
    /* fallback to safe defaults */
  }
}

/** Conditionally add a field only if the column exists in DB */
const addIf = (row: Record<string, any>, col: string, value: any) => {
  if (value !== undefined && _availablePatientCols.has(col)) row[col] = value;
};

// =========================================================
// PATIENTS — explicit mapper to avoid column name mismatches
// =========================================================

/** Map UI Patient object → exact Supabase column names */
const patientToRow = (p: Partial<Patient>): Record<string, any> => {
  const row: Record<string, any> = {};
  // Core columns — always safe
  if (p.id              !== undefined) row.id                    = p.id;
  if (p.name            !== undefined) row.name                  = p.name;
  if (p.dob             !== undefined) row.dob                   = p.dob;
  if (p.gender          !== undefined) row.gender                = p.gender;
  if (p.phoneNumber     !== undefined) row.phone_number          = p.phoneNumber;
  if (p.address         !== undefined) row.address               = p.address;
  if (p.room            !== undefined) row.room                  = p.room;
  if (p.bed             !== undefined) row.bed                   = p.bed;
  if (p.admissionDate   !== undefined) row.admission_date        = p.admissionDate;
  if (p.dischargeDate   !== undefined) row.discharge_date        = p.dischargeDate;
  if (p.diagnosis       !== undefined) row.diagnosis             = p.diagnosis;
  if (p.status          !== undefined) row.status                = p.status;
  if (p.treatmentType   !== undefined) row.treatment_type        = p.treatmentType;
  if (p.treatingDoctor  !== undefined) row.treating_doctor       = p.treatingDoctor;
  if (p.notes           !== undefined) row.notes                 = p.notes;
  if (p.surgeryDate     !== undefined) row.surgery_date          = p.surgeryDate;
  if (p.surgeryMethod   !== undefined) row.surgery_method        = p.surgeryMethod;
  if (p.surgeryOrder    !== undefined) row.surgery_order         = p.surgeryOrder;
  if (p.surgeon         !== undefined) row.surgeon               = p.surgeon;
  if (p.assistantSurgeon1      !== undefined) row.assistant_surgeon_1      = p.assistantSurgeon1;
  if (p.assistantSurgeon2      !== undefined) row.assistant_surgeon_2      = p.assistantSurgeon2;
  if (p.assistantSurgeon3      !== undefined) row.assistant_surgeon_3      = p.assistantSurgeon3;
  if (p.anesthetist            !== undefined) row.anesthetist               = p.anesthetist;
  if (p.anesthetistAssistant   !== undefined) row.anesthetist_assistant     = p.anesthetistAssistant;
  if (p.scrubNurse             !== undefined) row.scrub_nurse               = p.scrubNurse;
  if (p.approvalDate           !== undefined) row.approval_date             = p.approvalDate;
  if (p.approvalNote           !== undefined) row.approval_note             = p.approvalNote;
  // Optional columns — only included if column exists in DB
  addIf(row, 'actual_surgery_date',   p.actualSurgeryDate);
  addIf(row, 'surgery_classification', p.surgeryClassification);
  addIf(row, 'intervention_type',     p.interventionType);
  addIf(row, 'activity_type',         p.activityType);
  return row;
};

/** Map Supabase DB row → UI Patient object.
 *  Auto-classification is done at the DISPLAY/STATS layer only (SurgeryStats.tsx).
 *  rowToPatient must map DB values faithfully to avoid corrupting writes. */
const rowToPatient = (row: any): Patient => ({
  id:                     row.id,
  name:                   row.name,
  dob:                    row.dob,
  gender:                 row.gender,
  phoneNumber:            row.phone_number,
  address:                row.address,
  room:                   row.room,
  bed:                    row.bed,
  admissionDate:          row.admission_date,
  dischargeDate:          row.discharge_date,
  diagnosis:              row.diagnosis,
  status:                 row.status,
  treatmentType:          row.treatment_type,
  treatingDoctor:         row.treating_doctor,
  notes:                  row.notes,
  surgeryDate:            row.surgery_date,
  surgeryMethod:          row.surgery_method,
  surgeryOrder:           row.surgery_order,
  surgeon:                row.surgeon,
  assistantSurgeon1:      row.assistant_surgeon_1,
  assistantSurgeon2:      row.assistant_surgeon_2,
  assistantSurgeon3:      row.assistant_surgeon_3,
  anesthetist:            row.anesthetist,
  anesthetistAssistant:   row.anesthetist_assistant,
  scrubNurse:             row.scrub_nurse,
  approvalDate:           row.approval_date,
  approvalNote:           row.approval_note,
  actualSurgeryDate:      row.actual_surgery_date,
  surgeryClassification:  row.surgery_classification,
  interventionType:       row.intervention_type,
  activityType:           row.activity_type,
});

// =========================================================
// 1. PATIENTS
// =========================================================
export const getPatients = async (): Promise<Patient[]> => {
  await ensurePatientColumns();
  const { data, error } = await db()
    .from('patients')
    .select('*')
    .order('admission_date', { ascending: false });
  check(error, 'getPatients');
  return (data || []).map(rowToPatient);
};

export const addPatient = async (p: Patient): Promise<Patient> => {
  await ensurePatientColumns();
  const row = patientToRow(p);
  // Generate ID if missing
  if (!row.id) row.id = `BN_${Date.now()}`;
  const { data, error } = await db().from('patients').insert([row]).select().single();
  check(error, 'addPatient');
  return rowToPatient(data);
};

export const updatePatient = async (id: string, p: Partial<Patient>): Promise<Patient> => {
  await ensurePatientColumns();
  // Strip id from the update payload — we use it in .eq() only
  const { id: _id, ...rest } = p as any;
  const row = patientToRow(rest);
  row.updated_at = new Date().toISOString();

  const { data, error } = await db()
    .from('patients')
    .update(row)
    .eq('id', id)
    .select()
    .single();
  check(error, 'updatePatient');
  return rowToPatient(data);
};

export const deletePatient = async (id: string) => {
  const { error } = await db().from('patients').delete().eq('id', id);
  check(error, 'deletePatient');
  return { success: true };
};

// =========================================================
// 2. VIP PATIENTS
// =========================================================
export const getVipPatients = async (): Promise<VipPatient[]> => {
  const { data, error } = await db()
    .from('vip_patients')
    .select(`id, patient_id, priority, reason, created_at, patients(id, name, room, bed)`)
    .order('created_at', { ascending: false });
  check(error, 'getVipPatients');
  return (data || []).map((row: any) => ({
    id:        row.id,
    patientId: row.patient_id,
    name:      row.patients?.name  || '',
    room:      row.patients?.room  || '',
    bed:       row.patients?.bed   || '',
    priority:  row.priority,
    reason:    row.reason,
  }));
};

export const addVipPatient = async (patientId: string, priority: string, reason: string) => {
  const id = `VIP_${Date.now()}`;
  const { data, error } = await db()
    .from('vip_patients')
    .insert([{ id, patient_id: patientId, priority, reason, created_at: new Date().toISOString() }])
    .select()
    .single();
  check(error, 'addVipPatient');
  return normRow(data);
};

export const removeVipPatient = async (id: string) => {
  const { error } = await db().from('vip_patients').delete().eq('id', id);
  check(error, 'removeVipPatient');
  return { success: true };
};

// =========================================================
// 3. USERS — explicit mapper
// =========================================================
const rowToUser = (row: any): User => ({
  username:           row.username,
  fullName:           row.full_name,
  role:               row.role,
  chucVu:             row.chuc_vu,
  nhomChuyenMon:      row.nhom_chuyen_mon,
  active:             row.active,
  mustChangePassword: row.must_change_password,
  // password_hash intentionally NOT mapped to UI
} as any);

const userToRow = (u: Partial<User> & { password?: string }): Record<string, any> => {
  const row: Record<string, any> = {};
  if (u.username           !== undefined) row.username             = u.username;
  if ((u as any).password  !== undefined) row.password_hash        = (u as any).password;
  if (u.fullName           !== undefined) row.full_name            = u.fullName;
  if (u.role               !== undefined) row.role                 = u.role;
  if (u.chucVu             !== undefined) row.chuc_vu              = u.chucVu;
  if (u.nhomChuyenMon      !== undefined) row.nhom_chuyen_mon      = u.nhomChuyenMon;
  if (u.active             !== undefined) row.active               = u.active;
  if (u.mustChangePassword !== undefined) row.must_change_password = u.mustChangePassword;
  return row;
};

export const getUsers = async (): Promise<User[]> => {
  const { data, error } = await db().from('users').select('*').order('full_name');
  check(error, 'getUsers');
  return (data || []).map(rowToUser);
};

export const saveUser = async (u: User) => {
  const row = userToRow(u);
  if (!row.username) throw new Error('username is required');
  const { data, error } = await db().from('users').insert([row]).select().single();
  check(error, 'saveUser');
  return rowToUser(data);
};

export const updateUser = async (username: string, u: Partial<User> & { password?: string }) => {
  const row = userToRow(u);
  row.updated_at = new Date().toISOString();
  const { data, error } = await db().from('users').update(row).eq('username', username).select().single();
  check(error, 'updateUser');
  return rowToUser(data);
};

export const deleteUser = async (username: string) => {
  const { error } = await db().from('users').delete().eq('username', username);
  check(error, 'deleteUser');
  return { success: true };
};

export const toggleLockUser = (username: string, active: boolean) =>
  updateUser(username, { active } as any);

export const resetUserPassword = (username: string) =>
  updateUser(username, { password: '123456' } as any);

// =========================================================
// 4. DAILY ON CALL — explicit mapper
// =========================================================
// DailyOnCall interface: { id, date, doctor, nurse1, nurse2, note }
// DB columns:            { id, date, main_doctor, assistant_doctor, nurses, notes, shift_type, leader, head_nurse }
// GAS sheet fields:      { id, date, doctor, nurse1, nurse2, note }
const rowToShift = (row: any): DailyOnCall => ({
  id:     row.id,
  date:   row.date,
  // Map DB → interface
  doctor: row.main_doctor      || row.doctor || '',
  nurse1: row.assistant_doctor || row.nurse1 || row.nurses || '',
  nurse2: row.nurses           || row.nurse2 || '',
  note:   row.notes            || row.note   || '',
  // Keep extra DB fields for display
  ...(row.shift_type ? { shiftType: row.shift_type } : {}),
  ...(row.leader     ? { leader: row.leader }         : {}),
  ...(row.head_nurse ? { headNurse: row.head_nurse }  : {}),
} as any);

const shiftToRow = (d: Partial<DailyOnCall>): Record<string, any> => {
  const row: Record<string, any> = {};
  if (d.id   !== undefined) row.id   = d.id;
  if (d.date !== undefined) row.date = d.date;
  // Map interface → DB columns
  if ((d as any).doctor  !== undefined) row.main_doctor      = (d as any).doctor;
  if ((d as any).nurse1  !== undefined) row.assistant_doctor = (d as any).nurse1;
  if ((d as any).nurse2  !== undefined) row.nurses           = (d as any).nurse2;
  if ((d as any).note    !== undefined) row.notes            = (d as any).note;
  // Pass-through extended fields
  if ((d as any).shiftType    !== undefined) row.shift_type  = (d as any).shiftType;
  if ((d as any).leader       !== undefined) row.leader      = (d as any).leader;
  if ((d as any).mainDoctor   !== undefined) row.main_doctor = (d as any).mainDoctor;
  if ((d as any).assistantDoctor !== undefined) row.assistant_doctor = (d as any).assistantDoctor;
  if ((d as any).headNurse    !== undefined) row.head_nurse  = (d as any).headNurse;
  if ((d as any).nurses       !== undefined) row.nurses      = (d as any).nurses;
  if ((d as any).notes        !== undefined) row.notes       = (d as any).notes;
  return row;
};

export const getDailyOnCall = async (): Promise<DailyOnCall[]> => {
  const { data, error } = await db().from('daily_on_call').select('*').order('date', { ascending: false });
  check(error, 'getDailyOnCall');
  return (data || []).map(rowToShift);
};

export const saveDailyOnCall = async (d: DailyOnCall) => {
  if (d.id) {
    const { data, error } = await db().from('daily_on_call').update(shiftToRow(d)).eq('id', d.id).select().single();
    check(error, 'saveDailyOnCall(update)');
    return rowToShift(data);
  }
  const row = shiftToRow(d);
  if (!row.id) row.id = `SHIFT_${Date.now()}`;
  const { data, error } = await db().from('daily_on_call').insert([row]).select().single();
  check(error, 'saveDailyOnCall(insert)');
  return rowToShift(data);
};

export const deleteDailyOnCall = async (id: string) => {
  const { error } = await db().from('daily_on_call').delete().eq('id', id);
  check(error, 'deleteDailyOnCall');
  return { success: true };
};

export const batchSaveDailyOnCall = async (shifts: Partial<DailyOnCall>[]) => {
  const rows = shifts.map(shiftToRow).filter(r => r.id);
  const { error } = await db().from('daily_on_call').upsert(rows, { onConflict: 'id' });
  check(error, 'batchSaveDailyOnCall');
  return { success: true };
};

// =========================================================
// 5. BRIEFINGS
// =========================================================
const parseBriefingTasks = (row: any) => {
  // Try tasks_json (DB jsonb column) first, then congViecJson (GAS field name)
  const raw = row.tasks_json ?? row.congViecJson ?? row.cong_viec_json ?? row.tasks;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'string' && raw.trim()) {
    try { return JSON.parse(raw); } catch { return []; }
  }
  return [];
};

const rowToBriefing = (row: any): DailyBriefing => ({
  id:      row.id,
  date:    row.date,
  // Map DB columns → interface fields
  // DB has: presider, secretary, attendees, on_call_report, notes, tasks_json
  // Interface has: host, content, tasks
  host:    row.presider    || row.host    || '',  // presider → host
  content: row.notes       || row.content || '',  // notes → content
  tasks:   parseBriefingTasks(row),
  // Keep extra DB fields accessible (cast as any to avoid TS errors)
  ...(row.secretary    ? { secretary:    row.secretary }    : {}),
  ...(row.attendees    ? { attendees:    row.attendees }    : {}),
  ...(row.on_call_report ? { onCallReport: row.on_call_report } : {}),
} as any);

const briefingToRow = (b: Partial<DailyBriefing>): Record<string, any> => {
  const row: Record<string, any> = {};
  if (b.id   !== undefined) row.id   = b.id;
  if (b.date !== undefined) row.date = b.date;
  // Map interface fields → DB columns
  if ((b as any).host    !== undefined) row.presider = (b as any).host;    // host → presider
  if ((b as any).content !== undefined) row.notes    = (b as any).content; // content → notes
  // Pass-through if caller already uses DB column names
  if ((b as any).presider     !== undefined) row.presider      = (b as any).presider;
  if ((b as any).secretary    !== undefined) row.secretary     = (b as any).secretary;
  if ((b as any).attendees    !== undefined) row.attendees     = (b as any).attendees;
  if ((b as any).onCallReport !== undefined) row.on_call_report = (b as any).onCallReport;
  if ((b as any).notes        !== undefined) row.notes         = (b as any).notes;
  // Serialize tasks as JSONB (Supabase accepts arrays directly for jsonb columns)
  if (b.tasks !== undefined) row.tasks_json = Array.isArray(b.tasks) ? b.tasks : [];
  return row;
};

export const getBriefings = async (): Promise<DailyBriefing[]> => {
  const { data, error } = await db().from('daily_briefing').select('*').order('date', { ascending: false });
  check(error, 'getBriefings');
  return (data || []).map(rowToBriefing);
};

export const addBriefing = async (b: DailyBriefing) => {
  const row = briefingToRow(b);
  if (!row.id) row.id = `GB_${Date.now()}`;
  const { data, error } = await db().from('daily_briefing').insert([row]).select().single();
  check(error, 'addBriefing');
  return rowToBriefing(data);
};

export const updateBriefing = async (id: string, b: Partial<DailyBriefing>) => {
  const row = briefingToRow(b);
  const { data, error } = await db().from('daily_briefing').update(row).eq('id', id).select().single();
  check(error, 'updateBriefing');
  return rowToBriefing(data);
};

// =========================================================
// 6. SCIENTIFIC MEETINGS
// =========================================================
export const getScientificMeetings = async (): Promise<ScientificMeeting[]> => {
  const { data, error } = await db().from('scientific_meetings').select('*').order('date', { ascending: false });
  check(error, 'getScientificMeetings');
  return normRows(data || []) as ScientificMeeting[];
};

export const addScientificMeeting = async (s: ScientificMeeting) => {
  const row = toSnakeRow(s);
  if (!row.id) row.id = `KH_${Date.now()}`;
  const { data, error } = await db().from('scientific_meetings').insert([row]).select().single();
  check(error, 'addScientificMeeting');
  return normRow(data);
};

export const updateScientificMeeting = async (id: string, s: Partial<ScientificMeeting>) => {
  const { data, error } = await db().from('scientific_meetings').update(toSnakeRow(s)).eq('id', id).select().single();
  check(error, 'updateScientificMeeting');
  return normRow(data);
};

export const deleteScientificMeeting = async (id: string) => {
  const { error } = await db().from('scientific_meetings').delete().eq('id', id);
  check(error, 'deleteScientificMeeting');
  return { success: true };
};

// =========================================================
// 7. NEW TECHNIQUES
// =========================================================
export const getTechniques = async (): Promise<NewTechnique[]> => {
  const { data, error } = await db().from('new_techniques').select('*').order('created_at', { ascending: false });
  check(error, 'getTechniques');
  return normRows(data || []) as NewTechnique[];
};

export const addTechnique = async (t: NewTechnique) => {
  const row = toSnakeRow(t);
  if (!row.id) row.id = `KT_${Date.now()}`;
  const { data, error } = await db().from('new_techniques').insert([row]).select().single();
  check(error, 'addTechnique');
  return normRow(data);
};

export const updateTechnique = async (id: string, t: Partial<NewTechnique>) => {
  const { data, error } = await db().from('new_techniques').update(toSnakeRow(t)).eq('id', id).select().single();
  check(error, 'updateTechnique');
  return normRow(data);
};

export const deleteTechnique = async (id: string) => {
  const { error } = await db().from('new_techniques').delete().eq('id', id);
  check(error, 'deleteTechnique');
  return { success: true };
};

// =========================================================
// 8. COMMUNICATION
// =========================================================
export const getCommunication = async (): Promise<CommunicationContent[]> => {
  const { data, error } = await db().from('communication_contents').select('*').order('date', { ascending: false });
  check(error, 'getCommunication');
  return normRows(data || []) as CommunicationContent[];
};

export const addCommunication = async (c: CommunicationContent) => {
  const row = toSnakeRow(c);
  if (!row.id) row.id = `TT_${Date.now()}`;
  const { data, error } = await db().from('communication_contents').insert([row]).select().single();
  check(error, 'addCommunication');
  return normRow(data);
};

export const updateCommunication = async (id: string, c: Partial<CommunicationContent>) => {
  const { data, error } = await db().from('communication_contents').update(toSnakeRow(c)).eq('id', id).select().single();
  check(error, 'updateCommunication');
  return normRow(data);
};

export const deleteCommunication = async (id: string) => {
  const { error } = await db().from('communication_contents').delete().eq('id', id);
  check(error, 'deleteCommunication');
  return { success: true };
};

// =========================================================
// 9. 5S
// =========================================================
export const getZones = async (): Promise<Zone5S[]> => {
  const { data, error } = await db().from('five_s_zones').select('*').order('name');
  check(error, 'getZones');
  return normRows(data || []) as Zone5S[];
};

export const addZone = async (z: Zone5S) => {
  const row = toSnakeRow(z);
  if (!row.id) row.id = `5S_${Date.now()}`;
  const { data, error } = await db().from('five_s_zones').insert([row]).select().single();
  check(error, 'addZone');
  return normRow(data);
};

export const updateZone = async (id: string, z: Partial<Zone5S>) => {
  const { data, error } = await db().from('five_s_zones').update(toSnakeRow(z)).eq('id', id).select().single();
  check(error, 'updateZone');
  return normRow(data);
};

export const deleteZone = async (id: string) => {
  const { error } = await db().from('five_s_zones').delete().eq('id', id);
  check(error, 'deleteZone');
  return { success: true };
};

export const getEvaluations = async (): Promise<Evaluation5S[]> => {
  const { data, error } = await db().from('five_s_evaluations').select('*').order('date', { ascending: false });
  check(error, 'getEvaluations');
  return normRows(data || []) as Evaluation5S[];
};

export const addEvaluation = async (e: Evaluation5S) => {
  const row = toSnakeRow(e);
  if (!row.id) row.id = `DG_${Date.now()}`;
  const { data, error } = await db().from('five_s_evaluations').insert([row]).select().single();
  check(error, 'addEvaluation');
  return normRow(data);
};

export const getImprovements = async (): Promise<Improvement5S[]> => {
  const { data, error } = await db().from('five_s_improvements').select('*').order('created_at', { ascending: false });
  check(error, 'getImprovements');
  return normRows(data || []) as Improvement5S[];
};

export const addImprovement = async (i: Improvement5S) => {
  const row = toSnakeRow(i);
  if (!row.id) row.id = `CT_${Date.now()}`;
  const { data, error } = await db().from('five_s_improvements').insert([row]).select().single();
  check(error, 'addImprovement');
  return normRow(data);
};

export const updateImprovement = async (id: string, i: Partial<Improvement5S>) => {
  const { data, error } = await db().from('five_s_improvements').update(toSnakeRow(i)).eq('id', id).select().single();
  check(error, 'updateImprovement');
  return normRow(data);
};

export const deleteImprovement = async (id: string) => {
  const { error } = await db().from('five_s_improvements').delete().eq('id', id);
  check(error, 'deleteImprovement');
  return { success: true };
};

// =========================================================
// 10. SYSTEM CONFIGS
// =========================================================
export const getConfigs = async (): Promise<SystemConfig[]> => {
  const { data, error } = await db().from('system_configs').select('*');
  check(error, 'getConfigs');
  return normRows(data || []) as SystemConfig[];
};

export const saveConfig = async (c: SystemConfig) => {
  const { data, error } = await db()
    .from('system_configs')
    .upsert([{ key: c.key, value: c.value, description: c.description }], { onConflict: 'key' })
    .select()
    .single();
  check(error, 'saveConfig');
  return normRow(data);
};

export const deleteConfig = async (key: string) => {
  const { error } = await db().from('system_configs').delete().eq('key', key);
  check(error, 'deleteConfig');
  return { success: true };
};

// =========================================================
// 11. PERMISSIONS
// =========================================================
export const getPermissions = async (): Promise<RolePermission[]> => {
  const { data, error } = await db().from('role_permissions').select('*');
  check(error, 'getPermissions');
  return (data || []).map((row: any) => ({
    id:        row.id,
    role:      row.role,
    module:    row.module,
    canRead:   row.can_read,
    canWrite:  row.can_write,
    canDelete: row.can_delete,
  })) as RolePermission[];
};

export const saveRolePermissions = async (perms: RolePermission[]) => {
  const rows = perms.map((p: any) => ({
    id:         p.id || `PERM_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    role:       p.role,
    module:     p.module,
    can_read:   p.canRead,
    can_write:  p.canWrite,
    can_delete: p.canDelete,
  }));
  const { error } = await db().from('role_permissions').upsert(rows, { onConflict: 'id' });
  check(error, 'saveRolePermissions');
  return { success: true };
};

// =========================================================
// 12. STAFF TASKS & EVALUATIONS
// =========================================================
import type { StaffTask } from '../types';

// =========================================================
// STAFF TASKS & EVALUATIONS — Safe Runtime Column Probe
// =========================================================

let _staffTaskColumnsChecked = false;
const _availableStaffTaskCols = new Set<string>([
  'id', 'username', 'title', 'description', 'due_date', 'status', 'created_at'
]);

async function ensureStaffTaskColumns(): Promise<void> {
  if (_staffTaskColumnsChecked) return;
  _staffTaskColumnsChecked = true;
  try {
    const { data } = await db().from('staff_tasks').select('*').limit(1);
    if (data && data.length > 0 && data[0]) {
      Object.keys(data[0]).forEach(col => _availableStaffTaskCols.add(col));
    }
  } catch {
    /* fallback to safe defaults */
  }
}

const rowToStaffTask = (row: any): StaffTask => ({
  id: String(row.id || ''),
  userId: String(row.user_id || row.userId || row.username || row.assigneeUsername || ''),
  tieuDe: String(row.tieu_de || row.tieuDe || row.title || ''),
  noiDung: String(row.noi_dung || row.noiDung || row.description || ''),
  nguoiGiao: String(row.nguoi_giao || row.nguoiGiao || ''),
  ngayGiao: String(row.ngay_giao || row.ngayGiao || ''),
  hanHoanThanh: String(row.han_hoan_thanh || row.hanHoanThanh || row.due_date || row.dueDate || ''),
  mucDoUuTien: row.muc_do_uu_tien || row.mucDoUuTien || 'Trung bình',
  trangThai: row.trang_thai || row.trangThai || row.status || 'Chưa làm',
  tienDo: row.tien_do ?? row.tienDo ?? 0,
  ketQua: String(row.ket_qua || row.ketQua || ''),
  ghiChu: String(row.ghi_chu || row.ghiChu || ''),
  sourceType: String(row.source_type || row.sourceType || ''),
  sourceId: String(row.source_id || row.sourceId || ''),
  sourceTaskId: String(row.source_task_id || row.sourceTaskId || ''),
  sourceTaskIndex: row.source_task_index ?? row.sourceTaskIndex ?? '',
  assigneeUsername: String(row.assignee_username || row.assigneeUsername || row.username || row.user_id || row.userId || ''),
  assigneeName: String(row.assignee_name || row.assigneeName || ''),
  sourceDate: String(row.source_date || row.sourceDate || ''),
  sourceLabel: String(row.source_label || row.sourceLabel || ''),
  syncStatus: String(row.sync_status || row.syncStatus || ''),
  syncedAt: String(row.synced_at || row.syncedAt || ''),
});

const staffTaskToRow = (t: Partial<StaffTask>): Record<string, any> => {
  const row: Record<string, any> = {};
  if (t.id !== undefined) row.id = t.id;

  const usernameVal = t.userId || t.assigneeUsername || (t as any).username || '';
  const titleVal = t.tieuDe || (t as any).title || '';
  const descVal = t.noiDung || (t as any).description || '';
  const dueDateVal = t.hanHoanThanh || (t as any).dueDate || (t as any).due_date || '';
  const statusVal = t.trangThai || (t as any).status || 'Chưa làm';

  // Always write standard columns if present in DB
  if (_availableStaffTaskCols.has('username')) row.username = usernameVal;
  if (_availableStaffTaskCols.has('title')) row.title = titleVal;
  if (_availableStaffTaskCols.has('description')) row.description = descVal;
  if (_availableStaffTaskCols.has('due_date')) row.due_date = dueDateVal;
  if (_availableStaffTaskCols.has('status')) row.status = statusVal;

  // Conditionally write extended columns if present in DB schema
  if (_availableStaffTaskCols.has('user_id')) row.user_id = usernameVal;
  if (_availableStaffTaskCols.has('tieu_de')) row.tieu_de = titleVal;
  if (_availableStaffTaskCols.has('noi_dung')) row.noi_dung = descVal;
  if (_availableStaffTaskCols.has('nguoi_giao') && t.nguoiGiao !== undefined) row.nguoi_giao = t.nguoiGiao;
  if (_availableStaffTaskCols.has('ngay_giao') && t.ngayGiao !== undefined) row.ngay_giao = t.ngayGiao;
  if (_availableStaffTaskCols.has('han_hoan_thanh')) row.han_hoan_thanh = dueDateVal;
  if (_availableStaffTaskCols.has('muc_do_uu_tien') && t.mucDoUuTien !== undefined) row.muc_do_uu_tien = t.mucDoUuTien;
  if (_availableStaffTaskCols.has('trang_thai')) row.trang_thai = statusVal;
  if (_availableStaffTaskCols.has('tien_do') && t.tienDo !== undefined) row.tien_do = t.tienDo;
  if (_availableStaffTaskCols.has('ket_qua') && t.ketQua !== undefined) row.ket_qua = t.ketQua;
  if (_availableStaffTaskCols.has('ghi_chu') && t.ghiChu !== undefined) row.ghi_chu = t.ghiChu;
  if (_availableStaffTaskCols.has('assignee_username')) row.assignee_username = usernameVal;
  if (_availableStaffTaskCols.has('assignee_name') && t.assigneeName !== undefined) row.assignee_name = t.assigneeName;

  return row;
};

export const getStaffTasks = async (): Promise<StaffTask[]> => {
  await ensureStaffTaskColumns();
  const { data, error } = await db().from('staff_tasks').select('*').order('created_at', { ascending: false });
  if (error) {
    if (isMissingTableError(error)) return [];
    check(error, 'getStaffTasks');
  }
  return (data || []).map(rowToStaffTask);
};

export const addStaffTask = async (task: any) => {
  await ensureStaffTaskColumns();
  const row = staffTaskToRow(task);
  if (!row.id) row.id = `CV_${Date.now()}`;
  const { data, error } = await db().from('staff_tasks').insert([row]).select().single();
  check(error, 'addStaffTask');
  return rowToStaffTask(data);
};

export const updateStaffTask = async (id: string, task: any) => {
  await ensureStaffTaskColumns();
  const row = staffTaskToRow(task);
  const { data, error } = await db().from('staff_tasks').update(row).eq('id', id).select().single();
  check(error, 'updateStaffTask');
  return rowToStaffTask(data);
};

export const deleteStaffTask = async (id: string) => {
  const { error } = await db().from('staff_tasks').delete().eq('id', id);
  check(error, 'deleteStaffTask');
  return { success: true };
};

let _staffEvalColumnsChecked = false;
const _availableStaffEvalCols = new Set<string>([
  'id', 'username', 'full_name', 'evaluation_date', 'criteria', 'total_score', 'grade', 'notes', 'created_by', 'created_at'
]);

async function ensureStaffEvaluationColumns(): Promise<void> {
  if (_staffEvalColumnsChecked) return;
  _staffEvalColumnsChecked = true;
  try {
    const { data } = await db().from('staff_evaluations').select('*').limit(1);
    if (data && data.length > 0 && data[0]) {
      Object.keys(data[0]).forEach(col => _availableStaffEvalCols.add(col));
    }
  } catch {
    /* fallback */
  }
}

const rowToStaffEvaluation = (row: any): StaffEvaluation => {
  const crit = row.criteria || {};
  return {
    id: String(row.id || ''),
    userId: String(row.user_id || row.userId || row.username || ''),
    loaiDanhGia: row.loai_danh_gia || row.loaiDanhGia || crit.loaiDanhGia || 'Quý',
    quy: String(row.quy || crit.quy || ''),
    nam: row.nam || crit.nam || new Date().getFullYear(),
    diemHoanThanhCongViec: row.diem_hoan_thanh_cong_viec ?? row.diemHoanThanhCongViec ?? crit.diemHoanThanhCongViec ?? 0,
    diemThaiDo: row.diem_thai_do ?? row.diemThaiDo ?? crit.diemThaiDo ?? 0,
    diemKyLuat: row.diem_ky_luat ?? row.diemKyLuat ?? crit.diemKyLuat ?? 0,
    diemPhoiHop: row.diem_phoi_hop ?? row.diemPhoiHop ?? crit.diemPhoiHop ?? 0,
    diemSangKien: row.diem_sang_kien ?? row.diemSangKien ?? crit.diemSangKien ?? 0,
    diemTong: row.diem_tong ?? row.diemTong ?? row.total_score ?? 0,
    xepLoai: String(row.xep_loai || row.xepLoai || row.grade || ''),
    nhanXet: String(row.nhan_xet || row.nhanXet || row.notes || ''),
    nguoiDanhGia: String(row.nguoi_danh_gia || row.nguoiDanhGia || row.created_by || ''),
    ngayDanhGia: String(row.ngay_danh_gia || row.ngayDanhGia || row.evaluation_date || ''),
  };
};

const staffEvaluationToRow = (e: Partial<StaffEvaluation>): Record<string, any> => {
  const row: Record<string, any> = {};
  if (e.id !== undefined) row.id = e.id;

  const usernameVal = e.userId || (e as any).username || '';
  const scoreVal = e.diemTong ?? (e as any).total_score ?? 0;
  const gradeVal = e.xepLoai || (e as any).grade || '';
  const notesVal = e.nhanXet || (e as any).notes || '';
  const creatorVal = e.nguoiDanhGia || (e as any).created_by || '';
  const dateVal = e.ngayDanhGia || (e as any).evaluation_date || '';

  if (_availableStaffEvalCols.has('username')) row.username = usernameVal;
  if (_availableStaffEvalCols.has('user_id')) row.user_id = usernameVal;
  if (_availableStaffEvalCols.has('total_score')) row.total_score = scoreVal;
  if (_availableStaffEvalCols.has('diem_tong')) row.diem_tong = scoreVal;
  if (_availableStaffEvalCols.has('grade')) row.grade = gradeVal;
  if (_availableStaffEvalCols.has('xep_loai')) row.xep_loai = gradeVal;
  if (_availableStaffEvalCols.has('notes')) row.notes = notesVal;
  if (_availableStaffEvalCols.has('nhan_xet')) row.nhan_xet = notesVal;
  if (_availableStaffEvalCols.has('created_by')) row.created_by = creatorVal;
  if (_availableStaffEvalCols.has('nguoi_danh_gia')) row.nguoi_danh_gia = creatorVal;
  if (_availableStaffEvalCols.has('evaluation_date')) row.evaluation_date = dateVal;
  if (_availableStaffEvalCols.has('ngay_danh_gia')) row.ngay_danh_gia = dateVal;

  if (_availableStaffEvalCols.has('loai_danh_gia') && e.loaiDanhGia !== undefined) row.loai_danh_gia = e.loaiDanhGia;
  if (_availableStaffEvalCols.has('quy') && e.quy !== undefined) row.quy = e.quy;
  if (_availableStaffEvalCols.has('nam') && e.nam !== undefined) row.nam = e.nam;

  if (_availableStaffEvalCols.has('diem_hoan_thanh_cong_viec') && e.diemHoanThanhCongViec !== undefined) row.diem_hoan_thanh_cong_viec = e.diemHoanThanhCongViec;
  if (_availableStaffEvalCols.has('diem_thai_do') && e.diemThaiDo !== undefined) row.diem_thai_do = e.diemThaiDo;
  if (_availableStaffEvalCols.has('diem_ky_luat') && e.diemKyLuat !== undefined) row.diem_ky_luat = e.diemKyLuat;
  if (_availableStaffEvalCols.has('diem_phoi_hop') && e.diemPhoiHop !== undefined) row.diem_phoi_hop = e.diemPhoiHop;
  if (_availableStaffEvalCols.has('diem_sang_kien') && e.diemSangKien !== undefined) row.diem_sang_kien = e.diemSangKien;

  if (_availableStaffEvalCols.has('criteria')) {
    row.criteria = {
      diemHoanThanhCongViec: e.diemHoanThanhCongViec ?? 0,
      diemThaiDo: e.diemThaiDo ?? 0,
      diemKyLuat: e.diemKyLuat ?? 0,
      diemPhoiHop: e.diemPhoiHop ?? 0,
      diemSangKien: e.diemSangKien ?? 0,
      loaiDanhGia: e.loaiDanhGia || 'Quý',
      quy: e.quy || '',
      nam: e.nam || new Date().getFullYear(),
    };
  }

  return row;
};

let _missingStaffEvaluationsTable = false;
export const getStaffEvaluations = async (): Promise<StaffEvaluation[]> => {
  if (_missingStaffEvaluationsTable) return [];
  await ensureStaffEvaluationColumns();
  const { data, error } = await db().from('staff_evaluations').select('*').order('created_at', { ascending: false });
  if (error) {
    if (isMissingTableError(error)) {
      _missingStaffEvaluationsTable = true;
      return [];
    }
    check(error, 'getStaffEvaluations');
  }
  return (data || []).map(rowToStaffEvaluation);
};

export const addStaffEvaluation = async (evaluation: StaffEvaluation) => {
  await ensureStaffEvaluationColumns();
  const row = staffEvaluationToRow(evaluation);
  if (!row.id) row.id = `DGN_${Date.now()}`;
  const { data, error } = await db().from('staff_evaluations').insert([row]).select().single();
  check(error, 'addStaffEvaluation');
  return rowToStaffEvaluation(data);
};

export const updateStaffEvaluation = async (id: string, evaluation: Partial<StaffEvaluation>) => {
  await ensureStaffEvaluationColumns();
  const row = staffEvaluationToRow(evaluation);
  const { data, error } = await db().from('staff_evaluations').update(row).eq('id', id).select().single();
  check(error, 'updateStaffEvaluation');
  return rowToStaffEvaluation(data);
};

export const deleteStaffEvaluation = async (id: string) => {
  const { error } = await db().from('staff_evaluations').delete().eq('id', id);
  check(error, 'deleteStaffEvaluation');
  return { success: true };
};

// =========================================================
// 12.1 RESEARCH TOPICS
// =========================================================
let _missingResearchTopicsTable = false;
export const getResearchTopics = async () => {
  if (_missingResearchTopicsTable) return [];
  const { data, error } = await db().from('research_topics').select('*').order('created_at', { ascending: false });
  if (error) {
    if (isMissingTableError(error)) {
      _missingResearchTopicsTable = true;
      return [];
    }
    check(error, 'getResearchTopics');
  }
  return normRows(data || []);
};

export const addResearchTopic = async (r: any) => {
  const row = toSnakeRow(r);
  if (!row.id) row.id = `DT_${Date.now()}`;
  const { data, error } = await db().from('research_topics').insert([row]).select().single();
  check(error, 'addResearchTopic');
  return normRow(data);
};

export const updateResearchTopic = async (id: string, r: any) => {
  const { data, error } = await db().from('research_topics').update(toSnakeRow(r)).eq('id', id).select().single();
  check(error, 'updateResearchTopic');
  return normRow(data);
};

export const deleteResearchTopic = async (id: string) => {
  const { error } = await db().from('research_topics').delete().eq('id', id);
  check(error, 'deleteResearchTopic');
  return { success: true };
};

// =========================================================
// 13. AUDIT LOGS
// =========================================================
export const writeActionLog = async (
  action: string,
  target: string,
  detail: any,
  actor?: { username: string; fullName: string }
) => {
  try {
    await db().from('logs').insert([{
      action,
      target,
      detail: typeof detail === 'string' ? detail : JSON.stringify(detail),
      username:  actor?.username  || '',
      full_name: actor?.fullName  || '',
      created_at: new Date().toISOString(),
    }]);
  } catch {
    // Logging is optional; failures must not block CRUD.
  }
};

// =========================================================
// 14. DASHBOARD STATS
// =========================================================
export const getDashboardStats = async () => {
  try {
    const [patientsRes, usersRes] = await Promise.all([
      db().from('patients').select('id, status'),
      db().from('users').select('id, active'),
    ]);
    const patients: any[] = patientsRes.data || [];
    const users:    any[] = usersRes.data    || [];
    return {
      totalPatients:    patients.length,
      inpatients:       patients.filter(p => p.status === 'DangDieuTri').length,
      pendingSurgery:   patients.filter(p => p.status === 'ChoMo').length,
      totalStaff:       users.filter(u => u.active).length,
      briefingsThisMonth: 0,
    };
  } catch {
    return { totalPatients: 0, inpatients: 0, pendingSurgery: 0, totalStaff: 0, briefingsThisMonth: 0 };
  }
};
