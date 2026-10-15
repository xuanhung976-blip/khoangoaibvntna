/** Bỏ dấu tiếng Việt + chữ thường để tìm kiếm không phân biệt dấu. */
export const fold = (value: unknown): string =>
  String(value ?? '')
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Khớp truy vấn với nhiều trường: mọi từ trong truy vấn phải xuất hiện ở ít nhất một trường.
 * "ng van a" khớp "Nguyễn Văn An".
 */
export const matchesQuery = (query: string, ...fields: unknown[]): boolean => {
  const q = fold(query);
  if (!q) return true;
  const haystack = fields.map(fold).join(' | ');
  return q.split(' ').every(term => haystack.includes(term));
};

/** Điểm liên quan đơn giản cho bảng lệnh: khớp đầu chuỗi được ưu tiên hơn. */
export const relevance = (query: string, ...fields: unknown[]): number => {
  const q = fold(query);
  if (!q) return 1;
  let best = 0;
  for (const field of fields) {
    const value = fold(field);
    if (!value) continue;
    if (value === q) best = Math.max(best, 100);
    else if (value.startsWith(q)) best = Math.max(best, 80);
    else if (value.split(' ').some(word => word.startsWith(q))) best = Math.max(best, 60);
    else if (value.includes(q)) best = Math.max(best, 40);
    else if (q.split(' ').every(term => value.includes(term))) best = Math.max(best, 25);
  }
  return best;
};

/** Chữ cái đầu cho avatar: "BS. Nguyễn Văn An" -> "NA" (họ + tên). */
export const initials = (name: unknown): string => {
  const parts = shortName(name)
    .replace(/^(bs|đd|dd|ths|ts|pgs|cn)\.?\s+/i, '')
    .trim()
    .split(/\s+/)
    .filter(part => /^\p{L}/u.test(part));
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

/** Rút gọn họ tên dạng "BS. Nguyễn Văn An" -> "Nguyễn Văn An" để hiển thị gọn. */
export const shortName = (name: unknown): string => {
  const value = String(name ?? '').trim();
  if (!value) return '';
  const parts = value.split('.');
  return parts[parts.length - 1].trim() || value;
};

export const toNumber = (value: unknown, fallback = 0): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const toBool = (value: unknown): boolean =>
  value === true || value === 'TRUE' || value === 'true' || value === '1' || value === 1;

export const plural = (count: number, unit: string) => `${count.toLocaleString('vi-VN')} ${unit}`;

/** Chỉ cho phép liên kết http(s) để tránh chèn mã qua "javascript:". */
export const safeUrl = (value: unknown): string => {
  const url = String(value ?? '').trim();
  return /^https?:\/\//i.test(url) ? url : '';
};

/** Tên gọn cho ô hẹp: "BS. Nguyễn Xuân Hùng" -> "Xuân Hùng". */
export const compactName = (name: unknown): string => {
  const parts = shortName(name).split(/\s+/).filter(Boolean);
  return parts.length > 2 ? parts.slice(-2).join(' ') : parts.join(' ');
};
