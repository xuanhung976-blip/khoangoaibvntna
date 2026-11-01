const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const envLocal = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const emailMatch = envLocal.match(/GOOGLE_SERVICE_ACCOUNT_EMAIL=(.+)/);
const keyMatch = envLocal.match(/GOOGLE_PRIVATE_KEY="([\s\S]+?)"\r?\n/);

const clientEmail = emailMatch ? emailMatch[1].trim() : '';
let privateKey = keyMatch ? keyMatch[1].replace(/\\n/g, '\n') : '';

const SPREADSHEET_ID = '1YjmID_bKiUMAd7zK3bCXQCKVEGl-GYTSP8NdE-Lryz0';

async function inspectNTH() {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  for (const sheetName of ['NTH', 'NTH.', 'Ngoại']) {
    console.log(`\n================== SHEET: "${sheetName}" ==================`);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${sheetName}'!A1:N20`,
    });
    const rows = res.data.values || [];
    console.log(`Total rows retrieved in range: ${rows.length}`);
    rows.slice(0, 10).forEach((r, i) => {
      console.log(`Row ${i + 1}:`, JSON.stringify(r));
    });
  }
}

inspectNTH().catch(console.error);
