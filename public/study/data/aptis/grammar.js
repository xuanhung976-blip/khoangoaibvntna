export const APTIS_GRAMMAR = [
  {
    id: 'ag_001', topic: 'Core Grammar Test Format',
    explanation: 'The APTIS Core Grammar component tests various grammar areas through multiple-choice questions. Common topics include: verb tenses, reported speech, modal verbs, conditionals, and relative clauses.',
    exercises: [
      { id: 'ag_ex_001', question: 'She ________ at the clinic since 2018.', options: ['works', 'is working', 'has been working', 'worked'], answer: 2, explanation: 'Present perfect continuous: ongoing action from past to present.' },
      { id: 'ag_ex_002', question: 'The medication ________ to patients before meals.', options: ['should give', 'should be given', 'should giving', 'should gave'], answer: 1, explanation: 'Modal passive: should be given (modal + be + past participle).' },
      { id: 'ag_ex_003', question: '\'Despite ________ tired, she completed all the tasks.\'', options: ['feeling', 'felt', 'to feel', 'feel'], answer: 0, explanation: 'Despite/despite + gerund (verb-ing).' },
      { id: 'ag_ex_004', question: 'The patient ________ whose condition was critical was transferred to ICU.', options: ['who', 'whom', 'whose', 'which'], answer: 0, explanation: 'Who = for people (subject position). Note: "whose" would need "the patient whose condition..." — here it is "who" as the relative pronoun is the subject.' },
      { id: 'ag_ex_005', question: 'He asked me where I ________ the day before.', options: ['was', 'have been', 'had been', 'am'], answer: 2, explanation: 'Reported speech: past perfect is used for the tense one step back from past simple.' },
      { id: 'ag_ex_006', question: 'By the time the doctor arrived, the patient ________ conscious.', options: ['regained', 'has regained', 'had regained', 'regains'], answer: 2, explanation: 'Past perfect for action completed before another past action.' },
      { id: 'ag_ex_007', question: 'I wish I ________ more time to study for the APTIS exam.', options: ['had', 'have', 'would have', 'will have'], answer: 0, explanation: 'Wish + past simple = unreal present wish.' },
      { id: 'ag_ex_008', question: 'The results, ________ were unexpected, surprised the research team.', options: ['who', 'that', 'which', 'whose'], answer: 2, explanation: 'Non-restrictive relative clause with comma uses which (not that).' },
    ]
  }
];

export default APTIS_GRAMMAR;
