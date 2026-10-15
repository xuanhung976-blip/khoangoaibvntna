import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export type ClinicalSessionActor = {
  username: string;
  fullName: string;
  role: string;
  mustChangePassword?: boolean;
  canDeletePatient?: boolean;
  /** Đang bật kiểm soát quyền chi tiết theo ma trận. */
  permissionsEnforced?: boolean;
  /** Các quyền bị từ chối dạng "module:action". */
  denied?: string[];
};

type ClinicalProofPayload = {
  v: 1;
  issuer: 'khoangoai-rpc';
  audience: 'clinical-api';
  issuedAt: number;
  sessionHash: string;
  actor: ClinicalSessionActor;
  expiresAt: number;
};

type ProofOptions = {
  nowMs?: number;
  ttlMs?: number;
  sessionExpiresAt?: string;
};

const DEFAULT_PROOF_TTL_MS = 2 * 60_000;

const hashSession = (sessionToken: string) =>
  createHash('sha256').update(sessionToken).digest('hex');

const sign = (encodedPayload: string, secret: string) =>
  createHmac('sha256', secret).update(encodedPayload).digest();

const sanitizeActor = (actor: ClinicalSessionActor): ClinicalSessionActor => ({
  username: String(actor?.username || ''),
  fullName: String(actor?.fullName || ''),
  role: String(actor?.role || ''),
  mustChangePassword: actor?.mustChangePassword === true,
  canDeletePatient: actor?.canDeletePatient === true,
  permissionsEnforced: actor?.permissionsEnforced === true,
  denied: Array.isArray(actor?.denied) ? actor.denied.map(String).slice(0, 100) : [],
});

export const createClinicalSessionProof = (
  sessionToken: string,
  actor: ClinicalSessionActor,
  secret: string,
  options: ProofOptions = {},
): string => {
  if (!sessionToken || !secret || !actor?.username || !actor?.role) return '';

  const nowMs = options.nowMs ?? Date.now();
  let expiresAt = nowMs + (options.ttlMs ?? DEFAULT_PROOF_TTL_MS);
  const sessionExpiresAt = options.sessionExpiresAt
    ? new Date(options.sessionExpiresAt).getTime()
    : Number.NaN;
  if (Number.isFinite(sessionExpiresAt)) expiresAt = Math.min(expiresAt, sessionExpiresAt);
  if (expiresAt <= nowMs) return '';

  const payload: ClinicalProofPayload = {
    v: 1,
    issuer: 'khoangoai-rpc',
    audience: 'clinical-api',
    issuedAt: nowMs,
    sessionHash: hashSession(sessionToken),
    actor: sanitizeActor(actor),
    expiresAt,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = sign(encodedPayload, secret).toString('base64url');
  return `${encodedPayload}.${signature}`;
};

export const verifyClinicalSessionProof = (
  proof: string,
  sessionToken: string,
  secret: string,
  nowMs = Date.now(),
): ClinicalSessionActor | null => {
  if (!proof || !sessionToken || !secret) return null;

  try {
    const [encodedPayload, encodedSignature, extra] = proof.split('.');
    if (!encodedPayload || !encodedSignature || extra) return null;

    const suppliedSignature = Buffer.from(encodedSignature, 'base64url');
    const expectedSignature = sign(encodedPayload, secret);
    if (
      suppliedSignature.length !== expectedSignature.length ||
      !timingSafeEqual(suppliedSignature, expectedSignature)
    ) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(encodedPayload, 'base64url').toString('utf8'),
    ) as ClinicalProofPayload;
    if (
      payload?.v !== 1 ||
      payload.issuer !== 'khoangoai-rpc' ||
      payload.audience !== 'clinical-api' ||
      payload.issuedAt > nowMs ||
      payload.expiresAt <= nowMs ||
      payload.sessionHash !== hashSession(sessionToken) ||
      !payload.actor?.username ||
      !payload.actor?.role
    ) {
      return null;
    }

    return sanitizeActor(payload.actor);
  } catch {
    return null;
  }
};
