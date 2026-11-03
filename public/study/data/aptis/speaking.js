export const APTIS_SPEAKING = [
  {
    id: 'as_001', component: 'Speaking Part 1 - Personal Questions',
    questions: [
      { id: 'as_001_q1', question: 'Tell me about your job or studies.', level: 'A2-B1', sampleAnswer: 'I am a [doctor/nurse/student] working at/studying at [place]. My main responsibilities include [briefly describe]. I have been doing this for [time]. I enjoy it because [reason].', tip: 'Keep it brief and relevant. Use present simple for regular activities.' },
      { id: 'as_001_q2', question: 'What do you do in your free time?', level: 'A2-B1', sampleAnswer: 'In my free time, I enjoy reading medical journals and learning new languages. I also like going for walks and cooking traditional Vietnamese food with my family.', tip: 'Use a variety of present simple and present continuous.' },
      { id: 'as_001_q3', question: 'Describe a typical working day.', level: 'B1', sampleAnswer: 'I usually start my day at 7 AM. First, I review patient notes from the night shift, then I do ward rounds with the team at 8 AM. In the afternoon, I attend outpatient clinics and complete documentation. I typically finish around 5 PM.', tip: 'Use sequence adverbs: first, then, after that, finally.' }
    ]
  },
  {
    id: 'as_002', component: 'Speaking Part 2 - Image Description',
    instructions: 'Describe the image in detail. Talk about what you can see, what is happening, and relate it to the topic.',
    topics: [
      { id: 'as_002_t1', topic: 'A doctor examining a patient', keyVocabulary: ['examine', 'stethoscope', 'medical history', 'patient consultation', 'check-up'], samplePhrases: ['The doctor appears to be...', 'In the background, I can see...', 'The patient seems to be...', 'This image depicts a typical...'] },
      { id: 'as_002_t2', topic: 'A hospital ward', keyVocabulary: ['hospital bed', 'medical equipment', 'nursing staff', 'IV drip', 'vital signs monitor'], samplePhrases: ['The ward contains...', 'There are several...', 'The healthcare workers are...'] }
    ]
  },
  {
    id: 'as_003', component: 'Speaking Part 3 - Opinion Questions',
    questions: [
      { id: 'as_003_q1', question: 'Do you think technology has improved healthcare? Why or why not?', level: 'B2', guidedStructure: '1. State opinion clearly → 2. Give reason 1 + example → 3. Give reason 2 → 4. Acknowledge limitation → 5. Restate opinion', keyPhrases: ['In my opinion...', 'For instance...', 'On the other hand...', 'Overall, I believe...'] },
      { id: 'as_003_q2', question: 'What are the advantages and disadvantages of telemedicine?', level: 'B2', guidedStructure: '1. Advantages (2–3 points) → 2. Disadvantages (2 points) → 3. Balanced conclusion', keyPhrases: ['One significant advantage is...', 'However, a major drawback is...', 'Despite this...'] }
    ]
  }
];

export default APTIS_SPEAKING;
