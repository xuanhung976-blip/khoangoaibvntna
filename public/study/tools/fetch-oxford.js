/**
 * fetch-oxford.js — Fetch Oxford 5000 từ GitHub và convert sang VSTEP vocab format
 * 
 * Nguồn: github.com/winterdl/oxford-5000-vocabulary-audio-definition
 * Chạy: node tools/fetch-oxford.js
 * 
 * Output: data/vstep/vocabulary_oxford.js (B1/B2/C1 words với EN definition + IPA)
 * Ghi chú: Phần nghĩa tiếng Việt (vi) sẽ để trống "" — cần bổ sung sau
 *          hoặc dùng Google Translate API / từ điển EN-VI
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const OXFORD_URL = 'https://raw.githubusercontent.com/winterdl/oxford-5000-vocabulary-audio-definition/master/data/oxford_5000.json';

// VSTEP chỉ cần B1, B2, C1 (bỏ A1, A2)
const INCLUDE_LEVELS = ['b1', 'b2', 'c1'];

// Map CEFR → VSTEP difficulty label
const CEFR_MAP = { b1: 'B1', b2: 'B2', c1: 'C1' };

// Đây là 500 từ EN-VI cơ bản, dùng để auto-fill tiếng Việt cho phần nhỏ
// (cho những từ không tìm được trong dict)
const BASIC_VI_MAP = {
  abandon: 'từ bỏ', ability: 'khả năng', abolish: 'bãi bỏ', absence: 'sự vắng mặt',
  abstract: 'trừu tượng', academic: 'học thuật', accept: 'chấp nhận', access: 'truy cập',
  accommodate: 'cung cấp chỗ ở', accomplish: 'hoàn thành', accurate: 'chính xác',
  achieve: 'đạt được', acknowledge: 'thừa nhận', acquire: 'có được', adapt: 'thích nghi',
  adequate: 'đủ', administration: 'quản lý', adopt: 'áp dụng', advantage: 'lợi thế',
  advocate: 'vận động / bênh vực', affect: 'ảnh hưởng', allocate: 'phân bổ',
  alter: 'thay đổi', ambiguous: 'mơ hồ', analyze: 'phân tích', anticipate: 'dự đoán',
  apparent: 'rõ ràng', apply: 'áp dụng', appreciate: 'đánh giá cao', approach: 'tiếp cận',
  appropriate: 'phù hợp', approximate: 'gần đúng', aspect: 'khía cạnh', assess: 'đánh giá',
  assign: 'phân công', assist: 'hỗ trợ', assume: 'giả định', attain: 'đạt được',
  attribute: 'quy cho / thuộc tính', authority: 'thẩm quyền', available: 'có sẵn',
  aware: 'nhận thức', behalf: 'thay mặt', benefit: 'lợi ích', bias: 'thiên kiến',
  capable: 'có khả năng', category: 'danh mục', challenge: 'thách thức', circumstance: 'hoàn cảnh',
  cite: 'trích dẫn', clarify: 'làm rõ', coherent: 'mạch lạc', coincide: 'trùng hợp',
  commit: 'cam kết', communicate: 'giao tiếp', complex: 'phức tạp', concentrate: 'tập trung',
  concept: 'khái niệm', conclude: 'kết luận', conflict: 'xung đột', consequence: 'hậu quả',
  consider: 'xem xét', consistent: 'nhất quán', constitute: 'cấu thành', context: 'bối cảnh',
  contradict: 'mâu thuẫn', contribute: 'đóng góp', controversial: 'gây tranh cãi',
  convey: 'truyền đạt', correlate: 'tương quan', create: 'tạo ra', criteria: 'tiêu chí',
  crucial: 'quan trọng', deduce: 'suy diễn', define: 'định nghĩa', demonstrate: 'chứng minh',
  derive: 'bắt nguồn', determine: 'xác định', differ: 'khác nhau', difficult: 'khó',
  distinct: 'rõ ràng', distinguish: 'phân biệt', distribute: 'phân phối', diverse: 'đa dạng',
  dominant: 'chiếm ưu thế', dynamic: 'năng động', elaborate: 'chi tiết', eliminate: 'loại bỏ',
  emphasis: 'nhấn mạnh', empirical: 'thực nghiệm', enable: 'cho phép', enhance: 'nâng cao',
  enormous: 'khổng lồ', evaluate: 'đánh giá', evidence: 'bằng chứng', evolve: 'tiến hóa',
  examine: 'kiểm tra', exclude: 'loại trừ', expand: 'mở rộng', explicit: 'rõ ràng',
  facilitate: 'tạo điều kiện', factor: 'yếu tố', feature: 'đặc điểm', focus: 'tập trung',
  framework: 'khung', fundamental: 'cơ bản', generate: 'tạo ra', global: 'toàn cầu',
  hypothesis: 'giả thuyết', identify: 'xác định', impact: 'tác động', implement: 'thực hiện',
  imply: 'ngụ ý', impose: 'áp đặt', indicate: 'chỉ ra', inherent: 'vốn có',
  initiate: 'bắt đầu', integrate: 'tích hợp', interpret: 'giải thích', investigate: 'điều tra',
  involve: 'liên quan', issue: 'vấn đề', justify: 'biện minh', maintain: 'duy trì',
  maximize: 'tối đa hóa', method: 'phương pháp', minimize: 'tối thiểu hóa', modify: 'điều chỉnh',
  monitor: 'theo dõi', motivate: 'thúc đẩy', neutral: 'trung lập', objective: 'mục tiêu',
  obtain: 'có được', occur: 'xảy ra', outcome: 'kết quả', overcome: 'vượt qua',
  participate: 'tham gia', perceive: 'nhận thức', perspective: 'quan điểm', potential: 'tiềm năng',
  precise: 'chính xác', predict: 'dự đoán', principle: 'nguyên tắc', process: 'quá trình',
  propose: 'đề xuất', provide: 'cung cấp', relevant: 'liên quan', require: 'yêu cầu',
  respond: 'phản hồi', restrict: 'hạn chế', reveal: 'tiết lộ', significant: 'quan trọng',
  similar: 'tương tự', specific: 'cụ thể', strategy: 'chiến lược', sufficient: 'đủ',
  support: 'hỗ trợ', sustain: 'duy trì', theory: 'lý thuyết', transfer: 'chuyển',
  transform: 'biến đổi', trend: 'xu hướng', unique: 'độc đáo', utilize: 'sử dụng',
  valid: 'hợp lệ', variable: 'biến số', vary: 'thay đổi', verify: 'xác minh',
};

async function main() {
  console.log('📥 Fetching Oxford 5000 từ GitHub...');
  
  let rawData;
  try {
    const response = await fetch(OXFORD_URL);
    rawData = await response.json();
  } catch (e) {
    console.error('❌ Lỗi fetch:', e.message);
    process.exit(1);
  }

  console.log(`✅ Đã tải ${Object.keys(rawData).length} entries`);

  // Filter B1/B2/C1
  const filtered = Object.values(rawData).filter(w =>
    INCLUDE_LEVELS.includes((w.cefr || '').toLowerCase())
  );

  console.log(`📊 B1/B2/C1 entries: ${filtered.length}`);

  // Convert sang app format
  const vocabulary = filtered.map((w, i) => {
    const level = CEFR_MAP[(w.cefr || 'b1').toLowerCase()] || 'B1';
    const vi = BASIC_VI_MAP[w.word.toLowerCase()] || '';
    
    return {
      id: `ox_${String(i + 1).padStart(4, '0')}`,
      word: w.word,
      ipa: w.phon_br || w.phon_n_am || '',
      level,
      meaning: vi,
      vi,
      pos: w.type || '',
      definition: w.definition || '',
      example: w.example || '',
      tags: [w.type || 'general', level.toLowerCase()],
    };
  });

  // Tạo file JS
  const output = `// VSTEP Vocabulary — Oxford 5000 (B1/B2/C1)
// Nguồn: github.com/winterdl/oxford-5000-vocabulary-audio-definition
// Tổng: ${vocabulary.length} từ | B1: ${vocabulary.filter(w=>w.level==='B1').length} | B2: ${vocabulary.filter(w=>w.level==='B2').length} | C1: ${vocabulary.filter(w=>w.level==='C1').length}
// Lưu ý: Trường 'vi' (tiếng Việt) đã có ~${Object.keys(BASIC_VI_MAP).length} từ cơ bản, còn lại để trống cần bổ sung

export const VSTEP_VOCABULARY_OXFORD = ${JSON.stringify(vocabulary, null, 2)};

export default VSTEP_VOCABULARY_OXFORD;
`;

  const outPath = path.join(__dirname, '..', 'data', 'vstep', 'vocabulary_oxford.js');
  fs.writeFileSync(outPath, output, 'utf-8');
  
  console.log(`\n✅ Đã lưu: data/vstep/vocabulary_oxford.js`);
  console.log(`   📘 B1: ${vocabulary.filter(w=>w.level==='B1').length} từ`);
  console.log(`   📗 B2: ${vocabulary.filter(w=>w.level==='B2').length} từ`);
  console.log(`   📕 C1: ${vocabulary.filter(w=>w.level==='C1').length} từ`);
  console.log(`\n💡 Để dùng trong app, import vào data/vstep.js:`);
  console.log(`   import { VSTEP_VOCABULARY_OXFORD } from './vstep/vocabulary_oxford.js';`);
}

main();
