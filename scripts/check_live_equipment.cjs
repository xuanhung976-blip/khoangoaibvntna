const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const envLocal = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const sheetIdMatch = envLocal.match(/GOOGLE_SHEET_ID=(.+)/);
const emailMatch = envLocal.match(/GOOGLE_SERVICE_ACCOUNT_EMAIL=(.+)/);
const keyMatch = envLocal.match(/GOOGLE_PRIVATE_KEY="([\s\S]+?)"\r?\n/);

const SPREADSHEET_ID = sheetIdMatch ? sheetIdMatch[1].trim() : '';
const clientEmail = emailMatch ? emailMatch[1].trim() : '';
let privateKey = keyMatch ? keyMatch[1].replace(/\\n/g, '\n') : '';

async function run() {
  console.log('Connecting to Google Sheets ID:', SPREADSHEET_ID);
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetNames = meta.data.sheets.map(s => s.properties.title);
  console.log('Sheet names:', sheetNames);
  if (sheetNames.includes('May_Moc')) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: 'May_Moc!A1:J10',
    });
    console.log('May_Moc existing data:', res.data.values);
  } else {
    console.log('May_Moc sheet DOES NOT EXIST');
  }
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
