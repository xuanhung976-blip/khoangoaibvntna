import { APP_LOGO_URL } from '../types';
import { fmtDate, todayKey } from './dates';

export const escapeHtml = (value: unknown): string =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export type PrintColumn = { label: string; width?: string; align?: 'left' | 'center' | 'right' };

export type PrintOptions = {
  title: string;
  subtitle?: string;
  columns: PrintColumn[];
  rows: Array<Array<string | number | null | undefined>>;
  /** Tiêu đề các ô ký tên ở cuối trang (trái → phải). */
  signers?: string[];
  signerName?: string;
  landscape?: boolean;
  /** Đoạn văn bản tự do in trước bảng (đã được escape). */
  intro?: string;
};

/** Mở cửa sổ in A4 theo mẫu biểu của khoa. Toàn bộ dữ liệu được escape để tránh chèn HTML. */
export function printTable(options: PrintOptions): boolean {
  const win = window.open('', '_blank');
  if (!win) return false;

  const signers = options.signers || [];
  const html = `<!DOCTYPE html>
<html lang="vi"><head><meta charset="UTF-8"><title>${escapeHtml(options.title)}</title>
<style>
  @page { size: A4 ${options.landscape === false ? 'portrait' : 'landscape'}; margin: 8mm 10mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Times New Roman', serif; color: #000; margin: 0; font-size: 11pt; }
  .head { display: flex; justify-content: space-between; align-items: center; border-bottom: 1.5px solid #000; padding-bottom: 6px; }
  .brand { display: flex; gap: 10px; align-items: center; }
  .brand img { width: 46px; height: 46px; border-radius: 50%; object-fit: cover; }
  .hospital { font-weight: bold; text-transform: uppercase; font-size: 11pt; }
  .dept { font-weight: bold; text-transform: uppercase; font-size: 10pt; }
  .motto { text-align: center; font-size: 10pt; }
  .motto b { display: block; }
  h1 { text-align: center; font-size: 15pt; text-transform: uppercase; margin: 14px 0 2px; }
  .sub { text-align: center; font-style: italic; font-size: 10.5pt; margin-bottom: 8px; }
  .intro { white-space: pre-line; margin: 8px 0; font-size: 11pt; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; margin-top: 8px; }
  th, td { border: 1px solid #000; padding: 4px 6px; font-size: 10pt; vertical-align: top; word-wrap: break-word; }
  th { background: #efefef; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
  .signs { display: flex; justify-content: space-around; margin-top: 22px; page-break-inside: avoid; }
  .sign { text-align: center; min-width: 200px; }
  .sign .t { font-weight: bold; margin-bottom: 56px; }
</style></head><body>
<div class="head">
  <div class="brand"><img src="${escapeHtml(APP_LOGO_URL)}" alt="" referrerpolicy="no-referrer" />
    <div><div class="hospital">Bệnh viện Nội tiết Nghệ An</div><div class="dept">Khoa Ngoại Tổng Hợp</div></div>
  </div>
  <div class="motto"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b>Độc lập - Tự do - Hạnh phúc</div>
</div>
<h1>${escapeHtml(options.title)}</h1>
${options.subtitle ? `<div class="sub">${escapeHtml(options.subtitle)}</div>` : ''}
${options.intro ? `<div class="intro">${escapeHtml(options.intro)}</div>` : ''}
${options.columns.length ? `<table><thead><tr>${options.columns
    .map(col => `<th style="${col.width ? `width:${col.width};` : ''}">${escapeHtml(col.label)}</th>`)
    .join('')}</tr></thead><tbody>${options.rows
    .map(
      row =>
        `<tr>${row
          .map((cell, index) => {
            const align = options.columns[index]?.align;
            return `<td style="${align ? `text-align:${align};` : ''}">${escapeHtml(cell ?? '')}</td>`;
          })
          .join('')}</tr>`,
    )
    .join('')}</tbody></table>` : ''}
${signers.length ? `<div class="signs">${signers
    .map((title, index) => {
      const isLast = index === signers.length - 1;
      return `<div class="sign">${isLast ? `<div><i>Ngày ${escapeHtml(fmtDate(todayKey()).replace(/\//g, ' / '))}</i></div>` : '<div>&nbsp;</div>'}<div class="t">${escapeHtml(title)}</div>${isLast && options.signerName ? `<div><b>${escapeHtml(options.signerName)}</b></div>` : ''}</div>`;
    })
    .join('')}</div>` : ''}
<script>window.onload = function () { setTimeout(function () { window.print(); }, 250); };</script>
</body></html>`;

  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
