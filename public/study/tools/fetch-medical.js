/**
 * fetch-medical.js — Fetch medical terms từ GitHub và sinh ra data y khoa
 * 
 * Nguồn 1: github.com/Glutanimate/wordlist-medicalterms-en (~100k terms, raw text)
 * Nguồn 2: Lọc theo category (thyroid, diabetes, endocrinology...)
 * 
 * Chạy: node tools/fetch-medical.js
 * Output:
 *   - data/medical/common/medicalWordlist.js (full wordlist để search/reference)
 *   - data/medical/thyroid/vocabulary_extra.js  (thyroid terms mở rộng)
 *   - data/medical/diabetes/vocabulary_extra.js (diabetes terms mở rộng)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const MEDICAL_WORDLIST_URL = 'https://raw.githubusercontent.com/Glutanimate/wordlist-medicalterms-en/master/wordlist.txt';

// =====================================================
// KEYWORD FILTERS — lọc từ theo chuyên ngành
// =====================================================
const THYROID_KEYWORDS = [
  'thyroid', 'thyroxine', 'triiodothyronine', 't3', 't4', 'tsh', 'goiter', 'goitre',
  'hypothyroid', 'hyperthyroid', 'thyrotoxic', 'thyroiditis', 'hashimoto', 'graves',
  'cretinism', 'myxedema', 'myxoedema', 'calcitonin', 'parathyroid', 'iodine',
  'thyroglobulin', 'thyrotropin', 'levothyroxine', 'propylthiouracil', 'methimazole',
  'struma', 'colloid', 'follicular', 'papillary', 'anaplastic', 'medullary',
  'thyroidectomy', 'hemithyroidectomy', 'radioiodine', 'antithyroid',
];

const DIABETES_KEYWORDS = [
  'diabetes', 'diabetic', 'insulin', 'glucose', 'glycemic', 'glycaemic',
  'hyperglycemia', 'hyperglycaemia', 'hypoglycemia', 'hypoglycaemia',
  'glucagon', 'glycosuria', 'ketoacidosis', 'ketone', 'hba1c', 'hemoglobin a1c',
  'metformin', 'sulfonylurea', 'glipizide', 'glyburide', 'pioglitazone',
  'sitagliptin', 'empagliflozin', 'glp-1', 'sglt2', 'dpp-4',
  'neuropathy', 'retinopathy', 'nephropathy', 'microalbuminuria',
  'polydipsia', 'polyuria', 'polyphagia', 'insulin resistance', 'beta cell',
  'pancreatic', 'islets', 'langerhans', 'glucometer', 'glycated',
];

const ENDOCRINOLOGY_KEYWORDS = [
  'endocrine', 'endocrinology', 'hormone', 'cortisol', 'aldosterone',
  'testosterone', 'estrogen', 'estradiol', 'progesterone', 'adrenal',
  'pituitary', 'hypothalamus', 'prolactin', 'growth hormone', 'acromegaly',
  'cushing', 'addison', 'pheochromocytoma', 'hyperaldosteronism',
  'hypogonadism', 'menopause', 'osteoporosis', 'calcium', 'vitamin d',
  'parathyroid hormone', 'pth', 'hypercalcemia', 'hypocalcemia',
];

// =====================================================
// Vietnamese mappings cho các thuật ngữ phổ biến
// (các từ không có trong map sẽ để trống)
// =====================================================
const THYROID_VI_MAP = {
  'thyroid': 'tuyến giáp', 'thyroxine': 'thyroxin (T4)', 'triiodothyronine': 'triiodothyronin (T3)',
  'tsh': 'hormone kích thích tuyến giáp', 'goiter': 'bướu cổ', 'goitre': 'bướu cổ',
  'hypothyroidism': 'suy giáp', 'hyperthyroidism': 'cường giáp',
  'thyrotoxicosis': 'nhiễm độc giáp', 'thyroiditis': 'viêm tuyến giáp',
  'hashimoto': 'viêm giáp Hashimoto', "graves' disease": 'bệnh Graves / cường giáp tự miễn',
  'cretinism': 'chứng đần độn / thiểu năng tuyến giáp bẩm sinh',
  'myxedema': 'phù niêm / suy giáp nặng', 'calcitonin': 'calcitonin',
  'parathyroid': 'tuyến cận giáp', 'thyroglobulin': 'thyroglobulin',
  'thyrotropin': 'thyrotropin (TSH)', 'levothyroxine': 'levothyroxin (T4 tổng hợp)',
  'propylthiouracil': 'propylthiouracil (PTU)', 'methimazole': 'methimazole',
  'thyroidectomy': 'cắt tuyến giáp', 'radioiodine': 'i-ốt phóng xạ',
  'follicular': 'nang', 'papillary': 'thể nhú', 'anaplastic': 'thể không biệt hóa',
  'medullary': 'thể tủy',
};

const DIABETES_VI_MAP = {
  'diabetes': 'đái tháo đường', 'diabetic': 'đái tháo đường (adj)', 'insulin': 'insulin',
  'glucose': 'glucose / đường huyết', 'glycemic': 'đường huyết (adj)',
  'hyperglycemia': 'tăng đường huyết', 'hypoglycemia': 'hạ đường huyết',
  'glucagon': 'glucagon', 'glycosuria': 'glucose niệu / đường niệu',
  'ketoacidosis': 'nhiễm toan ceton', 'ketone': 'ceton / xeton',
  'hba1c': 'HbA1c / hemoglobin glycated', 'metformin': 'metformin',
  'neuropathy': 'bệnh thần kinh', 'retinopathy': 'bệnh võng mạc',
  'nephropathy': 'bệnh thận', 'microalbuminuria': 'vi đạm niệu',
  'polydipsia': 'khát nhiều', 'polyuria': 'tiểu nhiều', 'polyphagia': 'ăn nhiều',
  'pancreatic': 'tụy (adj)', 'glucometer': 'máy đo đường huyết',
  'glycated': 'glycated / gắn với glucose',
};

function matchesKeywords(term, keywords) {
  const lower = term.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

async function main() {
  console.log('📥 Fetching medical wordlist từ GitHub (~100k terms)...');
  
  let rawText;
  try {
    const res = await fetch(MEDICAL_WORDLIST_URL);
    rawText = await res.text();
  } catch (e) {
    console.error('❌ Lỗi fetch:', e.message);
    process.exit(1);
  }

  const allTerms = rawText.split('\n').map(t => t.trim()).filter(Boolean);
  console.log(`✅ Tổng số thuật ngữ: ${allTerms.length}`);

  // Lọc theo chuyên ngành
  const thyroidTerms = allTerms.filter(t => matchesKeywords(t, THYROID_KEYWORDS));
  const diabetesTerms = allTerms.filter(t => matchesKeywords(t, DIABETES_KEYWORDS));
  const endoTerms = allTerms.filter(t => matchesKeywords(t, ENDOCRINOLOGY_KEYWORDS));

  console.log(`🦋 Thyroid terms: ${thyroidTerms.length}`);
  console.log(`🩸 Diabetes terms: ${diabetesTerms.length}`);
  console.log(`🧬 Endocrinology terms: ${endoTerms.length}`);

  // =====================================================
  // Generate thyroid vocabulary_extra.js
  // =====================================================
  const thyroidVocab = thyroidTerms.slice(0, 200).map((term, i) => ({
    id: `thy_ex_${String(i + 1).padStart(3, '0')}`,
    module: 'thyroid',
    category: 'general',
    term: term.toLowerCase(),
    abbreviation: null,
    vietnamese: THYROID_VI_MAP[term.toLowerCase()] || '',
    pronunciation: '',
    definition: '',
    example: '',
    clinicalNote: '',
    difficulty: 'B2',
    tags: ['thyroid', 'medical'],
  }));

  // =====================================================
  // Generate diabetes vocabulary_extra.js
  // =====================================================
  const diabetesVocab = diabetesTerms.slice(0, 200).map((term, i) => ({
    id: `dm_ex_${String(i + 1).padStart(3, '0')}`,
    module: 'diabetes',
    category: 'general',
    term: term.toLowerCase(),
    abbreviation: null,
    vietnamese: DIABETES_VI_MAP[term.toLowerCase()] || '',
    pronunciation: '',
    definition: '',
    example: '',
    clinicalNote: '',
    difficulty: 'B2',
    tags: ['diabetes', 'medical'],
  }));

  // =====================================================
  // Save files
  // =====================================================
  const BASE = path.join(__dirname, '..');

  // Full medical wordlist (reference only)
  const medicalListPath = path.join(BASE, 'data', 'medical', 'common', 'medicalWordlist.js');
  fs.writeFileSync(medicalListPath, `// Medical English Wordlist — nguồn: Glutanimate/wordlist-medicalterms-en
// Tổng: ${allTerms.length} thuật ngữ y khoa tiếng Anh
// Dùng để reference / search, không phải learning data
export const MEDICAL_WORDLIST = ${JSON.stringify(allTerms, null, 0)};
export default MEDICAL_WORDLIST;
`, 'utf-8');

  // Thyroid extra vocab
  const thyPath = path.join(BASE, 'data', 'medical', 'thyroid', 'vocabulary_extra.js');
  fs.writeFileSync(thyPath, `// Thyroid Vocabulary (Extended from wordlist-medicalterms-en)
// ${thyroidVocab.length} terms — Trường 'vietnamese' và 'definition' cần bổ sung thủ công
// Merge với vocabulary.js để có bộ từ đầy đủ

export const THYROID_VOCABULARY_EXTRA = ${JSON.stringify(thyroidVocab, null, 2)};
`, 'utf-8');

  // Diabetes extra vocab
  const dmPath = path.join(BASE, 'data', 'medical', 'diabetes', 'vocabulary_extra.js');
  fs.writeFileSync(dmPath, `// Diabetes Vocabulary (Extended from wordlist-medicalterms-en)
// ${diabetesVocab.length} terms — Trường 'vietnamese' và 'definition' cần bổ sung thủ công
// Merge với vocabulary.js để có bộ từ đầy đủ

export const DIABETES_VOCABULARY_EXTRA = ${JSON.stringify(diabetesVocab, null, 2)};
`, 'utf-8');

  console.log('\n✅ Files đã tạo:');
  console.log(`   data/medical/common/medicalWordlist.js (${allTerms.length} terms)`);
  console.log(`   data/medical/thyroid/vocabulary_extra.js (${thyroidVocab.length} terms)`);
  console.log(`   data/medical/diabetes/vocabulary_extra.js (${diabetesVocab.length} terms)`);
  console.log('\n⚠️  Lưu ý: Trường "vietnamese" và "definition" còn trống cần bổ sung.');
  console.log('💡 Để merge vào app: import THYROID_VOCABULARY_EXTRA và spread vào THYROID_VOCABULARY');
}

main();
