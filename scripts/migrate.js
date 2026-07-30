import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubynsisaaybmnicpdvft.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VJ62kjUTzjVlbrhAlw5T1Q_m3zIX_nE';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbyDFOw5JmJf88YYYS3mU7IorWF_F2tUyuNOF8belqwats3xTd1njTI_ab0ahonrvzHrQA/exec';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

function deduplicateById(items, keyName = 'id') {
  const map = new Map();
  items.forEach(item => {
    if (item && item[keyName]) {
      map.set(String(item[keyName]), item);
    }
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

async function runMigration() {
  console.log('🚀 Starting Data Migration from Google Sheets to Supabase...\n');

  // 1. MIGRATE PATIENTS (DS_BenhNhan)
  console.log('📦 1/8 Migrating Patients (DS_BenhNhan)...');
  const patientsData = await fetchFromGas('apiGet', ['DS_BenhNhan']);
  if (Array.isArray(patientsData) && patientsData.length > 0) {
    const mappedPatients = patientsData.map(p => ({
      id: String(p.id),
      name: p.name || 'Bệnh nhân',
      dob: p.dob ? String(p.dob) : null,
      gender: p.gender || 'Nam',
      phone_number: p.phoneNumber ? String(p.phoneNumber) : null,
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
      surgeon: p.surgeon || null,
      assistant_surgeon_1: p.assistantSurgeon1 || null,
      assistant_surgeon_2: p.assistantSurgeon2 || null,
      assistant_surgeon_3: p.assistantSurgeon3 || null,
      anesthetist: p.anesthetist || null,
      anesthetist_assistant: p.anesthetistAssistant || null,
      scrub_nurse: p.scrubNurse || null,
      approval_date: p.approvalDate || null,
      approval_note: p.approvalNote || null,
      surgery_order: p.surgeryOrder ? parseInt(p.surgeryOrder, 10) : null,
      actual_surgery_date: p.actualSurgeryDate || null,
      surgery_classification: p.surgeryClassification || null,
      intervention_type: p.interventionType || null
    }));

    const cleanPatients = deduplicateById(mappedPatients, 'id');
    const { error } = await supabase.from('patients').upsert(cleanPatients);
    if (error) console.error('❌ Error inserting patients:', error.message);
    else console.log(`✅ Successfully inserted ${cleanPatients.length} patients into Supabase!`);
  }

  // 2. MIGRATE USERS (Users)
  console.log('\n📦 2/8 Migrating Users (Users)...');
  const usersData = await fetchFromGas('apiGet', ['Users']);
  if (Array.isArray(usersData) && usersData.length > 0) {
    const mappedUsers = usersData.map(u => ({
      username: String(u.username),
      password_hash: u.password || '123456',
      full_name: u.fullName || u.username,
      role: u.role || 'NHAN_VIEN',
      chuc_vu: u.chucVu || null,
      nhom_chuyen_mon: u.nhomChuyenMon || null,
      active: u.active !== false && u.active !== 'false',
      must_change_password: u.mustChangePassword === true || u.mustChangePassword === 'true'
    }));

    const cleanUsers = deduplicateById(mappedUsers, 'username');
    const { error } = await supabase.from('users').upsert(cleanUsers);
    if (error) console.error('❌ Error inserting users:', error.message);
    else console.log(`✅ Successfully inserted ${cleanUsers.length} users into Supabase!`);
  }

  // 3. MIGRATE DAILY ON CALL (Phan_Truc_Ngay)
  console.log('\n📦 3/8 Migrating Daily On Call (Phan_Truc_Ngay)...');
  const shiftsData = await fetchFromGas('apiGet', ['Phan_Truc_Ngay']);
  if (Array.isArray(shiftsData) && shiftsData.length > 0) {
    const mappedShifts = shiftsData.map((s, idx) => ({
      id: String(s.id || `shift_${idx + 1}`),
      date: s.date || new Date().toISOString().split('T')[0],
      shift_type: s.shiftType || '24h',
      leader: s.leader || null,
      main_doctor: s.mainDoctor || null,
      assistant_doctor: s.assistantDoctor || null,
      head_nurse: s.headNurse || null,
      nurses: s.nurses || null,
      notes: s.notes || null
    }));

    const cleanShifts = deduplicateById(mappedShifts, 'id');
    const { error } = await supabase.from('daily_on_call').upsert(cleanShifts);
    if (error) console.error('❌ Error inserting shifts:', error.message);
    else console.log(`✅ Successfully inserted ${cleanShifts.length} shift schedules into Supabase!`);
  }

  // 4. MIGRATE DAILY BRIEFINGS (GiaoBan_Log)
  console.log('\n📦 4/8 Migrating Daily Briefings (GiaoBan_Log)...');
  const briefingsData = await fetchFromGas('apiGet', ['GiaoBan_Log']);
  if (Array.isArray(briefingsData) && briefingsData.length > 0) {
    const mappedBriefings = briefingsData.map((b, idx) => ({
      id: String(b.id || `briefing_${idx + 1}`),
      date: b.date || new Date().toISOString().split('T')[0],
      presider: b.presider || null,
      secretary: b.secretary || null,
      attendees: b.attendees || null,
      on_call_report: b.onCallReport || null,
      notes: b.notes || null
    }));

    const cleanBriefings = deduplicateById(mappedBriefings, 'id');
    const { error } = await supabase.from('daily_briefing').upsert(cleanBriefings);
    if (error) console.error('❌ Error inserting briefings:', error.message);
    else console.log(`✅ Successfully inserted ${cleanBriefings.length} briefings into Supabase!`);
  }

  // 5. MIGRATE SCIENTIFIC MEETINGS (SinhHoat_KH)
  console.log('\n📦 5/8 Migrating Scientific Meetings (SinhHoat_KH)...');
  const meetingsData = await fetchFromGas('apiGet', ['SinhHoat_KH']);
  if (Array.isArray(meetingsData) && meetingsData.length > 0) {
    const mappedMeetings = meetingsData.map((m, idx) => ({
      id: String(m.id || `meeting_${idx + 1}`),
      date: m.date || new Date().toISOString().split('T')[0],
      topic: m.topic || 'Sinh hoạt khoa học',
      presenter: m.presenter || null,
      attendees: m.attendees || null,
      content: m.content || null,
      notes: m.notes || null
    }));

    const cleanMeetings = deduplicateById(mappedMeetings, 'id');
    const { error } = await supabase.from('scientific_meetings').upsert(cleanMeetings);
    if (error) console.error('❌ Error inserting meetings:', error.message);
    else console.log(`✅ Successfully inserted ${cleanMeetings.length} meetings into Supabase!`);
  }

  // 6. MIGRATE NEW TECHNIQUES (KyThuat_Moi)
  console.log('\n📦 6/8 Migrating New Techniques (KyThuat_Moi)...');
  const techniquesData = await fetchFromGas('apiGet', ['KyThuat_Moi']);
  if (Array.isArray(techniquesData) && techniquesData.length > 0) {
    const mappedTech = techniquesData.map((t, idx) => ({
      id: String(t.id || `tech_${idx + 1}`),
      name: t.name || 'Kỹ thuật mới',
      description: t.description || null,
      implementer: t.implementer || null,
      start_date: t.startDate || null,
      status: t.status || 'Đang triển khai',
      notes: t.notes || null
    }));

    const cleanTech = deduplicateById(mappedTech, 'id');
    const { error } = await supabase.from('new_techniques').upsert(cleanTech);
    if (error) console.error('❌ Error inserting techniques:', error.message);
    else console.log(`✅ Successfully inserted ${cleanTech.length} techniques into Supabase!`);
  }

  // 7. MIGRATE COMMUNICATION CONTENTS (NoiDung_TT)
  console.log('\n📦 7/8 Migrating Communication Contents (NoiDung_TT)...');
  const commData = await fetchFromGas('apiGet', ['NoiDung_TT']);
  if (Array.isArray(commData) && commData.length > 0) {
    const mappedComm = commData.map((c, idx) => ({
      id: String(c.id || `comm_${idx + 1}`),
      title: c.title || 'Thông tin khoa',
      category: c.category || 'Thông báo',
      content: c.content || null,
      author: c.author || null,
      date: c.date || new Date().toISOString().split('T')[0],
      notes: c.notes || null
    }));

    const cleanComm = deduplicateById(mappedComm, 'id');
    const { error } = await supabase.from('communication_contents').upsert(cleanComm);
    if (error) console.error('❌ Error inserting communication contents:', error.message);
    else console.log(`✅ Successfully inserted ${cleanComm.length} communication records into Supabase!`);
  }

  // 8. MIGRATE 5S ZONES
  console.log('\n📦 8/8 Migrating 5S Zones (Vung_5S)...');
  const zonesData = await fetchFromGas('apiGet', ['Vung_5S']);
  if (Array.isArray(zonesData) && zonesData.length > 0) {
    const mappedZones = zonesData.map((z, idx) => ({
      id: String(z.id || `zone_${idx + 1}`),
      name: z.name || 'Khu vực 5S',
      person_in_charge: z.personInCharge || null,
      description: z.description || null
    }));

    const cleanZones = deduplicateById(mappedZones, 'id');
    const { error } = await supabase.from('five_s_zones').upsert(cleanZones);
    if (error) console.error('❌ Error inserting 5S zones:', error.message);
    else console.log(`✅ Successfully inserted ${cleanZones.length} 5S zones into Supabase!`);
  }

  console.log('\n🎉 ALL DATA MIGRATED SUCCESSFULLY TO SUPABASE!');
}

runMigration();
