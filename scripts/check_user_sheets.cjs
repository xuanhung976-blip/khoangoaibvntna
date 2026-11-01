const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const envLocal = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const emailMatch = envLocal.match(/GOOGLE_SERVICE_ACCOUNT_EMAIL=(.+)/);
const keyMatch = envLocal.match(/GOOGLE_PRIVATE_KEY="([\s\S]+?)"\r?\n/);

const clientEmail = emailMatch ? emailMatch[1].trim() : '';
let privateKey = keyMatch ? keyMatch[1].replace(/\\n/g, '\n') : '';

const SPREADSHEET_ID = '1YjmID_bKiUMAd7zK3bCXQCKVEGl-GYTSP8NdE-Lryz0';

async function checkSheets() {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
    console.log('Sheets in user spreadsheet:');
    for (const s of meta.data.sheets) {
      console.log(`- Title: "${s.properties.title}", sheetId: ${s.properties.sheetId}, rows: ${s.properties.gridProperties?.rowCount}`);
    }
  } catch (e) {
    console.error('Service account error:', e.message);
  }
}

checkSheets();
