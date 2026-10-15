-- ====================================================================
-- SUPABASE SCHEMA PATCH v3 - Add surgery_service and surgery_type
-- Run this script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ubynsisaaybmnicpdvft/sql/new
-- ====================================================================

ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS surgery_service VARCHAR(100),
  ADD COLUMN IF NOT EXISTS surgery_type VARCHAR(100);

-- Enable Row Level Security policies (if not already done)
-- These 2 new columns inherit the existing RLS policy on the patients table.

-- Verify columns were added:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'patients' AND column_name IN ('surgery_service', 'surgery_type');
