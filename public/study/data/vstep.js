// VSTEP Data Aggregator
import { VSTEP_VOCABULARY } from './vstep/vocabulary.js';
import { VSTEP_VOCABULARY_OXFORD } from './vstep/vocabulary_oxford.js';
import { VSTEP_GRAMMAR } from './vstep/grammar.js';
import { VSTEP_READING } from './vstep/reading.js';
import { VSTEP_WRITING } from './vstep/writing.js';
import { VSTEP_SPEAKING } from './vstep/speaking.js';

// Define VSTEP Topics Registry
export const VSTEP_TOPICS = [
  { category: 'education', title: 'Education', titleVi: 'Giáo dục & Học tập', icon: '🏫' },
  { category: 'technology', title: 'Technology', titleVi: 'Khoa học & Công nghệ', icon: '💻' },
  { category: 'environment', title: 'Environment', titleVi: 'Môi trường & Tự nhiên', icon: '🌱' },
  { category: 'health', title: 'Health', titleVi: 'Sức khỏe & Lối sống', icon: '🏥' },
  { category: 'work', title: 'Work & Career', titleVi: 'Công việc & Sự nghiệp', icon: '💼' },
  { category: 'travel', title: 'Travel & Tourism', titleVi: 'Du lịch & Lữ hành', icon: '✈️' },
  { category: 'society', title: 'Society & Family', titleVi: 'Gia đình & Xã hội', icon: '👥' },
  { category: 'media', title: 'Media & Arts', titleVi: 'Truyền thông & Nghệ thuật', icon: '🎨' },
  { category: 'general', title: 'General Academic', titleVi: 'Học thuật chung', icon: '📚' }
];

const TOPIC_KEYWORDS = {
  education: ['school', 'learn', 'teach', 'student', 'academic', 'analyze', 'lecture', 'university', 'study', 'assess', 'degree', 'certificate', 'cognitive', 'syllabus', 'curriculum', 'educate', 'knowledge', 'logic', 'instruction', 'explain'],
  technology: ['computer', 'tech', 'digital', 'online', 'device', 'database', 'code', 'internet', 'software', 'hardware', 'facilitate', 'innovate', 'cyber', 'automate', 'virtual', 'artificial', 'signal', 'network', 'telecom', 'application'],
  environment: ['nature', 'climate', 'ecology', 'green', 'environment', 'forest', 'flood', 'weather', 'global', 'warming', 'sustainable', 'animal', 'species', 'conservation', 'pollute', 'recycle', 'waste', 'energy', 'carbon', 'atmosphere'],
  health: ['doctor', 'hospital', 'medicine', 'disease', 'health', 'insulin', 'glucose', 'diabetic', 'cancer', 'cardiac', 'chronic', 'acute', 'therapy', 'clinical', 'symptom', 'patient', 'vaccine', 'hygiene', 'exercise', 'diet', 'nutrition'],
  work: ['job', 'career', 'work', 'salary', 'employment', 'manager', 'boss', 'business', 'trade', 'company', 'finance', 'budget', 'resume', 'recruit', 'promotion', 'collaborate', 'evaluate', 'coordinate', 'office', 'contract'],
  travel: ['tour', 'travel', 'journey', 'destination', 'flight', 'ticket', 'hotel', 'culture', 'heritage', 'explore', 'wander', 'transit', 'passport', 'luggage', 'vacation', 'holiday', 'custom', 'tradition', 'cruise', 'trip'],
  society: ['family', 'parent', 'child', 'social', 'population', 'citizen', 'community', 'government', 'policy', 'laws', 'justice', 'human', 'behavior', 'culture', 'ethics', 'marriage', 'community', 'urban', 'nation', 'public'],
  media: ['news', 'press', 'show', 'art', 'music', 'movie', 'radio', 'television', 'broadcast', 'advertise', 'internet', 'book', 'print', 'journal', 'publish', 'paint', 'drama', 'entertainment', 'cinema', 'auditory']
};

function getWordCategory(wordObj) {
  // If word already has a valid tag matching a topic
  const wordTags = wordObj.tags || [];
  for (const tag of wordTags) {
    if (TOPIC_KEYWORDS[tag]) return tag;
  }
  
  const textToSearch = `${wordObj.word} ${wordObj.definition || ''} ${wordObj.meaning || ''} ${wordTags.join(' ')}`.toLowerCase();
  
  for (const [category, keywords] of Object.entries(TOPIC_KEYWORDS)) {
    if (keywords.some(kw => textToSearch.includes(kw))) {
      return category;
    }
  }
  
  return 'general';
}

// Combine standard list with Oxford 5000 list and assign topic categories
const combinedVocab = [...VSTEP_VOCABULARY, ...VSTEP_VOCABULARY_OXFORD].map(w => {
  const category = getWordCategory(w);
  const vi = (w.vi || w.meaning || w.vietnamese || '').trim();
  return {
    ...w,
    vi,
    meaning: vi,
    vietnamese: vi,
    term: w.word,
    category,
    tags: Array.isArray(w.tags) ? [...new Set([...w.tags, category])] : [category]
  };
});

// Build vocabulary by level
const vocabByLevel = {
  B1: combinedVocab.filter(w => w.level === 'B1' || w.difficulty === 'B1'),
  B2: combinedVocab.filter(w => w.level === 'B2' || w.difficulty === 'B2'),
  C1: combinedVocab.filter(w => w.level === 'C1' || w.difficulty === 'C1'),
};

const VSTEP_DATA = {
  vocabulary: vocabByLevel,
  allVocabulary: combinedVocab,
  topics: VSTEP_TOPICS,
  grammar: VSTEP_GRAMMAR,
  reading: VSTEP_READING,
  writing: VSTEP_WRITING,
  speaking: VSTEP_SPEAKING,
  quizzes: [],
};

export default VSTEP_DATA;
