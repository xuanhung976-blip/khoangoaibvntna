import { fold } from '../../lib/text';

const PRESETS: Array<[string[], string, string]> = [
  [['giao cảm', 'đốt nhánh', 'mồ hôi'], 'giao cảm', 'Giao cảm / tăng tiết mồ hôi'],
  [['toetva'], 'TOETVA', 'Phương pháp TOETVA'],
  [['basedow'], 'Basedow', 'Chẩn đoán Basedow'],
  [['rfa', 'sóng cao tần'], 'RFA', 'Đốt sóng cao tần'],
  [['tuyến giáp', 'giáp'], 'giáp', 'Bệnh lý tuyến giáp'],
  [['dạ dày'], 'dạ dày', 'Dạ dày'],
  [['túi mật'], 'túi mật', 'Túi mật'],
  [['thoát vị'], 'thoát vị', 'Thoát vị'],
  [['nội soi'], 'nội soi', 'Phẫu thuật nội soi'],
];

/** Gợi ý từ khoá lọc mẫu dựa trên tên đề tài. */
export const presetForTopic = (topic: string): { keyword: string; note: string } | null => {
  const title = fold(topic);
  for (const [triggers, keyword, note] of PRESETS) {
    if (triggers.some(trigger => title.includes(fold(trigger)))) return { keyword, note };
  }
  return null;
};
