// Transport layer abstraction for frontend -> Vercel API calls.

const env =
  (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const API_ENDPOINT = env.DEV && env.VITE_API_URL ? env.VITE_API_URL : '/api/rpc';

const USE_MOCK =
  env.VITE_USE_MOCK === 'true' ||
  (env.DEV && env.VITE_USE_MOCK !== 'false');

type RpcPayload = {
  funcName: string;
  args: any[];
};

export class ApiClientError extends Error {
  code?: string;
  status?: number;
  detail?: any;

  constructor(message: string, code?: string, status?: number, detail?: any) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.detail = detail;
  }
}

function getErrorMessage(value: any, fallback: string) {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  return value.error || value.message || fallback;
}

function getErrorCode(value: any) {
  if (!value || typeof value !== 'object') return undefined;
  return value.code || value.errorCode;
}

function normalizeResponse<T>(value: any): T {
  if (
    value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'success' in value
  ) {
    if (value.success === false) {
      throw new ApiClientError(
        getErrorMessage(value, 'API request failed'),
        getErrorCode(value),
        undefined,
        value.detail,
      );
    }

    if ('data' in value) {
      return value.data as T;
    }
  }

  return value as T;
}

// Generic fetch-based client. The endpoint parameter is kept for the
// existing dataService contract; production uses same-origin /api/rpc.
export async function callApi<T = any>(
  endpoint: string,
  payload?: any,
): Promise<T> {
  if (USE_MOCK) {
    console.warn(
      '[MOCK API ENABLED] Using local mock responses. Set VITE_USE_MOCK=false and run through Vercel /api/rpc to call the real API in development.',
      endpoint,
    );
    return mockResponse<T>(endpoint, payload);
  }

  const url = endpoint || API_ENDPOINT;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: payload !== undefined ? JSON.stringify(payload) : undefined,
    });

    const text = await res.text();
    let parsed: any;

    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      const preview = text.slice(0, 200);
      const isPreviewApiMiss =
        res.status === 404 &&
        url === '/api/rpc' &&
        (preview.includes('<!DOCTYPE html') || preview.includes('<html'));
      throw new ApiClientError(
        isPreviewApiMiss
          ? 'Không tìm thấy API /api/rpc. Khi test local fullstack, hãy chạy bằng vercel dev thay vì npm run preview.'
          : `API returned non-JSON response (${res.status}). ${preview}`,
        isPreviewApiMiss ? 'RPC_ROUTE_MISSING' : 'RPC_BAD_RESPONSE',
        res.status,
        preview,
      );
    }

    if (!res.ok) {
      if (res.status === 404 && url === '/api/rpc') {
        throw new ApiClientError(
          'Không tìm thấy API /api/rpc. Khi test local fullstack, hãy chạy bằng vercel dev thay vì npm run preview.',
          'RPC_ROUTE_MISSING',
          res.status,
          parsed,
        );
      }
      throw new ApiClientError(
        getErrorMessage(parsed, `API request failed with status ${res.status}`),
        getErrorCode(parsed),
        res.status,
        parsed?.detail,
      );
    }

    return normalizeResponse<T>(parsed);
  } catch (err) {
    console.error('[API ERROR]', {
      endpoint: url,
      funcName: payload?.funcName,
      code: err instanceof ApiClientError ? err.code : undefined,
      status: err instanceof ApiClientError ? err.status : undefined,
      message: err instanceof Error ? err.message : String(err),
    });
    if (err instanceof ApiClientError) throw err;

    const message = err instanceof Error ? err.message : String(err);
    if (message === 'Failed to fetch' || message.includes('NetworkError')) {
      throw new ApiClientError(
        'Không kết nối được máy chủ. Vui lòng kiểm tra API/Vercel/GAS.',
        'RPC_NETWORK_ERROR',
      );
    }
    throw new ApiClientError(message || 'API request failed', 'RPC_CLIENT_ERROR');
  }
}

async function mockResponse<T>(endpoint: string, payload?: any): Promise<T> {
  console.warn('[MOCK API]', endpoint, payload);

  const rpc: RpcPayload | undefined = payload;
  const funcName = rpc?.funcName;
  const args = rpc?.args ?? [];

  switch (funcName) {
    case 'apiGet':
      return [] as T;

    case 'getDashboardOverview':
      return {
        clinical: { total: 0, waitingSurgery: 0, vip: 0, discharged: 0 },
        surgery: { monthTotal: 0, approved: 0 },
        science: { ongoing: 0, meetingsMonth: 0 },
        admin: { briefingToday: null, overdueTasks: 0 },
        inventory: { medsNearExpiry: 0, equipOverdue: 0 },
        onCall: { doctor: '---', nurse1: '---', nurse2: '---' },
        deadlines: [],
      } as T;

    case 'loginUser': {
      const [username] = args;
      return {
        username: username || 'demo',
        fullName: 'Tai khoan Demo',
        role: 'TRUONG_KHOA',
        nhomChuyenMon: 'BS',
        active: true,
        createdAt: new Date().toISOString(),
        canDeletePatient: true,
      } as T;
    }

    default:
      return { success: true } as T;
  }
}
