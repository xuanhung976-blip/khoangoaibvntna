export const VSTEP_GRAMMAR = [
  {
    id: 'vg_001', level: 'B1', topic: 'Passive Voice',
    explanation: 'Passive voice is used when the subject receives the action. Formula: Subject + be + past participle + (by + agent).',
    examples: [
      { active: 'The doctor treats the patient.', passive: 'The patient is treated by the doctor.' },
      { active: 'They will announce the results tomorrow.', passive: 'The results will be announced tomorrow.' }
    ],
    exercises: [
      { type: 'transform', question: 'Change to passive: "The nurse administered the medication."', answer: 'The medication was administered by the nurse.' },
      { type: 'multiple-choice', question: 'The report ________ by the team last week.', options: ['was written', 'wrote', 'is writing', 'has written'], answer: 0 }
    ]
  },
  {
    id: 'vg_002', level: 'B2', topic: 'Conditional Sentences',
    explanation: 'Type 3 conditional: If + past perfect, would have + past participle. Used for unreal/hypothetical past situations.',
    examples: [
      { sentence: 'If she had taken the medication, she would have recovered faster.', vi: 'Nếu cô ấy đã uống thuốc, cô ấy đã hồi phục nhanh hơn.' },
      { sentence: 'If the results had shown infection, we would have prescribed antibiotics.', vi: 'Nếu kết quả cho thấy nhiễm trùng, chúng tôi đã kê kháng sinh.' }
    ],
    exercises: [
      { type: 'fill-blank', question: 'If the patient ________ (take) the medication, the symptoms would have improved.', answer: 'had taken' },
      { type: 'multiple-choice', question: 'Had the researchers found the data, they ________ their study.', options: ['would have published', 'will publish', 'would publish', 'had published'], answer: 0 }
    ]
  },
  {
    id: 'vg_003', level: 'B2', topic: 'Relative Clauses',
    explanation: 'Relative clauses provide more information about a noun. Who (people), which/that (things), whose (possession), where (places), when (time).',
    examples: [
      { sentence: 'The patient whose lab results were abnormal was admitted immediately.', vi: 'Bệnh nhân có kết quả xét nghiệm bất thường đã được nhập viện ngay.' },
      { sentence: 'The hospital where I work has 500 beds.', vi: 'Bệnh viện nơi tôi làm việc có 500 giường.' }
    ],
    exercises: [
      { type: 'multiple-choice', question: 'The medication ________ the doctor prescribed has many side effects.', options: ['which', 'who', 'whose', 'where'], answer: 0 },
      { type: 'fill-blank', question: 'The patient ________ condition worsened was moved to ICU.', answer: 'whose' }
    ]
  },
  {
    id: 'vg_004', level: 'C1', topic: 'Inversion for Emphasis',
    explanation: 'Inversion places the auxiliary before the subject for emphasis or in formal writing. Used with negative adverbs: Never, Rarely, Seldom, Not only...but also, Hardly...when.',
    examples: [
      { normal: 'We have rarely seen such a complex case.', inverted: 'Rarely have we seen such a complex case.' },
      { normal: 'The medication not only reduced pain but also improved mobility.', inverted: 'Not only did the medication reduce pain, but it also improved mobility.' }
    ],
    exercises: [
      { type: 'transform', question: 'Rewrite using inversion: "We have never encountered this complication before."', answer: 'Never have we encountered this complication before.' },
      { type: 'multiple-choice', question: 'Not only ________ the treatment effective, but it was also affordable.', options: ['was', 'is', 'were', 'be'], answer: 0 }
    ]
  },
  {
    id: 'vg_005', level: 'B1', topic: 'Present Perfect vs Past Simple',
    explanation: 'Present perfect: experience/result up to now (have/has + past participle). Past simple: completed action at specific past time.',
    examples: [
      { pp: 'She has worked at this hospital for 10 years. (still works)', ps: 'She worked at that hospital in 2018. (no longer there)' },
      { pp: 'Researchers have found a new treatment. (result matters now)', ps: 'Researchers found a treatment in 2020. (specific time)' }
    ],
    exercises: [
      { type: 'multiple-choice', question: 'The patient ________ three surgeries since 2020.', options: ['has had', 'had', 'has', 'had had'], answer: 0 },
      { type: 'fill-blank', question: 'Scientists ________ (discover) penicillin in 1928.', answer: 'discovered' }
    ]
  }
];

export default VSTEP_GRAMMAR;
