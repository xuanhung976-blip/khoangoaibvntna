async function checkGas() {
    const url = 'https://script.google.com/macros/s/AKfycbxSsKpxrd2XhPX2zFOiJq2lOjGNKvd9ZDt1W_zNUHi06F8xsOgNJBT8avGfZ_O8psh-ag/exec';
    const payload = {
        action: 'apiGet',
        module: 'DS_BenhNhan'
    };
    
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    
    let res = await response.json();
    let data = res.data || res;
    
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
        const dateStr = d.actualSurgeryDate || d.surgeryDate;
        if (!dateStr) return false;
        const parsed = parseVietnameseDate(dateStr);
        if (!parsed) return false;
        return parsed.year === 2026 && parsed.month === 6;
    });
    
    const counts = { total: p.length, totalSurgeries: 0, totalProcedures: 0, rfa: 0, kgiap: 0, toetva: 0, lanh: 0, basedow: 0, ets: 0, other: 0 };
    const classCounts = { 'Đặc biệt': 0, 'Loại I': 0, 'Loại II': 0, 'Loại III': 0 };

    p.forEach(x => {
        const iType = x.interventionType || '';
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

            if (x.surgeryClassification && classCounts[x.surgeryClassification] !== undefined) {
                classCounts[x.surgeryClassification]++;
            }
        }
    });
    console.log('Total June in GAS:', p.length);
    console.log('Counts in GAS:', counts);
    console.log('Classifications in GAS:', classCounts);
}
checkGas();
