-- ====================================================================
-- SUPABASE POSTGRESQL SCHEMA FOR KHOA NGOẠI TỔNG HỢP - BVNTNA
-- Run this script in Supabase SQL Editor (https://supabase.com/dashboard)
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PATIENTS TABLE (DS_BenhNhan)
CREATE TABLE IF NOT EXISTS public.patients (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    dob VARCHAR(50),
    gender VARCHAR(20),
    phone_number VARCHAR(50),
    address TEXT,
    room VARCHAR(50),
    bed VARCHAR(50),
    admission_date VARCHAR(50),
    discharge_date VARCHAR(50),
    diagnosis TEXT,
    status VARCHAR(50) DEFAULT 'ChoMo',
    treatment_type VARCHAR(50) DEFAULT 'Ngoai',
    treating_doctor VARCHAR(255),
    notes TEXT,
    surgery_date VARCHAR(50),
    surgery_method TEXT,
    actual_surgery_date VARCHAR(50),
    surgery_classification VARCHAR(100),
    intervention_type VARCHAR(255),
    activity_type VARCHAR(100),
    surgery_service VARCHAR(100),
    surgery_type VARCHAR(100),
    surgeon VARCHAR(255),
    assistant_surgeon_1 VARCHAR(255),
    assistant_surgeon_2 VARCHAR(255),
    assistant_surgeon_3 VARCHAR(255),
    anesthetist VARCHAR(255),
    anesthetist_assistant VARCHAR(255),
    scrub_nurse VARCHAR(255),
    approval_date VARCHAR(50),
    approval_note TEXT,
    surgery_order INT,
    cccd VARCHAR(20),
    bhyt_code VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_actual_surgery_date ON public.patients(actual_surgery_date);
CREATE INDEX IF NOT EXISTS idx_patients_surgery_type ON public.patients(surgery_type);
CREATE INDEX IF NOT EXISTS idx_patients_surgery_service ON public.patients(surgery_service);

-- 2. USERS TABLE (Users)
CREATE TABLE IF NOT EXISTS public.users (
    username VARCHAR(100) PRIMARY KEY,
    password_hash VARCHAR(255),
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'NHAN_VIEN',
    chuc_vu VARCHAR(100),
    nhom_chuyen_mon VARCHAR(50),
    active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT FALSE,
    session_token VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. VIP PATIENTS TABLE (DS_Phong_Vip)
CREATE TABLE IF NOT EXISTS public.vip_patients (
    id VARCHAR(100) PRIMARY KEY,
    patient_id VARCHAR(50) REFERENCES public.patients(id) ON DELETE CASCADE,
    priority VARCHAR(50) DEFAULT 'Medium',
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DAILY ON CALL TABLE (Phan_Truc_Ngay)
CREATE TABLE IF NOT EXISTS public.daily_on_call (
    id VARCHAR(100) PRIMARY KEY,
    date VARCHAR(50) NOT NULL,
    shift_type VARCHAR(50),
    leader VARCHAR(255),
    main_doctor VARCHAR(255),
    assistant_doctor VARCHAR(255),
    head_nurse VARCHAR(255),
    nurses TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. DAILY BRIEFING TABLE (GiaoBan_Log)
CREATE TABLE IF NOT EXISTS public.daily_briefing (
    id VARCHAR(100) PRIMARY KEY,
    date VARCHAR(50) NOT NULL,
    presider VARCHAR(255),
    secretary VARCHAR(255),
    attendees TEXT,
    on_call_report TEXT,
    tasks_json JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. SCIENTIFIC MEETINGS (SinhHoat_KH)
CREATE TABLE IF NOT EXISTS public.scientific_meetings (
    id VARCHAR(100) PRIMARY KEY,
    date VARCHAR(50) NOT NULL,
    topic TEXT NOT NULL,
    presenter VARCHAR(255),
    attendees TEXT,
    content TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. NEW TECHNIQUES (KyThuat_Moi)
CREATE TABLE IF NOT EXISTS public.new_techniques (
    id VARCHAR(100) PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    implementer VARCHAR(255),
    start_date VARCHAR(50),
    status VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. COMMUNICATION CONTENTS (NoiDung_TT)
CREATE TABLE IF NOT EXISTS public.communication_contents (
    id VARCHAR(100) PRIMARY KEY,
    title TEXT NOT NULL,
    category VARCHAR(100),
    content TEXT,
    author VARCHAR(255),
    date VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. 5S ZONES (Vung_5S)
CREATE TABLE IF NOT EXISTS public.five_s_zones (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    person_in_charge VARCHAR(255),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. 5S EVALUATIONS (DanhGia_5S)
CREATE TABLE IF NOT EXISTS public.five_s_evaluations (
    id VARCHAR(100) PRIMARY KEY,
    zone_id VARCHAR(100),
    date VARCHAR(50),
    evaluator VARCHAR(255),
    score NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. 5S IMPROVEMENTS (CaiTien_5S)
CREATE TABLE IF NOT EXISTS public.five_s_improvements (
    id VARCHAR(100) PRIMARY KEY,
    title TEXT NOT NULL,
    zone_id VARCHAR(100),
    before_img TEXT,
    after_img TEXT,
    description TEXT,
    status VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. SYSTEM CONFIG (Config)
CREATE TABLE IF NOT EXISTS public.system_configs (
    key VARCHAR(100) PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. AUDIT LOGS (Logs)
CREATE TABLE IF NOT EXISTS public.logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    action VARCHAR(100),
    target VARCHAR(100),
    detail TEXT,
    username VARCHAR(100),
    full_name VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. STAFF TASKS (CongViec_NhanVien)
CREATE TABLE IF NOT EXISTS public.staff_tasks (
    id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(100),
    title TEXT NOT NULL,
    description TEXT,
    due_date VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 15. ROLE PERMISSIONS (Roles_Permission)
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id VARCHAR(100) PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    module VARCHAR(100) NOT NULL,
    can_read BOOLEAN DEFAULT TRUE,
    can_write BOOLEAN DEFAULT FALSE,
    can_delete BOOLEAN DEFAULT FALSE
);

-- Enable Row Level Security. Browser không truy cập Supabase trực tiếp;
-- API server dùng service_role sau khi đã xác thực session qua GAS.
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vip_patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_on_call ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_briefing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scientific_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.new_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_contents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.five_s_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.five_s_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.five_s_improvements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE
  public.patients, public.users, public.vip_patients, public.daily_on_call,
  public.daily_briefing, public.scientific_meetings, public.new_techniques,
  public.communication_contents, public.five_s_zones, public.five_s_evaluations,
  public.five_s_improvements, public.system_configs, public.logs,
  public.staff_tasks, public.role_permissions
FROM anon, authenticated;
