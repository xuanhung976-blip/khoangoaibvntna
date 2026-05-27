// Transport layer abstraction for frontend -> backend calls.

const env =
  (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

const API_URL = env.VITE_API_URL || '';

const USE_MOCK =
  env.VITE_USE_MOCK === 'true' ||
  (env.DEV && env.VITE_USE_MOCK !== 'false');

type RpcPayload = {
  funcName: string;
  args: any[];
};

// Generic fetch-based client. The endpoint parameter is kept for the
// existing dataService contract; GAS receives the RPC payload directly.
export async function callApi<T = any>(
  endpoint: string,
  payload?: any,
): Promise<T> {
  if (USE_MOCK) {
    console.warn(
      '[MOCK API ENABLED] Using local mock responses. Set VITE_USE_MOCK=false and VITE_API_URL to call the real API in development.',
      endpoint,
    );
    return mockResponse<T>(endpoint, payload);
  }

  if (!API_URL) {
    throw new Error('Missing VITE_API_URL. Set it to the Google Apps Script Web App API URL.');
  }

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: payload !== undefined ? JSON.stringify(payload) : undefined,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `API request failed with status ${res.status}`);
  }

  return (await res.json()) as T;
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
