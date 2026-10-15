import { beforeEach, describe, expect, it, vi } from 'vitest';

const storage = new Map<string, string>();

const makeResponse = (data: unknown, proof = '') => ({
  ok: true,
  status: 200,
  headers: new Headers(proof ? { 'X-Clinical-Session-Proof': proof } : {}),
  json: async () => ({ success: true, data }),
});

beforeEach(() => {
  vi.resetModules();
  storage.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
});

describe('clinicalApiService read cache', () => {
  it('gộp request patients đang chạy và dùng cache theo session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse([{ id: 'BN1' }], 'proof-1'));
    vi.stubGlobal('fetch', fetchMock);
    const api = await import('./clinicalApiService');

    const [first, second] = await Promise.all([
      api.getPatients('session-a'),
      api.getPatients('session-a'),
    ]);
    const cached = await api.getPatients('session-a');

    expect(first).toEqual(second);
    expect(cached).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(storage.get('app_clinical_session_proof')).toBe('proof-1');
  });

  it('bypass cache tạo request mới và gửi proof đã lưu', async () => {
    storage.set('app_clinical_session_proof', 'proof-existing');
    const fetchMock = vi.fn().mockResolvedValue(makeResponse([{ id: 'BN1' }]));
    vi.stubGlobal('fetch', fetchMock);
    const api = await import('./clinicalApiService');

    await api.getPatients('session-a');
    await api.getPatients('session-a', true);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const headers = (fetchMock.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['X-Clinical-Session-Proof']).toBe('proof-existing');
  });

  it('không dùng cache của session khác', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse([]));
    vi.stubGlobal('fetch', fetchMock);
    const api = await import('./clinicalApiService');

    await api.getPatients('session-a');
    await api.getPatients('session-b');

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});

