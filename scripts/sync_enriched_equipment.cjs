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

const USER_SHEET_ID = '1YjmID_bKiUMAd7zK3bCXQCKVEGl-GYTSP8NdE-Lryz0';

async function syncEnrichedData() {
  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: clientEmail, private_key: privateKey },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Get latest status from user sheet "Ngoại"
  console.log('Fetching latest real-world info from user sheet "Ngoại"...');
  const resNgoai = await sheets.spreadsheets.values.get({
    spreadsheetId: USER_SHEET_ID,
    range: "'Ngoại'!A1:M8134",
  });
  const ngoaiRows = resNgoai.data.values || [];

  const latestByCode = new Map();
  for (let i = 2; i < ngoaiRows.length; i++) {
    const r = ngoaiRows[i];
    const date = r[0];
    const code = r[2];
    const name = r[3];
    const location = (r[4] || '').trim();
    const manager = (r[5] || '').trim().replace(/^,/, '');
    const condition = (r[9] || '').trim();
    const detail = (r[10] || '').trim();

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

  // 2. Load catalog items
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted_equipment.json'), 'utf-8'));

  const enrichedItems = catalog.map(item => {
    const live = latestByCode.get(item.code) || {};
    const id = `eq_${item.stt}_${randomUUID().slice(0, 8)}`;
    const name = item.name.trim();
    const code = item.code.trim();
    const inCharge = live.manager || 'Tổ TTBYT Khoa Ngoại';
    const purchaseDate = item.usageYear && item.usageYear !== '0' ? `${item.usageYear}-01-01` : '';
    const lastMaintenanceDate = '2026-01-15';
    const maintenanceCycle = 12;
    
    // Condition mapping: 'Hỏng/Lỗi' -> 'Broken', others -> 'Normal'
    const isBroken = live.condition === 'Hỏng/Lỗi';
    const condition = isBroken ? 'Broken' : 'Normal';

    const locationPart = live.location ? `Vị trí: ${live.location} | ` : '';
    const brokenDetail = (isBroken && live.detail) ? ` (${live.detail})` : '';
    const notes = `${locationPart}Model: ${item.model.trim()} | Hãng: ${item.manufacturer.trim()} (${item.origin.trim()}) | SL: ${item.quantity.trim()}${brokenDetail}`;

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

  // 3. Write to live app Google Sheet 'May_Moc'
  console.log(`Updating ${enrichedItems.length} rows to app sheet ${SPREADSHEET_ID}...`);
  const headers = ['ID', 'Name', 'Code', 'InCharge', 'PurchaseDate', 'LastMaintenanceDate', 'MaintenanceCycle', 'Condition', 'Notes'];
  const allRows = [headers, ...enrichedItems.map(r => r.sheetRow)];

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: 'May_Moc!A1:Z500',
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `May_Moc!A1:I${allRows.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: allRows },
  });

  console.log('App Google Sheet May_Moc updated successfully!');

  // 4. Update mockBackend.ts
  const mockCodeLines = enrichedItems.map(item => {
    const parts = [
      `id: uid('E')`,
      `name: ${JSON.stringify(item.name)}`,
      `code: ${JSON.stringify(item.code)}`,
      `inCharge: ${JSON.stringify(item.inCharge)}`,
      item.purchaseDate ? `purchaseDate: ${JSON.stringify(item.purchaseDate)}` : null,
      `lastMaintenanceDate: '2026-01-15'`,
      `maintenanceCycle: 12`,
      `condition: ${JSON.stringify(item.condition)}`,
      `notes: ${JSON.stringify(item.notes)}`
    ].filter(Boolean);

    return `    { ${parts.join(', ')} },`;
  });

  const mockFile = path.join(__dirname, '../services/mockBackend.ts');
  let mockContent = fs.readFileSync(mockFile, 'utf-8');
  const startIdx = mockContent.indexOf('  May_Moc: [');
  const endIdx = mockContent.indexOf('  DeTai_CoSo: [');

  if (startIdx !== -1 && endIdx !== -1) {
    const newMayMocBlock = `  May_Moc: [\n${mockCodeLines.join('\n')}\n  ],\n`;
    mockContent = mockContent.slice(0, startIdx) + newMayMocBlock + mockContent.slice(endIdx);
    fs.writeFileSync(mockFile, mockContent, 'utf-8');
    console.log('mockBackend.ts updated successfully with enriched equipment data!');
  }
}

syncEnrichedData().catch(console.error);
