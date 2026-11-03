/**
 * CEFR & VSTEP Text Profiler Engine
 * Inspired by nguyennhuanhle/ec-text-profiler-releases & CEFR vocabulary analysis
 * Evaluates Readability, Word Frequency, CEFR Band distribution, and VSTEP exam readiness
 */

import { VSTEP_VOCABULARY_OXFORD } from '../data/vstep/vocabulary_oxford.js';

// Pre-build word level lookup map for instant O(1) analysis
const WORD_LEVEL_MAP = new Map();
VSTEP_VOCABULARY_OXFORD.forEach(item => {
  if (item.word) {
    WORD_LEVEL_MAP.set(item.word.toLowerCase().trim(), item.level.toUpperCase());
  }
});

// Common English Function words & basic A1/A2 words list
const A1_A2_COMMON = new Set([
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'i', 'it', 'for', 'not', 'on', 'with', 'he',
  'as', 'you', 'do', 'at', 'this', 'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so', 'up', 'out', 'if', 'about',
  'who', 'get', 'which', 'go', 'me', 'when', 'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know',
  'take', 'people', 'into', 'year', 'your', 'good', 'some', 'could', 'them', 'see', 'other', 'than', 'then',
  'now', 'look', 'only', 'come', 'its', 'over', 'think', 'also', 'back', 'after', 'use', 'two', 'how',
  'our', 'work', 'first', 'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day',
  'most', 'us', 'is', 'are', 'was', 'were', 'been', 'has', 'had', 'am', 'did', 'does'
]);

// VSTEP Transition / Discourse Markers Database
const VSTEP_LINKING_WORDS = [
  { term: 'first and foremost', type: 'sequence' },
  { term: 'furthermore', type: 'addition' },
  { term: 'moreover', type: 'addition' },
  { term: 'in addition', type: 'addition' },
  { term: 'consequently', type: 'result' },
  { term: 'as a result', type: 'result' },
  { term: 'therefore', type: 'result' },
  { term: 'however', type: 'contrast' },
  { term: 'in contrast', type: 'contrast' },
  { term: 'on the contrary', type: 'contrast' },
  { term: 'on the other hand', type: 'contrast' },
  { term: 'nevertheless', type: 'contrast' },
  { term: 'nonetheless', type: 'contrast' },
  { term: 'despite', type: 'contrast' },
  { term: 'in spite of', type: 'contrast' },
  { term: 'although', type: 'contrast' },
  { term: 'even though', type: 'contrast' },
  { term: 'in conclusion', type: 'conclusion' },
  { term: 'to sum up', type: 'conclusion' },
  { term: 'all in all', type: 'conclusion' },
  { term: 'for instance', type: 'example' },
  { term: 'for example', type: 'example' },
  { term: 'to illustrate', type: 'example' },
  { term: 'specifically', type: 'example' },
  { term: 'it is widely believed that', type: 'academic' },
  { term: 'it is indisputable that', type: 'academic' },
  { term: 'from my perspective', type: 'opinion' },
  { term: 'taking everything into consideration', type: 'conclusion' }
];

