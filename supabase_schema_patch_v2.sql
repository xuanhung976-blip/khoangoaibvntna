-- ====================================================================
-- SUPABASE SCHEMA PATCH v2 - Add missing columns to patients table
-- Run this script in Supabase SQL Editor
-- ====================================================================

-- Add missing columns to patients table
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS actual_surgery_date VARCHAR(50),
  ADD COLUMN IF NOT EXISTS surgery_classification VARCHAR(100),
  ADD COLUMN IF NOT EXISTS intervention_type VARCHAR(255),
  ADD COLUMN IF NOT EXISTS activity_type VARCHAR(100);

-- Fix assistant_surgeon column names (ensure _1 _2 _3 naming)
-- (already correct from original schema, but confirm)
-- assistant_surgeon_1, assistant_surgeon_2, assistant_surgeon_3 are already in schema

-- Add staff_evaluations table (missing from original schema)
CREATE TABLE IF NOT EXISTS public.staff_evaluations (
    id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(100),
    full_name VARCHAR(255),
    evaluation_date VARCHAR(50),
    criteria JSONB DEFAULT '{}'::jsonb,
    total_score NUMERIC(5,2),
    grade VARCHAR(50),
    notes TEXT,
    created_by VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.staff_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read/write on staff_evaluations" ON public.staff_evaluations FOR ALL USING (true) WITH CHECK (true);
