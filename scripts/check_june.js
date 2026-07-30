import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ubynsisaaybmnicpdvft.supabase.co';
const supabaseKey = 'sb_publishable_VJ62kjUTzjVlbrhAlw5T1Q_m3zIX_nE';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data, error } = await supabase.from('patients').select('*');
    if (error) { console.error(error); return; }
    
    // Test parsing exactly like React app does
    const parseVietnameseDate = (dateStr) => {
        if (!dateStr) return null;
        const dateOnly = dateStr.split('T')[0];
        if (dateOnly.includes('/')) {
          const parts = dateOnly.split('/');
          if (parts.length >= 3) {
            const d = Number(parts[0]);
            const m = Number(parts[1]);
            const y = Number(parts[2].split(' ')[0]);
            if (y > 1000 && m >= 1 && m <= 12) return { year: y, month: m };
          }
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(dateOnly)) {
          const parts = dateOnly.split('-');
          const y = Number(parts[0]);
          const m = Number(parts[1]);
          if (y > 1000 && m >= 1 && m <= 12) return { year: y, month: m };
        }
        const d = new Date(dateStr);
        if (!isNaN(d.getTime())) {
          return { year: d.getFullYear(), month: d.getMonth() + 1 };
        }
        return null;
    };

    let p = data.filter(d => {
        const dateStr = d.actual_surgery_date || d.surgery_date;
        if (!dateStr) return false;
        const parsed = parseVietnameseDate(dateStr);
        if (!parsed) return false;
        return parsed.year === 2026 && parsed.month === 6;
    });
    
    const counts = { total: p.length, totalSurgeries: 0, totalProcedures: 0, rfa: 0, kgiap: 0, toetva: 0, lanh: 0, basedow: 0, ets: 0, other: 0 };
    const classCounts = { 'Đặc biệt': 0, 'Loại I': 0, 'Loại II': 0, 'Loại III': 0 };

    p.forEach(x => {
        const iType = x.intervention_type || '';
        if (iType === 'RFA') {
            counts.totalProcedures++;
            counts.rfa++;
        }
        else {
            counts.totalSurgeries++;
            if (iType === 'TOETVA') counts.toetva++;
            else if (iType === 'Mổ K tuyến giáp') counts.kgiap++;
            else if (iType === 'Basedow') counts.basedow++;
            else if (iType === 'PTNS đốt hạch giao cảm') counts.ets++;
            else if (iType === 'Cắt 1 thuỳ tuyến giáp' || iType === 'Cắt toàn bộ tuyến giáp') counts.lanh++;
            else counts.other++;

            if (x.surgery_classification && classCounts[x.surgery_classification] !== undefined) {
                classCounts[x.surgery_classification]++;
            }
        }
    });
    console.log('Total June filtered by JS logic:', p.length);
    console.log('Counts:', counts);
    console.log('Classifications:', classCounts);

    // Let's also check July
    let p7 = data.filter(d => {
        const dateStr = d.actual_surgery_date || d.surgery_date;
        if (!dateStr) return false;
        const parsed = parseVietnameseDate(dateStr);
        if (!parsed) return false;
        return parsed.year === 2026 && parsed.month === 7;
    });
    console.log('\nTotal July:', p7.length);

    const counts7 = { total: p7.length, totalSurgeries: 0, totalProcedures: 0, rfa: 0, kgiap: 0, toetva: 0, lanh: 0, basedow: 0, ets: 0, other: 0 };
    p7.forEach(x => {
        const iType = x.intervention_type || '';
        if (iType === 'RFA') counts7.totalProcedures++;
        else {
            counts7.totalSurgeries++;
            if (iType === 'TOETVA') counts7.toetva++;
            else if (iType === 'Mổ K tuyến giáp') counts7.kgiap++;
            else if (iType === 'Basedow') counts7.basedow++;
            else if (iType === 'PTNS đốt hạch giao cảm') counts7.ets++;
            else if (iType === 'Cắt 1 thuỳ tuyến giáp' || iType === 'Cắt toàn bộ tuyến giáp') counts7.lanh++;
            else counts7.other++;
        }
    });
    console.log('Counts July:', counts7);

}
check();
