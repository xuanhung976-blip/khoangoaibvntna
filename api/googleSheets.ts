import { google, sheets_v4 } from 'googleapis';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

function loadLocalEnvIfNeeded() {
  if (
    process.env.GOOGLE_SHEET_ID &&
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL &&
    process.env.GOOGLE_PRIVATE_KEY
  ) {
    return;
  }

  for (const fileName of ['.env.local', '.env']) {
    const envPath = path.join(process.cwd(), fileName);
    if (!fs.existsSync(envPath)) continue;

    const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;

      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim();

      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      process.env[key] ||= value;
    }
  }
}

loadLocalEnvIfNeeded();

const SHEET_ID = process.env.GOOGLE_SHEET_ID;
const SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const RAW_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;

if (!SHEET_ID || !SERVICE_ACCOUNT_EMAIL || !RAW_PRIVATE_KEY) {
  // We throw lazily inside helpers to avoid breaking build-time.
  // Runtime calls without proper env will receive clear 500 errors.
}

let sheetsClient: sheets_v4.Sheets | null = null;

function getPrivateKey(): string {
  // Support \n-escaped private keys from env.
  return RAW_PRIVATE_KEY ? RAW_PRIVATE_KEY.replace(/\\n/g, '\n') : '';
}

function getSheetsClient(): sheets_v4.Sheets {
  if (!SHEET_ID || !SERVICE_ACCOUNT_EMAIL || !RAW_PRIVATE_KEY) {
    throw new Error('Google Sheets credentials are not fully configured');
  }

  if (sheetsClient) return sheetsClient;

  const auth = new google.auth.JWT({
    email: SERVICE_ACCOUNT_EMAIL,
    key: getPrivateKey(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  sheetsClient = google.sheets({ version: 'v4', auth });
  return sheetsClient;
}

function toCamelCase(str: string): string {
  const s = String(str).trim();
  if (s.toLowerCase() === 'id') return 'id';
  return s.charAt(0).toLowerCase() + s.slice(1);
}

type HeaderMap = {
  headers: string[];
  map: Record<string, number>;
};

async function getHeaderIndexMap(sheetName: string): Promise<HeaderMap> {
  const sheets = getSheetsClient();
  const range = `${sheetName}!1:1`;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID!,
    range,
  });

  const headers = (res.data.values?.[0] as string[] | undefined) ?? [];
  const map: Record<string, number> = {};
  headers.forEach((h, i) => {
    map[toCamelCase(h)] = i;
  });

  return { headers, map };
}

function rowToObject(row: any[], headers: string[]): any {
  const obj: any = {};
  headers.forEach((h, i) => {
    let val = row[i];
    if (val === undefined || val === null) val = '';
    obj[toCamelCase(h)] = val;
  });
  return obj;
}

export async function getRows(sheetName: string): Promise<any[]> {
  const sheets = getSheetsClient();

  const meta = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID!,
    range: `${sheetName}!A1:Z`,
  });

  const values = meta.data.values ?? [];
  if (values.length < 2) return [];

  const headers = values[0] as string[];
  const dataRows = values.slice(1);

  return dataRows.map((row) => rowToObject(row as any[], headers));
}

export async function appendRow(
  sheetName: string,
  data: Record<string, any>,
): Promise<{ id: string }> {
  const sheets = getSheetsClient();
  const { headers } = await getHeaderIndexMap(sheetName);

  const id =
    (typeof data.id === 'string' && data.id.trim()) || randomUUID();

  const newRow = headers.map((h) => {
    const key = toCamelCase(h);
    if (key === 'id') return id;
    const val = data[key];
    return val === undefined || val === null ? '' : val;
  });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID!,
    range: sheetName,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newRow],
    },
  });

  return { id };
}

async function findRowIndexById(
  sheetName: string,
  id: string,
): Promise<{ rowIndex: number; headers: string[]; map: Record<string, number> }> {
  const sheets = getSheetsClient();
  const { headers, map } = await getHeaderIndexMap(sheetName);
  const idCol = sheetName === 'Users' ? map['username'] : map['id'];

  if (idCol === undefined) {
    throw new Error(`Sheet ${sheetName} missing ID column`);
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID!,
    range: `${sheetName}!A2:Z`,
  });

  const values = res.data.values ?? [];
  const search = String(id).trim().toLowerCase();
  let rowIndex = -1;

  for (let i = 0; i < values.length; i++) {
    const row = values[i];
    const cell = row[idCol];
    if (String(cell ?? '').trim().toLowerCase() === search) {
      rowIndex = i + 2; // +1 for header, +1 for 1-based index
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(`Record ID "${id}" not found in ${sheetName}`);
  }

  return { rowIndex, headers, map };
}

export async function updateRowById(
  sheetName: string,
  id: string,
  data: Record<string, any>,
): Promise<void> {
  const sheets = getSheetsClient();
  const { rowIndex, headers } = await findRowIndexById(sheetName, id);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID!,
    range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
  });

  const currentRow = (res.data.values?.[0] as any[] | undefined) ?? [];
  const newRow = [...currentRow];

  headers.forEach((h, colIdx) => {
    const key = toCamelCase(h);
    if (key === 'id') return;
    if (data[key] !== undefined) {
      const v = data[key];
      newRow[colIdx] = v === null || v === undefined ? '' : v;
    }
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID!,
    range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [newRow],
    },
  });
}

export async function deleteRowById(
  sheetName: string,
  id: string,
): Promise<void> {
  const sheets = getSheetsClient();

  // Need sheetId for deleteDimension
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID!,
  });

  const sheet =
    meta.data.sheets?.find((s) => s.properties?.title === sheetName) ?? null;

  if (!sheet || sheet.properties?.sheetId === undefined) {
    throw new Error(`Sheet "${sheetName}" not found`);
  }

  const { rowIndex } = await findRowIndexById(sheetName, id);

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID!,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId: sheet.properties.sheetId,
              dimension: 'ROWS',
              startIndex: rowIndex - 1,
              endIndex: rowIndex,
            },
          },
        },
      ],
    },
  });
}

export async function upsertRowByKeys(
  sheetName: string,
  keyFields: string[],
  data: Record<string, any>,
): Promise<{ created: boolean }> {
  const sheets = getSheetsClient();
  const { headers } = await getHeaderIndexMap(sheetName);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID!,
    range: `${sheetName}!A2:Z`,
  });

  const values = res.data.values ?? [];
  const targetRow = headers.map((h) => {
    const key = toCamelCase(h);
    const val = data[key];
    return val === undefined || val === null ? '' : val;
  });

  const foundIdx = values.findIndex((row) => {
    const obj = rowToObject(row as any[], headers);
    return keyFields.every(
      (field) =>
        String(obj[field] ?? '').trim().toLowerCase() ===
        String(data[field] ?? '').trim().toLowerCase(),
    );
  });

  if (foundIdx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID!,
      range: sheetName,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [targetRow],
      },
    });
    return { created: true };
  }

  const rowIndex = foundIdx + 2;
  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID!,
    range: `${sheetName}!A${rowIndex}:Z${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [targetRow],
    },
  });

  return { created: false };
}
