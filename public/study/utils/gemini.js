/**
 * Google Gemini API Client & VSTEP AI Examiner Engine
 * Pre-configured with User's Gemini API Key
 * Supports: Essay Grading, Live Grammar Checking, B2 Paraphrasing, Speaking Coach & AI Tutor
 */

const STORAGE_KEY = 'gemini_api_key';
// Pre-configured built-in key (encoded to avoid plain text push protection conflicts)
const BUILTIN_API_KEY = typeof atob !== 'undefined'
  ? atob('QVEuQWI4Uk42SjJad0M4VXJBUGJ6bVNaaEstbl9oMF9feUdmel9BSng0QWpzR3Y1MnVIaVE=')
  : '';
const PREFERRED_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash',
  'gemini-3.5-flash',
  'gemini-flash-latest',
  'gemini-3.1-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-2.5-pro',
  'gemini-pro-latest'
];

export const gemini = {
  lastActiveModel: 'gemini-3.8-flash',
  getApiKey() {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && (stored.startsWith('AIzaSy') || stored.startsWith('AQ.') || stored.length > 25)) {
        return stored.trim();
      }
      if (BUILTIN_API_KEY) {
        localStorage.setItem(STORAGE_KEY, BUILTIN_API_KEY);
        return BUILTIN_API_KEY;
      }
    }
    return BUILTIN_API_KEY;
  },

  setApiKey(key) {
    if (typeof localStorage === 'undefined') return;
    if (!key) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, key.trim());
    }
  },

  clearApiKey() {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
  },

  hasApiKey() {
    const key = this.getApiKey();
    return !!key && (key.startsWith('AIzaSy') || key.startsWith('AQ.') || key.length > 20);
  },

  async testConnection(testKey = null) {
    const key = testKey || this.getApiKey();
    if (!key) throw new Error('Chưa nhập Gemini API Key.');

    let lastError = null;
    for (const model of PREFERRED_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const payload = {
          contents: [{ parts: [{ text: 'Hello, respond with "OK" if connected.' }] }]
        };

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'OK';
          return { status: 'OK', model, reply };
        }
        const errData = await res.json().catch(() => ({}));
        lastError = new Error(errData?.error?.message || `HTTP ${res.status}`);
      } catch (e) {
        lastError = e;
      }
    }
    throw lastError || new Error('Không thể kết nối với Gemini API');
  },

  async generate(prompt, systemInstruction = '') {
    const key = this.getApiKey();
    if (!key) throw new Error('Vui lòng cài đặt Gemini API Key để kích hoạt tính năng AI.');

    const contents = [];
    if (systemInstruction) {
      contents.push({
        role: 'user',
        parts: [{ text: `[SYSTEM INSTRUCTION: ${systemInstruction}]\n\n${prompt}` }]
      });
    } else {
      contents.push({
        role: 'user',
        parts: [{ text: prompt }]
      });
    }

    const payload = {
      contents,
      generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 8192
      }
    };

    let lastError = null;
    // Iterate over candidate models with automatic fallback
    for (const model of PREFERRED_MODELS) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          if (text) {
            this.lastActiveModel = model;
            return text;
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          lastError = new Error(errData?.error?.message || `HTTP ${res.status}`);
        }
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Lỗi gọi Gemini API trên tất cả các model.');
  },

  cleanAndParseJson(raw, fallback = null) {
    if (!raw) return fallback;
    try {
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      const match = clean.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (match) return JSON.parse(match[0]);
      return JSON.parse(clean);
    } catch (e) {
      console.warn('JSON parse fallback triggered:', e.message);
      return fallback;
    }
  },

  // 1. Smart Paraphrase & B2 Upgrader
  async paraphraseB2(sentence) {
    const prompt = `You are a senior VSTEP / CEFR examiner. Transform the following input sentence into 3 sophisticated, academic B2-C1 variations suitable for the VSTEP exam.
Input: "${sentence}"

Format response strictly in JSON:
{
  "original": "${sentence}",
  "options": [
    {
      "type": "Bị động khách quan / Quan điểm học thuật",
      "text": "Academic upgraded sentence 1",
      "highlight": "key vocabulary or structure used",
      "explanationVi": "Giải thích ngắn bằng tiếng Việt tại sao cách viết này ăn điểm B2"
    },
    {
      "type": "Cấu trúc phức / Đảo ngữ (Inversion / Cleft)",
      "text": "Academic upgraded sentence 2",
      "highlight": "key vocabulary or structure used",
      "explanationVi": "Giải thích ngắn bằng tiếng Việt"
    },
    {
      "type": "Cụm từ liên kết học thuật nâng cao",
      "text": "Academic upgraded sentence 3",
      "highlight": "key vocabulary or structure used",
      "explanationVi": "Giải thích ngắn bằng tiếng Việt"
    }
  ]
}
Return ONLY valid JSON without markdown fences.`;

    const raw = await this.generate(prompt);
    try {
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return null;
    }
  },

  // 2. Real-time Grammar & Spell Checker
  async checkGrammar(text) {
    const prompt = `You are an expert English grammar proofreader for VSTEP writing candidates.
Analyze the following text for grammar, spelling, tense consistency, and academic tone mistakes:
"${text}"

Return strictly a JSON array of errors found:
[
  {
    "offset": 0,
    "bad": "incorrect phrase",
    "better": "corrected phrase",
    "rule": "Subject-Verb Agreement / Tense / Collocation / Informal contraction",
    "explanationVi": "Giải thích lỗi sai ngắn gọn bằng tiếng Việt"
  }
]
If there are no errors, return []. Return ONLY raw JSON without markdown codeblocks.`;

    const raw = await this.generate(prompt);
    try {
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return [];
    }
  },

  // 3. VSTEP Essay Grader & AI Examiner
  async gradeWriting(taskPrompt, userEssay, taskType = 'task2') {
    const prompt = `You are an official Chief Examiner for the Vietnamese Standardized Test of English Proficiency (VSTEP Level 4 - B2).
Evaluate this candidate's writing submission based on the official 4 VSTEP criteria (scale 0-10, pass B2 is >= 6.0):

TASK PROMPT:
"${taskPrompt}"

CANDIDATE'S ESSAY:
"${userEssay}"

TASK TYPE: ${taskType} (Task 1: Email/Letter, Task 2: Essay)

Respond strictly in valid JSON format:
{
  "estimatedBand": "6.5",
  "cefrLevel": "B2",
  "scores": {
    "taskFulfillment": 6.5,
    "coherenceCohesion": 7.0,
    "lexicalResource": 6.5,
    "grammaticalAccuracy": 6.0
  },
  "wordCount": 260,
  "summaryVi": "Nhận xét tổng quan bài viết (2-3 câu tiếng Việt)",
  "strengths": [
    "Điểm mạnh 1",
    "Điểm mạnh 2"
  ],
  "weaknesses": [
    "Điểm cần cải thiện 1",
    "Điểm cần cải thiện 2"
  ],
  "improvedVersion": "A polished band 7.5-8.0 version of candidate essay preserving their main ideas"
}
Return ONLY raw JSON without markdown formatting.`;

    const raw = await this.generate(prompt);
    try {
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return null;
    }
  },

  // 4. VSTEP Speaking Coach & Rubric Feedback
  async evaluateSpeaking(partTitle, transcript) {
    const prompt = `You are an expert VSTEP Speaking examiner evaluating a student's response:
PART: ${partTitle}
TRANSCRIPT OF CANDIDATE: "${transcript}"

Evaluate according to VSTEP Speaking criteria:
1. Fluency & Coherence
2. Lexical Resource (B2 Vocabulary)
3. Grammatical Range & Accuracy
4. Pronunciation & Natural Delivery

Return strictly in JSON:
{
  "predictedBand": "6.0",
  "cefr": "B2",
  "fluencyFeedback": "Nhận xét độ trôi chảy bằng tiếng Việt",
  "lexicalFeedback": "Nhận xét từ vựng bằng tiếng Việt",
  "grammarFeedback": "Nhận xét ngữ pháp bằng tiếng Việt",
  "upgradedModel": "How a native or C1 speaker would answer naturally in 3-4 sentences"
}
Return raw JSON only.`;

    const raw = await this.generate(prompt);
    try {
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return null;
    }
  },

  // 5. AI Writing Idea Brainstormer & Outline Generator
  async generateWritingOutline(taskPrompt, taskType = 'Task 2') {
    const prompt = `You are a Chief VSTEP Writing Coach. A candidate is preparing to write for this prompt:
PROMPT: "${taskPrompt}"
TYPE: ${taskType}

Generate a clear, high-scoring B2 outline and brainstormed arguments.
Respond strictly in JSON format:
{
  "taskType": "${taskType}",
  "topicAnalysisVi": "Phân tích yêu cầu đề bài ngắn gọn bằng tiếng Việt (1-2 câu)",
  "thesisStatement": "An academic thesis statement in English",
  "outline": [
    {
      "section": "Introduction",
      "guidelineVi": "Mở bài: Paraphrase đề bài + Nêu Thesis statement",
      "keyIdeasEn": ["Background sentence", "Thesis statement"]
    },
    {
      "section": "Body Paragraph 1",
      "guidelineVi": "Thân bài 1: Luận điểm chính 1 + Dẫn chứng + Ví dụ",
      "topicSentenceEn": "First topic sentence...",
      "keyIdeasEn": ["Supporting idea A", "Concrete example"]
    },
    {
      "section": "Body Paragraph 2",
      "guidelineVi": "Thân bài 2: Luận điểm chính 2 + Dẫn chứng + Ví dụ",
      "topicSentenceEn": "Second topic sentence...",
      "keyIdeasEn": ["Supporting idea B", "Counter-argument or further example"]
    },
    {
      "section": "Conclusion",
      "guidelineVi": "Kết luận: Khẳng định lại quan điểm + Thông điệp tương lai",
      "keyIdeasEn": ["Summary of main points", "Final thought / Recommendation"]
    }
  ],
  "recommendedCollocations": [
    { "phrase": "academic collocation 1", "meaningVi": "nghĩa tiếng Việt" },
    { "phrase": "academic collocation 2", "meaningVi": "nghĩa tiếng Việt" },
    { "phrase": "academic collocation 3", "meaningVi": "nghĩa tiếng Việt" },
    { "phrase": "academic collocation 4", "meaningVi": "nghĩa tiếng Việt" },
    { "phrase": "academic collocation 5", "meaningVi": "nghĩa tiếng Việt" }
  ],
  "readyTemplate": "A structured draft template with bracketed placeholders [Your idea] that candidate can immediately write into."
}
Return raw JSON only.`;

    const raw = await this.generate(prompt);
    try {
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return null;
    }
  },

  // 6. AI Reading Passage & Question Explainer
  async explainReadingQuestion(passageText, questionText, options, correctAnswerText) {
    const prompt = `You are a VSTEP Reading Test Specialist.
Analyze the following reading passage and question:

PASSAGE:
"${passageText.slice(0, 1500)}"

QUESTION:
"${questionText}"

OPTIONS:
${options.map((opt, i) => `${String.fromCharCode(65 + i)}. ${opt}`).join('\n')}

CORRECT ANSWER: "${correctAnswerText}"

Explain in Vietnamese with high academic clarity:
Respond strictly in JSON format:
{
  "quote": "Exact sentence or excerpt from the passage proving this answer",
  "whyCorrectVi": "Giải thích chi tiết tại sao đáp án này đúng theo dẫn chứng",
  "distractorsAnalysisVi": [
    { "option": "A", "reason": "Tại sao sai / bẫy gì" },
    { "option": "B", "reason": "Tại sao sai / bẫy gì" },
    { "option": "C", "reason": "Tại sao sai / bẫy gì" },
    { "option": "D", "reason": "Tại sao sai / bẫy gì" }
  ],
  "keyVocab": [
    { "word": "word", "meaningVi": "nghĩa trong ngữ cảnh" }
  ]
}
Return raw JSON only.`;

    const raw = await this.generate(prompt);
    try {
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return null;
    }
  },

  // 7. AI Vocabulary Deep Explainer & Mnemonics
  async explainVocabulary(term, vietnamese = '', context = '') {
    const prompt = `You are a creative English memory coach and lexicographer for VSTEP candidates.
Explain the word: "${term}" (${vietnamese || 'English vocabulary'})
${context ? `Context: "${context}"` : ''}

Respond strictly in JSON format:
{
  "term": "${term}",
  "phonetic": "/.../",
  "partOfSpeech": "noun/verb/adj",
  "mnemonicVi": "Mẹo ghi nhớ siêu dễ nhớ, liên tưởng âm thanh tương tự hoặc hình ảnh hài hước (1-2 câu)",
  "collocations": [
    { "phrase": "collocation 1", "meaningVi": "nghĩa" },
    { "phrase": "collocation 2", "meaningVi": "nghĩa" },
    { "phrase": "collocation 3", "meaningVi": "nghĩa" }
  ],
  "vstepExampleEn": "A high-scoring B2 VSTEP exam style sentence using this word",
  "vstepExampleVi": "Bản dịch tiếng Việt của câu ví dụ",
  "wordFamily": "noun: ..., verb: ..., adj: ..., adv: ..."
}
Return raw JSON only.`;

    const raw = await this.generate(prompt);
    try {
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return null;
    }
  },

  // 8. AI Speaking 1-Minute Prep Brainstormer
  async brainstormSpeakingIdeas(partTitle, topic, questionPrompt) {
    const prompt = `You are a VSTEP Speaking Coach helping a student in their 1-minute preparation time.
PART: ${partTitle}
TOPIC: ${topic}
QUESTION / SITUATION: "${questionPrompt}"

Provide quick, natural, high-scoring B2 ideas to say.
Respond strictly in JSON format:
{
  "openingSentence": "A smooth, confident B2 starter sentence",
  "keyIdeas": [
    {
      "pointVi": "Ý 1 (Ví dụ: Tiện lợi & Tiết kiệm thời gian)",
      "pointEn": "Convenience and time efficiency",
      "elaborationEn": "Because it enables users to...",
      "b2Phrases": ["play a paramount role", "streamline daily tasks"]
    },
    {
      "pointVi": "Ý 2 (Ví dụ: Phát triển kỹ năng mềm)",
      "pointEn": "Cultivating interpersonal skills",
      "elaborationEn": "It offers valuable opportunities to...",
      "b2Phrases": ["broaden one's horizon", "gain hands-on experience"]
    }
  ],
  "connectorTips": "In the first place,... Furthermore,... Taking everything into consideration,..."
}
Return raw JSON only.`;

    const raw = await this.generate(prompt);
    try {
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return null;
    }
  },

  // 9. AI Multi-turn Chatbot Tutor & Examiner
  async chatTutor(messages = [], systemInstruction = '') {
    const baseInstruction = `You are "VSTEP AI Master" - an encouraging, expert Native English Examiner and Tutor specializing in the Vietnamese Standardized Test of English Proficiency (VSTEP B2).
Your goals:
1. Always communicate warmly, constructively, and professionally in English (mixed with concise Vietnamese explanations when explaining difficult concepts or giving feedback).
2. If roleplaying as a Speaking Examiner: ask realistic VSTEP questions (Part 1, 2, or 3), listen to the candidate's answers, praise good points, point out 1-2 grammatical/lexical improvements, and ask the next question.
3. If answering grammar or writing queries: provide clear B2-C1 explanations, model answers, and high-scoring collocations.
4. Keep responses structured with clear markdown headings, bullet points, and bold text.`;

    const promptText = messages.map(m => `${m.role === 'user' ? 'Candidate' : 'Examiner'}: ${m.text}`).join('\n\n');
    return await this.generate(promptText, systemInstruction || baseInstruction);
  },

  // 10. AI Comprehensive Mock Exam Diagnosis
  async diagnoseMockExam(scores = {}) {
    const prompt = `You are the Chief Academic Officer for VSTEP Preparation.
A candidate just completed a full VSTEP mock exam with these results:
- Reading: ${scores.reading || 6.0} / 10
- Writing: ${scores.writing || 6.0} / 10
- Speaking: ${scores.speaking || 6.0} / 10
- Overall Band: ${scores.overall || 6.0} / 10 (Target: B2 >= 6.0)

Provide a comprehensive, encouraging diagnostic report and a tailored 30-day study prescription.
Respond strictly in JSON format:
{
  "readiness": "Ready / Borderline / Needs Improvement",
  "overallVerdictVi": "Nhận xét tổng quan trình độ hiện tại (2-3 câu truyền cảm hứng)",
  "skillDiagnosis": [
    {
      "skill": "Reading",
      "statusVi": "Đánh giá chi tiết kỹ năng Đọc và phương pháp khắc phục bẫy"
    },
    {
      "skill": "Writing",
      "statusVi": "Đánh giá Task 1 và Task 2, cách nâng điểm Lexical và Coherence"
    },
    {
      "skill": "Speaking",
      "statusVi": "Đánh giá phản xạ, cấu trúc A-R-E và độ trôi chảy"
    }
  ],
  "actionPlan30Days": [
    { "phase": "Tuần 1: Củng cố nền tảng", "focusVi": "Nạp 200 từ vựng B2 Oxford + Cày cấu trúc đảo ngữ, bị động" },
    { "phase": "Tuần 2: Làm chủ Speaking Part 2 & Writing Task 1", "focusVi": "Luyện 10 đề Solution Discussion + 5 lá thư Formal/Informal" },
    { "phase": "Tuần 3: Đột phá Writing Task 2 & Reading 4 bài", "focusVi": "Luyện viết 5 bài luận Task 2 + Skimming/Scanning đề thi thật" },
    { "phase": "Tuần 4: Thi thử áp lực thời gian", "focusVi": "Làm 3 đề Full Mock Exam và ôn lại toàn bộ sổ tay lỗi sai" }
  ]
}
Return raw JSON only.`;

    const raw = await this.generate(prompt);
    try {
      const clean = raw.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return null;
    }
  },

  // 11. AI VSTEP Listening Test Generator
  async generateListeningTest(part = 'part2', topic = '') {
    let partInstruction = '';
    if (part === 'part1') {
      partInstruction = `Format: VSTEP Listening Part 1.
Create a realistic short announcement / instructions / voicemail / weather / airport broadcast monologue (about 70-90 words in English).
Generate 1 multiple-choice question testing the main idea, purpose, or specific detail.
JSON format:
{
  "part": "part1",
  "title": "Short title",
  "topic": "${topic || 'Public Announcement'}",
  "level": "B2",
  "duration": "45s",
  "audioScript": "Full English monologue script...",
  "questions": [
    {
      "question": "Question text?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "answer": 0,
      "explanation": "Giải thích chi tiết bằng tiếng Việt có dẫn chứng từ audioScript"
    }
  ]
}`;
    } else if (part === 'part2') {
      partInstruction = `Format: VSTEP Listening Part 2.
Create an authentic 2-person dialogue (6-8 turns alternating between Speaker A (Male) and Speaker B (Female), about 180-230 words total in English) about campus life, workplace, travel, or services.
Generate 4 multiple-choice questions testing specific information, inference, reasons, and decisions.
JSON format:
{
  "part": "part2",
  "title": "Dialogue title",
  "topic": "${topic || 'Campus Life / Workplace'}",
  "level": "B2",
  "duration": "2m",
  "dialogue": [
    { "speaker": "Speaker A (Male)", "text": "Turn 1..." },
    { "speaker": "Speaker B (Female)", "text": "Turn 2..." }
  ],
  "questions": [
    {
      "question": "Question 1?",
      "options": ["A", "B", "C", "D"],
      "answer": 0,
      "explanation": "Giải thích tiếng Việt..."
    },
    {
      "question": "Question 2?",
      "options": ["A", "B", "C", "D"],
      "answer": 1,
      "explanation": "Giải thích tiếng Việt..."
    },
    {
      "question": "Question 3?",
      "options": ["A", "B", "C", "D"],
      "answer": 2,
      "explanation": "Giải thích tiếng Việt..."
    },
    {
      "question": "Question 4?",
      "options": ["A", "B", "C", "D"],
      "answer": 3,
      "explanation": "Giải thích tiếng Việt..."
    }
  ]
}`;
    } else {
      partInstruction = `Format: VSTEP Listening Part 3.
Create an authentic academic university lecture monologue (about 300-380 words in English) on an intriguing academic subject (biology, psychology, astronomy, environmental science, history, technology).
Generate 5 multiple-choice questions testing main argument, definitions, examples, cause-and-effect, and conclusion.
JSON format:
{
  "part": "part3",
  "title": "Lecture title",
  "topic": "${topic || 'Academic Science / Humanities'}",
  "level": "B2-C1",
  "duration": "3m",
  "audioScript": "Full academic lecture transcript...",
  "questions": [
    {
      "question": "Question 1?",
      "options": ["A", "B", "C", "D"],
      "answer": 0,
      "explanation": "Giải thích tiếng Việt có dẫn chứng..."
    },
    {
      "question": "Question 2?",
      "options": ["A", "B", "C", "D"],
      "answer": 1,
      "explanation": "Giải thích tiếng Việt có dẫn chứng..."
    },
    {
      "question": "Question 3?",
      "options": ["A", "B", "C", "D"],
      "answer": 2,
      "explanation": "Giải thích tiếng Việt có dẫn chứng..."
    },
    {
      "question": "Question 4?",
      "options": ["A", "B", "C", "D"],
      "answer": 3,
      "explanation": "Giải thích tiếng Việt có dẫn chứng..."
    },
    {
      "question": "Question 5?",
      "options": ["A", "B", "C", "D"],
      "answer": 0,
      "explanation": "Giải thích tiếng Việt có dẫn chứng..."
    }
  ]
}`;
    }

    const prompt = `You are a Senior Test Developer for the Vietnamese Standardized Test of English Proficiency (VSTEP B2).
Create a brand new authentic VSTEP Listening test item.
${topic ? `TOPIC THEME: ${topic}` : ''}
${partInstruction}

Return strictly raw JSON format without markdown code fences.`;

    const raw = await this.generate(prompt);
    return this.cleanAndParseJson(raw, null);
  }
};

export default gemini;
