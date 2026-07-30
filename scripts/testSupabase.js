import { createClient } from '@supabase/supabase-js';

const url = 'https://ubynsisaaybmnicpdvft.supabase.co';
const key = 'sb_publishable_VJ62kjUTzjVlbrhAlw5T1Q_m3zIX_nE';

const supabase = createClient(url, key);

async function test() {
  console.log('Testing Supabase tables...');
  const { data: pData, error: pErr } = await supabase.from('patients').select('*').limit(1);
  const { data: uData, error: uErr } = await supabase.from('users').select('*').limit(1);

  if (pErr) console.error('Patients table error:', pErr.message);
  else console.log('Patients table OK! Rows count:', pData.length);

  if (uErr) console.error('Users table error:', uErr.message);
  else console.log('Users table OK! Rows count:', uData.length);
}

test();
