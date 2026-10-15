import { useCallback, useRef, useState } from 'react';
import { invalidate } from '../lib/resource';
import { errorMessage, showToast } from '../components/ui/Toast';

type ActionOptions = {
  success?: string;
  error?: string;
  /** Khóa cache cần tải lại sau khi ghi thành công. */
  invalidate?: string[];
};

/**
 * Chạy thao tác ghi dữ liệu với trạng thái chờ, thông báo kết quả và làm mới cache.
 * Trả về kết quả hoặc undefined nếu lỗi (lỗi đã được thông báo).
 */
export function useAction() {
  const [pending, setPending] = useState<string | null>(null);
  const running = useRef(new Set<string>());

  const run = useCallback(async <T,>(key: string, fn: () => Promise<T>, options: ActionOptions = {}): Promise<T | undefined> => {
    if (running.current.has(key)) return undefined;
    running.current.add(key);
    setPending(key);
    try {
      const result = await fn();
      if (options.success) showToast(options.success, 'success');
      if (options.invalidate?.length) invalidate(...options.invalidate);
      return result;
    } catch (error) {
      showToast(errorMessage(error, options.error || 'Không thực hiện được thao tác'), 'error');
      return undefined;
    } finally {
      running.current.delete(key);
      setPending(current => (current === key ? null : current));
    }
  }, []);

  return { run, pending, isPending: (key: string) => pending === key };
}
