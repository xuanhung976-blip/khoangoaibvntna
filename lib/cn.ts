type ClassValue = string | number | false | null | undefined | ClassValue[] | Record<string, unknown>;

/** Ghép className có điều kiện (bản rút gọn của clsx). */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  const walk = (value: ClassValue) => {
    if (!value) return;
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value));
    } else if (Array.isArray(value)) {
      value.forEach(walk);
    } else if (typeof value === 'object') {
      for (const [key, enabled] of Object.entries(value)) if (enabled) out.push(key);
    }
  };
  values.forEach(walk);
  return out.join(' ');
}
