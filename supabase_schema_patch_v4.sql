-- ====================================================================
-- SUPABASE SCHEMA PATCH v4 - Add cccd and bhyt_code for duplicate detection
-- Run this script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/ubynsisaaybmnicpdvft/sql/new
-- ====================================================================

-- Add identity fields for duplicate patient detection
ALTER TABLE public.patients
  ADD COLUMN IF NOT EXISTS cccd VARCHAR(20),
  ADD COLUMN IF NOT EXISTS bhyt_code VARCHAR(20);

-- Optional: Add indexes for fast duplicate lookup
CREATE INDEX IF NOT EXISTS idx_patients_cccd      ON public.patients(cccd)      WHERE cccd IS NOT NULL AND cccd != '';
CREATE INDEX IF NOT EXISTS idx_patients_bhyt_code ON public.patients(bhyt_code) WHERE bhyt_code IS NOT NULL AND bhyt_code != '';
CREATE INDEX IF NOT EXISTS idx_patients_phone     ON public.patients(phone_number) WHERE phone_number IS NOT NULL AND phone_number != '';

-- Verify columns were added:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'patients' AND column_name IN ('cccd', 'bhyt_code');
