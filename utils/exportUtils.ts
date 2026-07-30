import * as XLSX from 'xlsx';

/**
 * Robustly calculates patient age from various date/year formats:
 * - DD/MM/YYYY or DD-MM-YYYY (e.g. "15/08/1985", "15-08-1985")
 * - YYYY-MM-DD or YYYY/MM/DD (e.g. "1985-08-15")
 * - 4-digit Year (e.g. "1985" or 1985)
 * - Direct Age integer (e.g. 45 or "45")
 * - Handles empty/null/undefined and epoch 1970 zero-dates (returns '' instead of 56T)
 */
export const getAge = (dob: unknown): number | string => {
  if (dob === undefined || dob === null) return '';
  const str = String(dob).trim();
  if (
    !str ||
    str === '0' ||
    str === '1970' ||
    str.startsWith('1970-01-01') ||
    str.startsWith('1970/01/01')
  ) {
    return '';
  }

  const currentYear = new Date().getFullYear(); // 2026

  // Case 1: Direct age integer (1 - 120)
  const num = Number(str);
  if (Number.isInteger(num) && num > 0 && num <= 120) {
    return num;
  }

  // Case 2: 4-digit year (e.g. "1985")
  if (/^\d{4}$/.test(str)) {
    const year = parseInt(str, 10);
    if (year > 1970 && year <= currentYear) {
      return Math.max(0, currentYear - year);
    }
    return '';
  }

  // Case 3: DD/MM/YYYY or DD-MM-YYYY or D/M/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/);
  if (ddmmyyyy) {
    const year = parseInt(ddmmyyyy[3], 10);
    if (year > 1970 && year <= currentYear) {
      return Math.max(0, currentYear - year);
    }
    return '';
  }

  // Case 4: YYYY-MM-DD or YYYY/MM/DD
  const yyyymmdd = str.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    if (year > 1970 && year <= currentYear) {
      return Math.max(0, currentYear - year);
    }
    return '';
  }

  // Case 5: Standard JS Date string (e.g. "1985-08-15T00:00:00.000Z")
  const parsedDate = new Date(str);
  if (!isNaN(parsedDate.getTime())) {
    const year = parsedDate.getFullYear();
    if (year > 1970 && year <= currentYear) {
      return currentYear - year;
    }
  }

  return '';
};

export interface ExcelExportOptions {
  fileName: string;
  sheetName?: string;
  title?: string;
  subtitle?: string;
  headers: string[];
  rows: (string | number | boolean)[][];
  signers?: string[];
  creatorName?: string;
}

/**
 * Export data to a formatted Microsoft Excel (.xlsx) file, mirroring the PDF print page layout.
 */
export const exportToExcel = ({
  fileName,
  sheetName = 'Danh sách',
  title,
  subtitle,
  headers,
  rows,
  signers,
  creatorName,
}: ExcelExportOptions) => {
  const sheetData: (string | number | boolean)[][] = [];

  // 1. Hospital Branding Header
  sheetData.push(['BỆNH VIỆN NỘI TIẾT NGHỆ AN']);
  sheetData.push(['KHOA NGOẠI TỔNG HỢP']);
  sheetData.push([]); // Blank line

  // 2. Document Title & Subtitle
  if (title) {
    sheetData.push([title.toUpperCase()]);
  }
  if (subtitle) {
    sheetData.push([subtitle]);
  }
  sheetData.push([]); // Blank line

  // 3. Table Column Headers
  sheetData.push(headers);

  // 4. Data Rows
  rows.forEach(row => sheetData.push(row));

  // 5. Signature Footer Block (Matching PDF Print Page Layout)
  if (signers && signers.length > 0) {
    sheetData.push([]); // Blank line
    
    // Date row
    const dateRow: string[] = new Array(headers.length).fill('');
    dateRow[headers.length - 1] = 'Ngày ..... tháng ..... năm .....';
    sheetData.push(dateRow);

    // Title row
    const signRow: string[] = new Array(headers.length).fill('');
    if (signers.length === 1) {
      signRow[headers.length - 1] = signers[0];
    } else if (signers.length === 2) {
      signRow[0] = signers[0];
      signRow[headers.length - 1] = signers[1];
    }
    sheetData.push(signRow);

    // Blank space for signatures
    sheetData.push([]);
    sheetData.push([]);
    sheetData.push([]);

    // Creator Name row
    if (creatorName) {
      const nameRow: string[] = new Array(headers.length).fill('');
      nameRow[headers.length - 1] = creatorName;
      sheetData.push(nameRow);
    }
  }

  // Create Worksheet
  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Auto Column Width Calculation
  const colWidths = headers.map((h, colIdx) => {
    let maxLen = h.toString().length;
    rows.forEach(r => {
      const cellVal = r[colIdx] !== undefined && r[colIdx] !== null ? r[colIdx].toString() : '';
      if (cellVal.length > maxLen) maxLen = cellVal.length;
    });
    return { wch: Math.min(Math.max(maxLen + 4, 12), 55) };
  });
  ws['!cols'] = colWidths;

  // Create Workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  // Download File
  const finalFileName = fileName.endsWith('.xlsx') ? fileName : `${fileName}.xlsx`;
  XLSX.writeFile(wb, finalFileName);
};
