const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const envLocal = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const emailMatch = envLocal.match(/GOOGLE_SERVICE_ACCOUNT_EMAIL=(.+)/);
const keyMatch = envLocal.match(/GOOGLE_PRIVATE_KEY="([\s\S]+?)"\r?\n/);

const clientEmail = emailMatch ? emailMatch[1].trim() : '';
let privateKey = keyMatch ? keyMatch[1].replace(/\\n/g, '\n') : '';

const SPREADSHEET_ID = '1YjmID_bKiUMAd7zK3bCXQCKVEGl-GYTSP8NdE-Lryz0';

async function inspectLatestStatus() {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const resNgoai = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: "'Ngoại'!A1:M8134",
  });
  const ngoaiRows = resNgoai.data.values || [];

  // Group by code and get the last row
  const latestByCode = new Map();
  for (let i = 2; i < ngoaiRows.length; i++) {
    const r = ngoaiRows[i];
    const date = r[0];
    const code = r[2];
    const name = r[3];
    const location = r[4];
    const manager = r[5];
    const condition = r[9];
    const detail = r[10];

    if (code && code !== 'Mã máy') {
      latestByCode.set(code, {
        date,
        code,
        name,
        location,
        manager,
        condition,
        detail,
      });
    }
  }

  console.log(`Found ${latestByCode.size} machines in sheet Ngoại.`);
  for (const [code, info] of latestByCode.entries()) {
    console.log(`[${info.date}] Code: ${code} | Vị trí: ${info.location} | Phụ trách: ${info.manager} | Tình trạng: ${info.condition}`);
  }
}

inspectLatestStatus().catch(console.error);
