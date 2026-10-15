import { useCallback, useEffect, useReducer } from 'react';

/**
 * Bộ nhớ đệm dữ liệu dùng chung giữa các trang (stale-while-revalidate):
 * - Chuyển trang hiển thị ngay dữ liệu đã có, đồng thời tải lại nền khi dữ liệu cũ.
 * - Nhiều component cùng khóa chỉ gọi API một lần.
 * - Sau khi ghi dữ liệu, gọi invalidate(key) để mọi nơi đang dùng khóa đó tải lại.
 */

export type LoadOptions = { bypassCache?: boolean };
type Loader<T> = (options?: LoadOptions) => Promise<T>;

type Entry = {
  data?: unknown;
  error?: unknown;
  updatedAt: number;
  promise?: Promise<unknown>;
  loader?: Loader<unknown>;
};

const DEFAULT_STALE_MS = 45_000;
const entries = new Map<string, Entry>();
const subscribers = new Map<string, Set<() => void>>();

const notify = (key: string) => subscribers.get(key)?.forEach(fn => fn());

const subscribe = (key: string, fn: () => void) => {
  let set = subscribers.get(key);
  if (!set) {
    set = new Set();
    subscribers.set(key, set);
  }
  set.add(fn);
  return () => {
    set!.delete(fn);
  };
};

export function revalidate<T>(key: string, loader?: Loader<T>, options?: LoadOptions): Promise<T> {
  const entry: Entry = entries.get(key) || { updatedAt: 0 };
  const effectiveLoader = (loader || entry.loader) as Loader<T> | undefined;
  if (!effectiveLoader) return Promise.resolve(entry.data as T);
  entry.loader = effectiveLoader as Loader<unknown>;
  if (entry.promise && !options?.bypassCache) return entry.promise as Promise<T>;

  const promise = effectiveLoader(options)
    .then(data => {
      if (entry.promise === promise) {
        entry.data = data;
        entry.error = undefined;
        entry.updatedAt = Date.now();
      }
      return data;
    })
    .catch(error => {
      if (entry.promise === promise) entry.error = error;
      throw error;
    })
    .finally(() => {
      if (entry.promise === promise) entry.promise = undefined;
      notify(key);
    });

  entry.promise = promise;
  entries.set(key, entry);
  notify(key);
  return promise;
}

/** Đánh dấu dữ liệu cũ và tải lại (bỏ qua cache máy chủ) cho các khóa có tiền tố tương ứng. */
export function invalidate(...prefixes: string[]) {
  for (const [key, entry] of entries) {
    if (!prefixes.some(prefix => key === prefix || key.startsWith(`${prefix}:`))) continue;
    entry.updatedAt = 0;
    if (subscribers.get(key)?.size) {
      revalidate(key, undefined, { bypassCache: true }).catch(() => undefined);
    }
  }
}

/** Cập nhật lạc quan dữ liệu trong cache (ví dụ đổi thứ tự ca mổ ngay lập tức). */
export function mutateCache<T>(key: string, updater: (current: T | undefined) => T) {
  const entry = entries.get(key) || { updatedAt: Date.now() };
  entry.data = updater(entry.data as T | undefined);
  entries.set(key, entry);
  notify(key);
}

export function peekCache<T>(key: string): T | undefined {
  return entries.get(key)?.data as T | undefined;
}

export function clearResourceCache() {
  entries.clear();
  subscribers.forEach((_, key) => notify(key));
}

export type ResourceState<T> = {
  data: T | undefined;
  error: unknown;
  /** Lần tải đầu tiên, chưa có dữ liệu. */
  loading: boolean;
  /** Đang tải (kể cả tải lại nền). */
  validating: boolean;
  updatedAt: number;
  reload: (options?: LoadOptions) => Promise<T | undefined>;
};

export function useResource<T>(
  key: string | null,
  loader: Loader<T>,
  options?: { staleMs?: number },
): ResourceState<T> {
  const [, rerender] = useReducer((x: number) => x + 1, 0);
  const staleMs = options?.staleMs ?? DEFAULT_STALE_MS;

  useEffect(() => {
    if (!key) return;
    const unsubscribe = subscribe(key, rerender);
    const entry = entries.get(key);
    if (!entry || (!entry.promise && Date.now() - entry.updatedAt > staleMs)) {
      revalidate(key, loader).catch(() => undefined);
    } else if (!entry.loader) {
      entry.loader = loader as Loader<unknown>;
    }
    return unsubscribe;
    // loader thay đổi theo mỗi render; khóa là định danh của tài nguyên.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, staleMs]);

  const reload = useCallback(
    (reloadOptions?: LoadOptions) =>
      key
        ? revalidate(key, loader, reloadOptions ?? { bypassCache: true }).catch(() => undefined)
        : Promise.resolve(undefined),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const entry = key ? entries.get(key) : undefined;
  return {
    data: entry?.data as T | undefined,
    error: entry?.error,
    loading: Boolean(key) && entry?.data === undefined && !entry?.error,
    validating: Boolean(entry?.promise),
    updatedAt: entry?.updatedAt || 0,
    reload,
  };
}
