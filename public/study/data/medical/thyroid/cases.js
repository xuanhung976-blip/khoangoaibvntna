export const THYROID_CASES = [
  {
    id: 'case_thy_001',
    title: 'Case 1: Hyperthyroidism',
    difficulty: 'B2',
    category: 'pathology',
    scenario: 'A 32-year-old woman presents with a 3-month history of weight loss (8 kg), palpitations, heat intolerance, and increased sweating. On examination, she has a diffusely enlarged thyroid gland, fine tremor of the hands, and mild exophthalmos. Her heart rate is 110 bpm.',
    scenarioVi: 'Bệnh nhân nữ 32 tuổi đến khám với tiền sử 3 tháng sụt cân (8 kg), hồi hộp, không chịu nóng và tăng mồ hôi. Khám lâm sàng thấy tuyến giáp to lan tỏa, run tay nhỏ và lồi mắt nhẹ. Nhịp tim 110 l/phút.',
    labResults: { TSH: '<0.01 mIU/L (↓↓)', FT4: '35 pmol/L (↑)', FT3: '12 pmol/L (↑)', TRAb: 'Positive' },
    questions: [
      { q: 'What is the most likely diagnosis?', a: "Graves' disease (hyperthyroidism)", hint: 'Consider the triad: diffuse goiter + hyperthyroidism + exophthalmos' },
      { q: 'What does the suppressed TSH indicate?', a: 'Excessive thyroid hormone production causing negative feedback suppression of TSH', hint: 'Think about the hypothalamic-pituitary-thyroid axis' },
      { q: 'What does TRAb positive mean?', a: 'Thyroid-stimulating receptor antibodies are present, confirming autoimmune etiology (Graves disease)', hint: 'TRAb activates TSH receptors' },
      { q: 'Translate: diffusely enlarged thyroid gland', a: 'Tuyến giáp to lan tỏa / bướu giáp lan tỏa', hint: 'diffuse = lan tỏa' },
      { q: 'List 3 treatment options for this patient', a: '1) Antithyroid drugs (methimazole/PTU), 2) Radioactive iodine (RAI), 3) Thyroidectomy', hint: 'Three pillars of hyperthyroidism treatment' }
    ],
    keyTerms: ['hyperthyroidism', 'Graves disease', 'exophthalmos', 'TRAb', 'diffuse goiter']
  },
  {
    id: 'case_thy_002',
    title: 'Case 2: Hypothyroidism',
    difficulty: 'B1',
    category: 'pathology',
    scenario: 'A 45-year-old woman complains of fatigue, weight gain (5 kg over 6 months), constipation, dry skin, and cold intolerance. She feels generally slow. On examination, her heart rate is 58 bpm, skin is dry and coarse, and there is mild periorbital puffiness.',
    scenarioVi: 'Bệnh nhân nữ 45 tuổi than mệt mỏi, tăng cân (5 kg trong 6 tháng), táo bón, da khô và sợ lạnh. Cô cảm thấy chậm chạp. Khám thấy nhịp tim 58 l/phút, da khô và thô, và có phù quanh hốc mắt nhẹ.',
    labResults: { TSH: '15.2 mIU/L (↑↑)', FT4: '8 pmol/L (↓)', 'Anti-TPO': 'Positive (>1000 IU/mL)' },
    questions: [
      { q: 'What is the diagnosis?', a: 'Hypothyroidism (most likely Hashimoto thyroiditis based on positive anti-TPO)', hint: 'TSH↑ + FT4↓ = hypothyroidism' },
      { q: 'What does the elevated TSH indicate?', a: 'The pituitary is trying to stimulate an underactive thyroid by secreting more TSH', hint: 'Negative feedback is disrupted' },
      { q: 'Translate: periorbital puffiness', a: 'Phù quanh hốc mắt / phù mí mắt', hint: 'peri = xung quanh, orbital = hốc mắt' },
      { q: 'What is the treatment?', a: 'Levothyroxine (synthetic T4) — started at low dose and titrated to normalize TSH', hint: 'Hormone replacement therapy' },
      { q: 'Why is anti-TPO positive important?', a: 'It confirms autoimmune etiology (Hashimoto thyroiditis), the most common cause of hypothyroidism', hint: 'Anti-TPO = autoimmune marker' }
    ],
    keyTerms: ['hypothyroidism', 'Hashimoto thyroiditis', 'anti-TPO', 'levothyroxine', 'periorbital puffiness']
  },
  {
    id: 'case_thy_003',
    title: 'Case 3: Thyroid Nodule Evaluation',
    difficulty: 'C1',
    category: 'diagnosis',
    scenario: 'A 52-year-old man presents with an incidentally discovered thyroid nodule on neck ultrasound. The nodule is 1.8 cm, hypoechoic, with irregular margins, microcalcifications, and taller-than-wide shape in the right lobe. TSH is 1.8 mIU/L (normal).',
    scenarioVi: 'Bệnh nhân nam 52 tuổi phát hiện tình cờ nhân tuyến giáp khi siêu âm cổ. Nhân 1.8 cm, giảm âm, bờ không đều, vôi hóa vi thể, hình dạng cao hơn rộng ở thùy phải. TSH 1.8 mIU/L (bình thường).',
    labResults: { TSH: '1.8 mIU/L (normal)', Ultrasound: '1.8 cm hypoechoic nodule, irregular margins, microcalcifications, taller-than-wide' },
    questions: [
      { q: 'What TIRADS category does this nodule likely belong to?', a: 'TIRADS 5 (Highly suspicious) based on hypoechoic + irregular margins + microcalcifications + taller-than-wide shape', hint: 'Multiple high-risk features = TIRADS 5' },
      { q: 'What is the next recommended step?', a: 'FNA (Fine Needle Aspiration) biopsy', hint: 'Suspicious nodule ≥1 cm → FNA' },
      { q: 'Translate: hypoechoic nodule with irregular margins', a: 'Nhân giảm âm với bờ không đều / không đều bờ', hint: 'hypoechoic = giảm âm' },
      { q: 'What are the suspicious ultrasound features mentioned?', a: 'Hypoechoic, irregular margins, microcalcifications, taller-than-wide shape', hint: 'List all 4 features in the case' },
      { q: 'If FNA shows Bethesda V, what does this mean?', a: 'Bethesda V = Suspicious for malignancy (~60–75% cancer risk). Surgery is recommended.', hint: 'Bethesda V = suspicious' }
    ],
    keyTerms: ['thyroid nodule', 'TIRADS', 'FNA', 'hypoechoic', 'microcalcifications', 'Bethesda classification']
  },
  {
    id: 'case_thy_004',
    title: 'Case 4: Thyroid Storm',
    difficulty: 'C1',
    category: 'emergency',
    scenario: 'A 28-year-old woman with known Graves\' disease is brought to the emergency department with high fever (40°C), severe agitation, confusion, vomiting, and heart rate of 150 bpm. Her partner reports she stopped taking antithyroid medication 2 weeks ago.',
    scenarioVi: 'Bệnh nhân nữ 28 tuổi có tiền sử bệnh Graves được đưa vào cấp cứu với sốt cao (40°C), kích động nặng, lú lẫn, nôn mửa và nhịp tim 150 l/phút. Người thân cho biết bệnh nhân đã tự ngưng thuốc kháng giáp 2 tuần trước.',
    labResults: { TSH: '<0.01 mIU/L', FT4: '>100 pmol/L', 'Temperature': '40°C', 'Heart rate': '150 bpm' },
    questions: [
      { q: 'What is this life-threatening condition?', a: 'Thyroid storm (cơn bão giáp) — life-threatening exacerbation of hyperthyroidism', hint: 'Fever + tachycardia + altered mental status in hyperthyroid patient' },
      { q: 'What precipitated this episode?', a: 'Abrupt discontinuation of antithyroid medication', hint: 'Check medication history' },
      { q: 'Translate: severe agitation and confusion', a: 'Kích động nặng và lú lẫn', hint: 'agitation = kích động, confusion = lú lẫn' },
      { q: 'What is the immediate treatment?', a: 'PTU + iodine solution + propranolol + hydrocortisone + supportive care in ICU', hint: 'Multiple drugs simultaneously' },
      { q: 'What is the mortality rate of thyroid storm?', a: '10–30% even with treatment', hint: 'This is a very dangerous condition' }
    ],
    keyTerms: ['thyroid storm', 'Graves disease', 'antithyroid drug', 'propylthiouracil', 'emergency']
  },
  {
    id: 'case_thy_005',
    title: 'Case 5: Post-thyroidectomy Hypocalcemia',
    difficulty: 'C1',
    category: 'surgery',
    scenario: 'A 41-year-old woman undergoes total thyroidectomy for papillary thyroid carcinoma. On day 1 postoperatively, she develops perioral numbness, tingling in the fingertips, and muscle cramps. Her serum calcium is 1.9 mmol/L (normal: 2.1–2.6) and PTH is low.',
    scenarioVi: 'Bệnh nhân nữ 41 tuổi được phẫu thuật cắt bỏ toàn bộ tuyến giáp vì ung thư tuyến giáp thể nhú. Ngày 1 sau phẫu thuật, bệnh nhân xuất hiện tê quanh miệng, kiến bò đầu ngón tay và chuột rút. Canxi huyết thanh 1.9 mmol/L (bình thường: 2.1–2.6) và PTH thấp.',
    labResults: { Calcium: '1.9 mmol/L (↓)', PTH: 'Low', 'Phosphate': 'Elevated' },
    questions: [
      { q: 'What is the complication?', a: 'Postoperative hypocalcemia due to hypoparathyroidism from parathyroid gland injury/removal', hint: 'Ca↓ + PTH↓ after thyroidectomy' },
      { q: 'What causes the perioral numbness?', a: 'Hypocalcemia causes neuromuscular irritability, leading to perioral tingling and muscle cramps', hint: 'Calcium regulates nerve excitability' },
      { q: 'Translate: perioral numbness and tingling in fingertips', a: 'Tê quanh miệng và kiến bò đầu ngón tay / dị cảm đầu ngón tay', hint: 'perioral = quanh miệng' },
      { q: 'How would you treat this?', a: 'Oral calcium carbonate + active vitamin D (calcitriol). IV calcium gluconate if severe.', hint: 'Calcium + vitamin D supplementation' },
      { q: 'How can this be prevented?', a: 'Careful identification and preservation of parathyroid glands during surgery; autotransplantation if accidentally removed', hint: 'Surgical technique matters' }
    ],
    keyTerms: ['postoperative hypocalcemia', 'hypoparathyroidism', 'parathyroid gland', 'total thyroidectomy', 'calcium']
  },
];

export default THYROID_CASES;