export function analyzeText(rawText) {
  if (!rawText || !rawText.trim()) {
    return null;
  }

  const cleanText = rawText.trim();
  const sentences = cleanText.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const words = cleanText.match(/\b[a-zA-Z]+(?:'[a-zA-Z]+)?\b/g) || [];
  const paragraphs = cleanText.split(/\n+/).filter(p => p.trim().length > 0);

  const totalWords = words.length;
  if (totalWords === 0) return null;

  const totalSentences = Math.max(1, sentences.length);
  const totalParagraphs = Math.max(1, paragraphs.length);
  const uniqueWordsSet = new Set(words.map(w => w.toLowerCase()));
  const uniqueWords = uniqueWordsSet.size;
  const lexicalDensity = ((uniqueWords / totalWords) * 100).toFixed(1);
  const avgSentenceLength = (totalWords / totalSentences).toFixed(1);

  // Syllables estimation for Flesch-Kincaid
  let totalSyllables = 0;
  words.forEach(w => {
    totalSyllables += countSyllables(w);
  });

  // Flesch Reading Ease: 206.835 - 1.015 * (total words / total sentences) - 84.6 * (total syllables / total words)
  const fleschReadingEase = Math.max(0, Math.min(100, Math.round(
    206.835 - 1.015 * (totalWords / totalSentences) - 84.6 * (totalSyllables / totalWords)
  )));

  // Flesch-Kincaid Grade Level: 0.39 * (total words / total sentences) + 11.8 * (total syllables / total words) - 15.59
  const gradeLevel = Math.max(1, Number(
    (0.39 * (totalWords / totalSentences) + 11.8 * (totalSyllables / totalWords) - 15.59).toFixed(1)
  ));

  // CEFR Profiling
  const cefrCounts = { A1A2: 0, B1: 0, B2: 0, C1C2: 0 };
  const wordLevels = words.map(w => {
    const lower = w.toLowerCase();
    let level = 'A1A2';
    if (WORD_LEVEL_MAP.has(lower)) {
      const mapped = WORD_LEVEL_MAP.get(lower);
      if (mapped === 'B1') level = 'B1';
      else if (mapped === 'B2') level = 'B2';
      else if (mapped === 'C1' || mapped === 'C2') level = 'C1C2';
    } else if (A1_A2_COMMON.has(lower) || w.length <= 3) {
      level = 'A1A2';
    } else {
      level = 'B1'; // Default base assumption for unmapped intermediate words
    }
    cefrCounts[level]++;
    return { word: w, level };
  });

  const b2PlusCount = cefrCounts.B2 + cefrCounts.C1C2;
  const b2PlusPercent = ((b2PlusCount / totalWords) * 100).toFixed(1);

  // Linking words detection
  const lowerText = cleanText.toLowerCase();
  const detectedTransitions = [];
  VSTEP_LINKING_WORDS.forEach(lw => {
    if (lowerText.includes(lw.term)) {
      detectedTransitions.push(lw);
    }
  });

  // Passive voice heuristics (be + past participle)
  const passivePattern = /\b(am|is|are|was|were|be|been|being)\s+([a-zA-Z]+ed|[a-zA-Z]+en|built|made|held|given|shown|taken|known|paid|set|found)\b/gi;
  const passiveMatches = cleanText.match(passivePattern) || [];

  // VSTEP Readiness Evaluation
  let targetBand = 'B1';
  let bandScore = 5.0;
  const feedback = [];

  if (totalWords >= 250) {
    feedback.push('✅ Độ dài bài viết đạt yêu cầu VSTEP Task 2 (≥ 250 từ).');
    bandScore += 1.0;
  } else if (totalWords >= 120) {
    feedback.push('ℹ️ Đạt độ dài tối thiểu cho VSTEP Task 1 (≥ 120 từ). Cần viết thêm nếu là Task 2.');
    bandScore += 0.5;
  } else {
    feedback.push('⚠️ Bài viết quá ngắn (< 120 từ), có nguy cơ bị trừ điểm Task Achievement nặng.');
  }

  if (totalParagraphs >= 3) {
    feedback.push(`✅ Bố cục phân đoạn tốt (${totalParagraphs} đoạn: Mở bài - Thân bài - Kết bài).`);
    bandScore += 0.5;
  } else {
    feedback.push('⚠️ Cần chia bài viết thành ít nhất 3-4 đoạn văn rõ ràng.');
  }

  if (detectedTransitions.length >= 4) {
    feedback.push(`✅ Sử dụng phong phú từ liên kết (${detectedTransitions.length} cụm nối học thuật được nhận diện).`);
    bandScore += 1.0;
  } else {
    feedback.push('⚠️ Nên bổ sung thêm các liên từ học thuật (Furthermore, Consequently, However, In conclusion).');
  }

  if (Number(b2PlusPercent) >= 12) {
    feedback.push(`🔥 Tỷ lệ từ vựng B2 & C1 vượt trội (${b2PlusPercent}%), đáp ứng rất tốt tiêu chí Lexical Resource.`);
    bandScore += 1.0;
  } else if (Number(b2PlusPercent) >= 6) {
    feedback.push(`👍 Tỷ lệ từ vựng B2/C1 ở mức vừa đủ (${b2PlusPercent}%). Hãy thay thế thêm các từ đơn giản bằng từ học thuật.`);
    bandScore += 0.5;
  } else {
    feedback.push(`⚠️ Tỷ lệ từ vựng B2 còn thấp (${b2PlusPercent}%). Bạn đang dùng nhiều từ vựng cơ bản A1-B1.`);
  }

  if (passiveMatches.length >= 2) {
    feedback.push(`✅ Có sử dụng câu bị động khách quan (${passiveMatches.length} cấu trúc), nâng cao tính học thuật.`);
    bandScore += 0.5;
  }

  bandScore = Math.min(8.5, Math.max(4.0, bandScore));
  if (bandScore >= 8.5) targetBand = 'C1';
  else if (bandScore >= 6.0) targetBand = 'B2';
  else targetBand = 'B1';

  return {
    totalWords,
    uniqueWords,
    totalSentences,
    totalParagraphs,
    lexicalDensity,
    avgSentenceLength,
    fleschReadingEase,
    gradeLevel,
    cefrCounts,
    b2PlusPercent,
    detectedTransitions,
    passiveMatches,
    wordLevels,
    targetBand,
    bandScore: bandScore.toFixed(1),
    feedback
  };
}

function countSyllables(word) {
  let w = word.toLowerCase();
  if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]|ed|es|e)$/, '');
  w = w.replace(/^y/, '');
  const syllables = w.match(/[aeiouy]{1,2}/g);
  return syllables ? Math.max(1, syllables.length) : 1;
}

