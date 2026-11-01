const fs = require('fs');
const { google } = require('googleapis');
const path = require('path');
const { randomUUID } = require('crypto');

const envLocal = fs.readFileSync(path.join(__dirname, '../.env.local'), 'utf-8');
const sheetIdMatch = envLocal.match(/GOOGLE_SHEET_ID=(.+)/);
const emailMatch = envLocal.match(/GOOGLE_SERVICE_ACCOUNT_EMAIL=(.+)/);
const keyMatch = envLocal.match(/GOOGLE_PRIVATE_KEY="([\s\S]+?)"\r?\n/);

const SPREADSHEET_ID = sheetIdMatch ? sheetIdMatch[1].trim() : '';
const clientEmail = emailMatch ? emailMatch[1].trim() : '';
let privateKey = keyMatch ? keyMatch[1].replace(/\\n/g, '\n') : '';

const rawItems = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted_equipment.json'), 'utf-8'));

console.log(`Loaded ${rawItems.length} items from extracted_equipment.json`);

const mappedRows = rawItems.map((item, idx) => {
  const id = `eq_${item.stt}_${randomUUID().slice(0, 8)}`;
  const name = item.name.trim();
  const code = item.code.trim();
  const inCharge = 'Tổ TTBYT Khoa Ngoại';
  const purchaseDate = item.usageYear && item.usageYear !== '0' ? `${item.usageYear}-01-01` : '';
  const lastMaintenanceDate = '2026-01-15';
  const maintenanceCycle = 12;
  const condition = 'Normal';
  const notes = `Model: ${item.model.trim()} | Hãng: ${item.manufacturer.trim()} (${item.origin.trim()}) | SL: ${item.quantity.trim()}`;

  return {
    id,
    name,
    code,
    inCharge,
    purchaseDate,
    lastMaintenanceDate,
    maintenanceCycle,
    condition,
    notes,
    sheetRow: [
      id,
      name,
      code,
      inCharge,
      purchaseDate,
      lastMaintenanceDate,
      maintenanceCycle,
      condition,
      notes
    ]
  };
});

async function syncToGoogleSheet() {
  console.log('Authenticating with Google Sheets...');
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const headers = ['ID', 'Name', 'Code', 'InCharge', 'PurchaseDate', 'LastMaintenanceDate', 'MaintenanceCycle', 'Condition', 'Notes'];
  const allRows = [headers, ...mappedRows.map(r => r.sheetRow)];

  console.log(`Writing ${allRows.length} rows (including header) to May_Moc in spreadsheet ${SPREADSHEET_ID}...`);

  // Clear existing content in May_Moc
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: 'May_Moc!A1:Z500',
  });

  // Update with new data
  const res = await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `May_Moc!A1:I${allRows.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: allRows,
    },
  });

  console.log('Successfully updated May_Moc in Google Sheets:', res.data.updatedRows, 'rows updated.');
}

syncToGoogleSheet().catch(err => {
  console.error('Error syncing to Google Sheet:', err);
  process.exit(1);
});
