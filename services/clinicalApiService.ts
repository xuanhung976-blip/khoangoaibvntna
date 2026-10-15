import type { DashboardStats, Patient, VipPatient } from '../types';

type ClinicalResponse<T> = {
  success: boolean;
  data?: T;
  code?: string;
  error?: string;
};

export class ClinicalApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'ClinicalApiError';
    this.code = code;
    this.status = status;
  }
}

const CLINICAL_PROOF_KEY = 'app_clinical_session_proof';

const getClinicalProof = () => {
  try { return localStorage.getItem(CLINICAL_PROOF_KEY) || ''; } catch { return ''; }
};

const saveClinicalProof = (proof: string) => {
  if (!proof) return;
  try { localStorage.setItem(CLINICAL_PROOF_KEY, proof); } catch { /* storage unavailable */ }
};

export const clearClinicalProof = () => {
  try { localStorage.removeItem(CLINICAL_PROOF_KEY); } catch { /* storage unavailable */ }
};

const DEMO_MODE = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK === 'true';

const request = async <T>(action: string, args: any[], sessionToken: string): Promise<T> => {
  if (DEMO_MODE) {
    const { mockClinical } = await import('./mockBackend');
    return mockClinical(action, args) as Promise<T>;
  }
  const clinicalProof = getClinicalProof();
  const response = await fetch('/api/clinical', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
      ...(clinicalProof ? { 'X-Clinical-Session-Proof': clinicalProof } : {}),
    },
    body: JSON.stringify({ action, args }),
  });
  const refreshedProof = response.headers.get('X-Clinical-Session-Proof');
  if (refreshedProof) saveClinicalProof(refreshedProof);
  let result: ClinicalResponse<T>;
  try {
    result = await response.json();
  } catch {
    throw new ClinicalApiError('Clinical API returned a non-JSON response', 'CLINICAL_BAD_RESPONSE', response.status);
  }
  if (!response.ok || result.success === false) {
    if (response.status === 401) clearClinicalProof();
    throw new ClinicalApiError(result.error || 'Clinical API failed', result.code, response.status);
  }
  return result.data as T;
};

type ReadCache<T> = { sessionToken: string; data: T; expiresAt: number };
type ReadInFlight<T> = { sessionToken: string; promise: Promise<T>; generation: number };

const CLINICAL_READ_CACHE_MS = 60_000;
let patientsCache: ReadCache<Patient[]> | null = null;
let patientsInFlight: ReadInFlight<Patient[]> | null = null;
let patientsGeneration = 0;
let vipCache: ReadCache<VipPatient[]> | null = null;
let vipInFlight: ReadInFlight<VipPatient[]> | null = null;
let vipGeneration = 0;
let surgeryApprovalCache: { sessionToken: string; data: Patient[]; expiresAt: number } | null = null;
let surgeryApprovalInFlight: { sessionToken: string; promise: Promise<Patient[]> } | null = null;
const SURGERY_APPROVAL_CACHE_MS = 60_000;

const clearPatientsCache = () => {
  patientsGeneration += 1;
  patientsCache = null;
  patientsInFlight = null;
};

const clearVipCache = () => {
  vipGeneration += 1;
  vipCache = null;
  vipInFlight = null;
};

const clearSurgeryApprovalCache = () => {
  surgeryApprovalCache = null;
  surgeryApprovalInFlight = null;
};

export const invalidateClinicalCaches = () => {
  clearPatientsCache();
  clearVipCache();
  clearSurgeryApprovalCache();
};

// Tên cũ được giữ để các caller hiện tại không bị vỡ contract.
export const invalidateSurgeryApprovalCache = invalidateClinicalCaches;

export const getPatients = (sessionToken: string, bypassCache = false): Promise<Patient[]> => {
  if (bypassCache) clearPatientsCache();
  if (patientsCache?.sessionToken === sessionToken && patientsCache.expiresAt > Date.now()) {
    return Promise.resolve(patientsCache.data);
  }
  if (patientsInFlight?.sessionToken === sessionToken) return patientsInFlight.promise;

  const generation = patientsGeneration;
  const promise = request<Patient[]>('patients.list', [], sessionToken)
    .then(data => {
      if (patientsGeneration === generation) {
        patientsCache = { sessionToken, data, expiresAt: Date.now() + CLINICAL_READ_CACHE_MS };
      }
      return data;
    })
    .finally(() => {
      if (patientsInFlight?.promise === promise) patientsInFlight = null;
    });
  patientsInFlight = { sessionToken, promise, generation };
  return promise;
};

export const getSurgeryApprovalPatients = (sessionToken: string, bypassCache = false) => {
  if (bypassCache) clearSurgeryApprovalCache();
  if (surgeryApprovalCache && surgeryApprovalCache.sessionToken === sessionToken && surgeryApprovalCache.expiresAt > Date.now()) {
    return Promise.resolve(surgeryApprovalCache.data);
  }
  if (surgeryApprovalInFlight?.sessionToken === sessionToken) return surgeryApprovalInFlight.promise;
  const promise = request<Patient[]>('patients.surgeryApprovalList', [], sessionToken)
    .then(data => {
      surgeryApprovalCache = { sessionToken, data, expiresAt: Date.now() + SURGERY_APPROVAL_CACHE_MS };
      return data;
    })
    .finally(() => {
      if (surgeryApprovalInFlight?.promise === promise) surgeryApprovalInFlight = null;
    });
  surgeryApprovalInFlight = { sessionToken, promise };
  return promise;
};
export const addPatient = (patient: Patient, sessionToken: string) =>
  request<Patient>('patients.add', [patient], sessionToken).then(data => {
    invalidateClinicalCaches();
    return data;
  });
export const updatePatient = (id: string, patient: Partial<Patient>, sessionToken: string) =>
  request<Patient>('patients.update', [id, patient], sessionToken).then(data => {
    invalidateClinicalCaches();
    return data;
  });
export const deletePatient = (id: string, sessionToken: string) =>
  request<{ success: true }>('patients.delete', [id], sessionToken).then(data => {
    invalidateClinicalCaches();
    return data;
  });
export const getVipPatients = (sessionToken: string, bypassCache = false): Promise<VipPatient[]> => {
  if (bypassCache) clearVipCache();
  if (vipCache?.sessionToken === sessionToken && vipCache.expiresAt > Date.now()) {
    return Promise.resolve(vipCache.data);
  }
  if (vipInFlight?.sessionToken === sessionToken) return vipInFlight.promise;

  const generation = vipGeneration;
  const promise = request<VipPatient[]>('vip.list', [], sessionToken)
    .then(data => {
      if (vipGeneration === generation) {
        vipCache = { sessionToken, data, expiresAt: Date.now() + CLINICAL_READ_CACHE_MS };
      }
      return data;
    })
    .finally(() => {
      if (vipInFlight?.promise === promise) vipInFlight = null;
    });
  vipInFlight = { sessionToken, promise, generation };
  return promise;
};

export const addVipPatient = (patientId: string, priority: string, reason: string, sessionToken: string) =>
  request<any>('vip.add', [patientId, priority, reason], sessionToken).then(data => {
    clearVipCache();
    return data;
  });
export const removeVipPatient = (id: string, sessionToken: string) =>
  request<{ success: true }>('vip.delete', [id], sessionToken).then(data => {
    clearVipCache();
    return data;
  });
export const getDashboardStats = (sessionToken: string) =>
  request<DashboardStats>('dashboard.get', [], sessionToken);
