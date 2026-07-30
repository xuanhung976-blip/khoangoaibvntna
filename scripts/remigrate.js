/**
 * scripts/remigrate.js
 * Re-migrate data with correct field mappings.
 * Fixes:
 *  - daily_briefing: maps host→presider, content→notes from GAS data
 *  - daily_on_call: maps doctor/nurse1/nurse2 correctly
 *  - users: ensure chuc_vu field is migrated
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubynsisaaybmnicpdvft.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VJ62kjUTzjVlbrhAlw5T1Q_m3zIX_nE';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyDFOw5JmJf88YYYS3mU7IorWF_F2tUyuNOF8belqwats3xTd1njTI_ab0ahonrvzHrQA/exec';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function deduplicateById(items, keyName = 'id') {
  const map = new Map();
  items.forEach(item => {
    if (item && item[keyName]) map.set(String(item[keyName]), item);
  });
  return Array.from(map.values());
}

async function fetchFromGas(funcName, args = []) {
  try {
    const res = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      body: JSON.stringify({ funcName, args })
    });
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      if (json && typeof json === 'object' && 'data' in json) return json.data;
      return json;
    } catch {
      console.error(`Failed to parse JSON for ${funcName}:`, text.slice(0, 150));
      return null;
    }
  } catch (e) {
    console.error(`Fetch error for ${funcName}:`, e.message);
    return null;
  }
}

async function remigrate() {
  console.log('🔄 Re-migrating data with correct field mappings...\n');

  // ── 1. BRIEFINGS (GiaoBan_Log) ──────────────────────────────────────────
  console.log('📋 1/3 Re-migrating Daily Briefings...');
  const briefingsData = await fetchFromGas('apiGet', ['GiaoBan_Log']);
  if (Array.isArray(briefingsData) && briefingsData.length > 0) {
    console.log(`   Found ${briefingsData.length} records from GAS`);
    console.log('   Sample GAS keys:', Object.keys(briefingsData[0] || {}));

    const mapped = briefingsData.map((b, idx) => {
      // Try all possible field names from GAS
      const tasks = b.tasks || b.congViecJson || b.cong_viec_json || [];
      let tasksArr = [];
      if (typeof tasks === 'string') {
        try { tasksArr = JSON.parse(tasks); } catch { tasksArr = []; }
      } else if (Array.isArray(tasks)) {
        tasksArr = tasks;
      }

      return {
        id: String(b.id || `GB_${idx + 1}`),
        date: b.date || new Date().toISOString().split('T')[0],
        // Map all possible host/presider field names
        presider: b.presider || b.host || b.chuTri || b.nguoiChuTri || null,
        secretary: b.secretary || b.thuKy || null,
        attendees: b.attendees || b.thanhPhan || null,
        on_call_report: b.onCallReport || b.baoCaoTruc || b.on_call_report || null,
        // Map content/notes
        notes: b.notes || b.content || b.noiDung || b.ghiChu || null,
        tasks_json: tasksArr,
      };
    });

    const clean = deduplicateById(mapped, 'id');
    const { error } = await supabase.from('daily_briefing').upsert(clean, { onConflict: 'id' });
    if (error) console.error('❌ Briefings error:', error.message);
    else console.log(`✅ ${clean.length} briefings re-migrated!\n`);
  } else {
    console.log('   No briefing data from GAS\n');
  }

  // ── 2. DAILY ON CALL (Phan_Truc_Ngay) ──────────────────────────────────
  console.log('📅 2/3 Re-migrating Daily On Call...');
  const shiftsData = await fetchFromGas('apiGet', ['Phan_Truc_Ngay']);
  if (Array.isArray(shiftsData) && shiftsData.length > 0) {
    console.log(`   Found ${shiftsData.length} records from GAS`);
    console.log('   Sample GAS keys:', Object.keys(shiftsData[0] || {}));

    const mapped = shiftsData.map((s, idx) => ({
      id: String(s.id || `SHIFT_${idx + 1}`),
      date: s.date || new Date().toISOString().split('T')[0],
      shift_type: s.shiftType || s.shift_type || s.loaiCa || '24h',
      leader: s.leader || s.truongTruc || null,
      main_doctor: s.mainDoctor || s.doctor || s.bacSiTruc || s.bsTruc || null,
      assistant_doctor: s.assistantDoctor || s.nurse1 || s.dieuDuong1 || null,
      head_nurse: s.headNurse || s.dieuDuongTruong || null,
      nurses: s.nurses || s.nurse2 || s.dieuDuong2 || null,
      notes: s.notes || s.note || s.ghiChu || null,
    }));

    const clean = deduplicateById(mapped, 'id');
    const { error } = await supabase.from('daily_on_call').upsert(clean, { onConflict: 'id' });
    if (error) console.error('❌ On-call error:', error.message);
    else console.log(`✅ ${clean.length} on-call records re-migrated!\n`);
  }

  // ── 3. USERS — ensure chuc_vu is mapped ────────────────────────────────
  console.log('👥 3/3 Re-migrating Users (with chuc_vu)...');
  const usersData = await fetchFromGas('apiGet', ['Users']);
  if (Array.isArray(usersData) && usersData.length > 0) {
    console.log(`   Found ${usersData.length} users from GAS`);
    const mapped = usersData.map(u => ({
      username: String(u.username),
      password_hash: u.password || u.passwordHash || u.password_hash || '123456',
      full_name: u.fullName || u.full_name || u.username,
      role: u.role || 'NHAN_VIEN',
      chuc_vu: u.chucVu || u.chuc_vu || u.position || null,
      nhom_chuyen_mon: u.nhomChuyenMon || u.nhom_chuyen_mon || null,
      active: u.active !== false && u.active !== 'false',
      must_change_password: u.mustChangePassword === true || u.mustChangePassword === 'true',
    }));

    const clean = deduplicateById(mapped, 'username');
    const { error } = await supabase.from('users').upsert(clean, { onConflict: 'username' });
    if (error) console.error('❌ Users error:', error.message);
    else console.log(`✅ ${clean.length} users re-migrated!\n`);
  }

  console.log('🎉 Re-migration complete!');
}

remigrate().catch(console.error);
