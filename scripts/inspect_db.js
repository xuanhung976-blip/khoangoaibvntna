import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubynsisaaybmnicpdvft.supabase.co';
const supabaseKey = 'sb_publishable_VJ62kjUTzjVlbrhAlw5T1Q_m3zIX_nE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function inspect() {
    const { data, error } = await supabase.from('patients').select('*').limit(50);
    if (error) {
        console.error('Error fetching patients:', error);
        return;
    }
    console.log(`Fetched ${data?.length} patients`);
    if (data && data.length > 0) {
        console.log('ALL Columns in patients table:', Object.keys(data[0]));
        const withSurgery = data.filter(p => p.surgery_date || p.actual_surgery_date);
        console.log(`Found ${withSurgery.length} patients with surgery date out of 50 sample`);
        if (withSurgery.length > 0) {
            console.log('Sample row with surgery:', JSON.stringify(withSurgery[0], null, 2));
        }
    }
}

inspect();
