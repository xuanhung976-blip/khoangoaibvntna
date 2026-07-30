/**
 * scripts/migrate_full.js
 * Full data migration from Google Sheets → Supabase
 * Uses GAS session auth to bypass access restrictions.
 * 
 * Usage: node scripts/migrate_full.js <username> <password>
 * Example: node scripts/migrate_full.js admin 123456
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubynsisaaybmnicpdvft.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VJ62kjUTzjVlbrhAlw5T1Q_m3zIX_nE';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyDFOw5JmJf88YYYS3mU7IorWF_F2tUyuNOF8belqwats3xTd1njTI_ab0ahonrvzHrQA/exec';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ── CLI args ────────────────────────────────────────────────────────────────
const [,, USERNAME = 'admin', PASSWORD = '123456'] = process.argv;

// ── State ──────────────────────────────────────────────────────────────────
let SESSION_TOKEN = '';

// ── Helpers ────────────────────────────────────────────────────────────────
function deduplicateById(items, keyName = 'id') {
  const map = new Map();
  items.forEach(item => {
    if (item && item[keyName] !== undefined && item[keyName] !== null)
      map.set(String(item[keyName]), item);
  });
  return Array.from(map.values());
}

import https from 'https';

function callGAS(funcName, args = []) {
  return new Promise((resolve) => {
    const payload = JSON.stringify({ funcName, args, sessionToken: SESSION_TOKEN });
    const u = new URL(GAS_URL);
    const req = https.request(u, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, res => {
      const handleStream = (stream) => {
        let text = '';
        stream.on('data', chunk => text += chunk);
        stream.on('end', () => {
          try {
            const json = JSON.parse(text);
            if (json && json.error) resolve(null);
            else resolve(json && 'data' in json ? json.data : json);
          } catch {
            resolve(null);
          }
        });
      };

      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        https.get(res.headers.location, handleStream).on('error', () => resolve(null));
      } else {
        handleStream(res);
      }
    });
    req.on('error', () => resolve(null));
    req.write(payload);
    req.end();
  });
}

async function login() {
  console.log(`🔐 Logging in as "${USERNAME}"...`);
  const result = await callGAS('loginUser', [USERNAME, PASSWORD]);
  if (!result) {
    console.error('❌ Login failed — check username/password');
    console.log('\nUsage: node scripts/migrate_full.js <username> <password>');
    process.exit(1);
  }
  const token = result.sessionToken || (result.user && result.sessionToken) || result.token;
  if (token) {
    SESSION_TOKEN = token;
    console.log('✅ Login successful, session token acquired\n');
  } else {
    console.log('⚠️  Login returned result but no session token. Trying without auth...\n');
    console.log('Login result keys:', Object.keys(result));
  }
  return result;
}

async function upsertBatch(tableName, rows, conflictCol = 'id') {
  if (!rows.length) return 0;
  // Supabase upsert in batches of 200
  const BATCH_SIZE = 200;
  let total = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error } = await supabase.from(tableName).upsert(batch, { onConflict: conflictCol });
    if (error) throw new Error(`${tableName}: ${error.message}`);
    total += batch.length;
  }
  return total;
}

// ═══════════════════════════════════════════════════════════════════════════
// MIGRATION TASKS
// ═══════════════════════════════════════════════════════════════════════════

async function migratePatients() {
  console.log('📦 Patients (DS_BenhNhan)...');
  const data = await callGAS('apiGet', ['DS_BenhNhan']);
  if (!Array.isArray(data)) { console.log('  ⚠️  No data\n'); return; }
  const rows = deduplicateById(data.map(p => ({
    id: String(p.id),
    name: p.name || 'BN',
    dob: p.dob ? String(p.dob) : null,
    gender: p.gender || 'Nam',
    phone_number: p.phoneNumber || null,
    address: p.address || null,
    room: p.room || null,
    bed: p.bed || null,
    admission_date: p.admissionDate || null,
    discharge_date: p.dischargeDate || null,
    diagnosis: p.diagnosis || null,
    status: p.status || 'ChoMo',
    treatment_type: p.treatmentType || 'Ngoai',
    treating_doctor: p.treatingDoctor || null,
    notes: p.notes || null,
    surgery_date: p.surgeryDate || null,
    surgery_method: p.surgeryMethod || null,
    surgery_order: p.surgeryOrder ? parseInt(p.surgeryOrder, 10) : null,
    surgeon: p.surgeon || null,
    assistant_surgeon_1: p.assistantSurgeon1 || null,
    assistant_surgeon_2: p.assistantSurgeon2 || null,
    assistant_surgeon_3: p.assistantSurgeon3 || null,
    anesthetist: p.anesthetist || null,
    anesthetist_assistant: p.anesthetistAssistant || null,
    scrub_nurse: p.scrubNurse || null,
    approval_date: p.approvalDate || null,
    approval_note: p.approvalNote || null,
    actual_surgery_date: p.actualSurgeryDate || null,
    surgery_classification: p.surgeryClassification || null,
    intervention_type: p.interventionType || null,
  })));
  const n = await upsertBatch('patients', rows);
  console.log(`  ✅ ${n} patients\n`);
}

async function migrateUsers() {
  console.log('📦 Users...');
  const data = await callGAS('apiGet', ['Users']);
  if (!Array.isArray(data)) { console.log('  ⚠️  No data\n'); return; }
  const rows = deduplicateById(data.map(u => ({
    username: String(u.username),
    password_hash: u.password || u.passwordHash || '123456',
    full_name: u.fullName || u.username,
    role: u.role || 'NHAN_VIEN',
    chuc_vu: u.chucVu || null,
    nhom_chuyen_mon: u.nhomChuyenMon || null,
    active: u.active !== false && u.active !== 'false',
    must_change_password: u.mustChangePassword === true || u.mustChangePassword === 'true',
  })), 'username');
  const n = await upsertBatch('users', rows, 'username');
  console.log(`  ✅ ${n} users\n`);
}

async function migrateBriefings() {
  console.log('📦 Daily Briefings (GiaoBan_Log)...');
  const data = await callGAS('apiGet', ['GiaoBan_Log']);
  if (!Array.isArray(data)) { console.log('  ⚠️  No data (GAS may require auth)\n'); return; }
  console.log(`  Found ${data.length} records. Sample keys:`, Object.keys(data[0] || {}));

  const rows = deduplicateById(data.map((b, idx) => {
    // Parse tasks from various field names GAS might use
    let tasks = [];
    const rawTasks = b.tasks || b.congViecJson || b.cong_viec_json || b.taskList || [];
    if (typeof rawTasks === 'string') {
      try { tasks = JSON.parse(rawTasks); } catch { tasks = []; }
    } else if (Array.isArray(rawTasks)) {
      tasks = rawTasks;
    }

    return {
      id: String(b.id || `GB_${idx + 1}`),
      date: b.date || new Date().toISOString().split('T')[0],
      presider: b.presider || b.host || b.chuTri || b.nguoiChuTri || null,
      secretary: b.secretary || b.thuKy || null,
      attendees: b.attendees || b.thanhPhan || b.danhSachThamDu || null,
      on_call_report: b.onCallReport || b.baoCaoTruc || b.on_call_report || null,
      notes: b.notes || b.content || b.noiDung || b.ghiChu || null,
      tasks_json: tasks,
    };
  }));
  const n = await upsertBatch('daily_briefing', rows);
  console.log(`  ✅ ${n} briefings\n`);
}

async function migrateOnCall() {
  console.log('📦 Daily On Call (Phan_Truc_Ngay)...');
  const data = await callGAS('apiGet', ['Phan_Truc_Ngay']);
  if (!Array.isArray(data)) { console.log('  ⚠️  No data\n'); return; }
  console.log(`  Found ${data.length} records. Sample keys:`, Object.keys(data[0] || {}));

  const rows = deduplicateById(data.map((s, idx) => ({
    id: String(s.id || `SHIFT_${idx + 1}`),
    date: s.date || new Date().toISOString().split('T')[0],
    shift_type: s.shiftType || s.shift_type || s.loaiCa || '24h',
    leader: s.leader || s.truongTruc || null,
    main_doctor: s.mainDoctor || s.doctor || s.bacSiTruc || s.bsTruc || null,
    assistant_doctor: s.assistantDoctor || s.nurse1 || s.dieuDuong1 || null,
    head_nurse: s.headNurse || s.dieuDuongTruong || null,
    nurses: s.nurses || s.nurse2 || s.dieuDuong2 || null,
    notes: s.notes || s.note || s.ghiChu || null,
  })));
  const n = await upsertBatch('daily_on_call', rows);
  console.log(`  ✅ ${n} on-call records\n`);
}

async function migrateMeetings() {
  console.log('📦 Scientific Meetings (SinhHoat_KH)...');
  const data = await callGAS('apiGet', ['SinhHoat_KH']);
  if (!Array.isArray(data)) { console.log('  ⚠️  No data\n'); return; }
  const rows = deduplicateById(data.map((m, idx) => ({
    id: String(m.id || `KH_${idx + 1}`),
    date: m.date || m.time || new Date().toISOString().split('T')[0],
    topic: m.topic || 'Sinh hoạt khoa học',
    presenter: m.presenter || null,
    attendees: m.attendees || null,
    content: m.content || null,
    notes: m.notes || null,
  })));
  const n = await upsertBatch('scientific_meetings', rows);
  console.log(`  ✅ ${n} meetings\n`);
}

async function migrateTechniques() {
  console.log('📦 New Techniques (KyThuat_Moi)...');
  const data = await callGAS('apiGet', ['KyThuat_Moi']);
  if (!Array.isArray(data)) { console.log('  ⚠️  No data\n'); return; }
  const rows = deduplicateById(data.map((t, idx) => ({
    id: String(t.id || `KT_${idx + 1}`),
    name: t.name || 'Kỹ thuật mới',
    description: t.description || null,
    implementer: t.implementer || t.leader || null,
    start_date: t.startDate || t.start_date || null,
    status: t.status || 'DangTrienKhai',
    notes: t.notes || null,
  })));
  const n = await upsertBatch('new_techniques', rows);
  console.log(`  ✅ ${n} techniques\n`);
}

async function migrateCommunication() {
  console.log('📦 Communication (NoiDung_TT)...');
  const data = await callGAS('apiGet', ['NoiDung_TT']);
  if (!Array.isArray(data)) { console.log('  ⚠️  No data\n'); return; }
  const rows = deduplicateById(data.map((c, idx) => ({
    id: String(c.id || `TT_${idx + 1}`),
    title: c.title || 'Thông tin khoa',
    category: c.category || c.platform || 'Thông báo',
    content: c.content || null,
    author: c.author || c.leader || null,
    date: c.date || c.publishDate || new Date().toISOString().split('T')[0],
    notes: c.notes || c.link || null,
  })));
  const n = await upsertBatch('communication_contents', rows);
  console.log(`  ✅ ${n} records\n`);
}

async function migrate5S() {
  console.log('📦 5S Zones (Vung_5S)...');
  const data = await callGAS('apiGet', ['Vung_5S']);
  if (Array.isArray(data) && data.length) {
    const rows = deduplicateById(data.map((z, idx) => ({
      id: String(z.id || `5S_${idx + 1}`),
      name: z.name || 'Khu vực',
      person_in_charge: z.personInCharge || z.pic || null,
      description: z.description || null,
    })));
    const n = await upsertBatch('five_s_zones', rows);
    console.log(`  ✅ ${n} zones\n`);
  } else { console.log('  ⚠️  No data\n'); }

  console.log('📦 5S Evaluations (DanhGia_5S)...');
  const evals = await callGAS('apiGet', ['DanhGia_5S']);
  if (Array.isArray(evals) && evals.length) {
    const rows = deduplicateById(evals.map((e, idx) => ({
      id: String(e.id || `DG_${idx + 1}`),
      zone_id: e.zoneId || e.zone_id || null,
      date: e.date || new Date().toISOString().split('T')[0],
      evaluator: e.evaluator || e.assessor || null,
      score: parseFloat(e.score) || null,
      notes: e.notes || e.comments || null,
    })));
    const n = await upsertBatch('five_s_evaluations', rows);
    console.log(`  ✅ ${n} evaluations\n`);
  } else { console.log('  ⚠️  No evaluation data\n'); }

  console.log('📦 5S Improvements (CaiTien_5S)...');
  const impr = await callGAS('apiGet', ['CaiTien_5S']);
  if (Array.isArray(impr) && impr.length) {
    const rows = deduplicateById(impr.map((i, idx) => ({
      id: String(i.id || `CT_${idx + 1}`),
      title: i.title || i.content || 'Cải tiến',
      zone_id: i.zoneId || i.zone_id || null,
      before_img: i.beforeImg || null,
      after_img: i.afterImg || null,
      description: i.description || i.content || null,
      status: i.status || 'DeXuat',
    })));
    const n = await upsertBatch('five_s_improvements', rows);
    console.log(`  ✅ ${n} improvements\n`);
  } else { console.log('  ⚠️  No improvement data\n'); }
}

async function migrateVipPatients() {
  console.log('📦 VIP Patients (BN_LuuY)...');
  const data = await callGAS('apiGet', ['BN_LuuY']);
  if (!Array.isArray(data) || !data.length) { console.log('  ⚠️  No data\n'); return; }
  const rows = deduplicateById(data.map((v, idx) => ({
    id: String(v.id || `VIP_${idx + 1}`),
    patient_id: v.patientId || v.idBN || v.patient_id || null,
    priority: v.priority || 'Trung bình',
    reason: v.reason || null,
  })));
  // Only insert VIPs whose patient_id exists in patients table
  const n = await upsertBatch('vip_patients', rows);
  console.log(`  ✅ ${n} VIP records\n`);
}

async function migrateResearch() {
  console.log('📦 Research Topics (DeTai_CoSo)...');
  const data = await callGAS('apiGet', ['DeTai_CoSo']);
  if (!Array.isArray(data) || !data.length) { console.log('  ⚠️  No data\n'); return; }
  // Research topics table may not exist yet — skip gracefully
  const rows = deduplicateById(data.map((r, idx) => ({
    id: String(r.id || `DT_${idx + 1}`),
    topic: r.topic || 'Đề tài',
    author: r.author || null,
    start_date: r.startDate || null,
    deadline: r.deadline || null,
    progress: parseInt(r.progress) || 0,
    notes: r.notes || null,
  })));
  const { error } = await supabase.from('research_topics').upsert(rows, { onConflict: 'id' });
  if (error && error.message.includes('does not exist')) {
    console.log('  ⚠️  research_topics table not in schema — skipped\n');
  } else if (error) {
    console.error('  ❌', error.message, '\n');
  } else {
    console.log(`  ✅ ${rows.length} research topics\n`);
  }
}

async function migrateStaffTasks() {
  console.log('📦 Staff Tasks (CongViec_NhanVien)...');
  const data = await callGAS('apiGet', ['CongViec_NhanVien']);
  if (!Array.isArray(data) || !data.length) { console.log('  ⚠️  No data\n'); return; }
  const rows = deduplicateById(data.map((t, idx) => ({
    id: String(t.id || `CV_${idx + 1}`),
    username: t.userId || t.username || t.assigneeUsername || null,
    title: t.tieuDe || t.title || 'Công việc',
    description: t.noiDung || t.description || null,
    due_date: t.hanHoanThanh || t.dueDate || null,
    status: t.trangThai || t.status || 'Chưa làm',
  })));
  const n = await upsertBatch('staff_tasks', rows);
  console.log(`  ✅ ${n} staff tasks\n`);
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   FULL MIGRATION: Google Sheets → Supabase      ║');
  console.log('╚══════════════════════════════════════════════════╝\n');

  await login();

  const tasks = [
    migratePatients,
    migrateUsers,
    migrateBriefings,
    migrateOnCall,
    migrateMeetings,
    migrateTechniques,
    migrateCommunication,
    migrate5S,
    migrateVipPatients,
    migrateResearch,
    migrateStaffTasks,
  ];

  for (const task of tasks) {
    try {
      await task();
    } catch (e) {
      console.error(`  ❌ Error in ${task.name}:`, e.message, '\n');
    }
  }

  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║   ✅ MIGRATION COMPLETE                         ║');
  console.log('╚══════════════════════════════════════════════════╝');
}

main().catch(console.error);