export function renderProfiler(container) {
  const sampleB2Essay = `In recent years, the issue of remote working has sparked a great deal of public debate. While some individuals argue that traditional office environments foster better teamwork, I firmly believe that telecommuting brings superior advantages due to several compelling reasons.

First and foremost, it is indisputable that remote employment offers unmatched schedule flexibility. When workers are liberated from stressful daily traffic jams, their mental well-being improves significantly. Consequently, employees can dedicate more quality time to their families and personal health.

Furthermore, empirical studies have shown that well-rested telecommuters exhibit higher rates of productivity. Without workplace distractions, individuals can concentrate deeply on complex tasks. As a result, businesses can optimize operational expenditures by reducing office rental fees.

In conclusion, for the reasons outlined above, I am strongly convinced that remote work represents a progressive milestone in modern employment dynamics.`;

  container.innerHTML = `
    <div class="page-view animate-fade-in">
      <div class="page-header" style="margin-bottom: 24px;">
        <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;">
          <div>
            <h2 class="page-title" style="display:flex; align-items:center; gap:8px;">
              🔍 CEFR & VSTEP Text Profiler
              <span class="chip chip-purple" style="font-size:0.75rem; font-weight:700">Open-Source Engine</span>
            </h2>
            <p class="page-subtitle">Công cụ đo lường độ khó, phân tích cấp độ từ vựng (A1~C2) và chấm điểm sẵn sàng VSTEP</p>
          </div>
          <div class="flex gap-sm">
            <button class="btn btn-secondary btn-sm" id="btn-load-sample">📄 Tải bài mẫu B2</button>
            <button class="btn btn-ghost btn-sm" id="btn-clear-text">🗑️ Xóa trắng</button>
          </div>
        </div>
      </div>

      <!-- Editor Card -->
      <div class="glass-card mb-xl">
        <textarea id="profiler-input" class="search-input" style="width: 100%; min-height: 220px; font-family: inherit; font-size: 0.95rem; line-height: 1.6; border-radius: 12px; padding: 16px; border: 1px solid var(--border-glass); background: #ffffff; resize: vertical;" placeholder="Dán hoặc gõ bài luận Writing Task 1, Task 2 hoặc bài đọc vào đây để phân tích toàn diện..."></textarea>
        
        <div class="flex items-center justify-between mt-md flex-wrap gap-md">
          <div class="flex items-center gap-sm">
            <button class="btn btn-primary" id="btn-analyze" style="padding: 10px 24px; font-weight:700; border-radius: 10px;">
              ⚡ Phân tích & Đo chuẩn VSTEP
            </button>
            <label style="display:inline-flex; align-items:center; gap:6px; font-size:0.85rem; color:var(--text-secondary); cursor:pointer;">
              <input type="checkbox" id="chk-auto-analyze" checked style="cursor:pointer"> Tự động đo khi gõ
            </label>
          </div>
          <div id="live-quick-stats" class="text-xs text-muted" style="font-weight:600">
            0 từ · 0 câu · 0 đoạn
          </div>
        </div>
      </div>

      <!-- Analysis Results Container -->
      <div id="profiler-results"></div>
    </div>
  `;

  const inputEl = container.querySelector('#profiler-input');
  const btnAnalyze = container.querySelector('#btn-analyze');
  const btnSample = container.querySelector('#btn-load-sample');
  const btnClear = container.querySelector('#btn-clear-text');
  const chkAuto = container.querySelector('#chk-auto-analyze');
  const quickStats = container.querySelector('#live-quick-stats');
  const resultsContainer = container.querySelector('#profiler-results');

  let debounceTimer;

  function runAnalysis() {
    const text = inputEl.value;
    const res = analyzeText(text);

    if (!res) {
      quickStats.textContent = '0 từ · 0 câu · 0 đoạn';
      resultsContainer.innerHTML = `
        <div class="glass-card text-center text-muted" style="padding: 40px;">
          <div style="font-size:2.5rem; margin-bottom:10px">📝</div>
          <p style="font-size:0.95rem">Nhập hoặc dán đoạn văn bản phía trên và bấm <strong>"Phân tích"</strong> để xem kết quả.</p>
        </div>
      `;
      return;
    }

    quickStats.textContent = `${res.totalWords} từ · ${res.totalSentences} câu · ${res.totalParagraphs} đoạn`;

    const a1a2Pct = ((res.cefrCounts.A1A2 / res.totalWords) * 100).toFixed(0);
    const b1Pct = ((res.cefrCounts.B1 / res.totalWords) * 100).toFixed(0);
    const b2Pct = ((res.cefrCounts.B2 / res.totalWords) * 100).toFixed(0);
    const c1c2Pct = ((res.cefrCounts.C1C2 / res.totalWords) * 100).toFixed(0);

    resultsContainer.innerHTML = `
      <div class="animate-fade-in">
        <!-- Metric Grid -->
        <div class="stats-grid mb-xl" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
          
          <div class="stat-card" style="border-top: 4px solid var(--purple);">
            <div class="stat-value" style="color:var(--purple); font-size: 2rem;">${res.bandScore}</div>
            <div class="stat-label">Ước tính VSTEP Band</div>
            <div class="text-xs text-muted mt-xs">Mục tiêu: <strong>${res.targetBand}</strong></div>
          </div>

          <div class="stat-card" style="border-top: 4px solid var(--teal);">
            <div class="stat-value" style="color:var(--teal); font-size: 2rem;">${res.b2PlusPercent}%</div>
            <div class="stat-label">Mật độ Từ vựng B2 & C1</div>
            <div class="text-xs text-muted mt-xs">${res.cefrCounts.B2 + res.cefrCounts.C1C2} từ học thuật</div>
          </div>

          <div class="stat-card" style="border-top: 4px solid #f59e0b;">
            <div class="stat-value" style="color:#d97706; font-size: 2rem;">${res.totalWords}</div>
            <div class="stat-label">Số lượng Từ (Word Count)</div>
            <div class="text-xs text-muted mt-xs">Đoạn văn: ${res.totalParagraphs} | Câu: ${res.totalSentences}</div>
          </div>

          <div class="stat-card" style="border-top: 4px solid #10b981;">
            <div class="stat-value" style="color:#059669; font-size: 2rem;">${res.fleschReadingEase}</div>
            <div class="stat-label">Flesch Reading Ease</div>
            <div class="text-xs text-muted mt-xs">Cấp độ lớp: Grade ${res.gradeLevel}</div>
          </div>

        </div>

        <!-- CEFR Distribution Bar & Detailed Breakdown -->
        <div class="glass-card mb-xl">
          <h3 style="font-size:1.1rem; font-weight:800; margin-bottom:12px; color:var(--text-primary)">
            📊 Phân bố cấp độ từ vựng theo chuẩn CEFR (Oxford 5000)
          </h3>
          
          <!-- Stacked Progress Bar -->
          <div style="height: 28px; width:100%; border-radius: 8px; overflow:hidden; display:flex; margin-bottom: 16px; background:#f1f5f9; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05);">
            <div style="width:${a1a2Pct}%; background:#94a3b8; color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700;" title="A1/A2: ${a1a2Pct}%">${a1a2Pct > 8 ? `A1-A2 ${a1a2Pct}%` : ''}</div>
            <div style="width:${b1Pct}%; background:#38bdf8; color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700;" title="B1: ${b1Pct}%">${b1Pct > 8 ? `B1 ${b1Pct}%` : ''}</div>
            <div style="width:${b2Pct}%; background:#10b981; color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700;" title="B2: ${b2Pct}%">${b2Pct > 8 ? `B2 ${b2Pct}%` : ''}</div>
            <div style="width:${c1c2Pct}%; background:#8b5cf6; color:#fff; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:700;" title="C1/C2: ${c1c2Pct}%">${c1c2Pct > 8 ? `C1 ${c1c2Pct}%` : ''}</div>
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:16px; font-size:0.85rem;">
            <div style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:12px; border-radius:3px; background:#94a3b8;"></span> Cơ bản A1-A2: <strong>${res.cefrCounts.A1A2} từ (${a1a2Pct}%)</strong></div>
            <div style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:12px; border-radius:3px; background:#38bdf8;"></span> Trung cấp B1: <strong>${res.cefrCounts.B1} từ (${b1Pct}%)</strong></div>
            <div style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:12px; border-radius:3px; background:#10b981;"></span> Trung cao cấp B2: <strong>${res.cefrCounts.B2} từ (${b2Pct}%)</strong></div>
            <div style="display:flex; align-items:center; gap:6px;"><span style="width:12px; height:12px; border-radius:3px; background:#8b5cf6;"></span> Nâng cao C1/C2: <strong>${res.cefrCounts.C1C2} từ (${c1c2Pct}%)</strong></div>
          </div>
        </div>

        <!-- Evaluation Feedback & Linking Words -->
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;" class="mb-xl">
          
          <!-- Feedback Checklist -->
          <div class="glass-card">
            <h4 style="font-size:1rem; font-weight:800; color:var(--text-primary); margin-bottom:12px;">
              🎯 Đánh giá tiêu chí VSTEP Writing & Speaking
            </h4>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${res.feedback.map(f => `
                <div style="padding:10px 14px; background:rgba(0,0,0,0.02); border-radius:8px; font-size:0.88rem; line-height:1.5;">${f}</div>
              `).join('')}
            </div>
          </div>

          <!-- Detected Transitions & Grammar Features -->
          <div class="glass-card">
            <h4 style="font-size:1rem; font-weight:800; color:var(--text-primary); margin-bottom:12px;">
              🔗 Liên từ & Cấu trúc học thuật nhận diện được
            </h4>
            
            <div class="mb-md">
              <div class="text-xs text-muted mb-xs" style="font-weight:700">TỪ NỐI (DISCOURSE MARKERS): ${res.detectedTransitions.length} cụm</div>
              <div style="display:flex; flex-wrap:wrap; gap:6px;">
                ${res.detectedTransitions.length > 0 
                  ? res.detectedTransitions.map(t => `<span class="chip chip-purple" style="font-size:0.75rem;">${t.term}</span>`).join('') 
                  : '<span class="text-xs text-muted">Chưa phát hiện liên từ học thuật nào.</span>'}
              </div>
            </div>

            <div>
              <div class="text-xs text-muted mb-xs" style="font-weight:700">CÂU BỊ ĐỘNG (PASSIVE STRUCTURES): ${res.passiveMatches.length} cấu trúc</div>
              <div style="display:flex; flex-wrap:wrap; gap:6px;">
                ${res.passiveMatches.length > 0
                  ? res.passiveMatches.map(p => `<span class="chip" style="font-size:0.75rem; background:#ecfdf5; color:#047857;">${p}</span>`).join('')
                  : '<span class="text-xs text-muted">Chưa phát hiện câu bị động.</span>'}
              </div>
            </div>
          </div>

        </div>

        <!-- Color Highlighted Text Viewer -->
        <div class="glass-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <h4 style="font-size:1rem; font-weight:800; color:var(--text-primary); margin:0;">
              🎨 Văn bản phân loại màu theo CEFR
            </h4>
            <span class="text-xs text-muted">A1-A2 (xám), B1 (xanh lam), B2 (xanh lá), C1 (tím)</span>
          </div>
          <div style="padding: 16px; background:#fafafa; border:1px solid var(--border-glass); border-radius:10px; line-height:1.9; font-size:0.92rem; max-height:300px; overflow-y:auto;">
            ${res.wordLevels.map(item => {
              let style = '';
              if (item.level === 'B2') style = 'background:#dcfce7; color:#15803d; padding:2px 4px; border-radius:4px; font-weight:600;';
              else if (item.level === 'C1C2') style = 'background:#ede9fe; color:#6d28d9; padding:2px 4px; border-radius:4px; font-weight:700;';
              else if (item.level === 'B1') style = 'background:#e0f2fe; color:#0369a1; padding:2px 3px; border-radius:4px;';
              return `<span style="${style}">${item.word}</span>`;
            }).join(' ')}
          </div>
        </div>

      </div>
    `;
  }

  btnAnalyze.addEventListener('click', runAnalysis);

  inputEl.addEventListener('input', () => {
    if (chkAuto.checked) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runAnalysis, 400);
    }
  });

  btnSample.addEventListener('click', () => {
    inputEl.value = sampleB2Essay;
    runAnalysis();
  });

  btnClear.addEventListener('click', () => {
    inputEl.value = '';
    runAnalysis();
  });

  // Run initial sample
  inputEl.value = sampleB2Essay;
  runAnalysis();
}

export default { analyzeText, renderProfiler };
