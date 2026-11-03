export const THYROID_QUIZ = [
  {
    id: 'thy_q001', type: 'multiple-choice', difficulty: 'B1', category: 'physiology',
    question: 'What is the normal range of TSH in adults?',
    questionVi: 'Khoảng giá trị bình thường của TSH ở người lớn là bao nhiêu?',
    options: ['0.04–0.4 mIU/L', '0.4–4.0 mIU/L', '4.0–40 mIU/L', '40–400 mIU/L'],
    answer: 1,
    explanation: 'Normal TSH range is 0.4–4.0 mIU/L. TSH is the most sensitive marker for thyroid function.'
  },
  {
    id: 'thy_q002', type: 'multiple-choice', difficulty: 'B1', category: 'pathology',
    question: 'Which of the following best describes hypothyroidism?',
    questionVi: 'Đặc điểm nào sau đây mô tả đúng nhất về suy giáp?',
    options: [
      'Excessive thyroid hormone production',
      'Insufficient thyroid hormone production',
      'Normal thyroid hormone with enlarged gland',
      'Autoimmune destruction of thyroid receptors'
    ],
    answer: 1,
    explanation: 'Hypothyroidism is characterized by insufficient thyroid hormone production, leading to slowed metabolism.'
  },
  {
    id: 'thy_q003', type: 'multiple-choice', difficulty: 'B2', category: 'pathology',
    question: "What is the most common cause of hyperthyroidism in adults?",
    questionVi: 'Nguyên nhân phổ biến nhất gây cường giáp ở người lớn là gì?',
    options: ["Hashimoto's thyroiditis", "Graves' disease", 'Toxic adenoma', 'Subacute thyroiditis'],
    answer: 1,
    explanation: "Graves' disease is the most common cause of hyperthyroidism, accounting for 70–80% of cases."
  },
  {
    id: 'thy_q004', type: 'multiple-choice', difficulty: 'B2', category: 'diagnosis',
    question: 'In Graves\' disease, what is the expected TSH level?',
    questionVi: 'Trong bệnh Graves, mức TSH dự kiến là bao nhiêu?',
    options: ['Elevated (↑)', 'Normal', 'Suppressed (↓)', 'Fluctuating'],
    answer: 2,
    explanation: 'In Graves\' disease (hyperthyroidism), TSH is suppressed due to negative feedback from elevated T3/T4.'
  },
  {
    id: 'thy_q005', type: 'multiple-choice', difficulty: 'B1', category: 'treatment',
    question: 'Which medication is the standard treatment for hypothyroidism?',
    questionVi: 'Thuốc nào là điều trị tiêu chuẩn cho bệnh suy giáp?',
    options: ['Methimazole', 'Levothyroxine', 'Propylthiouracil', 'Propranolol'],
    answer: 1,
    explanation: 'Levothyroxine (synthetic T4) is the standard hormone replacement therapy for hypothyroidism.'
  },
  {
    id: 'thy_q006', type: 'fill-blank', difficulty: 'B2', category: 'anatomy',
    sentence: 'The ________ is a narrow band of thyroid tissue connecting the two thyroid lobes.',
    options: ['isthmus', 'follicle', 'capsule', 'parenchyma'],
    answer: 0,
    explanation: 'The isthmus (eo tuyến giáp) connects the two thyroid lobes across the trachea.'
  },
  {
    id: 'thy_q007', type: 'multiple-choice', difficulty: 'C1', category: 'surgery',
    question: 'What is the most serious complication of thyroid surgery related to voice?',
    questionVi: 'Biến chứng phẫu thuật tuyến giáp nghiêm trọng nhất liên quan đến giọng nói là gì?',
    options: [
      'Superior laryngeal nerve injury',
      'Recurrent laryngeal nerve injury',
      'Hypoglossal nerve injury',
      'Facial nerve injury'
    ],
    answer: 1,
    explanation: 'Recurrent laryngeal nerve (RLN) injury causes hoarseness. Bilateral injury can cause life-threatening airway obstruction.'
  },
  {
    id: 'thy_q008', type: 'multiple-choice', difficulty: 'B2', category: 'pathology',
    question: 'Which antibody is most specific for Hashimoto thyroiditis?',
    questionVi: 'Kháng thể nào đặc hiệu nhất cho viêm giáp Hashimoto?',
    options: ['TRAb', 'Anti-TPO', 'Anti-Tg', 'Anti-nuclear antibody'],
    answer: 1,
    explanation: 'Anti-TPO (anti-thyroid peroxidase) antibodies are markedly elevated in Hashimoto thyroiditis.'
  },
  {
    id: 'thy_q009', type: 'multiple-choice', difficulty: 'C1', category: 'pathology',
    question: 'The Bethesda System Category VI corresponds to:',
    questionVi: 'Phân loại Bethesda VI tương ứng với:',
    options: ['Non-diagnostic', 'Benign', 'Atypia of undetermined significance', 'Malignant'],
    answer: 3,
    explanation: 'Bethesda VI = Malignant. This category carries >97% risk of malignancy. Surgery is recommended.'
  },
  {
    id: 'thy_q010', type: 'multiple-choice', difficulty: 'B1', category: 'anatomy',
    question: 'The thyroid gland is located in which part of the body?',
    questionVi: 'Tuyến giáp nằm ở phần nào của cơ thể?',
    options: ['Posterior neck', 'Anterior neck', 'Chest', 'Abdomen'],
    answer: 1,
    explanation: 'The thyroid gland is a butterfly-shaped gland located in the anterior neck.'
  },
  {
    id: 'thy_q011', type: 'true-false', difficulty: 'B2', category: 'physiology',
    question: 'T3 is more metabolically active than T4.',
    questionVi: 'T3 có hoạt tính chuyển hóa mạnh hơn T4.',
    answer: true,
    explanation: 'T3 is 3–4 times more potent than T4. Most T4 is converted to T3 in peripheral tissues.'
  },
  {
    id: 'thy_q012', type: 'multiple-choice', difficulty: 'C1', category: 'pathology',
    question: 'Which thyroid cancer type originates from C cells (parafollicular cells)?',
    questionVi: 'Loại ung thư tuyến giáp nào xuất phát từ tế bào C?',
    options: ['Papillary carcinoma', 'Follicular carcinoma', 'Medullary carcinoma', 'Anaplastic carcinoma'],
    answer: 2,
    explanation: 'Medullary thyroid carcinoma originates from C cells and produces calcitonin as a tumor marker.'
  },
  {
    id: 'thy_q013', type: 'fill-blank', difficulty: 'B2', category: 'pathology',
    sentence: 'The classic triad of Graves\' disease includes hyperthyroidism, goiter, and ________.',
    options: ['exophthalmos', 'myxedema', 'hypocalcemia', 'hypertension'],
    answer: 0,
    explanation: 'Merseburg triad: hyperthyroidism + goiter + exophthalmos (lồi mắt).'
  },
  {
    id: 'thy_q014', type: 'multiple-choice', difficulty: 'C1', category: 'treatment',
    question: 'Which antithyroid drug is preferred in the first trimester of pregnancy?',
    questionVi: 'Thuốc kháng giáp nào được ưu tiên trong 3 tháng đầu thai kỳ?',
    options: ['Methimazole', 'Propylthiouracil (PTU)', 'Carbimazole', 'Iodine'],
    answer: 1,
    explanation: 'PTU is preferred in the first trimester as methimazole is associated with embryopathy.'
  },
  {
    id: 'thy_q015', type: 'multiple-choice', difficulty: 'B2', category: 'diagnosis',
    question: 'What is the primary imaging modality for evaluating thyroid nodules?',
    questionVi: 'Phương thức hình ảnh đầu tiên để đánh giá nhân tuyến giáp là gì?',
    options: ['CT scan', 'MRI', 'Thyroid ultrasound', 'PET scan'],
    answer: 2,
    explanation: 'Thyroid ultrasound is the primary and first-line imaging for evaluating thyroid nodules.'
  },
  {
    id: 'thy_q016', type: 'true-false', difficulty: 'B1', category: 'treatment',
    question: 'Levothyroxine should be taken with food for better absorption.',
    questionVi: 'Levothyroxin nên uống cùng thức ăn để hấp thu tốt hơn.',
    answer: false,
    explanation: 'Levothyroxine should be taken on an EMPTY STOMACH, 30–60 minutes before breakfast, to maximize absorption.'
  },
  {
    id: 'thy_q017', type: 'multiple-choice', difficulty: 'C1', category: 'surgery',
    question: 'TOETVA stands for:',
    questionVi: 'TOETVA là viết tắt của:',
    options: [
      'Total Open Endoscopic Thyroid Vascular Ablation',
      'Transoral Endoscopic Thyroidectomy Vestibular Approach',
      'Total Operative Endoscopic Thyroid and Vein Ablation',
      'Transoral Endoscopic Total Thyroid Vein Ablation'
    ],
    answer: 1,
    explanation: 'TOETVA = Transoral Endoscopic Thyroidectomy Vestibular Approach — scar-free thyroid surgery via the mouth.'
  },
  {
    id: 'thy_q018', type: 'multiple-choice', difficulty: 'B2', category: 'physiology',
    question: 'Which organ produces TSH?',
    questionVi: 'Cơ quan nào sản xuất TSH?',
    options: ['Hypothalamus', 'Anterior pituitary', 'Posterior pituitary', 'Thyroid gland'],
    answer: 1,
    explanation: 'TSH is produced by thyrotroph cells in the anterior pituitary in response to TRH from the hypothalamus.'
  },
  {
    id: 'thy_q019', type: 'fill-blank', difficulty: 'C1', category: 'surgery',
    sentence: 'Postoperative ________ is a common complication after thyroidectomy caused by parathyroid damage.',
    options: ['hypocalcemia', 'hypercalcemia', 'hypoglycemia', 'hyperkalemia'],
    answer: 0,
    explanation: 'Postoperative hypocalcemia results from injury/removal of parathyroid glands during thyroidectomy.'
  },
  {
    id: 'thy_q020', type: 'multiple-choice', difficulty: 'C1', category: 'pathology',
    question: 'Which condition is a life-threatening complication of severe hypothyroidism?',
    questionVi: 'Tình trạng nào là biến chứng đe dọa tính mạng của suy giáp nặng?',
    options: ['Thyroid storm', 'Myxedema coma', 'Toxic adenoma', 'Thyroiditis'],
    answer: 1,
    explanation: 'Myxedema coma (hôn mê phù niêm) is a life-threatening complication of severe hypothyroidism.'
  },
];

export default THYROID_QUIZ;
