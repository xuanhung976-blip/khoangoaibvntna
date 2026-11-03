// Schema: { id, module, category, term, abbreviation(optional), vietnamese, pronunciation, definition, example, clinicalNote, difficulty, tags }
export const THYROID_VOCABULARY = [
  // ANATOMY (10 terms)
  {
    id: 'thy_001', module: 'thyroid', category: 'anatomy',
    term: 'thyroid gland', abbreviation: null,
    vietnamese: 'tuyến giáp',
    pronunciation: '/ˈθaɪrɔɪd ɡlænd/',
    definition: 'A butterfly-shaped endocrine gland located in the anterior neck, consisting of two lobes connected by an isthmus.',
    example: 'The thyroid gland produces hormones that regulate metabolism.',
    clinicalNote: 'Normal thyroid weighs 15–25g. Enlargement is called goiter.',
    difficulty: 'A2', tags: ['anatomy', 'basic']
  },
  {
    id: 'thy_002', module: 'thyroid', category: 'anatomy',
    term: 'thyroid lobe', abbreviation: null,
    vietnamese: 'thùy tuyến giáp',
    pronunciation: '/ˈθaɪrɔɪd loʊb/',
    definition: 'One of the two lateral portions of the thyroid gland.',
    example: 'The right thyroid lobe is often slightly larger than the left.',
    clinicalNote: 'Each lobe measures approximately 4–6 cm in length.',
    difficulty: 'B1', tags: ['anatomy']
  },
  {
    id: 'thy_003', module: 'thyroid', category: 'anatomy',
    term: 'isthmus', abbreviation: null,
    vietnamese: 'eo tuyến giáp',
    pronunciation: '/ˈɪsməs/',
    definition: 'The narrow band of thyroid tissue connecting the two lobes across the trachea.',
    example: 'The isthmus lies over the 2nd and 3rd tracheal rings.',
    clinicalNote: 'A pyramidal lobe may arise from the isthmus in some patients.',
    difficulty: 'B1', tags: ['anatomy']
  },
  {
    id: 'thy_004', module: 'thyroid', category: 'anatomy',
    term: 'thyroid follicle', abbreviation: null,
    vietnamese: 'nang tuyến giáp',
    pronunciation: '/ˈθaɪrɔɪd ˈfɒlɪkəl/',
    definition: 'The basic structural and functional unit of the thyroid gland, a spherical structure lined by follicular cells and filled with colloid.',
    example: 'Thyroid follicles store thyroglobulin as colloid.',
    clinicalNote: 'Follicular cell size varies with TSH stimulation.',
    difficulty: 'B2', tags: ['anatomy', 'histology']
  },
  {
    id: 'thy_005', module: 'thyroid', category: 'anatomy',
    term: 'parathyroid gland', abbreviation: null,
    vietnamese: 'tuyến cận giáp',
    pronunciation: '/ˌpærəˈθaɪrɔɪd ɡlænd/',
    definition: 'Four small endocrine glands located on the posterior surface of the thyroid gland that regulate calcium levels.',
    example: 'Damage to the parathyroid glands during thyroidectomy can cause hypocalcemia.',
    clinicalNote: 'Inadvertent removal during thyroidectomy is a significant complication.',
    difficulty: 'B2', tags: ['anatomy', 'surgery']
  },
  {
    id: 'thy_006', module: 'thyroid', category: 'anatomy',
    term: 'recurrent laryngeal nerve', abbreviation: 'RLN',
    vietnamese: 'thần kinh thanh quản quặt ngược',
    pronunciation: '/rɪˈkɜːrənt ləˈrɪndʒɪəl nɜːrv/',
    definition: 'A branch of the vagus nerve that innervates the intrinsic muscles of the larynx and runs in close proximity to the thyroid gland.',
    example: 'The surgeon carefully identified the recurrent laryngeal nerve before proceeding.',
    clinicalNote: 'Injury causes hoarseness; bilateral injury can cause airway obstruction.',
    difficulty: 'C1', tags: ['anatomy', 'surgery', 'nerve']
  },
  {
    id: 'thy_007', module: 'thyroid', category: 'anatomy',
    term: 'thyroglobulin', abbreviation: 'Tg',
    vietnamese: 'thyroglobulin',
    pronunciation: '/ˌθaɪrəˈɡlɒbjʊlɪn/',
    definition: 'A glycoprotein produced by thyroid follicular cells that serves as a precursor for T3 and T4 synthesis and storage in the colloid.',
    example: 'Thyroglobulin levels are monitored after total thyroidectomy for thyroid cancer.',
    clinicalNote: 'Elevated Tg after total thyroidectomy may indicate recurrence.',
    difficulty: 'C1', tags: ['anatomy', 'biochemistry', 'cancer']
  },
  {
    id: 'thy_008', module: 'thyroid', category: 'anatomy',
    term: 'parafollicular cell', abbreviation: 'C cell',
    vietnamese: 'tế bào cạnh nang (tế bào C)',
    pronunciation: '/ˌpærəfəˈlɪkjʊlər sel/',
    definition: 'Thyroid cells that produce calcitonin, located between follicles.',
    example: 'Parafollicular cells become malignant in medullary thyroid carcinoma.',
    clinicalNote: 'Medullary thyroid cancer originates from C cells; calcitonin is the tumor marker.',
    difficulty: 'C1', tags: ['anatomy', 'histology', 'cancer']
  },
  {
    id: 'thy_009', module: 'thyroid', category: 'anatomy',
    term: 'thyroid capsule', abbreviation: null,
    vietnamese: 'vỏ bao tuyến giáp',
    pronunciation: '/ˈθaɪrɔɪd ˈkæpsjuːl/',
    definition: 'The fibrous sheath that encloses the thyroid gland and sends septa into the gland.',
    example: 'Tumor invasion through the thyroid capsule indicates extrathyroidal extension.',
    clinicalNote: 'Capsular invasion is an important prognostic factor in thyroid cancer staging.',
    difficulty: 'B2', tags: ['anatomy', 'pathology']
  },
  {
    id: 'thy_010', module: 'thyroid', category: 'anatomy',
    term: 'superior laryngeal nerve', abbreviation: 'SLN',
    vietnamese: 'thần kinh thanh quản trên',
    pronunciation: '/suːˈpɪəriər ləˈrɪndʒɪəl nɜːrv/',
    definition: 'A branch of the vagus nerve that innervates the cricothyroid muscle and provides sensation to the larynx.',
    example: 'The external branch of the SLN should be preserved during thyroid surgery.',
    clinicalNote: 'SLN injury causes voice pitch changes, especially in singers.',
    difficulty: 'C1', tags: ['anatomy', 'surgery', 'nerve']
  },
  // PHYSIOLOGY (10 terms)
  {
    id: 'thy_011', module: 'thyroid', category: 'physiology',
    term: 'thyroid-stimulating hormone', abbreviation: 'TSH',
    vietnamese: 'hormone kích thích tuyến giáp',
    pronunciation: '/ˈθaɪrɔɪd ˈstɪmjʊleɪtɪŋ ˈhɔːrmoʊn/',
    definition: 'A glycoprotein hormone secreted by the anterior pituitary that stimulates the thyroid gland to produce T3 and T4.',
    example: 'A low TSH suggests hyperthyroidism when thyroid hormone levels are elevated.',
    clinicalNote: 'TSH is the most sensitive test for thyroid function. Normal range: 0.4–4.0 mIU/L.',
    difficulty: 'B1', tags: ['physiology', 'hormone', 'laboratory']
  },
  {
    id: 'thy_012', module: 'thyroid', category: 'physiology',
    term: 'thyroxine', abbreviation: 'T4',
    vietnamese: 'thyroxin',
    pronunciation: '/θaɪˈrɒksɪn/',
    definition: 'The main hormone produced by the thyroid gland, a prohormone that is converted to the more active triiodothyronine (T3) in peripheral tissues.',
    example: 'Levothyroxine is a synthetic form of T4 used to treat hypothyroidism.',
    clinicalNote: 'T4 has a half-life of ~7 days. Most circulating T4 is protein-bound.',
    difficulty: 'B1', tags: ['physiology', 'hormone']
  },
  {
    id: 'thy_013', module: 'thyroid', category: 'physiology',
    term: 'triiodothyronine', abbreviation: 'T3',
    vietnamese: 'triiodothyronin',
    pronunciation: '/ˌtraɪˌaɪədoʊˈθaɪrəniːn/',
    definition: 'The active form of thyroid hormone, 3–4 times more potent than T4, produced in small amounts by the thyroid and primarily by peripheral conversion from T4.',
    example: 'T3 is the metabolically active thyroid hormone at the tissue level.',
    clinicalNote: 'T3 has a shorter half-life (~1 day) than T4. Used to assess hyperthyroidism.',
    difficulty: 'B2', tags: ['physiology', 'hormone']
  },
  {
    id: 'thy_014', module: 'thyroid', category: 'physiology',
    term: 'thyrotropin-releasing hormone', abbreviation: 'TRH',
    vietnamese: 'hormone giải phóng thyrotropin',
    pronunciation: '/θaɪˈrɒtrəpɪn rɪˈliːsɪŋ ˈhɔːrmoʊn/',
    definition: 'A tripeptide hormone released by the hypothalamus that stimulates the pituitary to secrete TSH.',
    example: 'TRH from the hypothalamus triggers TSH release from the anterior pituitary.',
    clinicalNote: 'Forms the basis of the hypothalamic-pituitary-thyroid (HPT) axis.',
    difficulty: 'B2', tags: ['physiology', 'hormone', 'axis']
  },
  {
    id: 'thy_015', module: 'thyroid', category: 'physiology',
    term: 'negative feedback', abbreviation: null,
    vietnamese: 'vòng phản hồi âm tính',
    pronunciation: '/ˈneɡətɪv ˈfiːdbæk/',
    definition: 'The regulatory mechanism by which elevated T3/T4 levels suppress TSH and TRH secretion, maintaining hormonal homeostasis.',
    example: 'Through negative feedback, high T4 levels reduce TSH secretion.',
    clinicalNote: 'This mechanism explains why TSH is suppressed in hyperthyroidism.',
    difficulty: 'B2', tags: ['physiology', 'endocrinology']
  },
  {
    id: 'thy_016', module: 'thyroid', category: 'physiology',
    term: 'thyroid peroxidase', abbreviation: 'TPO',
    vietnamese: 'thyroid peroxidase',
    pronunciation: '/ˈθaɪrɔɪd pəˈrɒksɪdeɪz/',
    definition: 'An enzyme essential for thyroid hormone synthesis that catalyzes the iodination of tyrosine residues on thyroglobulin.',
    example: 'Antithyroid drugs like propylthiouracil inhibit thyroid peroxidase activity.',
    clinicalNote: 'Anti-TPO antibodies are markers for autoimmune thyroid disease.',
    difficulty: 'C1', tags: ['physiology', 'biochemistry', 'enzyme']
  },
  {
    id: 'thy_017', module: 'thyroid', category: 'physiology',
    term: 'calcitonin', abbreviation: null,
    vietnamese: 'calcitonin',
    pronunciation: '/ˌkælsɪˈtoʊnɪn/',
    definition: 'A hormone produced by thyroid C cells that lowers blood calcium levels by inhibiting osteoclast activity and promoting calcium excretion.',
    example: 'Elevated calcitonin is a tumor marker for medullary thyroid carcinoma.',
    clinicalNote: 'MTC is associated with elevated serum calcitonin levels.',
    difficulty: 'B2', tags: ['physiology', 'hormone', 'calcium']
  },
  {
    id: 'thy_018', module: 'thyroid', category: 'physiology',
    term: 'iodine uptake', abbreviation: 'RAIU',
    vietnamese: 'độ hấp thu iod phóng xạ',
    pronunciation: '/ˈaɪədiːn ˈʌpteɪk/',
    definition: 'The ability of thyroid tissue to concentrate iodine from the bloodstream, measured by radioactive iodine uptake test.',
    example: 'High iodine uptake suggests Graves\' disease; low uptake suggests thyroiditis.',
    clinicalNote: 'Normal RAIU: 15–25% at 24 hours.',
    difficulty: 'C1', tags: ['physiology', 'diagnosis', 'nuclear']
  },
  {
    id: 'thy_019', module: 'thyroid', category: 'physiology',
    term: 'deiodination', abbreviation: null,
    vietnamese: 'khử iod',
    pronunciation: '/diːˌaɪəˈdɪneɪʃən/',
    definition: 'The enzymatic removal of iodine atoms from T4 in peripheral tissues, primarily converting T4 to the more active T3.',
    example: 'Peripheral deiodination of T4 to T3 occurs mainly in the liver and kidneys.',
    clinicalNote: 'Propylthiouracil inhibits peripheral deiodination; methimazole does not.',
    difficulty: 'C1', tags: ['physiology', 'biochemistry']
  },
  {
    id: 'thy_020', module: 'thyroid', category: 'physiology',
    term: 'free thyroxine index', abbreviation: 'FTI',
    vietnamese: 'chỉ số thyroxin tự do',
    pronunciation: '/friː θaɪˈrɒksɪn ˈɪndeks/',
    definition: 'A calculated estimate of free T4 based on total T4 and T3 resin uptake, less commonly used than direct FT4 measurement.',
    example: 'The free thyroxine index may be used when direct FT4 assays are unavailable.',
    clinicalNote: 'Direct FT4 measurement is now preferred.',
    difficulty: 'C1', tags: ['physiology', 'laboratory']
  },
  // DISEASES (15 terms)
  {
    id: 'thy_021', module: 'thyroid', category: 'pathology',
    term: 'hypothyroidism', abbreviation: null,
    vietnamese: 'suy giáp / nhược giáp',
    pronunciation: '/ˌhaɪpoʊˈθaɪrɔɪdɪzəm/',
    definition: 'A condition in which the thyroid gland produces insufficient thyroid hormone, leading to slowed metabolism.',
    example: 'Fatigue, weight gain, and cold intolerance are classic symptoms of hypothyroidism.',
    clinicalNote: 'Most common cause in iodine-sufficient areas is Hashimoto thyroiditis. TSH↑, FT4↓.',
    difficulty: 'B1', tags: ['pathology', 'common']
  },
  {
    id: 'thy_022', module: 'thyroid', category: 'pathology',
    term: 'hyperthyroidism', abbreviation: null,
    vietnamese: 'cường giáp',
    pronunciation: '/ˌhaɪpərˈθaɪrɔɪdɪzəm/',
    definition: 'A condition characterized by excessive production of thyroid hormones, causing accelerated metabolism.',
    example: 'Weight loss, palpitations, and heat intolerance suggest hyperthyroidism.',
    clinicalNote: 'Most common cause is Graves\' disease. TSH↓, FT4↑ and/or FT3↑.',
    difficulty: 'B1', tags: ['pathology', 'common']
  },
  {
    id: 'thy_023', module: 'thyroid', category: 'pathology',
    term: "Graves' disease", abbreviation: null,
    vietnamese: 'bệnh Graves / bệnh Basedow',
    pronunciation: '/ɡreɪvz dɪˈziːz/',
    definition: 'An autoimmune disorder in which thyroid-stimulating antibodies (TRAb) activate TSH receptors, causing diffuse thyroid enlargement and hyperthyroidism.',
    example: "Graves' disease is the most common cause of hyperthyroidism in adults.",
    clinicalNote: 'Classic triad: hyperthyroidism + goiter + exophthalmos (Merseburg triad).',
    difficulty: 'B2', tags: ['pathology', 'autoimmune', 'common']
  },
  {
    id: 'thy_024', module: 'thyroid', category: 'pathology',
    term: 'Hashimoto thyroiditis', abbreviation: null,
    vietnamese: 'viêm giáp Hashimoto',
    pronunciation: '/ˌhæʃɪˈmoʊtoʊ ˌθaɪrɔɪˈdaɪtɪs/',
    definition: 'A chronic autoimmune thyroiditis characterized by lymphocytic infiltration and progressive thyroid destruction, leading to hypothyroidism.',
    example: 'Anti-TPO antibodies are markedly elevated in Hashimoto thyroiditis.',
    clinicalNote: 'Most common cause of hypothyroidism in iodine-sufficient countries.',
    difficulty: 'B2', tags: ['pathology', 'autoimmune', 'common']
  },
  {
    id: 'thy_025', module: 'thyroid', category: 'pathology',
    term: 'goiter', abbreviation: null,
    vietnamese: 'bướu cổ / tuyến giáp to',
    pronunciation: '/ˈɡɔɪtər/',
    definition: 'Any abnormal enlargement of the thyroid gland, which may be diffuse or nodular, toxic or non-toxic.',
    example: 'Iodine deficiency is the most common cause of goiter worldwide.',
    clinicalNote: 'Classified as simple (non-toxic) or toxic; diffuse or nodular.',
    difficulty: 'B1', tags: ['pathology', 'common']
  },
  {
    id: 'thy_026', module: 'thyroid', category: 'pathology',
    term: 'thyroid nodule', abbreviation: null,
    vietnamese: 'nhân tuyến giáp',
    pronunciation: '/ˈθaɪrɔɪd ˈnɒdjuːl/',
    definition: 'A discrete lesion within the thyroid gland that is radiologically distinct from the surrounding thyroid parenchyma.',
    example: 'Thyroid nodules are found in up to 65% of the general population on ultrasound.',
    clinicalNote: 'Most nodules are benign; malignancy rate ~5–10%. Management guided by TIRADS.',
    difficulty: 'B2', tags: ['pathology', 'common', 'diagnosis']
  },
  {
    id: 'thy_027', module: 'thyroid', category: 'pathology',
    term: 'thyroid cancer', abbreviation: null,
    vietnamese: 'ung thư tuyến giáp',
    pronunciation: '/ˈθaɪrɔɪd ˈkænsər/',
    definition: 'Malignant neoplasm arising from thyroid tissue; types include papillary, follicular, medullary, and anaplastic carcinoma.',
    example: 'Papillary thyroid carcinoma is the most common type and has an excellent prognosis.',
    clinicalNote: 'PTC accounts for 85–90% of all thyroid cancers. BRAF V600E mutation is common.',
    difficulty: 'B2', tags: ['pathology', 'oncology']
  },
  {
    id: 'thy_028', module: 'thyroid', category: 'pathology',
    term: 'papillary thyroid carcinoma', abbreviation: 'PTC',
    vietnamese: 'ung thư tuyến giáp thể nhú',
    pronunciation: '/ˈpæpɪlɛri ˈθaɪrɔɪd kɑːrsɪˈnoʊmə/',
    definition: 'The most common type of thyroid cancer, with characteristic nuclear features (ground-glass nuclei, nuclear grooves, pseudoinclusions) and generally excellent prognosis.',
    example: 'PTC often spreads to regional lymph nodes but has a very favorable prognosis.',
    clinicalNote: '10-year survival rate >95%. BRAF V600E found in ~60% of cases.',
    difficulty: 'C1', tags: ['pathology', 'oncology', 'surgery']
  },
  {
    id: 'thy_029', module: 'thyroid', category: 'pathology',
    term: 'thyroid storm', abbreviation: null,
    vietnamese: 'cơn bão giáp',
    pronunciation: '/ˈθaɪrɔɪd stɔːrm/',
    definition: 'A life-threatening exacerbation of hyperthyroidism characterized by extreme hypermetabolism, hyperthermia, tachycardia, and altered mental status.',
    example: 'Thyroid storm is a medical emergency requiring immediate treatment in ICU.',
    clinicalNote: 'Mortality 10–30%. Precipitated by infection, surgery, trauma, or iodine load.',
    difficulty: 'C1', tags: ['pathology', 'emergency']
  },
  {
    id: 'thy_030', module: 'thyroid', category: 'pathology',
    term: 'myxedema coma', abbreviation: null,
    vietnamese: 'hôn mê phù niêm',
    pronunciation: '/ˌmɪksɪˈdiːmə ˈkoʊmə/',
    definition: 'A severe, life-threatening complication of hypothyroidism characterized by altered consciousness, hypothermia, and hemodynamic instability.',
    example: 'Myxedema coma often presents with hypothermia, bradycardia, and depressed consciousness.',
    clinicalNote: 'Medical emergency. Treat with IV levothyroxine + IV T3 + hydrocortisone.',
    difficulty: 'C1', tags: ['pathology', 'emergency']
  },
  {
    id: 'thy_031', module: 'thyroid', category: 'pathology',
    term: 'subacute thyroiditis', abbreviation: null,
    vietnamese: 'viêm giáp bán cấp',
    pronunciation: '/ˌsʌbəˈkjuːt ˌθaɪrɔɪˈdaɪtɪs/',
    definition: 'Inflammatory thyroid condition usually following viral infection, characterized by painful thyroid gland and transient thyroid dysfunction.',
    example: 'Subacute thyroiditis often presents with neck pain and transient hyperthyroidism.',
    clinicalNote: 'DeQuervain thyroiditis. Elevated ESR, low RAIU. Usually self-limiting.',
    difficulty: 'C1', tags: ['pathology']
  },
  {
    id: 'thy_032', module: 'thyroid', category: 'pathology',
    term: 'toxic adenoma', abbreviation: null,
    vietnamese: 'u tuyến giáp độc',
    pronunciation: '/ˈtɒksɪk ˌædɪˈnoʊmə/',
    definition: 'A benign, autonomously functioning thyroid nodule that produces thyroid hormone independently of TSH stimulation, causing hyperthyroidism.',
    example: 'A toxic adenoma typically appears as a hot nodule on thyroid scan.',
    clinicalNote: 'Hot nodule on scintigraphy; low risk of malignancy.',
    difficulty: 'C1', tags: ['pathology']
  },
  {
    id: 'thy_033', module: 'thyroid', category: 'pathology',
    term: 'congenital hypothyroidism', abbreviation: 'CH',
    vietnamese: 'suy giáp bẩm sinh',
    pronunciation: '/kənˈdʒenɪtəl ˌhaɪpoʊˈθaɪrɔɪdɪzəm/',
    definition: 'Thyroid hormone deficiency present from birth, causing intellectual disability and growth retardation if untreated.',
    example: 'Newborn screening programs detect congenital hypothyroidism early.',
    clinicalNote: 'Most preventable cause of intellectual disability. Screen by TSH heel-prick test.',
    difficulty: 'B2', tags: ['pathology', 'pediatric']
  },
  {
    id: 'thy_034', module: 'thyroid', category: 'pathology',
    term: 'exophthalmos', abbreviation: null,
    vietnamese: 'lồi mắt / exophthalmos',
    pronunciation: '/ˌeksɒfˈθælməs/',
    definition: 'Protrusion of the eyeballs beyond the orbital rim, a characteristic sign of Graves\' orbitopathy.',
    example: "Exophthalmos is a hallmark feature of Graves' disease.",
    clinicalNote: 'Also called proptosis. May cause corneal exposure and vision loss.',
    difficulty: 'B2', tags: ['pathology', 'graves']
  },
  {
    id: 'thy_035', module: 'thyroid', category: 'pathology',
    term: 'pretibial myxedema', abbreviation: null,
    vietnamese: 'phù niêm trước xương chày',
    pronunciation: '/priːˈtɪbiəl mɪksɪˈdiːmə/',
    definition: 'A localized, non-pitting skin lesion on the lower legs seen in Graves\' disease, caused by glycosaminoglycan deposition.',
    example: "Pretibial myxedema is a rare but specific manifestation of Graves' disease.",
    clinicalNote: 'Part of the Graves\' dermopathy triad with exophthalmos and thyroid acropachy.',
    difficulty: 'C1', tags: ['pathology', 'graves', 'dermatology']
  },
  // DIAGNOSIS (10 terms)
  {
    id: 'thy_036', module: 'thyroid', category: 'diagnosis',
    term: 'thyroid ultrasound', abbreviation: 'TUS',
    vietnamese: 'siêu âm tuyến giáp',
    pronunciation: '/ˈθaɪrɔɪd ˈʌltrəsaʊnd/',
    definition: 'The primary imaging modality for evaluating thyroid gland size, structure, and nodular characteristics using high-frequency sound waves.',
    example: 'Thyroid ultrasound revealed a 1.5 cm hypoechoic nodule in the right lobe.',
    clinicalNote: 'First-line imaging for thyroid assessment. TIRADS system used for nodule characterization.',
    difficulty: 'B1', tags: ['diagnosis', 'imaging']
  },
  {
    id: 'thy_037', module: 'thyroid', category: 'diagnosis',
    term: 'fine needle aspiration', abbreviation: 'FNA',
    vietnamese: 'chọc hút kim nhỏ',
    pronunciation: '/faɪn ˈniːdəl ˌæspɪˈreɪʃən/',
    definition: 'A minimally invasive diagnostic procedure using a thin needle to sample cells from a thyroid nodule for cytological analysis.',
    example: 'FNA biopsy is the gold standard for evaluating thyroid nodules >1 cm.',
    clinicalNote: 'Results classified by Bethesda System (I-VI). Bethesda VI = malignant.',
    difficulty: 'B2', tags: ['diagnosis', 'procedure']
  },
  {
    id: 'thy_038', module: 'thyroid', category: 'diagnosis',
    term: 'Bethesda classification', abbreviation: null,
    vietnamese: 'phân loại Bethesda',
    pronunciation: '/bɪˈθezdə ˌklæsɪfɪˈkeɪʃən/',
    definition: 'A standardized 6-category reporting system for thyroid FNA cytology results, correlating each category with cancer risk.',
    example: 'A Bethesda IV result carries a 15–30% risk of malignancy.',
    clinicalNote: 'I=non-diagnostic, II=benign, III=AUS, IV=FN, V=suspicious, VI=malignant.',
    difficulty: 'C1', tags: ['diagnosis', 'pathology', 'classification']
  },
  {
    id: 'thy_039', module: 'thyroid', category: 'diagnosis',
    term: 'TIRADS', abbreviation: 'TI-RADS',
    vietnamese: 'Hệ thống phân loại TIRADS',
    pronunciation: '/ˈtaɪrædz/',
    definition: 'Thyroid Imaging Reporting and Data System — a standardized risk stratification system for thyroid nodules on ultrasound.',
    example: 'A TIRADS 4 nodule has intermediate suspicion and FNA may be recommended.',
    clinicalNote: 'ACR TIRADS 5 = highly suspicious, recommend FNA if ≥1 cm.',
    difficulty: 'C1', tags: ['diagnosis', 'imaging', 'classification']
  },
  {
    id: 'thy_040', module: 'thyroid', category: 'diagnosis',
    term: 'thyroid scintigraphy', abbreviation: null,
    vietnamese: 'xạ hình tuyến giáp',
    pronunciation: '/ˈθaɪrɔɪd sɪnˈtɪɡrəfi/',
    definition: 'Nuclear medicine imaging using radioactive iodine or technetium to evaluate thyroid function and identify hot or cold nodules.',
    example: 'Thyroid scintigraphy showed an autonomous hot nodule in the right lobe.',
    clinicalNote: 'Cold nodule = decreased uptake → higher malignancy risk.',
    difficulty: 'C1', tags: ['diagnosis', 'nuclear medicine', 'imaging']
  },
  // TREATMENT (10 terms)
  {
    id: 'thy_041', module: 'thyroid', category: 'treatment',
    term: 'levothyroxine', abbreviation: 'LT4',
    vietnamese: 'levothyroxin',
    pronunciation: '/ˌliːvoʊˈθaɪrɒksɪn/',
    definition: 'Synthetic T4 used as the standard hormone replacement therapy for hypothyroidism.',
    example: 'Levothyroxine 50 mcg daily was prescribed for newly diagnosed hypothyroidism.',
    clinicalNote: 'Take on empty stomach 30–60 min before breakfast. Adjust dose by TSH.',
    difficulty: 'B1', tags: ['treatment', 'medication']
  },
  {
    id: 'thy_042', module: 'thyroid', category: 'treatment',
    term: 'antithyroid drug', abbreviation: 'ATD',
    vietnamese: 'thuốc kháng giáp',
    pronunciation: '/ˌæntiˈθaɪrɔɪd drʌɡ/',
    definition: 'Medications that reduce thyroid hormone synthesis, used primarily to treat hyperthyroidism.',
    example: 'Methimazole and propylthiouracil are the main antithyroid drugs used.',
    clinicalNote: 'Methimazole preferred over PTU except in first trimester pregnancy.',
    difficulty: 'B2', tags: ['treatment', 'medication', 'pharmacology']
  },
  {
    id: 'thy_043', module: 'thyroid', category: 'treatment',
    term: 'radioactive iodine therapy', abbreviation: 'RAI',
    vietnamese: 'điều trị iod phóng xạ',
    pronunciation: '/ˌreɪdioʊˈæktɪv ˈaɪədiːn ˈθerəpi/',
    definition: 'Treatment using radioactive iodine (I-131) to ablate thyroid tissue, used for hyperthyroidism or thyroid cancer.',
    example: 'Radioactive iodine therapy is a definitive treatment for Graves\' disease.',
    clinicalNote: 'Contraindicated in pregnancy. Patient should be isolated briefly after treatment.',
    difficulty: 'B2', tags: ['treatment', 'nuclear medicine']
  },
  {
    id: 'thy_044', module: 'thyroid', category: 'treatment',
    term: 'thyroidectomy', abbreviation: null,
    vietnamese: 'cắt tuyến giáp',
    pronunciation: '/ˌθaɪrɔɪˈdektəmi/',
    definition: 'Surgical removal of all or part of the thyroid gland.',
    example: 'Total thyroidectomy is the treatment of choice for thyroid cancer.',
    clinicalNote: 'Complications: RLN injury, hypoparathyroidism, hematoma, infection.',
    difficulty: 'B2', tags: ['treatment', 'surgery']
  },
  {
    id: 'thy_045', module: 'thyroid', category: 'treatment',
    term: 'radiofrequency ablation', abbreviation: 'RFA',
    vietnamese: 'đốt sóng cao tần',
    pronunciation: '/ˌreɪdioʊˈfriːkwənsi əˈbleɪʃən/',
    definition: 'A minimally invasive procedure using alternating current to generate heat and ablate thyroid nodules or recurrent thyroid cancer.',
    example: 'RFA was performed for a benign thyroid nodule causing compressive symptoms.',
    clinicalNote: 'Increasingly used for symptomatic benign nodules as alternative to surgery.',
    difficulty: 'C1', tags: ['treatment', 'procedure', 'minimally invasive']
  },
  {
    id: 'thy_046', module: 'thyroid', category: 'surgery',
    term: 'total thyroidectomy', abbreviation: 'TT',
    vietnamese: 'cắt bỏ toàn bộ tuyến giáp',
    pronunciation: '/ˈtoʊtəl ˌθaɪrɔɪˈdektəmi/',
    definition: 'Complete surgical removal of the entire thyroid gland.',
    example: 'Total thyroidectomy followed by RAI ablation is standard for intermediate-risk PTC.',
    clinicalNote: 'Requires lifelong levothyroxine replacement postoperatively.',
    difficulty: 'B2', tags: ['surgery']
  },
  {
    id: 'thy_047', module: 'thyroid', category: 'surgery',
    term: 'hemithyroidectomy', abbreviation: null,
    vietnamese: 'cắt nửa tuyến giáp',
    pronunciation: '/ˌhemiˌθaɪrɔɪˈdektəmi/',
    definition: 'Surgical removal of one thyroid lobe, typically performed for unilateral thyroid disease or low-risk thyroid cancer.',
    example: 'Hemithyroidectomy was performed for a 1.5 cm PTC confined to the right lobe.',
    clinicalNote: 'Also called lobectomy. May be sufficient for low-risk PTC ≤4 cm.',
    difficulty: 'B2', tags: ['surgery']
  },
  {
    id: 'thy_048', module: 'thyroid', category: 'surgery',
    term: 'central neck dissection', abbreviation: 'CND',
    vietnamese: 'nạo vét hạch trung tâm cổ',
    pronunciation: '/ˈsentrəl nek dɪˈsekʃən/',
    definition: 'Surgical removal of lymph nodes in the central compartment of the neck (level VI), performed for thyroid cancer staging and treatment.',
    example: 'Prophylactic central neck dissection was performed during total thyroidectomy for PTC.',
    clinicalNote: 'Level VI dissection. Risk of injury to RLN and parathyroid glands.',
    difficulty: 'C1', tags: ['surgery', 'oncology']
  },
  {
    id: 'thy_049', module: 'thyroid', category: 'surgery',
    term: 'TOETVA', abbreviation: 'TOETVA',
    vietnamese: 'cắt giáp nội soi qua tiền đình miệng',
    pronunciation: '/toʊˈetvə/',
    definition: 'Transoral Endoscopic Thyroidectomy Vestibular Approach — a scar-free endoscopic thyroid surgery performed through the oral vestibule.',
    example: 'TOETVA offers excellent cosmetic outcomes with no visible neck scar.',
    clinicalNote: 'Requires specialized training. Not suitable for large goiters or advanced cancer.',
    difficulty: 'C1', tags: ['surgery', 'minimally invasive']
  },
  {
    id: 'thy_050', module: 'thyroid', category: 'surgery',
    term: 'postoperative hypocalcemia', abbreviation: null,
    vietnamese: 'hạ canxi máu sau phẫu thuật',
    pronunciation: '/ˌpoʊstˈɒpərətɪv ˌhaɪpoʊkælˈsiːmiə/',
    definition: 'A common complication after thyroid surgery resulting from injury or inadvertent removal of the parathyroid glands, causing low calcium levels.',
    example: 'Postoperative hypocalcemia presented with perioral tingling and muscle cramps.',
    clinicalNote: 'Monitor Ca2+ and PTH postoperatively. Treat with calcium + vitamin D supplements.',
    difficulty: 'C1', tags: ['surgery', 'complication', 'calcium']
  },
];

import { THYROID_VOCABULARY_EXTRA } from './vocabulary_extra.js';
const COMBINED_THYROID_VOCABULARY = [...THYROID_VOCABULARY, ...THYROID_VOCABULARY_EXTRA];

export default COMBINED_THYROID_VOCABULARY;
