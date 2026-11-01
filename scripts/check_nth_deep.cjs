const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const envLocal = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const emailMatch = envLocal.match(/GOOGLE_SERVICE_ACCOUNT_EMAIL=(.+)/);
const keyMatch = envLocal.match(/GOOGLE_PRIVATE_KEY="([\s\S]+?)"\r?\n/);

const clientEmail = emailMatch ? emailMatch[1].trim() : '';
let privateKey = keyMatch ? keyMatch[1].replace(/\\n/g, '\n') : '';

const SPREADSHEET_ID = '1YjmID_bKiUMAd7zK3bCXQCKVEGl-GYTSP8NdE-Lryz0';

async function checkNTHDetails() {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Check sheet NTH
  console.log('Checking sheet "NTH"...');
  const resNTH = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'NTH'!A1:M1634",
  });
  const nthRows = resNTH.data.values || [];
  const nthDepts = new Set();
  const nthNgoaiRows = [];
  for (const r of nthRows) {
    if (r[1]) {
      nthDepts.add(r[1]);
      if (r[1].toLowerCase().includes('ngoại')) {
        nthNgoaiRows.push(r);
      }
    }
  }
  console.log('Unique departments in sheet "NTH":', [...nthDepts]);
  console.log(`Rows in "NTH" with "ngoại": ${nthNgoaiRows.length}`);

  // 2. Check sheet "NTH."
  console.log('\nChecking sheet "NTH."...');
  const resNTHDot = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'NTH.'!A1:M4385",
  });
  const nthDotRows = resNTHDot.data.values || [];
  const nthDotDepts = new Set();
  const nthDotNgoaiRows = [];
  for (const r of nthDotRows) {
    if (r[1]) {
      nthDotDepts.add(r[1]);
      if (r[1].toLowerCase().includes('ngoại')) {
        nthDotNgoaiRows.push(r);
      }
    }
  }
  console.log('Unique departments in sheet "NTH.":', [...nthDotDepts]);
  console.log(`Rows in "NTH." with "ngoại": ${nthDotNgoaiRows.length}`);

  // 3. Check sheet "Ngoại"
  console.log('\nChecking sheet "Ngoại"...');
  const resNgoai = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Ngoại'!A1:M8134",
  });
  const ngoaiRows = resNgoai.data.values || [];
  const ngoaiDepts = new Set();
  const uniqueMachinesInNgoai = new Map();
  for (const r of ngoaiRows) {
    if (r[1]) ngoaiDepts.add(r[1]);
    const code = r[2];
    if (code && !uniqueMachinesInNgoai.has(code)) {
      uniqueMachinesInNgoai.set(code, {
        date: r[0],
        dept: r[1],
        code: r[2],
        name: r[3],
        location: r[4],
        manager: r[5],
        users: r[6],
        condition: r[9],
      });
    }
  }
  console.log('Unique departments in sheet "Ngoại":', [...ngoaiDepts]);
  console.log(`Unique machine codes in sheet "Ngoại": ${uniqueMachinesInNgoai.size}`);
  
  // Compare with the 35 codes from DANH MỤC THIẾT BỊ
  const rawItems = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted_equipment.json'), 'utf-8'));
  const catalogCodes = new Set(rawItems.map(x => x.code));

  console.log(`Machines in catalog: ${catalogCodes.size}`);
  let inBoth = 0;
  for (const code of catalogCodes) {
    if (uniqueMachinesInNgoai.has(code)) {
      inBoth++;
    } else {
      console.log(`Catalog code NOT in sheet Ngoại: ${code}`);
    }
  }
  console.log(`Machines in both Catalog & sheet Ngoại: ${inBoth} / ${catalogCodes.size}`);

  let extraInNgoai = 0;
  for (const [code, info] of uniqueMachinesInNgoai.entries()) {
    if (!catalogCodes.has(code) && code !== 'Mã máy') {
      console.log(`Extra machine in sheet Ngoại NOT in 35 catalog items:`, code, info.name);
      extraInNgoai++;
    }
  }
  console.log(`Extra machines in sheet Ngoại: ${extraInNgoai}`);
}

checkNTHDetails().catch(console.error);
