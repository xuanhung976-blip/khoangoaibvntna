/**
 * scripts/applyPatch.js
 * Tự động chạy SQL patch lên Supabase qua Management API
 * Usage: node scripts/applyPatch.js
 * 
 * NOTE: Cần SUPABASE_SERVICE_ROLE_KEY hoặc access token để chạy DDL.
 * Script này dùng anon key nhưng wrap trong RPC function nếu có, 
 * hoặc hướng dẫn user copy SQL.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ubynsisaaybmnicpdvft.supabase.co';
const SUPABASE_KEY = 'sb_publishable_VJ62kjUTzjVlbrhAlw5T1Q_m3zIX_nE';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAndAddColumns() {
  console.log('🔍 Kiểm tra schema hiện tại của bảng patients...\n');

  // Test each missing column by trying a query
  const missingColumns = [];

  const columnsToCheck = [
    { column: 'address', testValue: null },
    { column: 'actual_surgery_date', testValue: null },
    { column: 'surgery_classification', testValue: null },
    { column: 'intervention_type', testValue: null },
    { column: 'activity_type', testValue: null },
  ];

  for (const { column } of columnsToCheck) {
    const { error } = await supabase
      .from('patients')
      .select(column)
      .limit(1);
    
    if (error && error.message.includes('does not exist')) {
      missingColumns.push(column);
      console.log(`❌ Cột "${column}" CHƯA TỒN TẠI trong DB`);
    } else {
      console.log(`✅ Cột "${column}" đã có sẵn`);
    }
  }

  // Check staff_evaluations table
  const { error: tableError } = await supabase
    .from('staff_evaluations')
    .select('id')
    .limit(1);
  
  const needsStaffEvalTable = tableError && tableError.message.includes('does not exist');
  if (needsStaffEvalTable) {
    console.log('❌ Bảng "staff_evaluations" CHƯA TỒN TẠI');
  } else {
    console.log('✅ Bảng "staff_evaluations" đã có sẵn');
  }

  if (missingColumns.length === 0 && !needsStaffEvalTable) {
    console.log('\n✨ Schema đã đầy đủ! Không cần patch gì thêm.');
    return;
  }

  console.log('\n⚠️  Cần chạy SQL patch. Vui lòng mở Supabase SQL Editor và chạy:');
  console.log('👉 https://supabase.com/dashboard/project/ubynsisaaybmnicpdvft/sql/new\n');
  console.log('=' .repeat(60));
  
  if (missingColumns.length > 0) {
    const alterStatements = missingColumns.map(col => {
      const typeMap = {
        address: 'TEXT',
        actual_surgery_date: 'VARCHAR(50)',
        surgery_classification: 'VARCHAR(100)',
        intervention_type: 'VARCHAR(255)',
        activity_type: 'VARCHAR(100)',
      };
      return `  ADD COLUMN IF NOT EXISTS ${col} ${typeMap[col] || 'TEXT'}`;
    });
    
    console.log(`ALTER TABLE public.patients\n${alterStatements.join(',\n')};\n`);
  }

  if (needsStaffEvalTable) {
    console.log(`CREATE TABLE IF NOT EXISTS public.staff_evaluations (
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
CREATE POLICY "Allow public read/write on staff_evaluations" ON public.staff_evaluations FOR ALL USING (true) WITH CHECK (true);`);
  }
  
  console.log('=' .repeat(60));
}

checkAndAddColumns().catch(console.error);
