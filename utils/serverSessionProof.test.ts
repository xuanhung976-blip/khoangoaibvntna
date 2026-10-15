import { describe, expect, it } from 'vitest';
import {
  createClinicalSessionProof,
  verifyClinicalSessionProof,
} from './serverSessionProof';

const actor = {
  username: 'nv01',
  fullName: 'Nhân viên 01',
  role: 'NHAN_VIEN',
  canDeletePatient: false,
};

describe('clinical session proof', () => {
  it('xác minh proof hợp lệ và gắn proof với đúng session', () => {
    const proof = createClinicalSessionProof('session-a', actor, 'server-secret', {
      nowMs: 1_000,
      ttlMs: 60_000,
    });

    expect(verifyClinicalSessionProof(proof, 'session-a', 'server-secret', 2_000)).toMatchObject(actor);
    expect(verifyClinicalSessionProof(proof, 'session-b', 'server-secret', 2_000)).toBeNull();
  });

  it('từ chối proof bị sửa, sai khóa hoặc hết hạn', () => {
    const proof = createClinicalSessionProof('session-a', actor, 'server-secret', {
      nowMs: 1_000,
      ttlMs: 2_000,
    });

    expect(verifyClinicalSessionProof(`${proof}x`, 'session-a', 'server-secret', 2_000)).toBeNull();
    expect(verifyClinicalSessionProof(proof, 'session-a', 'wrong-secret', 2_000)).toBeNull();
    expect(verifyClinicalSessionProof(proof, 'session-a', 'server-secret', 3_001)).toBeNull();
  });

  it('không cho proof sống lâu hơn phiên GAS', () => {
    const proof = createClinicalSessionProof('session-a', actor, 'server-secret', {
      nowMs: 1_000,
      ttlMs: 60_000,
      sessionExpiresAt: new Date(5_000).toISOString(),
    });

    expect(verifyClinicalSessionProof(proof, 'session-a', 'server-secret', 4_999)).not.toBeNull();
    expect(verifyClinicalSessionProof(proof, 'session-a', 'server-secret', 5_000)).toBeNull();
  });
});

