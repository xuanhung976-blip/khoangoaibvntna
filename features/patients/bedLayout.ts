import type { Patient } from '../../types';
import { roomKey, sortRooms } from '../../lib/domain';

export type BedSlot = { bed: string; patients: Patient[] };
/** usedBeds = số giường đang có người; shared = số giường nằm ghép (≥ 2 bệnh nhân). */
export type RoomLayout = { room: string; occupied: number; usedBeds: number; slots: BedSlot[]; shared: number };

/**
 * Số giường = phần số cuối của mã, vì mỗi người nhập một kiểu: "K19.H003", "K19.003", "H003", "03", "3" đều là giường 3.
 * Mã không có số thì giữ nguyên (chuẩn hoá chữ hoa) để vẫn gom được.
 */
export const bedCode = (value: unknown) => {
  const raw = String(value ?? '').trim().replace(/\s+/g, '').toUpperCase();
  const match = raw.match(/(\d+)\D*$/);
  return match ? String(Number(match[1])) : raw;
};

/**
 * Dựng sơ đồ buồng – giường từ bệnh nhân đang điều trị.
 * Chỉ hiện các giường đang có người (số giường kế hoạch của khoa tính riêng theo TOTAL_BEDS);
 * nhiều người cùng một giường là nằm ghép.
 */
export function buildBedLayout(active: Patient[]): { rooms: RoomLayout[]; unassigned: Patient[] } {
  const byRoom = new Map<string, Patient[]>();
  const unassigned: Patient[] = [];
  active.forEach(patient => {
    const room = roomKey(patient.room);
    if (!room) {
      unassigned.push(patient);
      return;
    }
    if (!byRoom.has(room)) byRoom.set(room, []);
    byRoom.get(room)!.push(patient);
  });

  const rooms = sortRooms(Array.from(byRoom.keys())).map(room => {
    const occupants = byRoom.get(room)!;
    const slotsByCode = new Map<string, Patient[]>();
    const unnumbered: Patient[] = [];
    occupants.forEach(patient => {
      const code = bedCode(patient.bed);
      if (!code) unnumbered.push(patient);
      else slotsByCode.set(code, [...(slotsByCode.get(code) || []), patient]);
    });
    const slots: BedSlot[] = Array.from(slotsByCode.entries())
      .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
      .map(([code, patients]) => ({ bed: code, patients }));
    unnumbered.forEach(patient => slots.push({ bed: '—', patients: [patient] }));
    return {
      room,
      occupied: occupants.length,
      usedBeds: slots.length,
      slots,
      shared: slots.filter(slot => slot.patients.length > 1).length,
    };
  });

  return { rooms, unassigned };
}
