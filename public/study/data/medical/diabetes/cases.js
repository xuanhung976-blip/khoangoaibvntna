export const DIABETES_CASES = [
  {
    id: 'case_dm_001', title: 'Case 1: New-onset Type 2 Diabetes', difficulty: 'B1', category: 'type',
    scenario: 'A 56-year-old man presents to the clinic with a 2-month history of polyuria, polydipsia, and fatigue. He has gained 8 kg over the past year. His BMI is 31 kg/m². Family history is significant for diabetes (father). Fasting plasma glucose is 9.2 mmol/L and HbA1c is 8.7%.',
    scenarioVi: 'Bệnh nhân nam 56 tuổi đến khám với tiền sử 2 tháng tiểu nhiều, uống nhiều và mệt mỏi. Ông tăng 8 kg trong năm qua. BMI 31 kg/m². Tiền sử gia đình có bố bị đái tháo đường. Glucose huyết tương lúc đói 9.2 mmol/L và HbA1c 8.7%.',
    labResults: { FPG: '9.2 mmol/L (↑)', HbA1c: '8.7% (↑)', BMI: '31 kg/m² (obese)' },
    questions: [
      { q: 'What is the diagnosis?', a: 'Type 2 diabetes mellitus (FPG ≥7.0 AND HbA1c ≥6.5%)', hint: 'Check diagnostic criteria' },
      { q: 'What does HbA1c 8.7% indicate?', a: 'Poor glycemic control — average blood glucose approximately 11–12 mmol/L over past 3 months', hint: 'HbA1c target <7% for most patients' },
      { q: 'Translate: polyuria, polydipsia, fatigue', a: 'Tiểu nhiều, uống nhiều, mệt mỏi', hint: 'Classic triad + fatigue' },
      { q: 'What is the first-line treatment?', a: 'Lifestyle modification + metformin', hint: 'Diet, exercise, first-line oral medication' },
      { q: 'What monitoring is needed?', a: 'HbA1c every 3 months initially, then every 6 months; annual: eye exam, urine ACR, eGFR, foot exam, lipids, BP', hint: 'Comprehensive annual diabetes review' }
    ],
    keyTerms: ['type 2 diabetes', 'HbA1c', 'fasting plasma glucose', 'metformin', 'lifestyle modification']
  },
  {
    id: 'case_dm_002', title: 'Case 2: Diabetic Ketoacidosis', difficulty: 'C1', category: 'acute_complication',
    scenario: 'An 18-year-old woman with known type 1 diabetes presents to the emergency department with a 2-day history of nausea, vomiting, abdominal pain, and increased urination. She appears dehydrated with Kussmaul breathing and her breath has a fruity odor. Blood glucose is 28 mmol/L, pH 7.18, bicarbonate 8 mmol/L, and ketones strongly positive.',
    scenarioVi: 'Bệnh nhân nữ 18 tuổi có tiền sử đái tháo đường type 1 đến cấp cứu với 2 ngày buồn nôn, nôn mửa, đau bụng và tiểu nhiều. Bệnh nhân trông mất nước, thở Kussmaul và hơi thở có mùi trái cây. Glucose máu 28 mmol/L, pH 7.18, bicarbonate 8 mmol/L, ceton dương tính mạnh.',
    labResults: { Glucose: '28 mmol/L (↑↑)', pH: '7.18 (↓)', Bicarbonate: '8 mmol/L (↓)', Ketones: 'Strongly positive', 'Anion gap': '24 mEq/L (↑)' },
    questions: [
      { q: 'What is the diagnosis?', a: 'Diabetic ketoacidosis (DKA) — triad: hyperglycemia + ketonemia + metabolic acidosis', hint: 'Triad of DKA' },
      { q: 'What is Kussmaul breathing?', a: 'Deep, labored breathing — compensatory hyperventilation to blow off CO2 and correct metabolic acidosis', hint: 'Respiratory compensation for acidosis' },
      { q: 'Translate: fruity odor of the breath', a: 'Hơi thở có mùi trái cây / mùi aceton', hint: 'Due to acetone from ketosis' },
      { q: 'What is the treatment?', a: 'IV fluid resuscitation (0.9% NaCl) + IV insulin infusion + potassium replacement + identify and treat precipitating cause', hint: 'Fluid + insulin + potassium' },
      { q: 'Why is potassium important in DKA management?', a: 'Total body potassium is depleted in DKA; insulin therapy drives K+ into cells, risking dangerous hypokalemia', hint: 'Insulin shifts K+ intracellularly' }
    ],
    keyTerms: ['DKA', 'Kussmaul breathing', 'metabolic acidosis', 'ketosis', 'insulin therapy']
  },
  {
    id: 'case_dm_003', title: 'Case 3: Diabetic Retinopathy', difficulty: 'B2', category: 'chronic_complication',
    scenario: 'A 48-year-old woman with 15-year history of type 2 diabetes presents with blurred vision in the right eye. Her HbA1c has consistently been around 9%. Fundoscopy reveals new vessels on the disc (NVD) and vitreous hemorrhage in the right eye. Left eye shows exudates and microaneurysms.',
    scenarioVi: 'Bệnh nhân nữ 48 tuổi có tiền sử 15 năm đái tháo đường type 2 đến khám với mờ mắt phải. HbA1c luôn khoảng 9%. Soi đáy mắt phát hiện tân mạch trên đĩa (NVD) và xuất huyết dịch kính mắt phải. Mắt trái có xuất tiết và vi phình mạch.',
    labResults: { HbA1c: '9.0%', 'Right eye': 'NVD + vitreous hemorrhage (PDR)', 'Left eye': 'Exudates + microaneurysms (NPDR)' },
    questions: [
      { q: 'What stage is the right eye at?', a: 'Proliferative diabetic retinopathy (PDR) — new vessel formation (NVD) + vitreous hemorrhage', hint: 'New vessels = proliferative stage' },
      { q: 'What does microaneurysm mean?', a: 'Vi phình mạch — tiny balloon-like bulges in the wall of retinal blood vessels; earliest sign of DR', hint: 'micro = nhỏ, aneurysm = phình mạch' },
      { q: 'Translate: new vessels on the disc (NVD)', a: 'Tân mạch trên đĩa thị (NVD) — mạch máu mới bất thường mọc trên đĩa thị giác', hint: 'NVD = neovascularization of disc' },
      { q: 'What treatment is needed for PDR?', a: 'Panretinal photocoagulation (laser) or intravitreal anti-VEGF injections; vitrectomy for vitreous hemorrhage', hint: 'Laser or anti-VEGF' },
      { q: 'How could this have been prevented?', a: 'Better glycemic control (HbA1c <7%), annual fundoscopy, BP control, early laser treatment when detected', hint: 'Prevention focuses on risk factor control' }
    ],
    keyTerms: ['diabetic retinopathy', 'fundoscopy', 'microaneurysm', 'neovascularization', 'proliferative DR']
  },
  {
    id: 'case_dm_004', title: 'Case 4: Type 1 Diabetes with Hypoglycemia', difficulty: 'B2', category: 'acute_complication',
    scenario: 'A 24-year-old man with type 1 diabetes on basal-bolus insulin is found unresponsive by his roommate. He had exercised intensely that afternoon and skipped a snack. Blood glucose measured by paramedics is 1.8 mmol/L. He is treated with IV dextrose and regains consciousness.',
    scenarioVi: 'Bệnh nhân nam 24 tuổi bị đái tháo đường type 1, đang dùng insulin nền-bữa được người cùng phòng phát hiện bất tỉnh. Anh đã tập thể dục cường độ cao buổi chiều và bỏ bữa ăn nhẹ. Paramedic đo đường huyết 1.8 mmol/L. Bệnh nhân được truyền dextrose tĩnh mạch và phục hồi ý thức.',
    labResults: { Glucose: '1.8 mmol/L (↓↓)', Status: 'Unconscious (Level 3 hypoglycemia)' },
    questions: [
      { q: 'What is this condition?', a: 'Severe hypoglycemia (Level 3) — blood glucose <3.9 mmol/L with severe cognitive impairment requiring external assistance', hint: 'Glucose <3.9 + unconscious' },
      { q: 'What precipitated the hypoglycemia?', a: 'Intense exercise + missed snack — exercise increases glucose uptake; without extra carbohydrates, glucose dropped dangerously', hint: 'Exercise + skipped meal' },
      { q: 'Translate: basal-bolus insulin regimen', a: 'Phác đồ insulin nền-bữa: insulin tác dụng dài (nền) + insulin tác dụng nhanh trước bữa ăn (bữa)', hint: 'Two types of insulin' },
      { q: 'What is the treatment for severe hypoglycemia?', a: 'IV dextrose (25–50 mL of 50% dextrose) or IM/SC glucagon if no IV access. Once conscious: oral carbohydrates', hint: 'IV dextrose or glucagon' },
      { q: 'How should this be prevented?', a: 'Reduce insulin before exercise, eat extra carbohydrates, use CGM for real-time glucose alerts, educate on hypoglycemia recognition', hint: 'Exercise precautions + CGM' }
    ],
    keyTerms: ['severe hypoglycemia', 'basal-bolus insulin', 'exercise', 'dextrose', 'glucagon']
  },
  {
    id: 'case_dm_005', title: 'Case 5: Diabetic Foot Ulcer', difficulty: 'C1', category: 'chronic_complication',
    scenario: 'A 65-year-old man with 20-year history of type 2 diabetes presents with a painless ulcer on the sole of his right foot for 3 weeks. He did not notice the wound until he saw blood on his sock. He has no sensation to 10g monofilament testing. X-ray shows no osteomyelitis. ABI is 0.6.',
    scenarioVi: 'Bệnh nhân nam 65 tuổi, tiền sử 20 năm đái tháo đường type 2 đến khám với vết loét không đau ở lòng bàn chân phải 3 tuần. Ông không biết có vết thương cho đến khi thấy máu trên tất. Mất cảm giác với monofilament 10g. X-quang không thấy viêm xương tủy. ABI 0.6.',
    labResults: { ABI: '0.6 (PAD confirmed)', '10g monofilament': 'No sensation (neuropathy)', 'X-ray foot': 'No osteomyelitis', HbA1c: '10.2%' },
    questions: [
      { q: 'Why did the patient not feel pain from the ulcer?', a: 'Diabetic peripheral neuropathy — nerve damage causes loss of protective sensation, making the patient unaware of injury', hint: 'Loss of pain sensation = neuropathy' },
      { q: 'What does ABI 0.6 indicate?', a: 'Significant peripheral arterial disease — poor blood flow to the foot, which impairs wound healing', hint: 'Normal ABI 0.9-1.3; <0.9 = PAD' },
      { q: 'Translate: painless ulcer on the sole of the foot', a: 'Vết loét không đau ở lòng bàn chân', hint: 'sole = lòng bàn chân' },
      { q: 'What is the management?', a: '1) Wound debridement and dressing, 2) Offloading (remove pressure), 3) Control infection with antibiotics if infected, 4) Vascular assessment for revascularization, 5) Optimize glycemic control', hint: 'Wound care + offloading + vascular' },
      { q: 'How should a diabetic patient care for their feet daily?', a: 'Daily inspection, wash and dry carefully, moisturize, proper footwear, never walk barefoot, regular podiatry visits', hint: 'The 5 keys of foot care' }
    ],
    keyTerms: ['diabetic foot', 'neuropathy', 'peripheral arterial disease', 'ABI', 'monofilament testing']
  },
];

export default DIABETES_CASES;
